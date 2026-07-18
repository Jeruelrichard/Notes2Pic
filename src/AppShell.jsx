import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import BlogIndex from './pages/BlogIndex'
import BlogPost from './pages/BlogPost'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import ToolPage from './pages/ToolPage'
import { TOOL_PAGES } from './lib/toolPages'
import Analytics from './components/Analytics'

// Lazy-load the studio so the marketing/blog pages don't ship the heavy
// editor bundle (Supabase, html-to-image, etc.). Keeps landing fast for SEO.
const App = lazy(() => import('./App'))

// On SPA navigation the browser keeps the old scroll position, so following a
// footer link from the bottom of one page lands you at the bottom of the next.
// Reset to the top on every route change — unless there's a hash, which the
// target page scrolls to itself.
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

// Central route table, shared by the client entry and the prerender step.
export default function AppShell() {
  return (
    <>
      <ScrollToTop />
      <Analytics />
      <Routes>
        <Route path="/" element={<Landing />} />
      <Route
        path="/app"
        element={
          <Suspense fallback={<div className="route-loading">Loading studio…</div>}>
            <App />
          </Suspense>
        }
      />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      {TOOL_PAGES.map((page) => (
        <Route key={page.path} path={page.path} element={<ToolPage />} />
      ))}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Landing />} />
      </Routes>
    </>
  )
}
