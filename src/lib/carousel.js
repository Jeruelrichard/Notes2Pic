// Soft target: what auto-splitting aims for on unnumbered text.
export const SLIDE_MAX_CHARS = 300
// Hard ceiling: what a single slide may actually hold. A pre-numbered thread
// wins over the soft target (1 number = 1 slide), so a long tweet stays whole
// and drawSlide auto-shrinks the font to fit. Beyond this the text would be
// too small to read, so the editor clamps here instead.
export const SLIDE_HARD_MAX = 1000

// --- Pre-numbered thread detection -------------------------------------------
// If the pasted text is already a numbered thread, the author has ALREADY made
// the split decisions. Re-splitting it by character count throws that away, so
// we detect the numbering and use it as the authoritative slide boundaries.

// Ordered most-specific first. `style` groups markers of the same shape so a
// run only ever chains like-with-like. `kw` marks the keyword form (its number
// is in group 2, and its style is refined per-keyword below). The keyword form
// also swallows a trailing "/ 10" so "Tweet 5 / 10" leaves no stray slash.
const MARKER_PATTERNS = [
  { style: 'fraction', re: /^\s*(\d{1,3})\s*\/\s*\d{1,3}\s*[-–—.:)]?\s*/ }, //   1/11
  { style: 'slash', re: /^\s*(\d{1,3})\s*\/\s*[-–—.:)]?\s*/ }, //                1/
  { style: 'paren', re: /^\s*[([](\d{1,3})[)\]]\s*[-–—.:]?\s*/ }, //            (1), [1]
  { style: 'kw', kw: true, re: /^\s*(tweet|part|tip|step)\s*#?\s*(\d{1,3})\s*(?:\/\s*\d{0,3}\s*)?[.):\-–—]?\s*/i }, // Tweet 1, Tweet 5 / 10
  { style: 'dotted', re: /^\s*(\d{1,3})\s*[.):\-–—]\s+/ }, //                    1. 1) 1:
  { style: 'bare', re: /^\s*(\d{1,3})\s*$/ }, //                                a lone "1"
  { style: 'inline', re: /^\s*(\d{1,3})\s+(?=\S)/ }, //                          1 text
]

// Numbers above this are years/quantities ("2026 was...", "300 subscribers"),
// not thread markers.
const MAX_MARKER = 199

function parseMarker(line) {
  for (const { style, re, kw } of MARKER_PATTERNS) {
    const match = re.exec(line)
    if (!match) continue
    const num = Number(kw ? match[2] : match[1])
    if (!Number.isInteger(num) || num < 1 || num > MAX_MARKER) continue
    // Keep keyword families distinct: "Tweet N" markers must not chain with
    // "Step N" numbers that live inside a tweet's body.
    const finalStyle = kw ? `kw:${match[1].toLowerCase()}` : style
    return { num, rest: line.slice(match[0].length), style: finalStyle }
  }
  return null
}

// Find the longest run of markers that increments by exactly 1, considering
// each marker STYLE independently. Two guards matter here:
//   1. Same-style-only chaining stops in-body numbering ("Step 1/2/3") from
//      poisoning the real "Tweet 1..10" run.
//   2. Requiring a real +1 sequence keeps "5 reasons why" or "2026 was..." from
//      being mistaken for a marker — a stray number never forms a run.
function findMarkerRun(lines) {
  const byStyle = new Map()
  lines.forEach((line, index) => {
    const marker = parseMarker(line)
    if (!marker) return
    if (!byStyle.has(marker.style)) byStyle.set(marker.style, [])
    byStyle.get(marker.style).push({ index, ...marker })
  })

  let best = []
  for (const markers of byStyle.values()) {
    let run = []
    for (const marker of markers) {
      const previous = run[run.length - 1]
      if (previous && marker.num === previous.num + 1) run.push(marker)
      else run = [marker]
      if (run.length > best.length) best = [...run]
    }
  }

  // Threads number from 1 ("1/11") or from the second tweet ("2/13"). Anything
  // starting higher isn't a thread's numbering.
  if (best.length < 2 || best[0].num > 2) return null
  return best
}

