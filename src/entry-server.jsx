/* eslint-disable react-refresh/only-export-components -- SSR build entry, not a Fast Refresh module */
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import AppShell from './AppShell'
import { getMetaForPath } from './lib/seoMeta'

export { listPrerenderPaths, buildJsonLd, DEFAULT_DESCRIPTION } from './lib/seoMeta'
export { posts } from './lib/posts'

// Rendered at build time by scripts/prerender.mjs for each marketing/blog route.
export function render(url) {
  const html = renderToString(
    <StaticRouter location={url}>
      <AppShell />
    </StaticRouter>,
  )
  return { html, meta: getMetaForPath(url) }
}
