const KEY = 'lumina-file-library-v1'

export const GROUP_MODES = [
  { id: 'author', label: 'By author' },
  { id: 'title', label: 'By title' },
  { id: 'kind', label: 'By kind' },
  { id: 'series', label: 'By series' }
]

export function loadFileLibraryPrefs() {
  try {
    if (typeof localStorage === 'undefined') return { groupBy: 'author', open: [] }
    const raw = localStorage.getItem(KEY)
    if (!raw) return { groupBy: 'author', open: [] }
    const parsed = JSON.parse(raw)
    const groupBy = GROUP_MODES.some((m) => m.id === parsed.groupBy) ? parsed.groupBy : 'author'
    const open = Array.isArray(parsed.open) ? parsed.open.map(String) : []
    return { groupBy, open }
  } catch {
    return { groupBy: 'author', open: [] }
  }
}

export function saveFileLibraryPrefs(next) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify({
        groupBy: next.groupBy || 'author',
        open: Array.isArray(next.open) ? next.open : []
      }))
    }
  } catch {
    /* quota */
  }
}

export function fileExt(ep, title) {
  if (title?.imported) {
    const url = ep.audio || ep.asset || ''
    const m = String(url).match(/\.([a-z0-9]+)(?:\?|#|$)/i)
    if (m) return m[1].toLowerCase()
    if (String(ep.asset || '').startsWith('local:')) return 'audio'
    return 'audio'
  }
  return 'opus'
}

export function episodeFileName(ep, i, title) {
  const n = String(i + 1).padStart(2, '0')
  const label = ep.titleEn || ep.title || `Episode ${i + 1}`
  return `e${n} — ${label}.${fileExt(ep, title)}`
}

export function episodeSource(ep, title) {
  if (title?.imported) return title.source || 'import'
  if (String(ep.asset || '').startsWith('local:')) return 'local'
  if (ep.audio && /^https?:/i.test(ep.audio)) return 'url'
  return 'house'
}

function hit(v, q) {
  return (v || '').toLowerCase().includes(q)
}

export function titleMatches(title, author, series, q) {
  if (!q) return true
  return (
    hit(title.name, q) ||
    hit(title.nameUr, q) ||
    hit(title.number, q) ||
    hit(title.kind, q) ||
    hit(title.source, q) ||
    hit(author?.name, q) ||
    hit(author?.nameUr, q) ||
    hit(series?.name, q) ||
    (title.genres || []).some((g) => hit(g, q)) ||
    (title.episodes || []).some((ep) => hit(ep.titleEn, q) || hit(ep.title, q) || hit(ep.asset, q) || hit(ep.audio, q))
  )
}

export function folderStats(titles) {
  const files = titles.reduce((n, t) => n + (t.episodes || []).length, 0)
  return { books: titles.length, files }
}

// Shared by the per-file action menu and its tests. Every part can be deleted
// from the device: imported parts are removed outright, while bundled and cloud
// parts are hidden through a local title override (the shared catalogue stays).
export function fileActionOptions() {
  return [
    { id: 'play', label: 'Play part' },
    { id: 'edit', label: 'Edit name' },
    { id: 'replace', label: 'Replace audio' },
    { id: 'share', label: 'Share file' },
    { id: 'open', label: 'Open title' },
    { id: 'delete', label: 'Delete part' }
  ]
}

export function virtualPath(parts) {
  return parts.filter(Boolean).join(' / ')
}
