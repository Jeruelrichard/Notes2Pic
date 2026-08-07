import { supabase } from './supabaseClient'

export const PALETTES = [
  { name: 'dark', label: 'Midnight', bg: '#0A0A0A', text: '#F5F5F1' },
  { name: 'light', label: 'Sand', bg: '#FBFBF7', text: '#111111' },
  { name: 'terracotta', label: 'Terracotta', bg: '#FBEBE8', text: '#802012' },
  { name: 'ocean', label: 'Ocean', bg: '#0F172A', text: '#F8FAFC' },
  { name: 'sunset', label: 'Sunset', bg: '#FFF8E7', text: '#D97706' },
  { name: 'forest', label: 'Forest', bg: '#EBF1EB', text: '#064E3B' },
  { name: 'lavender', label: 'Lavender', bg: '#F5F3FF', text: '#4C1D95' },
  { name: 'slate', label: 'Slate', bg: '#F1F5F9', text: '#0F172A' },
]

export function parseTheme(themeStr) {
  if (!themeStr) return { type: 'preset', value: 'dark', bgColor: '#0A0A0A', textColor: '#F5F5F1' }
  if (themeStr.startsWith('custom:')) {
    const parts = themeStr.replace('custom:', '').split('|')
    return { type: 'custom', value: 'custom', bgColor: parts[0] || '#ffffff', textColor: parts[1] || '#000000' }
  }
  if (themeStr.startsWith('palette:')) {
    const name = themeStr.replace('palette:', '')
    const preset = PALETTES.find(p => p.name === name) || PALETTES[0]
    return { type: 'preset', value: name, bgColor: preset.bg, textColor: preset.text }
  }
  // Default dark/light legacy values
  const preset = PALETTES.find(p => p.name === themeStr) || PALETTES[0]
  return { type: 'preset', value: themeStr, bgColor: preset.bg, textColor: preset.text }
}

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
