import { getSecret } from 'astro:env/server';

export const SESSION_COOKIE = import.meta.env.PROD ? '__Host-ld_session' : 'ld_session';
export const TRANSACTION_COOKIE = import.meta.env.PROD ? '__Host-ld_login' : 'ld_login';

function required(name: string): string {
  const value = getSecret(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getAuthConfig() {
  const issuer = required('OKTA_ISSUER').replace(/\/$/, '');
  const sessionSecret = required('OKTA_SESSION_SECRET');

  if (sessionSecret.length < 32) {
    throw new Error('OKTA_SESSION_SECRET must be at least 32 characters long');
  }

  const permissionClaims = (getSecret('OKTA_PERMISSION_CLAIMS') || 'okta_groups,groups,roles,permissions')
    .split(',')
    .map((claim) => claim.trim())
    .filter(Boolean);

  return {
    issuer,
    clientId: required('OKTA_CLIENT_ID'),
    clientSecret: required('OKTA_CLIENT_SECRET'),
    sessionSecret,
    permissionClaims,
  };
}
