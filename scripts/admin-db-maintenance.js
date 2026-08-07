import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  } catch (err) {
    console.warn('Failed to parse env file:', err.message)
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing Supabase credentials.')
    console.error('Please make sure your .env.local contains:')
    console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key')
    process.exit(1)
  }

  console.log('Connecting to Supabase...')
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1. Remove beowulfagate9@gmail.com & okembackup383@gmail.com from lifetime plan
  const removeEmails = ['beowulfagate9@gmail.com', 'okembackup383@gmail.com']
  console.log(`\n1. Removing users from lifetime plan: ${removeEmails.join(', ')}`)
  
  const { data: removeProfiles, error: removeLookupError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', removeEmails.map(e => e.toLowerCase()))

  if (removeLookupError) {
    console.error('Failed to look up profiles to remove:', removeLookupError.message)
  } else if (!removeProfiles || removeProfiles.length === 0) {
    console.log('No profiles found locally for the emails to remove.')
  } else {
    const removeIds = removeProfiles.map(p => p.id)
    const { error: deleteEntitlementError } = await supabase
      .from('entitlements')
      .delete()
      .in('user_id', removeIds)

    if (deleteEntitlementError) {
      console.error('Failed to remove entitlements:', deleteEntitlementError.message)
    } else {
      console.log(`Successfully removed lifetime entitlements for: ${removeProfiles.map(p => p.email).join(', ')}`)
    }
  }

  // 2. Add ugochukwuprincewill91@gmail.com to lifetime plan
  const addEmail = 'ugochukwuprincewill91@gmail.com'
  console.log(`\n2. Adding user to lifetime plan: ${addEmail}`)

  const { data: addProfile, error: addLookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', addEmail.toLowerCase())
    .maybeSingle()

  if (addLookupError) {
    console.error('Failed to look up profile to add:', addLookupError.message)
  } else if (!addProfile) {
    console.error(`ERROR: No user profile found for ${addEmail}. Ask the user to sign up/in first.`)
  } else {
    const entitlement = {
      user_id: addProfile.id,
      plan: 'lifetime',
      status: 'active',
      updated_at: new Date().toISOString()
    }

    const { error: upsertError } = await supabase
      .from('entitlements')
      .upsert(entitlement, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('Failed to add lifetime entitlement:', upsertError.message)
    } else {
      console.log(`Successfully added lifetime plan to ${addEmail}`)
    }
  }

  // 3. Reset credits for all free users
  console.log('\n3. Resetting usage credits for all free users...')
  
  // Get active paid user IDs to preserve their history if wanted, or delete free usage.
  // Note: we target users who do NOT have an active paid status in the entitlements table.
  const { data: paidUsers, error: paidUsersError } = await supabase
    .from('entitlements')
    .select('user_id')
    .eq('status', 'active')

  if (paidUsersError) {
    console.error('Failed to query paid users:', paidUsersError.message)
    return
  }

  const paidUserIds = (paidUsers || []).map(u => u.user_id)
  
  // Reset exports
  let exportsQuery = supabase.from('exports').delete()
  if (paidUserIds.length > 0) {
    exportsQuery = exportsQuery.not('user_id', 'in', `(${paidUserIds.join(',')})`)
  }
  const { error: exportsResetError } = await exportsQuery
  if (exportsResetError) {
    console.error('Failed to reset exports:', exportsResetError.message)
  } else {
    console.log('Reset all exports for free accounts successfully.')
  }

  // Reset generations
  let gensQuery = supabase.from('generations').delete()
  if (paidUserIds.length > 0) {
    gensQuery = gensQuery.not('user_id', 'in', `(${paidUserIds.join(',')})`)
  }
  const { error: gensResetError } = await gensQuery
  if (gensResetError) {
    console.error('Failed to reset generations:', gensResetError.message)
  } else {
    console.log('Reset all AI generations for free accounts successfully.')
  }

  console.log('\nDatabase maintenance complete!')
}

run().catch(console.error)
