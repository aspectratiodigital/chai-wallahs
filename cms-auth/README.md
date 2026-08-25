# CMS OAuth — deploy instructions

Decap CMS's `backend: github` needs a small server-side piece to complete GitHub's
OAuth handshake (GitHub requires exchanging a secret for a token, which can't
happen in the browser). This is **not** part of the Astro site's build — it's a
separate, tiny Cloudflare Worker, deployed independently, so the site itself stays
100% static and this piece never has to change when the site's host changes later.

We're using **Sveltia CMS Auth** (`sveltia/sveltia-cms-auth` on GitHub) rather than
writing this from scratch — it implements the exact handshake Decap expects (Sveltia
is a Decap-compatible CMS from the same ecosystem), is actively maintained, and
ships a one-click Cloudflare Workers deploy path, which is lower-risk than hand-rolling
an OAuth token exchange.

## 1. Create a GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:
- **Homepage URL**: your site's URL (e.g. `https://chai-wallahs.netlify.app`)
- **Authorization callback URL**: `https://<your-worker-subdomain>.workers.dev/callback`
  (you'll know the exact Worker URL after step 2 — you can come back and fill this in)

Note the **Client ID** and generate a **Client Secret**.

## 2. Deploy the Worker

Either use the one-click "Deploy to Cloudflare" button on the
[sveltia-cms-auth repo](https://github.com/sveltia/sveltia-cms-auth), or clone it
and run `wrangler deploy` locally (requires a free Cloudflare account and the
`wrangler` CLI: `npm install -g wrangler`, then `wrangler login`).

## 3. Set the Worker's environment variables

In the Cloudflare dashboard, on the deployed Worker's page → Settings → Variables:
- `GITHUB_CLIENT_ID` — from step 1
- `GITHUB_CLIENT_SECRET` — from step 1 (encrypt this one)
- `ALLOWED_DOMAINS` — the domain(s) allowed to use this login, e.g.
  `chai-wallahs.netlify.app` (comma-separate more than one, and update this whenever
  the site moves to a new host/domain — this is the one setting that's host-specific)

## 4. Point config.yml at the deployed Worker

In `public/admin/config.yml`, replace the placeholder:
```yaml
base_url: https://REPLACE-WITH-YOUR-WORKER.workers.dev
```
with the real Worker URL from step 2. Commit and push.

## 5. Add CMS editors

Decap's GitHub backend auth is just "can this GitHub account push to the repo" —
add anyone who should be able to log in at `/admin` as a collaborator on the
`aspectratiodigital/chai-wallahs` GitHub repo.

## Testing without real GitHub OAuth

For local testing, skip all of the above: add `local_backend: true` to
`config.yml`, run `npx decap-server` alongside `npm run dev`, and open
`http://localhost:4321/admin/` — this lets you exercise the whole editing UI,
including image uploads, against your local filesystem instead of GitHub.
