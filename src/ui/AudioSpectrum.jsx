import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

// An <audio> element can only be passed to createMediaElementSource() once.
// Keeping the graph in a WeakMap means pause/play and route changes reuse the
// same analyser instead of throwing on every remount (a common error on the
// Android 8.1 tablet WebView).
const graphs = new WeakMap()
const unsupported = new WeakSet()

function canAnalyse(mediaEl) {
  const src = mediaEl.currentSrc || mediaEl.src || ''
  if (!/^https?:/i.test(src)) return true
  try {
    const u = new URL(src, window.location.href)
    if (u.origin === window.location.origin) return true
    // A cross-origin stream is only safe to route through Web Audio when it
    // was requested with CORS. Otherwise Chrome mutes the analyser output.
    return mediaEl.crossOrigin === 'anonymous'
  } catch {
    return false
  }
}

function getGraph(mediaEl) {
  if (!mediaEl || unsupported.has(mediaEl)) return null
  // Android WebView accepts createMediaElementSource() but its destination stays
  // silent: the track advances while nothing is audible. Never hijack the media
  // element on native — the decorative pulse below is used instead.
  if (Capacitor.isNativePlatform()) return null
  if (!canAnalyse(mediaEl)) return null
  if (graphs.has(mediaEl)) return graphs.get(mediaEl)

  let audioCtx = null
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) throw new Error('no AudioContext')
    audioCtx = new AC()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.6
    const source = audioCtx.createMediaElementSource(mediaEl)
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    const graph = { audioCtx, analyser, source }
    graphs.set(mediaEl, graph)
    return graph
  } catch {
    unsupported.add(mediaEl)
    try { audioCtx?.close() } catch {}
    return null
  }
}

function roundRect(ctx, x, y, w, h, r) {
  try {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r)
      return
    }
  } catch {}
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * AudioSpectrum — real-time Web Audio API visualizer drawn on a <canvas>.
 *
 * Fully defensive: every Web Audio / canvas operation is wrapped in try/catch
 * so older Android WebViews (Android 8.1, no AudioContext, no roundRect, etc.)
 * degrade gracefully to a silent idle pulse instead of crashing.
 */
export default function AudioSpectrum({ mediaEl, active, width = 220, height = 140, className = '' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      const graph = mediaEl && active ? getGraph(mediaEl) : null
      if (graph?.audioCtx?.state === 'suspended') {
        try { graph.audioCtx.resume() } catch {}
      }
      const analyser = graph?.analyser || null
      const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null

      const barCount = 40
      function draw() {
        try {
          if (!canvasRef.current) return
          const c = canvasRef.current.getContext('2d')
          if (!c) return
          c.clearRect(0, 0, width, height)
          // The spectrum is painted on top of the cover art. A soft dark scrim
          // across the whole cover keeps the bright bars readable without
          // hiding the artwork behind them.
          const scrim = c.createLinearGradient(0, 0, 0, height)
          scrim.addColorStop(0, 'rgba(6, 5, 11, 0)')
          scrim.addColorStop(0.35, 'rgba(6, 5, 11, 0.25)')
          scrim.addColorStop(1, 'rgba(6, 5, 11, 0.78)')
          c.fillStyle = scrim
          c.fillRect(0, 0, width, height)

          const gradient = c.createLinearGradient(0, height, 0, 0)
          gradient.addColorStop(0, '#ffd76a')
          gradient.addColorStop(0.55, '#b28bff')
          gradient.addColorStop(1, '#6a4bff')

          if (analyser && active && data) {
            try { analyser.getByteFrequencyData(data) } catch {}
            const step = Math.max(1, Math.floor(data.length / barCount))
            for (let i = 0; i < barCount; i++) {
              const v = data[i * step] || 0
              const barH = Math.max(2, (v / 255) * height * 0.88)
              const x = (i / barCount) * width
              const barW = Math.max(1, width / barCount - 2)
              c.fillStyle = gradient
              roundRect(c, x, height - barH, barW, barH, 2)
              c.fill()
            }
          } else {
            // Native WebView: no analyser (it would mute the player), so draw a
            // live-looking pulse that still reacts to play/pause.
            const t = Date.now() / 1000
            for (let i = 0; i < barCount; i++) {
              const wave =
                Math.abs(Math.sin(t * 2.2 + i * 0.55)) * 0.6 +
                Math.abs(Math.sin(t * 1.3 + i * 0.17)) * 0.4
              const h = active ? 8 + wave * height * 0.8 : 5 + 7 * Math.abs(Math.sin(t + i / 3))
              const x = (i / barCount) * width
              const barW = Math.max(1, width / barCount - 2)
              c.fillStyle = active ? gradient : 'rgba(228, 195, 106, 0.55)'
              roundRect(c, x, height - h, barW, h, 2)
              c.fill()
            }
          }
        } catch {}
        rafRef.current = requestAnimationFrame(draw)
      }

      draw()
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    } catch {}
  }, [mediaEl, active, width, height])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: active ? 1 : 0.8
      }}
      aria-hidden
    />
  )
}
