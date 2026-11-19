// Cross-device sync for the device-first parts of the library. Audio files and
// downloads stay on the device; only small JSON metadata (saved titles, playback
// positions, recent history) travels through Supabase so a listener can start on
// the Android tablet and continue in the local web app, or the other way round.
import { apiConfigured, rest, validToken } from './api'

// The rest of the device metadata (imported Archive titles, artwork, ratings,
// reviews and settings) rides inside the existing progress JSONB column under
// a reserved key. Keeps every device in sync without a new database column.
export const SYNC_BUNDLE_KEY = '__sync_bundle'

export function userStateConfigured() {
  return apiConfigured()
}

export async function fetchUserState(userId, signal) {
  if (!apiConfigured() || !userId) return null
  try {
    const rows = await rest(
      `user_state?select=library,progress,history,client_id,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { signal }
    )
    const row = (rows || [])[0]
    if (!row) return null
    const progress = row.progress && typeof row.progress === 'object' ? row.progress : {}
    return {
      library: Array.isArray(row.library) ? row.library : [],
      progress,
      history: Array.isArray(row.history) ? row.history : [],
      bundle: progress[SYNC_BUNDLE_KEY] || null,
      clientId: row.client_id || '',
      updatedAt: row.updated_at || null
    }
  } catch {
    // The table may not exist yet in an older project — offline app still works.
    return null
  }
}

export async function saveUserState(userId, data, clientId, bundle) {
  if (!apiConfigured() || !userId) return { ok: false, local: true }
  try {
    const token = await validToken()
    const progress = { ...(data.progress || {}) }
    if (bundle?.app === 'lumina-voice') progress[SYNC_BUNDLE_KEY] = bundle
    else delete progress[SYNC_BUNDLE_KEY]
    await rest('user_state?on_conflict=user_id', {
      method: 'POST',
      token,
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        user_id: userId,
        library: data.library || [],
        progress,
        history: data.history || [],
        client_id: clientId || '',
        updated_at: new Date().toISOString()
      }
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}

// Union for saves (an offline addition is never lost), newest position per
// title for playback, de-duplicated recent history. Pure so it can be tested
// without a backend. `validIds` drops stale demo/local entries from old devices.
export function mergeUserState(local = {}, remote = {}, validIds = null) {
  const allowed = validIds instanceof Set ? validIds : Array.isArray(validIds) ? new Set(validIds) : null
  const keep = (id) => !allowed || allowed.has(id)

  const library = [...new Set([...(local.library || []), ...(remote.library || [])])]
    .filter((id) => id && keep(id))

  const progress = {}
  for (const [id, entry] of Object.entries(local.progress || {})) {
    if (id === SYNC_BUNDLE_KEY) continue
    if (keep(id)) progress[id] = entry
  }
  for (const [id, entry] of Object.entries(remote.progress || {})) {
    if (id === SYNC_BUNDLE_KEY) continue
    if (!keep(id)) continue
    const current = progress[id]
    if (!current || Number(entry?.t || 0) > Number(current.t || 0)) progress[id] = entry
  }

  const byId = new Map()
  for (const entry of [...(local.history || []), ...(remote.history || [])]) {
    if (!entry?.id || !keep(entry.titleId)) continue
    const previous = byId.get(entry.id)
    if (!previous || new Date(entry.startedAt || 0) >= new Date(previous.startedAt || 0)) byId.set(entry.id, entry)
  }
  const history = [...byId.values()]
    .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0))
    .slice(0, 200)

  const bundle = remote.bundle || local.bundle || progress[SYNC_BUNDLE_KEY] || null
  return { library, progress, history, bundle }
}

export function sameUserState(a = {}, b = {}) {
  return (
    JSON.stringify(a.library || []) === JSON.stringify(b.library || []) &&
    JSON.stringify(a.progress || {}) === JSON.stringify(b.progress || {}) &&
    JSON.stringify(a.history || []) === JSON.stringify(b.history || []) &&
    JSON.stringify(a.bundle || null) === JSON.stringify(b.bundle || null)
  )
}
