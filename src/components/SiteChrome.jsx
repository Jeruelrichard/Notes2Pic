import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../lib/useAuth'
import { scrollToHashTarget } from '../lib/scrollTo'

const markSrc = '/notes2pics-mark-v2-quote-standalone.svg'

// Small signed-in indicator for the marketing/tool pages, so a visitor who
// signs in from the download prompt can see they're now authenticated without
// having to open the studio. Links to /app (where the full account UI lives).
function AccountChip({ user }) {
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
  const initial = (user.email?.[0] || '?').toUpperCase()
  return (
    <Link to="/app" className="account-chip" title={`Signed in as ${user.email}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" width="30" height="30" referrerPolicy="no-referrer" />
      ) : (
        <span className="account-initial">{initial}</span>
      )}
    </Link>
  )
}

export function SiteHeader() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  // "Pricing" always ends in a smooth scroll to the pricing CARDS. We avoid a
  // URL hash entirely — the browser's native jump-to-anchor lands sharply on the
  // section top and fights our smooth scroll. On the landing we scroll directly;
  // from another page we flag the intent and SPA-navigate home, where the
  // landing reads the flag and scrolls.
  const handlePricing = (event) => {
    event.preventDefault()
    close()
    if (document.getElementById('pricing')) {
      scrollToHashTarget('pricing')
    } else {
      sessionStorage.setItem('scrollToPricing', '1')
      navigate('/')
    }
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand" onClick={close}>
          <img src={markSrc} alt="" width="26" height="26" />
          <span>Notes2Pic</span>
        </Link>
        <nav className="site-nav">
          {/* Plain anchor (not Link) so it works from any page: on the landing it
              smooth-scrolls to the pricing cards; elsewhere it navigates home first. */}
          <a href="/#pricing" onClick={handlePricing}>Pricing</a>
          <NavLink to="/blog" className={({ isActive }) => (isActive ? 'active' : '')}>
            Blog
          </NavLink>
        </nav>
        <div className="site-header-actions">
          {user ? <AccountChip user={user} /> : (
            <Link to="/app" className="site-nav-cta">
              Open app
            </Link>
          )}
          <button
            type="button"
            className="site-hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav className="site-menu-mobile">
          <a href="/#pricing" onClick={handlePricing}>Pricing</a>
          <NavLink to="/blog" onClick={close}>Blog</NavLink>
          <Link to="/app" onClick={close}>Open app</Link>
          {user ? <span className="site-menu-email">Signed in as {user.email}</span> : null}
        </nav>
      ) : null}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img src={markSrc} alt="" width="24" height="24" />
          <span>Notes2Pic</span>
          <p>Turn your posts into Instagram-ready images.</p>
        </div>
        <nav className="site-footer-links">
          <Link to="/app">App</Link>
          <Link to="/thread-to-carousel">Free tools</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="/sitemap.xml">Sitemap</a>
          <a href="/rss.xml">RSS</a>
          <a href="https://useneedle.net/directory/notes2pic" target="_blank" rel="noopener">
            Needle
          </a>
        </nav>
        <a
          className="site-footer-badge"
          href="https://www.producthunt.com/products/notes2pic?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-notes2pic"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            alt="Notes2Pic - Threads, Tweets & Notes → Instagram carousels. 10 seconds. | Product Hunt"
            width="250"
            height="54"
            loading="lazy"
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1199762&theme=light&t=1784371056412"
          />
        </a>
      </div>
      <div className="site-footer-legal">
        © {new Date().getFullYear()} Notes2Pic. All rights reserved.
      </div>
    </footer>
  )
}

// Shared shell for marketing/blog pages.
export function MarketingLayout({ children }) {
  return (
    <div className="marketing">
      <SiteHeader />
      <main className="marketing-main">{children}</main>
      <SiteFooter />
    </div>
  )
}
