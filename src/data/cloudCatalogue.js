// Cloud catalogue snapshot — metadata only. A cron job on the local server
// exports the Archive.org-only `stories` rows to /catalogue.json; devices pull
// that file on sign-in, on resume and periodically, then map it into the same
// title/episode shape the bundled catalogue uses. Audio never travels through
// this file — every episode still streams straight from archive.org.

import { canonicalArchiveUrl, isArchiveAudioUrl } from './contentPolicy.js'

const SNAPSHOT_KEY = 'lumina-cloud-catalogue-v1'
const DEFAULT_SNAPSHOT = '/catalogue.json'

function readEnv(name) {
  try {
    return String(import.meta.env?.[name] || '').trim()
  } catch {
    return ''
  }
}

export function catalogueSnapshotUrl() {
  return readEnv('VITE_CATALOGUE_SNAPSHOT_URL') || DEFAULT_SNAPSHOT
}

// .../download/<item>/<file> -> .../details/<item> — the one outward audiobook
// link the app and admin dashboard show.
export function archiveDetailsUrl(audioUrl) {
  const canonical = canonicalArchiveUrl(audioUrl)
  try {
    const match = new URL(canonical).pathname.match(/^\/download\/([^/]+)\//i)
    if (!match) return ''
    const id = decodeURIComponent(match[1])
    return `https://archive.org/details/${encodeURIComponent(id)}`
  } catch {
    return ''
  }
}

function codecFor(url) {
  const match = String(url).match(/\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(?:[?#]|$)/i)
  return match ? match[1].toLowerCase() : 'mp3'
}

// One Supabase `stories` row becomes one playable audiobook entry. Unknown
// columns are ignored so older projects keep working; non-Archive rows are
// dropped here as well as by the SQL constraint and the admin form.
export function mapStoryRow(row) {
  if (!row || typeof row !== 'object' || !row.id) return null
  if (row.published === false || row.published === 'false') return null
  const audioUrl = canonicalArchiveUrl(row.audio_url || row.audioUrl)
  if (!isArchiveAudioUrl(audioUrl)) return null
  const coverUrl = canonicalArchiveUrl(row.cover_url || row.coverUrl || '')
  const details = archiveDetailsUrl(audioUrl)
  const createdAt = row.created_at || row.createdAt || ''
  const year = createdAt ? new Date(createdAt).getFullYear() : null
  const genres = Array.isArray(row.genres) && row.genres.length ? row.genres : ['Audiobook']
  return {
    id: `cloud-${row.id}`,
    number: 'IA',
    name: row.title || details || 'Archive.org audiobook',
    nameUr: row.title_ur || row.titleUr || '',
    seriesId: null,
    voiceId: 'pk-female',
    authorId: row.author_id || row.authorId || null,
    genres,
    kind: row.kind || 'Audiobook',
    featured: false,
    top: false,
    year: Number.isFinite(year) ? year : null,
    cover: 'cipher1',
    coverUrl,
    source: 'archive.org',
    sourceUrl: details || canonicalArchiveUrl(row.source_url || row.sourceUrl || '') || audioUrl,
    synopsis: row.description || '',
    imported: false,
    cloud: true,
    episodes: [{
      id: `cloud-e-${row.id}`,
      title: row.title || 'Listen',
      titleEn: '',
      free: true,
      asset: '',
      audio: audioUrl,
      src: audioUrl,
      codec: codecFor(audioUrl),
      kbps: null,
      channels: '',
      duration: Number(row.duration) || null
    }]
  }
}

export function parseCatalogueSnapshot(data) {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.stories) ? data.stories : []
  const seen = new Set()
  const titles = []
  for (const row of rows) {
    const title = mapStoryRow(row)
    if (!title || seen.has(title.id)) continue
    seen.add(title.id)
    titles.push(title)
  }
  return titles
}

export function loadCachedCatalogue() {
  try {
    if (typeof localStorage === 'undefined') return []
    return parseCatalogueSnapshot(JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null'))
  } catch {
    return []
  }
}

function cacheCatalogue(data) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
      version: 1,
      generatedAt: data?.generatedAt || new Date().toISOString(),
      stories: Array.isArray(data?.stories) ? data.stories : []
    }))
  } catch {
    /* storage full or disabled — the network copy is still usable */
  }
}

export async function fetchCatalogue(signal) {
  const response = await fetch(catalogueSnapshotUrl(), {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) throw new Error(`Catalogue snapshot ${response.status}`)
  const data = await response.json()
  const titles = parseCatalogueSnapshot(data)
  cacheCatalogue(data)
  return titles
}

export const CLOUD_CATALOGUE_KEY = SNAPSHOT_KEY
