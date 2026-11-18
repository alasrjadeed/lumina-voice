import { sanitiseUserCatalog } from './userCatalog'

export const BUNDLE_APP = 'lumina-voice'
export const BUNDLE_VERSION = 1
export const MAX_BUNDLE_BYTES = 50 * 1024 * 1024

const APP_KEY = 'lumina-voice-v1'
const CATALOG_KEY = 'lumina-user-catalog-v1'
const APP_FIELDS = [
  'library', 'progress', 'premium', 'downloads', 'autoplay', 'hq',
  'language', 'volume', 'muted', 'shuffle', 'repeat', 'rate', 'history'
]
const DATA_KEYS = [
  CATALOG_KEY,
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

function cleanValue(key, value) {
  return key === CATALOG_KEY ? sanitiseUserCatalog(value) : value
}

function readJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function bundleSummary(bundle) {
  const keys = Object.keys(bundle.data || {}).filter((k) => k !== APP_KEY)
  const app = bundle.data?.[APP_KEY] || {}
  return {
    keys: keys.length,
    library: Array.isArray(app.library) ? app.library.length : 0,
    audio: 0
  }
}

export async function exportBundle() {
  const ls = store()
  const data = {}
  if (ls) {
    for (const key of DATA_KEYS) {
      const raw = ls.getItem(key)
      if (raw == null) continue
      data[key] = cleanValue(key, readJson(raw))
    }
    const saved = readJson(ls.getItem(APP_KEY) || '{}')
    const appState = {}
    for (const field of APP_FIELDS) if (saved?.[field] !== undefined) appState[field] = saved[field]
    if (Object.keys(appState).length) data[APP_KEY] = appState
  }
  // Audio bytes are never carried: every content title streams from Archive.org.
  return { app: BUNDLE_APP, version: BUNDLE_VERSION, exportedAt: new Date().toISOString(), data, audio: [] }
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
  return {
    ...bundle,
    data: Object.fromEntries(Object.entries(bundle.data).map(([key, value]) => [key, cleanValue(key, value)])),
    audio: []
  }
}

export async function applyBundle(text) {
  const bundle = parseBundle(text)
  const ls = store()
  if (ls) {
    for (const [key, value] of Object.entries(bundle.data)) {
      if (key === APP_KEY) {
        const current = readJson(ls.getItem(APP_KEY) || '{}')
        for (const field of APP_FIELDS) {
          if (value?.[field] !== undefined) current[field] = value[field]
        }
        ls.setItem(APP_KEY, JSON.stringify(current))
      } else {
        ls.setItem(key, JSON.stringify(value))
      }
    }
  }
  return { ...bundleSummary(bundle), audioImported: 0 }
}
