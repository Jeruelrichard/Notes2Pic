import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Vercel: give us the raw body so we can verify the HMAC signature.
export const config = { api: { bodyParser: false } }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
const VARIANT_MONTHLY = process.env.LEMONSQUEEZY_VARIANT_MONTHLY
const VARIANT_LIFETIME = process.env.LEMONSQUEEZY_VARIANT_LIFETIME

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !WEBHOOK_SECRET) return false
  const digest = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')
  const a = Buffer.from(digest, 'hex')
  const b = Buffer.from(String(signatureHeader), 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Map a Lemon Squeezy subscription status to our entitlement status.
function mapSubStatus(status) {
  if (['active', 'on_trial', 'paused'].includes(status)) return 'active'
  if (status === 'cancelled') return 'cancelled'
  return 'expired' // expired, unpaid, past_due
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
    console.error('Webhook missing required env vars')
    return res.status(500).json({ error: 'Server not configured' })
  }

  const rawBody = await readRawBody(req)

  if (!verifySignature(rawBody, req.headers['x-signature'])) {
    return res.status(400).json({ error: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const eventName = event?.meta?.event_name
  const userId = event?.meta?.custom_data?.user_id
  const attributes = event?.data?.attributes || {}

  if (!userId) {
    // Nothing to attribute — acknowledge so LS doesn't retry forever.
    console.warn('Webhook without custom_data.user_id', eventName)
    return res.status(200).json({ ok: true, ignored: 'no_user_id' })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  let entitlement = null

  if (eventName === 'order_created') {
    const variantId = String(
      attributes?.first_order_item?.variant_id ?? attributes?.variant_id ?? '',
    )
    // Only treat the lifetime product's order as an entitlement here;
    // subscription orders are handled by the subscription_* events.
    if (VARIANT_LIFETIME && variantId === String(VARIANT_LIFETIME)) {
      entitlement = {
        user_id: userId,
        plan: 'lifetime',
        status: 'active',
        ls_customer_id: String(attributes.customer_id ?? ''),
        ls_order_id: String(event?.data?.id ?? ''),
        ls_variant_id: variantId,
        renews_at: null,
        updated_at: new Date().toISOString(),
      }
    }
  } else if (
    ['subscription_created', 'subscription_updated', 'subscription_cancelled', 'subscription_expired', 'subscription_resumed'].includes(
      eventName,
    )
  ) {
    const variantId = String(attributes?.variant_id ?? '')
    entitlement = {
      user_id: userId,
      plan: 'monthly',
      status: mapSubStatus(attributes?.status),
      ls_customer_id: String(attributes?.customer_id ?? ''),
      ls_subscription_id: String(event?.data?.id ?? ''),
      ls_variant_id: variantId || (VARIANT_MONTHLY ? String(VARIANT_MONTHLY) : null),
      renews_at: attributes?.renews_at ?? null,
      updated_at: new Date().toISOString(),
    }
  }

  if (!entitlement) {
    return res.status(200).json({ ok: true, ignored: eventName })
  }

  const { error } = await supabase
    .from('entitlements')
    .upsert(entitlement, { onConflict: 'user_id' })

  if (error) {
    console.error('Entitlement upsert failed', error)
    return res.status(500).json({ error: 'Upsert failed' })
  }

  return res.status(200).json({ ok: true, event: eventName, plan: entitlement.plan, status: entitlement.status })
}
