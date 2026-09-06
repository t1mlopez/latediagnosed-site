import { defineMiddleware } from 'astro:middleware';
import { cmsAccessDecision, cmsLoginPath, isCmsPath } from './lib/auth/cms';
import { clearSession, readSession } from './lib/auth/cookies';
import { SESSION_COOKIE } from './lib/auth/config';
import { cmsForbiddenResponse } from './lib/auth/responses';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.hostname === 'www.latediagnosed.org') {
    const canonicalUrl = new URL(context.url);
    canonicalUrl.hostname = 'latediagnosed.org';
    return context.redirect(canonicalUrl.toString(), 308);
  }

  try {
    const session = await readSession(context.cookies);
    context.locals.user = session?.user ?? null;
    if (!session && context.cookies.has(SESSION_COOKIE)) clearSession(context.cookies);
  } catch {
    context.locals.user = null;
  }

  if (isCmsPath(context.url.pathname)) {
    const decision = cmsAccessDecision(context.locals.user);
    if (decision === 'login') return context.redirect(cmsLoginPath(context.url.pathname, context.url.search));
    if (decision === 'forbidden') return cmsForbiddenResponse();
    if (context.url.pathname === '/admin') return context.redirect('/admin/', 308);

    const response = await next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  return next();
});
