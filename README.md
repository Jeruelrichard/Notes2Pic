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

## Run locally

```bash
npm install
npm run dev
```
