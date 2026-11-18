import { beforeEach, describe, expect, it } from 'vitest'
import { addRecent, clearRecent, highlight, loadRecent, normalise, rankResults, scoreTitle, tokens } from '../src/data/search'

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear()
  }
}

describe('search helpers', () => {
  it('normalises English and Urdu text', () => {
    expect(normalise('  KHAAMOSH   Relay  ')).toBe('khaamosh relay')
    expect(normalise('خاموش ریلےً')).toBe('خاموش ریلے')
    expect(tokens('Raat  ke musafir')).toEqual(['raat', 'ke', 'musafir'])
  })

  it('scores exact titles above passing mentions', () => {
    const exact = { name: 'Raat', nameUr: 'رات', number: '001', genres: ['Drama'] }
    const mention = { name: 'Bandargah', nameUr: 'بندرگاہ', number: '002', genres: ['Drama'], synopsis: 'A story about raat' }
    expect(scoreTitle(exact, 'raat')).toBeGreaterThan(scoreTitle(mention, 'raat'))
    expect(scoreTitle(exact, 'zzz')).toBe(0)
  })

  it('ranks grouped results by relevance and filters facets', () => {
    const ranked = rankResults(
      { titles: [{ name: 'Other' }, { name: 'Raat' }], series: [{ name: 'Raat Series' }], people: [{ name: 'Zohra' }] },
      'raat',
      { genres: ['Drama', 'Poetry'], kinds: ['Audio-film'] }
    )
    expect(ranked.titles.map((x) => x.item.name)).toEqual(['Raat', 'Other'])
    expect(ranked.series).toHaveLength(1)
    expect(ranked.genres).toEqual([])
    expect(ranked.kinds).toEqual([])
  })

  it('highlights matched words without losing text', () => {
    const parts = highlight('Khaamosh Relay', 'raat relay')
    expect(parts.find((p) => p.hit)?.text.toLowerCase()).toBe('relay')
    expect(parts.map((p) => p.text).join('')).toBe('Khaamosh Relay')
  })
})

describe('recent searches', () => {
  beforeEach(() => { globalThis.localStorage = fakeStorage(); clearRecent() })

  it('keeps eight unique normalised searches', () => {
    for (let i = 0; i < 10; i++) addRecent(`  Query ${i} `)
    const recent = loadRecent()
    expect(recent).toHaveLength(8)
    expect(recent[0]).toBe('query 9')
    addRecent('QUERY 9')
    expect(loadRecent()).toHaveLength(8)
    clearRecent()
    expect(loadRecent()).toEqual([])
  })
})
