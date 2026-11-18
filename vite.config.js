import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

// Folder browsing for the studio. Vite only serves the project directory during
// dev, so the browser cannot list `public/` or a media folder on its own. This
// walks the folder and returns the media files it finds, which is what the
// Title editor's "Pick from folder" control consumes.
const mediaIndex = {
  name: 'lumina-media-index',
  configureServer(server) {
    server.middlewares.use(mediaIndexMiddleware)
  },
  configurePreviewServer(server) {
    server.middlewares.use(mediaIndexMiddleware)
  }
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'])
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.opus', '.ogg', '.oga', '.wav', '.flac'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.vite', '__pycache__'])
const MAX_FILES = 500

function walk(dir, kind, rel, out) {
  if (out.length >= MAX_FILES) return
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return
    if (entry.name.startsWith('.')) continue
    const abs = path.join(dir, entry.name)
    const relPath = `${rel}/${entry.name}`
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(abs, kind, relPath, out)
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    const wanted = kind === 'image' ? IMAGE_EXT : AUDIO_EXT
    if (!wanted.has(ext)) continue
    let size = 0
    try {
      size = fs.statSync(abs).size
    } catch {
      /* ignore */
    }
    out.push({ url: relPath, name: entry.name, size, ext: ext.slice(1) })
  }
}

function mediaIndexMiddleware(req, res, next) {
  const url = new URL(req.url || '/', 'http://localhost')
  if (url.pathname !== '/media-index') return next()

  // Never let a query reach outside the project — resolve, then confirm the
  // result is still inside ROOT before reading anything.
  const rel = (url.searchParams.get('dir') || '.').replace(/^\/+/, '')
  const abs = path.resolve(ROOT, rel)
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Outside the project folder.' }))
    return
  }

  const kind = url.searchParams.get('kind') === 'audio' ? 'audio' : 'image'
  const files = []
  walk(abs, kind, '', files)
  files.sort((a, b) => a.url.localeCompare(b.url))
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ dir: rel, kind, files }))
}

const audioMime = {
  name: 'audio-mime',
  configureServer(server) {
    server.middlewares.use(mimeMiddleware)
  },
  configurePreviewServer(server) {
    server.middlewares.use(mimeMiddleware)
  }
}

function mimeMiddleware(req, res, next) {
  const path = (req.url || '').split('?')[0]
  if (path.endsWith('.opus')) {
    res.setHeader('Content-Type', 'audio/ogg; codecs=opus')
  } else if (path.endsWith('.m4a')) {
    res.setHeader('Content-Type', 'audio/mp4')
  } else if (path.endsWith('.aac')) {
    res.setHeader('Content-Type', 'audio/aac')
  }
  if (
    path === '/' ||
    path === '/index.html' ||
    path.startsWith('/src/') ||
    path.startsWith('/@') ||
    path.includes('node_modules')
  ) {
    res.setHeader('Cache-Control', 'no-store')
  }
  next()
}

export default defineConfig({
  plugins: [audioMime, mediaIndex],
  build: {
    // Keep legacy media-query syntax. Target devices (older Android WebView on
    // Android 8.1) cannot parse range syntax like `(width<=900px)` and treat it
    // as `not all`, which silently disables every responsive layout rule.
    cssTarget: 'chrome90',
    rolldownOptions: {
      // React Router ships a "use client" directive for RSC bundlers. This is a
      // client-only SPA, so the directive has no effect — silence the notice.
      onLog(level, log, defaultHandler) {
        if (log.code === 'MODULE_LEVEL_DIRECTIVE') return
        defaultHandler(level, log)
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 4310,
    strictPort: true,
    allowedHosts: ['.monkeycode-ai.live'],
    headers: {
      'Cache-Control': 'no-store'
    },
    hmr: false,
    proxy: {
      // Optional local helper (scripts/pw-bridge.mjs). When it is not running
      // the app falls back to simulated status, so swallow the connection
      // error instead of logging a 500 for every poll.
      '/pipewire': {
        target: 'http://localhost:4311',
        changeOrigin: true,
        timeout: 2000,
        configure: (proxy) => {
          proxy.on('error', () => {})
        }
      },
      '/import-proxy/archive': {
        target: 'https://archive.org',
        changeOrigin: true,
        secure: true,
        timeout: 25000,
        proxyTimeout: 25000,
        rewrite: (path) => path.replace(/^\/import-proxy\/archive/, '') || '/'
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4310,
    strictPort: true,
    allowedHosts: ['.monkeycode-ai.live'],
    proxy: {
      // Optional local helper (scripts/pw-bridge.mjs). When it is not running
      // the app falls back to simulated status, so swallow the connection
      // error instead of logging a 500 for every poll.
      '/pipewire': {
        target: 'http://localhost:4311',
        changeOrigin: true,
        timeout: 2000,
        configure: (proxy) => {
          proxy.on('error', () => {})
        }
      },
      '/import-proxy/archive': {
        target: 'https://archive.org',
        changeOrigin: true,
        secure: true,
        timeout: 25000,
        proxyTimeout: 25000,
        rewrite: (path) => path.replace(/^\/import-proxy\/archive/, '') || '/'
      }
    }
  }
})
