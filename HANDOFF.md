# Notes2Pic — Session Handoff / Project State

> Working handoff doc for picking up in a fresh session. Last updated: 2026‑07‑21.
> Brand name is **"Notes2Pic"** (no trailing "s"). The repo folder is still `Notes2pics`
> and some asset filenames/package name keep the old `notes2pics` spelling — that's fine,
> only user‑visible text must read "Notes2Pic".
> **Status: LIVE in production at `www.notes2pic.com`** (auto‑deploys from `main` via Vercel).
> See also `PRD.md` (product doc) and `LEARNING.md` (owner's personal coding on‑ramp, gitignored).

## What it is
A post‑to‑image SaaS: turn X / Threads / Substack posts into Instagram‑ready images.
Three studio modes: **Short post** (platform‑style cards), **Medium form** (quote image on
a plain canvas), **Carousels** (long text → slides, exported as a zip; numbering‑aware split).
Editing/preview are free & account‑less; **exporting requires sign‑in**. Beyond the studio,
there are **free SEO tool pages** and an **AI thread generator** (see those sections).

## Stack
- **Frontend**: Vite + React 19 SPA (JavaScript, not TS). Marketing/blog/legal/tool pages are
  **prerendered to static HTML** at build (`scripts/prerender.mjs` via a Vite SSR build) for SEO;
  `/app` (the studio) stays a client SPA. Routing = `react-router-dom` v7 + prerender.
- **Auth + DB**: Supabase (project ref **`wrymzmmqzyhgxkvudoma`**). Email/password + Google OAuth.
- **Payments**: **Freemius** (Merchant of Record — tax/VAT/refunds). Product `34323`, monthly
  plan `56531`, lifetime plan `56534`. (Lemon Squeezy is fully removed — never going back.)
- **AI**: Google Gemini (thread generation). Server‑side only, key `GEMINI_API_KEY`.
- **Hosting**: Vercel (project `notes2pic`, team `jeruel-richards-projects`), GitHub integration
  auto‑deploys `main` → production. Domain **`www.notes2pic.com`** (apex 301→www, so
  `SITE_URL` must be `https://www.notes2pic.com`).

## Plans / limits
- **Free**: 3 exports / rolling 30 days (watermarked), **1 carousel / 30 days** (uses 1 of the 3
  credits), **1 saved profile**, **1 AI thread generation ever (lifetime cap, not monthly)**.
- **Paid** ($5/mo or $10 lifetime): unlimited exports, carousels, saved profiles, **unlimited AI
  thread generations**, no watermark.

## Data model (Supabase, `public`; all migrations applied via MCP)
- `profiles` — one row per user (email), auto‑created by an `auth.users` insert trigger.
- `exports` — one row per successful export; `kind` ∈ {short|medium|carousel}. Rolling‑30‑day
  counts drive the free caps.
- `generations` — one row per AI thread generation; `kind` default `'thread'`. **Deliberately
  separate from `exports`** — `record_export` counts every `exports` row against the 3/month cap,
  so a generation there would silently eat an export credit. RLS: owner‑select only.
- `entitlements` — plan/status/`renews_at` + `fs_*` (Freemius) ids. Written **only** by the
  Freemius webhook (service‑role). (The old `ls_*` columns were dropped.)
- `author_profiles` — saved author profiles, per‑user, RLS.
- `shares` — unlisted `/s/<id>` share pages; RLS locks inserts to the founder email. Paired with a
  **public `shares` storage bucket** (public read; founder‑only upload).
- RPCs (SECURITY DEFINER):
  - `record_export(p_kind)` → `{allowed, watermark, remaining, reason}`. 3/month + 1 carousel/month
    caps + watermark decision.
  - `record_generation()` → `{allowed, remaining, reason}`. **1 lifetime free**, paid = unlimited.
    Reason `generation_limit` when a free user is out. Inserts only via this RPC.
  - `get_usage()` → `{authenticated, paid, plan, remaining, carouselRemaining, threadsRemaining}`.
  - `is_paid(uuid)` → expiration‑aware; **contains the founder bypass** (below).

## Founder bypass (IMPORTANT for testing)
`okemdinach383@gmail.com` is hardcoded in `is_paid()` to always be paid (unlimited exports,
carousels, generations; no watermark). So it **cannot** validate the payment/quota pipeline —
always test caps with a different (throwaway) account. Founder‑only UI toggles: "Create share
link", and a **"Show watermark (founder)"** toggle in the studio + tweet tool (founder is
watermark‑free by default, so the toggle turns it ON for demo shots).

