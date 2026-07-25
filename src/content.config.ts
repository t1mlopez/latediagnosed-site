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

  keyTakeaways: z.array(z.string()).default([]),

  // Editorial metadata
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional(),

  audience: z
    .array(
      z.enum([
        "newly-diagnosed",
        "self-discovery",
        "family",
        "partners",
        "practitioners",
        "parents",
        "workplace",
        "general",
      ])
    )
    .default([]),

  reviewedBy: z.string().optional(),
  reviewDate: z.coerce.date().optional(),
  reviewNote: z.string().optional(),

  // SEO metadata
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  canonicalUrl: z.string().url().optional(),

  // Related content controls
  relatedArticles: z.array(z.string()).default([]),
  relatedResources: z.array(z.string()).default([]),
  relatedGuides: z.array(z.string()).default([]),

  // Reuse / derivative content
  hasPdf: z.boolean().default(false),
  pdfUrl: z.string().optional(),

  hasAudio: z.boolean().default(false),
  audioUrl: z.string().optional(),

  hasVideo: z.boolean().default(false),
  videoUrl: z.string().optional(),

  // Internal editorial notes
  internalNotes: z.string().optional(),
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

    title: z.string().optional(),
    credentials: z.array(z.string()).default([]),
    website: z.string().url().optional(),
    socialLinks: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url(),
        })
      )
      .default([]),
  }),
});

const categories = defineCollection({
  loader: glob({ base: "./src/content/categories", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),

    featured: z.boolean().default(false),
    order: z.number().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const collections = {
  articles,
  resources,
  pages,
  authors,
  categories,
};
