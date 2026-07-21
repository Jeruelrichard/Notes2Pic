import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Link2, Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import { recordExport } from '../lib/entitlements'
import { isFounder } from '../lib/shares'
import {
  initials,
  formatBadgeDate,
  formatTimestamp,
  getShortExportBackground,
} from '../lib/postcard'
import ShortSourcePreview from './ShortSourcePreview'
import AuthModal from './AuthModal'
import UpgradeModal from './UpgradeModal'

// Stage size in CSS px, exported at pixelRatio 2 → a 1080×1080 PNG. This MUST
// match the studio's 540 (see `aspects` in App.jsx): the card is capped at
// max-width 450px, so rendering the stage at 1080 would leave the card filling
// only ~41% of the frame instead of ~83%.
const SIZE = 540
// Canvas grows for tall content (portrait photos, long text) rather than
// cropping. 960 = a 1080x1920 export, the tallest Instagram accepts.
const MIN_STAGE_H = 540
const MAX_STAGE_H = 960
const EXPORT_TIMEOUT_MS = 15000

const EMPTY = { name: '', username: '', avatar: '', text: '', date: '' }

// Tweets run far longer than the studio's short-post format, whose sizing floors
// at 13px — past ~300 chars the text overflowed the card and got clipped by the
// stage's overflow:hidden. This ladder keeps shrinking so the WHOLE tweet fits.
// Deliberately separate from getShortPostTextStyle so the studio is unaffected.
function getTweetTextStyle(text, hasPhoto) {
  // A photo eats roughly a third of the card, so start a tier lower.
  const length = hasPhoto ? text.length + 320 : text.length
  const estimatedLines = Math.max(text.split('\n').length, Math.ceil(length / 26))
  let size = 24
  if (length > 900 || estimatedLines > 34) size = 9
  else if (length > 700 || estimatedLines > 28) size = 10.5
  else if (length > 520 || estimatedLines > 22) size = 12
  else if (length > 380 || estimatedLines > 17) size = 14
  else if (length > 260 || estimatedLines > 13) size = 17
  else if (length > 150 || estimatedLines > 9) size = 20
  return { fontSize: `${size}px`, lineHeight: 1.32 }
}

