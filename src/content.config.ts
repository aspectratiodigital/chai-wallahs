import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Gigs (Bristol one-night shows) and Festivals (multi-day touring festivals)
// share an identical schema - same shape, different folders/routes so each
// gets its own listing page and URL space (/gigs/ vs /festivals/).
const eventSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  time: z.string().optional(),
  // Festivals only: when a festival runs across multiple days, endDate marks
  // the last day (the "Date" row then shows the full start-end range) and
  // openingTime holds the actual first-day gate/doors time (the "Time" row
  // becomes "Opening Time"). Gigs never set these and keep using `time` as
  // a plain single-day time string, label "Time".
  endDate: z.coerce.date().optional(),
  openingTime: z.string().optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
  blurb: z.string(),
  ticketUrl: z.string().url().optional(),
  image: z.string(),
  poster: z.string().optional(),
  draft: z.boolean().default(false),
});

const gigs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/gigs" }),
  schema: eventSchema,
});

const festivals = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/festivals" }),
  schema: eventSchema,
});

const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    name: z.string(),
    price: z.number(),
    image: z.string(),
    imageHover: z.string().optional(),
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
  schema: z.object({
    name: z.string(),
    text: z.string(),
    image: z.string(),
    order: z.number().default(0),
  }),
});

const partners = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/partners" }),
  schema: z.object({
    name: z.string(),
    logo: z.string(),
    url: z.string().url().optional(),
    small: z.boolean().default(false),
    xsmall: z.boolean().default(false),
    large: z.boolean().default(false),
    invert: z.boolean().default(false),
  }),
});

const artists = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/artists" }),
  schema: z.object({
    name: z.string(),
    genres: z.array(z.string()).default([]),
    image: z.string(),
    socials: z.array(z.object({ platform: z.string(), url: z.string().url() })).default([]),
    years: z.array(z.number()),
    // A track to feature via Spotify's embed player - paste either the
    // full share link (open.spotify.com/track/...) or just the bare
    // track ID; whichever is easiest when copying it from Spotify's own
    // "Share" menu. Update this whenever there's a new track worth
    // featuring - there's no API involved, so nothing updates itself.
    spotifyTrackUrl: z.string().optional(),

    // --- Profile-page extras. All optional: the page simply leaves out any
    // section it has no data for.
    // First year they properly started releasing music publicly (the polaroid's "Est.").
    activeSince: z.number().int().optional(),
    // Festivals they've played — the scrolling banner at the top of the page.
    festivals: z.array(z.string()).default([]),
    // Newest full-length album (or, failing that, EP/single — see `kind`).
    newestAlbum: z
      .object({
        title: z.string(),
        year: z.number().int(),
        // Spotify where we could match it, otherwise Apple Music.
        url: z.string().url(),
        // Cover art, stored under public/uploads/artists/.
        cover: z.string().optional(),
        kind: z.enum(["Album", "EP", "Single", "Release"]).default("Album"),
      })
      .optional(),
    // A photo of them on stage — a frame from one of their own live videos when
    // there's no better one. Must be a different picture from `image`.
    livePhoto: z.object({ image: z.string(), caption: z.string().optional() }).optional(),
    // One gig or festival poster.
    poster: z
      .object({
        image: z.string(),
        kind: z.enum(["Gig", "Festival"]).default("Gig"),
        caption: z.string().optional(),
      })
      .optional(),
    // YouTube video ID for the player at the bottom of the page.
    videoId: z.string().optional(),
    videoTitle: z.string().optional(),
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

export const collections = { gigs, festivals, products, venues, partners, site, artists };
