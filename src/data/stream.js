// External broadcast integration: AzuraCast and Icecast.
//
// Lumina never relays or proxies audio. This module only *reads* a station's
// public now-playing metadata and builds the direct mount URLs that a listener's
// browser connects to. The heavy lifting (encoding, 24/7 uptime) belongs to an
// external AzuraCast / Icecast server.
//
// Endpoints used:
//   AzuraCast public : {base}/api/nowplaying/{shortcode}      (no key)
//   AzuraCast admin   : {base}/api/station/{id}/nowplaying     (X-API-Key)
//   Icecast           : {base}/status-json.xsl                 (no key)
//
// Config lives in localStorage so the Studio can point at a station at runtime.

import { logger } from '../lib/logger.js'
import { RADIO_ENABLED } from '../config/features.js'

const KEY = 'lumina-stream-v2'
const QUALITY_KEY = 'lumina-stream-quality-v1'

// The AzuraCast API is reached on its own port, while listener mounts are
// published on the CasaOS host root. Keeping both bases separate is what makes
// a local CasaOS broadcast work from the browser.
function localDefaults() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const env = import.meta.env || {}
  const apiBase = env.VITE_AZURACAST_BASE_URL || (hostname ? `http://${hostname}:8080` : 'http://192.168.1.166:8080')
  const listenBase = env.VITE_STREAM_LISTEN_BASE || (hostname ? `http://${hostname}:8080` : 'http://192.168.1.166:8080')
  return {
    enabled: RADIO_ENABLED,
    provider: env.VITE_STREAM_PROVIDER || 'azuracast',
    baseUrl: apiBase,
    streamBaseUrl: listenBase,
    shortcode: env.VITE_AZURACAST_SHORTCODE || 'lumina_voice',
    stationId: env.VITE_AZURACAST_STATION_ID || '2',
    apiKey: env.VITE_AZURACAST_API_KEY || '8d5eaee6a93d7ad8:c25693153bbfc766f884bd1b92ab0ce5',
    mount: '',
    listenUrl: env.VITE_STREAM_LISTEN_URL || '',
    autoRefresh: true
  }
}

export const defaultStreamConfig = localDefaults()

export function loadStreamConfig() {
  try {
    if (typeof localStorage === 'undefined') return { ...defaultStreamConfig }
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultStreamConfig }
    const merged = { ...defaultStreamConfig, ...JSON.parse(raw) }
    merged.enabled = RADIO_ENABLED && merged.enabled
    return merged
  } catch {
    return { ...defaultStreamConfig }
  }
}

export function saveStreamConfig(cfg) {
  const clean = {
    ...defaultStreamConfig,
    ...cfg,
    baseUrl: (cfg.baseUrl || '').trim().replace(/\/+$/, ''),
    streamBaseUrl: (cfg.streamBaseUrl || cfg.baseUrl || '').trim().replace(/\/+$/, ''),
    shortcode: (cfg.shortcode || '').trim(),
    stationId: (cfg.stationId || '').trim(),
    mount: (cfg.mount || '').trim(),
    listenUrl: (cfg.listenUrl || '').trim()
  }
  clean.enabled = RADIO_ENABLED && clean.baseUrl.length > 0
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(clean))
  } catch {
    /* ignore */
  }
  return clean
}

export function providerLabel(id) {
  return id === 'icecast' ? 'Icecast' : 'AzuraCast'
}

// Guesses a provider from a pasted URL so the form can pre-select it.
export function detectProvider(url) {
  if (!url) return 'azuracast'
  try {
    const u = new URL(url)
    if (u.port === '8000' || u.pathname.includes('status-json') || u.pathname.includes('icecast')) return 'icecast'
  } catch {
    /* ignore */
  }
  return 'azuracast'
}

