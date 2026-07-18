import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import '../styles/modals.css'

// Email+password (sign up / sign in toggle) plus Google OAuth.
// onClose closes the modal (also used after a successful sign-in). onDismiss (if
// provided) fires only on an explicit user dismiss (X / overlay), so callers can
// cancel a pending intent like a checkout redirect.
export default function AuthModal({ open, onClose, onDismiss, reason, redirectTo = '/app' }) {
  const dismiss = onDismiss || onClose
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (!open) return null

  const isSignup = mode === 'signup'
  const isReset = mode === 'reset'

  function switchMode(next) {
    setMode(next)
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    try {
      if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/app`,
        })
        if (error) throw error
        // Neutral message so we don't reveal whether the email is registered.
        setMessage('If an account exists for that email, a password reset link is on its way.')
      } else if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Supabase hides "email already exists" to prevent enumeration: it returns
        // a user with an empty identities array instead of an error. Detect that.
        if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setMessage('An account with this email already exists. Try signing in instead.')
          return
        }
        setMessage('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      }
    } catch (error) {
      setMessage(error.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    })
    if (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={dismiss}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={dismiss} aria-label="Close">
          <X aria-hidden="true" />
        </button>

        <h2 className="modal-title">
          {isSignup ? 'Create your account' : isReset ? 'Reset your password' : 'Sign in'}
        </h2>
        <p className="modal-sub">
          {isReset
            ? "Enter your account email and we'll send you a link to set a new password."
            : reason || 'Sign in to export your image. Editing and previewing are always free.'}
        </p>

        {!isReset ? (
          <>
            <button type="button" className="google-button" onClick={google} disabled={busy}>
              <GoogleGlyph />
              Continue with Google
            </button>
            <div className="modal-divider"><span>or</span></div>
          </>
        ) : null}

        <form className="modal-form" onSubmit={submit}>
          <label className="field full">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {!isReset ? (
            <label className="field full">
              <span>Password</span>
              <input
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
          ) : null}

          <button type="submit" className="export-button" disabled={busy}>
            {busy ? 'Please wait…' : isReset ? 'Send reset link' : isSignup ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        {message ? <p className="modal-message">{message}</p> : null}

        {isReset ? (
          <p className="modal-switch">
            Remembered it?{' '}
            <button type="button" onClick={() => switchMode('signin')}>Back to sign in</button>
          </p>
        ) : (
          <>
            {!isSignup ? (
              <p className="modal-switch">
                <button type="button" onClick={() => switchMode('reset')}>Forgot your password?</button>
              </p>
            ) : null}
            <p className="modal-switch">
              {isSignup ? 'Already have an account?' : 'New here?'}{' '}
              <button type="button" onClick={() => switchMode(isSignup ? 'signin' : 'signup')}>
                {isSignup ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
