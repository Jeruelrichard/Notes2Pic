import { supabase } from './supabaseClient'

// Share links are a founder-only outreach tool: cold DMs on Instagram can't
// carry attachments on a first message, so we send a link to a branded page
// instead. Gated here for UI purposes; the real enforcement is the RLS policy
// on public.shares and storage.objects (see the create_shares_and_bucket
// migration), which checks the same email server-side.
export const FOUNDER_EMAIL = 'okemdinach383@gmail.com'

export function isFounder(user) {
  return Boolean(user?.email && user.email.toLowerCase() === FOUNDER_EMAIL)
}

// Unambiguous alphabet: no 0/O/1/l/I, so the id survives being read aloud or
// retyped from a DM.
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz'

function shortId(length = 8) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let id = ''
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length]
  return id
}

/**
 * Upload rendered PNG blobs and create the share row.
 * Returns { id, url, images } where url is the public /s/<id> page.
 */
export async function createShare({ kind, blobs, caption = '' }) {
  if (!blobs?.length) throw new Error('Nothing to share')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  if (!isFounder(user)) throw new Error('Share links are founder-only')

  const id = shortId()
  const images = []

  for (let index = 0; index < blobs.length; index += 1) {
    const path = `${id}/${String(index + 1).padStart(2, '0')}.png`
    const { error } = await supabase.storage.from('shares').upload(path, blobs[index], {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    })
    if (error) throw error
    images.push(path)
  }

  const { error } = await supabase
    .from('shares')
    .insert({ id, user_id: user.id, kind, images, caption })
  if (error) throw error

  return { id, url: `${window.location.origin}/s/${id}`, images }
}
