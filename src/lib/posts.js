import { marked, Renderer } from 'marked'

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
      cover: data.cover || '',
      tags: data.tags || [],
      readingTime: readingTime(content),
      toc: buildToc(content),
      html: marked.parse(content),
    }
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))

export function getPost(slug) {
  return posts.find((post) => post.slug === slug) || null
}

export function formatPostDate(date) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