function nowPlayingUrl(cfg) {
  const base = (cfg.baseUrl || '').replace(/\/+$/, '')
  if (!base) return ''
  if (cfg.provider === 'icecast') return `${base}/status-json.xsl`
  if (cfg.apiKey && cfg.stationId) return `${base}/api/station/${encodeURIComponent(cfg.stationId)}/nowplaying`
  if (cfg.shortcode) return `${base}/api/nowplaying/${encodeURIComponent(cfg.shortcode)}`
  return `${base}/api/nowplaying`
}

function nowPlayingFallbackUrl(cfg) {
  const base = (cfg.baseUrl || '').replace(/\/+$/, '')
  if (!base || cfg.provider === 'icecast') return ''
  return `${base}/api/nowplaying`
}

function str(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Normalises AzuraCast's now-playing payload.
function normaliseAzura(data, cfg = {}) {
  // The public /api/nowplaying list returns one entry per station; pick ours.
  if (Array.isArray(data)) {
    const wanted = data.find((s) =>
      (cfg.shortcode && String(s?.station?.shortcode || '') === cfg.shortcode) ||
      (cfg.stationId && String(s?.station?.id || '') === cfg.stationId) ||
      s?.now_playing
    ) || data[0]
    return wanted ? normaliseAzura(wanted, cfg) : { ok: false, reason: 'No stations are currently on air' }
  }
  const np = data?.now_playing || {}
  const song = np.song || {}
  const live = np.live || {}
  const station = data?.station || {}
  return {
    ok: true,
    provider: 'azuracast',
    station: str(station.name) || 'AzuraCast station',
    title: str(song.title) || str(song.text) || 'Unknown track',
    artist: str(song.artist),
    album: str(song.album),
    art: str(song.art) || str(station.branding?.logo),
    listeners: num(np.listeners?.current) ?? num(np.listeners?.total) ?? 0,
    listenerMax: num(np.listeners?.total) ?? null,
    isLive: !!(live.is_live || np.is_live),
    liveName: str(live.streamer_name),
    elapsed: num(np.elapsed),
    duration: num(np.duration),
    playedAt: num(np.played_at),
    mounts: Array.isArray(station.mounts) ? station.mounts : [],
    raw: data
  }
}

// Normalises Icecast's status-json payload (single or multiple sources).
function normaliseIcecast(data, mount) {
  const rawSources = data?.icestats?.source
  const sources = Array.isArray(rawSources) ? rawSources : rawSources ? [rawSources] : []
  const wanted = sources.find((s) => mount && str(s.listenurl).includes(mount)) || sources[0]
  if (!wanted) {
    return { ok: true, provider: 'icecast', station: 'Icecast', title: 'No active source', listeners: 0, isLive: false, sources: sources.length, mounts: [] }
  }
  return {
    ok: true,
    provider: 'icecast',
    station: str(wanted.server_name) || 'Icecast',
    title: str(wanted.title) || str(wanted.server_description) || 'Live stream',
    artist: str(wanted.artist),
    art: '',
    listeners: num(wanted.listeners) ?? 0,
    listenerMax: num(wanted.listener_peak) ?? null,
    isLive: true,
    liveName: '',
    elapsed: null,
    duration: null,
    playedAt: null,
    mounts: sources.map((s) => ({ name: str(s.listenurl), url: str(s.listenurl) })),
    raw: data
  }
}

export async function fetchNowPlaying(cfg, signal) {
  const url = nowPlayingUrl(cfg)
  if (!url) return { ok: false, reason: 'No station URL configured' }
  const headers = {}
  if (cfg.provider === 'azuracast' && cfg.apiKey && cfg.stationId) headers['X-API-Key'] = cfg.apiKey

  const get = async (target) => {
    try {
      const res = await fetch(target, { signal, headers, cache: 'no-store' })
      if (!res.ok) {
        logger.warn({ status: res.status, url: target }, 'now-playing HTTP error')
        return { error: { ok: false, reason: `HTTP ${res.status}`, hint: res.status === 404 ? 'Endpoint not found — check the shortcode / station id.' : '' } }
      }
      try {
        return { data: await res.json() }
      } catch {
        return { error: { ok: false, reason: 'Response was not JSON' } }
      }
    } catch (e) {
      if (e.name !== 'AbortError') logger.warn({ err: e, url: target }, 'now-playing fetch failed')
      return {
        error: {
          ok: false,
          reason: e.name === 'AbortError' ? 'cancelled' : 'Network or CORS error',
          hint: 'Browsers block cross-origin reads unless the station allows it. In AzuraCast enable API access / CORS for this origin; Icecast needs CORS headers on status-json.xsl.'
        }
      }
    }
  }

  let result = await get(url)
  if (result.error && result.error.reason === 'HTTP 404') {
    const fallback = nowPlayingFallbackUrl(cfg)
    if (fallback && fallback !== url) result = await get(fallback)
  }
  if (result.error) return result.error
  return cfg.provider === 'icecast' ? normaliseIcecast(result.data, cfg.mount) : normaliseAzura(result.data, cfg)
}

/* ------------------------------------------------------------------ *
 * Stream mounts
 * ------------------------------------------------------------------ */

// Direct listener URLs. For AzuraCast these follow the public mount convention;
// the user can override with a custom mount in the Studio.
export function streamMounts(cfg) {
  const apiBase = (cfg.baseUrl || '').replace(/\/+$/, '')
  const listenBase = (cfg.streamBaseUrl || cfg.baseUrl || '').replace(/\/+$/, '')
  if (!apiBase || !listenBase) return []

  // A full URL from AzuraCast's own "listen_url" is always authoritative.
  if (cfg.listenUrl && /^https?:\/\//i.test(cfg.listenUrl)) {
    return [{ id: 'live', label: 'Station live stream', url: cfg.listenUrl, codec: 'mp3', recommended: true }]
  }
  if (cfg.mount && /^https?:\/\//i.test(cfg.mount)) {
    return [{ id: 'custom', label: 'Custom mount', url: cfg.mount, codec: 'custom', recommended: true }]
  }

  if (cfg.provider === 'icecast') {
    const mount = cfg.mount || '/stream'
    return [
      { id: 'icecast', label: 'Icecast mount', url: `${listenBase}${mount.startsWith('/') ? mount : `/${mount}`}`, codec: 'icecast', recommended: true }
    ]
  }

  const sc = cfg.shortcode || 'station'
  if (cfg.mount) {
    return [{ id: 'custom', label: 'Custom mount', url: `${listenBase}${cfg.mount.startsWith('/') ? cfg.mount : `/${cfg.mount}`}`, codec: 'custom', recommended: true }]
  }
  return [
    { id: 'live', label: 'Live Stream', url: `${listenBase}/listen/${sc}/live`, codec: 'mp3', recommended: true },
    { id: 'live-flat', label: 'Live Stream (flat URL)', url: `${listenBase}/listen/${sc}live`, codec: 'mp3' },
    { id: 'opus', label: 'Opus', url: `${listenBase}/listen/${sc}/radio.opus`, codec: 'opus' },
    { id: 'aac', label: 'AAC', url: `${listenBase}/listen/${sc}/radio.m4a`, codec: 'aac' },
    { id: 'mp3', label: 'MP3', url: `${listenBase}/listen/${sc}/radio.mp3`, codec: 'mp3' }
  ]
}

// Listener-side quality preference (which direct mount the player uses).
export function loadPreferredMount() {
  try {
    if (typeof localStorage === 'undefined') return ''
    return localStorage.getItem(QUALITY_KEY) || ''
  } catch {
    return ''
  }
}

export function savePreferredMount(id) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(QUALITY_KEY, id || '')
  } catch {
    /* ignore */
  }
}

