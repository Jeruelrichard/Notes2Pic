# Notes2Pic — Product Requirements Document

> Living product doc. Last updated: 2026-07-17.
> Brand name is **"Notes2Pic"** (no trailing "s"). The repo folder and some asset
> filenames keep the old `notes2pics` spelling — only user-visible text must read "Notes2Pic".
> Companion docs: [PRODUCT.md](PRODUCT.md) (strategy/voice), [HANDOFF.md](HANDOFF.md)
> (live engineering state), [DEPLOYMENT.md](DEPLOYMENT.md) (go-live), [README.md](README.md).

---

## 1. Summary

Notes2Pic turns a written post — an X/Twitter post, a Threads post, or a Substack Note —
into a clean, on-brand, Instagram-ready image. It exists because writers produce great text
on text-first platforms and lose its momentum when turning it into a visual is slow and ugly.
Editing and previewing are free and account-less; exporting requires sign-in. Paid removes the
watermark and the free caps.

The bet: writers already have the hard part (the words). The missing 30 minutes is reformatting
them into images the feed rewards. Notes2Pic removes that 30 minutes.

## 2. Problem

- Text-first writing (tweets, threads, Notes) dies on Instagram, a visual feed.
- Turning a post into an image means opening Canva/Figma, resizing frames by hand, and matching
  fonts/spacing — 20–40 minutes for a carousel. So it usually never happens.
- Existing single-tweet-screenshot tools (Tweetpik, Pika, etc.) are commodities and free; they do
  not solve the multi-slide **carousel** case, which is where the real time cost lives.

## 3. Goals & non-goals

**Goals**
- Go from "I wrote a good post" to "I have an Instagram-ready image/carousel" in seconds.
- Make the output look branded and native to its source platform, with zero design skill.
- Convert free users to paid on the value of unlimited, watermark-free carousels.

**Non-goals (explicit)**
- Not an AI content generator. It reshapes text the user already wrote; it does not write posts.
- No scraping / no logging into users' social accounts. Manual paste by design (platforms block
  scraping and it breaks constantly).
- Not a general design tool. It does one job well.

## 4. Users

- **Primary:** indie writers already posting on X, Threads, and Substack — Substackers and
  build-in-public solo creators. They write well, aren't designers, and want every post to look
  branded without opening Figma.
- **Context:** a quick, skeptical visit ("is this actually faster than what I do now?"), usually
  from a link in a post or bio.
- **Job to be done:** reshape existing writing into images the visual feed rewards, fast.

## 5. Positioning

The single claim every screen reinforces: **"It turns my posts into branded images in seconds."**
Voice: warm, indie, honest — a tool made by a writer for writers. Upfront about what it
deliberately doesn't do. Reference feel: Buttondown (writer-first restraint) × Raycast
(demo-forward personality). Explicitly **not** generic blue SaaS.

## 6. Product scope

### 6.1 Studio (`/app`) — the core product

A client-rendered SPA editor with three content modes:

1. **Short post** — platform-style cards (X / Threads / Substack) with avatar, name, handle,
   source, date, verified-looking layout. Capped at 500 chars; preserves line breaks.
2. **Medium form** — a single strong line/quote set on a clean canvas, dark or light theme.
   Preserves line breaks, spacing, indentation; auto-fits all text into the image.
3. **Carousels** — long text auto-split into slides, exported as a `.zip` of PNGs. This is the
   differentiator (no free single-screenshot tool does this).

Cross-cutting:
- Save reusable **author profiles** (name, username, source, avatar, signature) per user.
- Upload an avatar image for reliable PNG export.
- Canvas sizes: Square (1080×1080), Portrait (1080×1350), Story.
- Multiple visual templates.
- Live preview === export output (single render source of truth, `src/lib/carouselRender.js`).

### 6.2 Intelligent thread splitter

When splitting a carousel, Notes2Pic respects the author's own structure instead of re-chopping
by character count (`src/lib/carousel.js`):