// Group the text on its own numbering. Everything before the first marker is the
// hook; each marker owns every line until the next marker (blank lines included,
// so a multi-paragraph tweet stays one slide).
function splitPreNumbered(lines, run) {
  const slides = []

  const preamble = lines.slice(0, run[0].index).join('\n').trim()
  if (preamble) slides.push(preamble)

  run.forEach((marker, i) => {
    const end = i + 1 < run.length ? run[i + 1].index : lines.length
    const body = lines.slice(marker.index + 1, end).join('\n')
    // The marker itself is dropped: drawSlide already prints "3 / 11" in the
    // footer, so keeping "3/11" in the text would just duplicate it.
    const text = [marker.rest, body].join('\n').trim()
    if (text) slides.push(text)
  })

  return slides
}

// --- Unnumbered text ---------------------------------------------------------

const BULLET_RE = /^\s*(?:[-*•·–—]|\d{1,2}[.)])\s+\S/

function isList(block) {
  const lines = block.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return false
  const bulleted = lines.filter((line) => BULLET_RE.test(line)).length
  return bulleted >= Math.max(2, Math.ceil(lines.length * 0.6))
}

// Pack whole list items; never break a list across the middle of an item.
function splitList(block, max) {
  const slides = []
  let current = ''
  for (const line of block.split('\n')) {
    const candidate = current ? `${current}\n${line}` : line
    if (candidate.length <= max || !current) {
      current = candidate
    } else {
      slides.push(current.trim())
      current = line
    }
  }
  if (current.trim()) slides.push(current.trim())
  return slides.flatMap((slide) => (slide.length > max ? balancedSplit(slide, max) : slide))
}

function wordSplit(text, max) {
  const pieces = []
  let line = ''
  for (const word of text.split(/(\s+)/)) {
    if ((line + word).length <= max || !line.trim()) {
      line += word
    } else {
      pieces.push(line.trim())
      line = word.trimStart()
    }
  }
  if (line.trim()) pieces.push(line.trim())
  return pieces
}

// Split into evenly-sized pieces at sentence boundaries. Aiming at an even
// target (rather than greedily filling to `max`) is what stops the old
// behaviour where 310 chars became a 300-char slide plus a 10-char orphan.
function balancedSplit(text, max) {
  if (text.length <= max) return [text]

  const parts = Math.ceil(text.length / max)
  const target = Math.ceil(text.length / parts)
  const units = text.match(/[^.!?\n]+[.!?]+["')\]]*\s*|[^.!?\n]+\n*|\n+/g) || [text]

  const pieces = []
  let current = ''
  for (const unit of units) {
    if (!current) {
      current = unit
    } else if ((current + unit).length <= target) {
      current += unit
    } else {
      pieces.push(current)
      current = unit
    }
    if (current.length > max) {
      // A single sentence longer than the cap — fall back to words.
      const wordPieces = wordSplit(current, max)
      current = wordPieces.pop() || ''
      pieces.push(...wordPieces)
    }
  }
  if (current.trim()) pieces.push(current)

  return pieces.map((piece) => piece.trim()).filter(Boolean)
}

// --- Public API --------------------------------------------------------------

/**
 * Break a post/thread into carousel slides.
 * Returns { slides, numbered, count } — `numbered` is true when the text was
 * already a numbered thread and we honoured its own boundaries.
 */
export function splitThread(text, max = SLIDE_MAX_CHARS) {
  const normalized = (text || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return { slides: [], numbered: false, count: 0 }

  const lines = normalized.split('\n')
  const run = findMarkerRun(lines)
  if (run) {
    // The author already split this. Honour it exactly: no re-splitting, even
    // when a tweet runs past the soft target — drawSlide shrinks to fit.
    const slides = splitPreNumbered(lines, run).map((slide) => slide.slice(0, SLIDE_HARD_MAX))
    if (slides.length) return { slides, numbered: true, count: slides.length }
  }

  // Otherwise respect the author's natural breaks, then subdivide only what
  // overflows — evenly, and without shredding lists.
  let blocks = normalized.split(/\n\s*\n+/)
  if (blocks.length === 1 && normalized.includes('\n')) {
    blocks = normalized.split(/\n+/)
  }

  const slides = []
  for (const raw of blocks) {
    const block = raw.trim()
    if (!block) continue
    if (block.length <= max) {
      slides.push(block)
    } else if (isList(block)) {
      slides.push(...splitList(block, max))
    } else {
      slides.push(...balancedSplit(block, max))
    }
  }

  return { slides, numbered: false, count: slides.length }
}

export function splitIntoSlides(text, max = SLIDE_MAX_CHARS) {
  return splitThread(text, max).slides
}
