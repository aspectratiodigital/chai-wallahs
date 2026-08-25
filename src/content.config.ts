import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      venue: z.string().optional(),
      blurb: z.string(),
      ticketUrl: z.string().url().optional(),
      image: image(),
      draft: z.boolean().default(false),
    }),
});

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      price: z.number(),
      image: image(),
      imageHover: image().optional(),
      category: z.string(),
      featured: z.boolean().default(false),
      // Unused today — reserved so a future Shopify Storefront API swap doesn't
      // need a schema change, just a new data source mapped to the same shape.
      shopifyHandle: z.string().optional(),
      sku: z.string().optional(),
    }),
});

const venues = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/venues" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      text: z.string(),
      image: image(),
      order: z.number().default(0),
    }),
});

const partners = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/partners" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      logo: image(),
      url: z.string().url().optional(),
      small: z.boolean().default(false),
      xsmall: z.boolean().default(false),
      large: z.boolean().default(false),
      invert: z.boolean().default(false),
    }),
});

// One JSON file per page — hero/body copy plus the small repeating arrays that
// are tightly coupled to that page's narrative (mission points, timeline, etc.).
const site = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/site" }),
  schema: z.object({
    missionFounding: z.string().optional(),
    wiabSub: z.string().optional(),
    finalCtaHeadline: z.string().optional(),
    finalCtaBody: z.string().optional(),
    missionPoints: z.array(z.object({ text: z.string() })).optional(),

    missionLead: z.string().optional(),
    missionCol1: z.string().optional(),
    missionCol2: z.string().optional(),
    bookUsBody: z.string().optional(),
    timeline: z.array(z.object({ year: z.string(), text: z.string() })).optional(),
    symbols: z.array(z.object({ title: z.string(), text: z.string() })).optional(),

    heroNote: z.string().optional(),

    heroSub: z.string().optional(),
    shopNote: z.string().optional(),

    tracks: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          text: z.string(),
          cta: z.string(),
          subject: z.string(),
          color: z.string(),
        }),
      )
      .optional(),

    introCopy: z.string().optional(),
    doesMean: z.array(z.object({ text: z.string() })).optional(),
    doesntMean: z.array(z.object({ text: z.string() })).optional(),
    venuesIntro: z.string().optional(),
    festivalCopy: z.string().optional(),
    festivalMeta: z.string().optional(),
  }),
});

export const collections = { events, products, venues, partners, site };
