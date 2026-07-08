import { Link, NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand">
          <Sparkles aria-hidden="true" />
          <span>Notes2Pics</span>
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
          <Sparkles aria-hidden="true" />
          <span>Notes2Pics</span>
          <p>Turn your posts into Instagram-ready images.</p>
        </div>
        <nav className="site-footer-links">
          <Link to="/app">App</Link>
          <Link to="/blog">Blog</Link>
          <a href="/sitemap.xml">Sitemap</a>
          <a href="/rss.xml">RSS</a>
        </nav>
      </div>
      <div className="site-footer-legal">
        © {new Date().getFullYear()} Notes2Pics. All rights reserved.
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
