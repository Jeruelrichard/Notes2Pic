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
 * Generate viral creator headlines from an article or draft (100% free forever).
 * Returns { ok: true, results } or { ok: false, error }.
 */
export async function generateHeadlines(essay) {
  const response = await fetch('/api/generate-headline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ essay }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      error: payload?.error || 'Generation failed. Try again in a moment.',
    }
  }
  return { ok: true, results: payload.results }
}
