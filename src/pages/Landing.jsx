import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clipboard, Download, Sparkles } from 'lucide-react'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'
import { scrollToHashTarget } from '../lib/scrollTo'

const QUERY = '(prefers-reduced-motion: reduce)'
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(QUERY)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(QUERY).matches,
    () => false, // server snapshot: assume motion allowed, effect corrects on client
  )
}

// 👉 Bump this as lifetime deals sell. Shown on the hero note and the pricing
// card. Keep it honest — it's a real promise, not a fake urgency ticker.
export const LIFETIME_SPOTS_LEFT = 19

const slides = ['/slide-01.png', '/slide-02.png', '/slide-03.png', '/slide-04.png']

function SlideCarousel() {
  // A CSS-driven auto-advancing carousel. The track holds all four slides plus a
  // clone of the first, so the loop point (last keyframe) lands on an identical
  // frame and the restart is seamless — no visible rewind.
  const frames = [...slides, slides[0]]
  return (
    <div className="output-frame carousel" role="img" aria-label="Four carousel slides auto-advancing like a real Instagram carousel.">
      <div className="carousel-track">
        {frames.map((src, i) => (
          <div className="carousel-slide" key={i}>
            <img
              src={src}
              alt={`Instagram carousel slide ${(i % slides.length) + 1} made from a Twitter thread with Notes2Pic`}
              loading="lazy"
              width="1080"
              height="1350"
            />
          </div>
        ))}
      </div>
      <div className="carousel-dots" aria-hidden="true">
        {slides.map((_, i) => (
          <span className="carousel-dot" key={i} style={{ '--i': i }} />
        ))}
      </div>
    </div>
  )
}

function HeroDemo() {
  // A real screen recording of the app (essay → thread, then tweet → card),
  // compressed to a light silent loop. Under reduced-motion we hold the poster
  // frame instead of autoplaying.
  const reduced = usePrefersReducedMotion()

  return (
    <div className="demo" aria-hidden="true">
      <video
        className="demo-video"
        src="/hero-demo.mp4"
        poster="/hero-demo-poster.jpg"
        autoPlay={!reduced}
        loop
        muted
        playsInline
        preload="metadata"
      />
    </div>
  )
}

const steps = [
  {
    n: '1',
    title: 'Paste your post',
    body: 'Drop in the text you already wrote for X, Threads, or Substack. No blank canvas to stare at.',
  },
  {
    n: '2',
    title: 'Pick a style',
    body: 'Choose a template and size, save your name, handle, and avatar once, and it stays yours.',
  },
  {
    n: '3',
    title: 'Export the image',
    body: 'Download a crisp, high-res PNG — ready to post. Carousels come out as a tidy zip.',
  },
]

const honestPoints = [
  {
    title: 'Your account stays yours',
    body: 'Notes2Pic never asks for your login and never posts on your behalf. Paste a link and we read the public post for you, or paste the text yourself — either way, nothing is connected to your account.',
  },
  {
    title: 'Free where it counts',
    body: 'Editing and previewing are always free and need no account. You only sign in to export.',
  },
  {
    title: 'One thing, done well',
    body: 'Not an AI content generator. It turns the words you already wrote into images that look like you.',
  },
]

