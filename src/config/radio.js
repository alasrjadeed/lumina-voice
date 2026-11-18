import { RADIO_ENABLED } from './features.js'

export const RADIO_STREAM_URL = RADIO_ENABLED ? ((import.meta.env?.VITE_RADIO_STREAM_URL) || '') : ''
export const AZURACAST_API_URL = RADIO_ENABLED ? ((import.meta.env?.VITE_AZURACAST_API_URL) || '') : ''
export const AZURACAST_API_KEY = RADIO_ENABLED ? ((import.meta.env?.VITE_AZURACAST_API_KEY) || '') : ''

export function hasRadioStream() {
  return !!RADIO_STREAM_URL
}

export function hasAzuraCast() {
  return !!(AZURACAST_API_URL && AZURACAST_API_KEY)
}
