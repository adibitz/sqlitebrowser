import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

const sharedAlias = { '@shared': resolve('src/shared') }

// Production-only CSP: the dev server needs an inline React refresh preamble that this would block.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const cspPlugin: Plugin = {
  name: 'sqliteview-csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    },
  ],
}

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
  },
  preload: {
    resolve: { alias: sharedAlias },
    // Sandboxed preloads can only require 'electron', so everything else is bundled in.
    build: { externalizeDeps: false },
  },
  renderer: {
    resolve: { alias: { ...sharedAlias, '@': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss(), cspPlugin],
  },
})
