// PWA plumbing for Lumina Voice: service-worker registration, install prompt,
// online/offline awareness, and the offline audio cache API.
//
// The service worker owns three caches (see /sw.js). This module is the only
// place that talks to it, so components stay declarative.

export const swSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

export function isStandalone() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.navigator && window.navigator.standalone) return true
  return false
}

export function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

let readyPromise = null

// Registers /sw.js once and resolves when a worker is active and controlling.
export function registerServiceWorker() {
  if (!swSupported()) return Promise.resolve(null)
  if (import.meta.env.DEV) return Promise.resolve(null)
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js?v=6', { scope: '/', updateViaCache: 'none' })
      // If a newer worker is waiting, hand over to it on the next load.
      if (reg.waiting && navigator.serviceWorker.controller) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        if (!sw) return
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
      await navigator.serviceWorker.ready
      return reg
    } catch {
      return null
    }
  })()
  return readyPromise
}

// Waits until the page is actually controlled by a worker (first load needs this).
export function whenControlled(timeoutMs = 4000) {
  if (!swSupported()) return Promise.resolve(false)
  if (navigator.serviceWorker.controller) return Promise.resolve(true)
  return new Promise((resolve) => {
    const done = (v) => {
      navigator.serviceWorker.removeEventListener('controllerchange', on)
      clearTimeout(t)
      resolve(v)
    }
    const on = () => done(true)
    const t = setTimeout(() => done(!!navigator.serviceWorker.controller), timeoutMs)
    navigator.serviceWorker.addEventListener('controllerchange', on)
  })
}

function channelRequest(message, { onProgress } = {}) {
  return new Promise((resolve) => {
    const fallback = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), 120000)
    const channel = new MessageChannel()
    channel.port1.onmessage = (e) => {
      const d = e.data || {}
      if (d.type === 'DL_PROGRESS') {
        if (onProgress) onProgress(d)
        return
      }
      if (d.type === 'DL_DONE' || d.type === 'DL_DELETED' || d.type === 'AUDIO_STATUS_RESULT' || d.type === 'AUDIO_CLEARED') {
        clearTimeout(fallback)
        channel.port1.onmessage = null
        resolve({ ok: true, ...d })
      }
    }
    navigator.serviceWorker.controller.postMessage(message, [channel.port2])
  })
}

// Downloads the given audio URLs into the offline cache. Resolves when the worker
// reports completion, or `{ ok:false, reason:'unsupported' }` when there is no
// service worker (e.g. an insecure context), so callers can degrade gracefully.
export async function downloadAudio(urls, id, onProgress) {
  if (!swSupported()) return { ok: false, reason: 'unsupported' }
  await registerServiceWorker()
  const controlled = await whenControlled()
  if (!controlled) return { ok: false, reason: 'unsupported' }
  return channelRequest({ type: 'CACHE_AUDIO', urls, id }, { onProgress })
}

export async function deleteAudio(urls, id) {
  if (!swSupported() || !navigator.serviceWorker.controller) return { ok: false, reason: 'unsupported' }
  return channelRequest({ type: 'DELETE_AUDIO', urls, id })
}

export async function audioStatus(urls) {
  if (!swSupported() || !navigator.serviceWorker.controller) return { ok: false, cached: [], bytes: 0 }
  return channelRequest({ type: 'AUDIO_STATUS', urls })
}

export async function clearAudioCache() {
  if (!swSupported() || !navigator.serviceWorker.controller) return { ok: false, reason: 'unsupported' }
  return channelRequest({ type: 'CLEAR_AUDIO' })
}

export const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

export function formatBytes(n) {
  if (!n || n <= 0) return '0 MB'
  const mb = n / (1024 * 1024)
  if (mb < 1) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}
