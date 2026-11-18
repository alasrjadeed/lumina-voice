import { archiveCoverUrl } from './artwork'

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(\?|#|$)/i

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

export function archiveIdentifier(input) {
  const raw = (input || '').trim()
  if (!raw) return ''
  const details = raw.match(/archive\.org\/details\/([^/?#]+)/i)
  const img = raw.match(/archive\.org\/services\/img\/([^/?#]+)/i)
  const dl = raw.match(/archive\.org\/download\/([^/?#]+)/i)
  const meta = raw.match(/archive\.org\/metadata\/([^/?#]+)/i)
  if (details) return safeDecode(details[1])
  if (img) return safeDecode(img[1])
  if (dl) return safeDecode(dl[1])
  if (meta) return safeDecode(meta[1])
  if (/^[A-Za-z0-9._-]+$/.test(raw) && !/^https?:/i.test(raw)) return raw
  return ''
}

export function archiveDownloadFile(input) {
  const m = String(input || '').match(/archive\.org\/download\/[^/?#]+\/([^/?#]+)/i)
  return m ? safeDecode(m[1]) : ''
}

export function isArchiveUrl(input) {
  return /archive\.org/i.test(input || '')
}

export function looksLikeArchiveId(input) {
  const raw = String(input || '').trim()
  if (!raw || /^https?:/i.test(raw) || /\s/.test(raw)) return false
  if (/archive\.org/i.test(raw)) return true
  return /^[A-Za-z0-9._-]+$/.test(raw) && (/[0-9]/.test(raw) || /_/.test(raw) || raw.length > 18)
}

function formatScore(name) {
  const x = String(name || '').toLowerCase()
  if (x.endsWith('.opus') || x.endsWith('.ogg') || x.endsWith('.oga')) return 4
  if (x.endsWith('.m4a') || x.endsWith('.aac')) return 3
  if (x.endsWith('.mp3')) return 2
  return 1
}

function isPlayableAudio(f) {
  if (!f || !f.name || !AUDIO_EXT.test(f.name)) return false
  if (/sample|preview|spectrogram|png\.mp3$/i.test(f.name)) return false
  return true
}

function betterFile(a, b) {
  const sa = formatScore(a.name)
  const sb = formatScore(b.name)
  if (sa !== sb) return sa > sb ? a : b
  const orig = (f) => String(f.source || '').toLowerCase() === 'original'
  if (orig(a) !== orig(b)) return orig(a) ? a : b
  return (Number(a.size) || 0) >= (Number(b.size) || 0) ? a : b
}

function secondsFrom(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v).trim()
  const hms = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?$/)
  if (hms) {
    if (hms[3] != null) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])
    return Number(hms[1]) * 60 + Number(hms[2])
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function durationOf(file, md) {
  const sec = secondsFrom(file?.length) || secondsFrom(md?.length) || secondsFrom(md?.runtime)
  if (sec > 0) return Math.max(1, Math.round(sec / 60))
  return 0
}

function trackName(fileName) {
  return String(fileName || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function listTracks(files, id) {
  const list = (files || []).filter(isPlayableAudio)
  const byStem = new Map()
  for (const f of list) {
    const stem = f.name.replace(/\.[^.]+$/, '').replace(/_(64kb|vbr)$/i, '')
    const prev = byStem.get(stem)
    if (!prev || betterFile(f, prev) === f) byStem.set(stem, f)
  }
  return [...byStem.values()]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((file) => ({
      name: trackName(file.name),
      fileName: file.name,
      audioUrl: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(file.name)}`,
      duration: durationOf(file, {})
    }))
}

function fetchOneJson(href, ms, ctrl) {
  const timer = setTimeout(() => ctrl.abort(), ms)
  return fetch(href, { signal: ctrl.signal })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .finally(() => clearTimeout(timer))
}

function joinedSignal(parent) {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  if (parent) {
    if (parent.aborted) ctrl.abort()
    else parent.addEventListener('abort', onAbort, { once: true })
  }
  return { ctrl, drop: () => parent && parent.removeEventListener('abort', onAbort) }
}

async function fetchJson(urls, signal) {
  const errors = []
  const wraps = urls.map(() => joinedSignal(signal))
  return await new Promise((resolve, reject) => {
    let pending = urls.length
    let done = false
    urls.forEach((href, i) => {
      fetchOneJson(href, 12000, wraps[i].ctrl)
        .then((data) => {
          if (done) return
          done = true
          wraps.forEach((w, j) => {
            if (j !== i) w.ctrl.abort()
            w.drop()
          })
          resolve(data)
        })
        .catch((e) => {
          wraps[i].drop()
          if (done) return
          if (signal?.aborted) {
            done = true
            reject(new Error('cancelled'))
            return
          }
          errors.push(e.name === 'AbortError' ? 'Archive.org timed out' : e.message || 'network error')
          pending -= 1
          if (pending === 0) reject(new Error([...new Set(errors.filter(Boolean))].join(' · ') || 'Could not reach Archive.org.'))
        })
    })
  })
}

export async function fetchArchiveItem(input, signal) {
  const id = archiveIdentifier(input)
  if (!id) throw new Error('Paste an Archive.org item URL or identifier.')
  const data = await fetchJson(
    [
      `/import-proxy/archive/metadata/${encodeURIComponent(id)}`,
      `https://archive.org/metadata/${encodeURIComponent(id)}`
    ],
    signal
  )
  const md = data.metadata || {}
  let tracks = listTracks(data.files, id)
  const wanted = archiveDownloadFile(input)
  if (wanted) {
    const hit = tracks.find((t) => t.fileName === wanted || t.fileName.toLowerCase() === wanted.toLowerCase())
    if (hit) tracks = [hit]
    else {
      tracks = [
        {
          name: trackName(wanted),
          fileName: wanted,
          audioUrl: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(wanted)}`,
          duration: durationOf(null, md)
        }
      ]
    }
  }
  if (!tracks.length) throw new Error('That item has no playable audio file.')
  const file = tracks[0]
  const creator = Array.isArray(md.creator) ? md.creator[0] : md.creator || md.artist || 'Unknown'
  const subject = Array.isArray(md.subject) ? md.subject[0] : md.subject || 'Audiobook'
  const desc = String(md.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const duration = tracks.reduce((n, t) => n + (t.duration || 0), 0) || durationOf(null, md)
  return {
    identifier: id,
    name: md.title || id,
    creator,
    description: desc.slice(0, 420),
    subject,
    year: Number(String(md.year || md.date || '').slice(0, 4)) || new Date().getFullYear(),
    audioUrl: file.audioUrl,
    fileName: file.fileName,
    format: file.fileName.split('.').pop(),
    size: 0,
    duration,
    tracks,
    coverUrl: archiveCoverUrl(id),
    sourceUrl: `https://archive.org/details/${encodeURIComponent(id)}`
  }
}

export function isAudioUrl(v) {
  if (!v) return false
  const s = String(v).trim()
  if (s.startsWith('blob:') || s.startsWith('data:audio') || s.startsWith('local:')) return true
  if (AUDIO_EXT.test(s)) return true
  try {
    const u = new URL(s)
    if (AUDIO_EXT.test(u.pathname)) return true
    return u.hostname.endsWith('archive.org') && /\/download\//i.test(u.pathname)
  } catch {
    return false
  }
}

function asList(v) {
  if (!v) return ''
  return Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v)
}

export async function searchArchiveAudio(query, rows = 8, signal) {
  const q = String(query || '').trim()
  if (!q) return []
  const terms = `(${q}) AND (mediatype:audio OR format:MP3 OR format:"VBR MP3" OR format:"Ogg Vorbis" OR format:Flac)`
  const qs =
    '?q=' +
    encodeURIComponent(terms) +
    '&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=description&fl[]=year&fl[]=downloads&rows=' +
    rows +
    '&page=1&output=json&sort[]=downloads+desc'
  const data = await fetchJson(
    [`/import-proxy/archive/advancedsearch.php${qs}`, `https://archive.org/advancedsearch.php${qs}`],
    signal
  )
  const docs = data?.response?.docs || []
  return docs.map((d) => ({
    identifier: d.identifier,
    name: d.title || d.identifier,
    creator: asList(d.creator) || 'Unknown',
    description: String(d.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280),
    year: Number(String(d.year || '').slice(0, 4)) || 0,
    coverUrl: archiveCoverUrl(d.identifier),
    sourceUrl: `https://archive.org/details/${encodeURIComponent(d.identifier)}`
  }))
}

/* ------------------------------------------------------------------ *
 * Direct-node streaming — archive.org/download 302-redirects to a
 * randomly picked storage node, and some nodes crawl at ~20 KB/s or
 * stall outright (playback mutes mid-track). The item metadata names
 * the healthy primary node (d1) and its directory, so we build the
 * direct URL ourselves. Falls back to the original URL on any failure.
 * ------------------------------------------------------------------ */
// The node/directory pair is fixed for an item. Cache it (including a failed
// lookup) so switching episodes, replaying and seeking never pay the metadata
// round trip twice. Concurrent calls share one in-flight request.
const nodeCache = new Map()

export async function fastArchiveStream(url, signal) {
  const raw = String(url || '').trim()
  if (!/archive\.org\/download\//i.test(raw)) return raw
  try {
    const u = new URL(raw)
    const parts = u.pathname.split('/').filter(Boolean) // download, <id>, ...file
    const id = parts[1]
    const file = parts.slice(2).join('/')
    if (!id || !file) return raw
    let node = nodeCache.get(id)
    if (!node) {
      node = fetchJson([`https://archive.org/metadata/${encodeURIComponent(id)}`], signal)
        .then((meta) => (meta?.d1 && meta?.dir ? { d1: meta.d1, dir: meta.dir } : null))
        .catch(() => null)
      nodeCache.set(id, node)
    }
    const resolved = await node
    if (!resolved) return raw
    return `https://${resolved.d1}${resolved.dir}/${file}${u.search || ''}`
  } catch {
    return raw
  }
}

// Warm the cached node while the listener is still reading the title page, so
// the first tap plays immediately instead of waiting for metadata.
export function warmArchiveStream(url) {
  if (/archive\.org\/download\//i.test(String(url || ''))) void fastArchiveStream(url)
}
