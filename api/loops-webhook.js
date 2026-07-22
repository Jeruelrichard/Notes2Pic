import crypto from 'node:crypto'

// Fired by a Supabase Database Webhook on `public.profiles` INSERT (i.e. a new
// user registered — the auth.users insert trigger creates the profile row).
// We forward that to Loops so a welcome/onboarding workflow can start. This is
// a side-channel only: it does NOT send signup-confirmation or password-reset
// emails — Supabase still owns those.

const LOOPS_API_KEY = process.env.LOOPS_API_KEY
// Shared secret we set as a custom header on the Supabase webhook, so random
// POSTs to this public URL can't inject contacts. (Database Webhooks don't HMAC
// the body, so a header secret is the supported way to authenticate them.)
const LOOPS_WEBHOOK_SECRET = process.env.LOOPS_WEBHOOK_SECRET

// The event name your Loop workflow triggers on. Must match the workflow's
// trigger event in the Loops dashboard exactly.
const SIGNUP_EVENT = 'user_signed_up'

const LOOPS_BASE = 'https://app.loops.so/api/v1'

// Constant-time compare so we don't leak the secret via timing.
function secretMatches(provided) {
  if (!provided || !LOOPS_WEBHOOK_SECRET) return false
  const a = Buffer.from(String(provided))
  const b = Buffer.from(LOOPS_WEBHOOK_SECRET)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function loops(path, body) {
  const res = await fetch(`${LOOPS_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  let payload = null
  try {
    payload = await res.json()
  } catch {
    /* Loops occasionally returns an empty body on success */
  }
  return { ok: res.ok, status: res.status, payload }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!LOOPS_API_KEY || !LOOPS_WEBHOOK_SECRET) {
    console.error('Loops webhook missing required env vars')
    return res.status(500).json({ error: 'Server not configured' })
  }

  // Authenticate the caller via the shared secret header. On mismatch, reveal
  // nothing (401 with no body) so this endpoint can't be probed.
  const provided =
    req.headers['x-webhook-secret'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!secretMatches(provided)) {
    return res.status(401).end()
  }

  // Vercel parses JSON bodies by default; guard anyway.
  const event = typeof req.body === 'object' && req.body ? req.body : null
  if (!event) return res.status(400).json({ error: 'Invalid JSON' })

  // Only act on new-profile inserts; ack anything else so Supabase stops retrying.
  if (event.type !== 'INSERT' || event.table !== 'profiles') {
    return res.status(200).json({ ok: true, ignored: `${event.type}:${event.table}` })
  }

  const email = event.record?.email
  if (!email) {
    console.warn('Loops webhook: profile insert with no email', event.record?.id)
    return res.status(200).json({ ok: true, ignored: 'no_email' })
  }

  const normalizedEmail = String(email).toLowerCase()

  // 1) Upsert the contact into Loops (creates them, or no-ops if they exist).
  const contact = await loops('/contacts/update', {
    email: normalizedEmail,
    source: 'notes2pic-signup',
    subscribed: true,
  })
  if (!contact.ok) {
    console.error('Loops contact update failed', contact.status, contact.payload)
    // Fall through and still try the event — the event endpoint also upserts.
  }

  // 2) Fire the signup event that the Loop workflow listens for.
  const evt = await loops('/events/send', {
    email: normalizedEmail,
    eventName: SIGNUP_EVENT,
  })
  if (!evt.ok) {
    console.error('Loops event send failed', evt.status, evt.payload)
    // 500 so Supabase retries — a dropped welcome email is recoverable, and
    // this endpoint is idempotent (contact upsert + event are both safe to repeat).
    return res.status(500).json({ error: 'Loops event failed' })
  }

  return res.status(200).json({ ok: true, event: SIGNUP_EVENT })
}
