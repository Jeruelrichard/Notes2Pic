import { useMemo, useRef, useState } from 'react'
import { Download, ImagePlus, RefreshCw, Save, Sparkles, Trash2, UserRoundCheck } from 'lucide-react'
import { toPng } from 'html-to-image'
import './App.css'

const aspectOptions = {
  square: { label: 'Square', size: '1080 x 1080', width: 540, height: 540 },
  portrait: { label: 'Portrait', size: '1080 x 1350', width: 540, height: 675 },
  story: { label: 'Story', size: '1080 x 1920', width: 540, height: 960 },
}

const templates = {
  paper: { label: 'Paper', source: '#f8f3e7' },
  midnight: { label: 'Midnight', source: '#0f172a' },
  bloom: { label: 'Bloom', source: '#ef476f' },
  studio: { label: 'Studio', source: '#f6f7fb' },
}

const starterPost = {
  source: 'Substack Note',
  name: 'Nuel Okemdilim',
  username: '@nuel',
  avatar: '',
  text:
    'Building in public is not about performing productivity. It is about leaving a clear trail of what you are learning, shipping, changing, and becoming.',
  timestampDate: '',
  timestampTime: '',
  stats: '12 replies / 48 reposts / 219 likes',
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

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getLocalDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  }
}

function formatTimestamp(dateValue, timeValue) {
  if (!dateValue && !timeValue) return 'Today'
  if (!dateValue) return timeValue

  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours = 0, minutes = 0] = timeValue ? timeValue.split(':').map(Number) : []
  const date = new Date(year, month - 1, day, hours, minutes)
  const dateText = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)

  if (!timeValue) return dateText

  const timeText = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  return `${dateText} at ${timeText}`
}

function readSavedProfiles() {
  try {
    const savedProfiles = JSON.parse(localStorage.getItem(profileStorageKey) || '[]')
    return Array.isArray(savedProfiles) ? savedProfiles : []
  } catch {
    return []
  }
}

function getMediumTypography(aspect) {
  if (aspect === 'square') {
    return { fontSize: 40, lineHeight: 52, signatureSize: 25, maxLines: 10 }
  }

  if (aspect === 'story') {
    return { fontSize: 50, lineHeight: 66, signatureSize: 29, maxLines: 18 }
  }

  return { fontSize: 46, lineHeight: 60, signatureSize: 27, maxLines: 13 }
}

function wrapCanvasText(context, text, maxWidth, maxLines) {
  const paragraphs = text.split('\n')
  const lines = []

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    const words = paragraph.split(/\s+/)
    let line = ''

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      if (context.measureText(testLine).width > maxWidth && line) {
        lines.push(line)
        line = word
      } else {
        line = testLine
      }
    }

    if (line) lines.push(line)
  }

  if (lines.length <= maxLines) return lines

  const visibleLines = lines.slice(0, maxLines)
  let finalLine = visibleLines[visibleLines.length - 1]

  while (finalLine && context.measureText(`${finalLine}...`).width > maxWidth) {
    finalLine = finalLine.split(' ').slice(0, -1).join(' ')
  }

  visibleLines[visibleLines.length - 1] = `${finalLine || visibleLines[visibleLines.length - 1]}...`
  return visibleLines
}

