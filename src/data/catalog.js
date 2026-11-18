import { voices, voiceForTitle } from './voices'
import { loadStudio, resolveVoice } from './voiceStudio'
import { archiveAuthors, archiveTitles } from './generated/archiveLibrary.js'

const opus = {
  raat1: { id: 'raat-01', src: '/audio/raat-01.opus', kbps: 32 },
  raat2: { id: 'raat-02', src: '/audio/raat-02.opus', kbps: 32 },
  shehr1: { id: 'shehr-01', src: '/audio/shehr-01.opus', kbps: 40 },
  shehr2: { id: 'shehr-02', src: '/audio/shehr-02.opus', kbps: 40 },
  bandar1: { id: 'bandar-01', src: '/audio/bandar-01.opus', kbps: 32 },
  bandar2: { id: 'bandar-02', src: '/audio/bandar-02.opus', kbps: 32 },
  court1: { id: 'court-01', src: '/audio/court-01.opus', kbps: 24 },
  bagh1: { id: 'bagh-01', src: '/audio/bagh-01.opus', kbps: 48 },
  nazm1: { id: 'nazm-01', src: '/audio/nazm-01.opus', kbps: 48 },
  nazm2: { id: 'nazm-02', src: '/audio/nazm-02.opus', kbps: 48 },
  quran1: { id: 'quran-01', src: '/audio/quran-01.opus', kbps: 32 },
  quran2: { id: 'quran-urdu-01', src: '/audio/quran-urdu-01.opus', kbps: 32 },
  tafsir1: { id: 'tafsir-01', src: '/audio/tafsir-01.opus', kbps: 32 },
  radio: { id: 'radio-live', src: '/audio/radio-live.opus', kbps: 40 },
  alf1: { id: 'alf-laila-01', src: '/audio/alf-laila-01.opus', kbps: 32 },
  udaas1: { id: 'udaas-01', src: '/audio/udaas-01.opus', kbps: 32 },
  zikr1: { id: 'zikr-meer-01', src: '/audio/zikr-meer-01.opus', kbps: 32 }
}

// The seven Harry Potter parts are serial entries, not bundled audio. Each part
// gets its Archive.org link later in Add content; until then it has no episodes
// and never points at another story's audio.

const cycle = [opus.raat1, opus.raat2, opus.shehr1, opus.shehr2, opus.bandar1, opus.bandar2, opus.court1]

function ep(titleId, count, pool) {
  const list = Array.isArray(pool) ? pool : [pool]
  return Array.from({ length: count }, (_, i) => {
    const a = list[i % list.length]
    return {
      id: `${titleId}-e${i + 1}`,
      title: `قسط ${i + 1}`,
      titleEn: `Episode ${i + 1}`,
      duration: 18 + ((i * 7) % 22),
      free: i === 0,
      asset: a.id,
      audio: a.src,
      codec: 'opus',
      kbps: a.kbps,
      channels: 'mono'
    }
  })
}

export const codecInfo = {
  format: 'Opus',
  ext: '.opus',
  bitrate: '24–48 kbps',
  channels: 'Mono',
  sampleRate: '24 kHz source · Opus constant 48 kHz clock',
  fallback: 'AAC (.m4a) mono, 32–56 kbps, for older iOS / universal playback',
  profile: 'Neural speech — young British, British male/female, Pakistani male/female, young girl Pakistan',
  platforms: 'Android, Web, iOS 17+ (native), and all other Opus-capable devices'
}

export const radioStation = {
  id: 'sada-bahar',
  name: 'Sada Bahar',
  nameUr: 'صدابہار',
  tagline: 'Poetry and voices, streaming around the clock.',
  taglineUr: 'شاعری اور آوازیں، چوبیس گھنٹے۔',
  badge: 'LIVE RADIO',
  asset: opus.radio.id,
  audio: opus.radio.src,
  kbps: opus.radio.kbps,
  cover: 'aurora'
}

