import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Copy, Loader2, Sparkles } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import AuthModal from './AuthModal'
import UpgradeModal from './UpgradeModal'
import { MAX_ESSAY_WORDS, countWords, generateHeadlines, handoffHeadlineCarousel } from '../lib/headlineGen'

const sampleDraft = `A pattern I've noticed in stuck creators and entrepreneurs:

They're always busy. They never stop moving. They have 47 tabs open, 12 unfinished drafts, and a notebook-sized to-do list. But if you ask them what they accomplished this week that actually moved the needle, their mind goes blank.

Busyness is a poor measure of value. In fact, most busyness is just sophisticated procrastination — a way to avoid the one or two uncomfortable tasks that actually determine your success.

If you stop obsessing over being busy and focus ruthlessly on being useful instead, your output, audience, and revenue will transform in 90 days.`

export default function HeadlineGeneratorTool() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [essay, setEssay] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [authModal, setAuthModal] = useState({ open: false, reason: '' })
  const [upgradeModal, setUpgradeModal] = useState({ open: false, reason: '' })

  const isLink = useMemo(() => /^(https?:\/\/[^\s]+)$/i.test(essay.trim()), [essay])
  const words = useMemo(() => countWords(essay), [essay])
  const overLimit = words > MAX_ESSAY_WORDS

  async function generate(event) {
    event?.preventDefault()
    if (!essay.trim() || overLimit || isLink) return

    if (!isSupabaseConfigured) {
      setError('Sign-in isn’t configured in this environment.')
      return
    }

    if (!user) {
      setAuthModal({
        open: true,
        reason: 'Sign in to generate headlines. Your free account includes one generation.',
      })
      return
    }

    setLoading(true)
    setError('')
    setNotice('')
    try {
      const outcome = await generateHeadlines(essay)
      if (!outcome.ok) {
        if (outcome.reason === 'generation_limit') {
          setUpgradeModal({
            open: true,
            reason: 'You’ve used your free AI generation. Upgrade for unlimited generations.',
          })
        } else if (outcome.reason === 'not_authenticated') {
          setAuthModal({ open: true, reason: 'Please sign in again to generate.' })
        } else {
          setError(outcome.error || 'Generation failed. Try again in a moment.')
        }
        return
      }

      setResults(outcome.results || [])
      setNotice(
        outcome.remaining === null || outcome.remaining === undefined
          ? 'Generated 6 viral headline angles.'
          : `Generated 6 viral headline angles. ${outcome.remaining} free generation${outcome.remaining === 1 ? '' : 's'} left.`,
      )
    } catch {
      setError('Something went wrong generating headlines. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy(item, index) {
    const text = `${item.headline}\n\n${item.subhead}`
    navigator.clipboard?.writeText?.(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function handleTurnIntoCarousel(item) {
    handoffHeadlineCarousel(item.headline, item.subhead, essay)
    navigate('/thread-to-carousel')
  }

  function loadSample() {
    setEssay(sampleDraft)
    setError('')
  }

  return (
    <div className="tool">
      <div className="tool-input">
        <form onSubmit={generate}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="tool-label" htmlFor="essay" style={{ margin: 0 }}>
              Your article or draft
            </label>
            {!essay ? (
              <button
                type="button"
                onClick={loadSample}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2f6fed',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Load sample draft
              </button>
            ) : null}
          </div>

          <textarea
            id="essay"
            className="tool-textarea"
            value={essay}
            onChange={(event) => setEssay(event.target.value)}
            placeholder="Paste your blog post, newsletter draft, or article notes here (raw text)…"
            spellCheck={false}
            rows={12}
          />

          <div className="tool-controls">
            <span className={`tool-count ${overLimit ? 'over' : ''}`}>
              {words.toLocaleString()} / {MAX_ESSAY_WORDS.toLocaleString()} words
            </span>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !essay.trim() || overLimit || isLink}
            >
              {loading ? <Loader2 className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {loading ? 'Generating…' : 'Generate Viral Headlines'}
            </button>
          </div>
        </form>

        {isLink ? (
          <p className="tool-warn">
            Please paste the text of your article or draft directly rather than a URL link.
          </p>
        ) : null}

        {overLimit ? (
          <p className="tool-warn">
            That’s {(words - MAX_ESSAY_WORDS).toLocaleString()}{' '}
            {words - MAX_ESSAY_WORDS === 1 ? 'word' : 'words'} over the limit. Trim it a little and try again.
          </p>
        ) : null}

        {error ? <p className="tool-error">{error}</p> : null}

        <p className="tool-hint">
          Extracts the core tension and writes viral hooks in the styles of Dan Koe, Tim Denning, and contrarian creators.
        </p>
      </div>

      <div className="tool-preview">
        {results.length > 0 ? (
          <div className="headline-results-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            {results.map((item, index) => (
              <div
                key={index}
                className="headline-card"
                style={{
                  border: '1px solid #e3e6ea',
                  borderRadius: '10px',
                  padding: '16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#2f6fed',
                      background: 'rgba(47, 111, 237, 0.08)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {item.style || 'Viral Angle'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopy(item, index)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: copiedIndex === index ? '#16a34a' : '#64748b',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                    {copiedIndex === index ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                    {item.headline}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.45 }}>
                    {item.subhead}
                  </p>
                </div>

                <div style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleTurnIntoCarousel(item)}
                    style={{ width: '100%', fontSize: '0.85rem', padding: '9px 12px', justifyContent: 'center' }}
                  >
                    Turn into Carousel
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="thread-placeholder">
            <Sparkles aria-hidden="true" />
            <p>Your viral headlines and subheadlines will appear here, ready to convert into a carousel.</p>
          </div>
        )}

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
