# Notes2pics

Notes2pics is a local MVP for manually turning a Substack Note, X post, or short text post into an Instagram-ready PNG.

## What works

- Manually edit name, username, source, watermark, and post text. Short-form posts always show the current date.
- Short-form posts are capped at 500 characters and preserve line breaks/spacing in the image.
- Save reusable profiles in this browser with name, username, source, and avatar.
- Upload an avatar image for reliable PNG export.
- Pick Square, Portrait, or Story canvas sizes.
- Pick from four visual templates.
- Switch to Medium form mode for clean medium-length text images with dark and light themes.
- Medium-form exports preserve line breaks, spacing, and indentation while fitting all text into the image.
- Export a high-resolution PNG from the live preview.
- Install as a PWA after deploying over HTTPS.

## PWA install

The app includes a web manifest, mobile icons, and a production service worker. Mobile browsers usually require HTTPS before showing install/add-to-home-screen prompts.

## Why it is manual

X and Substack can block scraping or require login, so this version does not pretend to fetch posts from links. The reliable path is manual editing plus avatar upload.

## Saved profiles

Profiles are saved in browser localStorage under `notes2pics.profiles`. They stay available in the same browser on the same machine. Clearing site data or switching browsers will remove them.

## Accounts, limits, and payments

- Editing and previewing are always free and need no account.
- **Exporting requires sign-in** (Supabase Auth: email+password or Google).
- Free tier: **3 exports per rolling 30 days**, each carrying a "made with Notes2Pics" watermark.
- Paid tier removes the watermark and unlocks unlimited exports: **$5/mo** or **$10 lifetime** (Lemon Squeezy).
- Entitlements are written only by the Lemon Squeezy webhook (server-side, service-role key),
  so the paywall can't be bypassed from the browser. The export limit is enforced by the
  `record_export()` Postgres RPC.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in Supabase + Lemon Squeezy values
npm run dev
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full backend/payments setup and go-live checklist.