export const authors = [
  {
    id: 'zohra-kamal',
    name: 'Zohra Kamal',
    nameUr: 'زہرہ کمال',
    role: 'Author',
    bio: 'Architect of Raat ke Musafir. Midnight spy stories written for the ear, in the grain of classic Urdu thrillers.'
  },
  {
    id: 'haris-mehmood',
    name: 'Haris Mehmood',
    nameUr: 'حارث محمود',
    role: 'Author',
    bio: 'Crime novelist of Bandargah ki Raat. Rain, docks, and moral undertow — fully dramatised for Lumina Voice.'
  },
  {
    id: 'sabeen-idris',
    name: 'Sabeen Idris',
    nameUr: 'صبیحہ ادریس',
    role: 'Author',
    bio: 'Dramatist of Shehr-e-Khawab. Intimate stage lives, scored like chamber music in Urdu.'
  },
  {
    id: 'faraz-qureshi',
    name: 'Faraz Qureshi',
    nameUr: 'فراز قریشی',
    role: 'Author',
    bio: 'Comedy writer of Chandni Darbar. Farce, found families, and pastry diplomacy.'
  },
  {
    id: 'anjum-raza',
    name: 'Anjum Raza',
    nameUr: 'انجم رضا',
    role: 'Author',
    bio: 'Literary voice of Sheeshe ka Bagh. Quiet novels that bloom after midnight.'
  },
  {
    id: 'qari-abdul-basit',
    name: 'Qari Abdul Basit',
    nameUr: 'قاری عبدالباسط',
    role: 'Reciter',
    bio: 'Reciter for the Quran Kareem catalogue. Measured tajweed, one clear voice, nothing added.'
  },
  {
    id: 'maulana-waheed',
    name: 'Maulana Waheed',
    nameUr: 'مولانا وحید',
    role: 'Translator',
    bio: 'Translator and scholar. Reads the Arabic, then the Urdu meaning, then the commentary.'
  },
  {
    id: 'jk-rowling-urdu',
    name: 'J.K. Rowling (Urdu Adaptation)',
    nameUr: 'جی کے رولنگ (اردو تجویزی)',
    role: 'Author',
    bio: 'The Boy Who Lived, told in Urdu. Hogwarts, magic, and friendship — dramatised for the ear.'
  },
  ...archiveAuthors
]

export const poets = [
  {
    id: 'mehrunnisa',
    name: 'Mehrunnisa Haider',
    nameUr: 'مہرالنساء حیدر',
    role: 'Poet',
    bio: 'Lyric poet of lanterns, rivers, and the unsaid. Recited nightly on Sada Bahar.'
  },
  {
    id: 'qasim-noor',
    name: 'Qasim Noor',
    nameUr: 'قاسم نور',
    role: 'Poet',
    bio: 'Modern verse on cities that never fully sleep. Sparse lines, long echoes.'
  },
  {
    id: 'laila-rehman',
    name: 'Laila Rehman',
    nameUr: 'لیلٰی رحمان',
    role: 'Poet',
    bio: 'Ghazal-inspired cycles. Love as weather, time as a locked room.'
  }
]

export const seriesList = [
  {
    id: 'raat-ke-musafir',
    name: 'Raat ke Musafir',
    nameUr: 'رات کے مسافر',
    authorId: 'zohra-kamal',
    genre: 'Espionage',
    blurb: 'A courier, a sealed envelope, and a network that never uses the same name twice.',
    books: 7,
    episodes: 42
  },
  {
    id: 'shehr-e-khawab',
    name: 'Shehr-e-Khawab',
    nameUr: 'شہرِ خواب',
    authorId: 'sabeen-idris',
    genre: 'Drama',
    blurb: 'A repertory theatre, a stolen season, and lives rewritten between acts.',
    books: 5,
    episodes: 30
  },
  {
    id: 'bandargah',
    name: 'Bandargah ki Raat',
    nameUr: 'بندرگاہ کی رات',
    authorId: 'haris-mehmood',
    genre: 'Crime',
    blurb: 'Detectives on a coastal city where the tide brings secrets back.',
    books: 6,
    episodes: 36
  },
  {
    id: 'chandni-darbar',
    name: 'Chandni Darbar',
    nameUr: 'چاندنی دربار',
    authorId: 'faraz-qureshi',
    genre: 'Comedy',
    blurb: 'A royal court that runs on gossip, pastry, and accidental diplomacy.',
    books: 4,
    episodes: 24
  },
  {
    id: 'harry-potter',
    name: 'Harry Potter Serial',
    nameUr: 'ہیری پوٹر سیریل',
    authorId: 'jk-rowling-urdu',
    genre: 'Adventure / fantasy',
    blurb: 'The Boy Who Lived, told in Urdu. All seven parts, filed as a serial — each part gets its own Archive.org audio link in Add content.',
    books: 7,
    episodes: 0
  }
]

