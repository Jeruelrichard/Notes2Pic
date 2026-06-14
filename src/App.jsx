import { useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  Download,
  ImagePlus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRoundCheck,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import './App.css'

const aspectOptions = {
  square: { label: 'Square', size: '1080 x 1080', width: 540, height: 540 },
  portrait: { label: 'Portrait', size: '1080 x 1350', width: 540, height: 675 },
  story: { label: 'Story', size: '1080 x 1920', width: 540, height: 960 },
}

const starterPost = {
  source: 'Substack Note',
  name: 'Nuel Okemdilim',
  username: '@nuel',
  avatar: '',
  theme: 'dark',
  text:
    'Building in public is not about performing productivity. It is about leaving a clear trail of what you are learning, shipping, changing, and becoming.',
  watermark: 'notes2pics',
}

const starterMediumPost = {
  text:
    "A pattern I've noticed in stuck people:\n\nThey're always busy. They never stop moving. They have 47 tabs open and a notebook-sized to-do list. But if you ask them what they accomplished this week that actually matters, their mind goes blank.\n\nBusyness is a poor measure of value. If you focused on being useful instead, your life would change.",
  signature: 'KOE',
  theme: 'dark',
}

const profileStorageKey = 'notes2pics.profiles'
const exportTimeoutMs = 15000
const shortPostCharacterLimit = 500

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function readSavedProfiles() {
  try {
    const savedProfiles = JSON.parse(localStorage.getItem(profileStorageKey) || '[]')
    return Array.isArray(savedProfiles) ? savedProfiles : []
  } catch {
    return []
  }
}

function getShortSourceKey(source) {
  if (source === 'Threads') return 'threads'
  if (source === 'X') return 'x'
  return 'substack'
}

function getShortExportBackground(sourceKey, theme) {
  if (sourceKey === 'substack') return '#ff671f'
  if (theme === 'light') return '#ffffff'
  return sourceKey === 'threads' ? '#181818' : '#050505'
}

function getMediumTypography(aspect) {
  if (aspect === 'square') {
    return { fontSize: 40, minFontSize: 4, signatureSize: 25 }
  }

  if (aspect === 'story') {
    return { fontSize: 50, minFontSize: 4, signatureSize: 29 }
  }

  return { fontSize: 46, minFontSize: 4, signatureSize: 27 }
}

function getMediumTextStyle(text, aspect) {
  const explicitLines = text.split('\n').length
  const visualLineEstimate = Math.ceil(text.length / (aspect === 'square' ? 25 : aspect === 'story' ? 30 : 28))
  const estimatedLines = Math.max(explicitLines, visualLineEstimate)
  const baseSize = aspect === 'story' ? 25 : aspect === 'square' ? 20 : 23
  const sizeByCharacters = text.length > 1200 ? 11 : text.length > 900 ? 13 : text.length > 650 ? 15 : text.length > 420 ? 18 : baseSize
  const sizeByLines = estimatedLines > 34 ? 9 : estimatedLines > 26 ? 11 : estimatedLines > 20 ? 13 : estimatedLines > 15 ? 15 : sizeByCharacters

  return {
    fontSize: `${Math.max(8, Math.min(sizeByCharacters, sizeByLines))}px`,
  }
}

function wrapCanvasText(context, text, maxWidth) {
  const hardLines = text.split('\n')
  const lines = []

  for (const hardLine of hardLines) {
    if (hardLine === '') {
      lines.push('')
      continue
    }

    const leadingSpaces = hardLine.match(/^\s*/)?.[0] || ''
    const tokens = hardLine.match(/\s+|\S+/g) || []
    let line = ''

    for (const token of tokens) {
      const testLine = `${line}${token}`

      if (context.measureText(testLine).width <= maxWidth || !line) {
        if (context.measureText(testLine).width <= maxWidth) {
          line = testLine
        } else {
          const brokenTokenLines = breakLongToken(context, token, maxWidth)
          lines.push(...brokenTokenLines.slice(0, -1))
          line = brokenTokenLines.at(-1) || ''
        }
        continue
      }

      lines.push(line.trimEnd())

      if (/^\s+$/.test(token)) {
        line = leadingSpaces
        continue
      }

      const nextLine = `${leadingSpaces}${token}`

      if (context.measureText(nextLine).width <= maxWidth) {
        line = nextLine
      } else {
        const brokenTokenLines = breakLongToken(context, token, maxWidth, leadingSpaces)
        lines.push(...brokenTokenLines.slice(0, -1))
        line = brokenTokenLines.at(-1) || ''
      }
    }

    lines.push(line.trimEnd())
  }

  return lines
}

function breakLongToken(context, token, maxWidth, prefix = '') {
  const lines = []
  let line = prefix

  for (const character of token) {
    const testLine = `${line}${character}`

    if (context.measureText(testLine).width > maxWidth && line.trim()) {
      lines.push(line)
      line = `${prefix}${character}`
    } else {
      line = testLine
    }
  }

  if (line) lines.push(line)
  return lines
}

function formatBadgeDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(date) {
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${time} · ${day}`
}

function getShortPostTextStyle(text, aspect) {
  const explicitLines = text.split('\n').length
  const visualLineEstimate = Math.ceil(text.length / (aspect === 'square' ? 25 : 31))
  const estimatedLines = Math.max(explicitLines, visualLineEstimate)
  const baseSize = aspect === 'square' ? 24 : 28
  const sizeByCharacters = text.length > 210 ? baseSize - 4 : text.length > 150 ? baseSize - 2 : baseSize
  const sizeByLines = estimatedLines > 12 ? 15 : estimatedLines > 9 ? 17 : estimatedLines > 7 ? 19 : sizeByCharacters

  return {
    fontSize: `${Math.max(13, Math.min(sizeByCharacters, sizeByLines))}px`,
  }
}

function App() {
  const exportRef = useRef(null)
  const [contentMode, setContentMode] = useState('short')
  const [post, setPost] = useState(starterPost)
  const [mediumPost, setMediumPost] = useState(starterMediumPost)
  const [profiles, setProfiles] = useState(() => readSavedProfiles())
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [aspect, setAspect] = useState('portrait')
  const [isExporting, setIsExporting] = useState(false)
  const [notice, setNotice] = useState('Fill the post details manually, choose a style, then export a PNG.')

  const isMediumMode = contentMode === 'medium'
  const currentAspect = aspectOptions[aspect]
  const shortSourceKey = getShortSourceKey(post.source)
  const exportBackground = isMediumMode
    ? mediumPost.theme === 'dark'
      ? '#000000'
      : '#fbfbf7'
    : getShortExportBackground(shortSourceKey, post.theme)

  const charCount = isMediumMode ? mediumPost.text.length : post.text.length
  const avatarInitials = useMemo(() => initials(post.name) || 'N2', [post.name])
  const shortPostTextStyle = useMemo(() => getShortPostTextStyle(post.text, aspect), [aspect, post.text])
  const mediumTextStyle = useMemo(() => getMediumTextStyle(mediumPost.text, aspect), [aspect, mediumPost.text])
  const today = new Date()
  const badgeDate = formatBadgeDate(today)
  const timestamp = formatTimestamp(today)

  function updatePost(field, value) {
    setPost((current) => ({ ...current, [field]: value }))
  }

  function updateShortPostText(value) {
    updatePost('text', value.slice(0, shortPostCharacterLimit))
  }

  function updateMediumPost(field, value) {
    setMediumPost((current) => ({ ...current, [field]: value }))
  }

  function persistProfiles(nextProfiles) {
    setProfiles(nextProfiles)
    localStorage.setItem(profileStorageKey, JSON.stringify(nextProfiles))
  }

  function saveProfile() {
    const name = post.name.trim()
    const username = post.username.trim()

    if (!name && !username) {
      setNotice('Add a name or username before saving a profile.')
      return
    }

    const existingProfile = profiles.find(
      (profile) =>
        profile.name.toLowerCase() === name.toLowerCase() ||
        profile.username.toLowerCase() === username.toLowerCase(),
    )
    const profile = {
      id: existingProfile?.id || crypto.randomUUID(),
      name,
      username,
      source: post.source,
      avatar: post.avatar,
      theme: post.theme,
      updatedAt: new Date().toISOString(),
    }
    const nextProfiles = existingProfile
      ? profiles.map((item) => (item.id === existingProfile.id ? profile : item))
      : [profile, ...profiles]

    persistProfiles(nextProfiles)
    setSelectedProfileId(profile.id)
    setNotice(`Saved profile for ${name || username}.`)
  }

  function loadProfile(profileId) {
    setSelectedProfileId(profileId)

    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) return

    setPost((current) => ({
      ...current,
      name: profile.name,
      username: profile.username,
      source: profile.source,
      avatar: profile.avatar,
      theme: profile.theme || current.theme,
    }))
    setNotice(`Loaded profile for ${profile.name || profile.username}.`)
  }

  function deleteProfile() {
    const profile = profiles.find((item) => item.id === selectedProfileId)

    if (!profile) {
      setNotice('Choose a saved profile to delete.')
      return
    }

    persistProfiles(profiles.filter((item) => item.id !== selectedProfileId))
    setSelectedProfileId('')
    setNotice(`Deleted profile for ${profile.name || profile.username}.`)
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0]

    if (!file) return

    const reader = new FileReader()
    reader.onload = () => updatePost('avatar', reader.result)
    reader.readAsDataURL(file)
  }

  async function exportImage() {
    if (!exportRef.current) return

    setIsExporting(true)

    try {
      if (isMediumMode) {
        exportMediumImage()
        setNotice(`Exported ${currentAspect.size} PNG.`)
        return
      }

      const dataUrl = await Promise.race([
        toPng(exportRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: exportBackground,
        }),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('Export timed out')), exportTimeoutMs)
        }),
      ])
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `notes2pics-${contentMode}-${aspect}.png`
      anchor.click()
      setNotice(`Exported ${currentAspect.size} PNG.`)
    } catch {
      setNotice('Export failed. Try again, and upload avatar images instead of using external image URLs.')
    } finally {
      setIsExporting(false)
    }
  }

  function exportMediumImage() {
    const canvas = document.createElement('canvas')
    const width = currentAspect.width * 2
    const height = currentAspect.height * 2
    const typography = getMediumTypography(aspect)
    const isDark = mediumPost.theme === 'dark'
    const textX = width * 0.12
    const maxTextWidth = width * 0.76
    const signatureGap = 34
    const maxContentHeight = height * 0.82

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.fillStyle = isDark ? '#000000' : '#fbfbf7'
    context.fillRect(0, 0, width, height)

    let fontSize = typography.fontSize
    let lineHeight = Math.round(fontSize * 1.31)
    let signatureSize = typography.signatureSize
    let lines = []
    let totalTextHeight = 0
    const text = mediumPost.text || 'Paste your medium-form content here.'

    while (fontSize >= typography.minFontSize) {
      context.font = `500 ${fontSize}px Trebuchet MS, Segoe UI, sans-serif`
      lines = wrapCanvasText(context, text, maxTextWidth)
      lineHeight = Math.round(fontSize * 1.31)
      signatureSize = Math.max(8, Math.round(fontSize * 0.58))
      totalTextHeight = lines.length * lineHeight + (mediumPost.signature ? signatureGap + signatureSize : 0)

      if (totalTextHeight <= maxContentHeight) break
      fontSize -= 1
    }

    context.fillStyle = isDark ? '#f5f5f1' : '#111111'
    context.font = `500 ${fontSize}px Trebuchet MS, Segoe UI, sans-serif`
    context.textBaseline = 'top'

    let y = (height - totalTextHeight) / 2

    for (const line of lines) {
      context.fillText(line || ' ', textX, y)
      y += lineHeight
    }

    if (mediumPost.signature) {
      y += signatureGap
      context.fillStyle = isDark ? '#727272' : '#8a8a84'
      context.font = `500 ${signatureSize}px Trebuchet MS, Segoe UI, sans-serif`
      context.fillText(mediumPost.signature.toUpperCase(), textX, y)
    }

    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `notes2pics-medium-${aspect}.png`
    anchor.click()
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="editor-panel" aria-label="Post editor">
          <div className="brand-row">
            <div>
              <p className="eyebrow">Notes2pics</p>
              <h1>Post screenshot studio</h1>
            </div>
            <Sparkles aria-hidden="true" />
          </div>

          <div className="selector-group">
            <span>Content type</span>
            <div className="segmented">
              <button
                type="button"
                className={contentMode === 'short' ? 'active' : ''}
                onClick={() => setContentMode('short')}
              >
                Short post
              </button>
              <button
                type="button"
                className={contentMode === 'medium' ? 'active' : ''}
                onClick={() => setContentMode('medium')}
              >
                Medium form
              </button>
            </div>
          </div>

          {isMediumMode ? (
            <>
              <label className="field full">
                <span>Medium-form text</span>
                <textarea
                  className="medium-textarea"
                  value={mediumPost.text}
                  onChange={(event) => updateMediumPost('text', event.target.value)}
                />
              </label>

              <div className="helper-row">
                <span>{charCount} characters</span>
                <button type="button" onClick={() => updateMediumPost('text', '')}>
                  <RefreshCw aria-hidden="true" />
                  Reset text
                </button>
              </div>

              <div className="control-grid">
                <label className="field">
                  <span>Signature</span>
                  <input
                    value={mediumPost.signature}
                    onChange={(event) => updateMediumPost('signature', event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Theme</span>
                  <select
                    value={mediumPost.theme}
                    onChange={(event) => updateMediumPost('theme', event.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>

              </div>
            </>
          ) : (
            <>
              <section className="profile-manager" aria-label="Saved profiles">
                <div className="profile-heading">
                  <div>
                    <p className="eyebrow">Profiles</p>
                    <h2>Save repeat authors</h2>
                  </div>
                  <UserRoundCheck aria-hidden="true" />
                </div>

                <label className="field full">
                  <span>Saved profile</span>
                  <select value={selectedProfileId} onChange={(event) => loadProfile(event.target.value)}>
                    <option value="">Choose saved profile</option>
                    {profiles.map((profile) => (
                      <option value={profile.id} key={profile.id}>
                        {profile.name || profile.username} {profile.username ? `(${profile.username})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="profile-actions">
                  <button type="button" onClick={saveProfile}>
                    <Save aria-hidden="true" />
                    Save current
                  </button>
                  <button type="button" onClick={deleteProfile} disabled={!selectedProfileId}>
                    <Trash2 aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </section>

              <div className="control-grid">
                <label className="field">
                  <span>Name</span>
                  <input value={post.name} onChange={(event) => updatePost('name', event.target.value)} />
                </label>

                <label className="field">
                  <span>Username</span>
                  <input
                    value={post.username}
                    onChange={(event) => updatePost('username', event.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Source</span>
                  <select value={post.source} onChange={(event) => updatePost('source', event.target.value)}>
                    <option>Substack Note</option>
                    <option>X</option>
                    <option>Threads</option>
                  </select>
                </label>

                {post.source !== 'Substack Note' ? (
                  <label className="field">
                    <span>Appearance</span>
                    <select value={post.theme} onChange={(event) => updatePost('theme', event.target.value)}>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <label className="field full">
                <span>Post text</span>
                <textarea
                  maxLength={shortPostCharacterLimit}
                  value={post.text}
                  onChange={(event) => updateShortPostText(event.target.value)}
                />
              </label>

              <div className="helper-row">
                <span>{charCount}/{shortPostCharacterLimit} characters</span>
                <button type="button" onClick={() => updatePost('text', '')}>
                  <RefreshCw aria-hidden="true" />
                  Reset text
                </button>
              </div>

              <label className="field full">
                <span>Avatar URL</span>
                <input
                  value={post.avatar}
                  onChange={(event) => updatePost('avatar', event.target.value)}
                  placeholder="Upload is safest for export"
                />
              </label>

              <label className="upload-row">
                <ImagePlus aria-hidden="true" />
                <span>Upload avatar</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              </label>

              <label className="field full">
                <span>Watermark</span>
                <input
                  value={post.watermark}
                  onChange={(event) => updatePost('watermark', event.target.value)}
                />
              </label>
            </>
          )}

          <div className="selector-group">
            <span>Canvas</span>
            <div className="segmented">
              {Object.entries(aspectOptions).map(([key, item]) => (
                <button
                  type="button"
                  className={aspect === key ? 'active' : ''}
                  onClick={() => setAspect(key)}
                  key={key}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button className="export-button" type="button" onClick={exportImage} disabled={isExporting}>
            <Download aria-hidden="true" />
            {isExporting ? 'Exporting...' : `Export PNG (${currentAspect.size})`}
          </button>

          <p className="notice">{notice}</p>
        </aside>

        <section className="preview-panel" aria-label="Screenshot preview">
          <div className="preview-header">
            <div>
              <p className="eyebrow">Live preview</p>
              <h2>{currentAspect.size}</h2>
            </div>
          </div>

          <div className="preview-frame">
            <div
              className={
                isMediumMode
                  ? `export-stage medium-stage medium-${mediumPost.theme} aspect-${aspect}`
                  : `export-stage short-stage short-${shortSourceKey} short-${post.theme} aspect-${aspect}`
              }
              ref={exportRef}
              style={{ width: `${currentAspect.width}px`, height: `${currentAspect.height}px` }}
            >
              {isMediumMode ? (
                <>
                  <article className="medium-content">
                    <p style={mediumTextStyle}>{mediumPost.text || 'Paste your medium-form content here.'}</p>
                    {mediumPost.signature ? <span>{mediumPost.signature}</span> : null}
                  </article>
                </>
              ) : (
                <ShortSourcePreview
                  avatarInitials={avatarInitials}
                  post={post}
                  shortPostTextStyle={shortPostTextStyle}
                  sourceKey={shortSourceKey}
                  badgeDate={badgeDate}
                  timestamp={timestamp}
                />
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App

function ShortSourcePreview({ avatarInitials, post, shortPostTextStyle, sourceKey, badgeDate, timestamp }) {
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

      <footer className="x-footer">
        <span>{timestamp}</span>
      </footer>
    </article>
  )
}

function VerifiedBadge({ color }) {
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

function SourceAvatar({ avatar, initials }) {
  return (
    <div className="source-avatar">
      {avatar ? <img src={avatar} alt="" crossOrigin="anonymous" /> : <span>{initials}</span>}
    </div>
  )
}
