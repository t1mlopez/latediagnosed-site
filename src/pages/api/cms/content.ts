import type { APIRoute } from 'astro';
import {
  commitCmsChanges,
  listCmsEntries,
  readCmsEntry,
} from '../../../lib/cms/github-app';
import { cmsJson, requireCmsApiUser, requireCmsMutation } from '../../../lib/cms/http';
import {
  ContentEditorError,
  EDITABLE_COLLECTIONS,
  collectionFolder,
  requireEditableCollection,
  requireSlug,
  serializeMarkdown,
  splitMarkdown,
  validateEditorContent,
} from '../../../lib/cms/content-editor';
import { CmsPolicyError, requireReadableCmsPath } from '../../../lib/cms/policy';

export const GET: APIRoute = async (context) => {
  const user = requireCmsApiUser(context);
  if (user instanceof Response) return user;

  try {
    const path = context.url.searchParams.get('path');
    if (path) {
      const safePath = requireReadableCmsPath(path);
      const entry = await readCmsEntry(safePath);
      if (!entry.file.id) return cmsJson({ error: 'Content not found.' }, 404);
      const collection = requireEditableCollection(safePath.split('/')[2]);
      const parsed = splitMarkdown(entry.data);
      return cmsJson({
        entry: {
          path: safePath,
          sha: entry.file.id,
          collection,
          slug: safePath.slice(safePath.lastIndexOf('/') + 1, -3),
          ...parsed,
        },
      });
    }

    const groups = await Promise.all(EDITABLE_COLLECTIONS.map(async (collection) => ({
      collection,
      entries: await listCmsEntries(collectionFolder(collection), 'md', 2),
    })));
    const entries = groups.flatMap(({ collection, entries }) => entries.map((entry) => {
      const { metadata } = splitMarkdown(entry.data);
      return {
        path: entry.file.path,
        sha: entry.file.id,
        collection,
        slug: entry.file.path.slice(entry.file.path.lastIndexOf('/') + 1, -3),
        title: typeof metadata.title === 'string' ? metadata.title : 'Untitled',
        tagline: typeof metadata.description === 'string' ? metadata.description : '',
        status: metadata.status === 'published' || metadata.status === 'archived' ? metadata.status : 'draft',
        publishDate: typeof metadata.publishDate === 'string' ? metadata.publishDate : '',
        tags: Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      };
    }));
    return cmsJson({ entries });
  } catch (error) {
    if (error instanceof ContentEditorError) return cmsJson({ error: error.message }, error.status);
    if (error instanceof CmsPolicyError) return cmsJson({ error: error.message }, 400);
    return cmsJson({ error: 'The content editor could not load the repository.' }, 502);
  }
};

interface SaveRequest {
  collection?: unknown;
  slug?: unknown;
  originalPath?: unknown;
  expectedSha?: unknown;
  metadata?: unknown;
  body?: unknown;
  intent?: unknown;
}

export const POST: APIRoute = async (context) => {
  const user = requireCmsApiUser(context);
  if (user instanceof Response) return user;
  const rejected = await requireCmsMutation(context, user);
  if (rejected) return rejected;

  try {
    let request: SaveRequest;
    try { request = await context.request.json() as SaveRequest; }
    catch { throw new ContentEditorError('The content editor request is invalid.'); }
    const collection = requireEditableCollection(request.collection);
    const slug = requireSlug(request.slug);
    const intent = request.intent === 'publish' ? 'publish' : 'draft';
    const path = `${collectionFolder(collection)}/${slug}.md`;
    let originalPath: string | null = null;
    let originalSource: string | null = null;

    if (typeof request.originalPath === 'string' && request.originalPath) {
      originalPath = requireReadableCmsPath(request.originalPath);
      requireEditableCollection(originalPath.split('/')[2]);
      const original = await readCmsEntry(originalPath);
      if (!original.file.id) throw new ContentEditorError('The original content no longer exists.', 409);
      if (typeof request.expectedSha !== 'string' || original.file.id !== request.expectedSha) {
        throw new ContentEditorError('This content changed after you opened it. Reload before saving.', 409);
      }
      originalSource = original.data;
    } else {
      const existing = await readCmsEntry(path);
      if (existing.file.id) throw new ContentEditorError('That URL slug is already in use.', 409);
    }

    const { metadata, body } = validateEditorContent(request.metadata, request.body, intent);
    metadata.slug = slug;
    const content = serializeMarkdown(originalSource, metadata, body);
    await commitCmsChanges(
      [{ path, content, encoding: 'utf-8' }],
      originalPath && originalPath !== path ? [originalPath] : [],
      `Content editor: ${intent === 'publish' ? 'publish' : 'save draft'} ${slug}`,
    );
    const saved = await readCmsEntry(path);
    return cmsJson({ ok: true, path, sha: saved.file.id, slug, status: metadata.status });
  } catch (error) {
    if (error instanceof ContentEditorError) return cmsJson({ error: error.message }, error.status);
    if (error instanceof CmsPolicyError) return cmsJson({ error: error.message }, 400);
    const message = error instanceof Error && /repository changed/i.test(error.message)
      ? error.message
      : 'The content editor could not save this change.';
    return cmsJson({ error: message }, 502);
  }
};
