import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Vercel: keep the raw body so we can verify the HMAC signature.
export const config = { api: { bodyParser: false } }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FREEMIUS_SECRET_KEY = process.env.FREEMIUS_SECRET_KEY

// License events that should (re)sync a user's entitlement.
const LICENSE_EVENTS = new Set([
  'license.created',
  'license.updated',
  'license.extended',
  'license.shortened',
  'license.cancelled',
  'license.expired',
  'license.plan.changed',
])

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !FREEMIUS_SECRET_KEY) return false
  const digest = crypto.createHmac('sha256', FREEMIUS_SECRET_KEY).update(rawBody).digest('hex')
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(String(signatureHeader), 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Freemius license → our provider-agnostic entitlement shape.
function toEntitlement(userId, license) {
  const expiration = license?.expiration ? new Date(license.expiration).toISOString() : null
  const plan = expiration === null ? 'lifetime' : 'monthly'

  let status
  if (license?.is_canceled) status = 'cancelled'
  else if (expiration && new Date(expiration) < new Date()) status = 'expired'
  else status = 'active'

  return {
    user_id: userId,
    plan,
    status,
    renews_at: expiration,
    fs_license_id: String(license?.id ?? ''),
    fs_plan_id: String(license?.plan_id ?? ''),
    fs_pricing_id: String(license?.pricing_id ?? ''),
    fs_user_id: String(license?.user_id ?? ''),
    updated_at: new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !FREEMIUS_SECRET_KEY) {
    console.error('Freemius webhook missing required env vars')
    return res.status(500).json({ error: 'Server not configured' })
  }

  const rawBody = await readRawBody(req)

  // Per Freemius docs: on an invalid signature, ack with 200 and reveal nothing.
  if (!verifySignature(rawBody, req.headers['x-signature'])) {
    return res.status(200).end()
  }

  let event
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const eventType = event?.type
  if (!LICENSE_EVENTS.has(eventType)) {
    return res.status(200).json({ ok: true, ignored: eventType })
  }

  const fsUser = event?.objects?.user
  const license = event?.objects?.license
  const email = fsUser?.email
  if (!email || !license) {
    return res.status(200).json({ ok: true, ignored: 'missing_user_or_license' })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // Map the Freemius customer back to our Supabase user by email. We prefill the
  // checkout with the logged-in email + readonly_user, so they match.
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', String(email).toLowerCase())
    .maybeSingle()

  if (lookupError) {
    console.error('Freemius webhook profile lookup failed', lookupError)
    return res.status(500).json({ error: 'Lookup failed' })
  }
  if (!profile) {
    // Paid with an email we don't recognise — acknowledge so Freemius stops retrying.
    console.warn('Freemius webhook: no local user for', email, eventType)
    return res.status(200).json({ ok: true, ignored: 'no_local_user' })
  }

  const entitlement = toEntitlement(profile.id, license)

  const { error } = await supabase
    .from('entitlements')
    .upsert(entitlement, { onConflict: 'user_id' })

  if (error) {
    console.error('Freemius entitlement upsert failed', error)
    return res.status(500).json({ error: 'Upsert failed' })
  }

  return res.status(200).json({ ok: true, event: eventType, plan: entitlement.plan, status: entitlement.status })
}
