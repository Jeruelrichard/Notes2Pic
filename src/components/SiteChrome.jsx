import { Link, NavLink } from 'react-router-dom'

const markSrc = '/notes2pics-mark-v2-quote-standalone.svg'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand">
          <img src={markSrc} alt="" width="26" height="26" />
          <span>Notes2Pic</span>
        </Link>
        <nav className="site-nav">
          <NavLink to="/blog" className={({ isActive }) => (isActive ? 'active' : '')}>
            Blog
          </NavLink>
          <Link to="/app" className="site-nav-cta">
            Open app
          </Link>
        </nav>
      </div>
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
          <Link to="/blog">Blog</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <a href="/sitemap.xml">Sitemap</a>
          <a href="/rss.xml">RSS</a>
        </nav>
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
