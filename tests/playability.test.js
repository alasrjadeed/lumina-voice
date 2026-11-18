import { describe, expect, it } from 'vitest'

import { titlePlayableOnDevice } from '../src/data/playability'

describe('titlePlayableOnDevice', () => {
  const house = {
    id: 'raat-02',
    episodes: [{ asset: 'raat-02', audio: '/audio/raat-02.opus' }]
  }
  const stream = {
    id: 'selected-ghazals-of-ghalib',
    episodes: [{ audio: 'https://archive.org/download/item/track.mp3' }]
  }
  const replaced = {
    id: 'raat-02',
    episodes: [{ asset: 'local:abc', audio: 'local:abc' }]
  }

  it('hides bundled house audio on device but keeps it on web', () => {
    expect(titlePlayableOnDevice(house, { native: true })).toBe(false)
    expect(titlePlayableOnDevice(house, { native: false })).toBe(true)
  })

  it('always keeps remote streams, imports, local replacements and serial shells', () => {
    expect(titlePlayableOnDevice(stream, { native: true })).toBe(true)
    expect(titlePlayableOnDevice(replaced, { native: true })).toBe(true)
    expect(titlePlayableOnDevice({ ...house, imported: true }, { native: true })).toBe(true)
    expect(titlePlayableOnDevice({ id: 'hp-01', episodes: [] }, { native: true })).toBe(true)
  })
})
