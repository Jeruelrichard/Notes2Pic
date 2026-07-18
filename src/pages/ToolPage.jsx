import { lazy, Suspense, useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'
import { getToolPage } from '../lib/toolPages'
import { getPost } from '../lib/posts'

// The interactive tool is client-only (canvas + auth) and heavy (JSZip,
// Supabase), so it's lazy-loaded and only mounted after hydration. During
// prerender/SSR we render a lightweight static preview of the same input, so
// crawlers still see a real, populated tool — the marketing copy and FAQ below
// are always in the static HTML.
const CarouselTool = lazy(() => import('../components/CarouselTool'))

// Hydration-safe "are we on the client yet?" — false during SSR/first paint,
// true after hydration, without a setState-in-effect.
const noopSubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

function ToolSkeleton({ demo }) {
  return (
    <div className="tool tool-skeleton" aria-hidden="true">
      <div className="tool-input">
        <span className="tool-label">Your thread</span>
        <textarea className="tool-textarea" defaultValue={demo} readOnly tabIndex={-1} />
      </div>
      <div className="tool-preview">
        <div className="tool-canvas tool-canvas-placeholder">Loading preview…</div>
      </div>
    </div>
  )
}

// One template, every free tool page. Content comes from the TOOL_PAGES config
// keyed by pathname, so adding page #2/#3 is a config entry + a route — no new
// component. Currently backs the carousel tool; branch here if a future tool
// needs a different widget.
export default function ToolPage() {
  const { pathname } = useLocation()
  const config = getToolPage(pathname)
  const mounted = useHydrated()

  if (!config) {
    return (
      <MarketingLayout>
        <Seo title="Tool not found" path={pathname} />
        <div className="tool-page">
          <h1>Tool not found</h1>
          <p>
            That tool doesn’t exist. <Link to="/app">Open the studio</Link> instead.
          </p>
        </div>
      </MarketingLayout>
    )
  }

  const related = config.related ? getPost(config.related.slug) : null

  return (
    <MarketingLayout>
      <Seo path={config.path} />

      <div className="tool-page">
        <header className="tool-hero">
          {config.eyebrow ? <span className="tool-eyebrow">{config.eyebrow}</span> : null}
          <h1>{config.h1}</h1>
          <p className="tool-subhead">{config.subhead}</p>
        </header>

        <section className="tool-stage" aria-label="Carousel maker">
          {mounted ? (
            <Suspense fallback={<ToolSkeleton demo={config.demo} />}>
              <CarouselTool config={config} />
            </Suspense>
          ) : (
            <ToolSkeleton demo={config.demo} />
          )}
        </section>

        {config.steps?.length ? (
          <section className="tool-steps" aria-label="How it works">
            <h2>How it works</h2>
            <ol>
              {config.steps.map((step, i) => (
                <li key={i}>
                  <span className="tool-step-num">{i + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {config.faq?.length ? (
          <section className="tool-faq" aria-label="Frequently asked questions">
            <h2>Frequently asked questions</h2>
            <dl>
              {config.faq.map((item, i) => (
                <div key={i} className="tool-faq-item">
                  <dt>{item.q}</dt>
                  <dd>{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {related ? (
          <aside className="tool-related" aria-label="Related reading">
            <span className="tool-related-kicker">Go deeper</span>
            <Link to={`/blog/${related.slug}`}>{config.related.label} →</Link>
          </aside>
        ) : null}
      </div>
    </MarketingLayout>
  )
}
