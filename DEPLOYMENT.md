# Notes2Pics — Deployment & Go-Live Checklist

This app is a Vite/React SPA plus one Vercel serverless function (`api/lemonsqueezy-webhook.js`),
backed by Supabase (Auth + Postgres) and Lemon Squeezy (payments).

The Supabase project and database schema are **already created** (project ref
`wrymzmmqzyhgxkvudoma`). The steps below are the remaining dashboard/config work.

---

## 1. Environment variables

Client vars are prefixed `VITE_` and are safe to expose. Server vars are **secret** — set them
only in the Vercel dashboard, never commit them.

### Local (`.env.local`, already gitignored)
```
VITE_SUPABASE_URL=https://wrymzmmqzyhgxkvudoma.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_i5Khqjx6o5rUssdZdT78fA_a2_119ul
VITE_LS_CHECKOUT_MONTHLY=<lemon squeezy monthly checkout URL>
VITE_LS_CHECKOUT_LIFETIME=<lemon squeezy lifetime checkout URL>
```

### Vercel (Project → Settings → Environment Variables)
All of the above **plus** these server-only ones:
```
SUPABASE_URL=https://wrymzmmqzyhgxkvudoma.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<Supabase → Settings → API → service_role secret>
LEMONSQUEEZY_WEBHOOK_SECRET=<set when you create the webhook, step 4>
LEMONSQUEEZY_VARIANT_MONTHLY=<variant id of the $5/mo product>
LEMONSQUEEZY_VARIANT_LIFETIME=<variant id of the $10 lifetime product>
```

---

## 2. Supabase Auth setup

1. **Providers → Email**: keep enabled. Decide on "Confirm email" (on = users must click a
   link before first login; off = instant login, simpler for launch).
2. **Providers → Google**: enable and paste the Google OAuth client ID + secret (step 3).
3. **URL Configuration → Site URL + Redirect URLs**: add
   - `http://localhost:5173`
   - your Vercel production URL (e.g. `https://notes2pics.vercel.app`)

## 3. Google OAuth client

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** (Web app).
2. Authorized redirect URI: `https://wrymzmmqzyhgxkvudoma.supabase.co/auth/v1/callback`
3. Copy the client ID + secret into Supabase → Auth → Providers → Google.

## 4. Lemon Squeezy

1. Create the store and two products/variants:
   - **Monthly** — subscription, $5/mo
   - **Lifetime** — single payment, $10
2. Copy each variant's **checkout URL** → `VITE_LS_CHECKOUT_*` and each **variant ID** →
   `LEMONSQUEEZY_VARIANT_*`.
3. After the first Vercel deploy (step 5), create a **webhook**:
   - URL: `https://<your-vercel-domain>/api/lemonsqueezy-webhook`
   - Events: `order_created`, `subscription_created`, `subscription_updated`,
     `subscription_cancelled`, `subscription_expired`, `subscription_resumed`
   - Signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET` in Vercel; redeploy.

> Do the payment dry-run in Lemon Squeezy **test mode** first, then switch to live.

## 5. Deploy to Vercel

1. Import the Git repo into Vercel (framework auto-detects **Vite**, output `dist`). The build
   command (`npm run build`) does three things: builds the client, builds an SSR bundle, then
   **prerenders** the landing page and every blog post to static HTML (plus `sitemap.xml`,
   `rss.xml`). The `api/` folder deploys as a Node serverless function automatically.
2. Add all env vars from step 1, deploy, and note the production URL.
3. Feed that URL back into steps 2 (redirect URLs) and 4 (webhook), then redeploy.

### Routes & SEO
- `/` landing, `/blog` + `/blog/<slug>` blog, `/app` the studio (client-rendered SPA).
- Marketing/blog pages ship as prerendered HTML with per-page `<title>`, description, canonical,
  and OpenGraph tags — crawlable without JS. `vercel.json` sets `cleanUrls` so `/blog` serves the
  static file directly.
- `SITE_URL` sets the canonical/OG origin at build time. Vercel auto-fills it from
  `VERCEL_PROJECT_PRODUCTION_URL`; set `SITE_URL` explicitly only if you use a custom domain.
- New blog posts: drop a markdown file in `content/blog/*.md` (frontmatter: `title`,
  `description`, `date`, `tags`) — it's picked up automatically on the next build.

---

## 6. End-to-end test

1. Open the site, edit a post — no login needed.
2. Click **Export** → sign-in prompt appears. Sign up / sign in.
3. Export 3 times → each downloads with the watermark; the 4th shows the Upgrade modal.
4. Buy the **$10 lifetime** (test mode) → webhook fires → `entitlements` row upserts to
   `plan=lifetime, status=active`. Next export is watermark-free and unlimited.
5. Repeat with the **$5/mo** monthly variant.
6. Flip Lemon Squeezy to live mode.

### Handy checks
- DB: `select * from public.entitlements;` and `select count(*) from public.exports;`
- Webhook: Vercel → Deployments → Functions logs for `/api/lemonsqueezy-webhook`.

---

## Schema reference (already applied)

- `profiles` — one row per user (auto-created by an `auth.users` trigger).
- `exports` — one row per successful export; rolling-30-day count drives the free limit.
- `entitlements` — plan + status, written only by the webhook via the service-role key.
- RPCs: `record_export()` (gate + counter, returns `{allowed, watermark, remaining}`) and
  `get_usage()` (read-only status for the account UI). Both `SECURITY DEFINER`,
  authenticated-only.
