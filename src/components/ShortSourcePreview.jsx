import { Bookmark } from 'lucide-react'
import '../styles/postcard.css'

// The short-post card, shared by the studio (/app) and the free tool pages.
// Keeping one copy of this markup + one stylesheet is what guarantees the tool
// pages export exactly what the studio does.

const PRODUCT_WATERMARK = 'made with Notes2Pic'

export function VerifiedBadge({ color }) {
  return (
    <svg className="verified-badge" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill={color}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.68 2.62 13.43 1.75 12 1.75s-2.68.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
      />
      <path fill="#ffffff" d="M9.71 16.18 6.3 12.77l1.27-1.27 2.14 2.13 4.72-4.72 1.27 1.27z" />
    </svg>
  )
}

// crossOrigin is required so html-to-image can read the pixels on export —
// without it the canvas is tainted and the export silently fails. X's avatar
// CDN (pbs.twimg.com) serves `access-control-allow-origin: *`, so this works.
export function SourceAvatar({ avatar, initials }) {
  return (
    <div className="source-avatar">
      {avatar ? <img src={avatar} alt="" crossOrigin="anonymous" /> : <span>{initials}</span>}
    </div>
  )
}

function formatCount(value) {
  if (typeof value !== 'number' || value < 0) return null
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return String(value)
}

// Optional engagement row (replies / reposts / likes). Only rendered when a
// caller passes `metrics`, so the studio's cards are untouched.
function MetricsRow({ metrics }) {
  const items = [
    ['replies', metrics.replies],
    ['reposts', metrics.retweets],
    ['likes', metrics.likes],
  ]
    .map(([label, value]) => [label, formatCount(value)])
    .filter(([, value]) => value !== null)

  if (!items.length) return null
  return (
    <div className="x-metrics">
      {items.map(([label, value]) => (
        <span key={label}>
          <strong>{value}</strong> {label}
        </span>
      ))}
    </div>
  )
}

export default function ShortSourcePreview({
  avatarInitials,
  post,
  shortPostTextStyle,
  sourceKey,
  badgeDate,
  timestamp,
  watermark,
  metrics,
}) {
  const byline = watermark ? (
    <div className="card-watermark" aria-hidden="true">
      {PRODUCT_WATERMARK}
    </div>
  ) : null

  if (sourceKey === 'substack') {
    return (
      <article className="substack-card">
        <header className="substack-author">
          <div className="substack-author-left">
            <SourceAvatar avatar={post.avatar} initials={avatarInitials} />
            <div className="substack-author-copy">
              <strong>{post.name || 'Creator'}</strong>
              <span>{badgeDate}</span>
            </div>
          </div>
          <Bookmark aria-hidden="true" />
        </header>

        <p className="substack-text" style={shortPostTextStyle}>
          {post.text || 'Paste the post text here.'}
        </p>
        {byline}
      </article>
    )
  }

  if (sourceKey === 'threads') {
    return (
      <article className="threads-card">
        <header className="threads-author">
          <SourceAvatar avatar={post.avatar} initials={avatarInitials} />
          <div className="threads-author-meta">
            <strong>{post.username.replace(/^@/, '') || post.name || 'creator'}</strong>
            <VerifiedBadge color="#0095f6" />
            <span>{badgeDate}</span>
          </div>
        </header>

        <p className="threads-text" style={shortPostTextStyle}>
          {post.text || 'Paste the post text here.'}
        </p>
        {byline}
      </article>
    )
  }

  return (
    <article className="x-card">
      <header className="x-author">
        <SourceAvatar avatar={post.avatar} initials={avatarInitials} />
        <div className="x-author-copy">
          <span className="x-name-row">
            <strong>{post.name || 'Creator'}</strong>
            <VerifiedBadge color="#1d9bf0" />
          </span>
          <span className="x-handle">{post.username || '@username'}</span>
        </div>
      </header>

      <p className="x-text" style={shortPostTextStyle}>
        {post.text || 'Paste the post text here.'}
      </p>

      {metrics ? <MetricsRow metrics={metrics} /> : null}

      <footer className="x-footer">
        <span>{timestamp}</span>
        {byline}
      </footer>
    </article>
  )
}
