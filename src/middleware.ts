import { defineMiddleware } from 'astro:middleware';
import { clearSession, readSession } from './lib/auth/cookies';
import { SESSION_COOKIE } from './lib/auth/config';

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

  return next();
});
