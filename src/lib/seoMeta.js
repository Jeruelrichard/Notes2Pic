import { posts, getPost } from './posts'

export const SITE_NAME = 'Notes2Pics'
export const DEFAULT_DESCRIPTION =
  'Turn your X, Threads, and Substack posts into clean, Instagram-ready images in seconds.'

// Single source of truth for per-route <head> metadata, used by both the
// client <Seo> component and the build-time prerender.
export function getMetaForPath(pathname) {
  if (pathname === '/' || pathname === '') {
    return { title: `${SITE_NAME} — post-to-image studio`, description: DEFAULT_DESCRIPTION, path: '/' }
  }
  if (pathname === '/app') {
    return { title: `Studio | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, path: '/app' }
  }
  if (pathname === '/blog') {
    return {
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
      return { title: `${post.title} | ${SITE_NAME}`, description: post.description, path: pathname }
    }
  }
  return { title: `${SITE_NAME} — post-to-image studio`, description: DEFAULT_DESCRIPTION, path: pathname }
}

// Every path the prerender step should emit as static HTML (the SPA /app route
// is intentionally excluded — it stays client-rendered).
export function listPrerenderPaths() {
  return ['/', '/blog', ...posts.map((post) => `/blog/${post.slug}`)]
}
