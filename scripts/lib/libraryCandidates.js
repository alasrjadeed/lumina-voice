// Pure helpers for the 100-title Archive.org library update.
// No browser APIs, no network, no dependencies — safe for Node scripts and Vitest.

export const SOURCE_POLICY = 'Internet Archive only'

export const TARGET_CATEGORIES = Object.freeze([
  { id: 'horror', label: 'Horror / supernatural', target: 30 },
  { id: 'mystery', label: 'Mystery / detective', target: 20 },
  { id: 'short-stories', label: 'Urdu short stories', target: 20 },
  { id: 'classic', label: 'Classic novels', target: 15 },
  { id: 'adventure', label: 'Adventure / fantasy', target: 10 },
  { id: 'children', label: "Children's stories", target: 5 }
])

export const TARGET_LABELS = TARGET_CATEGORIES.map((c) => c.label)

const CATEGORY_PATTERNS = [
  { label: "Children's stories", re: /children|fairy\s*tale/i },
  { label: 'Horror / supernatural', re: /horror|ghost|gothic|supernatural|paranormal|vampire|cosmic/i },
  { label: 'Adventure / fantasy', re: /adventure|fantasy|epic|mythology|science\s*fiction|speculative/i },
  { label: 'Mystery / detective', re: /detective|mystery|suspense|investigative/i },
  { label: 'Urdu short stories', re: /short\s*stor|stories|story|allegory|satire|comedy/i },
  { label: 'Classic novels', re: /classic|novel|tragedy|historical|philosophy|history|dystopian/i }
]

export function normaliseCategory(rawCategory) {
  const value = String(rawCategory || '')
  for (const { label, re } of CATEGORY_PATTERNS) {
    if (re.test(value)) return label
  }
  return 'Classic novels'
}

export function normaliseAuthor(rawAuthor) {
  return String(rawAuthor || '')
    .replace(/\s*\((?:reported|verify)[^)]*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseDuration(rawDuration) {
  const parts = String(rawDuration || '')
    .trim()
    .split(':')
    .map((part) => Number(part))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

export function suggestedAssetId(id) {
  return `archive/${String(id || '').toLowerCase()}`
}

export function eligibleForVerification(record) {
  return !!record && record.status === 'candidate' && !record.excludeFromVerification
}

// The supplied candidate list has two rows sharing a title/author and a
// repeated source id. Replacements are separate leads from Archive.org; the
// immutable source copy is never edited.
export function applyReplacements(records, replacements = []) {
  const source = Array.isArray(records) ? [...records] : []
  const seen = new Map()
  const duplicateIds = new Set()
  const duplicateRows = new Set()

  source.forEach((record, index) => {
    const key = `${String(record?.title || '').trim().toLowerCase()}|${String(record?.author || '').trim().toLowerCase()}`
    if (seen.has(key)) {
      duplicateIds.add(String(record?.id || '').trim())
      duplicateRows.add(index)
    } else {
      seen.set(key, String(record?.id || '').trim())
    }
  })

  const applied = []
  const result = source.map((record, index) => {
    if (!duplicateRows.has(index)) return record
    const id = String(record?.id || '').trim()
    const replacement = (Array.isArray(replacements) ? replacements : []).find(
      (item) => String(item?.replacesSourceId || '').trim() === id
    )
    if (!replacement?.record) return record
    applied.push(id)
    return replacement.record
  })

  return { records: result, duplicateIds: [...duplicateIds], applied }
}

export function normaliseCandidates(records) {
  const seenTitles = new Map()

  return (Array.isArray(records) ? records : []).map((raw, index) => {
    const id = `URD-AUD-${String(index + 1).padStart(3, '0')}`
    const title = String(raw.title || '').trim()
    const author = normaliseAuthor(raw.author)
    const dedupeKey = `${title.toLowerCase()}|${author.toLowerCase()}`
    const duplicateOf = seenTitles.get(dedupeKey) || ''
    if (!duplicateOf) seenTitles.set(dedupeKey, id)

    return {
      id,
      sourceId: String(raw.id || '').trim(),
      title,
      urduTitle: String(raw.urdu_title || '').trim(),
      author,
      reported: {
        category: String(raw.category || '').trim(),
        language: String(raw.language || '').trim(),
        narrator: String(raw.narrator || '').trim(),
        duration: String(raw.duration || '').trim(),
        durationSeconds: parseDuration(raw.duration),
        sourceIndexUrl: String(raw.source_index_url || '').trim(),
        notes: String(raw.notes || '').trim()
      },
      category: {
        suggested: normaliseCategory(raw.category),
        source: 'heuristic',
        confirmed: false
      },
      language: '',
      narrator: '',
      durationSeconds: null,
      archiveItemUrl: '',
      directMp3Url: '',
      coverUrl: '',
      archiveSearchUrl: String(raw.archive_search_url || '').trim(),
      verification: {
        playback: 'unverified',
        download: 'unverified',
        rights: {
          status: 'unknown',
          licenseUrl: '',
          attribution: '',
          source: '',
          verifiedAt: ''
        },
        checkedAt: '',
        checkedBy: '',
        reasons: []
      },
      status: duplicateOf ? 'duplicate' : 'candidate',
      duplicateOf,
      excludeFromVerification: !!duplicateOf,
      replacementNeeded: !!duplicateOf
    }
  })
}

export function summariseTargets(records, targets = TARGET_CATEGORIES) {
  const candidates = (Array.isArray(records) ? records : []).filter(eligibleForVerification)
  return targets.map(({ id, label, target }) => ({
    id,
    label,
    target,
    candidates: candidates.filter((r) => r.category?.suggested === label).length,
    confirmed: candidates.filter((r) => r.category?.suggested === label && r.category?.confirmed).length,
    published: 0
  }))
}
