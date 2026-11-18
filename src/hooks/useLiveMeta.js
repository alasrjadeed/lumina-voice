import { useEffect, useState } from 'react'
import { getNowPlaying } from '../api/azuracast'
import { RADIO_ENABLED } from '../config/features.js'

export function useLiveMeta(stationId = '1', interval = 12000) {
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!RADIO_ENABLED) return undefined
    let mounted = true
    let timer = null

    const load = async () => {
      try {
        const data = await getNowPlaying(stationId)
        if (!mounted) return
        setMeta(data)
        setError(null)
      } catch (e) {
        if (!mounted) return
        setError(e)
      }
    }

    load()
    timer = setInterval(load, interval)
    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
  }, [stationId, interval])

  return { meta, error }
}

export default useLiveMeta
