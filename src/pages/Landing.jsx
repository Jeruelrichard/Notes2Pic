import { Link } from 'react-router-dom'
import { Check, Download, ImageIcon, Layers, Palette, Zap } from 'lucide-react'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'

const features = [
  { icon: Zap, title: 'Paste and export', body: 'Drop in your post text, pick a style, and export a high-res PNG in seconds. No blank canvas, no fighting with fonts.' },
  { icon: Layers, title: 'X, Threads & Substack', body: 'Authentic templates that look native to each platform — verified badge, timestamps, and layout included.' },
  { icon: ImageIcon, title: 'Every size that matters', body: 'Square for the feed, Portrait for reach, Story for full-screen. One post, every format.' },
  { icon: Palette, title: 'Stay on brand', body: 'Save reusable profiles with your name, handle, and avatar so every image looks unmistakably yours.' },
]

export default function Landing() {
  return (
    <MarketingLayout>
      <Seo path="/" />

      <section className="hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">Post-to-image studio</p>
          <h1>Turn your best posts into Instagram-ready images.</h1>
          <p className="hero-sub">
            You already write great posts on X, Threads, and Substack. Notes2Pics turns them into
            clean, branded images you can post anywhere — in seconds, not minutes.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn-primary">
              <Download aria-hidden="true" />
              Start free
            </Link>
            <Link to="/blog" className="btn-secondary">
              Read the blog
            </Link>
          </div>
          <p className="hero-note">Free to start · No card required · 3 free exports a month</p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="demo-card demo-threads">
            <div className="demo-head">
              <span className="demo-avatar" />
              <div>
                <strong>jeruelrichard</strong>
                <em>Jul 8</em>
              </div>
            </div>
            <p>There is so much signal on that app. Time to start showing up.</p>
          </div>
          <div className="demo-card demo-x">
            <div className="demo-head">
              <span className="demo-avatar" />
              <div>
                <strong>Nuel Okemdilim</strong>
                <em>@nuel</em>
              </div>
            </div>
            <p>Building in public is about leaving a clear trail of what you're learning and shipping.</p>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Everything you need to repurpose faster</h2>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, body }) => (
            <article className="feature-card" key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing" id="pricing">
        <h2>Simple pricing</h2>
        <p className="pricing-sub">Start free. Upgrade when you're ready to go unlimited.</p>
        <div className="pricing-grid">
          <article className="price-card">
            <h3>Free</h3>
            <p className="price">$0</p>
            <ul>
              <li><Check aria-hidden="true" /> 3 exports per month</li>
              <li><Check aria-hidden="true" /> Every template & size</li>
              <li><Check aria-hidden="true" /> One saved profile</li>
            </ul>
            <Link to="/app" className="btn-secondary block">Start free</Link>
          </article>

          <article className="price-card featured">
            <span className="price-badge">First 20 buyers</span>
            <h3>Lifetime</h3>
            <p className="price">$10<small> once</small></p>
            <p className="price-note">Then $17 — lock in founding members pricing now</p>
            <ul>
              <li><Check aria-hidden="true" /> Unlimited exports</li>
              <li><Check aria-hidden="true" /> No watermark</li>
              <li><Check aria-hidden="true" /> Unlimited saved profiles</li>
              <li><Check aria-hidden="true" /> Pay once, keep forever</li>
            </ul>
            <Link to="/app?checkout=lifetime" className="btn-primary block">Get lifetime</Link>
          </article>

          <article className="price-card">
            <h3>Monthly</h3>
            <p className="price">$5<small>/mo</small></p>
            <ul>
              <li><Check aria-hidden="true" /> Unlimited exports</li>
              <li><Check aria-hidden="true" /> No watermark</li>
              <li><Check aria-hidden="true" /> Unlimited saved profiles</li>
              <li><Check aria-hidden="true" /> Cancel anytime</li>
            </ul>
            <Link to="/app?checkout=monthly" className="btn-secondary block">Go monthly</Link>
          </article>
        </div>
      </section>

      <section className="cta-band">
        <h2>Your next post could be your next Instagram image.</h2>
        <Link to="/app" className="btn-primary">Open Notes2Pics</Link>
      </section>
    </MarketingLayout>
  )
}
