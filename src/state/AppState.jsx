import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { radioStation } from '../data/catalog'
import { sourceList, assetUrl, isDirectAsset } from '../data/media'
import { fastArchiveStream } from '../data/archive'
import { useCatalog } from './Catalog.jsx'
import { isLocalAsset, localId, localObjectUrl } from '../data/localMedia'
import { loadStudio, resolveLanguage, resolveVoice } from '../data/voiceStudio'
import { mimeFor } from '../data/stream'
import { logger } from '../lib/logger.js'
import { RADIO_ENABLED } from '../config/features.js'
import { isAdminEmail } from '../config/auth.js'
import {
  apiConfigured,
  backendLabel,
  consumeOAuthRedirect,
  fetchProfile,
  getStoredSession,
  getUser,
  isSignedIn,
  isOfflineError,
  refreshSession,
  signIn,
  signOut,
  signUp,
  updateProfile
} from '../data/api'
import {
  audioStatus,
  clearAudioCache,
  deleteAudio,
  downloadAudio,
  isOnline,
  registerServiceWorker,
  swSupported
} from '../pwa.js'
import { subscribeToChanges } from '../data/realtime'
import { fetchUserState, mergeUserState, saveUserState } from '../data/userState'

function isStandalone() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.navigator && window.navigator.standalone) return true
  return false
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const KEY = 'lumina-voice-v1'
const HISTORY_KEY = 'lumina-history-v1'
const Ctx = createContext(null)

// One id per app instance. A device ignores the echo of its own cloud write,
// so a save on the tablet never bounces back and re-renders the tablet.
const CLIENT_ID = (() => {
  try {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `client-${Date.now()}`
  } catch {
    return `client-${Date.now()}`
  }
})()

// Picks a media type from the URL extension so external streams (Opus, AAC, MP3)
// are offered to the browser with the correct MIME.
function mimeForUrl(url) {
  const path = String(url).split('?')[0].toLowerCase()
  if (path.endsWith('.opus') || path.endsWith('.ogg')) return mimeFor('opus')
  if (path.endsWith('.m4a') || path.endsWith('.aac')) return mimeFor('aac')
  if (path.endsWith('.mp3')) return mimeFor('mp3')
  if (path.endsWith('.wav')) return 'audio/wav'
  if (path.endsWith('.flac')) return 'audio/flac'
  return mimeFor('mp3')
}

// Every offline copy of a title stores the standard Opus plus the AAC fallback,
// so playback survives the HQ toggle and works on non-Opus devices too.
function titleAudioUrls(title) {
  const urls = []
  title.episodes.forEach((e) => {
    if (e.audio && /^https?:/i.test(e.audio)) urls.push(e.audio)
    if (title.imported || isLocalAsset(e.asset) || (e.audio && /^https?:/i.test(e.audio))) return
    urls.push(assetUrl(e.asset, 'std'))
    urls.push(assetUrl(e.asset, 'aac'))
    urls.push(assetUrl(`${e.asset}.en`, 'std'))
    urls.push(assetUrl(`${e.asset}.en`, 'aac'))
  })
  return [...new Set(urls)]
}

function isDirectSrc(v) {
  return v && (/^https?:/i.test(v) || v.startsWith('/') || v.startsWith('blob:') || v.startsWith('data:'))
}

