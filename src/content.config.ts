import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const specFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  specTag: z.string(),
  wireVersion: z.string(),
  releaseDate: z.string(),
  commit: z.string(),
  sourcePath: z.string(),
});

export const collections = {
  spec: defineCollection({
    loader: glob({
      pattern: "*.md",
      base: "./src/content/spec",
      generateId: ({ entry }) => entry.replace(/\.md$/, ""),
    }),
    schema: specFrontmatterSchema,
  }),
  generated: defineCollection({
    loader: glob({
      pattern: "*.md",
      base: "./src/content/generated",
      generateId: ({ entry }) => entry.replace(/\.md$/, ""),
    }),
    schema: specFrontmatterSchema,
  }),
};
