// IndexNow: ping Bing/Yandex/DuckDuckGo the moment the site changes so new blog
// posts get discovered without waiting for a crawl. Google does NOT use IndexNow
// (GSC handles that) — this is the non-Google half of the picture.
//
// Runs as the last step of `npm run build`, but ONLY on a Vercel production build
// (guarded below) so local `npm run build` never pings anything. Never fails the
// build: any error is logged and swallowed (exit 0), because a missed ping is
// harmless — the sitemap still gets crawled the slow way.
//
// The key is PUBLIC by design: it's served openly at /<key>.txt to prove domain
// ownership, so there's nothing secret to hide here.
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = '33156ab60a90df3f2985f6b356f7c0de'

const here = dirname(fileURLToPath(import.meta.url))
const distDir = join(here, '..', 'dist')

const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  ''
)
  .trim()
  .replace(/\/$/, '')

async function main() {
  // Only submit for real production deploys. Skip local builds and preview builds.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    console.log(`IndexNow: skipped (VERCEL_ENV=${process.env.VERCEL_ENV}).`)
    return
  }
  if (!SITE_URL || !/^https:\/\//.test(SITE_URL)) {
    console.log(`IndexNow: skipped (no https SITE_URL: "${SITE_URL}").`)
    return
  }

  const host = new URL(SITE_URL).host

  // Pull the URL list straight from the sitemap we just generated.
  let sitemap
  try {
    sitemap = await readFile(join(distDir, 'sitemap.xml'), 'utf8')
  } catch {
    console.log('IndexNow: skipped (no dist/sitemap.xml — run the build first).')
    return
  }
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (urlList.length === 0) {
    console.log('IndexNow: skipped (sitemap had no <loc> URLs).')
    return
  }

  const body = {
    host,
    key: KEY,
    keyLocation: `${SITE_URL}/${KEY}.txt`,
    urlList,
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })

  // 200 = accepted, 202 = accepted & pending key validation. Both are fine.
  if (res.ok || res.status === 202) {
    console.log(`IndexNow: submitted ${urlList.length} URLs for ${host} (HTTP ${res.status}).`)
  } else {
    const text = await res.text().catch(() => '')
    console.log(`IndexNow: endpoint returned HTTP ${res.status}. ${text}`.trim())
  }
}

main().catch((err) => {
  // Never break the deploy over a missed ping.
  console.log('IndexNow: error (ignored):', err?.message || err)
})
