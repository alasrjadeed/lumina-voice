// Cross-device sync for the device-first parts of the library. Audio files and
// downloads stay on the device; only small JSON metadata (saved titles, playback
// positions, recent history) travels through Supabase so a listener can start on
// the Android tablet and continue in the local web app, or the other way round.
import { apiConfigured, rest, validToken } from './api'

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
    return {
      library: Array.isArray(row.library) ? row.library : [],
      progress: row.progress && typeof row.progress === 'object' ? row.progress : {},
      history: Array.isArray(row.history) ? row.history : [],
      clientId: row.client_id || '',
      updatedAt: row.updated_at || null
    }
  } catch {
    // The table may not exist yet in an older project — offline app still works.
    return null
  }
}

export async function saveUserState(userId, data, clientId) {
  if (!apiConfigured() || !userId) return { ok: false, local: true }
  try {
    const token = await validToken()
    await rest('user_state?on_conflict=user_id', {
      method: 'POST',
      token,
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: {
        user_id: userId,
        library: data.library || [],
        progress: data.progress || {},
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
    if (keep(id)) progress[id] = entry
  }
  for (const [id, entry] of Object.entries(remote.progress || {})) {
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

  return { library, progress, history }
}

export function sameUserState(a = {}, b = {}) {
  return (
    JSON.stringify(a.library || []) === JSON.stringify(b.library || []) &&
    JSON.stringify(a.progress || {}) === JSON.stringify(b.progress || {}) &&
    JSON.stringify(a.history || []) === JSON.stringify(b.history || [])
  )
}