- **Pre-numbered threads win.** If the pasted text is already numbered (`1/11`, `1/`, `1.`,
  `(1)`, `Tweet 1`, `Step 1`, a lone `1`), the splitter uses those as the authoritative slide
  boundaries — one number = one slide — and drops the marker text (the footer already prints
  "3 / 11"). Numbering wins over the 300-char soft target: a long tweet stays one slide and the
  renderer auto-shrinks the font.
- **Style-aware run detection.** Markers only chain with same-style markers, so in-body numbering
  ("Step 1/2/3" inside tweets) can't poison the real "Tweet 1..10" run.
- **False-positive guards.** Requires a real +1 sequence and caps marker numbers at 199, so
  "2026 was…", "5 reasons why…", "300 subscribers later…" are never mistaken for markers.
- **Unnumbered text** falls back to natural breaks, then even (non-greedy) subdivision that never
  orphans a tiny slide and never shreds a bulleted list mid-item.
- Deterministic only (no AI). An optional AI "one idea per slide" split is a possible future paid
  perk, not built.

### 6.3 Accounts, limits, payments

- Editing/previewing: free, no account.
- **Exporting requires sign-in** (Supabase Auth: email/password or Google OAuth).
- **Free tier:** 3 exports per rolling 30 days (watermarked "made with Notes2Pic"), 1 carousel
  per 30 days (still consumes 1 of the 3 credits), 1 saved profile.
- **Paid tier:** unlimited exports, unlimited carousels, no watermark, unlimited saved profiles.
- Limits are enforced **server-side** by the `record_export()` Postgres RPC (can't be bypassed
  from the browser). Entitlements are written **only** by the Freemius webhook (service-role key).

### 6.4 Share links (`/s/<id>`) — founder outreach tool [SHIPPED]

Purpose: cold-DM outreach. Instagram blocks all attachments on a first message to a non-follower
(text + links only), so the "here's the image I made from your post" gesture must be delivered as
a **link**, not an attachment — and the link must look like the product, not a phishing file host.

- Each share is an unlisted, branded page at `notes2pic.com/s/<id>` showing **all carousel slides,
  swipeable**, with a "Made with Notes2Pic — try it free" CTA.
- **Founder-only** (`okemdinach383@gmail.com`): no public upload surface, no moderation/abuse/
  privacy burden. Enforced by RLS on `public.shares` and the `shares` storage bucket.
- The page **must be server-rendered** (a Vercel serverless function), because DM unfurlers don't
  run JS — a client-rendered SPA route would unfurl as a blank card and the image wouldn't sell.
- Strategy note (from outreach learnings): demo the **carousel**, not a single tweet screenshot.
  A screenshot is a commodity free tools already do; the carousel is the differentiator, so the
  "why not just use the free thing" objection mostly dissolves.

