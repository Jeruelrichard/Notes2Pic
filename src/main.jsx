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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
