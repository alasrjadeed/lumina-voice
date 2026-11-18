// PipeWire status bridge client (scripts/pw-bridge.mjs).
// Returns { available, playing, volume, muted, sink } or null when the
// bridge is not running / reachable — callers must degrade gracefully.
//
// The bridge is optional: it is a local helper, not a deploy requirement.
// A short timeout keeps a missing bridge from looking like a hang, and the
// failure is swallowed here and logged once through the structured logger.

import { logger } from '../lib/logger.js'
const TIMEOUT_MS = 1500
let reported = false
// Once the bridge has failed, stop asking. The proxy logs a 500 for every
// request that reaches it, so the only way to keep the console clean is to not
// send the request.
let unavailable = false
// In-flight guard: React StrictMode mounts the provider twice, which would
// otherwise fire two probes before the first failure is recorded.
let inflight = null

// The bridge is a local helper on its own port, so it is probed directly
// rather than through the dev-server proxy — a connection refused is then an
// ordinary network error instead of a logged 500.
function bridgeUrl() {
  if (typeof location === 'undefined') return 'http://localhost:4311/pipewire'
  return `${location.protocol}//${location.hostname}:4311/pipewire`
}

export function fetchPwStatus() {
  if (unavailable) return Promise.resolve(null)
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      const res = await fetch(bridgeUrl(), { signal: ctrl.signal, cache: 'no-store' })
      clearTimeout(t)
      if (!res.ok) {
        markUnavailable()
        return null
      }
      const data = await res.json()
      if (typeof data?.available !== 'boolean') {
        markUnavailable()
        return null
      }
      return data
    } catch {
      markUnavailable()
      return null
    } finally {
      inflight = null
    }
  })()
  return inflight
}

function markUnavailable() {
  unavailable = true
  noteOnce()
}

// A single quiet line instead of a stream of 500s.
function noteOnce() {
  if (reported) return
  reported = true
  logger.info(
    { bridge: 'pipewire' },
    'PipeWire bridge not reachable — studio status is simulated. Start it with `node scripts/pw-bridge.mjs` to link real audio.'
  )
}

// Lets the Studio re-check on demand (e.g. after the operator starts the
// bridge) without a full page reload.
export function resetPwStatusCache() {
  unavailable = false
  reported = false
  inflight = null
}

export function pwVolumeLabel(pw) {
  if (!pw?.available) return ''
  if (pw.muted) return 'muted'
  return `${Math.round((pw.volume || 0) * 100)}%`
}