// Serial scaffold: seven parts, each with its own Archive.org link to be added
// later. Empty episodes keep them out of playback until real audio exists.
function hpPart(n, name, nameUr, year, cover, synopsis) {
  return {
    id: `hp-${String(n).padStart(2, '0')}`,
    number: `HP-${String(n).padStart(3, '0')}`,
    name,
    nameUr,
    seriesId: 'harry-potter',
    voiceId: 'pk-girl',
    authorId: 'jk-rowling-urdu',
    genres: ['Adventure / fantasy'],
    kind: 'Audiobook',
    featured: false,
    top: false,
    year,
    cover,
    synopsis: `Part ${n} of 7. ${synopsis} Audio link to be added from Archive.org.`,
    episodes: []
  }
}

export const titles = [
  {
    id: 'selected-ghazals-of-ghalib',
    number: 'PO-001',
    name: 'Selected Ghazals of Ghalib',
    nameUr: 'منتخب غزلیاتِ غالب',
    seriesId: null,
    voiceId: 'pk-male',
    authorId: 'mirza-ghalib',
    genres: ['Poetry'],
    kind: 'Ghazals',
    featured: true,
    top: false,
    year: 2008,
    coverUrl: 'https://www.archive.org/download/LibrivoxCdCoverArt14/Selected_Ghazals_Ghalib_1201.jpg',
    cover: 'solen',
    synopsis: 'Selected ghazals of Mirza Asadullah Khan Ghalib (1797–1869), read from Deewan-e-Ghalib, Nuskha-e-Hamida (1828). Recorded by LibriVox volunteers. Public domain.',
    sourceUrl: 'https://librivox.org/selected-ghazals-of-ghalib-by-mirza-ghalib/',
    episodes: [
    {
      id: 'ghalib-e1',
      title: 'آہ کو چاہیے',
      titleEn: 'Aahko Chaahyea',
      duration: 1 + Math.floor(Math.random()*2),
      free: true,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aahkochaahyea_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aahkochaahyea_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e2',
      title: 'عاشق',
      titleEn: 'Aashiq',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aashiq_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aashiq_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e3',
      title: 'عین کیوں',
      titleEn: 'Aeinakyun',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aeinakyun_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aeinakyun_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e4',
      title: 'باغ تجھ بن',
      titleEn: 'Bagh Tujhbin',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/baghtujhbin_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/baghtujhbin_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e5',
      title: 'بستے جز',
      titleEn: 'Bisateijz',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/bisateijz_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/bisateijz_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e6',
      title: 'چاہیے چون',
      titleEn: 'Chahiyeachon',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/chahiyeachon_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/chahiyeachon_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e7',
      title: 'دامن دل',
      titleEn: 'Damanedil',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/damanedil_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/damanedil_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e8',
      title: 'درد سے',
      titleEn: 'Dardsay',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/dardsay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/dardsay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e9',
      title: 'دہر من',
      titleEn: 'Deherman',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/deherman_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/deherman_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e10',
      title: 'دل ہی نہیں',
      titleEn: 'Dil Hi Naheen',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/dilhinaheen_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/dilhinaheen_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e11',
      title: 'دیا یاروں نے',
      titleEn: 'Dya Yaron Nay',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/dyayaronnay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/dyayaronnay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e12',
      title: 'گرخمشیں',
      titleEn: 'Garkhamshi',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/garkhamshi_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/garkhamshi_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e13',
      title: 'غنچہ',
      titleEn: 'Ghuncha',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/ghuncha_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/ghuncha_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e14',
      title: 'عشق سے',
      titleEn: 'Ishiq Say',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/ishiqsay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/ishiqsay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e15',
      title: 'جب قریب',
      titleEn: 'Jab Taqreeb',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/jabbataqreeb_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/jabbataqreeb_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e16',
      title: 'جب تک دہن',
      titleEn: 'Jab Tak Dahan',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/jabtakdahan_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/jabtakdahan_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e17',
      title: 'جہاں ترا',
      titleEn: 'Jahan Tera',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/jehantera_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/jehantera_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e18',
      title: 'کبھی نہ کی',
      titleEn: 'Kabhi Na Ki',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kabhinaki_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kabhinaki_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e19',
      title: 'کارخانوں سے',
      titleEn: 'Karkhanay Say',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/karkhanaysay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/karkhanaysay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e20',
      title: 'کہتے ہو',
      titleEn: 'Kehtay Ho',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kehtayho_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kehtayho_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e21',
      title: 'کوہ کے',
      titleEn: 'Koh Kay',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kohkay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kohkay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e22',
      title: 'کیا تنگ ہم',
      titleEn: 'Kya Tang Hum',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kyatanghum_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/kyatanghum_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e23',
      title: 'مسجد کے',
      titleEn: 'Masjid Kay',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/masjidkay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/masjidkay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e24',
      title: 'مدت ہوئی ہے',
      titleEn: 'Mudath Uihey',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/mudathuihey_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/mudathuihey_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e25',
      title: 'نہ گلیں غم',
      titleEn: 'Na Gulen Ghama',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/nagulenghma_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/nagulenghma_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e26',
      title: 'نقش فریادی',
      titleEn: 'Naqsh Faryadi',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/naqshfryadi_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/naqshfryadi_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e27',
      title: 'پاؤں میں',
      titleEn: 'Paon May',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/paonmay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/paonmay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e28',
      title: 'پھر مجھے',
      titleEn: 'Pher Mujhay',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/phermujhay_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/phermujhay_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e29',
      title: 'پھر کچھ اس دل',
      titleEn: 'Phir Kuch Is Dil',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/phirkuchisdil_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/phirkuchisdil_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e30',
      title: 'صفحات حیرت',
      titleEn: 'Safay Hayrate',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/safayhayrate_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/safayhayrate_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e31',
      title: 'سرگذشتگی',
      titleEn: 'Sar Guzashtagi',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/sergushtagi_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/sergushtagi_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e32',
      title: 'شوخ رنگ',
      titleEn: 'Shokh Errang',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/shokherrang_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/shokherrang_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e33',
      title: 'ورستہ',
      titleEn: 'Warsta',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/warsta_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/warsta_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e34',
      title: 'وحشت',
      titleEn: 'Washat',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/washat_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/washat_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    },
    {
      id: 'ghalib-e35',
      title: 'وہ آئے خواب',
      titleEn: 'Wo Akay Khwab',
      duration: 1 + Math.floor(Math.random()*2),
      free: false,
      src: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/woakaykhab_ghalib_64kb.mp3',
      audio: 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/woakaykhab_ghalib_64kb.mp3',
      codec: 'mp3',
      kbps: 64,
      channels: 'mono'
    }
    ]
  },

  {
    id: 'raat-02',
    number: '002',
    name: 'Hotel Meridian',
    nameUr: 'ہوٹل مریدیان',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage'],
    kind: 'Audio-film',
    featured: true,
    top: true,
    year: 2024,
    cover: 'cipher2',
    synopsis: 'A midnight summit in a hotel that never appears on maps. Every guest is someone else. The quiet table is the true one.',
    episodes: ep('raat-02', 6, [opus.raat2, opus.raat1])
  },
  {
    id: 'raat-03',
    number: '003',
    name: 'Sheesha Passport',
    nameUr: 'شیشہ پاسپورٹ',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage', 'Crime'],
    kind: 'Audio-film',
    featured: false,
    top: true,
    year: 2025,
    cover: 'cipher3',
    synopsis: 'Forged identities shatter. Zeib must become the one person the network cannot erase.',
    episodes: ep('raat-03', 6, cycle)
  },
  {
    id: 'raat-04',
    number: '004',
    name: 'Barah Qasid',
    nameUr: 'بارہ قاصد',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2025,
    cover: 'cipher4',
    synopsis: 'Twelve couriers. One hour. A city that listens through the rain.',
    episodes: ep('raat-04', 6, cycle)
  },
  {
    id: 'raat-05',
    number: '005',
    name: 'Aakhri Frequency',
    nameUr: 'آخری فریکوئنسی',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage', 'Drama'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2025,
    cover: 'cipher5',
    synopsis: 'A pirate radio signal carries the cipher. Listening may be fatal. Silence is worse.',
    episodes: ep('raat-05', 6, cycle)
  },
  {
    id: 'raat-06',
    number: '006',
    name: 'Haathi ka Hisaab',
    nameUr: 'ہاتھی کا حساب',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2026,
    cover: 'cipher6',
    synopsis: 'Accounts of vanished agents, written in a ledger that updates itself.',
    episodes: ep('raat-06', 6, cycle)
  },
  {
    id: 'raat-07',
    number: '007',
    name: 'Raakh ka Pul',
    nameUr: 'راکھ کا پل',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage', 'Drama'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2026,
    cover: 'cipher7',
    synopsis: 'A crossing between two cities that officially do not share a border.',
    episodes: ep('raat-07', 6, cycle)
  },
  {
    id: 'raat-08',
    number: '008',
    name: 'Taj-e-Static',
    nameUr: 'تاجِ سٹیٹک',
    seriesId: 'raat-ke-musafir',
    voiceId: 'pk-male',
    authorId: 'zohra-kamal',
    genres: ['Espionage'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2026,
    cover: 'cipher8',
    synopsis: 'The network names a successor. Zeib hears her own voice on the other end.',
    episodes: ep('raat-08', 6, cycle)
  },
  {
    id: 'bandar-01',
    number: '001',
    name: 'Namak ki Taar',
    nameUr: 'نمک کی تار',
    seriesId: 'bandargah',
    voiceId: 'pk-male',
    authorId: 'haris-mehmood',
    genres: ['Crime', 'Drama'],
    kind: 'Audio-film',
    featured: true,
    top: true,
    year: 2024,
    cover: 'harbor1',
    synopsis: 'Inspector Waseem finds a body the tide was not supposed to return. The radio on the pier is still talking.',
    episodes: ep('bandar-01', 6, [opus.bandar1, opus.bandar2])
  },
  {
    id: 'bandar-02',
    number: '002',
    name: 'Lalteen ka Kamra',
    nameUr: 'لالٹین کا کمرہ',
    seriesId: 'bandargah',
    voiceId: 'pk-male',
    authorId: 'haris-mehmood',
    genres: ['Crime'],
    kind: 'Audio-film',
    featured: true,
    top: true,
    year: 2024,
    cover: 'harbor2',
    synopsis: 'A boarding house of sailors and liars. One window never goes dark.',
    episodes: ep('bandar-02', 6, [opus.bandar2, opus.bandar1])
  },
  {
    id: 'bandar-03',
    number: '003',
    name: 'Siyah Pani',
    nameUr: 'سیاہ پانی',
    seriesId: 'bandargah',
    voiceId: 'pk-male',
    authorId: 'haris-mehmood',
    genres: ['Crime'],
    kind: 'Audio-film',
    featured: false,
    top: true,
    year: 2025,
    cover: 'harbor3',
    synopsis: 'Dock unions, missing cargo, and a handshake that costs a life.',
    episodes: ep('bandar-03', 6, [opus.bandar1, opus.bandar2])
  },
  {
    id: 'bandar-04',
    number: '004',
    name: 'Dhund ki Saza',
    nameUr: 'دھند کی سزا',
    seriesId: 'bandargah',
    voiceId: 'pk-male',
    authorId: 'haris-mehmood',
    genres: ['Crime', 'Comedy'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2025,
    cover: 'harbor4',
    synopsis: 'Everyone heard the foghorn. No one agrees on the time.',
    episodes: ep('bandar-04', 6, [opus.bandar2])
  },
  {
    id: 'bandar-05',
    number: '005',
    name: 'Ghaat ki Bewa',
    nameUr: 'گھاٹ کی بیوہ',
    seriesId: 'bandargah',
    voiceId: 'pk-male',
    authorId: 'haris-mehmood',
    genres: ['Crime', 'Drama'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2026,
    cover: 'harbor5',
    synopsis: 'A confession arrives by bottle. The handwriting belongs to a dead man.',
    episodes: ep('bandar-05', 6, [opus.bandar1])
  },
  {
    id: 'bandar-06',
    number: '006',
    name: 'Khamosh Minar',
    nameUr: 'خاموش مینار',
    seriesId: 'bandargah',
    voiceId: 'pk-male',
    authorId: 'haris-mehmood',
    genres: ['Crime'],
    kind: 'Audio-film',
    featured: false,
    top: false,
    year: 2026,
    cover: 'harbor6',
    synopsis: 'The lighthouse keeper left. The light still turns. Someone is living in the dark between flashes.',
    episodes: ep('bandar-06', 6, [opus.bandar2])
  },
  {
    id: 'shehr-01',
    number: '001',
    name: 'Surkh Overture',
    nameUr: 'سرخ اوورچر',
    seriesId: 'shehr-e-khawab',
    voiceId: 'pk-female',
    authorId: 'sabeen-idris',
    genres: ['Drama'],
    kind: 'Drama',
    featured: true,
    top: true,
    year: 2024,
    cover: 'velvet1',
    synopsis: 'Opening night in Lahore, a missing lead, and an understudy who knows too many lines.',
    episodes: ep('shehr-01', 6, [opus.shehr1, opus.shehr2])
  },
  {
    id: 'shehr-02',
    number: '002',
    name: 'Prompt Box',
    nameUr: 'پرامپٹ باکس',
    seriesId: 'shehr-e-khawab',
    voiceId: 'pk-female',
    authorId: 'sabeen-idris',
    genres: ['Drama', 'Crime'],
    kind: 'Drama',
    featured: false,
    top: true,
    year: 2025,
    cover: 'velvet2',
    synopsis: 'Whispers from below the stage rewrite the play as it happens.',
    episodes: ep('shehr-02', 6, [opus.shehr2, opus.shehr1])
  },
  {
    id: 'shehr-03',
    number: '003',
    name: 'Waqfa',
    nameUr: 'وقفہ',
    seriesId: 'shehr-e-khawab',
    voiceId: 'pk-female',
    authorId: 'sabeen-idris',
    genres: ['Drama'],
    kind: 'Drama',
    featured: false,
    top: false,
    year: 2025,
    cover: 'velvet3',
    synopsis: 'Twenty minutes. Three affairs. One letter that should never have been opened.',
    episodes: ep('shehr-03', 6, [opus.shehr1])
  },
  {
    id: 'shehr-04',
    number: '004',
    name: 'Bhoot ka Chiragh',
    nameUr: 'بھوت کا چراغ',
    seriesId: 'shehr-e-khawab',
    voiceId: 'pk-female',
    authorId: 'sabeen-idris',
    genres: ['Drama'],
    kind: 'Drama',
    featured: false,
    top: false,
    year: 2026,
    cover: 'velvet4',
    synopsis: 'The theatre keeps one lamp burning. Tonight it speaks.',
    episodes: ep('shehr-04', 6, [opus.shehr2])
  },
  {
    id: 'shehr-05',
    number: '005',
    name: 'Parda',
    nameUr: 'پردہ',
    seriesId: 'shehr-e-khawab',
    voiceId: 'pk-female',
    authorId: 'sabeen-idris',
    genres: ['Drama'],
    kind: 'Drama',
    featured: false,
    top: false,
    year: 2026,
    cover: 'velvet5',
    synopsis: 'The company takes a bow for a play they never performed.',
    episodes: ep('shehr-05', 6, [opus.shehr1])
  },
  {
    id: 'moon-01',
    number: '001',
    name: 'Ghalat Fanfare',
    nameUr: 'غلط فینفیئر',
    seriesId: 'chandni-darbar',
    voiceId: 'pk-male',
    authorId: 'faraz-qureshi',
    genres: ['Comedy'],
    kind: 'Drama',
    featured: true,
    top: true,
    year: 2024,
    cover: 'moon1',
    synopsis: 'A visiting duke is actually a pastry chef. The court decides this is fine, mostly.',
    episodes: ep('moon-01', 6, [opus.court1, opus.shehr2])
  },
  {
    id: 'moon-02',
    number: '002',
    name: 'Meethe ka Muahida',
    nameUr: 'میٹھے کا معاہدہ',
    seriesId: 'chandni-darbar',
    voiceId: 'pk-male',
    authorId: 'faraz-qureshi',
    genres: ['Comedy'],
    kind: 'Drama',
    featured: false,
    top: true,
    year: 2025,
    cover: 'moon2',
    synopsis: 'Peace depends on a dessert. War depends on who ate the last slice.',
    episodes: ep('moon-02', 6, [opus.court1])
  },
  {
    id: 'moon-03',
    number: '003',
    name: 'Jesteron ki Jila-watani',
    nameUr: 'جسٹروں کی جلاوطنی',
    seriesId: 'chandni-darbar',
    voiceId: 'pk-male',
    authorId: 'faraz-qureshi',
    genres: ['Comedy', 'Drama'],
    kind: 'Drama',
    featured: false,
    top: false,
    year: 2025,
    cover: 'moon3',
    synopsis: 'Banished comics form a government. It is somehow more competent.',
    episodes: ep('moon-03', 6, [opus.court1])
  },
  {
    id: 'moon-04',
    number: '004',
    name: 'Aainon ka Raqs',
    nameUr: 'آئینوں کا رقص',
    seriesId: 'chandni-darbar',
    voiceId: 'pk-male',
    authorId: 'faraz-qureshi',
    genres: ['Comedy'],
    kind: 'Drama',
    featured: false,
    top: false,
    year: 2026,
    cover: 'moon4',
    synopsis: 'Everyone comes as someone else. Two people come as themselves. Chaos.',
    episodes: ep('moon-04', 6, [opus.court1])
  },
  {
    id: 'bagh-01',
    voiceId: 'pk-female',
    number: '001',
    name: 'Sheeshe ka Bagh',
    nameUr: 'شیشے کا باغ',
    seriesId: null,
    authorId: 'anjum-raza',
    genres: ['Drama'],
    kind: 'Audiobook',
    featured: true,
    top: false,
    year: 2025,
    cover: 'orchard',
    synopsis: 'A botanist inherits a greenhouse of trees that remember the people who planted them. The leaves whisper in Urdu.',
    episodes: ep('bagh-01', 8, [opus.bagh1, opus.nazm1])
  },
  {
    id: 'nazm-01',
    voiceId: 'pk-girl',
    number: '',
    name: 'Lalteen ki Nazmein',
    nameUr: 'لالٹین کی نظمیں',
    seriesId: null,
    authorId: 'mehrunnisa',
    genres: ['Poetry'],
    kind: 'Audiobook',
    featured: false,
    top: false,
    year: 2024,
    cover: 'solen',
    synopsis: 'Collected recitations: rivers, unfinished letters, rooms lit by one lamp.',
    episodes: ep('nazm-01', 5, [opus.nazm1, opus.nazm2])
  },
  {
    id: 'nazm-02',
    voiceId: 'pk-male',
    number: '',
    name: 'Be-ghari Shahar',
    nameUr: 'بے گھڑی شہر',
    seriesId: null,
    authorId: 'qasim-noor',
    genres: ['Poetry'],
    kind: 'Audiobook',
    featured: false,
    top: false,
    year: 2025,
    cover: 'bryn',
    synopsis: 'Poems for trains, rooftops, and the hour between stations.',
    episodes: ep('nazm-02', 5, [opus.nazm2, opus.nazm1])
  },
  {
    id: 'nazm-03',
    voiceId: 'pk-girl',
    number: '',
    name: 'Mausam ke Kamre',
    nameUr: 'موسم کے کمرے',
    seriesId: null,
    authorId: 'laila-rehman',
    genres: ['Poetry', 'Drama'],
    kind: 'Audiobook',
    featured: false,
    top: false,
    year: 2026,
    cover: 'noor',
    synopsis: 'A cycle of ghazals for those who wait, and those who do not.',
    episodes: ep('nazm-03', 5, [opus.nazm1])
  },

  // ---- Quran Kareem -------------------------------------------------------
  // The Quran shelf is its own catalogue: recitation, then the Urdu
  // translation, then tafsir — the three genres the Quran Kareem catalogue
  // files under, so the shelf and the rotation block agree.
  {
    id: 'quran-01',
    number: 'QK-001',
    name: 'Surah Yaseen',
    nameUr: 'سورہ یٰسین',
    seriesId: null,
    voiceId: 'pk-male',
    authorId: 'qari-abdul-basit',
    genres: ['Quran Kareem', 'Tilawat'],
    kind: 'Quran Kareem',
    featured: true,
    top: true,
    year: 2024,
    cover: 'quran1',
    synopsis:
      'The heart of the Quran, recited in full with measured tajweed — clear single-voice tilawat for quiet listening.',
    episodes: ep('quran-01', 4, [opus.quran1])
  },
  {
    id: 'quran-urdu-01',
    number: 'QK-002',
    name: 'Holy Quran Urdu Translation',
    nameUr: 'قرآن کریم اردو ترجمہ',
    seriesId: null,
    voiceId: 'pk-male',
    authorId: 'maulana-waheed',
    genres: ['Quran Kareem', 'Urdu Translation'],
    kind: 'Quran Kareem',
    featured: true,
    top: false,
    year: 2025,
    cover: 'quran2',
    synopsis:
      'Verse by verse: the Arabic read aloud, then its Urdu translation, so the meaning follows the recitation.',
    episodes: ep('quran-urdu-01', 5, [opus.quran2])
  },
  {
    id: 'tafsir-01',
    number: 'QK-003',
    name: 'Tafsir — Surah An-Nisa',
    nameUr: 'تفسیر سورہ النساء',
    seriesId: null,
    voiceId: 'pk-male',
    authorId: 'maulana-waheed',
    genres: ['Quran Kareem', 'Tafsir'],
    kind: 'Quran Kareem',
    featured: false,
    top: false,
    year: 2025,
    cover: 'quran3',
    synopsis:
      'A scholar walks through Surah An-Nisa in plain Urdu — context, meaning, and what each passage asks of the listener.',
    episodes: ep('tafsir-01', 4, [opus.tafsir1])
  },
  hpPart(1, "Harry Potter and the Philosopher's Stone", 'ہیری پوٹر اور فیلوسفر کا پتھر', 1997, 'velvet1', 'An orphan discovers he is a wizard and begins at Hogwarts.'),
  hpPart(2, 'Harry Potter and the Chamber of Secrets', 'ہیری پوٹر اور رازوں کا کمرہ', 1998, 'velvet2', 'A hidden chamber opens and old secrets return.'),
  hpPart(3, 'Harry Potter and the Prisoner of Azkaban', 'ہیری پوٹر اور ازکابان کا قیدی', 1999, 'moon1', 'An escaped prisoner shadows Harry through his third year.'),
  hpPart(4, 'Harry Potter and the Goblet of Fire', 'ہیری پوٹر اور آگ کا پیالہ', 2000, 'orchard', 'The Triwizard Tournament draws Harry into a darker contest.'),
  hpPart(5, 'Harry Potter and the Order of the Phoenix', 'ہیری پوٹر اور فینکس کا حکم', 2003, 'bryn', 'A secret order forms against a rising threat.'),
  hpPart(6, 'Harry Potter and the Half-Blood Prince', 'ہیری پوٹر اور نیم خونی شہزادہ', 2005, 'noor', 'A mysterious textbook changes Harry’s lessons.'),
  hpPart(7, 'Harry Potter and the Deathly Hallows', 'ہیری پوٹر اور موت کے تحفے', 2007, 'cipher3', 'The final journey to end the darkness.'),
  ...archiveTitles
]

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

// The main catalogues an operator files content under. Each maps to a broadcast
// category id, so a newly added title drops into the right rotation block
// without a second decision.
//
// `parent` marks a catalogue that is filed *inside* another one — the Urdu
// translation is a named entry under Quran Kareem, not a top-level block, so it
// shares the `quran` broadcast category and appears nested in the picker.
export const catalogues = [
  {
    id: 'drama',
    label: 'Drama & Fiction',
    category: 'drama',
    genres: ['Drama', 'Crime', 'Espionage', 'Comedy'],
    kinds: ['Audio-film', 'Drama']
  },
  { id: 'poetry', label: 'Poetry & Ghazals', category: 'poetry', genres: ['Poetry'], kinds: ['Audiobook', 'Ghazals'] },
  { id: 'ghazals', label: 'Ghazals', category: 'poetry', genres: ['Poetry'], kinds: ['Ghazals'] },
  {
    id: 'quran',
    label: 'Quran Kareem',
    category: 'quran',
    // Every Quran genre files here — recitation, Urdu translation and tafsir
    // all sit in the one Quran Kareem catalogue.
    genres: ['Quran Kareem', 'Tilawat', 'Urdu Translation', 'Tafsir'],
    kinds: ['Quran Kareem']
  },
  { id: 'audiobook', label: 'Audiobooks', category: 'audiobook', genres: ['Drama'], kinds: ['Audiobook'] }
]

export const getCatalogue = (id) => catalogues.find((c) => c.id === id)

// Which catalogue a title belongs to, inferred from what it already carries.
export function catalogueForTitle(t) {
  if (!t) return 'drama'
  const g = (t.genres || []).map((x) => String(x).toLowerCase())
  const quran = g.includes('quran kareem') || t.kind === 'Quran Kareem' || /quran|qur['’ʻ]?an|koran/i.test(t.name || '')
  if (quran) return 'quran'
  if (g.length === 1 && g[0] === 'poetry') return 'poetry'
  if (t.kind === 'Ghazals') return 'poetry'
  if (t.kind === 'Audiobook' && !g.includes('drama')) return 'audiobook'
  return 'drama'
}

export const hero = {
  titleId: 'raat-02',
  kicker: 'Featured audio-film',
  line: 'Dive into a world where sound takes center stage. Close your eyes. The story begins.'
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
  return titles.filter((t) => t.genres.includes(genre))
}

export function titlesByKind(kind) {
  return titles.filter((t) => t.kind === kind)
}

export function searchCatalog(q) {
  const s = q.trim().toLowerCase()
  if (!s) return { titles: [], series: [], people: [] }
  const hit = (v) => (v || '').toLowerCase().includes(s)
  const voiceHit = (t) => {
    const v = resolveVoice(t, loadStudio()) || voiceForTitle(t)
    return v && (hit(v.name) || hit(v.nameUr) || hit(v.label) || hit(v.role))
  }
  return {
    titles: titles.filter(
      (t) =>
        hit(t.name) ||
        hit(t.nameUr) ||
        t.number.includes(s) ||
        hit(t.kind) ||
        t.genres.some((g) => hit(g)) ||
        voiceHit(t)
    ),
    series: seriesList.filter((x) => hit(x.name) || hit(x.nameUr) || hit(x.genre)),
    people: [
      ...[...authors, ...poets].filter((p) => hit(p.name) || hit(p.nameUr) || hit(p.role)),
      ...voices.filter((v) => hit(v.name) || hit(v.nameUr) || hit(v.label) || hit(v.role) || hit(v.bio)).map((v) => ({
        ...v,
        kind: 'voice'
      }))
    ]
  }
}
