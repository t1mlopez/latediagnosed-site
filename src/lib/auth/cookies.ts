import type { AstroCookies } from 'astro';
import { getAuthConfig, SESSION_COOKIE, TRANSACTION_COOKIE } from './config';
import { sealAuthValue, unsealAuthValue } from './crypto';
import { isValidAuthSession } from './session';
import type { AuthSession, LoginTransaction } from './types';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: import.meta.env.PROD,
  path: '/',
};

export async function setLoginTransaction(cookies: AstroCookies, transaction: LoginTransaction) {
  const { sessionSecret } = getAuthConfig();
  cookies.set(TRANSACTION_COOKIE, await sealAuthValue(transaction, sessionSecret), { ...cookieOptions, maxAge: 10 * 60 });
}

export async function readLoginTransaction(cookies: AstroCookies): Promise<LoginTransaction | null> {
  const value = cookies.get(TRANSACTION_COOKIE)?.value;
  if (!value) return null;
  const { sessionSecret } = getAuthConfig();
  const transaction = await unsealAuthValue<LoginTransaction>(value, sessionSecret);
  return transaction && transaction.expiresAt > Date.now() ? transaction : null;
}

export function clearLoginTransaction(cookies: AstroCookies) {
  cookies.delete(TRANSACTION_COOKIE, cookieOptions);
}

export async function setSession(cookies: AstroCookies, session: AuthSession) {
  const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  const { sessionSecret } = getAuthConfig();
  cookies.set(SESSION_COOKIE, await sealAuthValue(session, sessionSecret), { ...cookieOptions, maxAge });
}

export async function readSession(cookies: AstroCookies): Promise<AuthSession | null> {
  const value = cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const { sessionSecret } = getAuthConfig();
  const session = await unsealAuthValue<AuthSession>(value, sessionSecret);
  return isValidAuthSession(session) ? session : null;
}

export function clearSession(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, cookieOptions);
}