export function mountFor(cfg, id) {
  const mounts = streamMounts(cfg)
  return mounts.find((m) => m.id === id) || mounts.find((m) => m.recommended) || mounts[0] || null
}

/* ------------------------------------------------------------------ *
 * Embed snippets
 * ------------------------------------------------------------------ */

export function embedSnippets(cfg, stationName = 'Sada Bahar', origin) {
  const mount = streamMounts(cfg).find((m) => m.recommended) || streamMounts(cfg)[0]
  const streamUrl = mount?.url || 'https://radio.example.com/listen/station/radio.opus'
  const npUrl = nowPlayingUrl(cfg) || 'https://radio.example.com/api/nowplaying/station'
  const name = stationName
  const appOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://your-app.example.com')

  const iframe = `<iframe
  src="${appOrigin}/radio?embed=1"
  width="100%" height="260" frameborder="0"
  title="${name} — live radio"
  allow="autoplay"
  style="border-radius:16px;overflow:hidden">
</iframe>`

  const audio = `<audio controls preload="none" style="width:100%">
  <source src="${streamUrl}" type="${mimeFor(mount?.codec)}">
  Your browser does not support the audio element.
</audio>
<p><a href="${streamUrl}">Listen to ${name} live</a></p>`

  const widget = `<div id="lumina-nowplaying" data-endpoint="${npUrl}"></div>
<script>
  // Tiny dependency-free now-playing widget.
  (function () {
    var box = document.getElementById('lumina-nowplaying')
    function esc(s) { return String(s || '').replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
    }) }
    function tick() {
      fetch(box.dataset.endpoint, { cache: 'no-store' })
        .then(function (r) { return r.json() })
        .then(function (d) {
          var np = d.now_playing || {}, song = np.song || {}, live = np.live || {}
          var title = song.title || song.text || 'Live radio'
          var artist = song.artist ? ' — ' + song.artist : ''
          var listeners = (np.listeners && np.listeners.current) || 0
          box.innerHTML = '<div style="font:14px/1.4 system-ui;color:#e4c36a;letter-spacing:.12em">ON AIR</div>' +
            '<div style="font:600 20px/1.3 system-ui;color:#f4efe6">' + esc(title) + esc(artist) + '</div>' +
            '<div style="font:12px/1.4 system-ui;color:#9a9488">' + (live.is_live ? 'Live with a host · ' : '') +
            listeners + ' listening</div>'
        })
        .catch(function () { box.textContent = '${name} — live radio' })
    }
    tick()
    setInterval(tick, 15000)
  })()
</script>`

  const logo = cfg.baseUrl ? cfg.baseUrl + '/static/branding/logo.png' : 'https://your-app.example.com/icon-192.png'
  const markdown =
    '[![Listen live](' + logo + ')](' + streamUrl + ')\n\n**' + name + '** \u2014 live now: [now playing](' + npUrl + ')'

  return { iframe, audio, widget, markdown, streamUrl, nowPlayingUrl: npUrl }
}

export function mimeFor(codec) {
  if (codec === 'opus') return 'audio/ogg; codecs=opus'
  if (codec === 'aac' || codec === 'm4a') return 'audio/mp4'
  if (codec === 'mp3') return 'audio/mpeg'
  return 'audio/mpeg'
}

// Framework-agnostic "can the browser read this endpoint?" helper used by the
// Studio test button so users see a precise, actionable message.
export function configIssues(cfg) {
  const issues = []
  if (!cfg.baseUrl) issues.push('Station base URL is required.')
  else if (!/^https?:\/\//i.test(cfg.baseUrl)) issues.push('Station URL must start with http:// or https://.')
  if (cfg.streamBaseUrl && !/^https?:\/\//i.test(cfg.streamBaseUrl)) issues.push('Listener base URL must start with http:// or https://.')
  if (cfg.provider === 'azuracast' && !cfg.shortcode && !cfg.stationId) {
    issues.push('AzuraCast needs a shortcode (public API) or a station id + API key (admin API).')
  }
  return issues
}
