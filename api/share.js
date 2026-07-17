import { createClient } from '@supabase/supabase-js'

// Serverless share page for /s/<id>. This MUST be server-rendered (not the SPA):
// DM unfurlers on X/Substack/etc. don't run JavaScript, so a client-rendered
// route would unfurl as a blank card. Here the OG tags and the images are in the
// initial HTML, so the carousel previews right in the DM.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'https://www.notes2pic.com'
)
  .trim()
  .replace(/\/$/, '')

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function publicImageUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/shares/${path}`
}

function notFound(res) {
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.status(404).send(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="robots" content="noindex" />` +
      `<title>Link not found | Notes2Pic</title><meta name="viewport" content="width=device-width, initial-scale=1" />` +
      `<style>body{font-family:system-ui,sans-serif;background:#faf8f5;color:#241c15;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}a{color:#8f3c22}</style></head>` +
      `<body><div><h1>This link isn't available</h1><p>It may have been removed. <a href="${SITE_URL}/">Go to Notes2Pic</a></p></div></body></html>`,
  )
}

export default async function handler(req, res) {
  const id = String(req.query.id || '').trim()
  if (!id || !/^[a-z0-9]{4,16}$/.test(id) || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return notFound(res)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: share, error } = await supabase
    .from('shares')
    .select('id, kind, images, caption')
    .eq('id', id)
    .maybeSingle()

  if (error || !share || !Array.isArray(share.images) || share.images.length === 0) {
    return notFound(res)
  }

  const html = renderSharePage({
    siteUrl: SITE_URL,
    pageUrl: `${SITE_URL}/s/${id}`,
    images: share.images.map(publicImageUrl),
    kind: share.kind,
    caption: share.caption,
  })

  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'public, max-age=300, s-maxage=3600')
  res.status(200).send(html)
}

// Pure renderer, exported so it can be unit-tested without a live request.
export function renderSharePage({ siteUrl, pageUrl, images, kind, caption }) {
  const ogImage = images[0]
  const title = kind === 'carousel' ? 'A carousel made with Notes2Pic' : 'Made with Notes2Pic'
  const description = caption
    ? caption
    : 'Turn your X, Threads, and Substack posts into clean, Instagram-ready images.'

  const slidesHtml = images
    .map(
      (src, i) =>
        `<figure class="slide"><img src="${esc(src)}" alt="Slide ${i + 1} of ${images.length}" loading="${i === 0 ? 'eager' : 'lazy'}" /></figure>`,
    )
    .join('')

  const dotsHtml =
    images.length > 1
      ? `<div class="dots" role="tablist" aria-label="Slides">${images
          .map((_, i) => `<button class="dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Go to slide ${i + 1}"></button>`)
          .join('')}</div>`
      : ''

  const navHtml =
    images.length > 1
      ? `<button class="nav prev" aria-label="Previous slide">‹</button><button class="nav next" aria-label="Next slide">›</button>`
      : ''

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)} | Notes2Pic</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta name="robots" content="noindex" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Notes2Pic" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(ogImage)}" />
    <style>
      :root { --bg:#faf8f5; --ink:#241c15; --muted:#5c5147; --clay:#b5502f; --surface:#fff; --line:#eae3da; }
      * { box-sizing: border-box; }
      body { margin:0; background:var(--bg); color:var(--ink);
        font-family:'Hanken Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;
        display:flex; flex-direction:column; min-height:100svh; }
      header, footer { text-align:center; }
      header { padding:22px 20px 6px; }
      .brand { display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:1.1rem; color:var(--ink); text-decoration:none; }
      .brand span.dot { width:9px; height:9px; border-radius:50%; background:var(--clay); }
      main { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:14px 16px; }
      .stage { position:relative; width:100%; max-width:440px; }
      .track { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scroll-behavior:smooth;
        gap:0; border-radius:18px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
      .track::-webkit-scrollbar { display:none; }
      .slide { flex:0 0 100%; scroll-snap-align:center; margin:0; }
      .slide img { display:block; width:100%; height:auto; border-radius:18px;
        box-shadow:0 2px 4px rgba(36,28,21,.05), 0 26px 60px rgba(36,28,21,.16); }
      .nav { position:absolute; top:50%; transform:translateY(-50%); width:40px; height:40px; border:none;
        border-radius:50%; background:rgba(20,15,10,.55); color:#fff; font-size:1.5rem; line-height:1; cursor:pointer;
        display:grid; place-items:center; backdrop-filter:blur(4px); }
      .nav.prev { left:8px; } .nav.next { right:8px; }
      .dots { display:flex; gap:7px; justify-content:center; margin-top:16px; }
      .dot { width:8px; height:8px; padding:0; border:none; border-radius:50%; background:rgba(36,28,21,.22); cursor:pointer; transition:background .2s, transform .2s; }
      .dot.active { background:var(--clay); transform:scale(1.3); }
      footer { padding:20px 20px 30px; }
      .cta { display:inline-flex; align-items:center; gap:8px; margin-top:2px; padding:12px 22px; border-radius:11px;
        background:var(--clay); color:#fff; font-weight:600; text-decoration:none; box-shadow:0 10px 24px rgba(181,80,47,.28); }
      .made { margin:0 0 12px; color:var(--muted); font-size:.95rem; }
      @media (prefers-color-scheme: dark) {
        :root { --bg:#17120d; --ink:#f3ece2; --muted:#b6a89a; --surface:#221a13; --line:#2c231a; }
        .dot { background:rgba(243,236,226,.25); }
      }
    </style>
  </head>
  <body>
    <header><a class="brand" href="${siteUrl}/"><span class="dot"></span>Notes2Pic</a></header>
    <main>
      <div class="stage">
        <div class="track" id="track">${slidesHtml}</div>
        ${navHtml}
      </div>
      ${dotsHtml}
    </main>
    <footer>
      <p class="made">Made with Notes2Pic</p>
      <a class="cta" href="${siteUrl}/app">Try it free →</a>
    </footer>
    <script>
      (function () {
        var track = document.getElementById('track');
        if (!track) return;
        var slides = track.querySelectorAll('.slide');
        var dots = Array.prototype.slice.call(document.querySelectorAll('.dot'));
        function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); slides[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }
        var prev = document.querySelector('.nav.prev'), next = document.querySelector('.nav.next');
        function current() { return Math.round(track.scrollLeft / track.clientWidth); }
        if (prev) prev.addEventListener('click', function () { go(current() - 1); });
        if (next) next.addEventListener('click', function () { go(current() + 1); });
        dots.forEach(function (d) { d.addEventListener('click', function () { go(Number(d.dataset.i)); }); });
        track.addEventListener('scroll', function () {
          var i = current();
          dots.forEach(function (d, di) { d.classList.toggle('active', di === i); });
        }, { passive: true });
      })();
    </script>
  </body>
</html>`

  return html
}
