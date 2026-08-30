import * as oidc from 'openid-client';
import { getAuthConfig } from './config';
export { safeReturnTo } from './return-to';

let cachedClient: Promise<oidc.Configuration> | undefined;

export function getOidcClient(): Promise<oidc.Configuration> {
  if (!cachedClient) {
    const config = getAuthConfig();
    cachedClient = oidc.discovery(
      new URL(config.issuer),
      config.clientId,
      config.clientSecret,
    );
  }
  return cachedClient;
}

export { oidc };
