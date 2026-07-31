import { Link } from 'react-router-dom'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'

export default function About() {
  return (
    <MarketingLayout>
      <Seo
        title="About Us"
        description="The story and team behind Notes2Pic — a text-first image studio built for writers."
        path="/about"
      />

      <div className="about-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px 80px' }}>
        <header className="about-hero" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="about-eyebrow" style={{
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--clay)',
            display: 'block',
            marginBottom: '8px'
          }}>Our Story</span>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '44px',
            lineHeight: '1.2',
            fontWeight: '800',
            color: 'var(--ink)',
            marginBottom: '16px'
          }}>Built by a writer, for writers.</h1>
          <p className="about-subhead" style={{
            fontSize: '18px',
            color: 'var(--muted)',
            lineHeight: '1.5'
          }}>Notes2Pic is a bootstrapped, single-person project created to give creators full formatting control over their social media shares.</p>
        </header>

        <div className="about-body" style={{
          fontSize: '16px',
          color: 'var(--ink-soft)',
          lineHeight: '1.7'
        }}>
          <p style={{ marginBottom: '24px' }}>
            Hi, I’m <strong>Jeruel Richard</strong>, the creator of Notes2Pic.
          </p>
          <p style={{ marginBottom: '24px' }}>
            Like many writers, I used to spend hours copy-pasting my written posts from Substack and X into Canva or Figma to turn them into Instagram-ready carousels. It was a tedious process of nudging text boxes, scaling avatars, and fighting browser screenshot crops.
          </p>
          <p style={{ marginBottom: '24px' }}>
            I tried using automated link-to-image screenshot generators, but they constantly broke because of social platforms blocking scrapers, rate limiting APIs, or changing their HTML layouts. Plus, they were cluttered and didn't support clean medium-form text formatting.
          </p>
          
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            color: 'var(--ink)',
            marginTop: '40px',
            marginBottom: '16px'
          }}>The Manual-First Philosophy</h2>
          <p style={{ marginBottom: '24px' }}>
            I decided to build a tool that does one job perfectly: a <strong>manual-first text-to-image studio</strong>. Instead of trying to crawl links (which will always fail eventually), Notes2Pic puts the editor in your hands. You write or paste your text, upload your avatar, select a styling preset, and export a high-res PNG in seconds.
          </p>
          <p style={{ marginBottom: '24px' }}>
            This design yields three major benefits:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '24px', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '12px' }}><strong>Zero Downtime:</strong> Because it renders directly in your browser without hitting third-party APIs, Notes2Pic is 100% immune to X/Twitter blocks or scraper rate limits.</li>
            <li style={{ marginBottom: '12px' }}><strong>Full Creative Control:</strong> You can edit typography, line breaks, indentation, handles, and avatars exactly the way you want them to display.</li>
            <li style={{ marginBottom: '12px' }}><strong>Privacy First:</strong> Your text and images are processed completely on your local device. We never upload or save your post contents to our servers.</li>
          </ul>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            color: 'var(--ink)',
            marginTop: '40px',
            marginBottom: '16px'
          }}>Transparency and Trust</h2>
          <p style={{ marginBottom: '24px' }}>
            Notes2Pic operates transparently. It is not owned by a giant corporation or funded by VC money. It is a solo, self-funded project. When you pay for a plan or write in for support, you are speaking directly to me. 
          </p>
          <p style={{ marginBottom: '32px' }}>
            Thank you for supporting independent software development. If you ever have questions, bugs, or feature ideas, please head to our <Link to="/contact" style={{ color: 'var(--clay)', textDecoration: 'underline' }}>Contact Page</Link> and let me know.
          </p>

          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link to="/app" className="btn-primary" style={{
              display: 'inline-block',
              background: 'var(--clay)',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '6px',
              fontWeight: '600',
              textDecoration: 'none'
            }}>Open the Studio</Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  )
}
