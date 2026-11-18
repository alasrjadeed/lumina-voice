// Media / CDN resolver for Lumina Voice.
//
// Audio delivery follows a "split architecture":
//   - Objects live in object storage (Cloudflare R2 recommended: 10 GB free, zero egress)
//     or any S3-compatible bucket / Supabase Storage.
//   - The app stores only URLs. In production set VITE_MEDIA_BASE_URL to your bucket or
//     custom domain, e.g. https://media.luminavoice.app/audio
//   - Locally it falls back to the bundled /public/audio files.
//
// Every asset ships in three delivery variants so the player can negotiate the best one:
//   <asset>.opus      standard Opus   (24-48 kbps mono)  -> audio/ogg; codecs=opus
//   <asset>.lo.opus   data-saver Opus (24 kbps mono)    -> audio/ogg; codecs=opus
//   <asset>.m4a       AAC fallback    (~32-56 kbps mono) -> audio/mp4

const RAW_BASE = (import.meta.env?.VITE_MEDIA_BASE_URL || '').trim()
const ENV_BASE = RAW_BASE.replace(/\/+$/, '')
const OVERRIDE_KEY = 'lumina-media-base'

let overrideBase = ''
try {
  if (typeof localStorage !== 'undefined') {
    overrideBase = (localStorage.getItem(OVERRIDE_KEY) || '').replace(/\/+$/, '')
  }
} catch {
  /* ignore */
}

export function getMediaBase() {
  return overrideBase || ENV_BASE
}

// Runtime override set from the Broadcast Studio; falls back to the build-time env value.
export function setMediaBase(url) {
  const clean = (url || '').trim().replace(/\/+$/, '')
  overrideBase = clean
  try {
    if (typeof localStorage !== 'undefined') {
      if (clean) localStorage.setItem(OVERRIDE_KEY, clean)
      else localStorage.removeItem(OVERRIDE_KEY)
    }
  } catch {
    /* ignore */
  }
  return clean
}

export const MEDIA_BASE = ENV_BASE

export const OPUS_MIME = 'audio/ogg; codecs=opus'
export const AAC_MIME = 'audio/mp4; codecs=mp4a.40.2'

export function isConfigured() {
  return getMediaBase().length > 0
}

export function mediaBaseLabel() {
  const base = getMediaBase()
  if (!base) return 'Bundled /audio (local)'
  return base === ENV_BASE ? `${base} (env)` : `${base} (override)`
}

// A direct asset path (e.g. '/audio/raat-01.opus') is left alone; a bare asset id
// (e.g. 'raat-01') is turned into a delivery path.
export function resolveUrl(path) {
  if (!path) return ''
  const base = getMediaBase()
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) {
    // Bundled path: swap origin when a CDN base is configured.
    if (base) return `${base}${path.replace(/^\/audio/, '')}`
    return path
  }
  // Bare asset id, e.g. 'raat-01.opus'. Local files live under /audio; a CDN base
  // is assumed to already point at the audio prefix.
  return base ? `${base}/${path}` : `/audio/${path}`
}

export function langAssetId(assetId, lang) {
  if (!assetId) return ''
  if (lang === 'en' && !isDirectAsset(assetId) && !String(assetId).endsWith('.en')) return `${assetId}.en`
  return assetId
}

// A direct stream (Archive.org MP3, custom URL) is already the final file.
// Never append a codec suffix to it — `.mp3.opus` does not exist and breaks
// playback. This is the single guard every source builder goes through.
export function isDirectAsset(assetId) {
  return /^https?:\/\//i.test(String(assetId || ''))
}

export function mimeForAssetUrl(url) {
  const path = String(url || '').split('?')[0].toLowerCase()
  if (/\.(opus|ogg|oga)$/.test(path)) return OPUS_MIME
  if (/\.(m4a|aac|mp4)$/.test(path)) return AAC_MIME
  if (/\.mp3$/.test(path)) return 'audio/mpeg'
  if (/\.wav$/.test(path)) return 'audio/wav'
  if (/\.flac$/.test(path)) return 'audio/flac'
  return 'audio/mpeg'
}

export function assetUrl(assetId, variant = 'std') {
  if (isDirectAsset(assetId)) return String(assetId)
  const suffix = variant === 'lo' ? '.lo.opus' : variant === 'aac' ? '.m4a' : '.opus'
  return resolveUrl(`${assetId}${suffix}`)
}

function variantSources(assetId, hq) {
  if (isDirectAsset(assetId)) {
    return [{ src: String(assetId), type: mimeForAssetUrl(assetId), label: 'Direct stream' }]
  }
  const primary = hq
    ? { src: assetUrl(assetId, 'std'), type: OPUS_MIME, label: 'Opus 24–48 kbps mono' }
    : { src: assetUrl(assetId, 'lo'), type: OPUS_MIME, label: 'Opus 24 kbps mono (data saver)' }
  return [primary, { src: assetUrl(assetId, 'aac'), type: AAC_MIME, label: 'AAC fallback' }]
}

// Ordered list of <source> descriptors for a media element. Browsers pick the first
// type they can play, so Opus (most efficient) is offered first, AAC last.
// English playback prefers <id>.en.* and falls back to the Urdu mix.
export function sourceList(assetId, { hq = true, lang } = {}) {
  if (!assetId) return []
  if (isDirectAsset(assetId)) return variantSources(assetId, hq)
  if (lang === 'en') return [...variantSources(langAssetId(assetId, 'en'), hq), ...variantSources(assetId, hq)]
  return variantSources(assetId, hq)
}

export function primaryUrl(assetId, opts) {
  const [first] = sourceList(assetId, opts)
  return first ? first.src : ''
}

// Which codec will actually be used on this device, for UI labelling.
export function bestSupported() {
  if (typeof document === 'undefined') return 'opus'
  try {
    const el = document.createElement('audio')
    if (el.canPlayType(OPUS_MIME)) return 'opus'
    if (el.canPlayType(AAC_MIME)) return 'aac'
  } catch {
    /* ignore */
  }
  return 'opus'
}
