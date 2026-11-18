import { beforeEach, describe, expect, it } from 'vitest'
import {
  emptyUserCatalog,
  sanitiseGenreList,
  sanitiseGenreName,
  saveUserCatalog,
  loadUserCatalog
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

describe('custom genres', () => {
  it('starts with an empty custom list', () => {
    expect(emptyUserCatalog().genres).toEqual([])
  })

  it('trims, collapses space, and caps a genre name', () => {
    expect(sanitiseGenreName('  Sufi   Poetry ')).toBe('Sufi Poetry')
    expect(sanitiseGenreName(null)).toBe('')
    expect(sanitiseGenreName('x'.repeat(80))).toHaveLength(40)
  })

  it('de-duplicates case-insensitively but keeps the first spelling', () => {
    expect(sanitiseGenreList(['Thriller', 'thriller', 'THRILLER', 'Horror'])).toEqual([
      'Thriller',
      'Horror'
    ])
  })

  it('drops blank entries and anything that is not an array', () => {
    expect(sanitiseGenreList(['Drama', '', '   ', null, 'Mystery'])).toEqual(['Drama', 'Mystery'])
    expect(sanitiseGenreList(undefined)).toEqual([])
    expect(sanitiseGenreList('Drama')).toEqual([])
  })

  it('round-trips through storage, sanitised on the way in and out', () => {
    saveUserCatalog({ ...emptyUserCatalog(), genres: ['  Sufi  Poetry ', 'Sufi Poetry', 'Travel'] })
    expect(loadUserCatalog().genres).toEqual(['Sufi Poetry', 'Travel'])
  })

  it('survives a stored value of the wrong shape', () => {
    localStorage.setItem('lumina-user-catalog-v1', JSON.stringify({ genres: 'Drama' }))
    expect(loadUserCatalog().genres).toEqual([])
    localStorage.setItem('lumina-user-catalog-v1', JSON.stringify({}))
    expect(loadUserCatalog().genres).toEqual([])
    localStorage.removeItem('lumina-user-catalog-v1')
  })

  it('keeps the rest of the catalogue intact when genres are saved', () => {
    saveUserCatalog({
      titles: [{ id: 't1', authorId: 'a1', episodes: [{ audio: 'https://archive.org/download/item/track.mp3' }] }],
      authors: [{ id: 'a1' }],
      poets: [],
      overrides: { t1: { name: 'X' } },
      genres: ['Quran Tafsir']
    })
    const back = loadUserCatalog()
    expect(back.titles).toHaveLength(1)
    expect(back.overrides.t1.name).toBe('X')
    expect(back.genres).toEqual(['Quran Tafsir'])
    localStorage.removeItem('lumina-user-catalog-v1')
  })
})
