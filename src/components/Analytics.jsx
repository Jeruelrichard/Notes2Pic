import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackPageview } from '../lib/analytics'

// Loads GA4 once and fires a page_view on every client-side route change.
// Renders nothing; all work is in effects, so it is inert during SSR/prerender.
export default function Analytics() {
  const location = useLocation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}
