import { supabase } from './supabaseClient'
import { HANDOFF_ESSAY_KEY } from './threadGen'

export const MAX_ESSAY_WORDS = 10000

export function countWords(text) {
  return ((text || '').trim().match(/\S+/g) || []).length
}

export function handoffEssayToThread(essay) {
  try {
    sessionStorage.setItem(HANDOFF_ESSAY_KEY, essay.trim())
  } catch {
    // sessionStorage fallback
  }
}

/**
 * Generate viral creator headlines from an article or draft.
 * Returns { ok: true, results, remaining } or { ok: false, reason, error }.
 */
export async function generateHeadlines(essay) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return { ok: false, reason: 'not_authenticated', error: 'Sign in to generate headlines.' }

  const response = await fetch('/api/generate-headline', {
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
  return { ok: true, results: payload.results, remaining: payload.remaining }
}
