import { Check, X } from 'lucide-react'

// Shown when a free user hits the export limit or clicks "Remove watermark".
// Builds Lemon Squeezy checkout URLs, passing the Supabase user id as custom data
// so the webhook can attribute the purchase back to this account.
export default function UpgradeModal({ open, onClose, userId, email, reason }) {
  if (!open) return null

  const monthly = buildCheckoutUrl(import.meta.env.VITE_LS_CHECKOUT_MONTHLY, userId, email)
  const lifetime = buildCheckoutUrl(import.meta.env.VITE_LS_CHECKOUT_LIFETIME, userId, email)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" />
        </button>

        <h2 className="modal-title">Go unlimited</h2>
        <p className="modal-sub">
          {reason || 'You have used your free exports. Upgrade to remove the watermark and export without limits.'}
        </p>

        <ul className="plan-benefits">
          <li><Check aria-hidden="true" /> Unlimited exports</li>
          <li><Check aria-hidden="true" /> No "made with Notes2Pics" watermark</li>
          <li><Check aria-hidden="true" /> Every template and canvas size</li>
        </ul>

        <div className="plan-grid">
          <a
            className={`plan-card ${monthly ? '' : 'disabled'}`}
            href={monthly || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="plan-name">Monthly</span>
            <span className="plan-price">$5<small>/mo</small></span>
            <span className="plan-note">Cancel anytime</span>
          </a>

          <a
            className={`plan-card featured ${lifetime ? '' : 'disabled'}`}
            href={lifetime || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="plan-badge">First 20 buyers</span>
            <span className="plan-name">Lifetime</span>
            <span className="plan-price">$10<small>once</small></span>
            <span className="plan-note">Then $17 — lock in early pricing</span>
          </a>
        </div>

        {!monthly || !lifetime ? (
          <p className="modal-message">Checkout links are not configured yet.</p>
        ) : (
          <p className="modal-switch">After paying, return here — your account unlocks automatically.</p>
        )}
      </div>
    </div>
  )
}

function buildCheckoutUrl(base, userId, email) {
  if (!base) return ''
  try {
    const url = new URL(base)
    if (userId) url.searchParams.set('checkout[custom][user_id]', userId)
    if (email) url.searchParams.set('checkout[email]', email)
    return url.toString()
  } catch {
    return base
  }
}
