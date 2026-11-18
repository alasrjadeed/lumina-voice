import { useEffect, useRef, useState } from 'react'
import { fetchNowPlaying } from '../data/stream'
import { RADIO_ENABLED } from '../config/features.js'

// Polls an external station's now-playing endpoint. Stops cleanly on unmount and
// never throws: failures surface as `error` so the UI can explain CORS/auth issues.
export function useNowPlaying(cfg, { intervalMs = 15000, enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const cfgKey = JSON.stringify(cfg || {})
  const abort = useRef(null)

  useEffect(() => {
    if (!RADIO_ENABLED || !enabled || !cfg?.enabled || !cfg.baseUrl) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    let timer = null

    const tick = async () => {
      if (abort.current) abort.current.abort()
      abort.current = new AbortController()
      setLoading(true)
      const res = await fetchNowPlaying(cfg, abort.current.signal)
      if (cancelled) return
      setLoading(false)
      if (res.ok) {
        setData(res)
        setError(null)
        setUpdatedAt(Date.now())
      } else if (res.reason !== 'cancelled') {
        setError(res)
      }
    }

    tick()
    if (cfg.autoRefresh !== false) timer = setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (abort.current) abort.current.abort()
    }
    // deps: cfgKey/enabled/intervalMs intentionally drive the refresh window
  }, [cfgKey, enabled, intervalMs])

  return { data, error, loading, updatedAt, refresh: () => setUpdatedAt(Date.now()) }
}
