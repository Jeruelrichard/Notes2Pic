import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

const empty = { name: '', username: '', avatar: '', signature: '' }

// Shared create/edit form for an author profile. All four fields are required.
// The parent remounts this via `key` each time it opens, so useState seeds
// cleanly from `initial` without a prop-syncing effect.
export default function ProfileFormModal({ open, title, initial, submitLabel, busy, onSubmit, onClose, dismissable = true }) {
  const [form, setForm] = useState({ ...empty, ...(initial || {}) })
  const [error, setError] = useState('')

  if (!open) return null

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => update('avatar', reader.result)
    reader.readAsDataURL(file)
  }

  function submit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const username = form.username.trim()
    const signature = form.signature.trim()

    if (!name || !username || !form.avatar || !signature) {
      setError('All four fields are required — name, username, avatar, and signature.')
      return
    }
    onSubmit({ name, username, avatar: form.avatar, signature })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={dismissable ? onClose : undefined}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {dismissable ? (
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        ) : null}

        <h2 className="modal-title">{title}</h2>
        <p className="modal-sub">This is the author identity that appears on your posts. You can save more later.</p>

        <form className="modal-form" onSubmit={submit}>
          <div className="profile-avatar-row">
            <div className="profile-avatar-preview">
              {form.avatar ? <img src={form.avatar} alt="" /> : <span>{(form.name || '?').charAt(0).toUpperCase()}</span>}
            </div>
            <label className="upload-row compact">
              <ImagePlus aria-hidden="true" />
              <span>{form.avatar ? 'Change avatar' : 'Upload avatar'}</span>
              <input type="file" accept="image/*" onChange={handleAvatar} />
            </label>
          </div>

          <label className="field full">
            <span>Name</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} />
          </label>

          <label className="field full">
            <span>Username</span>
            <input
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
              placeholder="@handle"
            />
          </label>

          <label className="field full">
            <span>Signature</span>
            <input
              value={form.signature}
              onChange={(event) => update('signature', event.target.value)}
              placeholder="Shown on medium-form posts"
            />
          </label>

          <button type="submit" className="export-button" disabled={busy}>
            {busy ? 'Saving…' : submitLabel || 'Save profile'}
          </button>
        </form>

        {error ? <p className="modal-message">{error}</p> : null}
      </div>
    </div>
  )
}
