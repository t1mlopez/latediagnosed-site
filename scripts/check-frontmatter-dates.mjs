import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const contentRoot = new URL("../src/content/", import.meta.url);
const dateFields = new Set(["publishDate", "lastUpdated", "reviewDate"]);
const scalarDate = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const location = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      return entry.isDirectory()
        ? markdownFiles(location)
        : /\.mdx?$/.test(entry.name)
          ? [location]
          : [];
    }),
  );
  return files.flat();
}

function unquote(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

const errors = [];

for (const file of await markdownFiles(contentRoot)) {
  const source = await readFile(file, "utf8");
  const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/)?.[1];
  if (!frontmatter) continue;

  for (const [index, line] of frontmatter.split(/\r?\n/).entries()) {
    const field = line.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/);
    if (!field || !dateFields.has(field[1])) continue;

    const value = unquote((field[2] ?? "").trim());
    if (!value) continue;

    const isScalarDate = value && !/^[{[]/.test(value) && !Number.isNaN(Date.parse(value));
    const matchesFieldFormat = field[1] !== "lastUpdated" || scalarDate.test(value);
    if (!isScalarDate || !matchesFieldFormat) {
      const relative = path.relative(process.cwd(), file.pathname);
      errors.push(`${relative}:${index + 2} ${field[1]} must be a scalar ISO date, received ${field[2] || "a nested value"}`);
    }
  }
}

if (errors.length) {
  console.error(`Malformed frontmatter dates:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("Frontmatter dates are valid scalar ISO dates.");
}
