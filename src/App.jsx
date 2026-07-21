import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  ImagePlus,
  Link2 as LinkIcon,
  Plus,
  RefreshCw,
  Scissors,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { createShare, isFounder } from './lib/shares'
import JSZip from 'jszip'
import './App.css'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { useAuth } from './lib/useAuth'
import { getUsage, recordExport } from './lib/entitlements'
import { checkoutUrlForPlan } from './lib/checkout'
import { listProfiles, upsertProfile, deleteProfileById } from './lib/profiles'
import { splitIntoSlides, splitThread, SLIDE_MAX_CHARS, SLIDE_HARD_MAX } from './lib/carousel'
import { MAX_ESSAY_WORDS, countWords, generateThread } from './lib/threadGen'
import { drawSlide } from './lib/carouselRender'
import ShortSourcePreview from './components/ShortSourcePreview'
import {
  initials,
  getShortSourceKey,
  getShortExportBackground,
  formatBadgeDate,
  formatTimestamp,
  getShortPostTextStyle,
} from './lib/postcard'
import AuthModal from './components/AuthModal'
import UpgradeModal from './components/UpgradeModal'
import SettingsModal from './components/SettingsModal'
import ProfileFormModal from './components/ProfileFormModal'
import SetPasswordModal from './components/SetPasswordModal'
import { supabase } from './lib/supabaseClient'

const productWatermark = 'made with Notes2Pic'
const checkoutIntentKey = 'n2p.checkout'

// Read a pending checkout intent from the URL (?checkout=…) or a recent
// sessionStorage entry (survives an OAuth redirect). Read-only — no side effects.
function readCheckoutIntent() {
  if (typeof window === 'undefined') return null
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('checkout')
    if (fromUrl === 'monthly' || fromUrl === 'lifetime') return fromUrl
    const saved = JSON.parse(sessionStorage.getItem(checkoutIntentKey) || 'null')
    if (saved && Date.now() - saved.ts < 15 * 60 * 1000) return saved.plan
  } catch {
    return null
  }
  return null
}

const aspectOptions = {
  square: { label: 'Square', size: '1080 x 1080', width: 540, height: 540 },
  portrait: { label: 'Portrait', size: '1080 x 1350', width: 540, height: 675 },
  story: { label: 'Story', size: '1080 x 1920', width: 540, height: 960 },
}

const starterPost = {
  source: 'Substack Note',
  name: '',
  username: '',
  avatar: '',
  theme: 'dark',
  text:
    'Building in public is not about performing productivity. It is about leaving a clear trail of what you are learning, shipping, changing, and becoming.',
}

const starterMediumPost = {
  text:
    "A pattern I've noticed in stuck people:\n\nThey're always busy. They never stop moving. They have 47 tabs open and a notebook-sized to-do list. But if you ask them what they accomplished this week that actually matters, their mind goes blank.\n\nBusyness is a poor measure of value. If you focused on being useful instead, your life would change.",
  signature: '',
  theme: 'dark',
}

const starterCarouselText =
  "The most underrated skill in your 20s is learning to sit with discomfort.\n\nEvery time you avoid a hard conversation, skip the workout, or reach for your phone in a boring moment, you're training yourself to flinch.\n\nComfort is a slow tax on your potential. It feels free in the moment, but you pay for it later with a smaller life.\n\nStart small. Do one uncomfortable thing today on purpose. Then do it again tomorrow. That's how you build a self you can rely on."

const starterCarousel = {
  text: starterCarouselText,
  slides: splitIntoSlides(starterCarouselText),
  theme: 'dark',
  name: '',
  username: '',
  avatar: '',
}

const exportTimeoutMs = 15000
const shortPostCharacterLimit = 500
const defaultNotice = 'Fill the post details manually, choose a style, then export a PNG.'

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

