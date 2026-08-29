import { defineMiddleware } from 'astro:middleware';
import { clearSession, readSession } from './lib/auth/cookies';
import { SESSION_COOKIE } from './lib/auth/config';

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const session = await readSession(context.cookies);
    context.locals.user = session?.user ?? null;
    if (!session && context.cookies.has(SESSION_COOKIE)) clearSession(context.cookies);
  } catch {
    context.locals.user = null;
  }

  return next();
});
