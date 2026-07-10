import { supabase } from './supabaseClient'

// Saved author profiles live in Supabase (per-user), replacing localStorage.
export async function listProfiles() {
  const { data, error } = await supabase
    .from('author_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Insert or update a profile. Pass an `id` to update an existing row.
export async function upsertProfile(profile) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const row = {
    ...(profile.id ? { id: profile.id } : {}),
    user_id: user.id,
    name: profile.name || '',
    username: profile.username || '',
    avatar: profile.avatar || '',
    signature: profile.signature || '',
    source: profile.source || 'Substack Note',
    theme: profile.theme || 'dark',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('author_profiles').upsert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteProfileById(id) {
  const { error } = await supabase.from('author_profiles').delete().eq('id', id)
  if (error) throw error
}
