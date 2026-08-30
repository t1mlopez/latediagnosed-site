import type { AuthUser } from './types';

export const CMS_PERMISSION = 'CMS Editors';
export const CMS_LOGIN_PATH = '/auth/login?returnTo=/admin/';

export type CmsAccessDecision = 'allow' | 'login' | 'forbidden';

export function isCmsPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function cmsAccessDecision(user: AuthUser | null): CmsAccessDecision {
  if (!user) return 'login';
  return user.permissions.includes(CMS_PERMISSION) ? 'allow' : 'forbidden';
}
