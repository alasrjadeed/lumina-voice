// Browsing media that ships with the app or already sits in the project folder.
//
// The browser cannot list a directory, so `/media-index` (a dev/preview
// middleware in vite.config.js) walks the folder and returns what it finds.
// This stays a convenience on top of the URL and upload paths — never the only
// way to set an image — so a built static bundle still works without it.

export const MEDIA_INDEX_URL = '/media-index'

export function folderFetchAvailable() {
  return typeof fetch === 'function'
}

export async function listFolder(dir = '.', kind = 'image') {
  const url = `${MEDIA_INDEX_URL}?dir=${encodeURIComponent(dir)}&kind=${encodeURIComponent(kind)}`
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!r.ok) {
    const msg = r.status === 400 ? 'That folder is outside the project.' : 'Folder listing is unavailable here.'
    throw new Error(msg)
  }
  const j = await r.json()
  return Array.isArray(j.files) ? j.files : []
}

// A file found by the walker is served from the site root, so `/audio/x.opus`
// and `/covers/x.jpg` both resolve as-is. Paths are returned with a leading
// slash so they drop straight into the same fields a pasted URL would use.
export function toWebPath(fileUrl) {
  const clean = String(fileUrl || '').trim()
  if (!clean) return ''
  if (/^https?:\/\//i.test(clean) || clean.startsWith('data:') || clean.startsWith('blob:')) return clean
  return clean.startsWith('/') ? clean : `/${clean}`
}

export function humanSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// Folders worth offering as one-click starting points.
export const MEDIA_ROOTS = [
  { dir: 'public', label: 'public (shipped with the app)' },
  { dir: 'public/audio', label: 'public/audio' },
  { dir: 'public/covers', label: 'public/covers' },
  { dir: 'media', label: 'media' },
  { dir: 'assets', label: 'assets' },
  { dir: '.', label: 'project root' }
]