// Paste a tweet link → we fetch the post server-side (/api/tweet) → render it
// through the SAME card the studio uses → export via the same html-to-image
// pipeline, gated by the same sign-in + quota rules.
export default function TweetScreenshotTool() {
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [post, setPost] = useState(EMPTY)
  const [theme, setTheme] = useState('dark')
  const [showMetrics, setShowMetrics] = useState(false)
  const [truncated, setTruncated] = useState(false)
  // Founder-only: normally the founder account never gets a watermark (is_paid
  // bypass), so this exists to deliberately turn it ON for demo screenshots.
  const founder = isFounder(user)
  const [founderWatermark, setFounderWatermark] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [captureWatermark, setCaptureWatermark] = useState(false)
  const [notice, setNotice] = useState('')
  const [authModal, setAuthModal] = useState({ open: false, reason: '' })
  const [upgradeModal, setUpgradeModal] = useState({ open: false, reason: '' })
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  // The stage is a fixed 540px so the export is always 1080px, so the preview
  // has to be scaled down to whatever width the frame actually got. Measured in
  // a ref callback (runs on commit, unlike rAF-driven observers) plus a resize
  // listener, so it's right on first paint and stays right when rotated.
  const [previewScale, setPreviewScale] = useState(1)
  const [stageHeight, setStageHeight] = useState(MIN_STAGE_H)

  // Size the canvas to the rendered card instead of cropping to a square. We
  // measure a few times because the photo's height only exists once it loads.
  useEffect(() => {
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const card = stageRef.current?.querySelector('.x-card')
      if (!card) return
      const needed = Math.ceil(card.getBoundingClientRect().height / (previewScale || 1)) + 84
      setStageHeight(Math.min(MAX_STAGE_H, Math.max(MIN_STAGE_H, needed)))
    }
    const timers = [60, 350, 900, 1800].map((ms) => setTimeout(measure, ms))
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.text, post.photo, showMetrics, theme])

  const measureFrame = useCallback((node) => {
    const el = node || frameRef.current
    if (!el) return
    frameRef.current = el
    const width = el.clientWidth
    if (width) setPreviewScale(width / SIZE)
  }, [])

  useEffect(() => {
    // Deferred: reading clientWidth inside the resize event itself can catch
    // pre-reflow layout and leave the preview scaled to the old width.
    let timer
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(measureFrame, 60)
    }
    window.addEventListener('resize', onResize)
    // ResizeObserver catches container changes that aren't viewport resizes.
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measureFrame()) : null
    if (observer && frameRef.current) observer.observe(frameRef.current)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
    }
  }, [measureFrame])

  const hasPost = Boolean(post.text)
  const textStyle = useMemo(() => getTweetTextStyle(post.text || '', Boolean(post.photo)), [post.text, post.photo])
  const avatarInitials = useMemo(() => initials(post.name || '') || 'N2', [post.name])
  const when = post.date ? new Date(post.date) : new Date()

  async function fetchTweet(event) {
    event?.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/tweet?url=${encodeURIComponent(trimmed)}`)
      const data = await response.json()
      if (!response.ok || !data?.ok) {
        setError(data?.error || 'Could not read that tweet. Check the link and try again.')
        return
      }
      const t = data.tweet
      setPost({
        name: t.name || '',
        username: t.handle ? `@${t.handle}` : '',
        avatar: t.avatar || '',
        // X appends a t.co link for the attached image; once we render the
        // image itself that link is just noise, so drop it.
        text: t.photo ? (t.text || '').replace(/\s*https?:\/\/t\.co\/\w+\s*$/, '') : t.text || '',
        date: t.date || '',
        photo: t.photo || '',
        likes: t.likes,
        replies: t.replies,
        retweets: t.retweets,
      })
      // Long-form tweets come back truncated (see api/tweet.js). Say so plainly
      // rather than silently shipping half a tweet — the text is editable below.
      setTruncated(Boolean(t.truncated))
    } catch {
      setError('Something went wrong fetching that tweet. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  async function download() {
    if (!hasPost) {
      setNotice('Paste a tweet link first.')
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
        reason: 'Sign in to download your image. Editing and preview stay free.',
      })
      return
    }
    setIsExporting(true)
    try {
      // Gate 2: server-authoritative limit + watermark decision.
      const gate = await recordExport('short')
      if (!gate?.allowed) {
        if (gate?.reason === 'limit_reached') {
          setUpgradeModal({
            open: true,
            reason: 'You’ve used your 3 free exports this month. Upgrade for unlimited, watermark-free exports.',
          })
        } else {
          setAuthModal({ open: true, reason: 'Please sign in again to download.' })
        }
        return
      }

      const withWatermark = gate.watermark === true || (founder && founderWatermark)
      if (withWatermark) {
        setCaptureWatermark(true)
        // Let React paint the watermark into the stage before we capture it.
        // Raced against a timer because rAF is throttled to zero in background
        // tabs — otherwise a backgrounded export would wait here forever.
        await Promise.race([
          new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
          new Promise((resolve) => window.setTimeout(resolve, 250)),
        ])
      }
      try {
        // Race a timeout like the studio does: html-to-image can stall (e.g. a
        // throttled rAF in a background tab), and a spinner that never resolves
        // is worse than an error you can retry.
        const dataUrl = await Promise.race([
          toPng(stageRef.current, {
            pixelRatio: 2,
            // NO cacheBust: it appends ?<timestamp> to image URLs, and
            // pbs.twimg.com 404s on unknown query params — which killed the
            // export. skipFonts: the card uses system fonts, and inlining
            // Google Fonts' cross-origin stylesheet throws a SecurityError.
            skipFonts: true,
            backgroundColor: getShortExportBackground('x', theme),
          }),
          new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error('Export timed out')), EXPORT_TIMEOUT_MS)
          }),
        ])
        const anchor = document.createElement('a')
        anchor.href = dataUrl
        anchor.download = 'notes2pic-tweet.png'
        anchor.click()
      } finally {
        if (withWatermark) setCaptureWatermark(false)
      }

      setNotice(
        gate.remaining === null || gate.remaining === undefined
          ? 'Downloaded your image.'
          : `Downloaded your image. ${gate.remaining} free export${gate.remaining === 1 ? '' : 's'} left this month.`,
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
        <form onSubmit={fetchTweet}>
          <label className="tool-label" htmlFor="tweet-url">
            Tweet link
          </label>
          <div className="tweet-url-row">
            <input
              id="tweet-url"
              type="url"
              className="tweet-url-input"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://x.com/username/status/123…"
            />
            <button type="submit" className="btn-primary" disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
              {loading ? 'Fetching…' : 'Get image'}
            </button>
          </div>
        </form>

        {error ? <p className="tool-error">{error}</p> : null}

        {hasPost ? (
          <label className="tool-editable">
            <span className="tool-label">Text (editable)</span>
            <textarea
              className="tool-textarea tweet-textarea"
              value={post.text}
              onChange={(event) => setPost((current) => ({ ...current, text: event.target.value }))}
            />
          </label>
        ) : null}

        {truncated ? (
          <p className="tool-warn">
            This is a long-form tweet, and X only exposes the opening portion publicly. Paste the
            rest into the box above to complete it.
          </p>
        ) : null}

        <div className="tool-controls">
          <label>
            Style
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="tool-toggle">
            <input
              type="checkbox"
              checked={showMetrics}
              onChange={(event) => setShowMetrics(event.target.checked)}
            />
            Show likes &amp; replies
          </label>
          {founder ? (
            <label className="tool-toggle">
              <input
                type="checkbox"
                checked={founderWatermark}
                onChange={(event) => setFounderWatermark(event.target.checked)}
              />
              Watermark <span className="tool-optional">(founder)</span>
            </label>
          ) : null}
        </div>

        <p className="tool-hint">
          Works with any public tweet. We only read the post you link to — Notes2Pic never asks for
          your X login and never posts on your behalf.
        </p>
      </div>

      <div className="tool-preview">
        <div
          className="tweet-stage-frame"
          ref={measureFrame}
          style={{ aspectRatio: `${SIZE} / ${stageHeight}` }}
        >
          {/* Scale a WRAPPER, never the node we export. html-to-image captures
              the node's own transform, so scaling the stage itself produced a
              shrunken, corner-anchored PNG. The studio scales a wrapper too. */}
          <div
            className="tweet-stage-scaler"
            style={{
              width: SIZE,
              height: stageHeight,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
          >
          <div
            ref={stageRef}
            className={`export-stage short-stage short-x short-${theme}`}
            style={{ width: SIZE, height: stageHeight }}
          >
            <ShortSourcePreview
              avatarInitials={avatarInitials}
              post={hasPost ? post : { ...EMPTY, text: 'Paste a tweet link to see it here.' }}
              shortPostTextStyle={textStyle}
              sourceKey="x"
              badgeDate={formatBadgeDate(when)}
              timestamp={formatTimestamp(when)}
              watermark={captureWatermark}
              metrics={showMetrics ? { likes: post.likes, replies: post.replies, retweets: post.retweets } : null}
              highlight
              photo={post.photo}
            />
          </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary block"
          onClick={download}
          disabled={isExporting || !hasPost}
        >
          <Download aria-hidden="true" />
          {isExporting ? 'Preparing…' : 'Download PNG'}
        </button>
        {notice ? <p className="tool-notice">{notice}</p> : null}
      </div>

      <AuthModal
        open={authModal.open}
        reason={authModal.reason}
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
