import type { AuthUser } from './types';

export const CMS_PERMISSION = 'CMS Editors';
export const CMS_LOGIN_PATH = '/auth/login?returnTo=/admin/';
export const CONTENT_EDITOR_PATH = '/account/content/';

export type CmsAccessDecision = 'allow' | 'login' | 'forbidden';

export function isCmsPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') ||
    pathname === '/account/content' || pathname.startsWith('/account/content/');
}

export function cmsLoginPath(pathname: string, search = ''): string {
  const returnTo = pathname === '/admin' ? '/admin/' : `${pathname}${search}`;
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function cmsAccessDecision(user: AuthUser | null): CmsAccessDecision {
  if (!user) return 'login';
  return user.permissions.includes(CMS_PERMISSION) ? 'allow' : 'forbidden';
}
