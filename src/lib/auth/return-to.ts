export function safeReturnTo(value: string | null): string {
  if (!value) return '/account';

  const base = new URL('https://latediagnosed.invalid');
  const target = new URL(value, base);
  if (target.origin !== base.origin || !value.startsWith('/') || value.startsWith('//')) return '/account';

  return `${target.pathname}${target.search}${target.hash}`;
}
