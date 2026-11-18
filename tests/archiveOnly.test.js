import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { hero, titles } from '../src/data/catalog'
import { canonicalArchiveUrl, filterArchiveTitles, isArchiveAudioUrl } from '../src/data/contentPolicy'

describe('archive-only catalogue', () => {
  it('ships only titles with direct Archive.org audio', () => {
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) {
      expect(title.episodes.length).toBeGreaterThan(0)
      expect(title.episodes.some((e) => isArchiveAudioUrl(e.audio))).toBe(true)
      expect(title.episodes.some((e) => String(e.audio || '').startsWith('/audio/'))).toBe(false)
    }
  })

  it('removes demo, house and empty serial content', () => {
    const ids = titles.map((t) => t.id)
    expect(ids).toContain('selected-ghazals-of-ghalib')
    expect(ids).not.toContain('raat-02')
    expect(ids.some((id) => id.startsWith('hp-'))).toBe(false)
  })

  it('points the hero at an Archive.org title', () => {
    expect(titles.some((t) => t.id === hero.titleId)).toBe(true)
  })

  it('drops non-archive and audio-less titles and canonicalises www URLs', () => {
    const result = filterArchiveTitles([
      { id: 'bad', episodes: [{ audio: '/audio/demo.opus' }] },
      { id: 'empty', episodes: [] },
      { id: 'good', episodes: [{ audio: 'https://www.archive.org/download/item/track.mp3' }] }
    ])
    expect(result.map((t) => t.id)).toEqual(['good'])
    expect(result[0].episodes[0].audio).toBe('https://archive.org/download/item/track.mp3')
    expect(canonicalArchiveUrl('https://www.archive.org/download/item/track.mp3')).toBe(
      'https://archive.org/download/item/track.mp3'
    )
  })

  it('registers the current service worker cache version', () => {
    const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
    const pwa = readFileSync(new URL('../src/pwa.js', import.meta.url), 'utf8')
    const shell = sw.match(/const SHELL = '(lumina-shell-v\d+)'/)?.[1]
    expect(shell).toBeTruthy()
    expect(pwa).toContain(`/sw.js?v=${shell.replace('lumina-shell-v', '')}`)
  })
})