## Free tool pages (SEO engine — Kevin Wu / TwitterShots playbook)
Config‑driven: **`src/lib/toolPages.js`** (data) → **`src/pages/ToolPage.jsx`** (one template,
`WIDGETS` map) → routes auto‑generated in `src/AppShell.jsx` from `TOOL_PAGES`. A new tool page =
a config entry + a widget. SEO meta, sitemap + `lastmod`, IndexNow ping, the header **Tools**
dropdown, and the footer "Free Tools" column all derive from that config automatically. Three live:
- **`/thread-to-carousel`** (`CarouselTool.jsx`) — paste thread → live carousel preview → download
  zip. Reuses `splitThread` + `drawSlide` + the sign‑in/quota export path.
- **`/tweet-screenshot`** (`TweetScreenshotTool.jsx`) — paste a tweet link → we fetch it →
  render the studio's short‑post card → export. See "Tweet screenshot" below.
- **`/thread-generator`** (`ThreadGeneratorTool.jsx`) — paste an essay → Gemini → thread →
  "Turn this into a carousel" hands off to `/thread-to-carousel`. See "AI thread generator" below.
Each tool's stage renders at **540px** and exports at `pixelRatio: 2` → 1080 (the card is capped
at 450px, so a 1080 stage would leave it filling ~41% — must stay 540). Shared card markup +
styles: `src/components/ShortSourcePreview.jsx` + `src/styles/postcard.css` (one source, studio +
tool pages both use it).

## Tweet screenshot tool (`api/tweet.js`)
Serverless fetch of a public tweet — **no X API key, no cost**.
- Source 1: `cdn.syndication.twimg.com/tweet-result` (X's own embed endpoint) — full data (text,
  name, handle, avatar, verified, date, likes/replies/retweets, photo + dims). Source 2 fallback:
  `publish.twitter.com/oembed` (text + author only). **Works from Vercel's IPs** (verified).
- **Long‑form ("note") tweets**: syndication returns only a `note_tweet` *id*, not the full body,
  so `text` is truncated (~he first chunk). We flag `truncated` and the UI shows an editable box.
- **Photos**: rendered uncropped at true aspect ratio; the tool page's canvas GROWS (540→up to 960
  = a 1080×1920 export) for tall images; the studio keeps its fixed Square/Portrait/Story and the
  photo shrinks to fit (`.x-card` flex column, `min-height:0` on `.x-photo`, grid track
  `minmax(0,1fr)` on `.export-stage` so `max-height` actually clamps).
- Text links/@mentions/#hashtags render in X blue via the `highlight` prop (curated TLD list, not
  "dot anything", to avoid mangling `Mr.Smith`). t.co links expanded to display form; the media's
  own t.co is stripped once the photo renders.
- Export uses `skipFonts: true` and **no `cacheBust`** (cacheBust appends `?ts` → `pbs.twimg.com`
  404s the avatar → export fails). Same fix applied in `App.jsx`.

## AI thread generator (`api/generate-thread.js` + `api/prompts/thread-generator.js`)
- Flow: validate essay (≤ **10,000 words**, server + client) → verify the caller's Supabase JWT →
  `record_generation()` **before** calling Gemini (so an out‑of‑credit user never triggers a paid
  call; quota is in Postgres, not the client) → call Gemini → return `{ ok, thread, remaining }`.
- **The prompt lives in `api/prompts/thread-generator.js`** (`THREAD_PROMPT_TEMPLATE` with a
  `{{ESSAY}}` placeholder; `buildThreadPrompt(essay)` interpolates it and neutralises any
  `--- ESSAY START/END ---` the user typed). Editing that file changes output for the tool page
  AND the studio. **Do not break the `{n}/{N}` output format** — the carousel splitter reads it.
- **Model gotcha (cost us a live outage):** Google **retired `gemini-2.5-flash` for new keys** →
  404 "no longer available to new users" (still appears in the model list!). We now use the alias
  **`gemini-flash-latest`** with pinned fallbacks (`gemini-3.6-flash`, `gemini-3.5-flash`). Run
  **`node scripts/gemini-check.mjs`** to list/probe models this key can actually use (reads
  `.env.local`, never prints the key). `gemini-2.5-pro` returns 429 (quota) on this key — Flash only.
- **Vercel timeout:** a real generation took ~13s; Vercel's default function limit is 10s → set
  `export const config = { maxDuration: 60 }`. Confirm the plan allows 60s (Hobby caps lower).
- Studio: an **"✨ Essay → Thread (AI)"** collapsible panel in **Carousel mode only** fills the
  carousel textarea, then the normal split/export pipeline takes over.
