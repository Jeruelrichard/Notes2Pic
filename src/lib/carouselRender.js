// Single source of truth for how a carousel slide looks. Used by BOTH the live
// preview canvas and the export pipeline, so what you see is what you export.
//
// This is the file to retune when matching specific reference designs — the app
// wiring around it (splitting, editing, export) does not change.

const FONT_STACK = '"Segoe UI", Inter, system-ui, -apple-system, sans-serif'

function wrapLines(ctx, text, maxWidth) {
  const lines = []
  for (const hardLine of text.split('\n')) {
    if (hardLine.trim() === '') {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of hardLine.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test
      } else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

export function drawSlide(ctx, opts) {
  const {
    text = '',
    theme = 'dark',
    username = '',
    avatar = null, // HTMLImageElement or null
    index = 0,
    total = 1,
    width,
    height,
    watermark = false,
  } = opts

  const isDark = theme === 'dark'
  const bg = isDark ? '#0a0a0a' : '#faf9f6'
  const fg = isDark ? '#f5f5f1' : '#141414'
  const muted = isDark ? '#8a8a8a' : '#8a8a84'

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  const margin = width * 0.1
  const contentW = width - margin * 2
  const contentTop = height * 0.13
  const contentBottom = height * 0.86
  const contentH = contentBottom - contentTop

  // Auto-fit the font so the whole slide's text fills the content box nicely.
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  let fontSize = Math.round(width * 0.06)
  const minFont = Math.round(width * 0.03)
  let lineHeight = Math.round(fontSize * 1.34)
  let lines = []
  while (fontSize >= minFont) {
    ctx.font = `600 ${fontSize}px ${FONT_STACK}`
    lines = wrapLines(ctx, text, contentW)
    lineHeight = Math.round(fontSize * 1.34)
    if (lines.length * lineHeight <= contentH) break
    fontSize -= 2
  }

  ctx.fillStyle = fg
  ctx.font = `600 ${fontSize}px ${FONT_STACK}`
  const blockH = lines.length * lineHeight
  let y = contentTop + Math.max(0, (contentH - blockH) / 2)
  for (const line of lines) {
    ctx.fillText(line, margin, y)
    y += lineHeight
  }

  // Footer: avatar + @handle on the left, page indicator on the right.
  const footerY = height * 0.93
  const smallFont = Math.round(width * 0.026)
  ctx.textBaseline = 'middle'

  let handleX = margin
  const avatarR = width * 0.028
  if (avatar) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(margin + avatarR, footerY, avatarR, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(avatar, margin, footerY - avatarR, avatarR * 2, avatarR * 2)
    ctx.restore()
    handleX = margin + avatarR * 2 + width * 0.022
  }

  if (username) {
    ctx.fillStyle = muted
    ctx.font = `600 ${smallFont}px ${FONT_STACK}`
    ctx.textAlign = 'left'
    ctx.fillText(username.startsWith('@') ? username : `@${username}`, handleX, footerY)
  }

  if (total > 1) {
    ctx.fillStyle = muted
    ctx.font = `600 ${smallFont}px ${FONT_STACK}`
    ctx.textAlign = 'right'
    ctx.fillText(`${index + 1} / ${total}`, width - margin, footerY)
  }

  if (watermark) {
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
    ctx.font = `600 ${Math.round(width * 0.02)}px ${FONT_STACK}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('made with Notes2Pics', width / 2, height - height * 0.035)
  }

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}
