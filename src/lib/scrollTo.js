// Smoothly scroll a hash target into view. Several things this handles:
//   1. The landing's hero images/fonts keep growing the page for a beat after
//      mount, so a one-shot scroll fired too early lands at the wrong spot. We
//      poll until the target's position is stable (or a ~1.5s cap) first.
//   2. For #pricing specifically we frame the pricing CARDS (.pricing-grid),
//      not the section heading above them, centred in the viewport.
//   3. We animate the scroll ourselves with rAF instead of the native
//      `behavior:'smooth'`, which is inconsistent (and a no-op in some
//      environments). Reduced-motion users get an instant jump.
// Always self-terminates so a caller that doesn't cancel it can't leak a timer.

function destForCenter(target) {
  const rect = target.getBoundingClientRect()
  const absTop = rect.top + window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  return Math.max(0, Math.min(absTop - (window.innerHeight - rect.height) / 2, max))
}

function animateScroll(destY, duration = 520) {
  const startY = window.scrollY
  const dist = destY - startY
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || Math.abs(dist) < 2) {
    window.scrollTo(0, destY)
    return
  }
  // Driven by setTimeout rather than requestAnimationFrame: rAF is throttled to
  // zero in some environments (headless/background tabs), which would freeze the
  // animation; setTimeout keeps firing. ~16ms ≈ 60fps in a real browser.
  const start = performance.now()
  const ease = (t) => 1 - Math.pow(1 - t, 3) // easeOutCubic
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / duration)
    window.scrollTo(0, Math.round(startY + dist * ease(t)))
    if (t < 1) setTimeout(step, 16)
  }
  step()
}

export function scrollToHashTarget(id, { smooth = true } = {}) {
  if (!id) return () => {}
  let cancelled = false
  let lastTop = -1
  let stable = 0
  let elapsed = 0

  const targetIn = (section) => section.querySelector('.pricing-grid') || section
  const go = (section) => {
    if (smooth) animateScroll(destForCenter(targetIn(section)))
    else targetIn(section).scrollIntoView({ behavior: 'auto', block: 'center' })
  }

  const tick = () => {
    if (cancelled) return
    const section = document.getElementById(id)
    if (section) {
      const top = Math.round(targetIn(section).getBoundingClientRect().top + window.scrollY)
      if (top === lastTop) stable += 1
      else {
        stable = 0
        lastTop = top
      }
      if (stable >= 3) {
        go(section)
        return
      }
    }
    elapsed += 80
    if (elapsed >= 1500) {
      if (section) go(section)
      return
    }
    setTimeout(tick, 80)
  }

  setTimeout(tick, 50)
  return () => {
    cancelled = true
  }
}
