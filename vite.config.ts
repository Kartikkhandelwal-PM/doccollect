import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project from /<repo-name>/, so the build is told where it lives.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
})
