import { voices, getVoice, voiceForTitle } from './voices'

const KEY = 'lumina-voice-studio-v1'

export const defaultAccents = {
  'gb-young': { rate: 4, pitch: 4 },
  'gb-male': { rate: 0, pitch: -2 },
  'gb-female': { rate: 2, pitch: 1 },
  'pk-girl': { rate: 4, pitch: 6 },
  'pk-male': { rate: 0, pitch: -2 },
  'pk-female': { rate: 1, pitch: 1 }
}

export const defaultStudio = {
  defaultLanguage: 'listener',
  lockLanguage: false,
  assignments: {},
  accents: { ...defaultAccents }
}

export function loadStudio() {
  try {
    if (typeof localStorage === 'undefined') return { ...defaultStudio }
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaultStudio, accents: { ...defaultAccents } }
    const parsed = JSON.parse(raw)
    return {
      ...defaultStudio,
      ...parsed,
      accents: { ...defaultAccents, ...(parsed.accents || {}) },
      assignments: parsed.assignments || {}
    }
  } catch {
    return { ...defaultStudio, accents: { ...defaultAccents } }
  }
}

export function saveStudio(next) {
  const clean = {
    defaultLanguage: next.defaultLanguage || 'listener',
    lockLanguage: !!next.lockLanguage,
    assignments: next.assignments || {},
    accents: { ...defaultAccents, ...(next.accents || {}) }
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(clean))
  } catch {
    /* ignore */
  }
  return clean
}

export function languages() {
  return [
    { id: 'ur', label: 'Urdu', native: 'اردو' },
    { id: 'en', label: 'English', native: 'English' }
  ]
}

export function languageLabel(id) {
  if (id === 'en') return 'English'
  if (id === 'ur') return 'Urdu'
  return 'Listener choice'
}

export function resolveVoice(title, studio) {
  const asg = title ? studio?.assignments?.[title.id] : null
  if (asg?.voiceId) return getVoice(asg.voiceId) || voiceForTitle(title)
  return voiceForTitle(title)
}

export function resolveLanguage(studio, userLang, title) {
  const asg = title ? studio?.assignments?.[title.id] : null
  if (asg?.language === 'en' || asg?.language === 'ur') return asg.language
  if (studio?.lockLanguage && (studio.defaultLanguage === 'en' || studio.defaultLanguage === 'ur')) {
    return studio.defaultLanguage
  }
  if (studio?.defaultLanguage === 'en' || studio?.defaultLanguage === 'ur') {
    if (studio.lockLanguage) return studio.defaultLanguage
  }
  return userLang === 'en' ? 'en' : 'ur'
}

export function englishVoiceFor(voiceId) {
  if (!voiceId) return 'gb-female'
  if (voiceId.startsWith('gb-')) return voiceId
  if (voiceId === 'pk-male') return 'gb-male'
  if (voiceId === 'pk-girl') return 'gb-young'
  return 'gb-female'
}

export { voices, getVoice, voiceForTitle }
