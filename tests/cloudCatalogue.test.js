import { describe, expect, it } from 'vitest'

import { archiveDetailsUrl, mapStoryRow, parseCatalogueSnapshot } from '../src/data/cloudCatalogue'

const row = {
  id: 'story-1',
  title: 'A free audiobook',
  description: 'Public-domain recording',
  audio_url: 'https://www.archive.org/download/some_item/track.mp3',
  cover_url: 'https://archive.org/services/img/some_item',
  duration: 120,
  created_at: '2026-11-19T00:00:00Z'
}

describe('cron-published cloud catalogue', () => {
  it('turns a Supabase story into an Archive.org audiobook entry', () => {
    const title = mapStoryRow(row)
    expect(title.id).toBe('cloud-story-1')
    expect(title.sourceUrl).toBe('https://archive.org/details/some_item')
    expect(title.episodes).toHaveLength(1)
    expect(title.episodes[0].audio).toBe('https://archive.org/download/some_item/track.mp3')
    expect(title.episodes[0].src).toBe(title.episodes[0].audio)
    expect(title.episodes[0].codec).toBe('mp3')
  })

  it('builds the single outward audiobook link from the audio URL', () => {
    expect(archiveDetailsUrl(row.audio_url)).toBe('https://archive.org/details/some_item')
    expect(archiveDetailsUrl('https://example.com/track.mp3')).toBe('')
  })

  it('drops drafts, non-Archive rows and duplicate ids from a snapshot', () => {
    const titles = parseCatalogueSnapshot({
      version: 1,
      stories: [
        row,
        row,
        { ...row, id: 'draft', published: false },
        { ...row, id: 'bad', audio_url: 'https://example.com/track.mp3' }
      ]
    })
    expect(titles.map((t) => t.id)).toEqual(['cloud-story-1'])
  })
})
