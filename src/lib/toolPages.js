// Free tool pages — the SEO/traffic engine. Each entry is one standalone page
// targeting one exact search phrase, offering a working tool free (preview) with
// the export gated behind the normal sign-in + quota flow. This is a DATA file:
// it's the single source of truth used by the route table, the page template
// (ToolPage.jsx), the SEO meta (seoMeta.js), and the sitemap (prerender.mjs).
// Adding a new tool page = add an object here and a route in AppShell.jsx.

// The demo thread is deliberately pre-numbered (1/ 2/ 3/ 4/) so the splitter
// honours those exact boundaries and yields four clean slides.
const threadDemo = `1/
You don't have ADHD.

You've just been engineered to think you do.

Two weapons in the attention economy are quietly beating your brain — and nobody ever told you their names.

2/
WEAPON 1: DOPAMINE

It's not a "reward chemical." It's a signal that says "this helped you survive — go back."

The trap: it stops locking onto the reward and locks onto the cue. That's why opening the app feels good before you've even seen anything.

3/
WEAPON 2: ENTROPY

Your working memory holds about 7 tabs. You've got 20 open — every notification, every unread ping, every reply you're bracing for.

Each buzz mid-task costs the 15 seconds you check it AND the ~20 minutes to refocus. A 2-hour task becomes 8.

4/
You weren't born distracted. You were trained to be.

→ Notifications off for everything except messaging
→ Phone grey and boring by 10pm
→ An hour of long-form reading a day
→ Write before bed, for no audience

What got trained in can get trained back out.`

export const TOOL_PAGES = [
  {
    slug: 'tweet-screenshot',
    path: '/tweet-screenshot',
    widget: 'tweet',
    navLabel: 'Twitter Screenshot Generator',
    metaTitle: 'Tweet Screenshot Generator — Paste a Link, Get a Clean Image',
    metaDescription:
      'Paste any tweet link and get a clean, high-res screenshot in seconds. No clutter, no cropping, no design skills. Free to preview.',
    eyebrow: 'Free tool',
    h1: 'Screenshot any tweet, without the clutter',
    subhead:
      'Paste the link. We pull the tweet and hand you a crisp, shareable image — no messy phone screenshots, no cropping.',
    steps: [
      {
        title: 'Paste the tweet link',
        body: 'Copy the link to any public tweet on X and drop it in. We fetch the text, name, handle, and avatar for you.',
      },
      {
        title: 'Pick light or dark',
        body: 'Preview the card instantly, right here on the page. Editing and previewing stay free forever.',
      },
      {
        title: 'Download the image',
        body: 'Sign in and grab a crisp, high-res PNG — sized for Instagram and ready to post.',
      },
    ],
    faq: [
      {
        q: 'Is it really free?',
        a: 'Yes. Paste a link and preview the image for free, with no account. Downloading needs a free account; the free plan includes 3 exports a month, each with a small “made with Notes2Pic” mark. Paid removes the mark and the limits.',
      },
      {
        q: 'Why not just take a phone screenshot?',
        a: 'A phone screenshot brings the whole interface with it — status bar, buttons, awkward crop, and whatever resolution your screen happens to be. This gives you just the post, centred and high-resolution, at a size built for Instagram.',
      },
      {
        q: 'Which tweets work?',
        a: 'Any public tweet. Posts from private/protected accounts, and tweets that have been deleted, can’t be read — for those you can still paste the text in manually in the studio.',
      },
      {
        q: 'Does it post to my account or need my password?',
        a: 'Never. We only read the public post you paste a link to. Notes2Pic never asks for your X login and never posts anything on your behalf.',
      },
      {
        q: 'Can I screenshot a whole thread?',
        a: 'This tool handles one post at a time. For a full thread, use the free thread-to-carousel tool, which splits it into Instagram carousel slides.',
      },
    ],
    related: {
      slug: 'screenshot-a-tweet-without-clutter',
      label: 'How to screenshot a tweet without the clutter',
    },
  },
  {
    slug: 'thread-to-carousel',
    widget: 'carousel',
    navLabel: 'Thread to Carousel Generator',
    path: '/thread-to-carousel',
    // SEO (metaTitle gets " | Notes2Pic" appended, like blog posts).
    metaTitle: 'Twitter Thread to Instagram Carousel — Free Tool',
    metaDescription:
      'Paste any X / Twitter thread and turn it into a clean, swipeable Instagram carousel in seconds. Free preview, numbering-aware splitting, no design skills, no Canva.',
    // On-page copy.
    eyebrow: 'Free tool',
    h1: 'Turn your X thread into an Instagram carousel',
    subhead:
      'Paste a thread. Get clean, swipeable slides in seconds — free to preview, no design skills, no Canva.',
    demo: threadDemo,
    steps: [
      {
        title: 'Paste your thread',
        body: 'Drop the whole thread in — numbered or not. The splitter reads your own numbering and keeps your breaks.',
      },
      {
        title: 'Preview every slide',
        body: 'See exactly what you’ll get, light or dark, right here on the page. Editing and previewing stay free forever.',
      },
      {
        title: 'Download the carousel',
        body: 'Sign in and grab a .zip of square PNGs, sized 1080×1080 and ready to post to Instagram.',
      },
    ],
    faq: [
      {
        q: 'Is it really free?',
        a: 'Yes. You can paste your thread and preview every slide for free, with no account. Downloading the images needs a free account; the free plan includes 3 exports a month (one of which can be a full carousel), each with a small “made with Notes2Pic” mark. Paid removes the mark and the limits.',
      },
      {
        q: 'Will it keep my thread’s numbering?',
        a: 'Yes. If your thread is already numbered — 1/, 1/11, “Tweet 1”, and so on — each number becomes its own slide, so the splits are yours, not ours. Unnumbered text is split evenly at sentence boundaries instead.',
      },
      {
        q: 'What size are the slides?',
        a: 'Square 1080×1080 pixels — the Instagram-native size — exported as a .zip of PNGs, one file per slide, in order.',
      },
      {
        q: 'Do I need any design skills?',
        a: 'No. Paste text, pick light or dark, and you’re done. There are no fonts, colours, or layouts to fiddle with.',
      },
      {
        q: 'Does it work for Threads and Substack notes too?',
        a: 'Yes. Anything you can paste as text — X/Twitter threads, Threads posts, or Substack notes — becomes a carousel the same way.',
      },
    ],
    // Cross-link to the in-depth article on the same topic (different intent).
    related: {
      slug: 'twitter-thread-to-instagram-carousel',
      label: 'How to turn a Twitter thread into an Instagram carousel',
    },
  },
]

export function getToolPage(pathname) {
  const clean = (pathname || '').replace(/\/$/, '') || '/'
  return TOOL_PAGES.find((page) => page.path === clean) || null
}
