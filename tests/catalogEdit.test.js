import { beforeEach, describe, expect, it } from 'vitest'
import {
  EDITABLE_TITLE_FIELDS,
  emptyUserCatalog,
  loadUserCatalog,
  sanitiseTitlePatch,
  saveUserCatalog,
  withEpisodePatch
} from '../src/data/userCatalog'

// The catalog store is device-first and reads localStorage; the vitest env is
// plain node, so give it a stub before anything touches the module.
beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  }
})

describe('user catalog overrides', () => {
  it('starts with an empty override map', () => {
    expect(emptyUserCatalog().overrides).toEqual({})
  })

  it('round-trips overrides for an Archive.org title', () => {
    const title = {
      id: 'archive-item',
      authorId: 'mirza-ghalib',
      genres: ['Poetry'],
      episodes: [{ audio: 'https://archive.org/download/item/track.mp3' }]
    }
    saveUserCatalog({ ...emptyUserCatalog(), titles: [title], overrides: { 'archive-item': { name: 'New' } } })
    expect(loadUserCatalog().overrides['archive-item']).toEqual({ name: 'New' })
  })

  it('drops demo titles, local files and their overrides on load and save', () => {
    localStorage.setItem('lumina-user-catalog-v1', JSON.stringify({
      titles: [
        { id: 'raat-01', episodes: [{ audio: '/audio/raat-01.opus' }] },
        { id: 'archive-item', episodes: [{ audio: 'https://www.archive.org/download/item/track.mp3' }] }
      ],
      authors: [{ id: 'demo' }, { id: 'mirza-ghalib' }],
      overrides: { 'raat-01': { name: 'Demo' }, 'archive-item': { name: 'Kept' } }
    }))
    const clean = loadUserCatalog()
    expect(clean.titles.map((t) => t.id)).toEqual(['archive-item'])
    expect(clean.titles[0].episodes[0].audio).toBe('https://archive.org/download/item/track.mp3')
    expect(clean.authors).toEqual([])
    expect(clean.overrides).toEqual({ 'archive-item': { name: 'Kept' } })
    expect(JSON.parse(localStorage.getItem('lumina-user-catalog-v1'))).toEqual(clean)
  })

  it('tolerates a corrupt or missing override map', () => {
    localStorage.setItem('lumina-user-catalog-v1', JSON.stringify({ titles: [], overrides: 'nope' }))
    expect(loadUserCatalog().overrides).toEqual({})
    localStorage.setItem('lumina-user-catalog-v1', 'not json')
    expect(loadUserCatalog().overrides).toEqual({})
  })

  it('never loses overrides when saving a catalog without them', () => {
    // saveUserCatalog normalises the shape; a caller that forgets the field
    // must not silently wipe it out of the object it is handed.
    const out = saveUserCatalog({ titles: [] })
    expect(out.overrides).toEqual({})
  })
})

describe('sanitiseTitlePatch', () => {
  it('keeps only the editable fields', () => {
    const out = sanitiseTitlePatch({ name: 'Kept', id: 'hacked', imported: true })
    expect(out).toEqual({ name: 'Kept' })
    expect(EDITABLE_TITLE_FIELDS).toContain('name')
    expect(EDITABLE_TITLE_FIELDS).not.toContain('id')
    expect(EDITABLE_TITLE_FIELDS).not.toContain('episodes')
  })

  it('ignores anything that is not a title field, including a non-array episodes value', () => {
    expect(sanitiseTitlePatch({ name: 'Kept', episodes: 'not an array', asset: 'x' })).toEqual({ name: 'Kept' })
  })

  it('splits, trims, and de-duplicates genres', () => {
    expect(sanitiseTitlePatch({ genres: 'Drama, Crime ,Drama' }).genres).toEqual(['Drama', 'Crime'])
    expect(sanitiseTitlePatch({ genres: ['Poetry', ' Poetry ', ''] }).genres).toEqual(['Poetry'])
  })

  it('drops an unusable year rather than writing NaN', () => {
    expect(sanitiseTitlePatch({ year: 'not a year' })).not.toHaveProperty('year')
    expect(sanitiseTitlePatch({ year: '2024' }).year).toBe(2024)
  })

  it('coerces the display flags to booleans', () => {
    expect(sanitiseTitlePatch({ featured: 'yes', top: 0 })).toEqual({ featured: true, top: false })
  })

  it('trims text and ignores fields that were not sent', () => {
    expect(sanitiseTitlePatch({ name: '  Padded  ' })).toEqual({ name: 'Padded' })
    expect(sanitiseTitlePatch({})).toEqual({})
  })
})

describe('sanitiseEpisodePatch / withEpisodePatch', () => {
  it('whitelists episode fields and keeps id + asset intact', () => {
    const list = withEpisodePatch(
      [{ id: 'e1', asset: 'raat1', audio: '/audio/raat-01.opus', title: 'Ep 1' }],
      'e1',
      { imageUrl: '/covers/e1.jpg', asset: 'hijacked', audio: 'http://evil', id: 'nope' }
    )
    expect(list).toHaveLength(1)
    expect(list[0].imageUrl).toBe('/covers/e1.jpg')
    expect(list[0].asset).toBe('raat1')
    expect(list[0].audio).toBe('/audio/raat-01.opus')
    expect(list[0].id).toBe('e1')
  })

  it('returns null when nothing matched or nothing changed', () => {
    expect(withEpisodePatch([{ id: 'e1' }], 'missing', { imageUrl: '/x.jpg' })).toBeNull()
    expect(withEpisodePatch([{ id: 'e1' }], 'e1', {})).toBeNull()
  })

  it('drops an unusable duration and coerces free', () => {
    const list = withEpisodePatch([{ id: 'e1' }], 'e1', { duration: 'abc', free: 'yes' })
    expect(list[0]).not.toHaveProperty('duration')
    expect(list[0].free).toBe(true)
  })

  it('accepts an episodes array on a title patch but only the safe fields', () => {
    const out = sanitiseTitlePatch({
      episodes: [{ id: 'e1', asset: 'keep', audio: 'keep', imageUrl: '/c.jpg', junk: 1, duration: '12' }]
    })
    expect(out.episodes).toHaveLength(1)
    expect(out.episodes[0].imageUrl).toBe('/c.jpg')
    expect(out.episodes[0].duration).toBe(12)
    expect(out.episodes[0].asset).toBe('keep')
    expect(out.episodes[0]).not.toHaveProperty('junk')
  })
})
