import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import AuthModal from './AuthModal'
import UpgradeModal from './UpgradeModal'
import { HANDOFF_KEY, MAX_ESSAY_WORDS, countWords, generateThread } from '../lib/threadGen'

// Paste an essay → Gemini turns it into a numbered thread → one click hands it
// to the carousel tool. The quota is enforced server-side (see
// api/generate-thread.js); this component just reacts to what the server says.
export default function ThreadGeneratorTool() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [essay, setEssay] = useState('')
  const [thread, setThread] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [authModal, setAuthModal] = useState({ open: false, reason: '' })
  const [upgradeModal, setUpgradeModal] = useState({ open: false, reason: '' })

  const words = useMemo(() => countWords(essay), [essay])
  const overLimit = words > MAX_ESSAY_WORDS

  async function generate(event) {
    event?.preventDefault()
    if (!essay.trim() || overLimit) return

    if (!isSupabaseConfigured) {
      setError('Sign-in isn’t configured in this environment.')
      return
    }
    // Generating costs real money, so it always requires an account.
    if (!user) {
      setAuthModal({
        open: true,
        reason: 'Sign in to generate your thread. Your free account includes one generation.',
      })
      return
    }

    setLoading(true)
    setError('')
    setNotice('')
    try {
      const result = await generateThread(essay)
      if (!result.ok) {
        if (result.reason === 'generation_limit') {
          setUpgradeModal({
            open: true,
            reason: 'You’ve used your free AI thread generation. Upgrade for unlimited generations.',
          })
        } else if (result.reason === 'not_authenticated') {
          setAuthModal({ open: true, reason: 'Please sign in again to generate.' })
        } else {
          setError(result.error || 'Generation failed. Try again in a moment.')
        }
        return
      }
      setThread(result.thread)
      setNotice(
        result.remaining === null || result.remaining === undefined
          ? 'Thread generated. Edit anything you like.'
          : `Thread generated. ${result.remaining} free generation${result.remaining === 1 ? '' : 's'} left.`,
      )
    } catch {
      setError('Something went wrong generating that thread. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  // Hand the thread to the carousel tool via sessionStorage — far too much text
  // for a query string, and it survives the navigation.
  function sendToCarousel() {
    try {
      sessionStorage.setItem(HANDOFF_KEY, thread)
    } catch {
      // Private mode / storage disabled: the carousel page just shows its demo.
    }
    navigate('/thread-to-carousel')
  }

  return (
    <div className="tool">
      <div className="tool-input">
        <form onSubmit={generate}>
          <label className="tool-label" htmlFor="essay">
            Your essay
          </label>
          <textarea
            id="essay"
            className="tool-textarea"
            value={essay}
            onChange={(event) => setEssay(event.target.value)}
            placeholder="Paste your blog post, newsletter or draft here…"
            spellCheck={false}
          />
          <div className="tool-controls">
            <span className={`tool-count ${overLimit ? 'over' : ''}`}>
              {words.toLocaleString()} / {MAX_ESSAY_WORDS.toLocaleString()} words
            </span>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !essay.trim() || overLimit}
            >
              {loading ? <Loader2 className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {loading ? 'Generating…' : 'Generate thread'}
            </button>
          </div>
        </form>

        {overLimit ? (
          <p className="tool-warn">
            That’s {(words - MAX_ESSAY_WORDS).toLocaleString()}{' '}
            {words - MAX_ESSAY_WORDS === 1 ? 'word' : 'words'} over the limit. Trim it a little and
            try again.
          </p>
        ) : null}
        {error ? <p className="tool-error">{error}</p> : null}

        <p className="tool-hint">
          Your essay is sent to an AI model to be rewritten as a thread. Notes2Pic doesn’t store
          it, and never posts anything on your behalf.
        </p>
      </div>

      <div className="tool-preview">
        {thread ? (
          <>
            <label className="tool-editable">
              <span className="tool-label">Your thread (edit if you like)</span>
              <textarea
                className="tool-textarea thread-output"
                value={thread}
                onChange={(event) => setThread(event.target.value)}
              />
            </label>
            <button type="button" className="btn-primary block" onClick={sendToCarousel}>
              Turn this into a carousel
              <ArrowRight aria-hidden="true" />
            </button>
          </>
        ) : (
          <div className="thread-placeholder">
            <Sparkles aria-hidden="true" />
            <p>Your thread will appear here, numbered and ready to post.</p>
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
