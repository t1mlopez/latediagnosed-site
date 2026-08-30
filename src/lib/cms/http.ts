import type { APIContext } from 'astro';
import { getAuthConfig } from '../auth/config';
import { CMS_PERMISSION } from '../auth/cms';
import type { AuthUser } from '../auth/types';
import { validateCmsCsrfToken } from './csrf';
import { isAllowedRequestOrigin } from './policy';

export function cmsJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function requireCmsApiUser(context: APIContext): AuthUser | Response {
  const user = context.locals.user;
  if (!user) return cmsJson({ error: 'Your Content Center session has expired. Sign in with Okta again.' }, 401);
  if (!user.permissions.includes(CMS_PERMISSION)) {
    return cmsJson({ error: 'Your Okta account does not have the CMS Editors permission.' }, 403);
  }
  return user;
}

export async function requireCmsMutation(context: APIContext, user: AuthUser): Promise<Response | null> {
  if (!isAllowedRequestOrigin(context.url, context.request.headers.get('Origin'))) {
    return cmsJson({ error: 'Request origin was not accepted.' }, 403);
  }
  if (!context.request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return cmsJson({ error: 'Content-Type must be application/json.' }, 415);
  }
  const contentLength = Number(context.request.headers.get('Content-Length') || 0);
  if (Number.isFinite(contentLength) && contentLength > 28 * 1024 * 1024) {
    return cmsJson({ error: 'CMS request is too large.' }, 413);
  }

  const { sessionSecret } = getAuthConfig();
  const validCsrf = await validateCmsCsrfToken(
    context.request.headers.get('X-CMS-CSRF'),
    user.id,
    sessionSecret,
  );
  return validCsrf ? null : cmsJson({ error: 'CMS request verification expired. Reload Content Center.' }, 403);
}

