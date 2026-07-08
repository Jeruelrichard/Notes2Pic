import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MarketingLayout } from '../components/SiteChrome'
import Seo from '../components/Seo'
import { getPost, formatPostDate } from '../lib/posts'

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)

  if (!post) {
    return (
      <MarketingLayout>
        <Seo title="Post not found" path={`/blog/${slug}`} />
        <div className="blog-post">
          <h1>Post not found</h1>
          <p>
            That article doesn't exist. <Link to="/blog">Back to the blog</Link>.
          </p>
        </div>
      </MarketingLayout>
    )
  }

  return (
    <MarketingLayout>
      <Seo title={post.title} description={post.description} path={`/blog/${post.slug}`} />

      <article className="blog-post">
        <nav className="breadcrumb">
          <Link to="/blog">
            <ArrowLeft aria-hidden="true" /> Blog
          </Link>
        </nav>

        <header className="blog-post-head">
          <div className="post-card-meta">
            <time>{formatPostDate(post.date)}</time>
            <span>· {post.readingTime} min read</span>
          </div>
          <h1>{post.title}</h1>
          {post.description ? <p className="blog-post-lede">{post.description}</p> : null}
        </header>

        <div className="blog-post-layout">
          {post.toc.length ? (
            <aside className="blog-toc" aria-label="Table of contents">
              <p className="blog-toc-title">On this page</p>
              <ul>
                {post.toc.map((item) => (
                  <li key={item.id} className={item.depth === 3 ? 'sub' : ''}>
                    <a href={`#${item.id}`}>{item.text}</a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}

          <div
            className="blog-post-body"
            // Content is authored by us in trusted markdown files.
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </div>

        <div className="blog-post-cta">
          <h2>Turn your posts into images</h2>
          <p>Notes2Pics does exactly what this article describes — free to start.</p>
          <Link to="/app" className="btn-primary">Try Notes2Pics</Link>
        </div>
      </article>
    </MarketingLayout>
  )
}
