import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// A single shared client. If env vars are missing (e.g. local dev before setup),
// we still export a client so imports don't crash; calls will simply fail and the
// UI surfaces a clear notice.
export const supabase = createClient(
  supabaseUrl || 'http://localhost',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
