// One content rule for every surface: a title is publishable only when its
// audio comes from Archive.org. Advertising audio is separate (src/data/ads.js)
// and is deliberately not affected by this policy.

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(?:[?#]|$)/i

function parseUrl(value) {
  if (!value) return null
  try {
    return new URL(String(value).trim())
  } catch {
    return null
  }
}

export function isArchiveHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  return host === 'archive.org' || host === 'www.archive.org' || host.endsWith('.archive.org')
}

// www.archive.org adds a redirect hop without CORS headers, which mutes the
// Web Audio analyser. Canonicalise once at the data layer so playback, storage
// and Supabase all see the same URL.
export function canonicalArchiveUrl(value) {
  const url = parseUrl(value)
  if (!url || !isArchiveHost(url.hostname)) return value
  if (url.hostname === 'www.archive.org') url.hostname = 'archive.org'
  url.protocol = 'https:'
  return url.toString()
}

export function isArchiveAudioUrl(value) {
  const url = parseUrl(value)
  if (!url || url.protocol !== 'https:' || !isArchiveHost(url.hostname)) return false
  if (!/^\/download\/[^/]+\/[^/]+/i.test(url.pathname)) return false
  return AUDIO_EXT.test(url.pathname)
}

export function isArchiveContent(title) {
  if (!title || typeof title !== 'object') return false
  const episodes = Array.isArray(title.episodes) ? title.episodes : []
  return episodes.some((ep) => isArchiveAudioUrl(ep?.audio) || isArchiveAudioUrl(ep?.src))
}

export function canonicaliseTitle(title) {
  if (!title || typeof title !== 'object') return null
  const episodes = (Array.isArray(title.episodes) ? title.episodes : [])
    .map((ep) => {
      if (!ep || typeof ep !== 'object') return null
      const next = { ...ep }
      if (next.audio) next.audio = canonicalArchiveUrl(next.audio)
      if (next.src) next.src = canonicalArchiveUrl(next.src)
      if (!isArchiveAudioUrl(next.audio) && !isArchiveAudioUrl(next.src)) return null
      if (!next.audio && next.src) next.audio = next.src
      if (!next.src && next.audio) next.src = next.audio
      return next
    })
    .filter(Boolean)
  if (!episodes.length) return null
  return {
    ...title,
    source: 'archive.org',
    sourceUrl: canonicalArchiveUrl(title.sourceUrl) || title.sourceUrl,
    episodes
  }
}

export function filterArchiveTitles(list) {
  const seen = new Set()
  const out = []
  for (const title of Array.isArray(list) ? list : []) {
    const clean = canonicaliseTitle(title)
    if (!clean || !clean.id || seen.has(clean.id)) continue
    seen.add(clean.id)
    out.push(clean)
  }
  return out
}

export function archiveTitleIds(list) {
  return new Set(filterArchiveTitles(list).map((t) => t.id))
}
