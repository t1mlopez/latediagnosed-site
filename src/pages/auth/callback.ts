import type { APIRoute } from 'astro';
import { getAuthConfig } from '../../lib/auth/config';
import { clearLoginTransaction, readLoginTransaction, setSession } from '../../lib/auth/cookies';
import { getOidcClient, oidc } from '../../lib/auth/oidc';
import { expiredLoginResponse, loginFailureResponse } from '../../lib/auth/responses';
import type { AuthUser } from '../../lib/auth/types';

function claimString(claims: Record<string, unknown>, names: string[]): string | undefined {
  for (const name of names) {
    const value = claims[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

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
  if (!transaction) return expiredLoginResponse();

  let tokens;
  try {
    const client = await getOidcClient();
    tokens = await oidc.authorizationCodeGrant(client, request, {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    });
  } catch {
    return loginFailureResponse();
  }
  const claims = tokens.claims();
  if (!claims?.sub) return new Response('Okta did not return a valid user identity.', { status: 401 });

  const normalizedClaims = claims as Record<string, unknown>;
  const authConfig = getAuthConfig();
  const user: AuthUser = {
    id: claims.sub,
    email: claimString(normalizedClaims, ['email']),
    name: claimString(normalizedClaims, ['name']),
    preferredUsername: claimString(normalizedClaims, ['preferred_username']),
    firstName: claimString(normalizedClaims, ['given_name', 'first_name', 'firstName']),
    preferredFirstName: claimString(normalizedClaims, ['preferred_first_name', 'preferredFirstName', 'nickname']),
    memberSince: claimString(normalizedClaims, ['member_since', 'memberSince', 'membership_start_date', 'membershipStartDate']),
    permissions: claimStrings(normalizedClaims, authConfig.permissionClaims),
  };
  const tokenExpiry = typeof claims.exp === 'number' ? claims.exp * 1000 : Date.now() + 60 * 60 * 1000;
  const expiresAt = Math.min(tokenExpiry, Date.now() + 8 * 60 * 60 * 1000);
  await setSession(cookies, { user, expiresAt });

  return redirect(new URL(transaction.returnTo, url.origin).toString());
};
