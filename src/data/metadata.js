// Completing the details of something being imported.
//
// An Archive.org item (or any pasted link) often arrives half-described: a
// title and an audio file, but no year, no creator, no synopsis, and a subject
// that reads like a filing code. Rather than save a patchy entry and leave the
// operator to clean it up, this fills the gaps — from the source where the
// source has an answer, and from what the item plainly is where it does not.
//
// Nothing here overwrites a value that is already present and meaningful, so a
// well-described item passes through untouched.

const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'part', 'full', 'new', 'librivox', 'audio',
  'audiobook', 'archive', 'collection', 'librivox', 'free', 'public', 'domain',
  'complete', 'unabridged', 'version', 'vol', 'volume', 'book'
])

export function tidyText(v) {
  return String(v || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isPlaceholder(v) {
  const s = tidyText(v).toLowerCase()
  return !s || s === 'unknown' || s === 'n/a' || s === 'na' || s === 'none' || s === 'untitled'
}

// A creator field that says "various" or "unknown" is not a person we can file
// the title under, so it counts as missing.
export function usableCreator(v) {
  const s = tidyText(v)
  if (isPlaceholder(s)) return false
  if (/^(various|various artists|anonymous|librivox|unknown author)$/i.test(s)) return false
  return true
}

function titleCaseWord(w) {
  if (!w) return w
  if (w.length <= 3 && w === w.toUpperCase()) return w
  return w[0].toUpperCase() + w.slice(1).toLowerCase()
}

// "surah_al_baqarah_part_2" → "Surah Al Baqarah Part 2"
export function titleFromSlug(raw) {
  const base = String(raw || '')
    .replace(/^https?:\/\/[^/]+\/(?:details|download)\//i, '')
    // Only strip a real audio/archive extension — not any trailing word that
    // happens to be four letters long ("4.Nisa" must not lose its Nisa).
    .replace(/\.(mp3|m4a|aac|opus|ogg|oga|wav|flac|zip|pdf|txt|mp4|mkv)$/i, '')
    .replace(/[_\-.+]+/g, ' ')
    .replace(/[()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!base) return ''
  return base
    .split(' ')
    .map(titleCaseWord)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

// The words that carry the meaning of a title, for guessing what it is.
export function keywordsOf(...parts) {
  return new Set(
    parts
      .map((p) => tidyText(p).toLowerCase())
      .join(' ')
      .replace(/[^a-z0-9\u0600-\u06ff\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  )
}

const RULES = [
  // Deliberately first and deliberately broad: anything that says "Quran"
  // anywhere in its name or metadata belongs in the Quran Kareem catalogue, so
  // an operator never has to file it by hand. More specific Quran sub-genres
  // below refine the genre without moving it out of the catalogue.
  {
    id: 'quran',
    test: (kw, blob) =>
      /quran|qur['’ʻ]?an|koran|kareem|karim|surah|surat|ayah|ayat|juz|parah|recit|tilawat|tajweed/i.test(blob) ||
      kw.has('quran') || kw.has('surah') || kw.has('tilawat'),
    genre: 'Quran Kareem',
    kind: 'Quran Kareem',
    role: 'Reciter',
    synopsis: 'A recitation from the Holy Quran, added from its source recording.'
  },
  {
    id: 'quran-translation',
    test: (kw, blob) =>
      /translation|tarjuma|tarjuman|meanings?/i.test(blob) &&
      /quran|qur['’ʻ]?an|koran|surah|surat|kareem|karim/i.test(blob),
    genre: 'Urdu Translation',
    kind: 'Quran Kareem',
    role: 'Translator',
    synopsis: 'The Holy Quran with its Urdu translation, added from its source recording.'
  },
  {
    id: 'tafsir',
    test: (kw, blob) => /tafsir|tafseer|commentary|exegesis/i.test(blob),
    genre: 'Tafsir',
    kind: 'Quran Kareem',
    role: 'Scholar',
    synopsis: 'A tafsir — explanation and commentary on the Holy Quran — added from its source recording.'
  },
  {
    id: 'poetry',
    test: (kw, blob) => /poet|poem|poetry|verse|ghazal|nazm|shayari|shairi|rubai|kalam/i.test(blob),
    genre: 'Poetry',
    kind: 'Audiobook',
    role: 'Poet',
    synopsis: 'A poetry reading, added from its source recording.'
  },
  {
    id: 'comedy',
    test: (kw, blob) => /comedy|humour|humor|satire|mazah|mazaah|funny/i.test(blob),
    genre: 'Comedy',
    kind: 'Drama',
    role: 'Author',
    synopsis: 'A comedy, added from its source recording.'
  },
  {
    id: 'crime',
    test: (kw, blob) => /crime|detective|mystery|murder|jurm|jasusi|jasoos|thriller|noir/i.test(blob),
    genre: 'Crime',
    kind: 'Audio-film',
    role: 'Author',
    synopsis: 'A crime story, added from its source recording.'
  },
  {
    id: 'espionage',
    test: (kw, blob) => /spy|espionage|intelligence|agent|secret service|cipher|mukhbir/i.test(blob),
    genre: 'Espionage',
    kind: 'Audio-film',
    role: 'Author',
    synopsis: 'An espionage story, added from its source recording.'
  },
  {
    id: 'drama',
    test: (kw, blob) =>
      /drama|radio.?play|audio.?film|play|serial|theatre|theater|natak|afsaana|afsana|story/i.test(blob),
    genre: 'Drama',
    kind: 'Audio-film',
    role: 'Author',
    synopsis: 'A drama, added from its source recording.'
  }
]

// What the source is, expressed as a genre, kind, role and blurb. The first
// matching rule wins; the order above runs most-specific first, so a Quran
// translation is not swallowed by the plain Quran rule.
export function classify(item = {}) {
  const blob = [
    item.subject,
    item.genre,
    item.name,
    item.title,
    item.description,
    item.collection,
    item.creator
  ]
    .map((v) => (Array.isArray(v) ? v.join(' ') : v))
    .map(tidyText)
    .join(' ')
  const kw = keywordsOf(item.subject, item.name, item.description)

  // Most-specific first. A translation or a tafsir is also "Quran", so the
  // plain recitation rule has to come after them or it would swallow both; and
  // a "spy thriller" is an espionage story before it is a crime one.
  const order = ['quran-translation', 'tafsir', 'quran', 'poetry', 'comedy', 'espionage', 'crime', 'drama']
  for (const id of order) {
    const rule = RULES.find((r) => r.id === id)
    if (rule && rule.test(kw, blob)) return rule
  }
  return {
    id: 'general',
    genre: 'Drama',
    kind: 'Audiobook',
    role: 'Author',
    synopsis: 'An audiobook recording, added from its source.'
  }
}

// Build the finished synopsis: the source's own words when it has them, padded
// out with what the item plainly is so the field is never left empty.
export function buildSynopsis({ description, name, classification, sourceUrl }) {
  const desc = tidyText(description)
  const lead = classification?.synopsis || 'Added from its source recording.'
  if (desc.length >= 60) return desc.slice(0, 420)
  if (desc.length > 0 && name) return tidyText(`${name} — ${desc}`).slice(0, 420)
  const origin = sourceUrl ? ` Imported from ${tidyText(sourceUrl)}.` : ''
  return tidyText(`${name ? `${name} — ` : ''}${lead}${origin}`).slice(0, 420)
}

// The whole completed record. Only fields that are missing get a value; a field
// the source supplied is returned exactly as it came in.
export function completeMetadata(item = {}, form = {}) {
  const classification = classify(item)

  const name =
    tidyText(form.name) || tidyText(item.name) || tidyText(item.title) || titleFromSlug(item.identifier) || 'Untitled'

  const creator = usableCreator(form.creator)
    ? tidyText(form.creator)
    : usableCreator(item.creator)
      ? tidyText(item.creator)
      : 'Unknown'

  const kind = tidyText(form.kind) || classification.kind
  const genre = tidyText(form.genre) || classification.genre
  const role = tidyText(form.role) || classification.role

  const yearRaw = Number(form.year) || Number(item.year)
  const year = Number.isFinite(yearRaw) && yearRaw > 0 ? Math.round(yearRaw) : new Date().getFullYear()

  const genres =
    Array.isArray(form.genres) && form.genres.length
      ? form.genres
      : genre
        ? [genre]
        : [classification.genre]

  const durationRaw = Number(item.duration)
  const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? String(Math.round(durationRaw / 60) || 1) : ''

  const sourceUrl = tidyText(form.sourceUrl) || tidyText(item.sourceUrl || item.source)
  const synopsis = buildSynopsis({
    description: form.synopsis || item.description,
    name,
    classification,
    sourceUrl
  })

  return { name, creator, kind, genre, genres, role, year, duration, synopsis, classification }
}