- Handoff to carousel: `sessionStorage['n2p.generatedThread']`, consumed once (`takeHandoffThread`
  in `src/lib/threadGen.js`). `CarouselTool` prefers it over its demo text.

## Landing / marketing chrome
- **Hero = real product-demo video.** `HeroDemo` in `Landing.jsx` renders a silent, auto‑looping,
  muted `<video>` (`public/hero-demo.mp4`, ~1.6MB H.264 @ 1280px wide) with a poster
  (`public/hero-demo-poster.jpg`) and a reduced‑motion fallback (holds the poster, no autoplay).
  Replaced the old CSS `samples`/`OutputCard` typing animation (both removed). Source recording was
  a 70MB Cap clip — compressed with ffmpeg (`scale=1280:-2,fps=30`, libx264 CRF 30, `-an`,
  `+faststart`). **Never commit a raw multi‑MB hero video; always compress first.** To swap the
  demo, replace those two files in `public/` (keep the same names).
- Warm **clay** palette, **Newsreader + Hanken Grotesk**. Keyword‑optimized H1/title/description
  (title "Turn Tweets & Threads into Instagram Carousels"), image alt text, "Free to start" note.
- **Sale counter**: one constant `LIFETIME_SPOTS_LEFT` in `src/pages/Landing.jsx` (currently 19) —
  bump it as lifetime deals sell. Shown on hero note + pricing badge.
- **Testimonial**: `public/testimonial1.png` in a section above pricing.
- **Header**: 3‑col grid (brand / centered Pricing+Blog / actions). **Tools dropdown** + account
  chip (signed‑in avatar). Mobile: hamburger only, flush right; nav in a dropdown.
- **Footer**: brand + Product Hunt badge on top, then labelled columns (Free Tools / Notes2Pic /
  More). Includes the **Needle backlink** (`useneedle.net/directory/notes2pic`) — a directory
  verification link, keep it.
- **Contact** page `/contact` (`src/pages/Contact.jsx`): email (`jeruelrichard@gmail.com`) +
  "DM me on X" (`@jeruelrichard`). Pricing link smooth‑scrolls to the cards (`src/lib/scrollTo.js`).
- **7 blog posts** in `content/blog/`. Blog tags **must be a YAML list** (`tags: [a, b]`) — a bare
  string once threw `other.tags.filter is not a function` and **took down the whole SPA**;
  `posts.js` now coerces to an array, but keep frontmatter clean.

## SEO / GEO / analytics / verification
- Prerender emits JSON‑LD (Org+WebSite everywhere; BlogPosting+Breadcrumb on posts; FAQPage on
  posts and tool pages), robots.txt (allows AI crawlers), llms.txt, sitemap.xml (with `lastmod`),
  rss.xml. `src/lib/seoMeta.js` is the single meta source.
- **IndexNow [SHIPPED]**: key file `public/33156ab60a90df3f2985f6b356f7c0de.txt`; `scripts/indexnow.mjs`
  runs as the last build step and pings Bing/Yandex with the sitemap URLs — **only on Vercel
  production** builds, never fails the build.
- **GA4**: wired, env‑gated on `VITE_GA4_ID`, fires `page_view` per route. (Owner has set the ID.)
- **Site verifications** in `public/`: Google (`google199103b29621ffe8.html`) and StartupRanking
  (`startupranking1371500320978910.html`). ⚠️ `vercel.json` `cleanUrls:true` 308‑redirects
  `/x.html` → `/x`; most verifiers follow it. If StartupRanking's auto‑check fails, that redirect
  is the suspect — confirm `web_fetch_vercel_url` on the `.html` URL returns the token.

