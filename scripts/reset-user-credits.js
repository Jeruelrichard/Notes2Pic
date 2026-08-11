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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
  const targetEmail = 'tonysage339@gmail.com'

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('ERROR: Missing Supabase credentials.')
    console.error('Please make sure your .env.local contains:')
    console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key')
    process.exit(1)
  }

  console.log(`Connecting to Supabase...`)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  console.log(`Looking up profile for ${targetEmail}...`)
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', targetEmail.toLowerCase())
    .maybeSingle()

  if (lookupError) {
    console.error('Lookup error:', lookupError.message)
    process.exit(1)
  }

  if (!profile) {
    console.error(`ERROR: User ${targetEmail} not found in profiles table. Make sure they signed up first.`)
    process.exit(1)
  }

  console.log(`Found user ID: ${profile.id}. Deleting exports (credits)...`)
  const { count: deletedExports, error: deleteExportsError } = await supabase
    .from('exports')
    .delete({ count: 'exact' })
    .eq('user_id', profile.id)

  if (deleteExportsError) {
    console.error('Failed to delete exports:', deleteExportsError.message)
  } else {
    console.log(`Successfully reset credits! Deleted ${deletedExports || 0} export logs for ${targetEmail}.`)
  }

  console.log(`Deleting AI generations (if any)...`)
  const { count: deletedGenerations, error: deleteGensError } = await supabase
    .from('generations')
    .delete({ count: 'exact' })
    .eq('user_id', profile.id)

  if (deleteGensError) {
    console.error('Failed to delete generations:', deleteGensError.message)
  } else {
    console.log(`Successfully deleted ${deletedGenerations || 0} AI generations for ${targetEmail}.`)
  }

  console.log('Done!')
}

run().catch(console.error)
