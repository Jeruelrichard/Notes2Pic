import { Check, X } from 'lucide-react'
import { checkoutUrlForPlan } from '../lib/checkout'
import '../styles/modals.css'

// Shown when a free user hits the export limit or clicks "Remove watermark".
export default function UpgradeModal({ open, onClose, email, reason }) {
  if (!open) return null

  const monthly = checkoutUrlForPlan('monthly', email)
  const lifetime = checkoutUrlForPlan('lifetime', email)

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
          <li><Check aria-hidden="true" /> Unlimited carousels</li>
          <li><Check aria-hidden="true" /> No "made with Notes2Pic" watermark</li>
          <li><Check aria-hidden="true" /> Unlimited saved profiles</li>
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
            <span className="plan-note">Then $17 — lock in founding members pricing</span>
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
