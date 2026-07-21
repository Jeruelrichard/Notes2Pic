// Diagnostic: find a Gemini model this key can actually generate with.
// Run:  node scripts/gemini-check.mjs
// Reads GEMINI_API_KEY from .env.local. Never prints the key itself.
import { readFile } from 'node:fs/promises'

const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '')
const key = (env.match(/^GEMINI_API_KEY=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '')
if (!key) {
  console.error('❌ GEMINI_API_KEY not found in .env.local')
  process.exit(1)
}

const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
  headers: { 'x-goog-api-key': key },
})
const { models = [] } = await listRes.json()
const usable = models
  .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
  .map((m) => m.name.replace('models/', ''))

console.log(`--- ALL ${usable.length} models supporting generateContent ---`)
usable.forEach((n) => console.log('  ', n))

// Text-generation candidates only: drop tts / image / audio / embedding / vision-specialist.
const EXCLUDE = /tts|image|audio|embedding|computer-use|vision|learnlm|gemma/i
const candidates = usable
  .filter((n) => !EXCLUDE.test(n))
  .sort((a, b) => {
    const score = (n) =>
      (/latest/.test(n) ? 100 : 0) +
      (/flash/.test(n) ? 50 : 0) +          // flash = cheap + fast, our priority
      (/lite/.test(n) ? -5 : 0) +
      (parseFloat((n.match(/(\d+(?:\.\d+)?)/) || [])[1] || 0) * 10) -
      (/preview|exp/.test(n) ? 20 : 0)      // prefer stable over preview
    return score(b) - score(a)
  })
  .slice(0, 8)

console.log(`\n--- probing ${candidates.length} text candidates (best first) ---`)
const working = []
for (const model of candidates) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
  )
  if (res.ok) {
    const d = await res.json()
    const txt = (d?.candidates?.[0]?.content?.parts || []).map((p) => p.text).join('').trim()
    console.log(`  ✅ ${model}  →  ${JSON.stringify(txt.slice(0, 20))}`)
    working.push(model)
  } else {
    const msg = JSON.parse(await res.text().catch(() => '{}'))?.error?.message || ''
    console.log(`  ❌ ${model}  (${res.status}) ${msg.slice(0, 70)}`)
  }
}

console.log(working.length ? `\n🎉 USE THIS: ${working[0]}` : '\n⚠️  none of the candidates worked')
