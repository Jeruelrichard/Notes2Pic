import { createClient } from '@supabase/supabase-js'
import { buildThreadPrompt, MAX_ESSAY_WORDS } from './prompts/thread-generator.js'

// Essay → thread, via Gemini. Unlike the other tools, every call here costs real
// money, so this is the one feature that is metered rather than free-to-preview.
//
// ORDER MATTERS: we validate, authenticate and spend the user's quota BEFORE
// calling Gemini. The quota lives in Postgres (record_generation), not the
// client, so it can't be bypassed by editing JS — and a user who is out of
// credit never triggers a paid API call.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// `gemini-flash-latest` is an ALIAS that always points at the current Flash
// model. Deliberate choice: a pinned id (we shipped `gemini-2.5-flash`) got
// retired by Google and returned 404 "no longer available to new users",
// taking the feature down. An alias can shift behaviour under us, but the
// prompt is explicit enough to survive a bump, and a silently-changed model is
// a far gentler failure than a hard outage.
// The fallbacks are pinned, working models probed with this key — if the alias
// ever fails we degrade instead of dying. See scripts/gemini-check.mjs.
const MODELS = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash']
const GEMINI_TIMEOUT_MS = 45000

// Vercel kills a serverless function at 10s by default. A real generation
// measured ~13s on a short essay (longer ones take more), so without this the
// function is terminated mid-call and the user sees a gateway error even when
// Gemini is working fine. Our own 45s abort sits safely under this ceiling.
export const config = { maxDuration: 60 }

function countWords(text) {
  return (text.trim().match(/\S+/g) || []).length
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
          // The prompt is self-contained: it wraps the essay in its own
          // ESSAY START/END delimiters, so it goes as one user message rather
          // than a system_instruction + separate essay.
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            // 2.5 Flash reasons before answering and those tokens count against
            // this budget, so it's set well above the ~1.2k the thread itself
            // needs. Too low and the response comes back empty with
            // finishReason MAX_TOKENS.
            maxOutputTokens: 8192,
          },
        }),
      },
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      // 404/400 = this model id is gone or unusable → worth trying the next one.
      return {
        error: `Gemini returned ${response.status}`,
        detail: detail.slice(0, 400),
        retryable: response.status === 404 || response.status === 400,
      }
    }

    const data = await response.json()
    const thread = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim()

    if (!thread) {
      // Empty candidate: usually a safety block, or reasoning ate the budget.
      const finish = data?.candidates?.[0]?.finishReason || ''
      return {
        error:
          finish === 'MAX_TOKENS'
            ? 'That essay produced too long a response. Try a shorter essay.'
            : 'The model returned nothing for that essay. Try again, or trim it a little.',
        detail: finish || JSON.stringify(data?.promptFeedback || {}).slice(0, 200),
      }
    }
    return { thread }
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
    res.status(500).json({ ok: false, error: 'Thread generation is not configured on this server.' })
    return
  }

  // 1) Validate the input before doing anything expensive.
  const essay = typeof req.body === 'object' ? req.body?.essay : undefined
  if (!essay || typeof essay !== 'string' || !essay.trim()) {
    res.status(400).json({ ok: false, error: 'Paste an essay first.' })
    return
  }
  const words = countWords(essay)
  if (words > MAX_ESSAY_WORDS) {
    res.status(400).json({
      ok: false,
      error: `That's ${words.toLocaleString()} words. The limit is ${MAX_ESSAY_WORDS.toLocaleString()}.`,
    })
    return
  }

  // 2) Identify the caller from their Supabase access token. Using the anon key
  // + the user's bearer token means auth.uid() resolves inside the RPC, so the
  // quota is counted against the right account.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ ok: false, error: 'Sign in to generate a thread.', reason: 'not_authenticated' })
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

  // 3) Spend the quota BEFORE calling Gemini.
  const { data: gate, error: gateError } = await supabase.rpc('record_generation')
  if (gateError) {
    res.status(500).json({ ok: false, error: 'Could not check your plan. Try again.' })
    return
  }
  if (!gate?.allowed) {
    res.status(402).json({
      ok: false,
      reason: gate?.reason || 'generation_limit',
      error:
        gate?.reason === 'not_authenticated'
          ? 'Sign in to generate a thread.'
          : 'You have used your free AI thread generation. Upgrade for unlimited generations.',
    })
    return
  }

  // 4) Only now does this cost money. Walk the model list so a retired model id
  // degrades to the next one instead of taking the feature down.
  const prompt = buildThreadPrompt(essay)
  let result
  for (const model of MODELS) {
    result = await callGemini(prompt, model)
    if (!result.error || !result.retryable) break
  }
  if (result.error) {
    res.status(502).json({ ok: false, error: result.error, ...(req.query?.debug ? { detail: result.detail } : {}) })
    return
  }

  res.status(200).json({ ok: true, thread: result.thread, remaining: gate.remaining ?? null })
}
