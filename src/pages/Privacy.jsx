import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'

const LAST_UPDATED = 'July 12, 2026'

export default function Privacy() {
  return (
    <MarketingLayout>
      <Seo
        title="Privacy Policy"
        description="How Notes2Pic collects, uses, and protects your data."
        path="/privacy"
      />

      <article className="legal-page">
        <header className="legal-head">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="legal-body">
          <p>
            Notes2Pic ("we", "us", "the app") turns your posts into images. This page explains
            what data we collect, why, and who we share it with. We've kept the app light on data
            collection by design: the images themselves are created entirely in your browser and
            are never uploaded to our servers.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Account info</strong> — your email address, created when you sign up with
              email/password or Google sign-in.
            </li>
            <li>
              <strong>Saved profiles</strong> — if you choose to save an author profile, we store
              the name, username, avatar image, and signature you provide, so it can be reused
              across the app.
            </li>
            <li>
              <strong>Usage counters</strong> — a timestamp each time you export an image, used
              only to enforce the free plan's monthly export limit. We do not store the exported
              image or the post text itself.
            </li>
            <li>
              <strong>Billing status</strong> — whether you're on the free or paid plan, and
              identifiers from our payment processor (Freemius) needed to keep that status in
              sync. We never see or store your card details — Freemius handles payment
              collection directly.
            </li>
          </ul>

          <h2>What we don't collect</h2>
          <p>
            The post text, images, and templates you create in the editor are generated and
            rendered entirely in your browser. Short-form and medium-form exports never touch our
            servers at all. We do not read, store, or have access to the content of the images you
            create.
          </p>

          <h2>Who we share data with</h2>
          <ul>
            <li>
              <strong>Supabase</strong> — our authentication and database provider. Account info,
              saved profiles, and billing status are stored there.
            </li>
            <li>
              <strong>Freemius</strong> — our payment processor and Merchant of Record. If you
              upgrade to a paid plan, Freemius collects your payment details directly and shares
              back only your license/subscription status, not your card information.
            </li>
            <li>
              <strong>Google</strong> — if you choose "Continue with Google" to sign in, Google
              shares your email address with us for authentication purposes.
            </li>
            <li>
              <strong>Vercel</strong> — our hosting provider, which serves the app and processes
              standard web request logs.
            </li>
          </ul>
          <p>We do not sell your data to anyone.</p>

          <h2>Cookies & local storage</h2>
          <p>
            We use your browser's local storage to keep you signed in between visits. A service
            worker caches app assets for offline/PWA use. We don't use third-party advertising or
            tracking cookies.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>You can delete a saved profile at any time from Settings.</li>
            <li>
              You can request deletion of your account and associated data by contacting us — see
              below.
            </li>
            <li>Cancelling a paid plan is managed directly through Freemius's customer portal.</li>
          </ul>

          <h2>Changes to this policy</h2>
          <p>
            If we materially change how we handle your data, we'll update this page and adjust
            the "Last updated" date above.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy or your data? Reach out via the contact details on our{' '}
            <a href="mailto:jeruelrichard@gmail.com">jeruelrichard@gmail.com</a>.
          </p>
        </div>
      </article>
    </MarketingLayout>
  )
}
