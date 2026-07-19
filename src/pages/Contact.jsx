import { Mail, MessageCircle } from 'lucide-react'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'

// --- Contact details -------------------------------------------------------
// Same address used on the legal pages, so support and legal contact match.
const EMAIL = 'jeruelrichard@gmail.com'

// X handle WITHOUT the leading @. Leave empty to hide the X option entirely
// (better a missing card than a dead link).
const X_HANDLE = 'jeruelrichard'
// Optional: X's numeric account id. When set, the link opens the DM composer in
// one click; without it we fall back to the profile, where the visitor taps
// "Message". X only supports recipient_id here — handles are not accepted.
const X_USER_ID = ''

const xUrl = X_USER_ID
  ? `https://x.com/messages/compose?recipient_id=${X_USER_ID}`
  : `https://x.com/${X_HANDLE}`

export default function Contact() {
  return (
    <MarketingLayout>
      <Seo path="/contact" />

      <div className="contact-page">
        <header className="contact-hero">
          <span className="contact-eyebrow">Contact</span>
          <h1>Talk to a human.</h1>
          <p>
            Notes2Pic is built and supported by one person. A bug, a feature idea, a refund, or
            just &ldquo;this didn&rsquo;t work for me&rdquo; &mdash; it comes straight to me.
          </p>
        </header>

        <div className="contact-options">
          <a className="contact-card" href={`mailto:${EMAIL}?subject=Notes2Pic`}>
            <span className="contact-icon" aria-hidden="true">
              <Mail />
            </span>
            <h2>Email me</h2>
            <p>Best for bugs, billing, or anything that needs detail or a screenshot.</p>
            <span className="contact-value">{EMAIL}</span>
          </a>

          {X_HANDLE ? (
            <a className="contact-card" href={xUrl} target="_blank" rel="noopener noreferrer">
              <span className="contact-icon" aria-hidden="true">
                <MessageCircle />
              </span>
              <h2>DM me on X</h2>
              <p>Quickest for short questions and quick feedback.</p>
              <span className="contact-value">@{X_HANDLE}</span>
            </a>
          ) : null}
        </div>

        <p className="contact-note">I usually reply within a day.</p>
      </div>
    </MarketingLayout>
  )
}
