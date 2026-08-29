import type { APIContext, AstroGlobal } from 'astro';
import type { AuthUser } from './types';

type Context = APIContext | AstroGlobal;

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function requireUser(context: Context): AuthUser | Response {
  const user = context.locals.user;
  if (!user) {
    const returnTo = `${context.url.pathname}${context.url.search}`;
    return context.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

export function requirePermission(context: Context, permission: string): AuthUser | Response {
  const result = requireUser(context);
  if (result instanceof Response) return result;
  const user = result;
  if (!hasPermission(user, permission)) {
    return new Response('Forbidden', { status: 403 });
  }
  return user;
}
