// Website content — the public marketing site (/site) and the admin dashboard
// read the same config, so anything edited in Admin → Website appears on the
// site instantly. Stored locally; a Supabase-backed sync can drop in later.

const KEY = 'lumina-site-config'

export const DEFAULT_SITE = {
  announcement: 'Explore Urdu audio-films, dramas and audiobooks.',
  heroKicker: 'LUMINA VOICE',
  heroTitle: 'Close your eyes. The story begins.',
  heroSub: 'Urdu audio-films, dramas, series and audiobooks — streamed as Opus 24–48 kbps mono.',
  showsTitle: 'Featured this week',
  aboutTitle: 'An audio library run by ears, not eyes',
  aboutBody:
    'Lumina Voice is a hand-crafted library of Urdu audio drama, series and audiobooks. Listen on the web, on mobile, or install it like an app — your place is saved on the device and follows you wherever you listen.',
  footerNote: '© Lumina Voice · by Lumina My Ai · www.alasarjadeed.com · luminamyai@gmail.com · Streamed in Opus mono',
  showFeatured: true,
  showLiveStrip: true
}

export function loadSiteConfig() {
  try {
    return { ...DEFAULT_SITE, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULT_SITE }
  }
}

export function saveSiteConfig(patch) {
  const next = { ...loadSiteConfig(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
