import type { APIRoute } from 'astro';
import { readCmsMedia } from '../../../lib/cms/github-app';
import { cmsJson, requireCmsApiUser } from '../../../lib/cms/http';
import { CmsPolicyError, requireReadableCmsPath } from '../../../lib/cms/policy';

const CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const GET: APIRoute = async (context) => {
  const user = requireCmsApiUser(context);
  if (user instanceof Response) return user;
  try {
    const path = requireReadableCmsPath(context.url.searchParams.get('path'));
    if (!path.startsWith('public/uploads/')) throw new CmsPolicyError('Media path is not allowed.');
    const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) throw new CmsPolicyError('Media type is not allowed.');
    const bytes = await readCmsMedia(path);
    return new Response(Uint8Array.from(bytes).buffer, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof CmsPolicyError) return cmsJson({ error: error.message }, 400);
    return cmsJson({ error: 'CMS repository authorization failed. Contact the site administrator.' }, 502);
  }
};
