import { getSecret } from 'astro:env/server';
import {
  CMS_BRANCH,
  CMS_REPOSITORY,
  requireReadableCmsPath,
  requireWritableCmsPath,
} from './policy';

const GITHUB_API = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const [REPOSITORY_OWNER, REPOSITORY_NAME] = CMS_REPOSITORY.split('/');
const encoder = new TextEncoder();

interface InstallationCredential {
  token: string;
  expiresAt: number;
}

interface GitTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface CmsRepositoryEntry {
  file: { path: string; id: string; label?: string };
  data: string;
}

export interface CmsMediaEntry {
  id: string;
  name: string;
  path: string;
  size?: number;
}

export interface CmsWrite {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
}

let installationCredential: InstallationCredential | null = null;

function requiredSecret(name: string): string {
  const value = getSecret(name);
  if (!value || !value.trim()) throw new Error('CMS repository authorization is not configured.');
  return value;
}

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function derLength(length: number): Uint8Array {
  if (length < 128) return Uint8Array.of(length);
  const bytes: number[] = [];
  for (let remaining = length; remaining > 0; remaining >>>= 8) bytes.unshift(remaining & 0xff);
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function der(tag: number, value: Uint8Array): Uint8Array {
  return Uint8Array.from([tag, ...derLength(value.byteLength), ...value]);
}

function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = Uint8Array.of(0x02, 0x01, 0x00);
  const rsaAlgorithm = Uint8Array.of(
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  );
  return der(0x30, Uint8Array.from([...version, ...rsaAlgorithm, ...der(0x04, pkcs1)]));
}

function privateKeyDer(pemValue: string): ArrayBuffer {
  const pem = pemValue.includes('\\n') && !pemValue.includes('\n')
    ? pemValue.replace(/\\n/g, '\n')
    : pemValue;
  const match = pem.match(/-----BEGIN (RSA )?PRIVATE KEY-----([\s\S]+?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (!match) throw new Error('CMS repository authorization is not configured correctly.');
  const derBytes = Uint8Array.from(Buffer.from(match[2].replace(/\s/g, ''), 'base64'));
  const keyBytes = match[1] ? pkcs1ToPkcs8(derBytes) : derBytes;
  return Uint8Array.from(keyBytes).buffer;
}

async function createAppJwt(appId: string, privateKey: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = base64Url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64Url(encoder.encode(JSON.stringify({ iss: appId, iat: now - 60, exp: now + 9 * 60 })));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyDer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

async function githubFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'latediagnosed-cms-gateway',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      ...init.headers,
    },
  });
}

async function githubJson<T>(path: string, init: RequestInit, token: string, expected: number[] = [200]): Promise<T> {
  const response = await githubFetch(path, init, token);
  if (!expected.includes(response.status)) {
    if (response.status === 401) installationCredential = null;
    throw new Error(response.status === 409 || response.status === 422
      ? 'The repository changed while you were editing. Reload Content Center and try again.'
      : 'CMS repository authorization failed. Contact the site administrator.');
  }
  return response.json() as Promise<T>;
}

