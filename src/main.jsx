import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './marketing.css'
import AppShell from './AppShell'

const rootElement = document.getElementById('root')

const tree = (
  <StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </StrictMode>
)

// Prerendered pages ship server-rendered markup — hydrate it. The SPA-only app
// route ships an empty root, so fall back to a fresh render there.
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, tree)
} else {
  createRoot(rootElement).render(tree)
}

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
    })
  } else {
    // Dev: unregister any leftover service worker (e.g. registered by a previous
    // production build / `vite preview` on this origin). A stale SW is a classic
    // cause of "my change isn't showing" — it serves an old cached bundle on
    // normal navigations (including OAuth redirects) even though hard-refresh works.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })
  }
}
