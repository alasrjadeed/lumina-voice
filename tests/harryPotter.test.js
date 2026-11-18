import { describe, expect, it } from 'vitest'

import { getSeries, titlesBySeries } from '../src/data/catalog'

describe('Harry Potter serial', () => {
  it('has all seven parts filed under one series', () => {
    const series = getSeries('harry-potter')
    expect(series).toBeTruthy()
    expect(series.books).toBe(7)
    const parts = titlesBySeries('harry-potter')
    expect(parts).toHaveLength(7)
    expect(parts.map((t) => t.id)).toEqual([
      'hp-01',
      'hp-02',
      'hp-03',
      'hp-04',
      'hp-05',
      'hp-06',
      'hp-07'
    ])
  })

  it('does not invent audio for parts without an Archive.org link', () => {
    for (const t of titlesBySeries('harry-potter')) {
      expect(t.episodes).toEqual([])
      expect(t.authorId).toBe('jk-rowling-urdu')
      expect(t.genres).toContain('Adventure / fantasy')
    }
  })
})
