import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'

const LAST_UPDATED = 'July 12, 2026'

export default function Terms() {
  return (
    <MarketingLayout>
      <Seo
        title="Terms of Service"
        description="The terms that govern your use of Notes2Pic."
        path="/terms"
      />

      <article className="legal-page">
        <header className="legal-head">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="legal-body">
          <p>
            These terms govern your use of Notes2Pic (the "Service"). By creating an account or
            using the Service, you agree to them. If you don't agree, please don't use the
            Service.
          </p>

          <h2>The Service</h2>
          <p>
            Notes2Pic lets you turn text posts into images for sharing on social platforms.
            Editing and previewing are free and don't require an account. Exporting an image
            requires a free account, which includes 3 exports per rolling 30 days with a "made
            with Notes2Pic" watermark, and one saved author profile.
          </p>

          <h2>Paid plans</h2>
          <p>
            Paid plans remove the watermark, unlock unlimited exports, and unlimited saved
            profiles, billed either monthly or as a one-time lifetime purchase. Payments are
            processed by <strong>Freemius</strong>, our Merchant of Record — Freemius handles
            billing, invoicing, taxes, refunds, and subscription management. Any billing disputes
            or refund requests should go through Freemius's customer portal or support.
          </p>

          <h2>Your account</h2>
          <ul>
            <li>You're responsible for keeping your login credentials secure.</li>
            <li>You must provide accurate information when creating an account.</li>
            <li>One person or organization may not maintain more than one free account.</li>
          </ul>

          <h2>Your content</h2>
          <p>
            You own whatever text, images, and avatars you use in the Service. We don't claim any
            ownership over the images you create. Post text and generated images are processed
            entirely in your browser and are not stored on our servers — the only content we
            store on your behalf is what you explicitly save (your author profile: name,
            username, avatar, signature).
          </p>
          <p>
            You're responsible for the content you create with the Service. Don't use it to
            create content that is illegal, infringes someone else's rights, or impersonates
            another person or brand without authorization.
          </p>

          <h2>Acceptable use</h2>
          <p>Please don't:</p>
          <ul>
            <li>Attempt to bypass export limits, paywalls, or account restrictions.</li>
            <li>Scrape, reverse-engineer, or abuse the Service's infrastructure.</li>
            <li>Use the Service to distribute spam, malware, or unlawful content.</li>
          </ul>

          <h2>Termination</h2>
          <p>
            You can stop using the Service and delete your account at any time. We may suspend or
            terminate accounts that violate these terms.
          </p>

          <h2>Disclaimer & limitation of liability</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We do our best to
            keep it reliable, but we don't guarantee uninterrupted availability. To the extent
            permitted by law, Notes2Pic is not liable for indirect, incidental, or consequential
            damages arising from your use of the Service.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms from time to time. If we make material changes, we'll
            update the "Last updated" date above. Continuing to use the Service after changes
            means you accept the updated terms.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these terms? Reach out at{' '}
            <a href="mailto:jeruelrichard@gmail.com">jeruelrichard@gmail.com</a>.
          </p>
        </div>
      </article>
    </MarketingLayout>
  )
}
