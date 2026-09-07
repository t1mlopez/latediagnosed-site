import type { APIRoute } from 'astro';
import { getAuthConfig } from '../../lib/auth/config';
import { setLoginTransaction } from '../../lib/auth/cookies';
import { getOidcClient, oidc, safeReturnTo } from '../../lib/auth/oidc';

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
  const client = await getOidcClient();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
  const redirectUri = new URL('/auth/callback', url.origin).toString();

  await setLoginTransaction(cookies, {
    codeVerifier,
    nonce,
    state,
    returnTo,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const authorizationUrl = oidc.buildAuthorizationUrl(client, {
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  // Reading config here ensures a clear error before redirect if setup is incomplete.
  getAuthConfig();
  return redirect(authorizationUrl.toString());
};
