import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import JSZip from 'jszip'
import { splitThread } from '../lib/carousel'
import { takeHandoffThread } from '../lib/threadGen'
import { drawSlide } from '../lib/carouselRender'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { getUsage, recordExport } from '../lib/entitlements'
import AuthModal from './AuthModal'
import UpgradeModal from './UpgradeModal'
import { PALETTES } from '../lib/profiles'

// Instagram-native square. Preview draws at this resolution and is scaled down
// with CSS; export renders at 2× for crisp PNGs.
const ASPECT = { width: 1080, height: 1080 }

// The interactive half of a free tool page: paste → live carousel preview →
// download. Client-only (canvas + auth), lazy-loaded by ToolPage so the heavy
// deps (JSZip, Supabase) never touch the marketing bundle. The split/render and
// the sign-in + quota gate are the SAME code paths the studio uses, so what you
// get here is identical to /app.
export default function CarouselTool({ config }) {
  const { user } = useAuth()
  // A thread handed over from the AI generator wins over the demo text. Read
  // once (takeHandoffThread clears it) so a refresh doesn't resurrect it.
  const [text, setText] = useState(() => takeHandoffThread() || config.demo || '')
  const [theme, setTheme] = useState('dark')
  const [bgColor, setBgColor] = useState('#0A0A0A')
  const [textColor, setTextColor] = useState('#F5F5F1')
  const [username, setUsername] = useState('')
  const [slideIndex, setSlideIndex] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [notice, setNotice] = useState('')
  const [authModal, setAuthModal] = useState({ open: false, reason: '' })
  const [upgradeModal, setUpgradeModal] = useState({ open: false, reason: '' })
  const canvasRef = useRef(null)

  const { slides } = useMemo(() => splitThread(text), [text])
  const total = slides.length
  // Derived clamp — no effect needed. All rendering + nav use safeIndex, so a
  // shrinking thread can never leave us pointing past the last slide.
  const safeIndex = Math.min(slideIndex, Math.max(0, total - 1))

  // Live preview — the exact drawSlide the export uses (watermark off here).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!total) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }
    drawSlide(ctx, {
      text: slides[safeIndex],
      theme,
      username,
      avatar: null,
      index: safeIndex,
      total,
      width: canvas.width,
      height: canvas.height,
      watermark: false,
      bgColor,
      textColor,
    })
  }, [slides, safeIndex, total, theme, username, bgColor, textColor])

  async function buildZip(withWatermark) {
    const width = ASPECT.width * 2
    const height = ASPECT.height * 2
    const zip = new JSZip()
    for (let index = 0; index < total; index += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      drawSlide(canvas.getContext('2d'), {
        text: slides[index],
        theme,
        username,
        avatar: null,
        index,
        total,
        width,
        height,
        watermark: withWatermark,
        bgColor,
        textColor,
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      zip.file(`slide-${String(index + 1).padStart(2, '0')}.png`, blob)
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(zipBlob)
    anchor.download = 'notes2pic-carousel.zip'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  async function download() {
    if (!total) {
      setNotice('Paste a thread first — your slides will appear on the right.')
      return
    }
    if (!isSupabaseConfigured) {
      setNotice('Sign-in isn’t configured in this environment.')
      return
    }
    // Gate 1: sign in to download. Preview stays free and account-less.
    if (!user) {
      setAuthModal({
        open: true,
        reason: 'Sign in to download your carousel. Editing and preview stay free.',
      })
      return
    }
    setIsExporting(true)
    try {
      // Pre-flight: read-only check so users out of credits see the upgrade
      // prompt immediately, and we know the watermark decision before rendering.
      // The credit itself is consumed only AFTER successful generation.
      const usage = await getUsage()
      if (!usage?.authenticated) {
        setAuthModal({ open: true, reason: 'Please sign in again to download.' })
        return
      }
      const userIsPaid = usage.paid === true
      if (!userIsPaid && usage.remaining <= 0) {
        setUpgradeModal({
          open: true,
          reason: 'You’ve used your 3 free exports this month. Upgrade for unlimited, watermark-free exports.',
        })
        return
      }
      if (!userIsPaid && usage.carouselRemaining <= 0) {
        setUpgradeModal({
          open: true,
          reason: 'Your free plan includes one carousel per month. Upgrade for unlimited carousels.',
        })
        return
      }

      // Step 1: generate + download the zip (no credit consumed yet).
      await buildZip(!userIsPaid)

      // Step 2: consume the credit AFTER successful generation.
      const gate = await recordExport('carousel')
      if (!gate?.allowed) {
        if (gate?.reason === 'limit_reached') {
          setUpgradeModal({
            open: true,
            reason: 'You’ve used your 3 free exports this month. Upgrade for unlimited, watermark-free exports.',
          })
        } else if (gate?.reason === 'carousel_limit') {
          setUpgradeModal({
            open: true,
            reason: 'Your free plan includes one carousel per month. Upgrade for unlimited carousels.',
          })
        } else {
          setAuthModal({ open: true, reason: 'Please sign in again to download.' })
        }
        return
      }

      getUsage().catch(() => {})
      setNotice(
        gate.remaining === null || gate.remaining === undefined
          ? `Downloaded your ${total}-slide carousel (.zip).`
          : `Downloaded your ${total}-slide carousel. ${gate.remaining} free export${gate.remaining === 1 ? '' : 's'} left this month.`,
      )
    } catch {
      setNotice('Download failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="tool">
      <div className="tool-input">
        <label className="tool-label" htmlFor="tool-thread">
          Your thread
        </label>
        <textarea
          id="tool-thread"
          className="tool-textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste your X / Twitter thread here…"
          spellCheck={false}
        />
        <div className="tool-controls" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 200px' }}>
              Style & Brand Colors
              <div className="brand-palette-options" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {PALETTES.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className={`color-swatch-btn ${theme === p.name ? 'active' : ''}`}
                    style={{
                      background: `linear-gradient(135deg, ${p.bg} 50%, ${p.text} 50%)`,
                    }}
                    title={p.label}
                    onClick={() => {
                      setTheme(p.name)
                      setBgColor(p.bg)
                      setTextColor(p.text)
                    }}
                  />
                ))}
                <button
                  type="button"
                  className={`color-swatch-btn custom-swatch-btn ${theme === 'custom' ? 'active' : ''}`}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 30%, #e2e8f0 30%, #e2e8f0 70%, #000000 70%)',
                  }}
                  title="Custom Colors"
                  onClick={() => setTheme('custom')}
                >
                  🎨
                </button>
              </div>
            </label>
            <label style={{ flex: '1 1 120px' }}>
              Handle <span className="tool-optional">(optional)</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="@you"
              />
            </label>
          </div>

          {theme === 'custom' && (
            <div className="custom-color-inputs" style={{ display: 'flex', gap: '16px' }}>
              <label className="field" style={{ flex: 1, margin: 0 }}>
                <span style={{ fontSize: '0.85rem' }}>Background</span>
                <input
                  type="color"
                  value={bgColor || '#0A0A0A'}
                  style={{ height: '38px', padding: '2px', cursor: 'pointer' }}
                  onChange={(event) => setBgColor(event.target.value)}
                />
              </label>
              <label className="field" style={{ flex: 1, margin: 0 }}>
                <span style={{ fontSize: '0.85rem' }}>Text Color</span>
                <input
                  type="color"
                  value={textColor || '#F5F5F1'}
                  style={{ height: '38px', padding: '2px', cursor: 'pointer' }}
                  onChange={(event) => setTextColor(event.target.value)}
                />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="tool-count">
              {total} slide{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="tool-preview">
        <canvas
          ref={canvasRef}
          width={ASPECT.width}
          height={ASPECT.height}
          className="tool-canvas"
          aria-label="Carousel slide preview"
        />
        <div className="tool-nav">
          <button
            type="button"
            onClick={() => setSlideIndex(Math.max(0, safeIndex - 1))}
            disabled={safeIndex <= 0}
            aria-label="Previous slide"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="tool-nav-count">
            {total ? safeIndex + 1 : 0} / {total}
          </span>
          <button
            type="button"
            onClick={() => setSlideIndex(Math.min(total - 1, safeIndex + 1))}
            disabled={safeIndex >= total - 1}
            aria-label="Next slide"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="btn-primary block" onClick={download} disabled={isExporting}>
          <Download aria-hidden="true" />
          {isExporting ? 'Preparing…' : `Download ${total || ''} slide${total === 1 ? '' : 's'} (.zip)`}
        </button>
        {notice ? <p className="tool-notice">{notice}</p> : null}
      </div>

      <AuthModal
        open={authModal.open}
        reason={authModal.reason}
        // Return here after Google OAuth so they can download without a detour
        // to the studio. (The path must be in Supabase's redirect allow-list.)
        redirectTo={typeof window !== 'undefined' ? window.location.pathname : '/app'}
        onClose={() => setAuthModal({ open: false, reason: '' })}
      />
      <UpgradeModal
        open={upgradeModal.open}
        email={user?.email}
        reason={upgradeModal.reason}
        onClose={() => setUpgradeModal({ open: false, reason: '' })}
      />
    </div>
  )
}
