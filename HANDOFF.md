# Notes2Pic — Session Handoff / Project State

> Working handoff doc for picking up in a fresh session. Last updated: 2026‑07‑18.
> Brand name is **"Notes2Pic"** (no trailing "s"). The repo folder is still `Notes2pics`
> and some asset filenames/package name keep the old `notes2pics` spelling — that's fine,
> only user‑visible text must read "Notes2Pic".
> **Status: LIVE in production at `www.notes2pic.com`** (auto‑deploys from `main` via Vercel).
> See also `PRD.md` (product doc) and `LEARNING.md` (owner's personal coding on‑ramp, gitignored).

## What it is
A post‑to‑image SaaS: turn X / Threads / Substack posts into Instagram‑ready images.
Three studio modes: **Short post** (platform‑style cards), **Medium form** (quote image on
a plain canvas), **Carousels** (long text split into slides, exported as a zip — splitting is
now numbering‑aware; see "Thread splitter" below). Editing/preview are free & account‑less;
**exporting requires sign‑in**.

## Stack
- **Frontend**: Vite + React 19 SPA. Marketing/blog/legal pages are **prerendered to static
  HTML** at build (`scripts/prerender.mjs` via a Vite SSR build) for SEO; `/app` (the studio)
  stays a client SPA. Routing = `react-router-dom` v7 (client) + prerender.
- **Auth + DB**: Supabase (project ref **`wrymzmmqzyhgxkvudoma`**). Email/password + Google OAuth.
- **Payments**: **Freemius** (Merchant of Record — handles tax/VAT/refunds). Lemon Squeezy was
  the earlier choice, now **disabled/commented out** (kept in `api/lemonsqueezy-webhook.js` and
  `UpgradeModal`/`.env` for reference).
- **Hosting**: Vercel (project `notes2pic`, team `jeruel-richards-projects`), GitHub integration
  auto‑deploys `main` → production. Domain: **`www.notes2pic.com`** (apex `notes2pic.com`
  301‑redirects to www — so `SITE_URL` must be `https://www.notes2pic.com`).

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
- `shares` — unlisted `/s/<id>` share pages (id, user_id, kind, images[], caption, created_at).
  RLS locks **inserts to the founder email**. Paired with a **public `shares` storage bucket**
  (public read; founder‑only upload). See "Share links" below.
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
`VITE_FREEMIUS_PLAN_MONTHLY`, `VITE_FREEMIUS_PLAN_LIFETIME`, `VITE_GA4_ID` (optional; analytics
is a no‑op when unset — set the GA4 Measurement ID in Vercel to turn tracking on).
Server (Vercel): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FREEMIUS_SECRET_KEY`.
Build: `SITE_URL` — set to **`https://www.notes2pic.com`** (matches the served host; apex→www).
See `.env.example`. `.env.local` is gitignored.

## ✅ Deployed & live (was the old top blocker — now resolved)
Live in production at `www.notes2pic.com`, auto‑deploying from `main`. The Freemius webhook,
Supabase, and all env vars are wired in Vercel. The earlier sandbox/test lifetime grants on
`beowulfagate9@gmail.com` and `jeruelrichard@gmail.com` were reset to free (entitlement rows
deleted + export usage cleared) — they were catfish/test accounts, not real paying customers.

## Share links (`/s/<id>`) — founder outreach tool [SHIPPED]
Founder‑only branded pages for cold‑DM outreach (Instagram blocks attachments on first DMs, so
you send a **link**; demo the **carousel**, not a single screenshot — that's the differentiator).
- **Founder‑only**: `okemdinach383@gmail.com`, enforced by RLS on `shares` + the `shares` bucket.
- `src/lib/shares.js` — `createShare()` uploads the rendered PNG blobs + inserts the row; short
  unambiguous id. Studio has a founder‑gated **"Create share link"** button (`shareCurrent()` in
  `App.jsx`) that copies the `/s/<id>` URL.
- **`api/share.js`** — the `/s/:id` page is a **Vercel serverless function** (routed via a
  `vercel.json` rewrite). It **MUST stay server‑rendered**: DM unfurlers don't run JS, so a
  client SPA route would unfurl blank. It server‑renders OG tags + all slides in the initial HTML,
  is `noindex`, swipeable (scroll‑snap + dots/nav), dark‑mode aware, with a branded 404. Note: it
  hardcodes its own CSS/palette (can't import the SPA bundle) — a rebrand touches this file too.

## Thread splitter — now intelligent (`src/lib/carousel.js`)
`splitThread(text)` → `{ slides, numbered }`. Key behaviours (all deterministic, no AI):
- **Pre‑numbered threads win.** Detects `1/11`, `1/`, `1.`, `(1)`, `Tweet 1`, lone `1`, etc. and
  uses the author's own boundaries — 1 number = 1 slide. Numbering wins over the 300‑char soft
  target (`SLIDE_MAX_CHARS`); a long tweet stays one slide and `drawSlide` auto‑shrinks the font.
- **Style‑aware runs**: markers only chain with same‑style markers, so in‑body "Step 1/2/3" can't
  poison the real "Tweet 1..10" run. (This was a real bug — a thread with "Step N" in the body
  dumped everything into slide 5. Fixed.)
- **False‑positive guards**: needs a real +1 run, caps marker numbers at 199 (so "2026 was…",
  "5 reasons…", "300 subscribers…" aren't markers). Unnumbered text = even split, no orphans,
  lists kept whole.
- Editor no longer hard‑truncates at 300; hard cap is `SLIDE_HARD_MAX` (1000) so a long numbered
  tweet isn't silently chopped.

## SEO / GEO + analytics (shipped)
- **Prerender** (`scripts/prerender.mjs`) now also emits: JSON‑LD (`Organization`+`WebSite`
  everywhere; `BlogPosting`+`BreadcrumbList` on posts; `FAQPage` auto‑built from a post's `## FAQ`
  section), per‑post article OG tags, `robots.txt` (explicitly allows AI crawlers: GPTBot,
  OAI‑SearchBot, ClaudeBot, PerplexityBot, Google‑Extended, etc.), and `llms.txt`.
- **`src/lib/seoMeta.js`** is the single meta source (`getMetaForPath` + `buildJsonLd`); the
  client `Seo.jsx` and the prerender share it. `src/lib/posts.js` parses `author`/`updated`,
  auto‑builds the FAQ, and computes related posts (by shared tags) for internal linking.
- Blog template has author byline, "Updated" date, TOC, related‑posts block.
- **GA4** wired via `src/lib/analytics.js` + `src/components/Analytics.jsx`, env‑gated on
  `VITE_GA4_ID`, fires `page_view` on every SPA route change. **Set the ID in Vercel to activate.**
- **OG image** `public/og-image.png` is a placeholder (square app icon) — replace with real 1200×630.

## Landing / blog
- Landing redesigned: warm **clay** palette, **Newsreader + Hanken Grotesk** fonts (in
  `index.html` + `src/marketing.css`), demo‑led hero, real example images, animated carousel.
- **3 blog posts** in `content/blog/`: `turn-x-posts-into-instagram-images`,
  `twitter-thread-to-instagram-carousel`, `tweet-to-instagram-post`.
- **Product Hunt badge** in the shared footer (`SiteChrome.jsx`, post_id `1199762`). Footer is
  `flex-wrap` so the 250px badge drops to its own line on mobile.

## ⏳ Open decision — pricing (NOT resolved)
$10 lifetime vs $5/mo: a lifetime buyer pays for ~2 months then costs money forever, working
against recurring‑revenue growth. Candidate: sell $5/mo directly, or "$5/mo, first 20 locked in
forever" as the launch hook. Landing/checkout currently push **lifetime**. User's call.

## Owner‑task backlog (not code)
Set `VITE_GA4_ID` in Vercel + GA4 "AI Traffic" channel; Google Search Console + Bing Webmaster +
IndexNow (IndexNow not built — offer key file + submit script); Reddit/Product Hunt/directory
distribution; replace `og-image.png`.

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
- **Blog posts MUST end in `.md`.** The loader is `import.meta.glob('content/blog/*.md')`, so a
  file saved without the extension (e.g. `tweet-to-instagram-post`) is **silently dropped** —
  committed and deployed but invisible. This bit us twice ("post not showing"). After adding a
  post, run `npm run build` and confirm `prerendered /blog/<slug>` appears in the output.
- **"Post not showing live" is usually NOT a cache.** The prod service worker (`public/sw.js`) is
  **network‑first**, so online users get fresh content. When a post seems missing: (1) check the
  `.md` extension, (2) confirm the Vercel deploy is READY for the right commit, (3) verify via
  `web_fetch_vercel_url` on the real URL before blaming cache.
- **Vite ignores `PORT` env** → the preview harness's autoPort failed until `vite.config.js` was
  made to read `process.env.PORT`. Keep that.
- **Stale service worker** on `localhost` serves old bundles even when hard‑refresh works.
  `main.jsx` unregisters SWs in dev. If "my change isn't showing," Clear‑site‑data + close all tabs.
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