async function getInstallationToken(): Promise<string> {
  if (installationCredential && installationCredential.expiresAt > Date.now() + 5 * 60 * 1000) {
    return installationCredential.token;
  }

  const appId = requiredSecret('GITHUB_APP_ID').trim();
  const installationId = requiredSecret('GITHUB_APP_INSTALLATION_ID').trim();
  if (!/^\d+$/.test(appId) || !/^\d+$/.test(installationId)) {
    throw new Error('CMS repository authorization is not configured correctly.');
  }
  const appJwt = await createAppJwt(appId, requiredSecret('GITHUB_APP_PRIVATE_KEY'));
  const result = await githubJson<{
    token: string;
    expires_at: string;
    repositories?: Array<{ full_name: string }>;
  }>(`/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositories: [REPOSITORY_NAME], permissions: { contents: 'write' } }),
  }, appJwt, [201]);

  if (result.repositories?.length !== 1 || result.repositories[0].full_name !== CMS_REPOSITORY) {
    throw new Error('CMS repository authorization is not installed for the required repository.');
  }
  installationCredential = { token: result.token, expiresAt: Date.parse(result.expires_at) };
  return result.token;
}

async function repositoryJson<T>(path: string, init: RequestInit = { method: 'GET' }, expected = [200]): Promise<T> {
  const token = await getInstallationToken();
  return githubJson<T>(`/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}${path}`, init, token, expected);
}

async function getTree(): Promise<GitTreeEntry[]> {
  const result = await repositoryJson<{ tree: GitTreeEntry[]; truncated: boolean }>(
    `/git/trees/${encodeURIComponent(CMS_BRANCH)}?recursive=1`,
  );
  if (result.truncated) throw new Error('The repository tree is too large for the CMS gateway.');
  return result.tree;
}

function decodeBlob(content: string): Uint8Array {
  return Uint8Array.from(Buffer.from(content.replace(/\s/g, ''), 'base64'));
}

async function readBlob(sha: string): Promise<{ bytes: Uint8Array; encoding: string }> {
  const blob = await repositoryJson<{ content: string; encoding: string }>(`/git/blobs/${encodeURIComponent(sha)}`);
  if (blob.encoding !== 'base64') throw new Error('GitHub returned an unsupported content encoding.');
  return { bytes: decodeBlob(blob.content), encoding: blob.encoding };
}

export async function listCmsEntries(folder: string, extension: string, depth: number): Promise<CmsRepositoryEntry[]> {
  const tree = await getTree();
  const prefix = `${folder}/`;
  const suffix = `.${extension.replace(/^\./, '')}`;
  const matches = tree.filter((entry) => {
    if (entry.type !== 'blob' || !entry.path.startsWith(prefix) || !entry.path.endsWith(suffix)) return false;
    const relative = entry.path.slice(prefix.length);
    return relative.split('/').length <= Math.max(1, depth + 1);
  });
  return Promise.all(matches.map(async (entry) => ({
    file: { path: entry.path, id: entry.sha },
    data: new TextDecoder().decode((await readBlob(entry.sha)).bytes),
  })));
}

export async function readCmsEntries(files: Array<{ path: string; label?: string }>): Promise<CmsRepositoryEntry[]> {
  const tree = await getTree();
  const blobs = new Map(tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry]));
  return Promise.all(files.map(async (file) => {
    const path = requireReadableCmsPath(file.path);
    const entry = blobs.get(path);
    if (!entry) return { file: { path, id: '', label: file.label }, data: '' };
    return {
      file: { path, id: entry.sha, label: file.label },
      data: new TextDecoder().decode((await readBlob(entry.sha)).bytes),
    };
  }));
}

export async function readCmsEntry(pathValue: string): Promise<CmsRepositoryEntry> {
  const path = requireReadableCmsPath(pathValue);
  const [entry] = await readCmsEntries([{ path }]);
  return entry;
}

export async function listCmsMedia(): Promise<CmsMediaEntry[]> {
  const tree = await getTree();
  return tree
    .filter((entry) => entry.type === 'blob' && entry.path.startsWith('public/uploads/') && entry.path !== 'public/uploads/.gitkeep')
    .map((entry) => ({
      id: entry.sha,
      name: entry.path.slice(entry.path.lastIndexOf('/') + 1),
      path: entry.path,
      size: entry.size,
    }));
}

export async function readCmsMedia(pathValue: string): Promise<Uint8Array> {
  const path = requireReadableCmsPath(pathValue);
  if (!path.startsWith('public/uploads/')) throw new Error('Media path is outside the CMS media folder.');
  const tree = await getTree();
  const entry = tree.find((candidate) => candidate.type === 'blob' && candidate.path === path);
  if (!entry) throw new Error('Media file not found.');
  return (await readBlob(entry.sha)).bytes;
}

export async function commitCmsChanges(writesValue: CmsWrite[], deletesValue: string[], messageValue: string): Promise<void> {
  const writes = writesValue.map((write) => ({ ...write, path: requireWritableCmsPath(write.path) }));
  const deletes = deletesValue.map(requireWritableCmsPath);
  const paths = [...writes.map((write) => write.path), ...deletes];
  if (paths.length === 0 || paths.length > 30 || new Set(paths).size !== paths.length) {
    throw new Error('Invalid CMS change set.');
  }

  let decodedBytes = 0;
  for (const write of writes) {
    if (write.encoding !== 'utf-8' && write.encoding !== 'base64') throw new Error('Unsupported CMS file encoding.');
    decodedBytes += write.encoding === 'base64'
      ? Math.floor(write.content.length * 3 / 4)
      : encoder.encode(write.content).byteLength;
  }
  if (decodedBytes > 20 * 1024 * 1024) throw new Error('CMS change set is too large.');

  const message = typeof messageValue === 'string'
    ? messageValue.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 200)
    : '';
  if (!message) throw new Error('A commit message is required.');

  const reference = await repositoryJson<{ object: { sha: string } }>(`/git/ref/heads/${encodeURIComponent(CMS_BRANCH)}`);
  const parent = await repositoryJson<{ tree: { sha: string } }>(`/git/commits/${encodeURIComponent(reference.object.sha)}`);
  const blobs = await Promise.all(writes.map(async (write) => {
    const blob = await repositoryJson<{ sha: string }>('/git/blobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: write.content, encoding: write.encoding }),
    }, [201]);
    return { path: write.path, mode: '100644', type: 'blob', sha: blob.sha };
  }));
  const tree = await repositoryJson<{ sha: string }>('/git/trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: [...blobs, ...deletes.map((path) => ({ path, mode: '100644', type: 'blob', sha: null }))],
    }),
  }, [201]);
  const commit = await repositoryJson<{ sha: string }>('/git/commits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tree: tree.sha, parents: [reference.object.sha] }),
  }, [201]);
  await repositoryJson(`/git/refs/heads/${encodeURIComponent(CMS_BRANCH)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
}
