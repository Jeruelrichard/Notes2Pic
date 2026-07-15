import { useEffect } from 'react'
import { getMetaForPath, buildJsonLd, SITE_NAME, DEFAULT_DESCRIPTION } from '../lib/seoMeta'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function setJsonLd(obj) {
  let el = document.head.querySelector('script[type="application/ld+json"]')
  if (!el) {
    el = document.createElement('script')
    el.setAttribute('type', 'application/ld+json')
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(obj)
}

// Client-side head management. The prerender step writes the same tags into the
// static HTML, so crawlers get them without running JS; this keeps them correct
// after client-side navigation. Meta comes from getMetaForPath (single source),
// with optional title/description overrides for callers that pass them.
export default function Seo({ title, description, path }) {
  useEffect(() => {
    const routePath = path || window.location.pathname
    const meta = getMetaForPath(routePath)
    const origin = window.location.origin

    const resolvedTitle = title ? `${title} | ${SITE_NAME}` : meta.title
    const desc = description || meta.description || DEFAULT_DESCRIPTION
    const url = origin + (meta.path || routePath)
    const image = origin + (meta.image || '/og-image.png')

    document.title = resolvedTitle
    setMeta('name', 'description', desc)
    setLink('canonical', url)
    setMeta('name', 'robots', meta.noindex ? 'noindex, follow' : '')

    setMeta('property', 'og:title', resolvedTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:type', meta.type || 'website')
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:image', image)
    setMeta('property', 'article:published_time', meta.publishedTime || '')
    setMeta('property', 'article:modified_time', meta.modifiedTime || '')
    setMeta('property', 'article:author', meta.author || '')

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', resolvedTitle)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', image)

    setJsonLd(buildJsonLd(meta, origin))
  }, [title, description, path])

  return null
}