function load() {
  try {
    if (typeof localStorage === 'undefined') return {}
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export function AppProvider({ children }) {
  const { getTitle, titles } = useCatalog()
  const saved = load()
  const [user, setUser] = useState(saved.user || null)
  const [library, setLibrary] = useState(() => { const base = saved.library || []; if(!base.includes('selected-ghazals-of-ghalib')) return [...base, 'selected-ghazals-of-ghalib']; return base; })
  const [progress, setProgress] = useState(saved.progress || {})
const [history, setHistory] = useState(saved.history || [])
let wakeLock = null
const [listenedTime, setListenedTime] = useState(() => {
    const out = {}
    for (const s of (saved.history || [])) {
      out[s.titleId] = (out[s.titleId] || 0) + Number(s.positionSeconds || 0)
    }
    return out
  })
  const [premium, setPremium] = useState(() => { const p = !!saved.premium; if (isAdminEmail(saved.user?.email)) return true; return p; })
  const [downloads, setDownloads] = useState(saved.downloads || [])
  const [autoplay, setAutoplay] = useState(saved.autoplay !== false)
  const [hq, setHqState] = useState(saved.hq !== false)
  const [language, setLanguageState] = useState(saved.language === 'en' ? 'en' : 'ur')
  // Transport settings. Kept deliberately small — these ride on the same
  // <audio> element that already exists, so nothing gets heavier.
  const [volume, setVolumeState] = useState(() => (typeof saved.volume === 'number' ? saved.volume : 1))
  const [muted, setMutedState] = useState(!!saved.muted)
  const [shuffle, setShuffleState] = useState(!!saved.shuffle)
  // 'off' | 'all' | 'one' — matches the three states a listener expects.
  const [repeat, setRepeatState] = useState(['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off')
  // Playback rate, kept coarse so speech stays intelligible.
  const [rate, setRateState] = useState(() => (typeof saved.rate === 'number' ? saved.rate : 1))
  const languageRef = useRef(saved.language === 'en' ? 'en' : 'ur')
  // Latest device-first state, kept in a ref so remote updates can merge with
  // what is actually on screen instead of a stale render closure.
  const syncStateRef = useRef({ library, progress, history })
  syncStateRef.current = { library, progress, history }

  const applyRemoteState = (remote) => {
    if (!remote) return
    const current = syncStateRef.current
    const merged = mergeUserState(current, remote)
    if (JSON.stringify(current.library) !== JSON.stringify(merged.library)) setLibrary(merged.library)
    if (JSON.stringify(current.progress) !== JSON.stringify(merged.progress)) setProgress(merged.progress)
    if (JSON.stringify(current.history) !== JSON.stringify(merged.history)) {
      setHistory(merged.history)
      const times = {}
      for (const h of merged.history) {
        times[h.titleId] = (times[h.titleId] || 0) + Number(h.positionSeconds || 0)
      }
      setListenedTime(times)
    }
  }

  const [offline, setOffline] = useState(!isOnline())
  const [swReady, setSwReady] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({})
  const [offlineBytes, setOfflineBytes] = useState(0)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [now, setNow] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [playError, setPlayError] = useState('')
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const loadSeq = useRef(0)
  const installEvent = useRef(null)
  // Mirrors of the transport settings so the `ended` handler (bound once per
  // track) always sees the live values without re-installing listeners.
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)
  shuffleRef.current = shuffle
  repeatRef.current = repeat

  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        KEY,
        JSON.stringify({ user, library, progress, premium, downloads, autoplay, hq, language, volume, muted, shuffle, repeat, rate, history })
      )
    } catch {
      /* ignore quota / private mode */
    }
  }, [user, library, progress, premium, downloads, autoplay, hq, language, volume, muted, shuffle, repeat, rate])

  useEffect(() => {
    let cancelled = false
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const onInstallPrompt = (e) => {
      e.preventDefault()
      installEvent.current = e
      setCanInstall(true)
    }
    const onInstalled = () => {
      installEvent.current = null
      setCanInstall(false)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    registerServiceWorker().then((reg) => {
      if (cancelled || !reg) return
      setSwReady(true)
      refreshDownloadStatus()
    })

    return () => {
      cancelled = true
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Restore a persisted Supabase session on load (refresh if near expiry).
  useEffect(() => {
    if (!apiConfigured()) return
    let cancelled = false
    ;(async () => {
      try {
        const oauth = await consumeOAuthRedirect()
        if (oauth?.access_token) {
          if (!cancelled) await applySessionUser(oauth, oauth.user?.email?.split('@')[0])
          return
        }
        const stored = getStoredSession()
        if (!stored?.access_token) return
        let sess = stored
        const now = Math.floor(Date.now() / 1000)
        if (sess.expires_at && sess.expires_at - now < 60) sess = (await refreshSession()) || sess
        const live = await getUser(sess?.access_token)
        if (cancelled || !live) return
        await applySessionUser({ access_token: sess.access_token, user: live }, live.email?.split('@')[0])
      } catch {
        // No signal during startup: keep the cached local user and bundled catalog.
        const cached = getStoredSession()
        if (!cancelled && cached?.user?.email) login(cached.user.email)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Profile edits made elsewhere (a new username, or an admin role granted
  // from the PC) appear here live — no sign-out/sign-in round trip.
  useEffect(() => {
    if (!apiConfigured() || !user?.id) return undefined
    let cancelled = false
    let timer = null
    const stop = subscribeToChanges(['profiles'], (change) => {
      const id = change.record?.id || change.oldRecord?.id
      if (id && id !== user.id) return
      clearTimeout(timer)
      timer = setTimeout(async () => {
        const profile = await fetchProfile(user.id).catch(() => null)
        if (cancelled || !profile) return
        setUser((prev) => (prev?.id === user.id
          ? { ...prev, name: profile.username || prev.name, role: profile.role || prev.role }
          : prev))
        if (profile.role === 'admin' || isAdminEmail(user.email)) setPremium(true)
      }, 300)
    })
    return () => {
      cancelled = true
      clearTimeout(timer)
      stop()
    }
  }, [user?.id, user?.email])

  // Send the device-first library, positions and history to Supabase. Debounced
  // for edits; a 30s heartbeat also catches a position changing every second
  // during continuous playback, and hiding the app flushes the latest state.
  useEffect(() => {
    if (!apiConfigured() || !user?.id) return undefined
    const timer = setTimeout(() => {
      saveUserState(user.id, syncStateRef.current, CLIENT_ID).catch(() => {})
    }, 1500)
    return () => clearTimeout(timer)
  }, [user?.id, library, progress, history])

  useEffect(() => {
    if (!apiConfigured() || !user?.id) return undefined
    const save = () => { saveUserState(user.id, syncStateRef.current, CLIENT_ID).catch(() => {}) }
    const interval = setInterval(save, 30000)
    const onHide = () => { if (typeof document !== 'undefined' && document.visibilityState === 'hidden') save() }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(interval)
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHide)
    }
  }, [user?.id])

  // Receive the same data from the other device. Own writes carry a per-app
  // client id and are ignored, so a save never bounces back into this app.
  useEffect(() => {
    if (!apiConfigured() || !user?.id) return undefined
    let cancelled = false
    let timer = null
    const stop = subscribeToChanges(['user_state'], (change) => {
      const record = change.record
      if (!record || record.user_id !== user.id || record.client_id === CLIENT_ID) return
      clearTimeout(timer)
      timer = setTimeout(async () => {
        const remote = await fetchUserState(user.id).catch(() => null)
        if (cancelled || !remote || remote.clientId === CLIENT_ID) return
        applyRemoteState(remote)
      }, 300)
    })
    return () => {
      cancelled = true
      clearTimeout(timer)
      stop()
    }
  }, [user?.id])

  const refreshDownloadStatus = async () => {
    if (!swSupported()) return
    const all = titles.flatMap((t) => titleAudioUrls(t).map((url) => ({ url, id: t.id })))
    const res = await audioStatus(all.map((x) => x.url))
    if (!res.ok) return
    const cached = new Set(res.cached || [])
    const complete = titles
      .filter((t) => {
        const urls = titleAudioUrls(t)
        return urls.length > 0 && urls.every((u) => cached.has(u))
      })
      .map((t) => t.id)
    setDownloads((d) => [...new Set([...d, ...complete])])
    setOfflineBytes(res.bytes || 0)
  }


  const recordHistory = async (titleId, episodeId, positionSeconds, durationSeconds) => {
    if (!titleId) return
    const now = new Date().toISOString()
    const entry = {
      id: `hist-${Date.now()}`,
      titleId,
      episodeId,
      startedAt: now,
      positionSeconds: Math.max(0, Number(positionSeconds || 0)),
      durationSeconds: Math.max(0, Number(durationSeconds || 0))
    }
    setHistory((h) => [...h, entry])
    setListenedTime((t) => {
      const next = { ...t }
      next[titleId] = (next[titleId] || 0) + entry.positionSeconds
      return next
    })
    try {
      if (typeof localStorage !== 'undefined') {
        const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
        all.push(entry)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(-500)))
      }
    } catch {
      /* quota */
    }
  }

  const getListenedTime = (titleId) => {
    return listenedTime[titleId] || 0
  }

  const getHistory = () => {
    return [...history].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  }

  const requestWakeLock = async () => {
    if (wakeLock || typeof navigator === 'undefined') return
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => { wakeLock = null })
    } catch {
      /* wake lock not supported */
    }
  }

  const releaseWakeLock = async () => {
    if (wakeLock) {
      try { await wakeLock.release() } catch {}
      wakeLock = null
    }
  }

  const downloadTitle = async (titleId) => {
    const title = getTitle(titleId)
    if (!title) return { ok: false, reason: 'unknown-title' }
    const urls = titleAudioUrls(title)
    setDownloadProgress((p) => ({ ...p, [titleId]: { done: 0, total: urls.length } }))
    const res = await downloadAudio(urls, titleId, (d) => {
      setDownloadProgress((p) => ({ ...p, [titleId]: { done: d.done, total: d.total } }))
    })
    setDownloadProgress((p) => {
      const next = { ...p }
      delete next[titleId]
      return next
    })
    if (res.ok) {
      setDownloads((d) => (d.includes(titleId) ? d : [...d, titleId]))
      setOfflineBytes((b) => b + (res.bytes || 0))
      return { ok: true, bytes: res.bytes || 0 }
    }
    return { ok: false, reason: res.reason || 'failed' }
  }

  const removeDownload = async (titleId) => {
    const title = getTitle(titleId)
    if (title) await deleteAudio(titleAudioUrls(title), titleId)
    setDownloads((d) => d.filter((x) => x !== titleId))
    refreshDownloadStatus()
    return { ok: true }
  }

  const clearOffline = async () => {
    await clearAudioCache()
    setDownloads([])
    setOfflineBytes(0)
    return { ok: true }
  }

  const promptInstall = async () => {
    if (isStandalone()) {
      setInstalled(true)
      return { ok: true, outcome: 'already' }
    }
    const ev = installEvent.current
    if (ev) {
      ev.prompt()
      const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' }))
      installEvent.current = null
      setCanInstall(false)
      if (choice?.outcome === 'accepted') setInstalled(true)
      return { ok: choice?.outcome === 'accepted', outcome: choice?.outcome }
    }
    if (isIos()) return { ok: false, reason: 'ios', outcome: 'ios' }
    return { ok: false, reason: 'unavailable', outcome: 'manual' }
  }

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      setTime(el.currentTime)
      if (navigator.mediaSession?.setPositionState && el.duration && isFinite(el.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: el.duration,
            position: Math.min(el.currentTime, el.duration),
            playbackRate: el.playbackRate || 1
          })
        } catch {
          /* invalid state */
        }
      }
      if (now?.titleId && now?.episodeId) {
        setProgress((p) => ({
          ...p,
          [now.titleId]: { episodeId: now.episodeId, t: el.currentTime, d: el.duration || 0 }
        }))
        if (playing) {
          requestWakeLock()
          const last = history[history.length - 1]
          const sinceLast = last ? Date.now() - new Date(last.startedAt).getTime() : 99999
          if (!last || sinceLast > 30000) {
            recordHistory(now.titleId, now.episodeId, el.currentTime, el.duration || 0)
          }
        }
      }
    }
    const onMeta = () => setDuration(el.duration || 0)
    const onErr = () => {
      if (!el.querySelector('source') && !el.getAttribute('src')) return
      const code = el.error?.code
      const src = now?.src || now?.asset || ''
      const localBundle = /^\/audio\//i.test(src)
      const why = localBundle
        ? 'This title has no audio on this device. Add its Archive.org link in Add content.'
        : code === 4
          ? 'This audio could not be decoded.'
          : code === 2
            ? 'The audio source is unreachable.'
            : 'Playback failed.'
      setPlaying(false)
      setPlayError(why)
    }
    const onEnd = () => {
      // "Repeat one" restarts the same track before anything else is considered.
      if (repeatRef.current === 'one' && now?.kind === 'episode') {
        el.currentTime = 0
        el.play().catch(() => {})
        return
      }
      if (autoplay && now?.kind === 'episode' && now?.titleId) {
        const title = getTitle(now.titleId)
        const eps = title?.episodes || []
        const idx = title ? eps.findIndex((e) => e.id === now.episodeId) : -1
        const playable = (e) => e && (e.free || premium)
        // Shuffle picks any other part of the same title, so a long Quran
        // set runs in a fresh order every time rather than 1, 2, 3…
        if (shuffleRef.current && eps.length > 1) {
          const rest = eps.filter((e, i) => i !== idx && playable(e))
          if (rest.length) {
            playEpisode(now.titleId, rest[Math.floor(Math.random() * rest.length)])
            return
          }
        }
        const nextEp = idx >= 0 ? eps[idx + 1] : null
        if (playable(nextEp)) {
          playEpisode(now.titleId, nextEp)
          return
        }
        // Wrapped past the last part: "repeat all" loops the title, otherwise
        // stop cleanly.
        if (repeatRef.current === 'all') {
          const first = eps.find(playable)
          if (first) {
            playEpisode(now.titleId, first)
            return
          }
        }
      }
      setPlaying(false)
      releaseWakeLock()
      if (now?.titleId && now?.episodeId && el.duration) {
        recordHistory(now.titleId, now.episodeId, el.currentTime, el.duration)
      }
    }
    // Stall watchdog: external streams can die mid-track (slow archive.org
    // nodes, flaky mounts) and the browser just sits there muted. Re-request
    // once after ~8s with no progress; surface an error if it still stalls.
    let lastT = el.currentTime
    let lastAdvance = Date.now()
    let retries = 0
    const onProgress = () => {
      if (el.currentTime > lastT + 0.25 || el.currentTime === 0) {
        lastT = el.currentTime
        lastAdvance = Date.now()
        if (retries) retries = 0
      }
    }
    const onStallCheck = () => {
      if (!el.paused && !el.ended) {
        if (Date.now() - lastAdvance < 8000) return
        if (el.buffered.length && el.buffered.end(el.buffered.length - 1) > el.currentTime + 10) {
          lastAdvance = Date.now() // buffer is healthy; just a slow decoder tick
          return
        }
        retries += 1
        if (retries > 2) {
          setPlaying(false)
          setPlayError('The stream stopped responding. Press play to reconnect.')
          return
        }
        const src = now?.src || el.currentSrc
        if (src) {
          el.src = src
          el.load()
          el.play().catch(() => {})
        }
        lastAdvance = Date.now()
      }
    }
    const stallTimer = setInterval(onStallCheck, 4000)
    el.addEventListener('timeupdate', onProgress)
    el.addEventListener('stalled', onStallCheck)
    el.addEventListener('waiting', onStallCheck)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('error', onErr)
    el.addEventListener('ended', onEnd)
    return () => {
      clearInterval(stallTimer)
      el.removeEventListener('timeupdate', onProgress)
      el.removeEventListener('stalled', onStallCheck)
      el.removeEventListener('waiting', onStallCheck)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('error', onErr)
      el.removeEventListener('ended', onEnd)
    }
  }, [now, autoplay, premium])

  // Keep the element in step with the stored transport settings. Runs on mount
  // and on every change, so a reload or a re-created element never drifts.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = volume
    el.muted = muted
    el.playbackRate = rate
  }, [volume, muted, rate, now])

  // Media Session API — lock-screen / Bluetooth / OS media-key controls.
  useEffect(() => {
    const ms = navigator.mediaSession
    if (!ms) return
    if (!now) {
      ms.metadata = null
      ms.playbackState = 'none'
      return
    }
    try {
      ms.metadata = new MediaMetadata({
        title: now.name,
        artist: now.kind === 'stream' ? 'External stream' : 'Lumina Voice',
        album: now.kind === 'episode' ? 'Lumina Voice' : (now.sub || 'Lumina Voice'),
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      })
    } catch {
      /* MediaMetadata unsupported */
    }
    ms.playbackState = playing ? 'playing' : 'paused'
    const set = (action, handler) => {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        /* action unsupported in this browser */
      }
    }
    const stepTrack = (dir) => {
      if (now.kind !== 'episode' || !now.titleId) return
      const title = getTitle(now.titleId)
      if (!title?.episodes) return
      const idx = title.episodes.findIndex((e) => e.id === now.episodeId)
      const ep = title.episodes[idx + dir]
      if (ep && (ep.free || premium || title.imported)) playEpisode(now.titleId, ep)
    }
    set('play', () => audioRef.current?.play().catch(() => {}))
    set('pause', () => audioRef.current?.pause())
    set('seekbackward', (d) => {
      const el = audioRef.current
      if (el) el.currentTime = Math.max(0, el.currentTime - (d?.seekOffset || 10))
    })
    set('seekforward', (d) => {
      const el = audioRef.current
      if (el) el.currentTime = Math.min(el.duration || Infinity, el.currentTime + (d?.seekOffset || 10))
    })
    set('seekto', (d) => {
      const el = audioRef.current
      if (el && typeof d?.seekTime === 'number') el.currentTime = d.seekTime
    })
    set('previoustrack', now.kind === 'episode' ? () => stepTrack(-1) : null)
    set('nexttrack', now.kind === 'episode' ? () => stepTrack(1) : null)
    return () => {
      ;['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'].forEach((a) => set(a, null))
    }
  }, [now, playing, premium])

  // Background precache: warm the next couple of episodes into the SW audio
  // cache while one plays, instead of waiting for the first play of each.
  const prewarmTimer = useRef(null)
  const prewarmed = useRef(new Set())
  const precacheUpcoming = (titleId, episodeId) => {
    if (!swSupported() || !isOnline()) return
    const conn = navigator.connection
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return
    const title = getTitle(titleId)
    if (!title?.episodes || title.imported) return
    const idx = title.episodes.findIndex((e) => e.id === episodeId)
    const lang = spokenLang(title)
    const urls = title.episodes
      .slice(idx + 1, idx + 3)
      .filter((e) => e.free || premium)
      // Direct streams (Archive.org) already play from the origin. Warming them
      // only burns bandwidth and produces bogus `.mp3.opus` style requests.
      .filter((e) => !isDirectAsset(e.asset || e.audio))
      .map((e) => sourceList(e.asset || e.audio, { hq, lang })[0]?.src)
      .filter((u) => u && !prewarmed.current.has(u) && !/^(blob:|data:)/.test(u))
    if (!urls.length) return
    clearTimeout(prewarmTimer.current)
    prewarmTimer.current = setTimeout(() => {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000))
      idle(() => {
        urls.forEach((u) => {
          prewarmed.current.add(u)
          fetch(u, { priority: 'low' }).catch(() => {})
        })
      })
    }, 4000)
  }
  useEffect(() => () => clearTimeout(prewarmTimer.current), [])
  useEffect(() => {
    if (playing && now?.kind === 'episode' && now?.titleId && now?.episodeId) {
      precacheUpcoming(now.titleId, now.episodeId)
    }
  }, [playing, now])

  // Return from Stripe checkout: ?checkout=success unlocks Lumina Plus.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get('checkout') !== 'success') return
      try { setPremium(true) } catch{ /* ignore */ }
      q.delete('checkout')
      q.delete('session_id')
      const rest = q.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
    } catch {
      /* ignore */
    }
  }, [])

  const spokenLang = (title) => resolveLanguage(loadStudio(), languageRef.current, title)

  const loadOpus = async (el, assetIdOrSrc, opts) => {
    const seq = ++loadSeq.current
    el.pause()
    el.removeAttribute('src')
    while (el.firstChild) el.removeChild(el.firstChild)
    let playSrc = assetIdOrSrc
    let localMime = ''
    setPlayError('')
    if (isLocalAsset(assetIdOrSrc)) {
      const local = await localObjectUrl(localId(assetIdOrSrc))
      if (seq !== loadSeq.current) return
      playSrc = typeof local === 'object' ? local.url : local
      localMime = typeof local === 'object' ? local.type : ''
      if (!playSrc) {
        setPlaying(false)
        setPlayError('That local file is no longer on this device.')
        return
      }
    }
    if (seq !== loadSeq.current) return
    const isUrl = isDirectSrc(playSrc)
    // archive.org/download redirects to a random storage node — some nodes
    // crawl or stall mid-track. Resolve the healthy primary node first.
    if (isUrl && /archive\.org\/download\//i.test(playSrc)) {
      playSrc = await fastArchiveStream(playSrc)
      if (seq !== loadSeq.current) return
    }
    const sources = isUrl
      ? [{ src: playSrc, type: localMime || opts?.mime || mimeForUrl(playSrc) }]
      : sourceList(assetIdOrSrc, opts)
    if (!sources.length) {
      setPlaying(false)
      setPlayError('No playable audio on this episode.')
      return
    }
    sources.forEach((s) => {
      const source = document.createElement('source')
      source.src = s.src
      source.type = s.type
      el.appendChild(source)
    })
    el.load()
    return el.play().then(() => {
      if (seq === loadSeq.current) setPlaying(true)
    }).catch((e) => {
      if (seq !== loadSeq.current) return
      setPlaying(false)
      if (e?.name !== 'AbortError') {
        logger.warn({ err: e, src: playSrc }, 'audio playback failed')
        setPlayError(e?.message || 'Playback failed.')
      }
    })
  }

  const playEpisode = (titleId, episode, opts = {}) => {
    const title = getTitle(titleId)
    if (!title || !episode) return { locked: true }
    if (!episode.free && !premium && !title.imported) return { locked: true }
    const studio = loadStudio()
    const narrator = resolveVoice(title, studio)
    const lang = spokenLang(title)
    const src = episode.audio
    setNow({
      kind: 'episode',
      titleId,
      episodeId: episode.id,
      asset: episode.asset,
      name: title.imported
        ? `${title.name}${episode.titleEn ? ` · ${episode.titleEn}` : ''}`
        : `${title.name} · ${lang === 'en' ? episode.titleEn || episode.title : episode.title}`,
      nameUr: title.nameUr,
      sub: title.imported
        ? `${title.kind} · ${title.source || 'import'}`
        : `${title.kind} · ${narrator?.label || 'neural'} · ${lang === 'en' ? 'English' : 'Urdu'} · Opus ${episode.kbps} kbps mono`,
      cover: title.cover,
      src,
      kbps: episode.kbps,
      codec: title.imported ? 'external' : 'opus',
      lang
    })
    const el = audioRef.current
    const ready = el ? loadOpus(el, episode.asset || src, { hq, lang, ...opts }) : null
    return { locked: false, ready }
  }

  const playRadio = (opts = {}) => {
    if (!RADIO_ENABLED) return null
    setNow({
      kind: 'radio',
      titleId: radioStation.id,
      episodeId: 'live',
      asset: radioStation.asset,
      name: radioStation.name,
      nameUr: radioStation.nameUr,
      sub: `${radioStation.tagline} · ${languageRef.current === 'en' ? 'English' : 'Urdu'} · Opus ${radioStation.kbps} kbps mono`,
      cover: 'aurora',
      src: radioStation.audio,
      kbps: radioStation.kbps,
      codec: 'opus',
      lang: languageRef.current
    })
    const el = audioRef.current
    return el ? loadOpus(el, radioStation.asset || radioStation.audio, { hq, lang: languageRef.current, ...opts }) : null
  }

  const playBroadcast = (item, showName) => {
    if (!RADIO_ENABLED) return
    if (!item) {
      playRadio()
      return
    }
    setNow({
      kind: 'radio',
      titleId: radioStation.id,
      episodeId: item.id,
      asset: item.asset,
      name: item.name,
      nameUr: item.nameUr || radioStation.nameUr,
      sub: `${showName || radioStation.name} · ${languageRef.current === 'en' ? 'English' : 'Urdu'} · Opus ${item.kbps} kbps mono`,
      cover: 'aurora',
      src: item.audio,
      kbps: item.kbps,
      codec: 'opus',
      lang: languageRef.current
    })
    const el = audioRef.current
    if (el) loadOpus(el, item.asset || item.audio, { hq, lang: languageRef.current })
  }

  // Plays a direct external stream (AzuraCast / Icecast mount) without proxying it.
  const playExternal = (url, meta = {}) => {
    if (!RADIO_ENABLED || !url) return
    setNow({
      kind: 'stream',
      titleId: meta.titleId || radioStation.id,
      episodeId: 'external',
      name: meta.name || radioStation.name,
      nameUr: meta.nameUr || radioStation.nameUr,
      sub: meta.sub || 'External live stream',
      cover: meta.cover || 'aurora',
      src: url,
      kbps: meta.kbps || null,
      codec: meta.codec || 'stream'
    })
    const el = audioRef.current
    if (el) loadOpus(el, url, { mime: meta.mime || mimeFor(meta.codec) })
  }

  const togglePlay = () => {
    const el = audioRef.current
    if (!el || !now) return
    if (playing) {
      el.pause()
      setPlaying(false)
      releaseWakeLock()
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      requestWakeLock()
    }
  }

  const seek = (t) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = t
    setTime(t)
  }

  const resumeTitle = (titleId) => {
    const title = getTitle(titleId)
    if (!title || !(title.episodes || []).length) return { locked: true }
    const p = progress[titleId]
    const ep = title.episodes.find((e) => e.id === p?.episodeId) || title.episodes[0]
    const res = playEpisode(titleId, ep)
    if (!res.locked && p?.t && audioRef.current) {
      const onReady = () => {
        audioRef.current.currentTime = p.t
        audioRef.current.removeEventListener('loadedmetadata', onReady)
      }
      audioRef.current.addEventListener('loadedmetadata', onReady)
    }
    return res
  }

  // Puts playback back at the position it had before a forced reload
  // (quality or language change) and restores the paused state if needed.
  const resumeAfterReload = async (ready, position, wasPlaying) => {
    if (ready) {
      try {
        await ready
      } catch {
        /* load errors surface through the audio element */
      }
    }
    const el = audioRef.current
    if (!el) return
    if (position > 0.5) {
      try {
        el.currentTime = position
      } catch {
        /* ignore seek races */
      }
    }
    if (!wasPlaying) {
      el.pause()
      setPlaying(false)
    }
  }

  // Volume, mute and rate are plain element properties, so they are set
  // imperatively rather than by re-rendering the player.
  const setVolume = (v) => {
    const next = Math.min(1, Math.max(0, Number(v)))
    setVolumeState(next)
    // Turning the dial up is an unambiguous "unmute".
    if (next > 0 && muted) setMutedState(false)
    const el = audioRef.current
    if (el) {
      el.volume = next
      if (next > 0) el.muted = false
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMutedState(next)
    const el = audioRef.current
    if (el) el.muted = next
  }

  const setRate = (r) => {
    const next = Math.min(2, Math.max(0.5, Number(r)))
    setRateState(next)
    const el = audioRef.current
    if (el) el.playbackRate = next
  }

  const toggleShuffle = () => setShuffleState((v) => !v)

  // Off → all → one → off. One button, three states, like a car stereo.
  const cycleRepeat = () =>
    setRepeatState((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))

  // HQ only changes the codec ladder, so the current episode/radio is reloaded
  // with the new preference instead of waiting for the next track.
  const setHq = async (value) => {
    const next = !!value
    setHqState(next)
    const current = now
    if (!current) return
    const el = audioRef.current
    const position = el?.currentTime || 0
    const wasPlaying = playing
    let ready = null
    if (current.kind === 'radio') {
      ready = playRadio({ hq: next })
    } else if (current.kind === 'episode' && current.titleId) {
      const title = getTitle(current.titleId)
      if (!title || title.imported) return // direct/asset URL — no ladder to renegotiate
      const ep = title.episodes.find((e) => e.id === current.episodeId)
      if (ep) ready = playEpisode(current.titleId, ep, { hq: next }).ready
    }
    await resumeAfterReload(ready, position, wasPlaying)
  }

  const setLanguage = async (lang) => {
    const next = lang === 'en' ? 'en' : 'ur'
    languageRef.current = next
    setLanguageState(next)
    const current = now
    if (!current || current.kind === 'stream') return
    const el = audioRef.current
    const position = el?.currentTime || 0
    const wasPlaying = playing
    let ready = null
    if (current.kind === 'radio') {
      ready = playRadio()
    } else if (current.kind === 'episode' && current.titleId) {
      const title = getTitle(current.titleId)
      if (title?.imported) return
      const ep = title?.episodes.find((e) => e.id === current.episodeId)
      if (ep) ready = playEpisode(current.titleId, ep).ready
    }
    await resumeAfterReload(ready, position, wasPlaying)
  }

  const toggleLibrary = (titleId) => {
    setLibrary((l) => (l.includes(titleId) ? l.filter((x) => x !== titleId) : [...l, titleId]))
  }

  const addToLibrary = (titleId) => {
    setLibrary((l) => (l.includes(titleId) ? l : [...l, titleId]))
  }

  const removeFromLibrary = (titleId) => {
    setLibrary((l) => l.filter((x) => x !== titleId))
  }

  const toggleDownload = (titleId) => {
    if (downloads.includes(titleId)) return removeDownload(titleId)
    return downloadTitle(titleId)
  }

  const login = (email, name) => {
    const role = (/admin/i.test(email) || isAdminEmail(email)) ? 'admin' : 'listener'
    setUser({ email, name: name || email.split('@')[0], role })
  }

  // Real Supabase sign-in / sign-up. Falls back to the local demo account when the
  // backend is not configured so the app is always usable offline.
  const authenticate = async ({ email, password, name, mode }) => {
    if (!apiConfigured()) {
      login(email, name)
      return { ok: true, backend: 'local' }
    }
    try {
      const uname = name || email.split('@')[0]
      if (mode === 'register') {
        const res = await signUp({ email, password, username: uname })
        if (res.needsConfirmation) {
          return { ok: true, needsConfirmation: true, backend: 'supabase' }
        }
        await applySessionUser(res.session, uname)
      } else {
        const sess = await signIn({ email, password })
        await applySessionUser(sess, uname)
      }
      return { ok: true, backend: 'supabase' }
    } catch (e) {
      // Connected builds stay usable on the tablet with no signal: a transport
      // failure falls back to the local demo account. Real API errors are shown.
      if (mode !== 'register' && isOfflineError(e)) {
        login(email, name)
        return { ok: true, backend: 'local', offline: true }
      }
      return { ok: false, error: e.message || 'Authentication failed' }
    }
  }

  const applySessionUser = async (sess, fallbackName) => {
    if (isAdminEmail(sess?.user?.email || fallbackName)) { setPremium(true); setUser(prev => prev ? { ...prev, role: 'admin' } : prev) }
    const u = sess?.user
    const email = u?.email || ''
    let role = (/admin/i.test(email) || isAdminEmail(email)) ? 'admin' : 'listener'
    let name = fallbackName || email.split('@')[0]
    if (u?.id) {
      const profile = await fetchProfile(u.id)
      if (profile) {
        role = profile.role || role
        name = profile.username || name
      }
    }
    setUser({ id: u?.id, email, name, role })
    // Bring the device-first library, positions and history back from the
    // cloud so signing in on the tablet continues where the web app stopped.
    if (u?.id) applyRemoteState(await fetchUserState(u.id).catch(() => null))
  }

  const logout = async () => {
    setUser(null)
    if (apiConfigured() && isSignedIn()) await signOut()
  }

  // Optimistically flips the role, then persists it to the Supabase profile.
  // On a rejected write the previous role is restored so the UI never lies.
  const setRole = async (role) => {
    const prev = user
    if (!prev) return { ok: false, error: 'Sign in to change studio access.' }
    setUser({ ...prev, role })
    if (apiConfigured() && prev.id) {
      try {
        const row = await updateProfile(prev.id, { role })
        if (Array.isArray(row) && row.length === 0) throw new Error('No profile row found for this account')
        return { ok: true }
      } catch (e) {
        setUser(prev)
        return { ok: false, error: e.message || 'Could not save that role.' }
      }
    }
    return { ok: true, local: true }
  }

  // Display name lives on the shared profile, so reviews and Settings show
  // the same identity on web, phone and tablet.
  const updateName = async (name) => {
    const clean = String(name || '').trim().slice(0, 40)
    if (!clean) return { ok: false, error: 'Enter a name.' }
    const prev = user
    if (!prev) return { ok: false, error: 'Sign in to change your name.' }
    setUser({ ...prev, name: clean })
    if (apiConfigured() && prev.id) {
      try {
        const row = await updateProfile(prev.id, { username: clean })
        if (Array.isArray(row) && row.length === 0) throw new Error('No profile row found for this account')
        return { ok: true }
      } catch (e) {
        setUser(prev)
        return { ok: false, error: e.message || 'Could not save your name.' }
      }
    }
    return { ok: true, local: true }
  }

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === 'admin',
      login,
      authenticate,
      authConfigured: apiConfigured(),
      backend: backendLabel(),
      setRole,
      updateName,
      logout,
      library,
      toggleLibrary,
      addToLibrary,
      removeFromLibrary,
      progress,
      premium,
      setPremium,
      downloads,
      toggleDownload,
      downloadTitle,
      removeDownload,
      downloadProgress,
      clearOffline,
      refreshDownloadStatus,
      offline,
      offlineBytes,
      swReady,
      canInstall,
      installed,
      promptInstall,
      autoplay,
      setAutoplay,
      hq,
      setHq,
      language,
      setLanguage,
      now,
      playing,
      playError,
      time,
      duration,
      playEpisode,
      playRadio,
      playBroadcast,
      playExternal,
      togglePlay,
      seek,
      resumeTitle,
      volume,
      setVolume,
      muted,
      toggleMute,
      shuffle,
      toggleShuffle,
      repeat,
      cycleRepeat,
      rate,
      setRate,
      history,
      setHistory,
      recordHistory,
      getListenedTime,
      getHistory,
      requestWakeLock,
      releaseWakeLock,
      listenedTime,
      // Exposed so the Now Playing screen can attach a real-time audio
      // spectrum analyser to the same <audio> element the transport uses.
      audioRef
    }),
    [
      user, library, progress, premium, downloads, autoplay, hq, language, now, playing,
      playError, time, duration, downloadProgress, offline, offlineBytes, swReady, canInstall,
      installed, volume, muted, shuffle, repeat, rate, audioRef
    ]
  )
  return (
    <Ctx.Provider value={value}>
      <audio ref={audioRef} preload="none" playsInline />
      {children}
    </Ctx.Provider>
  )
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (ctx) return ctx
  return {
    user: null,
    isAdmin: false,
    offline: false,
    canInstall: false,
    installed: false,
    now: null,
    playing: false,
    togglePlay: () => {},
    volume: 1,
    setVolume: () => {},
    muted: false,
    toggleMute: () => {},
    shuffle: false,
    toggleShuffle: () => {},
    repeat: 'off',
    cycleRepeat: () => {},
    rate: 1,
    setRate: () => {},
    downloads: [],
    offlineBytes: 0,
    swReady: false,
    premium: false,
    setPremium: () => {},
    autoplay: true,
    setAutoplay: () => {},
    hq: true,
    setHq: () => {},
    language: 'ur',
    setLanguage: () => {},
    setRole: async () => ({ ok: true, local: true }),
    updateName: async () => ({ ok: true, local: true }),
    logout: () => {},
    clearOffline: async () => {},
    promptInstall: async () => ({ outcome: 'manual' }),
    addToLibrary: () => {},
    removeFromLibrary: () => {},
    audioRef: { current: null }
  }
}
