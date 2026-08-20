import { createClient } from '@supabase/supabase-js'
import { buildHeadlinePrompt, MAX_ESSAY_WORDS } from './prompts/headline-generator.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODELS = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash']
const GEMINI_TIMEOUT_MS = 45000

export const config = { maxDuration: 60 }

function countWords(text) {
  return (text.trim().match(/\S+/g) || []).length
}

function cleanJsonText(raw) {
  const trimmed = raw.trim()
  const cleaned = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  return cleaned
}

async function callGemini(prompt, model) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      const status = response.status
      const retryable = status === 404 || status === 400 || status === 503 || status === 500 || status === 429
      return {
        error: `Gemini returned ${status}`,
        detail: detail.slice(0, 400),
        retryable,
      }
    }

    const data = await response.json()
    const rawText = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim()

    if (!rawText) {
      const finish = data?.candidates?.[0]?.finishReason || ''
      return {
        error:
          finish === 'MAX_TOKENS'
            ? 'The response was too long. Try a shorter draft.'
            : 'The model returned nothing for that text. Try again.',
        detail: finish || JSON.stringify(data?.promptFeedback || {}).slice(0, 200),
      }
    }

    try {
      const parsed = JSON.parse(cleanJsonText(rawText))
      const results = Array.isArray(parsed) ? parsed : (parsed.results || parsed.headlines || [])
      if (!results.length) {
        return { error: 'Could not extract headlines from the model response.' }
      }
      return { results }
    } catch {
      return { error: 'Failed to parse generated headlines JSON.' }
    }
  } catch (error) {
    return {
      error: error?.name === 'AbortError' ? 'Generation timed out' : 'Could not reach Gemini',
      detail: String(error?.message || error).slice(0, 200),
    }
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  if (!GEMINI_API_KEY || !SUPABASE_URL || !ANON_KEY) {
    res.status(500).json({ ok: false, error: 'Headline generation is not configured on this server.' })
    return
  }

  // 1) Validate the input
  const essay = typeof req.body === 'object' ? req.body?.essay : undefined
  if (!essay || typeof essay !== 'string' || !essay.trim()) {
    res.status(400).json({ ok: false, error: 'Paste your article or draft first.' })
    return
  }

  const isLink = /^(https?:\/\/[^\s]+)$/i.test(essay.trim())
  if (isLink) {
    res.status(400).json({
      ok: false,
      error: 'Please paste the text of your article or draft directly rather than a URL link.',
    })
    return
  }

  const words = countWords(essay)
  if (words > MAX_ESSAY_WORDS) {
    res.status(400).json({
      ok: false,
      error: `That is ${words.toLocaleString()} words. The limit is ${MAX_ESSAY_WORDS.toLocaleString()}.`,
    })
    return
  }

  // 2) Identify the caller from their Supabase access token
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ ok: false, error: 'Sign in to generate headlines.', reason: 'not_authenticated' })
    return
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    res.status(401).json({ ok: false, error: 'Your session expired. Sign in again.', reason: 'not_authenticated' })
    return
  }

  // 3) Spend quota before calling Gemini
  const { data: gate, error: gateError } = await supabase.rpc('record_generation')
  if (gateError) {
    res.status(500).json({ ok: false, error: 'Could not check your plan. Try again.' })
    return
  }
  if (!gate?.allowed) {
    res.status(402).json({
      ok: false,
      error: 'You have used your free AI generation. Upgrade for unlimited generations.',
      reason: 'generation_limit',
      plan: gate?.plan || 'free',
      used: gate?.used,
      limit: gate?.limit,
    })
    return
  }

  // 4) Call Gemini with prompt
  const prompt = buildHeadlinePrompt(essay)
  let lastError = null
  for (const model of MODELS) {
    const outcome = await callGemini(prompt, model)
    if (outcome.results) {
      res.setHeader('Content-Type', 'application/json')
      res.status(200).json({
        ok: true,
        results: outcome.results,
        remaining: gate.remaining,
        model,
      })
      return
    }

    lastError = outcome
    if (!outcome.retryable) break
  }

  console.error('All Gemini headline models failed:', lastError)
  res.status(502).json({
    ok: false,
    error: lastError?.error || 'AI headline generation failed. Try again in a moment.',
    detail: lastError?.detail,
  })
}
