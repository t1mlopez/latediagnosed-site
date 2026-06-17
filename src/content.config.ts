import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const contentSchema = z.object({
  title: z.string(),
  description: z.string(),

  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  author: z.string(),

  publishDate: z.coerce.date().optional(),
  lastUpdated: z.coerce.date().optional(),

  status: z.enum(["draft", "published", "archived"]).default("draft"),

  featured: z.boolean().default(false),

  excerpt: z.string().optional(),

  heroImage: z.string().optional(),
});

const articles = defineCollection({
  loader: glob({ base: "./src/content/articles", pattern: "**/*.{md,mdx}" }),
  schema: contentSchema,
});

const resources = defineCollection({
  loader: glob({ base: "./src/content/resources", pattern: "**/*.{md,mdx}" }),
  schema: contentSchema,
});

const pages = defineCollection({
  loader: glob({ base: "./src/content/pages", pattern: "**/*.{md,mdx}" }),
  schema: contentSchema,
});

const authors = defineCollection({
  loader: glob({ base: "./src/content/authors", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    name: z.string(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
  }),
});

const categories = defineCollection({
  loader: glob({ base: "./src/content/categories", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = {
  articles,
  resources,
  pages,
  authors,
  categories,
};