import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Copy, Loader2, Sparkles } from 'lucide-react'
import { MAX_ESSAY_WORDS, countWords, generateHeadlines, handoffEssayToThread } from '../lib/headlineGen'

const sampleDraft = `A pattern I've noticed in stuck creators and entrepreneurs:

They're always busy. They never stop moving. They have 47 tabs open, 12 unfinished drafts, and a notebook-sized to-do list. But if you ask them what they accomplished this week that actually moved the needle, their mind goes blank.

Busyness is a poor measure of value. In fact, most busyness is just sophisticated procrastination — a way to avoid the one or two uncomfortable tasks that actually determine your success.

If you stop obsessing over being busy and focus ruthlessly on being useful instead, your output, audience, and revenue will transform in 90 days.`

export default function HeadlineGeneratorTool() {
  const navigate = useNavigate()
  const [essay, setEssay] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)

  const isLink = useMemo(() => /^(https?:\/\/[^\s]+)$/i.test(essay.trim()), [essay])
  const words = useMemo(() => countWords(essay), [essay])
  const overLimit = words > MAX_ESSAY_WORDS

  async function generate(event) {
    event?.preventDefault()
    if (!essay.trim() || overLimit || isLink) return

    setLoading(true)
    setError('')
    setNotice('')
    try {
      const outcome = await generateHeadlines(essay)
      if (!outcome.ok) {
        setError(outcome.error || 'Generation failed. Try again in a moment.')
        return
      }

      setResults(outcome.results || [])
      setNotice('Generated 6 viral headline angles.')
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

  function handleTurnIntoThread() {
    handoffEssayToThread(essay)
    navigate('/thread-generator')
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
              </div>
            ))}

            <div style={{ marginTop: '6px' }}>
              <button
                type="button"
                className="btn-primary block"
                onClick={handleTurnIntoThread}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem' }}
              >
                Turn this essay into a thread
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="thread-placeholder">
            <Sparkles aria-hidden="true" />
            <p>Your viral headlines and subheadlines will appear here, ready to turn into a thread.</p>
          </div>
        )}

        {notice ? <p className="tool-notice">{notice}</p> : null}
      </div>
    </div>
  )
}
