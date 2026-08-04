import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const LOOPS_API_KEY = process.env.LOOPS_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !LOOPS_API_KEY) {
  console.error('Error: Missing required environment variables.')
  console.error('Make sure your .env.local has VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and LOOPS_API_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const LOOPS_BASE = 'https://app.loops.so/api/v1'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function updateLoopsContact(email, properties) {
  const normalizedEmail = String(email).toLowerCase().trim()
  try {
    const res = await fetch(`${LOOPS_BASE}/contacts/update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        ...properties,
      }),
    })
    
    if (res.ok) {
      console.log(`Successfully synced ${normalizedEmail} -> properties:`, properties)
      return true
    } else {
      const text = await res.text()
      console.error(`Failed to sync ${normalizedEmail}: ${res.status} - ${text}`)
      return false
    }
  } catch (err) {
    console.error(`Error syncing ${normalizedEmail}:`, err.message)
    return false
  }
}

async function run() {
  console.log('Fetching profiles from Supabase...')
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, email')
  
  if (pError) {
    console.error('Failed to fetch profiles:', pError.message)
    process.exit(1)
  }

  console.log(`Fetched ${profiles.length} profiles. Fetching entitlements, exports, and generations...`)
  const [
    { data: entitlements, error: eError },
    { data: exports, error: expError },
    { data: generations, error: genError }
  ] = await Promise.all([
    supabase.from('entitlements').select('user_id, plan, status'),
    supabase.from('exports').select('user_id, created_at'),
    supabase.from('generations').select('user_id, created_at')
  ])

  if (eError || expError || genError) {
    console.error('Failed to fetch data from Supabase:', eError || expError || genError)
    process.exit(1)
  }

  const entitlementMap = {}
  for (const ent of entitlements || []) {
    entitlementMap[ent.user_id] = ent
  }

  const exportsMap = {}
  const generationsMap = {}
  const lastActiveMap = {}

  for (const exp of exports || []) {
    exportsMap[exp.user_id] = (exportsMap[exp.user_id] || 0) + 1
    const dt = new Date(exp.created_at)
    if (!lastActiveMap[exp.user_id] || dt > new Date(lastActiveMap[exp.user_id])) {
      lastActiveMap[exp.user_id] = exp.created_at
    }
  }

  for (const gen of generations || []) {
    generationsMap[gen.user_id] = (generationsMap[gen.user_id] || 0) + 1
    const dt = new Date(gen.created_at)
    if (!lastActiveMap[gen.user_id] || dt > new Date(lastActiveMap[gen.user_id])) {
      lastActiveMap[gen.user_id] = gen.created_at
    }
  }

  console.log('Starting sync to Loops...')
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i]
    if (!profile.email) continue

    const ent = entitlementMap[profile.id]
    const planStatus = (ent && (ent.status === 'active' || ent.status === 'cancelled'))
      ? ent.plan
      : 'free'

    const totalExports = exportsMap[profile.id] || 0
    const totalGenerations = generationsMap[profile.id] || 0
    const lastActiveAt = lastActiveMap[profile.id] || null

    const success = await updateLoopsContact(profile.email, {
      planStatus,
      totalExports,
      totalGenerations,
      ...(lastActiveAt ? { lastActiveAt } : {})
    })

    if (success) {
      successCount++
    } else {
      failCount++
    }

    // Rate-limit safety: wait 100ms between calls
    await sleep(100)
  }

  console.log('\n--- Sync Summary ---')
  console.log(`Total processed: ${profiles.length}`)
  console.log(`Successful updates: ${successCount}`)
  console.log(`Failed updates: ${failCount}`)
}

run()
