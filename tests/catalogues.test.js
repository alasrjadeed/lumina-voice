import { describe, expect, it } from 'vitest'
import { catalogues, catalogueForTitle, getCatalogue, genres, kinds } from '../src/data/catalog'
import { categories, categoryForTitle, shows, getShow, getCategory } from '../src/data/broadcast'

describe('Quran Kareem catalogue', () => {
  it('is offered as a genre, a kind, and a catalogue', () => {
    expect(genres).toContain('Quran Kareem')
    expect(kinds).toContain('Quran Kareem')
    expect(catalogues.map((c) => c.id)).toContain('quran')
    expect(getCatalogue('quran').label).toBe('Quran Kareem')
  })

  it('has its own broadcast category so it can be scheduled', () => {
    expect(categories.map((c) => c.id)).toContain('quran')
    expect(categories.find((c) => c.id === 'quran').name).toBe('Quran Kareem')
  })

  it('has a show carrying the quran category', () => {
    const show = getShow('quran-kareem')
    expect(show).toBeTruthy()
    expect(show.categories).toEqual(['quran'])
  })

  it('lets the auto-mix pick it up', () => {
    expect(getShow('auto-mix').categories).toContain('quran')
    // every show category must resolve, or the scheduler silently drops titles
    for (const show of shows) {
      for (const c of show.categories) {
        expect(getCategory(c), `show ${show.id} references unknown category ${c}`).toBeTruthy()
      }
    }
  })

  it('every catalogue maps to a real broadcast category', () => {
    for (const c of catalogues) {
      expect(getCategory(c.category), `catalogue ${c.id} → unknown category ${c.category}`).toBeTruthy()
    }
  })
})

describe('categoryForTitle', () => {
  it('routes Quran Kareem by genre', () => {
    expect(categoryForTitle({ genres: ['Quran Kareem'], kind: 'Audiobook' })).toBe('quran')
  })

  it('routes Quran Kareem by kind even without the genre', () => {
    expect(categoryForTitle({ genres: ['Drama'], kind: 'Quran Kareem' })).toBe('quran')
  })

  it('leaves the existing precedence alone', () => {
    // Audiobook has always outranked genre, and still does.
    expect(categoryForTitle({ genres: ['Poetry'], kind: 'Audiobook' })).toBe('audiobook')
    expect(categoryForTitle({ genres: ['Poetry'], kind: 'Drama' })).toBe('poetry')
    expect(categoryForTitle({ genres: ['Crime'] })).toBe('crime')
    expect(categoryForTitle({ genres: ['Espionage'] })).toBe('espionage')
    expect(categoryForTitle({ genres: ['Comedy'] })).toBe('comedy')
  })

  it('does not crash on a title with no genres', () => {
    expect(categoryForTitle({ kind: 'Drama' })).toBe('drama')
    expect(categoryForTitle({})).toBe('drama')
  })
})

describe('catalogueForTitle', () => {
  it('recognises quran by genre or kind', () => {
    expect(catalogueForTitle({ genres: ['Quran Kareem'] })).toBe('quran')
    expect(catalogueForTitle({ genres: [], kind: 'Quran Kareem' })).toBe('quran')
  })

  it('falls back sensibly', () => {
    expect(catalogueForTitle({ genres: ['Poetry'], kind: 'Audiobook' })).toBe('poetry')
    expect(catalogueForTitle({ genres: ['Drama'], kind: 'Audio-film' })).toBe('drama')
    expect(catalogueForTitle(null)).toBe('drama')
  })
})
