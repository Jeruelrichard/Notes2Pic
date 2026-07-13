# Notes2Pic — Session Handoff / Project State

> Working handoff doc for picking up in a fresh session. Last updated: 2026‑07‑12.
> Brand name is **"Notes2Pic"** (no trailing "s"). The repo folder is still `Notes2pics`
> and some asset filenames/package name keep the old `notes2pics` spelling — that's fine,
> only user‑visible text must read "Notes2Pic".

## What it is
A post‑to‑image SaaS: turn X / Threads / Substack posts into Instagram‑ready images.
Three studio modes: **Short post** (platform‑style cards), **Medium form** (quote image on
a plain canvas), **Carousels** (long text auto‑split into ≤300‑char slides, exported as a zip).
Editing/preview are free & account‑less; **exporting requires sign‑in**.

## Stack
- **Frontend**: Vite + React 19 SPA. Marketing/blog/legal pages are **prerendered to static
  HTML** at build (`scripts/prerender.mjs` via a Vite SSR build) for SEO; `/app` (the studio)
  stays a client SPA. Routing = `react-router-dom` v7 (client) + prerender.
- **Auth + DB**: Supabase (project ref **`wrymzmmqzyhgxkvudoma`**). Email/password + Google OAuth.
- **Payments**: **Freemius** (Merchant of Record — handles tax/VAT/refunds). Lemon Squeezy was
  the earlier choice, now **disabled/commented out** (kept in `api/lemonsqueezy-webhook.js` and
  `UpgradeModal`/`.env` for reference).
- **Hosting**: Vercel. Domain: **`notes2pic.vercel.app`**.

## Plans / limits
- **Free**: 3 exports per rolling 30 days (watermarked "made with Notes2Pic"), **1 carousel per
  30 days** (still consumes 1 of the 3 credits), **1 saved profile**.
- **Paid**: unlimited exports, unlimited carousels, unlimited saved profiles, no watermark.
  **$5/mo** or **$10 lifetime** (first 20 buyers, then $17).

## Key architecture / data model (Supabase, all migrations already applied)
- `profiles` — one row per user (email), auto‑created by an `auth.users` insert trigger.
- `exports` — one row per successful export; has a `kind` column ('short'|'medium'|'carousel').
  Rolling‑30‑day counts drive the free caps.
- `entitlements` — plan/status/`renews_at` + `fs_*` (Freemius license ids). Written **only** by
  the Freemius webhook (service‑role key). Legacy `ls_*` columns still present, unused.
- `author_profiles` — saved author profiles (name/username/avatar/signature), per‑user, RLS.
- RPCs (SECURITY DEFINER, authenticated‑only):
  - `record_export(p_kind text)` → `{allowed, watermark, remaining, reason}`. Enforces the
    3/month cap, the 1 carousel/month cap (reason `carousel_limit`), and watermark decision.
  - `get_usage()` → `{authenticated, paid, plan, remaining, carouselRemaining, ...}`.
  - `is_paid(uuid)` → expiration‑aware (lifetime = null expiry always paid; monthly paid until
    `renews_at` even if cancelled; expired = not paid). **Contains a founder bypass** (see below).

## Founder bypass (IMPORTANT for testing)
`okemdinach383@gmail.com` is hardcoded in `is_paid()` to always be paid (unlimited, no
watermark). So it **cannot** validate the payment pipeline — always test purchases with a
different email.

## Freemius integration
- Client checkout links built in `src/lib/checkout.js` / `UpgradeModal`:
  `https://checkout.freemius.com/product/{PRODUCT}/plan/{PLAN}/?user_email=…&readonly_user=true`.
  IDs: **product `34323`**, **monthly plan `56531`**, **lifetime plan `56534`**.
- Webhook: `api/freemius-webhook.js` — verifies `x-signature` HMAC‑SHA256 with the product
  **Secret Key**, maps the Freemius buyer **back to the Supabase user by email** (via `profiles`),
  and upserts the `entitlements` row. Handles all `license.*` events.
- **The email match is the linchpin**: checkout locks the email (`readonly_user=true`) to the
  signed‑in user, so the webhook can match. Always be signed in before clicking upgrade.

