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

async function updateLoopsPlanStatus(email, planStatus) {
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
        userProperties: {
          planStatus: planStatus,
        },
      }),
    })
    
    if (res.ok) {
      console.log(`Successfully synced ${normalizedEmail} -> planStatus: ${planStatus}`)
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

  console.log(`Fetched ${profiles.length} profiles. Fetching entitlements...`)
  const { data: entitlements, error: eError } = await supabase
    .from('entitlements')
    .select('user_id, plan, status')

  if (eError) {
    console.error('Failed to fetch entitlements:', eError.message)
    process.exit(1)
  }

  const entitlementMap = {}
  for (const ent of entitlements || []) {
    entitlementMap[ent.user_id] = ent
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

    const success = await updateLoopsPlanStatus(profile.email, planStatus)
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
