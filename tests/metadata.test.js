import { describe, expect, it } from 'vitest'
import {
  buildSynopsis,
  classify,
  completeMetadata,
  isPlaceholder,
  keywordsOf,
  tidyText,
  titleFromSlug,
  usableCreator
} from '../src/data/metadata'

describe('text helpers', () => {
  it('strips tags and entities and collapses space', () => {
    expect(tidyText('<p>Hello   &amp;  welcome</p>')).toBe('Hello & welcome')
    expect(tidyText(null)).toBe('')
  })

  it('recognises placeholders as missing', () => {
    expect(isPlaceholder('Unknown')).toBe(true)
    expect(isPlaceholder('  ')).toBe(true)
    expect(isPlaceholder('n/a')).toBe(true)
    expect(isPlaceholder('Iqbal')).toBe(false)
  })

  it('refuses to treat a non-person creator as usable', () => {
    expect(usableCreator('Various')).toBe(false)
    expect(usableCreator('LibriVox')).toBe(false)
    expect(usableCreator('')).toBe(false)
    expect(usableCreator('Allama Iqbal')).toBe(true)
  })

  it('turns a slug into a readable title', () => {
    expect(titleFromSlug('surah_al_baqarah_part_2')).toBe('Surah Al Baqarah Part 2')
    expect(titleFromSlug('https://archive.org/details/4.Nisa')).toBe('4 Nisa')
    expect(titleFromSlug('')).toBe('')
  })

  it('drops stop words from keywords', () => {
    const kw = keywordsOf('The Complete Book of Poetry')
    expect(kw.has('poetry')).toBe(true)
    expect(kw.has('the')).toBe(false)
    expect(kw.has('book')).toBe(false)
  })
})

describe('classify', () => {
  it('recognises a recitation', () => {
    const c = classify({ subject: 'Quran', name: 'Surah Yaseen', description: 'Recitation' })
    expect(c.genre).toBe('Quran Kareem')
    expect(c.kind).toBe('Quran Kareem')
    expect(c.role).toBe('Reciter')
  })

  it('files a translation separately from the recitation', () => {
    const c = classify({ name: 'Holy Quran Urdu Translation', description: 'Quran with urdu translation' })
    expect(c.genre).toBe('Urdu Translation')
    expect(c.kind).toBe('Quran Kareem')
  })

  it('recognises a tafsir', () => {
    const c = classify({ name: 'Tafsir Ibn Kathir', description: 'commentary on the Quran' })
    expect(c.genre).toBe('Tafsir')
    expect(c.kind).toBe('Quran Kareem')
  })

  it('recognises poetry, comedy, crime and espionage', () => {
    expect(classify({ subject: 'Poetry' }).genre).toBe('Poetry')
    expect(classify({ name: 'A Comedy Hour' }).genre).toBe('Comedy')
    expect(classify({ description: 'a detective mystery' }).genre).toBe('Crime')
    expect(classify({ description: 'a spy thriller' }).genre).toBe('Espionage')
  })

  it('defaults to something usable when nothing matches', () => {
    const c = classify({ name: 'Zzz', description: 'qqq' })
    expect(c.genre).toBe('Drama')
    expect(c.kind).toBe('Audiobook')
    expect(c.synopsis).toBeTruthy()
  })

  it('handles an empty item without throwing', () => {
    expect(classify().kind).toBe('Audiobook')
    expect(classify({}).genre).toBe('Drama')
  })

  it('handles array-valued archive fields', () => {
    expect(classify({ subject: ['Poetry', 'Urdu'], creator: ['Iqbal'] }).genre).toBe('Poetry')
  })
})

describe('buildSynopsis', () => {
  it('keeps a real description', () => {
    const long = 'A'.repeat(80)
    expect(buildSynopsis({ description: long })).toHaveLength(80)
  })

  it('pads a thin description with the title', () => {
    const out = buildSynopsis({ description: 'Short', name: 'My Title', classification: classify() })
    expect(out).toContain('My Title')
    expect(out).toContain('Short')
  })

  it('never returns an empty synopsis', () => {
    const out = buildSynopsis({ description: '', name: '', classification: classify(), sourceUrl: '' })
    expect(out.length).toBeGreaterThan(10)
  })

  it('mentions the source when there is nothing else', () => {
    const out = buildSynopsis({
      name: '',
      description: '',
      classification: { synopsis: 'A thing.' },
      sourceUrl: 'https://archive.org/details/x'
    })
    expect(out).toContain('archive.org')
  })
})

describe('completeMetadata', () => {
  it('fills every field for a bare item', () => {
    const m = completeMetadata({ identifier: 'surah_yaseen', name: 'Surah Yaseen', subject: 'Quran' })
    expect(m.name).toBe('Surah Yaseen')
    expect(m.creator).toBe('Unknown')
    expect(m.kind).toBe('Quran Kareem')
    expect(m.genre).toBe('Quran Kareem')
    expect(m.genres).toContain('Quran Kareem')
    expect(m.role).toBe('Reciter')
    expect(m.year).toBeGreaterThan(1900)
    expect(m.synopsis.length).toBeGreaterThan(10)
  })

  it('never overwrites a value the source supplied', () => {
    const m = completeMetadata(
      { name: 'From Archive', creator: 'Iqbal', year: 1955, subject: 'Poetry' },
      { name: 'Typed By Hand', creator: 'Mehdi Hassan' }
    )
    expect(m.name).toBe('Typed By Hand')
    expect(m.creator).toBe('Mehdi Hassan')
    expect(m.year).toBe(1955)
  })

  it('replaces a junk creator with a real fallback', () => {
    expect(completeMetadata({ name: 'X', creator: 'Various' }).creator).toBe('Unknown')
  })

  it('falls back to the identifier when there is no title at all', () => {
    expect(completeMetadata({ identifier: 'my_great_book' }).name).toBe('My Great Book')
  })

  it('derives a duration in minutes from seconds', () => {
    expect(completeMetadata({ name: 'X', duration: 3600 }).duration).toBe('60')
    expect(completeMetadata({ name: 'X', duration: 0 }).duration).toBe('')
  })

  it('respects genres already chosen by hand', () => {
    const m = completeMetadata({ name: 'X', subject: 'Quran' }, { genres: ['Tafsir'] })
    expect(m.genres).toEqual(['Tafsir'])
  })
})