function App() {
  const exportRef = useRef(null)
  const [contentMode, setContentMode] = useState('short')
  const [post, setPost] = useState(starterPost)
  const [mediumPost, setMediumPost] = useState(starterMediumPost)
  const [profiles, setProfiles] = useState(() => readSavedProfiles())
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [aspect, setAspect] = useState('portrait')
  const [template, setTemplate] = useState('paper')
  const [isExporting, setIsExporting] = useState(false)
  const [notice, setNotice] = useState('Fill the post details manually, choose a style, then export a PNG.')

  const isMediumMode = contentMode === 'medium'
  const currentAspect = aspectOptions[aspect]
  const displayTimestamp = formatTimestamp(post.timestampDate, post.timestampTime)
  const exportBackground = isMediumMode
    ? mediumPost.theme === 'dark'
      ? '#000000'
      : '#fbfbf7'
    : templates[template].source

  const charCount = isMediumMode ? mediumPost.text.length : post.text.length
  const avatarInitials = useMemo(() => initials(post.name) || 'N2', [post.name])

  function updatePost(field, value) {
    setPost((current) => ({ ...current, [field]: value }))
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

  function useCurrentTimestamp() {
    const current = getLocalDateTime()
    setPost((postState) => ({
      ...postState,
      timestampDate: current.date,
      timestampTime: current.time,
    }))
    setNotice('Timestamp set to the current date and time.')
  }

  function clearTimestamp() {
    setPost((postState) => ({
      ...postState,
      timestampDate: '',
      timestampTime: '',
    }))
    setNotice('Timestamp cleared. The preview will show Today.')
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

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    context.fillStyle = isDark ? '#000000' : '#fbfbf7'
    context.fillRect(0, 0, width, height)

    context.fillStyle = isDark ? '#f5f5f1' : '#111111'
    context.font = `500 ${typography.fontSize}px Trebuchet MS, Segoe UI, sans-serif`
    context.textBaseline = 'top'

    const lines = wrapCanvasText(context, mediumPost.text || 'Paste your medium-form content here.', maxTextWidth, typography.maxLines)
    const signatureHeight = mediumPost.signature ? signatureGap + typography.signatureSize : 0
    const totalTextHeight = lines.length * typography.lineHeight + signatureHeight
    let y = (height - totalTextHeight) / 2

    for (const line of lines) {
      context.fillText(line, textX, y)
      y += typography.lineHeight
    }

    if (mediumPost.signature) {
      y += signatureGap
      context.fillStyle = isDark ? '#727272' : '#8a8a84'
      context.font = `500 ${typography.signatureSize}px Trebuchet MS, Segoe UI, sans-serif`
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
                <button type="button" onClick={() => updateMediumPost('text', starterMediumPost.text)}>
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
                    <option>Web Note</option>
                  </select>
                </label>

                <label className="field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={post.timestampDate}
                    onChange={(event) => updatePost('timestampDate', event.target.value)}
                  />
                </label>
              </div>

              <div className="timestamp-row">
                <label className="field">
                  <span>Time</span>
                  <input
                    type="time"
                    value={post.timestampTime}
                    onChange={(event) => updatePost('timestampTime', event.target.value)}
                  />
                </label>

                <div className="timestamp-actions" aria-label="Date and time actions">
                  <button type="button" onClick={useCurrentTimestamp}>
                    Now
                  </button>
                  <button type="button" onClick={clearTimestamp}>
                    Clear
                  </button>
                </div>
              </div>

              <label className="field full">
                <span>Post text</span>
                <textarea value={post.text} onChange={(event) => updatePost('text', event.target.value)} />
              </label>

              <div className="helper-row">
                <span>{charCount} characters</span>
                <button type="button" onClick={() => updatePost('text', starterPost.text)}>
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
                <span>Stats</span>
                <input value={post.stats} onChange={(event) => updatePost('stats', event.target.value)} />
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

          {!isMediumMode ? (
            <div className="selector-group">
              <span>Template</span>
              <div className="swatches">
                {Object.entries(templates).map(([key, item]) => (
                  <button
                    type="button"
                    className={template === key ? 'active' : ''}
                    onClick={() => setTemplate(key)}
                    title={item.label}
                    key={key}
                  >
                    <span style={{ background: item.source }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
                  : `export-stage template-${template} aspect-${aspect}`
              }
              ref={exportRef}
              style={{ width: `${currentAspect.width}px`, height: `${currentAspect.height}px` }}
            >
              {isMediumMode ? (
                <>
                  <article className="medium-content">
                    <p>{mediumPost.text || 'Paste your medium-form content here.'}</p>
                    {mediumPost.signature ? <span>{mediumPost.signature}</span> : null}
                  </article>
                </>
              ) : (
                <>
                  <div className="texture-grid" />
                  <article className="post-card">
                    <header className="post-author">
                      <div className="avatar">
                        {post.avatar ? (
                          <img src={post.avatar} alt="" crossOrigin="anonymous" />
                        ) : (
                          <span>{avatarInitials}</span>
                        )}
                      </div>
                      <div className="author-copy">
                        <strong>{post.name || 'Creator'}</strong>
                        <span>{post.username || '@username'} / {post.source}</span>
                      </div>
                    </header>

                    <p className="post-text">{post.text || 'Paste the post text here.'}</p>

                    <footer className="post-footer">
                      <span>{displayTimestamp}</span>
                      <span>{post.stats}</span>
                    </footer>
                  </article>

                  {post.watermark ? <div className="watermark">{post.watermark}</div> : null}
                </>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
