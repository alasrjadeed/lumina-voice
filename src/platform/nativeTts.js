import { Capacitor, registerPlugin } from '@capacitor/core'

// Android WebView has no speechSynthesis. This local Capacitor plugin reaches
// the tablet's installed TextToSpeech engine (and its Urdu language pack)
// without adding a dependency or making any network call.

let plugin = null

export function nativeTtsAvailable() {
  return Capacitor.isNativePlatform()
}

function getPlugin() {
  if (!nativeTtsAvailable()) return null
  if (!plugin) plugin = registerPlugin('UrduTts')
  return plugin
}

export async function nativeTtsStatus() {
  try {
    return (await getPlugin()?.status()) || null
  } catch {
    return null
  }
}

export async function nativeTtsVoices() {
  try {
    const status = await nativeTtsStatus()
    return Array.isArray(status?.voices) ? status.voices : []
  } catch {
    return []
  }
}

export async function nativeSpeak({ text, lang = 'ur-PK', rate = 0.95, pitch = 1, voiceURI = '' } = {}) {
  try {
    const result = await getPlugin()?.speak({ text, lang, rate, pitch, voiceURI })
    return !!result?.spoken
  } catch {
    return false
  }
}

export async function nativeStop() {
  try {
    await getPlugin()?.stop()
  } catch {
    /* nothing to stop */
  }
}
