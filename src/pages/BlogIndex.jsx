import { Link } from 'react-router-dom'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'
import { posts, formatPostDate } from '../lib/posts'

export default function BlogIndex() {
  return (
    <MarketingLayout>
      <Seo
        title="Blog"
        description="Guides on content repurposing, growing on X and Threads, and turning your posts into images that get reach."
        path="/blog"
      />

      <div className="blog-index">
        <header className="blog-index-head">
          <p className="hero-eyebrow">The Notes2Pics blog</p>
          <h1>Repurpose smarter. Grow faster.</h1>
          <p>Practical guides on turning your writing into images that travel.</p>
        </header>

        {posts.length === 0 ? (
          <p className="blog-empty">No posts yet — check back soon.</p>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <Link className="post-card" to={`/blog/${post.slug}`} key={post.slug}>
                <div className="post-card-body">
                  <div className="post-card-meta">
                    <time>{formatPostDate(post.date)}</time>
                    <span>· {post.readingTime} min read</span>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.description}</p>
                  {post.tags.length ? (
                    <div className="post-tags">
                      {post.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MarketingLayout>
  )
}
