import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LOOPS_API_KEY = process.env.LOOPS_API_KEY
const LOOPS_WEBHOOK_SECRET = process.env.LOOPS_WEBHOOK_SECRET
const LOOPS_BASE = 'https://app.loops.so/api/v1'

function secretMatches(provided) {
  if (!provided || !LOOPS_WEBHOOK_SECRET) return false
  const a = Buffer.from(String(provided))
  const b = Buffer.from(LOOPS_WEBHOOK_SECRET)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function updateLoopsActivity(email, properties) {
  try {
    const res = await fetch(`${LOOPS_BASE}/contacts/update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: String(email).toLowerCase().trim(),
        ...properties,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('Failed to update activity in Loops:', res.status, text)
    }
  } catch (err) {
    console.error('Error updating activity in Loops:', err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!LOOPS_API_KEY || !LOOPS_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Activity webhook missing required env vars')
    return res.status(500).json({ error: 'Server not configured' })
  }

  // Authenticate the caller via the shared secret header
  const provided =
    req.headers['x-webhook-secret'] ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!secretMatches(provided)) {
    return res.status(401).end()
  }

  const event = typeof req.body === 'object' && req.body ? req.body : null
  if (!event) return res.status(400).json({ error: 'Invalid JSON' })

  // Support inserts on 'exports' or 'generations'
  if (event.type !== 'INSERT' || (event.table !== 'exports' && event.table !== 'generations')) {
    return res.status(200).json({ ok: true, ignored: `${event.type}:${event.table}` })
  }

  const record = event.record
  const userId = record?.user_id
  if (!userId) {
    return res.status(200).json({ ok: true, ignored: 'no_user_id' })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1) Get email
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (pError || !profile?.email) {
    console.error('Profile lookup failed', pError, userId)
    return res.status(200).json({ ok: true, ignored: 'no_profile' })
  }

  // 2) Get total exports
  const { count: totalExports, error: expError } = await supabase
    .from('exports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (expError) {
    console.error('Exports count failed', expError)
  }

  // 3) Get total generations
  const { count: totalGenerations, error: genError } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (genError) {
    console.error('Generations count failed', genError)
  }

  // 4) Update Loops
  await updateLoopsActivity(profile.email, {
    totalExports: totalExports || 0,
    totalGenerations: totalGenerations || 0,
    lastActiveAt: record.created_at || new Date().toISOString(),
  })

  return res.status(200).json({ ok: true, synced: userId })
}
