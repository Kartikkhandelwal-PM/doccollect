import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project from /<repo-name>/, so the build is told where it lives.
  base: process.env.VITE_BASE ?? '/',
  // Changes with every build, so saved demo data from an older version is never reused.
  define: { __BUILD_ID__: JSON.stringify(String(Date.now())) },
  plugins: [react(), tailwindcss()],
})