**Status:** Live in production. DB `shares` table + public `shares` bucket + RLS (founder-only
insert), client lib (`src/lib/shares.js`), the `/s/:id` serverless render (`api/share.js` +
`vercel.json` rewrite), and the founder-gated "Create share link" button in the studio are all
shipped. The share page server-renders OG tags + all slides in the initial HTML (so DMs unfurl
with the image), is `noindex`, has a branded 404, and shows a swipeable carousel with dots/nav +
a "Try it free" CTA. Note: the page hardcodes its own CSS (it can't import the SPA bundle), so the
brand palette also lives in `api/share.js` — a rebrand touches it too.

### 6.5 Marketing + blog + legal

- Prerendered-to-static-HTML landing (`/`), blog (`/blog`, `/blog/<slug>`), privacy, terms — for
  SEO/crawlability without JS. `/app` stays a client SPA.
- Landing is demo-led: an animated hero showing post → image, three-outputs showcase with real
  example images, an honest "what it does / doesn't do" section, pricing (lifetime featured),
  close CTA.
- Blog is built for SEO **and** AI-citation (GEO): see §9.

## 7. Key user flows

1. **First visit → export.** Land → edit a post (no login) → click Export → sign-in prompt →
   export downloads (watermarked on free). 4th export in 30 days → Upgrade modal.
2. **Thread → carousel.** Paste a numbered thread → Split → "Kept your numbering — N slides" →
   tweak → Export → `.zip` of slides.
3. **Landing → checkout.** Pricing button carries intent (`/app?checkout=lifetime|monthly`). On
   `/app`: signed in → straight to Freemius checkout; not signed in → sign in first, then continue
   (intent survives Google OAuth via `sessionStorage`).
4. **Outreach (founder).** Generate a carousel → Create share link → paste `notes2pic.com/s/<id>`
   into a DM. *(pending §6.4 build)*

## 8. Technical architecture

- **Frontend:** Vite + React 19 SPA. `react-router-dom` v7. Marketing/blog/legal prerendered at
  build via a Vite SSR build + `scripts/prerender.mjs`.
- **Auth + DB:** Supabase (project ref `wrymzmmqzyhgxkvudoma`). Email/password + Google OAuth.
- **Payments:** Freemius (Merchant of Record — handles tax/VAT/refunds). Lemon Squeezy disabled,
  kept for reference. Freemius product `34323`, monthly plan `56531`, lifetime plan `56534`.
- **Hosting:** Vercel, GitHub integration deploying `main` → production. Serverless `api/`
  functions (Freemius webhook; share render pending).
- **Domain:** `www.notes2pic.com` (apex `notes2pic.com` 301-redirects to www).

### 8.1 Data model (Supabase, `public` schema)

- `profiles` — one row per user (email), auto-created by an `auth.users` insert trigger.
- `exports` — one row per successful export; `kind` ∈ {short|medium|carousel}. Rolling-30-day
  counts drive the free caps.
- `entitlements` — plan/status/`renews_at` + `fs_*` (Freemius) ids. Written **only** by the
  webhook. Legacy `ls_*` columns unused.
- `author_profiles` — saved author profiles, per-user, RLS.
- `shares` — unlisted share pages (id, user_id, kind, images[], caption, created_at); RLS locks
  inserts to the founder email. Paired with a public `shares` storage bucket.
- **RPCs (SECURITY DEFINER, authenticated-only):** `record_export(p_kind)` →
  `{allowed, watermark, remaining, reason}` (enforces the 3/month + 1-carousel/month caps and the
  watermark decision); `get_usage()` → account status; `is_paid(uuid)` → expiration-aware, with a
  **founder bypass** (see §12).

### 8.2 Environment variables

- Client (`VITE_`, baked at build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_FREEMIUS_PRODUCT_ID`, `VITE_FREEMIUS_PLAN_MONTHLY`, `VITE_FREEMIUS_PLAN_LIFETIME`,
  `VITE_GA4_ID` (optional; analytics is a no-op when unset).
- Server (Vercel only, secret): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FREEMIUS_SECRET_KEY`.
- Build: `SITE_URL` (canonical/OG/sitemap origin). Set to `https://www.notes2pic.com` to match
  the host actually served (apex 301-redirects to www).

## 9. SEO / GEO (search + AI-citation)

Implemented in-code (translated from a Next.js playbook to this Vite + prerender stack):

- **Structured data (JSON-LD):** `Organization` + `WebSite` on every page; `BlogPosting` +
  `BreadcrumbList` on every post; `FAQPage` auto-built from any post's `## FAQ` section.
- **Crawlability:** `robots.txt` generated at build, explicitly allowing AI crawlers (`GPTBot`,
  `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-SearchBot`, `PerplexityBot`,
  `Google-Extended`, `CCBot`, `Applebot-Extended`), disallowing `/api/`. `llms.txt` generated.
  `sitemap.xml` + `rss.xml` with accurate `lastmod`.
- **Article metadata:** per-post `og:type=article`, published/modified time, author, `og:image`.
- **Blog template supports the GEO formula:** answer-first question-H2s (anchored), auto TOC,
  GFM tables, FAQ→schema, author byline, related-posts internal linking (no orphan pages).
- **Analytics:** GA4 wired (env-gated), page_view on every SPA route change.

**Off-page (owner tasks, not code):** Reddit participation, Bing Webmaster + IndexNow, Product
Hunt / AlternativeTo listings, GA4 "AI Traffic" channel setup.

## 10. Pricing & monetization

- **Free:** watermarked, capped (§6.3).
- **Paid:** $5/mo **or** $10 lifetime (first 20 buyers, then $17).
- **Open decision (see §13):** the $10 lifetime vs $5/mo tension. A lifetime buyer pays for ~2
  months then costs money forever, which works against recurring-revenue growth. Candidate fix:
  sell $5/mo directly, or "$5/mo, first 20 locked in forever" as the launch hook — urgency without
  capping upside. Currently the landing + checkout push lifetime.

## 11. Success metrics

- **Activation:** % of visitors who start a free export in the first session; carousels created.
- **Conversion:** free → paid rate; lifetime vs monthly split.
- **SEO/GEO:** GSC impressions/clicks on long-tail terms (weeks 8+); appearance in
  ChatGPT/Perplexity answers for target prompts (tracked weekly).
- **Outreach:** DM reply rate; share-link clicks; opt-in/buy from outreach.
- **Retention (if monthly):** month-over-month retained subscribers.

## 12. Founder bypass (testing constraint)

`okemdinach383@gmail.com` is hardcoded in `is_paid()` to always be paid (unlimited, no watermark)
and is the sole authorized uploader for share links. It therefore **cannot** validate the payment
pipeline — always test real purchases with a different email. Real accounts (never delete):
`okemdinach383@gmail.com`, `beowulfagate9@gmail.com`, `jeruelrichard@gmail.com`,
`okembackup383@gmail.com`, `okemfcb383@gmail.com`.

## 13. Risks & open questions

- **Pricing model** (§10) — the lifetime-vs-subscription decision is unresolved and affects the
  landing, checkout, and Freemius plan wiring.
- ~~**Canonical host mismatch**~~ — RESOLVED. `SITE_URL` is now `https://www.notes2pic.com`;
  live canonical/OG/JSON-LD all read www.
- **Share-link unfurling** — the `/s/:id` page MUST stay server-rendered or the whole DM tactic
  fails (blank unfurl). Shipped correctly (§6.4); keep it that way if the page is refactored.
- **New-domain SEO reality** — meaningful Google traffic is a 3–6 month horizon; AI citations +
  Reddit are the faster channel. Don't expect head terms to rank in year one.
- **OG image** — `public/og-image.png` is a placeholder (square app icon); replace with a real
  1200×630 share image.
- **Splitter ceiling** — deterministic rules can't understand "one idea"; genuine semantic
  splitting would need AI, which conflicts with the "not an AI generator" positioning.

## 14. Status & roadmap

**Shipped / live**
- Studio (3 modes), author profiles, avatar upload, sizes, templates, PWA.
- Auth (email + Google), reset password, free caps + watermark, Freemius checkout + webhook.
- Deployed to production on `www.notes2pic.com` (auto-deploy from `main`).
- Redesigned demo-led landing; blog with full SEO/GEO structure; privacy/terms; sitemap/rss/robots/llms.
- Intelligent, numbering- and style-aware thread splitter.
- GA4 wiring (env-gated; needs `VITE_GA4_ID` set in Vercel to activate).
- Founder share links (`/s/<id>`): schema, bucket, client lib, serverless render page, and studio
  "Create share link" UI — all live in production (§6.4).
- Canonical host fixed (`SITE_URL=https://www.notes2pic.com`).

**In progress**
- _(nothing active)_

**Planned / candidate**
- Resolve pricing model.
- 50-topic SEO/GEO content sprint (template already supports the formula).
- Brand kits, more/better templates, reusable presets, template preview gallery
  (see [PRODUCTIZATION_PLAN.md](PRODUCTIZATION_PLAN.md)).
- Optional AI "one idea per slide" split as a paid perk.
- Public browsable gallery (after founder-only share links prove out).
