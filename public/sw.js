/* Lumina Voice service worker — PWA shell, runtime caching, and offline audio.
 *
 * Caches
 *   lumina-shell-v8   app shell (navigation fallback, manifest, icons)
 *   lumina-static-v8  build assets + web fonts (stale-while-revalidate)
 *   lumina-audio-v1   audio objects (cache-first; explicit downloads)
 *
 * Strategies
 *   navigations        network-first -> cached shell (offline works)
 *   /audio/* + codecs  cache-first    (streamed once => available offline)
 *   /assets/*, fonts   stale-while-revalidate
 *   everything else    network, cache fallback when offline
 *
 * Message API (from the app):
 *   CACHE_AUDIO  {urls[], id}  -> downloads with progress replies
 *   DELETE_AUDIO {urls[]}      -> evicts offline copies
 *   AUDIO_STATUS {urls[]}      -> replies {cached[], bytes}
 *   CLEAR_AUDIO                -> wipes the audio cache
 *   SKIP_WAITING               -> activate a waiting worker immediately
 */

const SHELL = 'lumina-shell-v8'
const STATIC = 'lumina-static-v8'
const AUDIO = 'lumina-audio-v1'

const SHELL_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
]

const AUDIO_RE = /\.(opus|m4a|aac|ogg|mp3|webm)(\?|$)/i
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      await Promise.all(
        SHELL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null))
      )
      // The build hashes asset filenames, so discover them from the shell HTML
      // and precache them now. This makes the very first visit installable offline.
      try {
        const res = await fetch('/index.html', { cache: 'reload' })
        const html = await res.text()
        const urls = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)]
          .map((m) => m[1])
          .filter((u) => /\.(js|css|woff2?)$/.test(u) || u.startsWith('/assets/'))
          .filter((u) => !u.startsWith('/src/') && !u.startsWith('/@'))
        const staticCache = await caches.open(STATIC)
        await Promise.all(
          [...new Set(urls)].map((u) => staticCache.add(new Request(u, { cache: 'reload' })).catch(() => null))
        )
      } catch {
        /* offline first install — assets cache on demand */
      }
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, STATIC, AUDIO])
      const names = await caches.keys()

      // Migrate audio from any previous audio cache version into the current one.
      // Downloaded audio must never be deleted across app updates or rebuilds.
      const oldAudioCaches = names.filter((n) => n.startsWith('lumina-audio-v') && n !== AUDIO)
      if (oldAudioCaches.length > 0) {
        const target = await caches.open(AUDIO)
        for (const oldName of oldAudioCaches) {
          const oldCache = await caches.open(oldName)
          const reqs = await oldCache.keys()
          for (const req of reqs) {
            const hit = await oldCache.match(req)
            if (hit) await target.put(req, hit.clone())
          }
          await caches.delete(oldName)
        }
      }

      // Delete non-kept caches (old shell/static versions), but never audio caches.
      await Promise.all(
        names
          .filter((n) => !keep.has(n) && !n.startsWith('lumina-audio-v'))
          .map((n) => caches.delete(n))
      )

      // Clean stale build assets from kept caches, but never touch cached audio files.
      for (const name of keep) {
        const cache = await caches.open(name)
        const reqs = await cache.keys()
        await Promise.all(
          reqs
            .filter((r) => {
              try {
                const p = new URL(r.url).pathname
                // Never delete cached audio, even if its path matches a build-asset pattern.
                if (AUDIO_RE.test(p)) return false
                return p.startsWith('/src/') || p.startsWith('/@') || p.includes('node_modules')
              } catch {
                return false
              }
            })
            .map((r) => cache.delete(r))
        )
      }

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.disable()
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  const data = event.data || {}
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  const replyTo = (payload) => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(payload)
    else if (event.source && event.source.postMessage) event.source.postMessage(payload)
    else if (event.source && event.source.id) {
      self.clients.get(event.source.id).then((c) => c && c.postMessage(payload))
    }
  }

  if (data.type === 'CACHE_AUDIO') {
    event.waitUntil(cacheAudio(data.urls || [], data.id, replyTo))
  } else if (data.type === 'DELETE_AUDIO') {
    event.waitUntil(deleteAudio(data.urls || []).then(() => replyTo({ type: 'DL_DELETED', id: data.id })))
  } else if (data.type === 'AUDIO_STATUS') {
    event.waitUntil(audioStatus(data.urls || []).then((r) => replyTo({ type: 'AUDIO_STATUS_RESULT', ...r })))
  } else if (data.type === 'CLEAR_AUDIO') {
    event.waitUntil(caches.delete(AUDIO).then(() => replyTo({ type: 'AUDIO_CLEARED' })))
  }
})

async function cacheAudio(urls, id, replyTo) {
  const cache = await caches.open(AUDIO)
  let done = 0
  let bytes = 0
  for (const url of urls) {
    try {
      const already = await cache.match(url)
      if (already) {
        done += 1
        replyTo({ type: 'DL_PROGRESS', id, done, total: urls.length, bytes })
        continue
      }
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const len = Number(res.headers.get('content-length') || 0)
        const buf = await res.clone().arrayBuffer()
        bytes += len || buf.byteLength
        await cache.put(url, new Response(buf, { status: 200, headers: res.headers }))
      }
    } catch {
      /* skip individual failures */
    }
    done += 1
    replyTo({ type: 'DL_PROGRESS', id, done, total: urls.length, bytes })
  }
  replyTo({ type: 'DL_DONE', id, done, total: urls.length, bytes })
}

async function deleteAudio(urls) {
  const cache = await caches.open(AUDIO)
  await Promise.all(urls.map((u) => cache.delete(u).catch(() => false)))
}

async function audioStatus(urls) {
  const cache = await caches.open(AUDIO)
  const cached = []
  let bytes = 0
  for (const url of urls) {
    const res = await cache.match(url)
    if (res) {
      cached.push(url)
      bytes += Number(res.headers.get('content-length') || 0)
    }
  }
  return { cached, bytes }
}

async function shellOffline() {
  const cache = await caches.open(SHELL)
  return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }

  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/sw.js') {
    return
  }

  if (url.pathname.startsWith('/import-proxy/')) return
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@') || url.pathname.includes('node_modules')) return

  // Bundled audio only. Archive.org and other remote files play from the origin.
  if (AUDIO_RE.test(url.pathname) && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(AUDIO)
        const hit = await cache.match(req, { ignoreVary: true })
        if (hit) return hit
        try {
          const res = await fetch(req)
          if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
            cache.put(req, res.clone())
          }
          return res
        } catch {
          return hit || Response.error()
        }
      })()
    )
    return
  }

  // Build assets and fonts -> stale-while-revalidate.
  const isAsset = url.origin === self.location.origin && url.pathname.startsWith('/assets/')
  const isFont = FONT_HOSTS.includes(url.hostname)
  if (isAsset || isFont) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC)
        const hit = await cache.match(req)
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || network
      })()
    )
  }
})

// Show reminders: tapping a notification focuses the app (or opens it).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = event.notification?.data?.path || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c)
      if (open) {
        if (path !== '/') {
          open.navigate(path).then((c) => c?.focus?.()).catch(() => {})
          return
        }
        return open.focus()
      }
      return self.clients.openWindow(path)
    })
  )
})
