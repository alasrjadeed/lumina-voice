// Archive.org-only catalogue. No house/demo audio, no empty serial shells and
// no locally bundled story audio is shipped. Advertising lives in ads.js and
// is intentionally outside this catalogue.

import { archiveAuthors, archiveTitles } from './generated/archiveLibrary.js'
import { filterArchiveTitles } from './contentPolicy'

const ARCHIVE_ITEM = 'ghazals_ghalib_0809_librivox'

const ghalibTracks = [
  ['aahkochaahyea_ghalib_64kb.mp3', 'آہ کو چاہیے', 'Aahko Chaahyea'],
  ['aashiq_ghalib_64kb.mp3', 'عاشق', 'Aashiq'],
  ['aeinakyun_ghalib_64kb.mp3', 'عین کیوں', 'Aeinakyun'],
  ['baghtujhbin_ghalib_64kb.mp3', 'باغ تجھ بن', 'Bagh Tujhbin'],
  ['bisateijz_ghalib_64kb.mp3', 'بستے جز', 'Bisateijz'],
  ['chahiyeachon_ghalib_64kb.mp3', 'چاہیے چون', 'Chahiyeachon'],
  ['damanedil_ghalib_64kb.mp3', 'دامن دل', 'Damanedil'],
  ['dardsay_ghalib_64kb.mp3', 'درد سے', 'Dardsay'],
  ['deherman_ghalib_64kb.mp3', 'دہر من', 'Deherman'],
  ['dilhinaheen_ghalib_64kb.mp3', 'دل ہی نہیں', 'Dil Hi Naheen'],
  ['dyayaronnay_ghalib_64kb.mp3', 'دیا یاروں نے', 'Dya Yaron Nay'],
  ['garkhamshi_ghalib_64kb.mp3', 'گرخمشیں', 'Garkhamshi'],
  ['ghuncha_ghalib_64kb.mp3', 'غنچہ', 'Ghuncha'],
  ['ishiqsay_ghalib_64kb.mp3', 'عشق سے', 'Ishiq Say'],
  ['jabbataqreeb_ghalib_64kb.mp3', 'جب قریب', 'Jab Taqreeb'],
  ['jabtakdahan_ghalib_64kb.mp3', 'جب تک دہن', 'Jab Tak Dahan'],
  ['jehantera_ghalib_64kb.mp3', 'جہاں ترا', 'Jahan Tera'],
  ['kabhinaki_ghalib_64kb.mp3', 'کبھی نہ کی', 'Kabhi Na Ki'],
  ['karkhanaysay_ghalib_64kb.mp3', 'کارخانوں سے', 'Karkhanay Say'],
  ['kehtayho_ghalib_64kb.mp3', 'کہتے ہو', 'Kehtay Ho'],
  ['kohkay_ghalib_64kb.mp3', 'کوہ کے', 'Koh Kay'],
  ['kyatanghum_ghalib_64kb.mp3', 'کیا تنگ ہم', 'Kya Tang Hum'],
  ['masjidkay_ghalib_64kb.mp3', 'مسجد کے', 'Masjid Kay'],
  ['mudathuihey_ghalib_64kb.mp3', 'مدت ہوئی ہے', 'Mudath Uihey'],
  ['nagulenghma_ghalib_64kb.mp3', 'نہ گلیں غم', 'Na Gulen Ghama'],
  ['naqshfryadi_ghalib_64kb.mp3', 'نقش فریادی', 'Naqsh Faryadi'],
  ['paonmay_ghalib_64kb.mp3', 'پاؤں میں', 'Paon May'],
  ['phermujhay_ghalib_64kb.mp3', 'پھر مجھے', 'Pher Mujhay'],
  ['phirkuchisdil_ghalib_64kb.mp3', 'پھر کچھ اس دل', 'Phir Kuch Is Dil'],
  ['safayhayrate_ghalib_64kb.mp3', 'صفحات حیرت', 'Safay Hayrate'],
  ['sergushtagi_ghalib_64kb.mp3', 'سرگذشتگی', 'Sar Guzashtagi'],
  ['shokherrang_ghalib_64kb.mp3', 'شوخ رنگ', 'Shokh Errang'],
  ['warsta_ghalib_64kb.mp3', 'ورستہ', 'Warsta'],
  ['washat_ghalib_64kb.mp3', 'وحشت', 'Washat'],
  ['woakaykhab_ghalib_64kb.mp3', 'وہ آئے خواب', 'Wo Akay Khwab']
]

const ghalibTitle = {
  id: 'selected-ghazals-of-ghalib',
  number: 'IA-001',
  name: 'Selected Ghazals of Ghalib',
  nameUr: 'منتخب غزلیاتِ غالب',
  seriesId: null,
  voiceId: 'pk-male',
  authorId: 'mirza-ghalib',
  genres: ['Poetry'],
  kind: 'Ghazals',
  featured: true,
  top: true,
  year: 2008,
  cover: 'solen',
  coverUrl: `https://archive.org/download/LibrivoxCdCoverArt14/Selected_Ghazals_Ghalib_1201.jpg`,
  synopsis: 'Public-domain LibriVox recording of selected ghazals by Mirza Asadullah Khan Ghalib, streamed directly from Archive.org.',
  source: 'archive.org',
  sourceUrl: `https://archive.org/details/${ARCHIVE_ITEM}`,
  episodes: ghalibTracks.map(([file, title, titleEn], i) => {
    const audio = `https://archive.org/download/${ARCHIVE_ITEM}/${file}`
    return { id: `ghalib-e${i + 1}`, title, titleEn, free: true, asset: '', audio, src: audio, codec: 'mp3', kbps: 64, channels: 'mono' }
  })
}