function App() {
  const exportRef = useRef(null)
  const carouselCanvasRef = useRef(null)
  const previewFrameRef = useRef(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [contentMode, setContentMode] = useState('short')
  const [post, setPost] = useState(starterPost)
  // "Import from a tweet link" — fills the short-post fields from a public tweet
  // so you don't retype it. Same /api/tweet endpoint the free tool page uses.
  const [tweetUrl, setTweetUrl] = useState('')
  const [tweetLoading, setTweetLoading] = useState(false)
  const [tweetError, setTweetError] = useState('')
  const [founderWatermark, setFounderWatermark] = useState(false)
  // Carousel mode's AI assist: essay in, thread out, straight into the textarea
  // the splitter already reads. Same endpoint + quota as the free tool page.
  const [aiOpen, setAiOpen] = useState(false)
  const [aiEssay, setAiEssay] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [mediumPost, setMediumPost] = useState(starterMediumPost)
  const [carousel, setCarousel] = useState(starterCarousel)
  const [slideIndex, setSlideIndex] = useState(0)
  const [carouselAvatarImage, setCarouselAvatarImage] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [aspect, setAspect] = useState('portrait')
  const [isExporting, setIsExporting] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [notice, setNotice] = useState(defaultNotice)

  const { user, loading: authLoading, signOut } = useAuth()
  const [usage, setUsage] = useState(null)
  const [authModal, setAuthModal] = useState({ open: false, reason: '' })
  const [upgradeModal, setUpgradeModal] = useState({ open: false, reason: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ open: false, mode: 'create', initial: null, id: null, dismissable: true })
  const [profileSaving, setProfileSaving] = useState(false)
  const [recoverPassword, setRecoverPassword] = useState(false)
  const onboardingHandledRef = useRef(false)
  // Pending "buy this plan" intent carried from the landing page (?checkout=…).
  const [pendingCheckout, setPendingCheckout] = useState(readCheckoutIntent)
  // Watermark on the live stage only while an export is capturing it, so the
  // editor preview stays clean but the exported PNG carries the mark.
  const [captureWatermark, setCaptureWatermark] = useState(false)

  const isPaid = usage?.paid === true
  const freeRemaining = usage && !usage.paid ? usage.remaining : null

  const isMediumMode = contentMode === 'medium'
  const isCarouselMode = contentMode === 'carousel'
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

  // After a password-reset link is followed, Supabase fires PASSWORD_RECOVERY.
  // Show the "set a new password" modal. Also check the URL hash as a fallback in
  // case the event fired before this listener attached.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      queueMicrotask(() => setRecoverPassword(true))
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoverPassword(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Refresh plan/usage whenever auth state changes (login, logout, return from checkout).
  useEffect(() => {
    let active = true
    if (!user) {
      // Defer so we don't setState synchronously inside the effect body.
      queueMicrotask(() => {
        if (active) setUsage(null)
      })
      return () => {
        active = false
      }
    }
    getUsage()
      .then((data) => {
        if (active) setUsage(data)
      })
      .catch(() => {
        if (active) setUsage(null)
      })
    return () => {
      active = false
    }
  }, [user])

  // Persist a fresh ?checkout intent to sessionStorage (so it survives an OAuth
  // full-page redirect), clean the URL, and drop stale intents. No setState here —
  // the intent itself is seeded lazily into pendingCheckout's initial state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('checkout')
    if (fromUrl === 'monthly' || fromUrl === 'lifetime') {
      sessionStorage.setItem('n2p.checkout', JSON.stringify({ plan: fromUrl, ts: Date.now() }))
      params.delete('checkout')
      const clean = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash
      window.history.replaceState({}, '', clean)
    } else if (!pendingCheckout) {
      sessionStorage.removeItem('n2p.checkout')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resolve a pending checkout: sign in if needed, then redirect to Freemius.
  useEffect(() => {
    if (!pendingCheckout) return

    if (!user) {
      queueMicrotask(() =>
        setAuthModal({
          open: true,
          reason: `Sign in to continue to ${pendingCheckout === 'lifetime' ? 'Lifetime' : 'Monthly'} checkout.`,
        }),
      )
      return
    }

    // Wait for the plan status to load so we don't send a paid user to checkout.
    if (usage === null) return

    sessionStorage.removeItem('n2p.checkout')

    if (isPaid) {
      queueMicrotask(() => {
        setPendingCheckout(null)
        setNotice("You're already on a paid plan.")
      })
      return
    }

    const url = checkoutUrlForPlan(pendingCheckout, user.email)
    if (url) {
      window.location.href = url // full-tab redirect to Freemius checkout
    } else {
      queueMicrotask(() => {
        setPendingCheckout(null)
        setNotice('Checkout is not configured yet.')
      })
    }
  }, [pendingCheckout, user, usage, isPaid])

  // Saved author profiles live per-user in Supabase; load them on sign-in.
  useEffect(() => {
    let active = true
    if (!user) {
      onboardingHandledRef.current = false
      queueMicrotask(() => {
        if (active) {
          setProfiles([])
          setSelectedProfileId('')
        }
      })
      return () => {
        active = false
      }
    }
    listProfiles()
      .then((rows) => {
        if (!active) return
        setProfiles(rows)
        // First-time sign-in with no profiles yet: either silently create one
        // from what they already typed, or prompt them to create it.
        if (!onboardingHandledRef.current && rows.length === 0) {
          onboardingHandledRef.current = true
          const identity = currentIdentity()
          if (identity.name && identity.username) {
            createProfileFrom(identity)
          } else {
            setProfileForm({ open: true, mode: 'onboard', initial: identity, id: null, dismissable: true })
          }
        }
      })
      .catch(() => {
        if (active) setProfiles([])
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Load the carousel avatar into an <img> the canvas can draw.
  useEffect(() => {
    let active = true
    if (!carousel.avatar) {
      queueMicrotask(() => {
        if (active) setCarouselAvatarImage(null)
      })
      return () => {
        active = false
      }
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (active) setCarouselAvatarImage(image)
    }
    image.onerror = () => {
      if (active) setCarouselAvatarImage(null)
    }
    image.src = carousel.avatar
    return () => {
      active = false
    }
  }, [carousel.avatar])

  // Keep the preview canvas in sync with the current slide (WYSIWYG with export).
  useEffect(() => {
    if (!isCarouselMode) return
    const canvas = carouselCanvasRef.current
    if (!canvas) return
    const scale = 2
    canvas.width = currentAspect.width * scale
    canvas.height = currentAspect.height * scale
    const ctx = canvas.getContext('2d')
    const slides = carousel.slides
    const safeIndex = Math.min(slideIndex, Math.max(0, slides.length - 1))
    drawSlide(ctx, {
      text: slides[safeIndex] || 'Paste a thread or essay, then split it into slides.',
      theme: carousel.theme,
      username: carousel.username,
      avatar: carouselAvatarImage,
      index: safeIndex,
      total: slides.length || 1,
      width: canvas.width,
      height: canvas.height,
      watermark: false,
    })
  }, [isCarouselMode, carousel, slideIndex, carouselAvatarImage, currentAspect])

  // Fit the preview card to the visible panel so the whole image shows at once
  // (no scrolling), scaling down for tall aspects / long carousels.
  useEffect(() => {
    const frame = previewFrameRef.current
    if (!frame) return
    const measure = () => {
      const style = getComputedStyle(frame)
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const navReserve = isCarouselMode ? 64 : 0
      const availW = frame.clientWidth - padX
      const availH = frame.clientHeight - padY - navReserve
      if (availW <= 0 || availH <= 0) return
      const next = Math.min(availW / currentAspect.width, availH / currentAspect.height, 1)
      setPreviewScale((current) => (Math.abs(current - next) > 0.005 ? next : current))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [currentAspect.width, currentAspect.height, isCarouselMode])

  function updatePost(field, value) {
    setPost((current) => ({ ...current, [field]: value }))
  }

  // Pull a public tweet's text/author/avatar into the short-post fields. Purely
  // a convenience: everything it fills stays editable, and typing it by hand
  // still works exactly as before if the fetch fails or the tweet is private.
  async function importTweet(event) {
    event?.preventDefault()
    const trimmed = tweetUrl.trim()
    if (!trimmed) return
    setTweetLoading(true)
    setTweetError('')
    try {
      const response = await fetch(`/api/tweet?url=${encodeURIComponent(trimmed)}`)
      const data = await response.json()
      if (!response.ok || !data?.ok) {
        setTweetError(data?.error || 'Could not read that tweet. Check the link and try again.')
        return
      }
      const t = data.tweet
      setPost((current) => ({
        ...current,
        source: 'X',
        name: t.name || current.name,
        username: t.handle ? `@${t.handle}` : current.username,
        avatar: t.avatar || current.avatar,
        text: (t.text || '').slice(0, shortPostCharacterLimit),
        photo: t.photo || '',
      }))
      setNotice('Tweet imported. Edit anything you like, then export.')
    } catch {
      setTweetError('Something went wrong fetching that tweet. Try again in a moment.')
    } finally {
      setTweetLoading(false)
    }
  }

  function updateShortPostText(value) {
    updatePost('text', value.slice(0, shortPostCharacterLimit))
  }

  function updateMediumPost(field, value) {
    setMediumPost((current) => ({ ...current, [field]: value }))
  }

  function updateCarousel(field, value) {
    setCarousel((current) => ({ ...current, [field]: value }))
  }

  function switchMode(mode) {
    setContentMode(mode)
    setNotice(defaultNotice)
  }

  function resetCarouselText() {
    updateCarousel('text', '')
  }

  function splitCarousel() {
    const { slides, numbered } = splitThread(carousel.text)
    setCarousel((current) => ({ ...current, slides }))
    setSlideIndex(0)
    if (!slides.length) {
      setNotice('Paste some text first, then split.')
    } else if (numbered) {
      // The text was already a numbered thread — we followed the author's own
      // boundaries instead of re-splitting it.
      setNotice(`Kept your numbering — ${slides.length} slides.`)
    } else {
      setNotice(`Split into ${slides.length} slides.`)
    }
  }

  function updateSlideText(index, value) {
    setCarousel((current) => {
      const slides = [...current.slides]
      // Clamp at the hard ceiling, not the soft target: a pre-numbered thread
      // can legitimately hand us a tweet longer than SLIDE_MAX_CHARS, and
      // silently truncating the author's own tweet on first edit is data loss.
      slides[index] = value.slice(0, SLIDE_HARD_MAX)
      return { ...current, slides }
    })
  }

  function moveSlide(index, direction) {
    const target = index + direction
    setCarousel((current) => {
      if (target < 0 || target >= current.slides.length) return current
      const slides = [...current.slides]
      ;[slides[index], slides[target]] = [slides[target], slides[index]]
      return { ...current, slides }
    })
    setSlideIndex(Math.max(0, Math.min(target, carousel.slides.length - 1)))
  }

  function deleteSlide(index) {
    setCarousel((current) => {
      const slides = current.slides.filter((_, i) => i !== index)
      return { ...current, slides }
    })
    setSlideIndex((current) => Math.max(0, Math.min(current, carousel.slides.length - 2)))
  }

  function addSlide() {
    setCarousel((current) => ({ ...current, slides: [...current.slides, ''] }))
    setSlideIndex(carousel.slides.length)
  }

  function handleCarouselAvatarUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateCarousel('avatar', reader.result)
    reader.readAsDataURL(file)
  }

  // The author identity currently in the working editor (a scratch copy — editing
  // it never writes back to a saved profile; that only happens in Settings).
  function currentIdentity() {
    return {
      name: (isCarouselMode ? carousel.name : post.name).trim(),
      username: (isCarouselMode ? carousel.username : post.username).trim(),
      avatar: isCarouselMode ? carousel.avatar : post.avatar,
      signature: mediumPost.signature.trim(),
      source: post.source,
      theme: isCarouselMode ? carousel.theme : post.theme,
    }
  }

  // Apply a saved profile into the working editor across every mode.
  function applyProfile(profile) {
    if (!profile) return
    setSelectedProfileId(profile.id)
    setPost((current) => ({
      ...current,
      name: profile.name,
      username: profile.username,
      source: profile.source || current.source,
      avatar: profile.avatar,
    }))
    setCarousel((current) => ({
      ...current,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar,
    }))
    setMediumPost((current) => ({ ...current, signature: profile.signature || current.signature }))
  }

  function applyProfileById(profileId) {
    const profile = profiles.find((item) => item.id === profileId)
    if (profile) {
      applyProfile(profile)
      setNotice(`Using profile: ${profile.name || profile.username}.`)
    }
  }

  // Silent create from whatever identity the guest already typed (used at first sign-in).
  async function createProfileFrom(identity) {
    try {
      const saved = await upsertProfile(identity)
      const rows = await listProfiles()
      setProfiles(rows)
      applyProfile(saved)
      setNotice(`Profile created for ${saved.name || saved.username}.`)
    } catch {
      // If the silent create fails, fall back to the prompt.
      setProfileForm({ open: true, mode: 'onboard', initial: identity, id: null, dismissable: true })
    }
  }

  function openNewProfile() {
    if (!isPaid && profiles.length >= 1) {
      setSettingsOpen(false)
      setUpgradeModal({ open: true, reason: 'Free accounts can save one profile. Upgrade for unlimited profiles.' })
      return
    }
    setProfileForm({ open: true, mode: 'create', initial: currentIdentity(), id: null, dismissable: true })
  }

  function openEditProfile(profile) {
    setProfileForm({ open: true, mode: 'edit', initial: profile, id: profile.id, dismissable: true })
  }

  async function submitProfileForm(fields) {
    setProfileSaving(true)
    try {
      const saved = await upsertProfile({ ...fields, id: profileForm.id || undefined })
      const rows = await listProfiles()
      setProfiles(rows)
      applyProfile(saved)
      setProfileForm({ open: false, mode: 'create', initial: null, id: null, dismissable: true })
      setNotice(`Saved profile for ${saved.name || saved.username}.`)
    } catch {
      setNotice('Could not save profile. Try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function removeProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) return
    try {
      await deleteProfileById(profileId)
      setProfiles((current) => current.filter((item) => item.id !== profileId))
      if (selectedProfileId === profileId) setSelectedProfileId('')
      setNotice(`Deleted profile for ${profile.name || profile.username}.`)
    } catch {
      setNotice('Could not delete profile. Try again.')
    }
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0]

    if (!file) return

    const reader = new FileReader()
    reader.onload = () => updatePost('avatar', reader.result)
    reader.readAsDataURL(file)
  }

  // Essay -> thread, then drop it straight into the carousel text so the
  // existing splitThread/slide-editor/export pipeline takes over untouched.
  async function generateCarouselThread(event) {
    event?.preventDefault()
    const words = countWords(aiEssay)
    if (!aiEssay.trim() || words > MAX_ESSAY_WORDS) return
    if (!isSupabaseConfigured) {
      setAiError('Accounts are not configured yet.')
      return
    }
    if (!user) {
      setAuthModal({ open: true, reason: 'Sign in to generate a thread from your essay.' })
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const result = await generateThread(aiEssay)
      if (!result.ok) {
        if (result.reason === 'generation_limit') {
          setUpgradeModal({
            open: true,
            reason: 'You have used your free AI thread generation. Upgrade for unlimited generations.',
          })
        } else if (result.reason === 'not_authenticated') {
          setAuthModal({ open: true, reason: 'Please sign in again to generate.' })
        } else {
          setAiError(result.error || 'Generation failed. Try again in a moment.')
        }
        return
      }
      const { slides, numbered } = splitThread(result.thread)
      setCarousel((current) => ({ ...current, text: result.thread, slides }))
      setSlideIndex(0)
      setAiOpen(false)
      setNotice(
        numbered
          ? `Thread generated and split into ${slides.length} slides using its own numbering.`
          : `Thread generated and split into ${slides.length} slides.`,
      )
    } catch {
      setAiError('Something went wrong generating that thread. Try again.')
    } finally {
      setAiLoading(false)
    }
  }

  async function exportImage() {
    if (isCarouselMode && !carousel.slides.length) {
      setNotice('Split your text into slides before exporting.')
      return
    }
    if (!isCarouselMode && !exportRef.current) return

    if (!isSupabaseConfigured) {
      setNotice('Accounts are not configured yet. Add Supabase keys to enable exports.')
      return
    }

    // Gate 1: must be signed in to export.
    if (!user) {
      setAuthModal({ open: true, reason: 'Sign in to export your image. Editing stays free.' })
      return
    }

    setIsExporting(true)

    try {
      // Gate 2: server-authoritative limit + watermark decision.
      // A whole carousel counts as a single export (and, on free, is capped at one/month).
      const gate = await recordExport(contentMode)

      if (!gate?.allowed) {
        if (gate?.reason === 'limit_reached') {
          setUpgradeModal({
            open: true,
            reason: 'You have used your 3 free exports this month. Upgrade for unlimited, watermark-free exports.',
          })
          setNotice('Free export limit reached.')
        } else if (gate?.reason === 'carousel_limit') {
          setUpgradeModal({
            open: true,
            reason: 'Your free plan includes one carousel per month. Upgrade for unlimited carousels.',
          })
          setNotice('Free carousel limit reached (1 per month).')
        } else {
          setAuthModal({ open: true, reason: 'Please sign in again to export.' })
        }
        return
      }

      // Founder normally never gets a watermark (is_paid bypass); this lets the
      // founder deliberately turn it ON for demo screenshots.
      const withWatermark = gate.watermark === true || (founder && founderWatermark)

      if (isCarouselMode) {
        await exportCarousel(withWatermark)
        getUsage().then(setUsage).catch(() => {})
        setNotice(
          gate.remaining === null || gate.remaining === undefined
            ? `Exported ${carousel.slides.length}-slide carousel (.zip).`
            : `Exported ${carousel.slides.length}-slide carousel. ${gate.remaining} free export${gate.remaining === 1 ? '' : 's'} left this month.`,
        )
        return
      }

      if (isMediumMode) {
        exportMediumImage(withWatermark)
      } else {
        if (withWatermark) {
          setCaptureWatermark(true)
          // Let React paint the watermark into the stage before capture.
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          )
        }

        try {
          const dataUrl = await Promise.race([
            toPng(exportRef.current, {
              pixelRatio: 2,
              // No cacheBust: it appends ?<timestamp> to image URLs and
              // pbs.twimg.com 404s on that, which breaks exporting an
              // imported tweet's avatar.
              skipFonts: true,
              backgroundColor: exportBackground,
            }),
            new Promise((_, reject) => {
              window.setTimeout(() => reject(new Error('Export timed out')), exportTimeoutMs)
            }),
          ])
          const anchor = document.createElement('a')
          anchor.href = dataUrl
          anchor.download = `notes2pic-${contentMode}-${aspect}.png`
          anchor.click()
        } finally {
          if (withWatermark) setCaptureWatermark(false)
        }
      }

      // Reflect the consumed export in the account UI.
      getUsage().then(setUsage).catch(() => {})
      setNotice(
        gate.remaining === null || gate.remaining === undefined
          ? `Exported ${currentAspect.size} PNG.`
          : `Exported ${currentAspect.size} PNG. ${gate.remaining} free export${gate.remaining === 1 ? '' : 's'} left this month.`,
      )
    } catch {
      setNotice('Export failed. Try again, and upload avatar images instead of using external image URLs.')
    } finally {
      setIsExporting(false)
    }
  }

  async function exportCarousel(withWatermark = false) {
    const width = currentAspect.width * 2
    const height = currentAspect.height * 2
    const zip = new JSZip()
    const total = carousel.slides.length

    for (let index = 0; index < total; index += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      drawSlide(ctx, {
        text: carousel.slides[index],
        theme: carousel.theme,
        username: carousel.username,
        avatar: carouselAvatarImage,
        index,
        total,
        width,
        height,
        watermark: withWatermark,
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const number = String(index + 1).padStart(2, '0')
      zip.file(`slide-${number}.png`, blob)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(zipBlob)
    anchor.download = `notes2pic-carousel-${aspect}.zip`
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  const founder = isFounder(user)

  // Render the current mode to PNG blob(s), reusing the exact export pipeline so
  // the shared images match what the user would download. Founder shares never
  // carry a watermark (the founder account is always paid).
  async function buildShareBlobs() {
    const width = currentAspect.width * 2
    const height = currentAspect.height * 2

    if (isCarouselMode) {
      const total = carousel.slides.length
      const blobs = []
      for (let index = 0; index < total; index += 1) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        drawSlide(canvas.getContext('2d'), {
          text: carousel.slides[index],
          theme: carousel.theme,
          username: carousel.username,
          avatar: carouselAvatarImage,
          index,
          total,
          width,
          height,
          watermark: false,
        })
        blobs.push(await new Promise((resolve) => canvas.toBlob(resolve, 'image/png')))
      }
      return { kind: 'carousel', blobs }
    }

    if (isMediumMode) {
      const canvas = renderMediumCanvas(false)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      return { kind: 'medium', blobs: [blob] }
    }

    const dataUrl = await toPng(exportRef.current, {
      pixelRatio: 2,
      // See exportImage: cacheBust breaks pbs.twimg.com avatars (404 on the
      // appended query param), skipFonts avoids a cross-origin CSS read.
      skipFonts: true,
      backgroundColor: exportBackground,
    })
    const blob = await (await fetch(dataUrl)).blob()
    return { kind: 'short', blobs: [blob] }
  }

  // Founder-only: upload the current image/carousel and copy a public /s/<id>
  // link. Built for cold-DM outreach where attachments aren't allowed.
  async function shareCurrent() {
    if (isCarouselMode && !carousel.slides.length) {
      setNotice('Split your text into slides before sharing.')
      return
    }
    if (!isCarouselMode && !exportRef.current && !isMediumMode) return

    setIsSharing(true)
    setShareUrl('')
    try {
      const { kind, blobs } = await buildShareBlobs()
      const { url } = await createShare({ kind, blobs })
      setShareUrl(url)
      try {
        await navigator.clipboard.writeText(url)
        setNotice('Share link copied to clipboard.')
      } catch {
        setNotice('Share link created.')
      }
    } catch (error) {
      setNotice(`Could not create share link: ${error?.message || 'unknown error'}`)
    } finally {
      setIsSharing(false)
    }
  }

  // Draw the medium-form image to a canvas and return it. Shared by the export
  // (download) path and the founder share-link path so both render identically.
  function renderMediumCanvas(withWatermark = false) {
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

    const markMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'

    if (mediumPost.signature) {
      y += signatureGap
      const signatureTop = y
      context.textBaseline = 'top'
      context.fillStyle = isDark ? '#727272' : '#8a8a84'
      context.font = `500 ${signatureSize}px Trebuchet MS, Segoe UI, sans-serif`
      context.fillText(mediumPost.signature.toUpperCase(), textX, signatureTop)

      if (withWatermark) {
        // Fuse the watermark onto the signature's line — cropping it off means
        // cropping the author's signature too.
        const markSize = Math.max(11, Math.round(signatureSize * 0.82))
        context.font = `600 ${markSize}px Trebuchet MS, Segoe UI, sans-serif`
        context.textAlign = 'right'
        context.fillStyle = markMuted
        context.fillText(productWatermark, width - textX, signatureTop + (signatureSize - markSize) / 2)
        context.textAlign = 'left'
      }
    } else if (withWatermark) {
      // No signature: pin the watermark just below the text block, not in the
      // far bottom margin where it could be cropped off.
      y += signatureGap
      const markSize = Math.max(11, Math.round(width * 0.02))
      context.font = `600 ${markSize}px Trebuchet MS, Segoe UI, sans-serif`
      context.textAlign = 'right'
      context.textBaseline = 'top'
      context.fillStyle = markMuted
      context.fillText(productWatermark, width - textX, y)
      context.textAlign = 'left'
    }

    return canvas
  }

  function exportMediumImage(withWatermark = false) {
    const canvas = renderMediumCanvas(withWatermark)
    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `notes2pic-medium-${aspect}.png`
    anchor.click()
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="editor-panel" aria-label="Post editor">
          <div className="brand-row">
            <div>
              <p className="eyebrow">Notes2pic</p>
              <h1>Post screenshot studio</h1>
            </div>
            <Sparkles aria-hidden="true" />
          </div>

          <div className="account-bar">
            {authLoading ? (
              <span className="account-status">…</span>
            ) : user ? (
              <>
                <div className="account-info">
                  <span className="account-email">{user.email}</span>
                  {isPaid ? (
                    <span className="account-badge pro">
                      <Crown aria-hidden="true" />
                      {usage?.plan === 'lifetime' ? 'Lifetime' : 'Pro'}
                    </span>
                  ) : (
                    <span className="account-badge free">
                      {freeRemaining ?? '–'} free left
                    </span>
                  )}
                </div>
                <div className="account-actions">
                  <button
                    type="button"
                    className="settings-link"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Settings"
                    title="Settings"
                  >
                    <Settings aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="signin-link"
                onClick={() => setAuthModal({ open: true, reason: '' })}
              >
                Sign in
              </button>
            )}
          </div>

          {user && profiles.length > 0 ? (
            <label className="field full profile-switcher">
              <span>Active profile</span>
              <select
                value={selectedProfileId}
                onChange={(event) => applyProfileById(event.target.value)}
              >
                <option value="">Choose a profile</option>
                {profiles.map((profile) => (
                  <option value={profile.id} key={profile.id}>
                    {profile.name || profile.username} {profile.username ? `(${profile.username})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="selector-group">
            <span>Content type</span>
            <div className="segmented">
              <button
                type="button"
                className={contentMode === 'short' ? 'active' : ''}
                onClick={() => switchMode('short')}
              >
                Short post
              </button>
              <button
                type="button"
                className={contentMode === 'medium' ? 'active' : ''}
                onClick={() => switchMode('medium')}
              >
                Medium form
              </button>
              <button
                type="button"
                className={contentMode === 'carousel' ? 'active' : ''}
                onClick={() => switchMode('carousel')}
              >
                Carousels
              </button>
            </div>
          </div>

          {isCarouselMode ? (
            <>
              <div className="ai-panel">
                <button
                  type="button"
                  className="ai-panel-toggle"
                  aria-expanded={aiOpen}
                  onClick={() => setAiOpen((open) => !open)}
                >
                  <Sparkles aria-hidden="true" />
                  Essay → Thread (AI)
                  <span className="ai-panel-hint">{aiOpen ? 'Hide' : 'Turn an essay into a thread'}</span>
                </button>

                {aiOpen ? (
                  <form className="ai-panel-body" onSubmit={generateCarouselThread}>
                    <textarea
                      className="medium-textarea"
                      value={aiEssay}
                      onChange={(event) => setAiEssay(event.target.value)}
                      placeholder="Paste your blog post, newsletter or draft here…"
                      spellCheck={false}
                    />
                    <div className="ai-panel-actions">
                      <span className={countWords(aiEssay) > MAX_ESSAY_WORDS ? 'ai-count over' : 'ai-count'}>
                        {countWords(aiEssay).toLocaleString()} / {MAX_ESSAY_WORDS.toLocaleString()} words
                      </span>
                      <button
                        type="submit"
                        className="export-button"
                        disabled={aiLoading || !aiEssay.trim() || countWords(aiEssay) > MAX_ESSAY_WORDS}
                      >
                        {aiLoading ? 'Generating…' : 'Generate thread'}
                      </button>
                    </div>
                    {aiError ? <p className="ai-error">{aiError}</p> : null}
                  </form>
                ) : null}
              </div>

              <label className="field full">
                <span>Long post or thread</span>
                <textarea
                  className="medium-textarea"
                  value={carousel.text}
                  onChange={(event) => updateCarousel('text', event.target.value)}
                  placeholder="Paste your Substack essay or Twitter/Threads thread here…"
                />
              </label>

              <div className="helper-row">
                <span>{carousel.text.length} characters</span>
                <div className="helper-actions">
                  <button type="button" onClick={resetCarouselText}>
                    <RefreshCw aria-hidden="true" />
                    Reset text
                  </button>
                  <button type="button" onClick={splitCarousel}>
                    <Scissors aria-hidden="true" />
                    Split into slides
                  </button>
                </div>
              </div>

              <div className="control-grid">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={carousel.name}
                    onChange={(event) => updateCarousel('name', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Username</span>
                  <input
                    value={carousel.username}
                    onChange={(event) => updateCarousel('username', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Theme</span>
                  <select
                    value={carousel.theme}
                    onChange={(event) => updateCarousel('theme', event.target.value)}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
                <label className="upload-row">
                  <ImagePlus aria-hidden="true" />
                  <span>Avatar</span>
                  <input type="file" accept="image/*" onChange={handleCarouselAvatarUpload} />
                </label>
              </div>

              <div className="slides-editor">
                <div className="slides-editor-head">
                  <span>{carousel.slides.length} slides</span>
                  <button type="button" onClick={addSlide}>
                    <Plus aria-hidden="true" />
                    Add slide
                  </button>
                </div>

                {carousel.slides.map((slide, index) => (
                  <div
                    className={`slide-card ${index === slideIndex ? 'active' : ''}`}
                    key={index}
                    onClick={() => setSlideIndex(index)}
                  >
                    <div className="slide-card-head">
                      <strong>Slide {index + 1}</strong>
                      <span
                        className={slide.length > SLIDE_MAX_CHARS ? 'over' : ''}
                        title={
                          slide.length > SLIDE_MAX_CHARS
                            ? 'Longer than the recommended slide length — the text will render smaller.'
                            : undefined
                        }
                      >
                        {slide.length}/{SLIDE_MAX_CHARS}
                      </span>
                    </div>
                    <textarea
                      value={slide}
                      maxLength={SLIDE_HARD_MAX}
                      onChange={(event) => updateSlideText(index, event.target.value)}
                    />
                    <div className="slide-card-actions">
                      <button
                        type="button"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        aria-label="Move slide up"
                        title="Move up"
                      >
                        <ArrowUp aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === carousel.slides.length - 1}
                        aria-label="Move slide down"
                        title="Move down"
                      >
                        <ArrowDown aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => deleteSlide(index)}
                        aria-label="Delete slide"
                        title="Delete"
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : isMediumMode ? (
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

              <div className="field full tweet-import">
                <span>Import from a tweet link <em>(optional)</em></span>
                <div className="tweet-import-row">
                  <input
                    type="url"
                    value={tweetUrl}
                    placeholder="https://x.com/username/status/123…"
                    onChange={(event) => setTweetUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') importTweet(event)
                    }}
                  />
                  <button type="button" onClick={importTweet} disabled={tweetLoading || !tweetUrl.trim()}>
                    <LinkIcon aria-hidden="true" />
                    {tweetLoading ? 'Fetching…' : 'Import'}
                  </button>
                </div>
                {tweetError ? <p className="tweet-import-error">{tweetError}</p> : null}
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

              <label className="upload-row">
                <ImagePlus aria-hidden="true" />
                <span>Upload avatar</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} />
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

          {founder ? (
            <label className="founder-watermark-toggle">
              <input
                type="checkbox"
                checked={founderWatermark}
                onChange={(event) => setFounderWatermark(event.target.checked)}
              />
              Show watermark <span>(founder only)</span>
            </label>
          ) : null}

          <button className="export-button" type="button" onClick={exportImage} disabled={isExporting}>
            <Download aria-hidden="true" />
            {isExporting
              ? 'Exporting...'
              : isCarouselMode
                ? `Export ${carousel.slides.length}-slide carousel (.zip)`
                : `Export PNG (${currentAspect.size})`}
          </button>

          {founder ? (
            <div className="share-tool">
              <button type="button" className="share-button" onClick={shareCurrent} disabled={isSharing}>
                <LinkIcon aria-hidden="true" />
                {isSharing ? 'Creating link…' : 'Create share link'}
              </button>
              {shareUrl ? (
                <a className="share-url" href={shareUrl} target="_blank" rel="noreferrer" title={shareUrl}>
                  {shareUrl.replace(/^https?:\/\//, '')}
                </a>
              ) : null}
            </div>
          ) : null}

          <p className="notice">{notice}</p>
        </aside>

        <section className="preview-panel" aria-label="Screenshot preview">
          <div className="preview-header">
            <div>
              <p className="eyebrow">Live preview</p>
              <h2>{currentAspect.size}</h2>
            </div>
          </div>

          <div className="preview-frame" ref={previewFrameRef}>
            {isCarouselMode ? (
              <div className="carousel-preview">
                <canvas
                  ref={carouselCanvasRef}
                  className="carousel-canvas"
                  style={{
                    width: `${currentAspect.width * previewScale}px`,
                    height: `${currentAspect.height * previewScale}px`,
                  }}
                />
                <div className="carousel-nav">
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                    disabled={slideIndex <= 0}
                    aria-label="Previous slide"
                    title="Previous slide"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span>
                    {carousel.slides.length ? slideIndex + 1 : 0} / {carousel.slides.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.min(carousel.slides.length - 1, i + 1))}
                    disabled={slideIndex >= carousel.slides.length - 1}
                    aria-label="Next slide"
                    title="Next slide"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="preview-fit"
                style={{
                  width: `${currentAspect.width * previewScale}px`,
                  height: `${currentAspect.height * previewScale}px`,
                }}
              >
                <div
                  className="preview-fit-inner"
                  style={{
                    width: `${currentAspect.width}px`,
                    height: `${currentAspect.height}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                >
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
                      <article className="medium-content">
                        <p style={mediumTextStyle}>{mediumPost.text || 'Paste your medium-form content here.'}</p>
                        {mediumPost.signature ? <span>{mediumPost.signature}</span> : null}
                      </article>
                    ) : (
                      <ShortSourcePreview
                        avatarInitials={avatarInitials}
                        post={post}
                        shortPostTextStyle={shortPostTextStyle}
                        sourceKey={shortSourceKey}
                        badgeDate={badgeDate}
                        timestamp={timestamp}
                        watermark={captureWatermark}
                        photo={post.photo}
                        highlight
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </section>

      <AuthModal
        open={authModal.open}
        reason={authModal.reason}
        onClose={() => setAuthModal({ open: false, reason: '' })}
        onDismiss={() => {
          // Explicit dismiss cancels any pending landing→checkout intent.
          setAuthModal({ open: false, reason: '' })
          if (pendingCheckout) {
            setPendingCheckout(null)
            sessionStorage.removeItem('n2p.checkout')
          }
        }}
      />
      <UpgradeModal
        open={upgradeModal.open}
        reason={upgradeModal.reason}
        userId={user?.id}
        email={user?.email}
        onClose={() => setUpgradeModal({ open: false, reason: '' })}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        usage={usage}
        profiles={profiles}
        activeProfileId={selectedProfileId}
        isPaid={isPaid}
        onUseProfile={(id) => {
          applyProfileById(id)
          setSettingsOpen(false)
        }}
        onNewProfile={openNewProfile}
        onEditProfile={openEditProfile}
        onDeleteProfile={removeProfile}
        onUpgrade={() => {
          setSettingsOpen(false)
          setUpgradeModal({ open: true, reason: '' })
        }}
        onLogout={() => {
          setSettingsOpen(false)
          signOut()
        }}
      />
      <ProfileFormModal
        key={profileForm.open ? `${profileForm.mode}-${profileForm.id || 'new'}` : 'closed'}
        open={profileForm.open}
        title={profileForm.mode === 'edit' ? 'Edit profile' : profileForm.mode === 'onboard' ? 'Create your profile' : 'New profile'}
        initial={profileForm.initial}
        submitLabel={profileForm.mode === 'edit' ? 'Save changes' : 'Create profile'}
        busy={profileSaving}
        dismissable={profileForm.dismissable}
        onSubmit={submitProfileForm}
        onClose={() => setProfileForm({ open: false, mode: 'create', initial: null, id: null, dismissable: true })}
      />
      <SetPasswordModal
        open={recoverPassword}
        onDone={() => {
          setRecoverPassword(false)
          setNotice('Password updated. You are signed in.')
          if (typeof window !== 'undefined' && window.location.hash) {
            window.history.replaceState({}, '', window.location.pathname + window.location.search)
          }
        }}
      />
    </main>
  )
}

export default App
