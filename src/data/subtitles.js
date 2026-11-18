// Subtitles — multi-language caption tracks (Arabic, English, Urdu, + more).
// Cues live on the device (localStorage), so the player works offline and no
// content is uploaded anywhere. Adding a language = one line in SUBTITLE_LANGS.

const KEY = 'lumina-subtitles'
const PREF_KEY = 'lumina-subtitle-prefs'

// Language registry. `dir` drives the overlay's text direction (RTL for ar/ur).
export const SUBTITLE_LANGS = [
  { code: 'ur', name: 'اردو', label: 'Urdu', latin: 'ur', dir: 'rtl' },
  { code: 'en', name: 'English', label: 'English', latin: 'en', dir: 'ltr' },
  { code: 'ar', name: 'العربية', label: 'Arabic', latin: 'ar', dir: 'rtl' }
]

export function langMeta(code) {
  return SUBTITLE_LANGS.find((l) => l.code === code) || { code, name: code, label: code, dir: 'ltr' }
}

/* ------------------------------------------------------------------ *
 * Cue parsing — SRT and WebVTT both reduce to {start, end, text}.
 * ------------------------------------------------------------------ */

// "00:01:02,500" (SRT) or "00:01:02.500" / "01:02.500" (VTT) → seconds
export function parseTimecode(raw) {
  const s = String(raw || '').trim().replace(',', '.')
  const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/)
  if (!m) return null
  const [, h, mm, ss] = m
  const secs = Number(ss)
  if (!Number.isFinite(secs)) return null
  return (Number(h || 0) * 3600) + (Number(mm) * 60) + secs
}

function cleanCueText(lines) {
  return lines
    .join('\n')
    .replace(/<[^>]+>/g, '') // strip <i>, <b>, karaoke tags
    .replace(/\{\\[^}]*\}/g, '') // strip ASS-style override blocks
    .trim()
}

// Accepts an SRT or VTT document (or plain "mm:ss text" lines) → sorted cues.
export function parseSubtitle(input) {
  const text = String(input || '').replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '')
  if (!text.trim()) return []
  const blocks = text.split(/\n{2,}/)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    if (!lines.length) continue
    if (/^WEBVTT/i.test(lines[0]) || /^(NOTE|STYLE|REGION)\b/i.test(lines[0])) continue
    // optional numeric counter line
    if (/^\d+$/.test(lines[0].trim())) lines.shift()
    const timingIdx = lines.findIndex((l) => l.includes('-->'))
    if (timingIdx === -1 || !lines[timingIdx + 1]) continue
    const [from, to] = lines[timingIdx].split('-->').map((x) => x.trim().split(/\s+/)[0])
    const start = parseTimecode(from)
    const end = parseTimecode(to)
    if (start == null || end == null || end <= start) continue
    const body = cleanCueText(lines.slice(timingIdx + 1))
    if (!body) continue
    cues.push({ start, end, text: body })
  }
  return cues.sort((a, b) => a.start - b.start)
}

export function toSrt(cues) {
  const stamp = (t) => {
    const h = Math.floor(t / 3600)
    const m = Math.floor((t % 3600) / 60)
    const s = Math.floor(t % 60)
    const ms = Math.round((t - Math.floor(t)) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
  }
  return cues
    .map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`)
    .join('\n\n')
}

// Binary search: the cue covering `t`, or null (handles gaps and beyond-end).
export function cueAt(cues, t) {
  if (!cues?.length) return null
  let lo = 0
  let hi = cues.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const c = cues[mid]
    if (t < c.start) hi = mid - 1
    else if (t >= c.end) lo = mid + 1
    else return c
  }
  return null
}

/* ------------------------------------------------------------------ *
 * Store — { [titleId]: { [lang]: { cues, source, updated } } }
 * ------------------------------------------------------------------ */

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* quota / private mode */
  }
}

export function allTracks() {
  return readAll()
}

export function tracksFor(titleId) {
  return readAll()[titleId] || {}
}

export function languagesFor(titleId) {
  return Object.keys(tracksFor(titleId))
}

export function loadTrack(titleId, lang) {
  return tracksFor(titleId)[lang] || null
}

export function saveTrack(titleId, lang, cues, source = 'manual') {
  if (!titleId || !lang) return null
  const all = readAll()
  const title = all[titleId] || {}
  title[lang] = { cues, source, updated: Date.now() }
  all[titleId] = title
  writeAll(all)
  return title[lang]
}

export function removeTrack(titleId, lang) {
  const all = readAll()
  if (!all[titleId]) return
  delete all[titleId][lang]
  if (!Object.keys(all[titleId]).length) delete all[titleId]
  writeAll(all)
}

/* --- per-title language preference (which track the player shows) --- */

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

// null = follow Auto, 'off' = explicitly off, otherwise a language code.
export function prefFor(titleId) {
  const p = loadPrefs()
  return Object.prototype.hasOwnProperty.call(p, titleId) ? p[titleId] : null
}

// Auto captions: pick the first saved track in the listener's preferred order
// so subtitles appear without a manual tap. The studio can still override it.
export function autoTrackFor(titleId) {
  const available = languagesFor(titleId)
  return SUBTITLE_LANGS.find((l) => available.includes(l.code))?.code || available[0] || ''
}

export function setPref(titleId, lang) {
  const p = loadPrefs()
  if (lang) p[titleId] = lang
  else delete p[titleId]
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
  return lang || ''
}
