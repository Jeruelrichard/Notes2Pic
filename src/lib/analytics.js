// GA4 analytics, gated on the VITE_GA4_ID env var so it is a no-op in dev and
// anywhere the ID isn't set. The gtag script is injected client-side only, so
// prerendered static HTML ships without any tracking until hydration.
const GA_ID = import.meta.env.VITE_GA4_ID
let started = false

export const analyticsEnabled = Boolean(GA_ID)

export function initAnalytics() {
  if (started || !GA_ID || typeof window === 'undefined') return
  started = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  // gtag pushes to dataLayer synchronously; queued calls run once the async
  // script loads, so page_view events fired before load are not lost.
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  // SPA: we send page_view manually on each route change instead of on load.
  gtag('config', GA_ID, { send_page_view: false })
}

export function trackPageview(path) {
  if (!GA_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}
