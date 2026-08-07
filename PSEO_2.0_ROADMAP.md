# 🗺️ Notes2Pic: Programmatic SEO 2.0 Roadmap

> [!WARNING]
> **ROADMAP & FUTURE PLANS ONLY**  
> Do **NOT** execute, generate code, or modify the database for this feature during the current session. This document serves as a design guide for future developers or AI agents when the team is ready to scale search acquisition.

This plan details a schema-driven, interactive programmatic SEO (pSEO 2.0) engine designed to grow Notes2Pic's organic traffic. Instead of generating thin, text-heavy blog posts, this model focuses on generating **highly useful, interactive resource/template directories** at scale.

---

## 1. Core Architecture Principles

1.  **Strict Data Separation (Content vs. Presentation)**:
    *   **Content**: Saved as pure, type-safe JSON files matching rigid TypeScript interfaces.
    *   **Presentation**: Purpose-built, highly interactive React renderers. They never mix.
2.  **Zero-AI Free-Writing**:
    *   The LLM (e.g. Gemini Flash) is only used to populate strict schemas with structured, highly relevant data based on niche taxonomy.
    *   Page titles and headings are deterministic (templated) to ensure optimal SEO keyword targeting.
3.  **High Utility & Interactivity**:
    *   Pages must pass the bookmark test: *"Would this page still be useful if search engines didn't exist?"*
    *   Every resource page should integrate interactive elements that link back into the core Notes2Pic studio workspace (`/app`).

---

## 2. Directory Layout & Routing

All programmatic landing pages should reside under a unified resource folder:
`/resources/:contentType/:niche`

### Proposed Structure:
*   `src/data/resources/` - Directory holding JSON files categorized by content type.
*   `src/pages/ResourcePage.jsx` - The single dynamic route page that imports the corresponding JSON file and selects the correct React component renderer.
*   `src/components/seo/` - Folder containing the specialized presentation engines.

---

## 3. Resource Schema Definitions (JSON)

### Content Category A: Carousel Swipe Templates
*   **Target Queries**: `[Niche] Instagram carousel template`, `Swipe files for [Niche] writers`.
*   **Interaction**: Renders visual carousel slides. Clicking "⚡ Open in Notes2Pic" loads the template directly into the `/app` workspace editor using URL state.

```typescript
interface CarouselTemplateResource {
  contentType: 'carousel-template';
  niche: string; // e.g., "real-estate", "fitness", "saas"
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
  h1: string;
  subhead: string;
  introduction: string;
  templates: {
    name: string;
    slides: string[]; // pre-numbered slide text, e.g. ["1/ Title", "2/ Body"]
  }[];
  relatedArticleSlug?: string;
}
```

### Content Category B: Content Checklists
*   **Target Queries**: `Content formatting checklist for [Niche]`, `[Niche] writing audit sheet`.
*   **Interaction**: Interactive, checkable list cards utilizing local storage to persist checks. Includes a copy button to export progress.

```typescript
interface ChecklistResource {
  contentType: 'writing-checklist';
  niche: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
  h1: string;
  subhead: string;
  sections: {
    heading: string;
    items: {
      check: string;
      rationale: string;
      importance: 'critical' | 'high' | 'recommended';
    }[];
  }[];
}
```

---

## 4. Taxonomy & Niche Matrix

To prevent generic filler text, every generation prompt must inject a structured context profile of the niche.

```json
{
  "niche": "copywriting",
  "context": {
    "audience": "Freelance copywriters, landing page designers, agency owners",
    "pain_points": "Client acquisition, hooks writing, readability scores, formatting long walls of text",
    "monetization": "Retainers, project-based design work, course sales",
    "tone": "Direct, authoritative, sales-oriented, conversational"
  }
}
```

### Initial Launch Niches:
1.  **Tech Founders / Indie Hackers** (formatting product update threads, shipping logs)
2.  **Personal Finance** (financial advice lists, market roundups)
3.  **Real Estate Agents** (local market reviews, listing hooks)
4.  **Fitness & Health Coaches** (workout tips, nutritional breakdowns)
5.  **Copywriters / Marketers** (landing page frameworks, hook ideas)
6.  **Corporate Career Coaches** (resume advice, meeting checklists)

---

## 5. Prerendering & Crawler Integration

1.  **Sitemap Generation**: Include all `/resources/:contentType/:niche` variations in the static HTML prerender compiler ([`src/lib/seoMeta.js`](file:///c:/Users/okemd/Desktop/Notes2pics/src/lib/seoMeta.js)).
2.  **LLMs Crawl Map**: Populate generated directories inside the root [`llms.txt`](file:///c:/Users/okemd/Desktop/Notes2pics/dist/llms.txt) catalog so AI tools (ChatGPT, Claude, Perplexity) easily extract templates and cite Notes2Pic.
