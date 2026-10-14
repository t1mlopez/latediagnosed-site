/** Keep unfinished homepage design modules out of production. */
export function showDesignModules(hostname: string): boolean {
  return ['preview.latediagnosed.org', 'localhost', '127.0.0.1'].includes(hostname);
}
