import type { AstroCookies } from 'astro';
import { getAuthConfig, SESSION_COOKIE, TRANSACTION_COOKIE } from './config';
import type { AuthSession, LoginTransaction } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(value: string): ArrayBuffer {
  const bytes = Uint8Array.from(Buffer.from(value, 'base64url'));
  return bytes.buffer;
}

async function encryptionKey(): Promise<CryptoKey> {
  const { sessionSecret } = getAuthConfig();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(sessionSecret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function seal(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), plaintext);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

async function unseal<T>(value: string): Promise<T | null> {
  try {
    const [encodedIv, encodedCiphertext] = value.split('.');
    if (!encodedIv || !encodedCiphertext) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(fromBase64Url(encodedIv)) },
      await encryptionKey(),
      fromBase64Url(encodedCiphertext),
    );
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: import.meta.env.PROD,
  path: '/',
};

export async function setLoginTransaction(cookies: AstroCookies, transaction: LoginTransaction) {
  cookies.set(TRANSACTION_COOKIE, await seal(transaction), { ...cookieOptions, maxAge: 10 * 60 });
}

export async function readLoginTransaction(cookies: AstroCookies): Promise<LoginTransaction | null> {
  const value = cookies.get(TRANSACTION_COOKIE)?.value;
  if (!value) return null;
  const transaction = await unseal<LoginTransaction>(value);
  return transaction && transaction.expiresAt > Date.now() ? transaction : null;
}

export function clearLoginTransaction(cookies: AstroCookies) {
  cookies.delete(TRANSACTION_COOKIE, { path: '/' });
}

export async function setSession(cookies: AstroCookies, session: AuthSession) {
  const maxAge = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  cookies.set(SESSION_COOKIE, await seal(session), { ...cookieOptions, maxAge });
}

export async function readSession(cookies: AstroCookies): Promise<AuthSession | null> {
  const value = cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const session = await unseal<AuthSession>(value);
  return session && session.expiresAt > Date.now() ? session : null;
}

export function clearSession(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
