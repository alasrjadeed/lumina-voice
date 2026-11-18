// Supabase Realtime without the SDK. Supabase's realtime service speaks the
// Phoenix protocol, so a WebSocket plus three small message types is enough:
// join `realtime:public` with a postgres_changes filter, answer with heartbeats,
// and read `postgres_changes` events. No dependency, no bundle cost.
//
// This is the bridge that makes the web app and the Android tablet feel linked:
// a rating, review, story or profile change made on one device shows up on the
// other within a second instead of waiting for a reload.
import { realtimeEndpoint, validToken } from './api'

const TABLES = ['profiles', 'stories', 'ratings', 'reviews', 'user_state']
const HEARTBEAT_MS = 25000
const MIN_RETRY_MS = 1500
const MAX_RETRY_MS = 30000

export function realtimeConfigured() {
  return typeof WebSocket !== 'undefined' && !!realtimeEndpoint()
}

// Normalises both shapes Supabase uses for a change notification:
//   { event: 'postgres_changes', payload: { data: { table, type, record, old_record } } }
//   { event: 'postgres_changes', payload: { table, type, record, old_record } }
// Returns null for heartbeats, joins and unrelated tables.
export function parseChange(message, tables = []) {
  if (!message || message.event !== 'postgres_changes') return null
  const payload = message.payload || {}
  const data = payload.data || payload
  const table = data.table || payload.table
  if (!table || !TABLES.includes(table)) return null
  if (tables.length && !tables.includes(table)) return null
  return {
    table,
    type: String(data.type || payload.type || '').toUpperCase(),
    record: data.record ?? payload.record ?? null,
    oldRecord: data.old_record ?? data.oldRecord ?? payload.old_record ?? null,
    commitTimestamp: data.commit_timestamp || payload.commit_timestamp || null
  }
}

/**
 * Subscribe to postgres changes on the given tables.
 * @param {string[]} tables subset of profiles, stories, ratings, reviews
 * @param {(change) => void} onChange called with { table, type, record, oldRecord }
 * @param {{onStatus?: (s: string) => void}} [options] 'connected' | 'reconnecting' | 'closed'
 * @returns {() => void} unsubscribe
 */
export function subscribeToChanges(tables, onChange, { onStatus } = {}) {
  const wanted = [...new Set(Array.isArray(tables) ? tables : [])].filter((t) => TABLES.includes(t))
  if (!wanted.length || typeof onChange !== 'function' || !realtimeConfigured()) return () => {}

  let ws = null
  let stopped = false
  let heartbeat = null
  let retry = null
  let ref = 0
  let retries = 0

  const status = (s) => {
    try { onStatus?.(s) } catch { /* consumer errors must never break the socket */ }
  }
  const send = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
  }

  function scheduleRetry() {
    if (stopped || retry) return
    const wait = Math.min(MAX_RETRY_MS, MIN_RETRY_MS * 2 ** retries++)
    retry = setTimeout(() => { retry = null; open() }, wait)
  }

  async function open() {
    if (stopped) return
    // validToken() refreshes an expiring JWT, so every reconnect rejoins with
    // credentials that still satisfy row-level security.
    const token = await validToken().catch(() => null)
    if (stopped) return
    let endpoint = realtimeEndpoint(token)
    if (!endpoint) return
    try {
      ws = new WebSocket(endpoint)
    } catch {
      scheduleRetry()
      return
    }
    ws.onopen = () => {
      retries = 0
      send({
        topic: 'realtime:public',
        event: 'phx_join',
        payload: {
          config: {
            postgres_changes: wanted.map((table) => ({ event: '*', schema: 'public', table }))
          }
        },
        ref: ++ref
      })
      clearInterval(heartbeat)
      heartbeat = setInterval(() => send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: ++ref }), HEARTBEAT_MS)
    }
    ws.onmessage = (event) => {
      let message
      try { message = JSON.parse(event.data) } catch { return }
      if (message.topic === 'phoenix') return
      if (message.event === 'phx_reply' && message.topic === 'realtime:public') {
        if (message.payload?.status === 'ok') {
          status('connected')
        } else {
          // Bad filter or expired credentials: close so onclose reconnects once.
          try { ws?.close() } catch { /* ignore */ }
        }
        return
      }
      const change = parseChange(message, wanted)
      if (!change) return
      try { onChange(change) } catch { /* keep the socket alive */ }
    }
    ws.onerror = () => { /* onclose always follows and handles the retry */ }
    ws.onclose = () => {
      clearInterval(heartbeat)
      heartbeat = null
      if (!stopped) {
        status('reconnecting')
        scheduleRetry()
      }
    }
  }

  open().catch(() => scheduleRetry())

  return () => {
    stopped = true
    clearInterval(heartbeat)
    clearTimeout(retry)
    if (ws) {
      try { send({ topic: 'realtime:public', event: 'phx_leave', payload: {}, ref: ++ref }) } catch { /* ignore */ }
      try { ws.close() } catch { /* ignore */ }
      ws = null
    }
    status('closed')
  }
}
