import { RADIO_ENABLED } from '../config/features.js'
import { nativeSpeak, nativeStop, nativeTtsAvailable, nativeTtsStatus, nativeTtsVoices } from '../platform/nativeTts.js'

// Device voice — 100% on-device, no provider, no key, no cost.
// Android WebView has no Web Speech API, so the native UrduTts plugin is used
// there; browsers use speechSynthesis. Both paths share the same text shaping.

const LS_VOICE = 'lumina-device-voice'
const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

function webSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function ttsSupported() {
  return webSpeech() || nativeTtsAvailable()
}

export function ttsEngine() {
  if (nativeTtsAvailable()) return 'native'
  if (webSpeech()) return 'web'
  return 'none'
}

export function sttSupported() {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

export function loadVoicePrefs() {
  const defaults = { announce: false, commands: false, voiceURI: '', rate: 1, pitch: 1 }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(LS_VOICE) || '{}') }
  } catch {
    return defaults
  }
}

export function saveVoicePrefs(prefs) {
  try {
    localStorage.setItem(LS_VOICE, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

// Shape text the way an Urdu reader actually says it: clean punctuation,
// Urdu digits, natural pauses at an ellipsis, no markup cluttering the voice.
export function prepareSpeechText(text, lang = 'ur') {
  const urdu = /^ur/i.test(lang)
  let out = String(text ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/[[\]{}<>]/g, ' ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s*([،,؛;؟?!…])\s*/g, '$1 ')
    .replace(/([!؟])\1+/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim()
  if (urdu) {
    out = out
      .replace(/,/g, '،')
      .replace(/;/g, '؛')
      .replace(/\?/g, '؟')
      .replace(/[0-9]/g, (d) => URDU_DIGITS[Number(d)])
      .replace(/…(?=\s*$)/g, '۔')
      .replace(/…/g, '،')
  } else {
    out = out
      .replace(/،/g, ',')
      .replace(/؛/g, ';')
      .replace(/؟/g, '?')
      .replace(/…(?=\s*$)/g, '.')
      .replace(/…/g, ',')
  }
  return out.replace(/ {2,}/g, ' ').trim().slice(0, 400)
}

// Urdu narration reads better a touch slower than a UI speed of 1.0.
export function speechRate(rate, lang = 'ur') {
  const value = Number(rate)
  const base = Number.isFinite(value) && value > 0 ? value : 1
  const scaled = /^ur/i.test(lang) ? base * 0.95 : base
  return Math.round(Math.min(1.25, Math.max(0.7, scaled)) * 100) / 100
}

export function rankVoices(voices, langHint = 'ur') {
  const urdu = /^ur/i.test(langHint)
  const score = (voice) => {
    const lang = String(voice?.lang || '').toLowerCase()
    if (urdu) {
      if (lang === 'ur-pk') return 6
      if (lang.startsWith('ur-pk')) return 5
      if (lang === 'ur-in') return 4
      if (lang.startsWith('ur')) return 3
      if (lang.startsWith('en-gb')) return 2
      if (lang.startsWith('en')) return 1
      return 0
    }
    if (lang === 'en-gb') return 6
    if (lang.startsWith('en-gb')) return 5
    if (lang === 'en-us') return 4
    if (lang.startsWith('en')) return 3
    if (lang.startsWith('ur')) return 1
    return 0
  }
  return [...(voices || [])].sort(
    (a, b) =>
      score(b) - score(a) ||
      Number(!!b.localService) - Number(!!a.localService) ||
      String(a.name || '').localeCompare(String(b.name || ''))
  )
}

export function listVoices(langHint = 'ur') {
  if (!webSpeech()) return []
  return rankVoices(window.speechSynthesis.getVoices() || [], langHint)
}

export async function listVoicesAsync(langHint = 'ur') {
  if (nativeTtsAvailable()) {
    const installed = await nativeTtsVoices()
    const mapped = installed.map((v) => ({
      name: v.name || v.uri,
      lang: v.lang || '',
      voiceURI: v.uri || v.name,
      localService: v.local !== false
    }))
    if (mapped.length) return rankVoices(mapped, langHint)
  }
  return listVoices(langHint)
}

export async function voiceStatus() {
  if (nativeTtsAvailable()) return nativeTtsStatus()
  return { available: webSpeech(), engine: 'web', voices: listVoices('ur'), error: '' }
}

function speakWeb(text, { lang, voiceURI, rate, pitch }) {
  if (!webSpeech() || typeof SpeechSynthesisUtterance === 'undefined') return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = pitch
  const chosen = listVoices(/^ur/i.test(lang) ? 'ur' : 'en').find((v) => v.voiceURI === voiceURI)
  if (chosen) {
    utterance.voice = chosen
    utterance.lang = chosen.lang || lang
  }
  window.speechSynthesis.speak(utterance)
  return true
}

// Speak with the device's own engine. Returns false when unsupported.
export function speak(text, { lang = 'ur-PK', voiceURI = '', rate = 1, pitch = 1 } = {}) {
  if (!ttsSupported()) return false
  const spoken = prepareSpeechText(text, lang)
  if (!spoken) return false
  const natural = speechRate(rate, lang)
  if (nativeTtsAvailable()) {
    nativeSpeak({ text: spoken, lang, rate: natural, pitch, voiceURI })
      .then((ok) => {
        if (!ok && webSpeech()) speakWeb(spoken, { lang, voiceURI, rate: natural, pitch })
      })
      .catch(() => {})
    return true
  }
  return speakWeb(spoken, { lang, voiceURI, rate: natural, pitch })
}

export function stopSpeaking() {
  if (nativeTtsAvailable()) nativeStop()
  if (webSpeech()) window.speechSynthesis.cancel()
}

// One-shot speech recognition. The caller owns the mic while `listening` is true.
// onResult receives the final transcript; the recognizer always stops after a result.
export function listenOnce({ lang = 'ur-PK', onResult, onEnd, onError } = {}) {
  if (!sttSupported()) {
    onError?.('unsupported')
    return null
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.continuous = false
  rec.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript || ''
    onResult?.(text)
  }
  rec.onerror = (e) => onError?.(e.error || 'error')
  rec.onend = () => onEnd?.()
  try {
    rec.start()
  } catch (e) {
    onError?.(e.message || 'error')
    return null
  }
  return rec
}

// Maps a spoken line (Urdu or English) to a player command.
// Returns { action, arg } or null when nothing matched.
const RULES = [
  { re: /(play|pause|stop|روک|چلاؤ|بند|چلائیں)/i, test: (t) => (/.pause|stop|روک|بند/i.test(t) ? { action: 'toggle' } : { action: 'toggle' }) },
  { re: /(next|agla|اگلا|skip)/i, test: () => ({ action: 'next' }) },
  { re: /(previous|peechla|پچھلا|back)/i, test: () => ({ action: 'prev' }) },
  ...(RADIO_ENABLED ? [{ re: /(radio|live|سادہ بہار|ریڈیو)/i, test: () => ({ action: 'radio' }) }] : []),
  { re: /(urdu|اردو)/i, test: () => ({ action: 'lang', arg: 'ur' }) },
  { re: /(english|انگلش|انگلیشی)/i, test: () => ({ action: 'lang', arg: 'en' }) },
  { re: /(status|report|کیا چل رہا|حالت)/i, test: () => ({ action: 'status' }) }
]

export function parseVoiceCommand(text) {
  const t = String(text || '').toLowerCase()
  for (const r of RULES) {
    if (r.re.test(t)) return r.test(t)
  }
  return null
}
