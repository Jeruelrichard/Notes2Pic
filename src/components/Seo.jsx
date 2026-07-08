import { useEffect } from 'react'

const SITE_NAME = 'Notes2Pics'
const DEFAULT_DESCRIPTION =
  'Turn your X, Threads, and Substack posts into clean, Instagram-ready images in seconds.'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  if (!href) return
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

// Client-side head management. The prerender step writes the same tags into
// the static HTML, so crawlers get them without running JS.
export default function Seo({ title, description, path }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — post-to-image studio`
    const desc = description || DEFAULT_DESCRIPTION
    const url = path ? `${window.location.origin}${path}` : window.location.href

    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', url)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    setCanonical(url)
  }, [title, description, path])

  return null
}
