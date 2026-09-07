export const CMS_REPOSITORY = 't1mlopez/latediagnosed-site';
export const CMS_BRANCH = 'main';
export const CMS_CONTENT_FOLDERS = [
  'src/content/articles',
  'src/content/resources',
  'src/content/pages',
  'src/content/authors',
  'src/content/categories',
] as const;
export const CMS_MEDIA_FOLDER = 'public/uploads';

const MEDIA_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
]);

export class CmsPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CmsPolicyError';
  }
}

export function requireCmsRepository(repository: unknown): asserts repository is typeof CMS_REPOSITORY {
  if (repository !== CMS_REPOSITORY) throw new CmsPolicyError('Repository is not allowed.');
}

export function requireCmsBranch(branch: unknown): asserts branch is typeof CMS_BRANCH {
  if (branch !== CMS_BRANCH) throw new CmsPolicyError('Branch is not allowed.');
}

export function normalizeCmsPath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 300) {
    throw new CmsPolicyError('Invalid repository path.');
  }
  if (value.startsWith('/') || value.includes('\\') || value.includes('\0') || value.includes('//')) {
    throw new CmsPolicyError('Invalid repository path.');
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new CmsPolicyError('Invalid repository path encoding.');
  }
  if (decoded !== value) throw new CmsPolicyError('Encoded repository paths are not allowed.');

  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new CmsPolicyError('Repository path traversal is not allowed.');
  }
  if (segments.some((segment) => /[\u0000-\u001f\u007f]/.test(segment))) {
    throw new CmsPolicyError('Invalid repository path.');
  }
  return segments.join('/');
}

function isWithin(path: string, folder: string): boolean {
  return path.startsWith(`${folder}/`) && path.length > folder.length + 1;
}

export function requireContentFolder(value: unknown): string {
  const folder = normalizeCmsPath(value);
  if (!CMS_CONTENT_FOLDERS.includes(folder as (typeof CMS_CONTENT_FOLDERS)[number])) {
    throw new CmsPolicyError('Content folder is not allowed.');
  }
  return folder;
}

export function requireReadableCmsPath(value: unknown): string {
  const path = normalizeCmsPath(value);
  const isContent = CMS_CONTENT_FOLDERS.some((folder) => isWithin(path, folder)) && path.endsWith('.md');
  const isMedia = isWithin(path, CMS_MEDIA_FOLDER);
  if (!isContent && !isMedia) throw new CmsPolicyError('Repository path is outside the CMS allowlist.');
  return path;
}

export function requireWritableCmsPath(value: unknown): string {
  const path = normalizeCmsPath(value);
  if (CMS_CONTENT_FOLDERS.some((folder) => isWithin(path, folder)) && path.endsWith('.md')) {
    return path;
  }

  if (isWithin(path, CMS_MEDIA_FOLDER)) {
    const dot = path.lastIndexOf('.');
    const extension = dot >= 0 ? path.slice(dot).toLowerCase() : '';
    if (MEDIA_EXTENSIONS.has(extension)) return path;
  }
  throw new CmsPolicyError('Writes are allowed only in approved content and media folders.');
}

export function isAllowedRequestOrigin(requestUrl: URL, origin: string | null): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === requestUrl.origin;
  } catch {
    return false;
  }
}
