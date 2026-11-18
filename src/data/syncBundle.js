import { getLocalFile, listLocalFileIds, putLocalFile } from './localMedia'

export const BUNDLE_APP = 'lumina-voice'
export const BUNDLE_VERSION = 1
export const MAX_BUNDLE_BYTES = 50 * 1024 * 1024

const APP_KEY = 'lumina-voice-v1'
const APP_FIELDS = [
  'library', 'progress', 'premium', 'downloads', 'autoplay', 'hq',
  'language', 'volume', 'muted', 'shuffle', 'repeat', 'rate', 'history'
]
const DATA_KEYS = [
  'lumina-user-catalog-v1',
  'lumina-file-library-v1',
  'lumina-site-config',
  'lumina-broadcast-v1',
  'lumina-ratings',
  'lumina-reviews',
  'lumina-subtitles',
  'lumina-subtitle-prefs',
  'lumina-artwork-v1',
  'lumina-voice-studio-v1',
  'lumina-media-base',
  'lumina-history-v1',
  'lumina-search-recent-v1',
  'lumina-device-voice',
  'lumina-ai-usage',
  'lumina-ai-budget',
  'lumina-ai-custom'
]

function store() {
  return typeof localStorage === 'undefined' ? null : localStorage
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(reader.error || new Error('Could not read audio file'))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64, type) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: type || 'application/octet-stream' })
}

export function bundleSummary(bundle) {
  const keys = Object.keys(bundle.data || {}).filter((k) => k !== APP_KEY)
  const app = bundle.data?.[APP_KEY] || {}
  return {
    keys: keys.length,
    library: Array.isArray(app.library) ? app.library.length : 0,
    audio: Array.isArray(bundle.audio) ? bundle.audio.length : 0
  }
}

export async function exportBundle({ includeAudio = false } = {}) {
  const ls = store()
  const data = {}
  if (ls) {
    for (const key of DATA_KEYS) {
      const raw = ls.getItem(key)
      if (raw == null) continue
      try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
    }
    const saved = JSON.parse(ls.getItem(APP_KEY) || '{}')
    const appState = {}
    for (const field of APP_FIELDS) if (saved[field] !== undefined) appState[field] = saved[field]
    if (Object.keys(appState).length) data[APP_KEY] = appState
  }

  const audio = []
  if (includeAudio && typeof indexedDB !== 'undefined') {
    for (const id of await listLocalFileIds()) {
      const file = await getLocalFile(id)
      if (!file) continue
      audio.push({ id, name: file.name || id, type: file.type || 'application/octet-stream', base64: await blobToBase64(file) })
    }
  }
  return { app: BUNDLE_APP, version: BUNDLE_VERSION, exportedAt: new Date().toISOString(), data, audio }
}

export function parseBundle(text) {
  if (typeof text !== 'string' || text.length > MAX_BUNDLE_BYTES) throw new Error('Backup file is too large.')
  let bundle
  try { bundle = JSON.parse(text) } catch { throw new Error('That file is not valid JSON.') }
  if (bundle?.app !== BUNDLE_APP) throw new Error('That file is not a Lumina Voice backup.')
  if (bundle.version !== BUNDLE_VERSION) throw new Error(`Unsupported backup version ${bundle.version}.`)
  if (!bundle.data || typeof bundle.data !== 'object' || Array.isArray(bundle.data)) throw new Error('Backup data is missing.')
  for (const key of Object.keys(bundle.data)) {
    if (key !== APP_KEY && !DATA_KEYS.includes(key)) throw new Error(`Unexpected backup key: ${key}`)
  }
  if (bundle.audio != null && !Array.isArray(bundle.audio)) throw new Error('Backup audio list is invalid.')
  for (const item of bundle.audio || []) {
    if (!item || typeof item.id !== 'string' || typeof item.base64 !== 'string') throw new Error('Backup audio entry is invalid.')
  }
  return bundle
}

export async function applyBundle(text) {
  const bundle = parseBundle(text)
  const ls = store()
  if (ls) {
    for (const [key, value] of Object.entries(bundle.data)) {
      if (key === APP_KEY) {
        const current = JSON.parse(ls.getItem(APP_KEY) || '{}')
        for (const field of APP_FIELDS) {
          if (value?.[field] !== undefined) current[field] = value[field]
        }
        ls.setItem(APP_KEY, JSON.stringify(current))
      } else {
        ls.setItem(key, JSON.stringify(value))
      }
    }
  }
  let audio = 0
  for (const item of bundle.audio || []) {
    const blob = base64ToBlob(item.base64, item.type)
    const file = new File([blob], item.name || item.id, { type: item.type || 'application/octet-stream' })
    await putLocalFile(item.id, file)
    audio++
  }
  return { ...bundleSummary(bundle), audioImported: audio }
}
