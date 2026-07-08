import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BlogIndex from './pages/BlogIndex'
import BlogPost from './pages/BlogPost'

// Lazy-load the studio so the marketing/blog pages don't ship the heavy
// editor bundle (Supabase, html-to-image, etc.). Keeps landing fast for SEO.
const App = lazy(() => import('./App'))

// Central route table, shared by the client entry and the prerender step.
export default function AppShell() {
  return (
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
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
