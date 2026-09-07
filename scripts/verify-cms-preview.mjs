import { readFileSync } from 'node:fs';
import { sealAuthValue } from '../src/lib/auth/crypto.ts';

const origin = process.argv[2];
const runWriteTest = process.argv.includes('--write-test');
const cleanupUiTest = process.argv.includes('--cleanup-ui-test');
if (!origin?.startsWith('https://')) throw new Error('Usage: node scripts/verify-cms-preview.mjs https://preview-origin');

function envValue(name) {
  const raw = readFileSync('.env', 'utf8');
  const line = raw.split(/\r?\n/).find((item) => item.startsWith(`${name}=`));
  if (!line) throw new Error(`Missing local environment name: ${name}`);
  let value = line.slice(name.length + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
  return value;
}

const sessionSecret = envValue('OKTA_SESSION_SECRET');
const sealed = await sealAuthValue({
  user: {
    id: 'preview-editor',
    name: 'Preview Editor',
    preferredUsername: 'preview-editor',
    permissions: ['CMS Editors'],
  },
  expiresAt: Date.now() + 60 * 60 * 1000,
}, sessionSecret);
const authHeaders = { Cookie: `__Host-ld_session=${sealed}` };

const nonEditor = await sealAuthValue({
  user: { id: 'preview-reader', name: 'Preview Reader', permissions: [] },
  expiresAt: Date.now() + 60 * 60 * 1000,
}, sessionSecret);
const expired = await sealAuthValue({
  user: { id: 'preview-expired', name: 'Preview Expired', permissions: ['CMS Editors'] },
  expiresAt: Date.now() - 1000,
}, sessionSecret);
const tampered = `${sealed.slice(0, -1)}${sealed.endsWith('A') ? 'B' : 'A'}`;

const sessionResponse = await fetch(`${origin}/api/cms/session`, { headers: authHeaders });
const sessionText = await sessionResponse.text();
let session;
try {
  session = JSON.parse(sessionText);
} catch {
  throw new Error(`/api/cms/session returned ${sessionResponse.status} ${sessionResponse.headers.get('content-type') || 'without a content type'}`);
}

async function cms(body, requestOrigin = origin) {
  const response = await fetch(`${origin}/api/cms/repository`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      Origin: requestOrigin,
      'Content-Type': 'application/json',
      'X-CMS-CSRF': session.csrf,
    },
    body: JSON.stringify({
      repository: 't1mlopez/latediagnosed-site',
      branch: 'main',
      ...body,
    }),
  });
  return { status: response.status, body: await response.text() };
}

const adminResponse = await fetch(`${origin}/admin/`, { headers: authHeaders, redirect: 'manual' });
const anonymousAdmin = await fetch(`${origin}/admin/`, { redirect: 'manual' });
const nonEditorAdmin = await fetch(`${origin}/admin/`, {
  headers: { Cookie: `__Host-ld_session=${nonEditor}` },
  redirect: 'manual',
});
const expiredAdmin = await fetch(`${origin}/admin/`, {
  headers: { Cookie: `__Host-ld_session=${expired}` },
  redirect: 'manual',
});
const tamperedAdmin = await fetch(`${origin}/admin/`, {
  headers: { Cookie: `__Host-ld_session=${tampered}` },
  redirect: 'manual',
});
const adminHtml = await adminResponse.text();
const backendJs = await (await fetch(`${origin}/admin/backend.js`, { headers: authHeaders })).text();
const cmsConfig = await (await fetch(`${origin}/admin/config.yml`, { headers: authHeaders })).text();
const accountResponse = await fetch(`${origin}/account`, { headers: authHeaders, redirect: 'manual' });
const meResponse = await fetch(`${origin}/api/me`, { headers: authHeaders });
const entries = await cms({ operation: 'listEntries', folder: 'src/content/articles', extension: 'md', depth: 1 });
const media = await cms({ operation: 'listMedia' });
const badRepository = await cms({ repository: 't1mlopez/another', operation: 'listMedia' });
const badBranch = await cms({ branch: 'preview', operation: 'listMedia' });
const traversal = await cms({ operation: 'getEntry', path: 'src/content/articles/../pages/test.md' });
const badOrigin = await cms({ operation: 'listMedia' }, 'https://evil.example');

let writeTest;
if (runWriteTest) {
  const contentPath = 'src/content/pages/cms-gateway-preview-test.md';
  const mediaPath = 'public/uploads/cms-gateway-preview-test.png';
  const draft = `---\ntitle: CMS gateway preview test\ndescription: Temporary draft used to verify the Content Center gateway.\nstatus: draft\n---\n\nThis temporary draft is removed automatically after verification.\n`;
  const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  let created = false;
  try {
    const create = await cms({
      operation: 'write',
      writes: [
        { path: contentPath, content: draft, encoding: 'utf-8' },
        { path: mediaPath, content: onePixelPng, encoding: 'base64' },
      ],
      deletes: [],
      commitMessage: 'test: verify CMS gateway draft and media upload',
    });
    created = create.status === 200;
    const readDraft = created ? await cms({ operation: 'getEntry', path: contentPath }) : { status: 0, body: '' };
    const readMedia = created ? await cms({ operation: 'listMedia' }) : { status: 0, body: '' };
    const outsideWrite = await cms({
      operation: 'write',
      writes: [{ path: 'README.md', content: 'not allowed', encoding: 'utf-8' }],
      deletes: [],
      commitMessage: 'test: reject write outside allowlist',
    });
    writeTest = {
      create: create.status,
      draftReadable: readDraft.status === 200 && JSON.parse(readDraft.body).entry?.data === draft,
      mediaListed: readMedia.status === 200 && JSON.parse(readMedia.body).media?.some((item) => item.path === mediaPath),
      outsideWrite: outsideWrite.status,
    };
  } finally {
    if (created) {
      const cleanup = await cms({
        operation: 'write',
        writes: [],
        deletes: [contentPath, mediaPath],
        commitMessage: 'test: remove CMS gateway preview artifacts',
      });
      writeTest = { ...writeTest, cleanup: cleanup.status };
    }
  }
}

let uiCleanup;
if (cleanupUiTest) {
  const response = await cms({
    operation: 'write',
    writes: [],
    deletes: ['src/content/categories/cms-gateway-ui-test.md'],
    commitMessage: 'test: remove Decap UI verification entry',
  });
  uiCleanup = response.status;
}

console.log(JSON.stringify({
  session: sessionResponse.status,
  admin: adminResponse.status,
  access: {
    anonymous: anonymousAdmin.status,
    anonymousLocation: anonymousAdmin.headers.get('location'),
    nonEditor: nonEditorAdmin.status,
    expired: expiredAdmin.status,
    tampered: tamperedAdmin.status,
  },
  account: accountResponse.status,
  me: meResponse.status,
  entries: { status: entries.status, count: JSON.parse(entries.body).entries?.length },
  media: { status: media.status, count: JSON.parse(media.body).media?.length },
  badRepository: badRepository.status,
  badBranch: badBranch.status,
  traversal: traversal.status,
  badOrigin: badOrigin.status,
  ...(writeTest ? { writeTest } : {}),
  ...(uiCleanup ? { uiCleanup } : {}),
  browserCredentialLeak: /BEGIN (?:RSA )?PRIVATE KEY|GITHUB_APP_PRIVATE_KEY|Authorization:\s*Bearer/i
    .test(`${adminHtml}${backendJs}${cmsConfig}`),
}));
