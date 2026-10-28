import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project from /<repo-name>/, so the build is told where it lives.
  base: process.env.VITE_BASE ?? '/',
  // Changes with every build, so saved demo data from an older version is never reused.
  define: { __BUILD_ID__: JSON.stringify(String(Date.now())) },
  plugins: [
    react(),
    tailwindcss(),
    {
      // GitHub Pages has no fallback for a direct link like /clients or /empty: it looks for that file and shows 404.html when it is missing.
      // A copy of index.html under that name loads the app, and the router then shows the right page.
      name: 'spa-404-fallback',
      apply: 'build',
      closeBundle() {
        try {
          copyFileSync('dist/index.html', 'dist/404.html')
        } catch {
          /* nothing built */
        }
      },
    },
  ],
})
