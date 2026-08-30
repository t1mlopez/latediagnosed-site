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
  if (!value) return '/account';

  const base = new URL('https://latediagnosed.invalid');
  const target = new URL(value, base);
  if (target.origin !== base.origin || !value.startsWith('/')) return '/account';

  return `${target.pathname}${target.search}${target.hash}`;
}

export { oidc };
