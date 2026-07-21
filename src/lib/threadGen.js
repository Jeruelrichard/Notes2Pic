import { supabase } from './supabaseClient'

// Shared by the free tool page and the studio's carousel-mode AI panel, so both
// hit the same endpoint, the same quota and the same limits.

// Keep in sync with MAX_ESSAY_WORDS in api/prompts/thread-generator.js.
export const MAX_ESSAY_WORDS = 10000

// Where a generated thread is parked when handing off to the carousel tool.
// sessionStorage rather than a query string: a thread is far too long for a URL.
export const HANDOFF_KEY = 'n2p.generatedThread'

export function countWords(text) {
  return ((text || '').trim().match(/\S+/g) || []).length
}

// Read the handed-off thread exactly once, so a refresh doesn't resurrect it.
export function takeHandoffThread() {
  try {
    const value = sessionStorage.getItem(HANDOFF_KEY)
    if (value) sessionStorage.removeItem(HANDOFF_KEY)
    return value || ''
  } catch {
    return ''
  }
}

/**
 * Generate a thread from an essay.
 * Returns { ok: true, thread, remaining } or { ok: false, reason, error }.
 * The quota is enforced server-side — `reason` is 'generation_limit' or
 * 'not_authenticated' when the server refuses.
 */
export async function generateThread(essay) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return { ok: false, reason: 'not_authenticated', error: 'Sign in to generate a thread.' }

  const response = await fetch('/api/generate-thread', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ essay }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      reason: payload?.reason,
      error: payload?.error || 'Generation failed. Try again in a moment.',
    }
  }
  return { ok: true, thread: payload.thread, remaining: payload.remaining }
}
