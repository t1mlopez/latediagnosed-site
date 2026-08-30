import type { APIRoute } from 'astro';
import { getAuthConfig } from '../../lib/auth/config';
import { clearLoginTransaction, readLoginTransaction, setSession } from '../../lib/auth/cookies';
import { getOidcClient, oidc } from '../../lib/auth/oidc';
import type { AuthUser } from '../../lib/auth/types';

function claimStrings(claims: Record<string, unknown>, names: string[]): string[] {
  const values = names.flatMap((name) => {
    const value = claims[name];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    return [];
  });
  return [...new Set(values)].sort();
}

export const GET: APIRoute = async ({ cookies, redirect, request, url }) => {
  const transaction = await readLoginTransaction(cookies);
  clearLoginTransaction(cookies);
  if (!transaction) return new Response('Login session expired. Please try again.', { status: 400 });

  const client = await getOidcClient();
  const tokens = await oidc.authorizationCodeGrant(client, request, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: transaction.state,
    expectedNonce: transaction.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims?.sub) return new Response('Okta did not return a valid user identity.', { status: 401 });

  const authConfig = getAuthConfig();
  const user: AuthUser = {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    preferredUsername: typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined,
    permissions: claimStrings(claims as Record<string, unknown>, authConfig.permissionClaims),
  };
  const tokenExpiry = typeof claims.exp === 'number' ? claims.exp * 1000 : Date.now() + 60 * 60 * 1000;
  const expiresAt = Math.min(tokenExpiry, Date.now() + 8 * 60 * 60 * 1000);
  await setSession(cookies, { user, expiresAt });

  return redirect(new URL(transaction.returnTo, url.origin).toString());
};
