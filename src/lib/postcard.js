// Shared helpers for the short-post card (the "looks like a real tweet" card).
// Extracted from App.jsx so the studio AND the free tool pages render the card
// from one source — what you see in either place is what you export.

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function getShortSourceKey(source) {
  if (source === 'Threads') return 'threads'
  if (source === 'X') return 'x'
  return 'substack'
}

export function getShortExportBackground(sourceKey, theme) {
  if (sourceKey === 'substack') return '#ff671f'
  if (theme === 'light') return '#ffffff'
  return sourceKey === 'threads' ? '#181818' : '#050505'
}

export function formatBadgeDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatTimestamp(date) {
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${time} · ${day}`
}

export function getShortPostTextStyle(text, aspect) {
  const explicitLines = text.split('\n').length
  const visualLineEstimate = Math.ceil(text.length / (aspect === 'square' ? 25 : 31))
  const estimatedLines = Math.max(explicitLines, visualLineEstimate)
  const baseSize = aspect === 'square' ? 24 : 28
  const sizeByCharacters = text.length > 210 ? baseSize - 4 : text.length > 150 ? baseSize - 2 : baseSize
  const sizeByLines = estimatedLines > 12 ? 15 : estimatedLines > 9 ? 17 : estimatedLines > 7 ? 19 : sizeByCharacters

  return {
    fontSize: `${Math.max(13, Math.min(sizeByCharacters, sizeByLines))}px`,
  }
}
