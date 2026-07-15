import { posts, getPost } from './posts'

export const SITE_NAME = 'Notes2Pic'
export const DEFAULT_DESCRIPTION =
  'Turn your X, Threads, and Substack posts into clean, Instagram-ready images in seconds.'
// Replace public/og-image.png with a real 1200×630 image (placeholder ships for now).
export const DEFAULT_OG_IMAGE = '/og-image.png'
export const ORG_LOGO = '/icon-512.png'

// Single source of truth for per-route <head> metadata, used by both the
// client <Seo> component and the build-time prerender.
export function getMetaForPath(pathname) {
  const base = { type: 'website', image: DEFAULT_OG_IMAGE }

  if (pathname === '/' || pathname === '') {
    return { ...base, title: `${SITE_NAME} — post-to-image studio`, description: DEFAULT_DESCRIPTION, path: '/' }
  }
  if (pathname === '/app') {
    return { ...base, title: `Studio | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, path: '/app' }
  }
  if (pathname === '/blog') {
    return {
      ...base,
      title: `Blog | ${SITE_NAME}`,
      description:
        'Guides on content repurposing, growing on X and Threads, and turning your posts into images that get reach.',
      path: '/blog',
    }
  }
  if (pathname.startsWith('/blog/')) {
    const slug = pathname.replace('/blog/', '').replace(/\/$/, '')
    const post = getPost(slug)
    if (post) {
      return {
        title: `${post.title} | ${SITE_NAME}`,
        description: post.description,
        path: pathname,
        type: 'article',
        image: post.cover || DEFAULT_OG_IMAGE,
        publishedTime: post.date,
        modifiedTime: post.updated || post.date,
        author: post.author,
        post,
      }
    }
    // Unknown slug: don't let a soft-404 get indexed.
    return { ...base, title: `Post not found | ${SITE_NAME}`, description: '', path: pathname, noindex: true }
  }
  if (pathname === '/privacy') {
    return {
      ...base,
      title: `Privacy Policy | ${SITE_NAME}`,
      description: 'How Notes2Pic collects, uses, and protects your data.',
      path: '/privacy',
    }
  }
  if (pathname === '/terms') {
    return {
      ...base,
      title: `Terms of Service | ${SITE_NAME}`,
      description: 'The terms that govern your use of Notes2Pic.',
      path: '/terms',
    }
  }
  return { ...base, title: `${SITE_NAME} — post-to-image studio`, description: DEFAULT_DESCRIPTION, path: pathname }
}

// JSON-LD graph for a route. `origin` is the absolute site origin (no trailing
// slash). Emitted as one <script type="application/ld+json"> with an @graph so
// crawlers and AI engines get Organization + WebSite everywhere, and
// BlogPosting + BreadcrumbList (+ FAQPage) on articles.
export function buildJsonLd(meta, origin) {
  const abs = (p) => `${origin}${p}`
  const graph = [
    {
      '@type': 'Organization',
      '@id': abs('/#organization'),
      name: SITE_NAME,
      url: abs('/'),
      logo: { '@type': 'ImageObject', url: abs(ORG_LOGO) },
    },
    {
      '@type': 'WebSite',
      '@id': abs('/#website'),
      name: SITE_NAME,
      url: abs('/'),
      publisher: { '@id': abs('/#organization') },
    },
  ]

  const post = meta.post
  if (post) {
    const postUrl = abs(`/blog/${post.slug}`)
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${postUrl}#article`,
      headline: post.title,
      description: post.description,
      datePublished: post.date || undefined,
      dateModified: post.updated || post.date || undefined,
      author: { '@type': 'Person', name: post.author },
      publisher: { '@id': abs('/#organization') },
      image: abs(post.cover || DEFAULT_OG_IMAGE),
      mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
      url: postUrl,
      ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
    })
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: abs('/blog') },
        { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
      ],
    })
    if (post.faq?.length) {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      })
    }
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

// Every path the prerender step should emit as static HTML (the SPA /app route
// is intentionally excluded — it stays client-rendered).
export function listPrerenderPaths() {
  return ['/', '/blog', '/privacy', '/terms', ...posts.map((post) => `/blog/${post.slug}`)]
}
