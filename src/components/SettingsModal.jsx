import { Check, Crown, LogOut, Pencil, Plus, Trash2, X } from 'lucide-react'

// Settings hub: Profiles, Billing, and Logout.
export default function SettingsModal({
  open,
  onClose,
  user,
  usage,
  profiles,
  activeProfileId,
  isPaid,
  onUseProfile,
  onNewProfile,
  onEditProfile,
  onDeleteProfile,
  onUpgrade,
  onLogout,
}) {
  if (!open) return null

  const plan = usage?.plan
  const planLabel = isPaid ? (plan === 'lifetime' ? 'Lifetime' : 'Pro') : 'Free'
  const atFreeLimit = !isPaid && profiles.length >= 1

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card settings-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" />
        </button>

        <h2 className="modal-title">Settings</h2>
        {user ? <p className="modal-sub">{user.email}</p> : null}

        {/* Billing */}
        <section className="settings-section">
          <div className="settings-section-head">
            <h3>Billing</h3>
            <span className={`account-badge ${isPaid ? 'pro' : 'free'}`}>
              {isPaid ? <Crown aria-hidden="true" /> : null}
              {planLabel}
            </span>
          </div>
          {isPaid ? (
            <p className="settings-hint">Unlimited watermark-free exports, unlimited carousels, and unlimited saved profiles. Thank you for supporting Notes2Pic.</p>
          ) : (
            <>
              <p className="settings-hint">
                {usage?.remaining ?? 3} free export{(usage?.remaining ?? 3) === 1 ? '' : 's'} left this month (with a watermark)
                {' · '}
                {usage?.carouselRemaining ?? 1} carousel left · one saved profile.
              </p>
              <button type="button" className="upgrade-link block" onClick={onUpgrade}>
                Upgrade for unlimited
              </button>
            </>
          )}
        </section>

        {/* Profiles */}
        <section className="settings-section">
          <div className="settings-section-head">
            <h3>Profiles</h3>
            <button
              type="button"
              className="settings-new"
              onClick={onNewProfile}
              disabled={atFreeLimit}
              title={atFreeLimit ? 'Upgrade to save more profiles' : 'New profile'}
            >
              <Plus aria-hidden="true" />
              New
            </button>
          </div>

          {profiles.length === 0 ? (
            <p className="settings-hint">No profiles yet. Create one to brand your posts.</p>
          ) : (
            <ul className="profile-list">
              {profiles.map((profile) => (
                <li key={profile.id} className={profile.id === activeProfileId ? 'active' : ''}>
                  <div className="profile-list-avatar">
                    {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{(profile.name || '?').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="profile-list-meta">
                    <strong>{profile.name || 'Unnamed'}</strong>
                    <span>{profile.username}</span>
                  </div>
                  <div className="profile-list-actions">
                    {profile.id === activeProfileId ? (
                      <span className="profile-active-tag"><Check aria-hidden="true" /> In use</span>
                    ) : (
                      <button type="button" onClick={() => onUseProfile(profile.id)}>Use</button>
                    )}
                    <button type="button" onClick={() => onEditProfile(profile)} aria-label="Edit profile" title="Edit">
                      <Pencil aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => onDeleteProfile(profile.id)}
                      aria-label="Delete profile"
                      title="Delete"
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {atFreeLimit ? (
            <p className="settings-hint">Free accounts can save one profile. Upgrade for unlimited profiles.</p>
          ) : null}
        </section>

        {/* Logout */}
        <button type="button" className="settings-logout" onClick={onLogout}>
          <LogOut aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  )
}