## Env vars (client `VITE_` baked at build; server secrets Vercel‑only)
Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FREEMIUS_PRODUCT_ID`,
`VITE_FREEMIUS_PLAN_MONTHLY`, `VITE_FREEMIUS_PLAN_LIFETIME`, `VITE_GA4_ID`.
Server (Vercel): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (for the
generate‑thread JWT check), `FREEMIUS_SECRET_KEY`, **`GEMINI_API_KEY`**, **`LOOPS_API_KEY`**,
**`LOOPS_WEBHOOK_SECRET`** (welcome‑email webhook). Build: `SITE_URL`.
`.env.local` is gitignored (`*.local`) — safe for local secrets like `GEMINI_API_KEY`.

## Lifecycle email (Loops)
- **Auth emails stay on Supabase.** Signup‑confirmation + password‑reset are sent by Supabase
  GoTrue (see `resetPasswordForEmail`/`signUp` in `AuthModal.jsx`). Customize their look in the
  Supabase dashboard → **Authentication → Emails** (edit HTML + subject per template; keep the
  `{{ .ConfirmationURL }}` link intact). We deliberately do NOT route these via Loops — a broken
  hook there would block confirm/reset and lock users out.
- **Welcome/onboarding is Loops.** New file `api/loops-webhook.js`: a **Supabase Database Webhook
  on `public.profiles` INSERT** POSTs here; the endpoint checks a shared `x-webhook-secret`
  (`LOOPS_WEBHOOK_SECRET`), upserts the contact into Loops, and fires a **`user_signed_up`** event.
  The Loop workflow triggers on that event name, set to **once per contact**. Setup steps (Loops
  key + workflow, Vercel env, the DB Webhook with the secret header) are done in dashboards, not
  code. Note it fires at **signup**, before email confirmation.

## Owner‑task backlog (not code)
- **DONE**: Google OAuth verification, GSC, Bing Webmaster, directory distribution (Needle,
  StartupRanking in progress), IndexNow, GA4 activation.
- **Still open**: replace placeholder `public/og-image.png` with a real 1200×630; confirm
  `GEMINI_API_KEY` is set in Vercel + a real generation works post‑deploy; finish StartupRanking
  verification (upload + confirm the `.html` resolves).
- **Pricing decision** (unresolved): $10 lifetime vs $5/mo. Now framed with the scarcity counter
  ("first 20 buyers, N left"). Landing/checkout push lifetime.

## Dev gotchas that already bit us (don't rediscover)
- **`npm run dev` does NOT run `api/` functions** — Vite serves only the SPA; `/api/*` proxies to
  **production**. To exercise serverless functions locally use `npx vercel dev`. For Gemini, the
  `scripts/gemini-check.mjs` probe is faster than a full local server.
- **The Browser pane reports `visibilityState: hidden`** → Chrome throttles `requestAnimationFrame`
  to **zero** and `IntersectionObserver`/lazy‑loading never fires. So html‑to‑image exports and
  `loading="lazy"` images appear "broken" **only in the pane** (not for real users). To verify an
  export in‑pane, shim `requestAnimationFrame` onto `setTimeout` in‑page first.
- **Blog posts MUST end in `.md`** (glob loader silently drops others) and **tags must be a YAML
  list** (bare string crashes the SPA — see Landing/blog note).
- **"Not showing live" is usually NOT cache** — SW is network‑first. Check `.md`, the deploy is
  READY, then `web_fetch_vercel_url` before blaming cache. (WebFetch to notes2pic.com is blocked in
  the sandbox — use the Vercel MCP `web_fetch_vercel_url`.)
- **Vite ignores `PORT`** → `vite.config.js` patched to read `process.env.PORT`. Keep it.
- **Stale SW on localhost** serves old bundles; `main.jsx` unregisters SWs in dev.
- **Supabase OAuth redirect**: local dev is `http://localhost:5173` (not https) — must be in the
  allow‑list, or Google login falls back to the prod Site URL. Tool‑page Google sign‑in now returns
  to the current path (`redirectTo`), so those paths must be allow‑listed too (a wildcard is easiest).
- **Supabase hides "email already exists"** (empty `identities[]`); AuthModal detects it.
- **`skipFonts` + no `cacheBust`** on every html‑to‑image export (see Tweet screenshot).
- **Fixed‑height flex column crushed a child to a line (desktop‑only).** The studio AI panel
  (`.ai-panel`) rendered fine on mobile but collapsed to a 2px line on desktop, because the
  desktop two‑column layout puts it in a fixed‑height `flex-direction:column` parent and it had no
  `flex-shrink:0` — flexbox squeezed it to its borders (and `overflow:hidden` clipped the button,
  making it unclickable). Fix: `flex-shrink:0`. Watch for this on any flex‑column child that only
  breaks at wider widths.

## Testing convention (Supabase)
Create throwaway users via SQL `insert into auth.users(...)` with **all** GoTrue token columns
`''` (else password login 500s) and `email_confirmed_at = now()`; call SECURITY DEFINER RPCs by
`set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true)`.
**Always delete test users after** (cascades their exports/generations). **Never delete the real
accounts**: `okemdinach383@gmail.com` (founder), `beowulfagate9@gmail.com`, `jeruelrichard@gmail.com`,
`okembackup383@gmail.com`, `okemfcb383@gmail.com`.

## Verify locally
`npm run dev` (studio at `/app`). `npm run build` = client + SSR + prerender (emits tool pages,
blog, `/privacy`, `/terms`, `/contact`, sitemap.xml, rss.xml, robots.txt, llms.txt; IndexNow ping
is prod‑only). `npm run lint`.
