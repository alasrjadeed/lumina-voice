import { AZURACAST_API_URL, AZURACAST_API_KEY, hasAzuraCast } from '../config/radio'
import { RADIO_ENABLED } from '../config/features.js'

function headers() {
  const h = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  if (AZURACAST_API_KEY) h['X-API-Key'] = AZURACAST_API_KEY
  return h
}

async function get(path) {
  if (!RADIO_ENABLED || !hasAzuraCast()) throw new Error('Radio is disabled')
  const res = await fetch(`${AZURACAST_API_URL.replace(/\/$/, '')}${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`AzuraCast ${res.status}`)
  return res.json()
}

async function post(path, body) {
  if (!hasAzuraCast()) throw new Error('AzuraCast not configured')
  const res = await fetch(`${AZURACAST_API_URL.replace(/\/$/, '')}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) })
  if (!res.ok) throw new Error(`AzuraCast ${res.status}`)
  return res.json().catch(() => ({}))
}

export async function getNowPlaying(stationId = '2') {
  try {
    const data = await get(`/nowplaying/${stationId}`)
    return data
  } catch (e) {
    try {
      const list = await get('/nowplaying')
      if (Array.isArray(list)) {
        const s = list.find((x) => String(x.station?.id) === String(stationId)) || list[0]
        return s
      }
      return list
    } catch {
      throw e
    }
  }
}

export async function getStatus() {
  try {
    const list = await get('/nowplaying')
    return Array.isArray(list) ? list[0] : list
  } catch {
    return null
  }
}

export const azura = { get, post, getNowPlaying, getStatus }
export default azura
