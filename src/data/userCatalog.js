const KEY = 'lumina-user-catalog-v1'

export function emptyUserCatalog() {
  return { titles: [], authors: [], poets: [], overrides: {}, genres: [] }
}

// Genres an operator added by hand. Kept beside the bundled list so a studio
// can file content under its own shelves without a code change; the bundled
// names are never rewritten, only extended.
export function sanitiseGenreName(name) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

export function sanitiseGenreList(list) {
  const seen = new Set()
  const out = []
  for (const raw of Array.isArray(list) ? list : []) {
    const name = sanitiseGenreName(raw)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export function loadUserCatalog() {
  try {
    if (typeof localStorage === 'undefined') return emptyUserCatalog()
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyUserCatalog()
    const parsed = JSON.parse(raw)
    return {
      titles: Array.isArray(parsed.titles) ? parsed.titles : [],
      authors: Array.isArray(parsed.authors) ? parsed.authors : [],
      poets: Array.isArray(parsed.poets) ? parsed.poets : [],
      overrides:
        parsed.overrides && typeof parsed.overrides === 'object' && !Array.isArray(parsed.overrides)
          ? parsed.overrides
          : {},
      genres: sanitiseGenreList(parsed.genres)
    }
  } catch {
    return emptyUserCatalog()
  }
}

export function saveUserCatalog(next) {
  const clean = {
    titles: next.titles || [],
    authors: next.authors || [],
    poets: next.poets || [],
    overrides: next.overrides && typeof next.overrides === 'object' ? next.overrides : {},
    genres: sanitiseGenreList(next.genres)
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(clean))
  } catch {
    /* quota */
  }
  return clean
}

// Fields an operator may rewrite on ANY title — bundled catalogue entries
// included, since a studio editor should not be blocked by where a title
// originally came from. `id`, assets and audio sources are deliberately
// excluded: no UI path may detach a title from its audio.
export const EDITABLE_TITLE_FIELDS = [
  'number',
  'name',
  'nameUr',
  'kind',
  'year',
  'genres',
  'authorId',
  'seriesId',
  'synopsis',
  'featured',
  'top',
  'cover',
  'coverUrl',
  'color',
  'source',
  'sourceUrl'
]

// Per-episode fields. Enough to relabel, re-time, and illustrate a part without
// touching which asset or audio file it plays.
export const EDITABLE_EPISODE_FIELDS = ['title', 'titleEn', 'duration', 'free', 'imageUrl']

// Fields carried through untouched when an episode is patched. These are the
// parts that define *what plays* — never editable, never dropped.
export const EPISODE_PASSTHROUGH_FIELDS = [
  'id',
  'asset',
  'audio',
  'codec',
  'kbps',
  'channels',
  'src',
  'fileId',
  'size',
  'mime'
]

// Rebuild one episode from its whitelisted fields, so an edit can never smuggle
// arbitrary keys into storage or detach the episode from its audio.
export function sanitiseEpisode(ep, index = 0) {
  const src = ep || {}
  const out = {}
  for (const key of EPISODE_PASSTHROUGH_FIELDS) {
    if (key in src) out[key] = src[key]
  }
  out.id = src.id || `ep-${index + 1}`
  return { ...out, ...sanitiseEpisodePatch(src) }
}

export function sanitiseEpisodePatch(patch) {
  const out = {}
  for (const key of EDITABLE_EPISODE_FIELDS) {
    if (!(key in patch)) continue
    const v = patch[key]
    if (key === 'duration') {
      const n = Number(v)
      if (Number.isFinite(n) && n > 0) out.duration = Math.round(n)
    } else if (key === 'free') {
      out.free = !!v
    } else {
      out[key] = typeof v === 'string' ? v.trim() : v
    }
  }
  return out
}

// Merge a partial episode edit back into a title's episode list, matching on
// id. Returns the full new list so the caller can store it as one patch.
export function withEpisodePatch(episodes, episodeId, patch) {
  const clean = sanitiseEpisodePatch(patch)
  if (!Object.keys(clean).length) return null
  let hit = false
  const next = (episodes || []).map((ep) => {
    if (ep.id !== episodeId) return ep
    hit = true
    return { ...ep, ...clean }
  })
  return hit ? next : null
}

// Keep only known fields, normalise the ones with a shape, and drop anything
// the operator cleared back to its bundled value so overrides never pile up
// with empty strings that would blank out good content.
export function sanitiseTitlePatch(patch) {
  const out = {}
  for (const key of EDITABLE_TITLE_FIELDS) {
    if (!(key in patch)) continue
    const v = patch[key]
    if (key === 'genres') {
      const list = (Array.isArray(v) ? v : String(v || '').split(','))
        .map((g) => String(g).trim())
        .filter(Boolean)
      out.genres = [...new Set(list)]
    } else if (key === 'year') {
      const n = Number(v)
      out.year = Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
      if (out.year === undefined) delete out.year
    } else if (key === 'featured' || key === 'top') {
      out[key] = !!v
    } else {
      out[key] = typeof v === 'string' ? v.trim() : v
    }
  }
  // `episodes` rides along beside the whitelist: it is how an episode-image or
  // relabel edit is persisted. Each episode is rebuilt through sanitiseEpisode,
  // so unknown keys cannot reach storage and the audio is always preserved.
  if (Array.isArray(patch.episodes)) {
    out.episodes = patch.episodes.map((ep, i) => sanitiseEpisode(ep, i))
  }
  return out
}

export function slugId(prefix, name) {
  const base = String(name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'item'
  return `${prefix}-${base}-${Date.now().toString(36)}`
}

export function palettes() {
  return ['cipher1', 'cipher2', 'cipher3', 'harbor1', 'harbor2', 'velvet1', 'moon1', 'orchard', 'solen', 'bryn', 'noor']
}

export function nextPalette(n) {
  const list = palettes()
  return list[n % list.length]
}
