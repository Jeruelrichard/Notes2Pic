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
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Listen for new service worker installs
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update ready, notify and reload
              console.log('New update installed. Reloading...')
              window.location.reload()
            }
          })
        })
      })
    })

    // Listen for controlling service worker change and reload
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
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
