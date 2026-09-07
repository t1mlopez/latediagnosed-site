import { parseDocument } from 'yaml';

export const EDITABLE_COLLECTIONS = ['articles', 'resources', 'pages'] as const;
export type EditableCollection = (typeof EDITABLE_COLLECTIONS)[number];

export interface EditorEntry {
  path: string;
  sha: string;
  collection: EditableCollection;
  slug: string;
  metadata: Record<string, unknown>;
  body: string;
}

export class ContentEditorError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ContentEditorError';
    this.status = status;
  }
}

export function collectionFolder(collection: EditableCollection): string {
  return `src/content/${collection}`;
}

export function requireEditableCollection(value: unknown): EditableCollection {
  if (!EDITABLE_COLLECTIONS.includes(value as EditableCollection)) {
    throw new ContentEditorError('That content type is not editable.');
  }
  return value as EditableCollection;
}

export function slugify(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function requireSlug(value: unknown): string {
  const slug = slugify(value);
  if (!slug || slug !== value) {
    throw new ContentEditorError('The URL slug must contain only lowercase letters, numbers, and hyphens.');
  }
  return slug;
}

export function splitMarkdown(source: string): { metadata: Record<string, unknown>; body: string } {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/);
  if (!match) return { metadata: {}, body: source };
  const document = parseDocument(match[1]);
  if (document.errors.length) throw new ContentEditorError('This file has invalid frontmatter and cannot be edited safely.');
  const metadata = document.toJS();
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new ContentEditorError('This file has invalid frontmatter and cannot be edited safely.');
  }
  return { metadata: metadata as Record<string, unknown>, body: source.slice(match[0].length) };
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().slice(0, max);
  return clean || undefined;
}

function cleanStringList(value: unknown, maxItems = 50): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, maxItems);
}

function optionalDate(metadata: Record<string, unknown>, key: string): void {
  const value = metadata[key];
  if (value == null || value === '') {
    delete metadata[key];
    return;
  }
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new ContentEditorError(`${key} must be a valid date.`);
  }
}

function optionalText(metadata: Record<string, unknown>, key: string, max = 2000): void {
  const value = cleanString(metadata[key], max);
  if (value) metadata[key] = value;
  else delete metadata[key];
}

export function validateEditorContent(
  metadataValue: unknown,
  bodyValue: unknown,
  intent: 'draft' | 'publish',
): { metadata: Record<string, unknown>; body: string } {
  if (!metadataValue || typeof metadataValue !== 'object' || Array.isArray(metadataValue)) {
    throw new ContentEditorError('Technical metadata must be a JSON object.');
  }
  const metadata = { ...(metadataValue as Record<string, unknown>) };
  const title = cleanString(metadata.title, 200);
  if (!title) throw new ContentEditorError('Subject is required.');
  metadata.title = title;

  const description = cleanString(metadata.description, 600);
  metadata.description = description || '';
  metadata.author = cleanString(metadata.author, 200) || 'late-diagnosed';

  const tags = cleanStringList(metadata.tags);
  metadata.tags = tags;
  metadata.categories = cleanStringList(metadata.categories);
  metadata.status = intent === 'publish' ? 'published' : 'draft';
  metadata.featured = metadata.featured === true;
  metadata.keyTakeaways = cleanStringList(metadata.keyTakeaways);
  metadata.audience = cleanStringList(metadata.audience).filter((item) => [
    'newly-diagnosed', 'self-discovery', 'family', 'partners', 'practitioners',
    'parents', 'workplace', 'general',
  ].includes(item));
  metadata.relatedArticles = cleanStringList(metadata.relatedArticles);
  metadata.relatedResources = cleanStringList(metadata.relatedResources);
  metadata.relatedGuides = cleanStringList(metadata.relatedGuides);
  metadata.hasPdf = metadata.hasPdf === true;
  metadata.hasAudio = metadata.hasAudio === true;
  metadata.hasVideo = metadata.hasVideo === true;
  for (const key of [
    'excerpt', 'heroImage', 'reviewedBy', 'reviewNote', 'seoTitle', 'seoDescription',
    'canonicalUrl', 'pdfUrl', 'audioUrl', 'videoUrl', 'internalNotes',
  ]) optionalText(metadata, key, key === 'internalNotes' ? 10_000 : 2_000);
  if (metadata.difficulty === '') delete metadata.difficulty;
  if (metadata.difficulty != null && !['beginner', 'intermediate', 'advanced'].includes(String(metadata.difficulty))) {
    throw new ContentEditorError('Difficulty is not supported.');
  }
  optionalDate(metadata, 'publishDate');
  optionalDate(metadata, 'lastUpdated');
  optionalDate(metadata, 'reviewDate');
  if (metadata.canonicalUrl != null) {
    try { new URL(metadata.canonicalUrl as string); } catch { throw new ContentEditorError('Canonical URL must be an absolute URL.'); }
  }

  const body = typeof bodyValue === 'string' ? bodyValue.replace(/\r\n/g, '\n') : '';
  if (new TextEncoder().encode(body).byteLength > 2 * 1024 * 1024) {
    throw new ContentEditorError('The article body is too large.');
  }

  if (intent === 'publish') {
    if (!description) throw new ContentEditorError('Tagline is required before publishing.');
    if (tags.length === 0) throw new ContentEditorError('Add at least one tag before publishing.');
    if (!body.trim()) throw new ContentEditorError('Body is required before publishing.');
    if (typeof metadata.publishDate !== 'string' || Number.isNaN(Date.parse(metadata.publishDate))) {
      throw new ContentEditorError('A valid publication date and time are required before publishing.');
    }
  }
  return { metadata, body };
}

export function serializeMarkdown(
  originalSource: string | null,
  metadata: Record<string, unknown>,
  body: string,
): string {
  const match = originalSource?.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/);
  const document = match ? parseDocument(match[1]) : parseDocument('');
  if (document.errors.length) throw new ContentEditorError('The existing frontmatter is invalid.');

  const current = document.toJS();
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    for (const key of Object.keys(current)) {
      if (!(key in metadata)) document.delete(key);
    }
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) document.delete(key);
    else document.set(key, value);
  }
  return `---\n${document.toString({ lineWidth: 88 }).trimEnd()}\n---\n\n${body.replace(/^\s*\n/, '')}`;
}
