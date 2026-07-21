import { marked, Renderer } from 'marked'

// Default author for E-E-A-T + Article schema when a post omits `author`.
export const DEFAULT_AUTHOR = 'Jeruel Richard'

// --- Markdown setup: heading ids for the table of contents ---
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const renderer = new Renderer()
renderer.heading = function heading({ tokens, depth }) {
  const inner = this.parser.parseInline(tokens)
  const id = slugify(inner)
  return `<h${depth} id="${id}">${inner}</h${depth}>\n`
}
marked.use({ renderer, gfm: true, breaks: false })

// --- Tiny frontmatter parser (avoids Node-only deps so this runs in the browser too) ---
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!match) return { data: {}, content: raw }

  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    } else {
      data[key] = value
    }
  }
  return { data, content: match[2] }
}

// Load every markdown file in content/blog at build time.
const rawPosts = import.meta.glob('../../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function buildToc(content) {
  const toc = []
  for (const token of marked.lexer(content)) {
    if (token.type === 'heading' && (token.depth === 2 || token.depth === 3)) {
      toc.push({ id: slugify(token.text), text: token.text, depth: token.depth })
    }
  }
  return toc
}

// Auto-extract an FAQ from the post so we can emit FAQPage JSON-LD without any
// extra frontmatter. Convention: an H2 whose text matches /faq|frequently asked/
// followed by H3 questions, each answered by the paragraph text beneath it.
function buildFaq(content) {
  const tokens = marked.lexer(content)
  const faq = []
  let inFaq = false
  let current = null
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      inFaq = /faq|frequently asked/i.test(token.text)
      if (current) {
        faq.push(current)
        current = null
      }
      continue
    }
    if (!inFaq) continue
    if (token.type === 'heading' && token.depth === 3) {
      if (current) faq.push(current)
      current = { q: token.text.trim(), a: '' }
    } else if (current && token.type === 'paragraph' && !current.a) {
      // First paragraph after the question is the answer (markdown stripped).
      current.a = token.text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim()
    }
  }
  if (current) faq.push(current)
  return faq.filter((item) => item.q && item.a)
}

function readingTime(content) {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

export const posts = Object.entries(rawPosts)
  .map(([path, raw]) => {
    const slug = path.split('/').pop().replace(/\.md$/, '')
    const { data, content } = parseFrontmatter(raw)
    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || '',
      updated: data.updated || data.modified || data.date || '',
      author: data.author || DEFAULT_AUTHOR,
      cover: data.cover || '',
      // Always an array. A post whose frontmatter says `tags: "foo"` (a string
      // rather than a list) used to make the related-posts pass below throw,
      // which broke the whole SPA's module import — one markdown typo must
      // never be able to take the site down.
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      readingTime: readingTime(content),
      toc: buildToc(content),
      faq: buildFaq(content),
      html: marked.parse(content),
    }
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))

// Related posts by shared-tag overlap (falls back to recency). Powers the
// "no orphan pages" internal-linking requirement: every post links to 2-3 peers.
for (const post of posts) {
  post.related = posts
    .filter((other) => other.slug !== post.slug)
    .map((other) => ({
      post: other,
      shared: other.tags.filter((tag) => post.tags.includes(tag)).length,
    }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 3)
    .map(({ post: other }) => ({
      slug: other.slug,
      title: other.title,
      description: other.description,
    }))
}

export function getPost(slug) {
  return posts.find((post) => post.slug === slug) || null
}

export function formatPostDate(date) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
