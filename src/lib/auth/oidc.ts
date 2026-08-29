import * as oidc from 'openid-client';
import { getAuthConfig } from './config';

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

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account';
  return value;
}

export { oidc };
