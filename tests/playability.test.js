import { describe, expect, it } from 'vitest'

import { titlePlayableOnDevice } from '../src/data/playability'

describe('titlePlayableOnDevice', () => {
  it('keeps only titles with a real Archive.org stream', () => {
    expect(titlePlayableOnDevice({
      id: 'selected-ghazals-of-ghalib',
      episodes: [{ audio: 'https://archive.org/download/item/track.mp3' }]
    })).toBe(true)
  })

  it('hides house audio, local files, custom hosts and empty serial shells', () => {
    expect(titlePlayableOnDevice({ id: 'raat-02', episodes: [{ audio: '/audio/raat-02.opus' }] })).toBe(false)
    expect(titlePlayableOnDevice({ id: 'local', episodes: [{ audio: 'local:abc' }] })).toBe(false)
    expect(titlePlayableOnDevice({ id: 'custom', episodes: [{ audio: 'https://example.com/a.mp3' }] })).toBe(false)
    expect(titlePlayableOnDevice({ id: 'hp-01', episodes: [] })).toBe(false)
  })
})
