// Fetch a public tweet's content by URL, so a tool page can turn a pasted link
// into a Notes2Pic card without the user retyping anything.
//
// WHY A SERVERLESS FUNCTION: the browser can't call these endpoints directly
// (no CORS), so the fetch has to happen server-side.
//
// SOURCES, in order of fidelity:
//   1. cdn.syndication.twimg.com — the endpoint X's own embed widget uses.
//      Undocumented but free and complete: text, author, avatar, date, metrics.
//      It is NOT an official API and can break or start blocking us at any time.
//   2. publish.twitter.com/oembed — official-ish, free, but only gives the tweet
//      text + author name (no avatar, no date object, no metrics).
// If both fail we say so clearly and the UI falls back to manual paste.
//
// THE OPEN QUESTION this endpoint exists to answer: X aggressively blocks
// datacenter IPs. It works from a laptop; whether it works from Vercel's IPs is
// what we're testing. Hit /api/tweet?url=...&debug=1 on the deployed site to see
// exactly which source answered and what failed.

const FETCH_TIMEOUT_MS = 8000

// Matches x.com / twitter.com / mobile.twitter.com status links, or a bare id.
function extractTweetId(input = '') {
  const value = String(input).trim()
  if (/^\d{5,25}$/.test(value)) return value
  const match = value.match(/(?:twitter|x)\.com\/[^/]+\/status(?:es)?\/(\d+)/i)
  return match ? match[1] : null
}

// react-tweet's token derivation — the syndication endpoint requires it.
function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, '')
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
}

function decodeEntities(text = '') {
  return String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

// --- Source 1: syndication (full fidelity) ----------------------------------
async function fromSyndication(id, diag) {
  const url =
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}` +
    `&lang=en&token=${syndicationToken(id)}`
  try {
    const response = await fetchWithTimeout(url, { headers: BROWSER_HEADERS })
    diag.syndication = { status: response.status }
    if (!response.ok) return null

    const data = await response.json()
    // Deleted / protected / age-restricted tweets come back as a tombstone.
    if (!data || data.__typename === 'TweetTombstone' || !data.text) {
      diag.syndication.note = data?.__typename || 'no text in payload'
      return null
    }

    return {
      id,
      text: data.text,
      name: data.user?.name || '',
      handle: data.user?.screen_name || '',
      avatar: data.user?.profile_image_url_https || '',
      verified: Boolean(data.user?.is_blue_verified || data.user?.verified),
      date: data.created_at || '',
      likes: typeof data.favorite_count === 'number' ? data.favorite_count : null,
      replies: typeof data.conversation_count === 'number' ? data.conversation_count : null,
      retweets: typeof data.retweet_count === 'number' ? data.retweet_count : null,
      // Long-form ("note") tweets: syndication returns only an id reference for
      // the full body, never the text itself — so `text` above is the truncated
      // version. Flag it so the UI can say so instead of silently cutting off.
      truncated: Boolean(data.note_tweet),
      photo: data.photos?.[0]?.url || null,
    }
  } catch (error) {
    diag.syndication = { error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) }
    return null
  }
}

// --- Source 2: oEmbed (text + author only) ----------------------------------
async function fromOembed(id, diag) {
  const target = `https://twitter.com/i/status/${id}`
  const url = `https://publish.twitter.com/oembed?url=${encodeURIComponent(target)}&omit_script=1&dnt=true`
  try {
    const response = await fetchWithTimeout(url, { headers: BROWSER_HEADERS })
    diag.oembed = { status: response.status }
    if (!response.ok) return null

    const data = await response.json()
    // The tweet text lives inside the blockquote's <p>. Strip tags, keep breaks.
    const paragraph = data?.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ''
    const text = decodeEntities(paragraph.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim()
    if (!text) {
      diag.oembed.note = 'no text parsed from html'
      return null
    }

    return {
      id,
      text,
      name: data.author_name || '',
      handle: (data.author_url || '').split('/').filter(Boolean).pop() || '',
      avatar: '', // oEmbed does not expose the avatar
      verified: false,
      date: '',
      likes: null,
    }
  } catch (error) {
    diag.oembed = { error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) }
    return null
  }
}

export default async function handler(req, res) {
  const { url = '', id: rawId = '', debug = '' } = req.query || {}

  const id = extractTweetId(url || rawId)
  if (!id) {
    res.status(400).json({
      ok: false,
      error: 'Paste a full tweet link, e.g. https://x.com/user/status/1234567890',
    })
    return
  }

  const diag = {}
  let tweet = await fromSyndication(id, diag)
  let source = 'syndication'

  if (!tweet) {
    tweet = await fromOembed(id, diag)
    source = 'oembed'
  }

  if (!tweet) {
    // 502: we understood the request, the upstream let us down.
    res.status(502).json({
      ok: false,
      error: 'Could not read that tweet. It may be deleted, private, or X may be blocking us.',
      ...(debug ? { diagnostics: diag } : {}),
    })
    return
  }

  // Tweets are immutable enough to cache hard at the edge; this also keeps our
  // request volume against X low, which matters for not getting blocked.
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
  res.status(200).json({
    ok: true,
    source,
    tweet,
    ...(debug ? { diagnostics: diag } : {}),
  })
}
