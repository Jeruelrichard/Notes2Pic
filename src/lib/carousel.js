export const SLIDE_MAX_CHARS = 300

// Strip a leading thread marker like "1/", "2.", "3)", "1/7 ", "🧵" from a block.
function stripThreadMarker(block) {
  return block
    .replace(/^\s*🧵\s*/u, '')
    .replace(/^\s*\d+\s*[/.)]\s*(\d+\s*)?/, '')
    .trimStart()
}

// Split a block longer than maxChars into <=maxChars pieces, preferring sentence
// boundaries, falling back to word boundaries. Never splits mid-word.
function splitLongBlock(block, maxChars) {
  const sentences = block.match(/[^.!?\n]+[.!?]*\s*/g) || [block]
  const pieces = []
  let current = ''

  const flush = () => {
    if (current.trim()) pieces.push(current.trim())
    current = ''
  }

  for (const sentence of sentences) {
    if ((current + sentence).trim().length <= maxChars) {
      current += sentence
      continue
    }

    flush()

    if (sentence.trim().length <= maxChars) {
      current = sentence
      continue
    }

    // A single sentence exceeds the limit — pack it word by word.
    let line = ''
    for (const word of sentence.split(/(\s+)/)) {
      if ((line + word).length <= maxChars) {
        line += word
      } else {
        if (line.trim()) pieces.push(line.trim())
        line = word.trimStart()
      }
    }
    current = line
  }

  flush()
  return pieces
}

// Break a long post/thread into carousel slides. Respects the author's natural
// breaks first (blank-line paragraphs, or single lines if no blank lines exist),
// only subdividing a block when it exceeds maxChars.
export function splitIntoSlides(text, maxChars = SLIDE_MAX_CHARS) {
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return []

  // Prefer blank-line paragraph breaks; if there are none, fall back to single lines.
  let blocks = normalized.split(/\n\s*\n+/)
  if (blocks.length === 1 && normalized.includes('\n')) {
    blocks = normalized.split(/\n+/)
  }

  const slides = []
  for (const raw of blocks) {
    const block = stripThreadMarker(raw.trim())
    if (!block) continue
    if (block.length <= maxChars) {
      slides.push(block)
    } else {
      slides.push(...splitLongBlock(block, maxChars))
    }
  }
  return slides
}
