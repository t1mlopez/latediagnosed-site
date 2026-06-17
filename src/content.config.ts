import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const guides = defineCollection({
  loader: glob({ base: "./src/content/guides", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

const resource_hubs = defineCollection({
  loader: glob({ base: "./src/content/resource-hubs", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

const updates = defineCollection({
  loader: glob({ base: "./src/content/updates", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  guides,
  resource_hubs,
  updates,
};