## Landing → checkout deep link
Landing pricing buttons carry intent: `/app?checkout=lifetime|monthly`. On `/app`, if signed in
→ redirect straight to Freemius checkout; if not → sign in first, then continue. Intent survives
Google OAuth via `sessionStorage` (with a timestamp guard). See the `pendingCheckout` logic in
`App.jsx`.

## Env vars (client `VITE_` baked at build; server secret in Vercel only)
Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FREEMIUS_PRODUCT_ID`,
`VITE_FREEMIUS_PLAN_MONTHLY`, `VITE_FREEMIUS_PLAN_LIFETIME`.
Server (Vercel): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FREEMIUS_SECRET_KEY`.
Build: `SITE_URL` (Vercel auto‑fills from `VERCEL_PROJECT_PRODUCTION_URL`).
See `.env.example`. `.env.local` is gitignored.

## ⚠️ NOT deployed yet — biggest open item
Everything below is on localhost only; **nothing has been committed/deployed**. Consequences:
- The **Freemius webhook 404s in production** (`/api/freemius-webhook` doesn't exist on the
  deployed build) → a real lifetime purchase by `beowulfagate9@gmail.com` didn't register.
  Freemius auto‑retries, so it should land once deployed. **First priority: deploy.**
- When deploying, confirm Vercel has all client `VITE_FREEMIUS_*` vars + server
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`FREEMIUS_SECRET_KEY`.

## Other pending / status
- **Google OAuth verification**: in progress. Privacy (`/privacy`) + Terms (`/terms`) pages
  built & prerendered; contact email `jeruelrichard@gmail.com`. Google site‑verification file at
  `public/google199103b29621ffe8.html`. Note: `vercel.json` `cleanUrls:true` 308‑redirects
  `/x.html` → `/x`; Google usually follows it, but if file verification fails, switch to the
  "HTML tag" method and add a `<meta name="google-site-verification">` to `index.html`.
- **IP‑based anti‑abuse ban (6 months)**: user asked, we **deferred it** — hard IP bans have bad
  false positives (CGNAT/office/VPN shared IPs) and are trivially bypassed. Recommended
  alternative if revisited: soft rate‑limit *new signups* per IP via a Vercel function. Not built.
- **Reset password**: DONE (AuthModal "Forgot your password?" → reset email → `SetPasswordModal`
  on `PASSWORD_RECOVERY`).
- **Carousel design**: default `drawSlide` look shipped; never re‑tuned against the user's Dan Koe
  / KOE reference screenshots — a possible future polish.

## Dev gotchas that already bit us (don't rediscover)
- **Vite ignores `PORT` env** → the preview harness's autoPort failed until `vite.config.js` was
  made to read `process.env.PORT`. Keep that.
- **Stale service worker** on `localhost` serves old bundles on normal navigations (incl. OAuth
  redirects) even when hard‑refresh works. `main.jsx` unregisters SWs in dev. If "my change isn't
  showing," Clear‑site‑data + close all tabs.
- **Supabase auth redirect scheme**: local dev is `http://localhost:5173`, not `https` — the
  Supabase redirect allow‑list must have the `http://` version or OAuth falls back to Site URL
  (prod) and dumps you on the wrong origin.
- **Supabase hides "email already exists"** on signup (empty `identities[]`, no error). AuthModal
  detects that.

## Testing convention (Supabase)
Test users are created directly via SQL `insert into auth.users(...)` with **all** GoTrue token
columns set to `''` (else password login 500s) and `email_confirmed_at = now()`. Always clean up
test users afterward (cascades remove their exports/profiles). **Never delete the real accounts**:
`okemdinach383@gmail.com` (founder), `beowulfagate9@gmail.com`, `jeruelrichard@gmail.com`,
`okembackup383@gmail.com`, `okemfcb383@gmail.com`.

## Verify locally
`npm run dev` (studio at `/app`). `npm run build` runs client + SSR + prerender (emits
`/privacy`, `/terms`, blog, sitemap.xml, rss.xml). `npm run lint`.
