import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Shown after the user follows a password-reset link (Supabase fires a
// PASSWORD_RECOVERY event, giving a temporary session to set a new password).
// Not dismissable — the user must set a password or reload.
export default function SetPasswordModal({ open, onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (!open) return null

  async function submit(event) {
    event.preventDefault()
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      onDone()
    } catch (error) {
      setMessage(error.message || 'Could not update password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal-title">Set a new password</h2>
        <p className="modal-sub">Choose a new password for your account.</p>

        <form className="modal-form" onSubmit={submit}>
          <label className="field full">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <label className="field full">
            <span>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="export-button" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>

        {message ? <p className="modal-message">{message}</p> : null}
      </div>
    </div>
  )
}
