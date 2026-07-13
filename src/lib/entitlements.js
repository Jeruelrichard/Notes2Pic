import { supabase } from './supabaseClient'

// Server-authoritative export gate. `kind` is 'short' | 'medium' | 'carousel'.
// Returns the RPC payload: { allowed, watermark, remaining, reason }
export async function recordExport(kind = 'other') {
  const { data, error } = await supabase.rpc('record_export', { p_kind: kind })
  if (error) throw error
  return data
}

// Read-only usage/plan status for the account UI.
// { authenticated, paid, plan, remaining, used, limit }
export async function getUsage() {
  const { data, error } = await supabase.rpc('get_usage')
  if (error) throw error
  return data
}
