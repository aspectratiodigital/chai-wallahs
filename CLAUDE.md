## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Project overview

Astro static site for Chai Wallahs (grassroots festival company, est. 1999), replacing the old Wix site at chaiwallahs.co.uk. Design follows the brand book: Stage Black `#1B1511`, Off White `#EFEFEF`, Chai Gold `#F8B31B` as the primary palette, with secondary colours (Velvet/Forest Deep/Forest/Ember/Crown) used sparingly per the brand's "3 colour rule". Fonts: Poster Cut Neue (headlines, self-hosted in `public/fonts`), PT Sans (body, Google Fonts), JetBrains Mono (labels/utility).

Content lives in Astro Content Collections (`src/content/`, schema in `src/content.config.ts`): `gigs`, `festivals`, `products`, `venues`, `partners`, `artists`, and `site` (per-page JSON copy/hero text). Shop is showcase-only — real checkout stays on the existing Wix store (`chaiwallahs.co.uk/category/all-products`); the `products` schema has unused `shopifyHandle`/`sku` fields reserved for a future Shopify swap so that migration is a data-source change, not a schema rewrite.

## Content editing (Decap CMS)

The site owner edits content themselves at `/admin` via Decap CMS, backed directly by GitHub (`backend: github` in `public/admin/config.yml`) — deliberately not using Netlify Identity/git-gateway, so this keeps working unchanged if the site ever moves off Netlify. Auth is a separate Cloudflare Worker (`cms-auth/`, built on Sveltia CMS Auth) since GitHub's OAuth handshake needs a server-side secret exchange the static site itself can't do; see `cms-auth/README.md` for the deploy/config story if it ever needs redeploying (new client secret, domain change, etc.).

CMS-uploaded images are stored under `public/uploads/<collection>/` rather than `src/assets/` — this is deliberate, not an oversight: Decap's live image preview needs a path it can put directly in an `<img src>`, and Astro's image optimizer only ever serves optimized output from a hashed `_astro/` path, never the raw `src/assets/` source, so CMS images could never preview correctly from there. Trade-off: CMS-managed images skip Astro's Sharp optimization; every hand-placed (non-CMS) image on the site is unaffected and still fully optimized.

To test the CMS locally without hitting real GitHub OAuth: run `npx decap-server` alongside `npm run dev`, then open `http://localhost:4321/admin/` (`local_backend: true` is already set in `config.yml`).

## Deploy workflow

Repo: `github.com/aspectratiodigital/chai-wallahs`, deployed to Netlify from `main`. Default cadence: commit locally after each logical change, but batch pushes rather than pushing after every commit — push (which triggers a Netlify deploy) at the end of a work session, or whenever explicitly asked to deploy ("push that now", "ship this today"). This is a deliberate preference (fewer, more intentional deploys), not a technical constraint — revisit once the site migrates to its long-standing eventual host (a friend's server), which this whole architecture (static output, GitHub-direct CMS backend, no Netlify-specific features) was chosen to make painless.

**Working across multiple machines**: this repo may be worked on from more than one computer. Before starting work, `git pull`. Before switching machines (or ending a session), commit and push rather than leaving uncommitted changes stranded on one machine — git is the source of truth for project state, not any single chat session.

## Windows dev environment notes

- **Node PATH**: if Node was freshly installed (e.g. via winget), already-running shells may not see `node`/`npm` on PATH until restarted. If a shell can't find `npm`/`node`, prepend `/c/Program Files/nodejs` to PATH for that command rather than assuming Node isn't installed.
- **Stale HMR**: the Astro/Vite dev server can silently keep serving an old compiled `.astro` component's `<style>`/`<script>` after an edit, even after a hard browser refresh — this has cost real debugging time more than once (looked exactly like a real logic bug both times). If a just-edited client script or style "isn't working" and the code looks correct, restart the dev server (`astro dev stop` then `astro dev --background`) before deep-diving into the code itself.
- **Browser-pane compositing**: in-session browser tooling can fail to composite frames when the pane isn't visible/focused — `transform`/compositor-driven CSS reads (and screenshots) can be unreliable then, while DOM state, classes, and non-compositor style changes (`background`, `color`, etc.) read correctly regardless. Prefer DOM/build verification over transform-dependent visual checks; ask for a human visual check on anything animation/transform-heavy (slide-ins, hover transforms).

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