export default function Landing() {
  // Smooth-scroll to the pricing cards when arriving with that intent — either a
  // sessionStorage flag set by the header's "Pricing" link, or a #pricing hash
  // (bookmarks / old links). We strip the hash first so the browser's native
  // jump-to-anchor doesn't fight our smooth, card-centred scroll. The ref guard
  // (and NOT returning the cancel) makes this survive StrictMode's double-invoke,
  // which would otherwise consume the flag then cancel the scroll.
  const didPricingScroll = useRef(false)
  useEffect(() => {
    if (didPricingScroll.current) return
    const wantsPricing =
      window.location.hash.slice(1) === 'pricing' ||
      sessionStorage.getItem('scrollToPricing') === '1'
    if (!wantsPricing) return
    didPricingScroll.current = true
    sessionStorage.removeItem('scrollToPricing')
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    scrollToHashTarget('pricing')
  }, [])

  return (
    <MarketingLayout>
      <Seo path="/" />

      <section className="hero">
        <div className="hero-copy">
          <p className="hero-tag">
            <span className="dot" />
            For writers on X, Threads &amp; Substack
          </p>
          <h1>
            Turn your tweets &amp; threads into <em>Instagram images worth sharing.</em>
          </h1>
          <p className="hero-sub">
            You already write the good stuff. Notes2Pic turns your tweets, threads, and Substack
            notes into clean images and Instagram carousels &mdash; in seconds, free to start, no
            design tool needed.
          </p>
          <div className="hero-actions">
            <Link to="/app?checkout=lifetime" className="btn-primary">
              <Sparkles aria-hidden="true" />
              Get lifetime &mdash; $10
            </Link>
            <Link to="/app" className="btn-secondary">
              <Download aria-hidden="true" />
              Start free
            </Link>
          </div>
          <p className="hero-note">
            <strong>Free to start</strong> &mdash; no card, no signup to preview
            <span className="sep" />
            $10 lifetime for the first 20 buyers, then $17 &mdash;{' '}
            <strong>{LIFETIME_SPOTS_LEFT} left</strong>
          </p>
        </div>

        <HeroDemo />
      </section>

      <section className="outputs">
        <div className="section-shell">
          <div className="section-head center">
            <span className="section-kicker">Three ways to post</span>
            <h2>One post. Every format you need.</h2>
            <p>
              Short cards that look native to each platform, medium-form quotes with room to
              breathe, and long threads auto-split into Instagram carousel slides.
            </p>
          </div>

          <div className="outputs-grid">
            <div className="output-col">
              <div className="output-frame square">
                <img
                  src="/notes2pics-short-square.png"
                  alt="A short post exported as a branded, Instagram-ready Notes2Pic image."
                  loading="lazy"
                  width="1080"
                  height="1080"
                />
              </div>
              <div className="output-caption">
                <h3>Short posts</h3>
                <p>Verified-looking cards with the handle, date, and layout of the real thing.</p>
              </div>
            </div>

            <div className="output-col mid">
              <div className="output-frame square">
                <img
                  src="/notes2pics-medium-square.png"
                  alt="A medium-form quote set on a clean canvas as a Notes2Pic image."
                  loading="lazy"
                  width="1080"
                  height="1080"
                />
              </div>
              <div className="output-caption">
                <h3>Medium form</h3>
                <p>A single strong line, set as a quote on a clean canvas. Light or dark.</p>
              </div>
            </div>

            <div className="output-col">
              <SlideCarousel />
              <div className="output-caption">
                <h3>Carousels</h3>
                <p>Long text split into readable slides and exported as a ready-to-post zip.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-head">
          <span className="section-kicker">How it works</span>
          <h2>From written to posted in three steps.</h2>
        </div>
        <div className="steps-grid">
          {steps.map((s, idx) => (
            <article className="step" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {idx < steps.length - 1 && <ArrowRight aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="honest">
        <div className="section-shell">
          <div className="honest-lead">
            <h2>Honest about what it is.</h2>
            <p>
              Notes2Pic is a small tool made by a writer, for writers. It does one job, and it&rsquo;s
              upfront about the rest.
            </p>
          </div>
          <ul className="honest-list">
            {honestPoints.map((p) => (
              <li className="honest-item" key={p.title}>
                <Check aria-hidden="true" />
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="testimonial">
        <div className="section-shell">
          <div className="section-head center">
            <span className="section-kicker">From a real user</span>
            <h2>People are already posting with it.</h2>
          </div>
          <figure className="testimonial-figure">
            <img
              src="/testimonial1.png"
              alt="A Notes2Pic user sharing how the tool helped them turn their writing into images."
              width="1080"
              height="1080"
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      <section className="section-shell pricing" id="pricing">
        <div className="section-head center">
          <span className="section-kicker">Pricing</span>
          <h2>Start free. Go unlimited for the price of a coffee.</h2>
          <p>Editing and previewing are always free. Paid removes the watermark and the limits.</p>
        </div>

        <div className="pricing-grid">
          <article className="price-card featured">
            <span className="price-badge">{LIFETIME_SPOTS_LEFT} of 20 left</span>
            <span className="price-plan">Lifetime</span>
            <p className="price">
              $10<small>once</small>
            </p>
            <p className="price-note">
              Then $17 &mdash; founding-member price, locked in forever.{' '}
              <strong>Only {LIFETIME_SPOTS_LEFT} spots left.</strong>
            </p>
            <ul className="price-list">
              <li><Check aria-hidden="true" /> Unlimited exports</li>
              <li><Check aria-hidden="true" /> Unlimited carousels</li>
              <li><Check aria-hidden="true" /> Unlimited AI thread generations</li>
              <li><Check aria-hidden="true" /> No watermark</li>
              <li><Check aria-hidden="true" /> Unlimited saved profiles</li>
              <li><Check aria-hidden="true" /> Pay once, keep forever</li>
            </ul>
            <Link to="/app?checkout=lifetime" className="btn-primary block">
              Get lifetime
            </Link>
          </article>

          <article className="price-card">
            <span className="price-plan">Free</span>
            <p className="price">$0</p>
            <p className="price-note-plain">No account needed to edit &amp; preview</p>
            <ul className="price-list">
              <li><Check aria-hidden="true" /> 3 exports per month</li>
              <li><Check aria-hidden="true" /> 1 carousel per month</li>
              <li><Check aria-hidden="true" /> 1 AI thread generation</li>
              <li><Check aria-hidden="true" /> Every template &amp; size</li>
              <li><Check aria-hidden="true" /> One saved profile</li>
            </ul>
            <Link to="/app" className="btn-secondary block">
              Start free
            </Link>
          </article>

          <article className="price-card">
            <span className="price-plan">Monthly</span>
            <p className="price">
              $5<small>/mo</small>
            </p>
            <p className="price-note-plain">Prefer to pay as you go</p>
            <ul className="price-list">
              <li><Check aria-hidden="true" /> Unlimited exports</li>
              <li><Check aria-hidden="true" /> Unlimited carousels</li>
              <li><Check aria-hidden="true" /> Unlimited AI thread generations</li>
              <li><Check aria-hidden="true" /> No watermark</li>
              <li><Check aria-hidden="true" /> Unlimited saved profiles</li>
              <li><Check aria-hidden="true" /> Cancel anytime</li>
            </ul>
            <Link to="/app?checkout=monthly" className="btn-secondary block">
              Go monthly
            </Link>
          </article>
        </div>
      </section>

      <section className="close-band">
        <div className="close-inner">
          <h2>
            Your next post could be your next <em>image worth sharing.</em>
          </h2>
          <div className="close-actions">
            <Link to="/app?checkout=lifetime" className="btn-primary">
              <Sparkles aria-hidden="true" />
              Get lifetime &mdash; $10
            </Link>
            <Link to="/app" className="btn-secondary">
              <Clipboard aria-hidden="true" />
              Try it free
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
