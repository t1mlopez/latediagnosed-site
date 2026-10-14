interface AuthorEntry {
  id: string;
  data: { name: string };
}

/** Resolve CMS author slugs or names without hiding unlisted bylines. */
export function resolveAuthorName(value: string, authors: AuthorEntry[]): string | undefined {
  const name = value.trim();
  if (!name) return undefined;
  const key = name.toLowerCase();
  const author = authors.find((entry) =>
    entry.id.trim().toLowerCase() === key || entry.data.name.trim().toLowerCase() === key
  );
  return author?.data.name || name;
}