export const codecInfo = {
  format: 'Archive.org streams',
  ext: '.mp3 / .opus',
  bitrate: 'Source bitrate · 64 kbps mono for the LibriVox Ghalib recording',
  channels: 'Mono',
  sampleRate: 'Native browser decoding · no local transcode',
  fallback: 'Browser-native MP3/Opus playback',
  profile: 'Public-domain Internet Archive recordings only',
  platforms: 'Android WebView, web browsers and installable PWA'
}

// Kept for the paused radio source; not part of the public content catalogue.
export const radioStation = {
  id: 'sada-bahar',
  name: 'Sada Bahar',
  nameUr: 'صدابہار',
  tagline: 'Poetry and voices, streaming around the clock.',
  taglineUr: 'شاعری اور آوازیں، چوبیس گھنٹے۔',
  badge: 'LIVE RADIO',
  asset: 'radio-live',
  audio: '/audio/radio-live.opus',
  kbps: 40,
  cover: 'aurora'
}

export const titles = filterArchiveTitles([ghalibTitle, ...archiveTitles])

export const authors = [
  {
    id: 'mirza-ghalib',
    name: 'Mirza Asadullah Khan Ghalib',
    nameUr: 'مرزا اسد اللہ خان غالب',
    role: 'Poet',
    bio: 'Urdu poet (1797–1869). These public-domain ghazals are read by LibriVox volunteers and hosted by the Internet Archive.'
  },
  ...archiveAuthors
]

export const poets = []

export const seriesList = []

// Shelf vocabulary only — not content. Empty shelves are hidden in the UI.
export const genres = [
  'Comedy',
  'Crime',
  'Drama',
  'Espionage',
  'Poetry',
  'Quran Kareem',
  'Tilawat',
  'Urdu Translation',
  'Tafsir',
  'Autobiography',
  'Memoir',
  'Horror / supernatural',
  'Mystery / detective',
  'Urdu short stories',
  'Classic novels',
  'Adventure / fantasy',
  "Children's stories"
]

export const kinds = ['Audio-film', 'Drama', 'Audiobook', 'Ghazals', 'Quran Kareem']

// Shelf definitions remain available to the studio; empty shelves are hidden by
// the UI when there is no Archive.org title filed under them.
export const catalogues = [
  { id: 'poetry', label: 'Poetry & Ghazals', category: 'poetry', genres: ['Poetry'], kinds: ['Audiobook', 'Ghazals'] },
  { id: 'ghazals', label: 'Ghazals', category: 'poetry', genres: ['Poetry'], kinds: ['Ghazals'] },
  {
    id: 'drama',
    label: 'Drama & Fiction',
    category: 'drama',
    genres: ['Drama', 'Crime', 'Espionage', 'Comedy'],
    kinds: ['Audio-film', 'Drama']
  },
  {
    id: 'quran',
    label: 'Quran Kareem',
    category: 'quran',
    genres: ['Quran Kareem', 'Tilawat', 'Urdu Translation', 'Tafsir'],
    kinds: ['Quran Kareem']
  },
  { id: 'audiobook', label: 'Audiobooks', category: 'audiobook', genres: ['Drama'], kinds: ['Audiobook'] }
]

export const getCatalogue = (id) => catalogues.find((c) => c.id === id)

export function catalogueForTitle(t) {
  if (!t) return 'drama'
  const g = (t.genres || []).map((x) => String(x).toLowerCase())
  const quran = g.includes('quran kareem') || t.kind === 'Quran Kareem' || /quran|qur['’ʻ]?an|koran/i.test(t.name || '')
  if (quran) return 'quran'
  if (t.kind === 'Ghazals' || (g.length === 1 && g[0] === 'poetry')) return 'poetry'
  if (t.kind === 'Audiobook' && !g.includes('drama')) return 'audiobook'
  return 'drama'
}

export const hero = {
  titleId: 'selected-ghazals-of-ghalib',
  kicker: 'From the Internet Archive',
  line: 'Public-domain Urdu ghazals, streamed straight from Archive.org. Close your eyes. The story begins.'
}

export function getAuthor(id) {
  return authors.find((a) => a.id === id) || poets.find((p) => p.id === id)
}

export function getSeries(id) {
  return seriesList.find((s) => s.id === id)
}

export function getTitle(id) {
  return titles.find((t) => t.id === id)
}

export function titlesBySeries(seriesId) {
  return titles.filter((t) => t.seriesId === seriesId)
}

export function titlesByAuthor(authorId) {
  return titles.filter((t) => t.authorId === authorId)
}

export function titlesByGenre(genre) {
  return titles.filter((t) => (t.genres || []).includes(genre))
}

export function titlesByKind(kind) {
  return titles.filter((t) => t.kind === kind)
}

export function searchCatalog(q) {
  const s = String(q || '').trim().toLowerCase()
  if (!s) return { titles: [], series: [], people: [] }
  const hit = (v) => String(v || '').toLowerCase().includes(s)
  return {
    titles: titles.filter(
      (t) =>
        hit(t.name) ||
        hit(t.nameUr) ||
        hit(t.number) ||
        hit(t.kind) ||
        (t.genres || []).some((g) => hit(g)) ||
        hit(getAuthor(t.authorId)?.name) ||
        hit(getAuthor(t.authorId)?.nameUr) ||
        hit(t.synopsis)
    ),
    series: seriesList.filter((x) => hit(x.name) || hit(x.nameUr) || hit(x.genre)),
    people: [...authors, ...poets].filter((p) => hit(p.name) || hit(p.nameUr) || hit(p.role) || hit(p.bio))
  }
}
