import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite does NOT read the PORT env var by default. Tooling (e.g. the preview
// harness's autoPort) hands the app a port via PORT and then watches it, so we
// must bind exactly that port or the tool ends up watching an empty port.
const envPort = process.env.PORT ? Number(process.env.PORT) : undefined

// Vite's dev server doesn't run the Vercel serverless functions in /api, so
// calls like /api/tweet 404 locally. Proxy them to production so the tool pages
// are testable in `npm run dev`. Dev-only — production serves /api itself.
const apiProxy = {
  '/api': {
    target: 'https://www.notes2pic.com',
    changeOrigin: true,
    secure: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    ...(envPort ? { port: envPort, strictPort: true } : {}),
    proxy: apiProxy,
  },
})
