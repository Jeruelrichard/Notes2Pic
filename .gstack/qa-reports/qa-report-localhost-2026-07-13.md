# QA Report — Notes2Pic (report-only)

- **Target:** http://localhost:5173 (Vite dev server)
- **Date:** 2026-07-13
- **Branch:** main (uncommitted landing-page redesign)
- **Mode:** diff-scoped — focus on the redesigned landing page + marketing routes
- **Framework:** Vite + React 19 SPA (prerendered marketing pages at build)
- **Skill:** gstack `/qa-only` methodology (report-only; no fixes applied)

## Method & limitations (read first)

gstack's native `browse` binary and `bin/*` scripts are **not installed** on this machine (the repo is a bare clone at `C:\Users\okemd\gstack`, not deployed into `~/.claude/skills/gstack/`). This pass executed the skill's QA methodology and report format using the available browser automation against the running dev server.

Two evidence limits:
- **Screenshots unavailable** — the preview pane's capture pipeline times out on this page (infinite carousel/caret animations never let it reach idle). Evidence here is functional: console, network, DOM/computed-style assertions, link audits, and responsive metrics. **Pixel-level visual issues (exact spacing, image-crop aesthetics) were not captured.**
- **Core `/app` studio smoke-tested only** — export, paywall, and carousel-generation flows need auth and are out of scope for a report-only pass.

## Health score: 98 / 100

| Category | Score | Weight | Notes |
|---|---|---|---|
| Console | 100 | 15% | 0 errors on fresh loads across all 5 routes |
| Links | 100 | 10% | All resolve in production; one dev-only caveat (ISSUE-002) |
| Visual | 100 | 10% | No overflow at 375 / 768 / 1280; layouts correct |
| Functional | 97 | 20% | Demo, carousel, routing, studio all work; minor lazy-avatar (ISSUE-001) |
| UX | 97 | 15% | Strong; lazy hero avatar can flash empty |
| Performance | 92 | 10% | ~600KB of raster PNGs on landing (ISSUE-003) |
| Content | 100 | 5% | No typos; profile rename applied correctly |
| Accessibility | 100 | 15% | Contrast ≥4.5, single h1, logical outline, focus-visible, reduced-motion, aria-hidden demo |

No **critical** or **high** issues found. Findings are low/medium/informational.

## Top 3 things to fix

1. **(MEDIUM)** Optimize landing imagery — ~600KB of 1080px PNGs; convert to WebP/AVIF and right-size. (ISSUE-003)
2. **(LOW)** Eager-load the above-the-fold hero demo avatar instead of `loading="lazy"`. (ISSUE-001)
3. **(INFO)** Nothing else blocking — the redesign is functionally clean.

---

## Issues

### ISSUE-001 — Hero demo avatar is lazy-loaded above the fold — LOW (Functional/UX)
The hero demo card avatar (`nuelokemdilim.jpg`, and the cycled `jerueldp.jpg` / `okempfp.jpg`) carries `loading="lazy"`. On desktop it's in the initial viewport, so lazy adds no benefit and can leave the avatar blank for a beat on first paint. On mobile the demo is pushed below the copy (`order: 2`), so it's genuinely below the fold there — acceptable, but the desktop case is a small polish miss.
- **Evidence:** DOM audit — `img[src=nuelokemdilim.jpg]` has `loading="lazy"`; hero grid is 2-col at ≥960px (avatar in viewport).
- **Repro:** Hard-reload `/` on desktop, watch the hero demo card avatar.
- **Suggested direction (not applied):** drop `loading="lazy"` on the hero `OutputCard` avatar (keep it on the below-fold outputs images).

### ISSUE-002 — Footer /sitemap.xml and /rss.xml serve SPA HTML in dev — LOW (dev-only, pre-existing)
In the dev server both links return `200 text/html` (the SPA `index.html`), not XML — clicking them in dev shows the app shell. These are **build-time prerender artifacts**, so they resolve correctly in the production build; this is not a production bug. Pre-existing in `SiteChrome` (not introduced by the redesign). Flagged so it isn't chased during local testing.
- **Evidence:** `GET /sitemap.xml` → `200 text/html`, body starts `<!doctype html>`; same for `/rss.xml`. `robots.txt` correctly returns `text/plain`.

### ISSUE-003 — Landing loads ~600KB of raster PNGs — MEDIUM (Performance)
The redesign adds real output imagery: `notes2pics-short-square.png` (184KB), `notes2pics-medium-square.png` (129KB), and 4 carousel slides (`slide-01..04`, ~90–127KB each), all 1080px PNG. All are `loading="lazy"` so they don't block first paint, but the total raster payload is large for a marketing page.
- **Evidence:** network GETs all 200; file sizes from disk (1080×1080 and 1080×1350 PNGs).
- **Suggested direction (not applied):** export WebP/AVIF, right-size to the rendered dimensions (~340–420px CSS width), consider a `srcset`. Would cut the image payload substantially.
- **Note:** Google Fonts load via a render-blocking `<link>` with `display=swap` (acceptable; a `preload` could shave a bit).

### ISSUE-004 — Transient React error during HMR — INFO (not reproducible)
A `console.error` "An error occurred in the `<Landing>` component" appeared **during** live editing (Fast Refresh), immediately after adding the `useSyncExternalStore` hook mid-session (hook-count change forces a remount). **Not reproducible on a fresh page load** — verified clean (`onlyErrors` returned nothing) after a full reload. No action needed; noted for completeness.

---

## What was verified clean

- **Console:** 0 errors on fresh loads of `/`, `/app`, `/blog`, `/privacy`, `/terms`.
- **Network:** all real asset GETs 200 (avatars, result images, slides, marks, fonts). The `net::ERR_ABORTED` entries in the log were the tester's own aborted HEAD probes, not app requests.
- **Routing:** all 9 unique links point to valid routes; client-side nav works; `/app` studio loads with controls (mode tabs, text fields, source dropdown).
- **Responsive:** no horizontal overflow at 375 / 768 / 1280; grids collapse correctly (hero 2→1 col, outputs/steps/pricing 3→1 col); H1 clamps 56px→41.6px.
- **Pricing:** the **Lifetime** card renders first (`order: -1`) at all widths — matches the primary-CTA intent.
- **Animation:** hero demo interval + clay sweep running; carousel auto-advances (11s loop, 5 frames incl. seamless clone, 4 synced dots); caret blinks.
- **Accessibility:** contrast all ≥4.5:1 (body 7.28, headings 15.8, links 6.98, CTA 5.06); single h1; logical heading outline (no skipped levels); content images have descriptive alt, decorative empty; hero demo `aria-hidden`; carousel `role="img"` + label; focus-visible outline present; `prefers-reduced-motion` disables the loop.
- **Content:** profile rename applied — "The Independent Path" → **Okem Dinach** / `theokemdinach`; no typos found in landing copy.

## No test framework detected

The project has no automated test infrastructure (unit/e2e). Run gstack `/qa` (the test-fix-verify loop) to bootstrap one and enable regression baselines. This report's `baseline.json` supports `--regression` diffing on the next run.
