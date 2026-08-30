import type { APIRoute } from 'astro';
import {
  commitCmsChanges,
  listCmsEntries,
  listCmsMedia,
  readCmsEntries,
  readCmsEntry,
  type CmsWrite,
} from '../../../lib/cms/github-app';
import { cmsJson, requireCmsApiUser, requireCmsMutation } from '../../../lib/cms/http';
import {
  CmsPolicyError,
  requireCmsBranch,
  requireCmsRepository,
  requireContentFolder,
  requireReadableCmsPath,
} from '../../../lib/cms/policy';

interface RepositoryRequest {
  repository?: unknown;
  branch?: unknown;
  operation?: unknown;
  folder?: unknown;
  extension?: unknown;
  depth?: unknown;
  files?: unknown;
  path?: unknown;
  writes?: unknown;
  deletes?: unknown;
  commitMessage?: unknown;
}

function requestFiles(value: unknown): Array<{ path: string; label?: string }> {
  if (!Array.isArray(value) || value.length > 30) throw new CmsPolicyError('Invalid file list.');
  return value.map((file) => {
    if (!file || typeof file !== 'object') throw new CmsPolicyError('Invalid file list.');
    const record = file as Record<string, unknown>;
    const path = requireReadableCmsPath(record.path);
    const label = typeof record.label === 'string' ? record.label.slice(0, 100) : undefined;
    return { path, label };
  });
}

function requestWrites(value: unknown): CmsWrite[] {
  if (!Array.isArray(value) || value.length > 30) throw new CmsPolicyError('Invalid write list.');
  return value.map((write) => {
    if (!write || typeof write !== 'object') throw new CmsPolicyError('Invalid write list.');
    const record = write as Record<string, unknown>;
    if (typeof record.path !== 'string' || typeof record.content !== 'string') {
      throw new CmsPolicyError('Invalid write entry.');
    }
    if (record.encoding !== 'utf-8' && record.encoding !== 'base64') {
      throw new CmsPolicyError('Invalid write encoding.');
    }
    return { path: record.path, content: record.content, encoding: record.encoding };
  });
}

function requestDeletes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 30 || value.some((path) => typeof path !== 'string')) {
    throw new CmsPolicyError('Invalid delete list.');
  }
  return value as string[];
}

export const POST: APIRoute = async (context) => {
  const user = requireCmsApiUser(context);
  if (user instanceof Response) return user;
  const rejected = await requireCmsMutation(context, user);
  if (rejected) return rejected;

  let body: RepositoryRequest;
  try {
    body = await context.request.json() as RepositoryRequest;
  } catch {
    return cmsJson({ error: 'The CMS request body is invalid.' }, 400);
  }

  try {
    requireCmsRepository(body.repository);
    requireCmsBranch(body.branch);

    switch (body.operation) {
      case 'listEntries': {
        const folder = requireContentFolder(body.folder);
        if (body.extension !== 'md') throw new CmsPolicyError('Content extension is not allowed.');
        const depth = typeof body.depth === 'number' && Number.isInteger(body.depth)
          ? Math.min(Math.max(body.depth, 0), 10)
          : 1;
        return cmsJson({ entries: await listCmsEntries(folder, 'md', depth) });
      }
      case 'entriesByFiles':
        return cmsJson({ entries: await readCmsEntries(requestFiles(body.files)) });
      case 'getEntry':
        return cmsJson({ entry: await readCmsEntry(requireReadableCmsPath(body.path)) });
      case 'listMedia':
        return cmsJson({ media: await listCmsMedia() });
      case 'write': {
        const writes = requestWrites(body.writes);
        const deletes = requestDeletes(body.deletes);
        if (typeof body.commitMessage !== 'string') throw new CmsPolicyError('Commit message is required.');
        await commitCmsChanges(writes, deletes, body.commitMessage);
        return cmsJson({ ok: true });
      }
      default:
        return cmsJson({ error: 'CMS operation is not allowed.' }, 400);
    }
  } catch (error) {
    if (error instanceof CmsPolicyError) return cmsJson({ error: error.message }, 400);
    const message = error instanceof Error && /^CMS |^The repository|^GitHub returned|^Media file/.test(error.message)
      ? error.message
      : 'The CMS repository operation failed. Contact the site administrator.';
    return cmsJson({ error: message }, 502);
  }
};

