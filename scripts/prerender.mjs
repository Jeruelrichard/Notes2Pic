import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const distDir = join(root, 'dist')

const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'http://localhost:5173'
)
  .trim() // a trailing \n from the Vercel CLI silently breaks every absolute URL
  .replace(/\/$/, '')

const server = await import(pathToFileURL(join(root, 'dist-server', 'entry-server.js')).href)
const { render, listPrerenderPaths, posts, buildJsonLd, DEFAULT_DESCRIPTION, TOOL_PAGES } = server

const template = await readFile(join(distDir, 'index.html'), 'utf8')

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHead(meta) {
  const url = SITE_URL + meta.path
  const image = SITE_URL + (meta.image || '/og-image.png')
  const jsonLd = buildJsonLd(meta, SITE_URL)
  const tags = [
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    meta.noindex ? `<meta name="robots" content="noindex, follow" />` : '',
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:type" content="${meta.type || 'website'}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:site_name" content="Notes2Pic" />`,
    `<meta property="og:image" content="${image}" />`,
    meta.publishedTime ? `<meta property="article:published_time" content="${esc(meta.publishedTime)}" />` : '',
    meta.modifiedTime ? `<meta property="article:modified_time" content="${esc(meta.modifiedTime)}" />` : '',
    meta.author ? `<meta property="article:author" content="${esc(meta.author)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}

function applyHead(source, meta) {
  let page = source.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
  page = page.replace(/\s*<meta\s+name="description"[^>]*>/i, '')
  page = page.replace('</head>', `    ${buildHead(meta)}\n  </head>`)
  return page
}

async function writeRoute(pathname, contents) {
  const rel = pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '')}/index.html`
  const outPath = join(distDir, rel)
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, contents, 'utf8')
  return rel
}

// 1) SPA shell for the client-rendered studio (empty root → createRoot on load).
{
  const meta = {
    title: 'Studio | Notes2Pic',
    description: 'Turn your posts into Instagram-ready images.',
    path: '/app',
  }
  await writeRoute('/app', applyHead(template, meta))
  console.log('wrote SPA shell → app/index.html')
}

// 2) Prerender every marketing/blog route into static HTML.
for (const pathname of listPrerenderPaths()) {
  const { html, meta } = render(pathname)
  const page = applyHead(template, meta).replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  const rel = await writeRoute(pathname, page)
  console.log('prerendered', pathname, '→', rel)
}

// 3) sitemap.xml
const sitemapUrls = [
  '/',
  '/app',
  '/blog',
  '/contact',
  ...TOOL_PAGES.map((page) => page.path),
  ...posts.map((post) => `/blog/${post.slug}`),
]
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemapUrls
    .map((path) => {
      const post = path.startsWith('/blog/') ? posts.find((item) => `/blog/${item.slug}` === path) : null
      const tool = TOOL_PAGES.find((page) => page.path === path)
      const stamp = post?.updated || post?.date || tool?.updated
      const lastmod = stamp ? `\n    <lastmod>${stamp}</lastmod>` : ''
      return `  <url>\n    <loc>${SITE_URL}${path}</loc>${lastmod}\n  </url>`
    })
    .join('\n') +
  `\n</urlset>\n`
await writeFile(join(distDir, 'sitemap.xml'), sitemap, 'utf8')

// 4) rss.xml
const rssItems = posts
  .map(
    (post) =>
      `    <item>\n` +
      `      <title>${esc(post.title)}</title>\n` +
      `      <link>${SITE_URL}/blog/${post.slug}</link>\n` +
      `      <guid>${SITE_URL}/blog/${post.slug}</guid>\n` +
      `      <description>${esc(post.description)}</description>` +
      (post.date ? `\n      <pubDate>${new Date(post.date).toUTCString()}</pubDate>` : '') +
      `\n    </item>`,
  )
  .join('\n')
const rss =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<rss version="2.0">\n  <channel>\n` +
  `    <title>Notes2Pic Blog</title>\n` +
  `    <link>${SITE_URL}/blog</link>\n` +
  `    <description>Guides on content repurposing and growing on X, Threads, and Substack.</description>\n` +
  `${rssItems}\n  </channel>\n</rss>\n`
await writeFile(join(distDir, 'rss.xml'), rss, 'utf8')

// 5) robots.txt — allow all content + explicitly allow AI crawlers (the #1
// self-inflicted reason sites get zero AI citations is blanket-blocking them).
// OAI-SearchBot (not GPTBot) is what puts you in ChatGPT Search — allow both.
const aiBots = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'CCBot',
  'Applebot-Extended',
]
const robots =
  `User-agent: *\n` +
  `Allow: /\n` +
  `Disallow: /api/\n\n` +
  aiBots.map((bot) => `User-agent: ${bot}\nAllow: /\n`).join('\n') +
  `\nSitemap: ${SITE_URL}/sitemap.xml\n`
await writeFile(join(distDir, 'robots.txt'), robots, 'utf8')

// 6) llms.txt — cheap forward-compatibility (no proven citation lift, but free).
// A plain-text map of the site for LLMs that choose to read it.
const llms =
  `# Notes2Pic\n\n` +
  `> ${DEFAULT_DESCRIPTION}\n\n` +
  `Notes2Pic turns X, Threads, and Substack posts into clean, Instagram-ready images: short-post cards, medium-form quotes, and multi-slide carousels.\n\n` +
  `## Key pages\n` +
  `- [Notes2Pic studio](${SITE_URL}/app): the free editor.\n` +
  `- [Pricing](${SITE_URL}/#pricing): free, $5/mo, or $10 lifetime.\n` +
  `- [Blog](${SITE_URL}/blog): guides on repurposing writing into images.\n\n` +
  `## Blog\n` +
  posts.map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug}): ${post.description}`).join('\n') +
  `\n`
await writeFile(join(distDir, 'llms.txt'), llms, 'utf8')

console.log(`sitemap.xml + rss.xml + robots.txt + llms.txt written. SITE_URL = ${SITE_URL}`)
