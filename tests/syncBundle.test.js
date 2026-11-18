import { beforeEach, describe, expect, it } from 'vitest'
import { applyBundle, exportBundle, parseBundle } from '../src/data/syncBundle'

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k)
  }
}

describe('data bundle', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeStorage({
      'lumina-voice-v1': JSON.stringify({ user: { email: 'admin@example.com' }, library: ['a'], volume: 0.8, autoplay: true }),
      'lumina-user-catalog-v1': JSON.stringify({ titles: [{ id: 'x' }] }),
      'lumina-site-config': JSON.stringify({ heroTitle: 'Hello' }),
      'lumina-stream-v2': JSON.stringify({ enabled: true })
    })
  })

  it('exports only allowlisted data and app preferences', async () => {
    const bundle = await exportBundle()
    expect(bundle.app).toBe('lumina-voice')
    expect(bundle.version).toBe(1)
    expect(bundle.data['lumina-user-catalog-v1'].titles).toHaveLength(1)
    expect(bundle.data['lumina-voice-v1']).toEqual({ library: ['a'], volume: 0.8, autoplay: true })
    expect(bundle.data['lumina-stream-v2']).toBeUndefined()
    expect(bundle.audio).toEqual([])
  })

  it('rejects foreign, versioned and tampered bundles', async () => {
    const bundle = await exportBundle()
    expect(() => parseBundle(JSON.stringify({ ...bundle, app: 'other' }))).toThrow(/not a Lumina/)
    expect(() => parseBundle(JSON.stringify({ ...bundle, version: 99 }))).toThrow(/Unsupported/)
    expect(() => parseBundle(JSON.stringify({ ...bundle, data: { evil: 1 } }))).toThrow(/Unexpected/)
    expect(() => parseBundle('not json')).toThrow(/valid JSON/)
  })

  it('restores data without overwriting the signed-in user', async () => {
    const bundle = await exportBundle()
    globalThis.localStorage.setItem('lumina-user-catalog-v1', JSON.stringify({ titles: [] }))
    globalThis.localStorage.setItem('lumina-voice-v1', JSON.stringify({ user: { email: 'device@example.com' }, library: [] }))
    const result = await applyBundle(JSON.stringify(bundle))
    expect(result.library).toBe(1)
    expect(JSON.parse(globalThis.localStorage.getItem('lumina-user-catalog-v1')).titles).toHaveLength(1)
    expect(JSON.parse(globalThis.localStorage.getItem('lumina-voice-v1')).user.email).toBe('device@example.com')
  })

  it('carries history, device voice and AI usage but never session or radio state', async () => {
    globalThis.localStorage.setItem('lumina-voice-v1', JSON.stringify({
      library: ['a'], history: [{ id: 'a', at: 1 }], rate: 1.2
    }))
    globalThis.localStorage.setItem('lumina-history-v1', JSON.stringify([{ id: 'a' }]))
    globalThis.localStorage.setItem('lumina-search-recent-v1', JSON.stringify(['urdu']))
    globalThis.localStorage.setItem('lumina-device-voice', JSON.stringify({ voice: 'ur' }))
    globalThis.localStorage.setItem('lumina-ai-usage', JSON.stringify({ used: 3 }))
    globalThis.localStorage.setItem('lumina-user-session', JSON.stringify({ token: 'secret' }))
    globalThis.localStorage.setItem('lumina-ai-keys', JSON.stringify({ key: 'secret' }))
    globalThis.localStorage.setItem('lumina-stream-v2', JSON.stringify({ enabled: true }))

    const bundle = await exportBundle()
    expect(bundle.data['lumina-voice-v1'].history).toEqual([{ id: 'a', at: 1 }])
    expect(bundle.data['lumina-history-v1']).toEqual([{ id: 'a' }])
    expect(bundle.data['lumina-search-recent-v1']).toEqual(['urdu'])
    expect(bundle.data['lumina-device-voice']).toEqual({ voice: 'ur' })
    expect(bundle.data['lumina-ai-usage']).toEqual({ used: 3 })
    expect(bundle.data['lumina-user-session']).toBeUndefined()
    expect(bundle.data['lumina-ai-keys']).toBeUndefined()
    expect(bundle.data['lumina-stream-v2']).toBeUndefined()

    globalThis.localStorage.setItem('lumina-voice-v1', JSON.stringify({ library: [] }))
    await applyBundle(JSON.stringify(bundle))
    expect(JSON.parse(globalThis.localStorage.getItem('lumina-voice-v1')).history).toEqual([{ id: 'a', at: 1 }])
    expect(JSON.parse(globalThis.localStorage.getItem('lumina-history-v1'))).toEqual([{ id: 'a' }])
  })
})
