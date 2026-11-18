import { describe, expect, it } from 'vitest'
import { AAC_MIME, OPUS_MIME, primaryUrl, setMediaBase, sourceList } from '../src/data/media.js'

describe('media.sourceList', () => {
  it('returns [] for a missing asset', () => {
    expect(sourceList('')).toEqual([])
    expect(sourceList(undefined)).toEqual([])
  })

  it('offers Opus first with an AAC fallback (hq)', () => {
    const list = sourceList('raat-01', { hq: true })
    expect(list).toHaveLength(2)
    expect(list[0].src).toMatch(/\.opus$/)
    expect(list[0].type).toBe(OPUS_MIME)
    expect(list[1].src).toMatch(/\.m4a$/)
    expect(list[1].type).toBe(AAC_MIME)
  })

  it('prefers the data-saver variant when hq is off', () => {
    const list = sourceList('raat-01', { hq: false })
    expect(list[0].src).toMatch(/\.lo\.opus$/)
  })

  it('leads with the English mix and falls back to Urdu', () => {
    const list = sourceList('raat-01', { hq: true, lang: 'en' })
    expect(list.length).toBe(4)
    expect(list[0].src).toContain('raat-01.en')
    expect(list[2].src).toMatch(/raat-01\.opus$/)
  })

  it('never mangles a direct Archive.org stream into `.mp3.opus`', () => {
    const url = 'https://www.archive.org/download/ghazals_ghalib_0809_librivox/aeinakyun_ghalib_64kb.mp3'
    expect(sourceList(url)).toEqual([{ src: url, type: 'audio/mpeg', label: 'Direct stream' }])
    expect(sourceList(url, { lang: 'en' })).toHaveLength(1)
    expect(primaryUrl(url)).toBe(url)
  })

  it('respects a configured media base', () => {
    setMediaBase('https://cdn.example.com/audio')
    const url = primaryUrl('raat-01', { hq: true })
    expect(url.startsWith('https://cdn.example.com/audio/')).toBe(true)
    setMediaBase('')
  })
})
