import { sealAuthValue, unsealAuthValue } from '../auth/crypto.ts';

interface CmsCsrfPayload {
  purpose: 'cms-gateway';
  subject: string;
  expiresAt: number;
}

export async function createCmsCsrfToken(subject: string, secret: string, now = Date.now()): Promise<string> {
  return sealAuthValue({
    purpose: 'cms-gateway',
    subject,
    expiresAt: now + 15 * 60 * 1000,
  } satisfies CmsCsrfPayload, secret);
}

export async function validateCmsCsrfToken(
  token: string | null,
  subject: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const payload = await unsealAuthValue<CmsCsrfPayload>(token, secret);
  return Boolean(
    payload
      && payload.purpose === 'cms-gateway'
      && payload.subject === subject
      && typeof payload.expiresAt === 'number'
      && payload.expiresAt > now,
  );
}
