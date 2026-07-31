// Competitor comparisons config — SEO/traffic engine for alternatives.
// This is the single source of truth for the comparison pages routing,
// content rendering, SEO metadata, and sitemap prerendering.

export const COMPARISONS = [
  {
    slug: 'twittershots',
    path: '/comparison/twittershots',
    competitorName: 'TwitterShots',
    metaTitle: 'Notes2Pic vs TwitterShots — Manual Editor vs Automated Screenshot API',
    metaDescription:
      'Compare Notes2Pic vs TwitterShots. While TwitterShots is built for automated bulk tweet link screenshots, Notes2Pic is a manual-first visual studio for writers to design beautiful, customizable posts for Instagram. Billed from $0.',
    h1: 'Notes2Pic vs TwitterShots',
    subhead:
      'TwitterShots is built for developers and teams who need automated bulk captures via link scraping and APIs. Notes2Pic is built for writers who want full creative control over their post design and branding without link rate limits.',
    atGlance: [
      {
        type: 'pros',
        text: 'Notes2Pic: Manual-first design studio. You can type/edit text directly, choose light/dark templates, adjust fonts/spacing, and save brand kits. Works for X, Threads, and Substack Notes. Starts at $5/mo or $10 lifetime.',
      },
      {
        type: 'pros',
        text: 'TwitterShots: Focuses on automated link-based screenshots, bulk processing (up to 30), and API access (300 to 6,000 credits/mo). From $0.',
      },
      {
        type: 'cons',
        text: 'API/Link Dependability: TwitterShots depends on X scraping. Notes2Pic uses a manual input engine, meaning it never breaks or gets rate-limited by X.',
      },
    ],
    featuresTable: [
      { feature: 'Core Audience', competitor: 'Developers & Bulk Automators', notes2pic: 'Writers & Social Content Creators' },
      { feature: 'Input Method', competitor: 'URL Link Scraping', notes2pic: 'Manual Typing / Editing & Copy-Paste' },
      { feature: 'Twitter API Dependability', competitor: 'High (Subject to API/layout changes)', notes2pic: 'None (100% immune to scraper blocks)' },
      { feature: 'Design Control', competitor: 'Basic layouts & background customization', notes2pic: 'Advanced brand colors, custom spacing, & template selection' },
      { feature: 'Thread to Carousel Support', competitor: 'Stitches to PDF or vertical image', notes2pic: 'Splits threads into multi-slide Instagram carousels' },
      { feature: 'Pricing Tiers', competitor: 'Free ($0) to $10-$40/mo (Subscriptions)', notes2pic: '$5/mo or $10 Lifetime deal (Unlimited exports)' },
    ],
    sections: [
      {
        title: 'Why Manual-First Beats Link Scraping',
        body: 'Automated link screenshot tools like TwitterShots depend on fetching raw data from X. When X introduces rate limits, blocks anonymous scrapers, or changes its layout, automated link tools break. Notes2Pic uses a manual-first input engine. You have a full editor to paste or type your post, customize the username, upload an avatar, and preview the exact layout in real-time. It never breaks, never times out, and never gets blocked.',
      },
      {
        title: 'Built Specifically for Instagram and Carousels',
        body: 'TwitterShots is designed to capture standard web screenshots. Notes2Pic is a visual studio tailored for social media formatting. It supports Square (1:1), Portrait (4:5), and Story (9:16) aspect ratios, plus features a dedicated thread-to-carousel engine that splits long text into sequential slides at numbering boundaries, ensuring they look perfect in the feed.',
      },
      {
        title: 'Active Development and Pricing Control',
        body: 'Notes2Pic offers a transparent, creator-first pricing structure. Rather than forcing you into a recurring monthly subscription for simple screenshot tasks, Notes2Pic features a $10 lifetime license. You get unlimited watermark-free high-res exports and saved creator profiles forever.',
      },
    ],
  },
  {
    slug: 'pika',
    path: '/comparison/pika',
    competitorName: 'Pika.style',
    metaTitle: 'Notes2Pic vs Pika.style — Quote Generator vs Screenshot Mockup Tool',
    metaDescription:
      'Compare Notes2Pic vs Pika.style. Pika is a broad-purpose visual mockup tool for browser screenshots and code. Notes2Pic is a specialized, fast quote and post composer for writers creating branded Instagram graphics. Try Notes2Pic free.',
    h1: 'Notes2Pic vs Pika.style',
    subhead:
      'Pika is a general-purpose design canvas for mockups, browser frames, and code snippets. Notes2Pic is a targeted, fast text-to-image studio built for writers who want their written ideas to look branded in seconds.',
    atGlance: [
      {
        type: 'pros',
        text: 'Notes2Pic: Laser-focused on text posts and quotes. Includes custom social layouts (X, Threads, Substack Notes), profile presets, and automatic thread-to-carousel splitters. Billed at $5/mo or $10 lifetime.',
      },
      {
        type: 'pros',
        text: 'Pika.style: A broad screenshot mockup editor. Great for framing code snippets, web layouts, and general browser screenshots with 3D tilts and shadows.',
      },
      {
        type: 'cons',
        text: 'Workflow Speed: Pika requires manual canvas design and alignment. Notes2Pic uses preset editorial templates to yield ready-to-post graphics in 10 seconds.',
      },
    ],
    featuresTable: [
      { feature: 'Core Target', competitor: 'Software developers & general designers', notes2pic: 'Writers, bloggers, & content repurposers' },
      { feature: 'Workflow', competitor: 'Blank canvas design & manual arrangement', notes2pic: 'Paste text, select template, and download (10 seconds)' },
      { feature: 'Social Mockup Presets', competitor: 'Basic browser & app frames', notes2pic: 'Authentic X, Threads, and Substack Notes presets' },
      { feature: 'Multi-slide Carousels', competitor: 'Manual copy-paste for each slide', notes2pic: 'Automatic split-and-number thread to carousel engine' },
      { feature: 'Typography', competitor: 'Standard fonts & text boxes', notes2pic: 'Preserves line breaks, indentations, & editorial text wrapping' },
      { feature: 'Pricing model', competitor: 'Free (with watermarks) or $10-$15/mo', notes2pic: '$5/mo or $10 Lifetime deal (Unlimited exports)' },
    ],
    sections: [
      {
        title: 'Design Canvas vs. Fast Quote Composer',
        body: 'Pika.style behaves like a lightweight Figma or Canva, letting you add gradients, shadow padding, and mockups. This is excellent for design-oriented projects but slow for writers. Notes2Pic focuses entirely on text content: you paste text, choose a preset styling mode (Short-form or Medium-form), select one of our curated templates, and export immediately. There is no manual alignment, font-pairing, or padding tweaks required.',
      },
      {
        title: 'Automatic Thread Splitting',
        body: 'If you want to turn a 5-tweet thread or a medium-length essay into an Instagram carousel, Pika forces you to duplicate your design multiple times and copy-paste text slide by slide. Notes2Pic does this automatically. Our carousel engine splits your writing at natural sentence or numeric breaks, numbers the slides, and packages them in a single .zip download in seconds.',
      },
      {
        title: 'Authentic Social Media Presets',
        body: 'Notes2Pic natively mimics the formatting, fonts, and layouts of Substack Notes, X, and Threads. By using saved profiles (avatars, handles, verification badges), you can generate images that look like native high-resolution screenshots of viral posts, which historically earn high engagement and shares on Instagram.',
      },
    ],
  },
  {
    slug: 'tweetpik',
    path: '/comparison/tweetpik',
    competitorName: 'TweetPik',
    metaTitle: 'Notes2Pic vs TweetPik — Active vs Unmaintained Tweet Screenshot Tool',
    metaDescription:
      'Compare Notes2Pic vs TweetPik. TweetPik has publicly halted maintenance on its Pro/paid plans. Notes2Pic offers an active, manual alternative to generate clean social media quote graphics and carousels from $5/mo or $10 lifetime.',
    h1: 'Notes2Pic vs TweetPik',
    subhead:
      'TweetPik was a popular automated screenshot tool, but its Pro plans are no longer maintained. Notes2Pic offers an active, manual-first alternative designed to reliably turn X posts, Threads, and text into branded graphics.',
    atGlance: [
      {
        type: 'pros',
        text: 'Notes2Pic: Fully maintained, active roadmap. Manual-first studio that never fails when X changes its layouts. Supports carousels, Substack Notes, and custom text. Sells for $5/mo or $10 lifetime.',
      },
      {
        type: 'pros',
        text: 'TweetPik: Automated URL-based tweet capture. However, the Pro plans are discontinued and the site directs users to migrate elsewhere due to lack of maintenance.',
      },
      {
        type: 'cons',
        text: 'Service Stability: TweetPik is unmaintained and prone to API breakdown. Notes2Pic is built to bypass X bans/scraping limits via direct editor entries.',
      },
    ],
    featuresTable: [
      { feature: 'Maintenance Status', competitor: 'Discontinued / Unmaintained Pro plan', notes2pic: 'Active development & daily support' },
      { feature: 'Platform Support', competitor: 'X (Twitter) only', notes2pic: 'X, Threads, Substack Notes, & Custom Text' },
      { feature: 'Crawl/Scrape Risks', competitor: 'High (API limits or layouts break screenshots)', notes2pic: 'None (Manual entry makes it immune)' },
      { feature: 'Medium-form Text support', competitor: 'Not supported', notes2pic: 'Curated editorial templates for essays & quotes' },
      { feature: 'Carousel generator', competitor: 'Basic stitching', notes2pic: 'Splits threads into multi-image slides (.zip)' },
      { feature: 'Pricing', competitor: 'Pro plan discontinued', notes2pic: '$5/mo or $10 Lifetime deal (Unlimited exports)' },
    ],
    sections: [
      {
        title: 'Bypassing the Maintenance and API Crisis',
        body: 'Twitter screenshot tools that rely on automated scraping or direct API access are in a constant battle with X. When X locks down its endpoints or rates limits requests, automated screenshot services go down or capture broken images. TweetPik has discontinued maintenance on its Pro services due to these challenges. Notes2Pic is a manual visual studio where you control the text directly, offering absolute reliability and zero downtime.',
      },
      {
        title: 'Support for the Entire Creator Ecosystem',
        body: 'TweetPik only supported X (Twitter) screenshots. But modern writers aren\'t just on X; they post on Threads and publish Substack Notes. Notes2Pic features layout presets for all three platforms, as well as a "Medium-form" mode for formatting raw text, essays, and standalone quotes.',
      },
      {
        title: 'A True Lifetime Deal alternative',
        body: 'Instead of complex API billing or unmaintained services, Notes2Pic offers a $10 one-time lifetime license. You get unlimited, high-resolution PNG exports, complete watermark removal, and saved creator profiles with no monthly fees.',
      },
    ],
  },
  {
    slug: 'pikaso',
    path: '/comparison/pikaso',
    competitorName: 'Pikaso',
    metaTitle: 'Notes2Pic vs Pikaso — The Manual Studio vs Bot-Based Screenshot Tools',
    metaDescription:
      'Compare Notes2Pic vs Pikaso. Following X\'s suspension of the @Pikaso_Me bot in March 2026, Pikaso relies solely on its web app. Notes2Pic offers a manual, robust, and cheaper alternative for quotes and carousels.',
    h1: 'Notes2Pic vs Pikaso',
    subhead:
      'Pikaso lost its primary reply-bot (@Pikaso_Me) in March 2026 due to X\'s developer bans. Notes2Pic provides a manual, secure, and actively developed studio that doesn\'t depend on bots and never breaks.',
    atGlance: [
      {
        type: 'pros',
        text: 'Notes2Pic: Manual-first web editor. Supports custom text, Substack Notes, and Threads in addition to X. Built-in thread-to-carousel engine. Billed at $5/mo or $10 lifetime.',
      },
      {
        type: 'pros',
        text: 'Pikaso: URL-based screenshot web app and browser extension. (Note: The @Pikaso_Me Twitter reply bot was suspended and deleted by X in March 2026). Pricing starts at $8-12/mo.',
      },
      {
        type: 'cons',
        text: 'Platform Risk: Bot-based tools are highly vulnerable to X bans. Notes2Pic is a client-rendered editor, ensuring you can design posts without login risk.',
      },
    ],
    featuresTable: [
      { feature: 'Reply Bot Status', competitor: 'Deleted by X (March 2026)', notes2pic: 'Never used (No platform risk)' },
      { feature: 'Scrape/API Limits', competitor: 'Subject to X blocks & layout changes', notes2pic: 'None (Independent client editor)' },
      { feature: 'Supported Formats', competitor: 'X (Twitter) only', notes2pic: 'X, Threads, Substack Notes, & Custom Quotes' },
      { feature: 'Canvas Aspect Ratios', competitor: 'Basic crop sizes', notes2pic: 'Sized for Instagram (Square, Portrait, Story)' },
      { feature: 'Carousel Slide Builder', competitor: 'Not supported', notes2pic: 'Unrolls threads into separate images in a ZIP' },
      { feature: 'Pricing', competitor: 'Starts at $8-$12/month', notes2pic: '$5/mo or $10 Lifetime deal (Unlimited exports)' },
    ],
    sections: [
      {
        title: 'The Deletion of @Pikaso_Me and Bot Vulnerability',
        body: 'For years, Pikaso relied on its Twitter reply bot `@Pikaso_Me` (acquired by Sticker Mule) to automate screenshots. In March 2026, X suspended and permanently deleted the bot account, stripping away its 100M monthly impressions overnight. This highlights the extreme risk of bot-based automation. Notes2Pic is a web-based, manual studio. It does not use bots, request your login keys, or scrape endpoints, making it 100% resilient and safe.',
      },
      {
        title: 'Beyond Single Tweets: Carousels and Substack',
        body: 'Pikaso is built to grab single screenshots of tweets. Notes2Pic is a creative studio. It has preset templates for Substack Notes and Meta Threads, a medium-form editor for essays, and a dedicated carousel engine that takes long threads, breaks them down into slide-sized chunks, numbers them, and exports them as a ZIP.',
      },
      {
        title: 'Better Value for Indie Creators',
        body: 'Pikaso charges a monthly subscription of $8 to $12 for its premium features. Notes2Pic offers a flat $10 lifetime deal or a $5 monthly plan that removes all watermarks, unlocks unlimited exports, and lets you save multiple creator profiles.',
      },
    ],
  },
]

export function getComparison(slug) {
  const clean = (slug || '').toLowerCase().trim()
  return COMPARISONS.find((comp) => comp.slug === clean) || null
}
