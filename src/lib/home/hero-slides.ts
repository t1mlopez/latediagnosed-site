/** Only numbered snippets participate; renaming a file without its number pauses it. */
export function selectHeroSlides<T>(modules: Record<string, T>): T[] {
  return Object.entries(modules)
    .map(([path, component]) => {
      const name = path.split('/').pop() ?? '';
      const match = /^(\d+)-(.+)\.astro$/.exec(name);
      return match ? { order: BigInt(match[1]), name, component } : null;
    })
    .filter((slide) => slide !== null)
    .sort((a, b) => a.order < b.order ? -1 : a.order > b.order ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .map((slide) => slide.component);
}
