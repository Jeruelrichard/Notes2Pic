import { Check, X } from 'lucide-react'
import { checkoutUrlForPlan } from '../lib/checkout'
import '../styles/modals.css'

// Shown when a free user hits the export limit or clicks "Remove watermark".
export default function UpgradeModal({ open, onClose, email, reason, country }) {
  if (!open) return null

  const isNG = country === 'NG'
  const monthly = checkoutUrlForPlan('monthly', email, isNG ? 'PPP_NG' : '')
  const lifetime = checkoutUrlForPlan('lifetime', email, isNG ? 'PPP_NGLIFE' : '')

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

        {isNG && (
          <div className="ppp-notice" style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            color: '#78350f',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: '700',
            marginBottom: '16px',
            textAlign: 'center',
            border: '1px solid #fcd34d',
            lineHeight: '1.4'
          }}>
            🇳🇬 Purchasing Power Parity discount applied! (Monthly 70% off, Lifetime 63% off)
          </div>
        )}

        <ul className="plan-benefits">
          <li><Check aria-hidden="true" /> Unlimited exports</li>
          <li><Check aria-hidden="true" /> Unlimited carousels</li>
          <li><Check aria-hidden="true" /> Unlimited AI thread generations</li>
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
            <span className="plan-price">{isNG ? '$1.50' : '$5'}<small>/mo</small></span>
            <span className="plan-note">{isNG ? 'PPP applied' : 'Cancel anytime'}</span>
          </a>

          <a
            className={`plan-card featured ${lifetime ? '' : 'disabled'}`}
            href={lifetime || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="plan-badge">{isNG ? 'PPP discount applied' : 'First 20 buyers'}</span>
            <span className="plan-name">Lifetime</span>
            <span className="plan-price">{isNG ? '$3.70' : '$10'}<small>once</small></span>
            <span className="plan-note">{isNG ? 'Pay once, keep forever' : 'Then $17 — lock in founding members pricing'}</span>
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
