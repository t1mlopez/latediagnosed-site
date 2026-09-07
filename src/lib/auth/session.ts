import type { AuthSession } from './types';

export function isValidAuthSession(value: unknown, now = Date.now()): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  if (typeof session.expiresAt !== 'number' || session.expiresAt <= now) return false;
  if (!session.user || typeof session.user.id !== 'string' || !Array.isArray(session.user.permissions)) return false;
  return session.user.permissions.every((permission) => typeof permission === 'string');
}
