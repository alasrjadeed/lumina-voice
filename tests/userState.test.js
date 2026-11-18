import { describe, expect, it } from 'vitest'

import { mergeUserState, sameUserState } from '../src/data/userState.js'

describe('mergeUserState', () => {
  it('unions saved titles without losing offline additions', () => {
    const merged = mergeUserState(
      { library: ['a', 'b'], progress: {}, history: [] },
      { library: ['b', 'c'], progress: {}, history: [] }
    )
    expect(merged.library).toEqual(['a', 'b', 'c'])
  })

  it('keeps the newest playback position for each title', () => {
    const merged = mergeUserState(
      { library: [], progress: { a: { episodeId: 'e1', t: 120, d: 300 } }, history: [] },
      { library: [], progress: { a: { episodeId: 'e1', t: 90, d: 300 }, b: { episodeId: 'e2', t: 40, d: 200 } }, history: [] }
    )
    expect(merged.progress.a.t).toBe(120)
    expect(merged.progress.b.t).toBe(40)
  })

  it('de-duplicates history by id and caps it at 200 entries', () => {
    const old = { id: 'h1', titleId: 'a', startedAt: '2026-11-17T00:00:00Z', positionSeconds: 10 }
    const fresh = { id: 'h1', titleId: 'a', startedAt: '2026-11-18T00:00:00Z', positionSeconds: 30 }
    const many = Array.from({ length: 250 }, (_, i) => ({
      id: `x${i}`, titleId: 'b', startedAt: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString(), positionSeconds: 1
    }))
    const merged = mergeUserState({ history: [old, ...many] }, { history: [fresh] })
    expect(merged.history).toHaveLength(200)
    expect(merged.history[0]).toEqual(fresh)
    expect(merged.history.some((h) => h.id === 'h1' && h.positionSeconds === 10)).toBe(false)
  })

  it('reports no change for identical state', () => {
    const state = { library: ['a'], progress: { a: { t: 5 } }, history: [{ id: 'h1' }] }
    expect(sameUserState(state, structuredClone(state))).toBe(true)
    expect(sameUserState(state, { ...state, library: ['a', 'b'] })).toBe(false)
  })

  it('drops stale demo/local entries when valid ids are supplied', () => {
    const merged = mergeUserState(
      {
        library: ['bad', 'good'],
        progress: { bad: { t: 10 }, good: { t: 20 } },
        history: [
          { id: 'h1', titleId: 'bad', startedAt: '2026-11-18T00:00:00Z' },
          { id: 'h2', titleId: 'good', startedAt: '2026-11-18T00:00:00Z' }
        ]
      },
      { library: ['old'], progress: { old: { t: 1 } }, history: [] },
      new Set(['good'])
    )
    expect(merged.library).toEqual(['good'])
    expect(Object.keys(merged.progress)).toEqual(['good'])
    expect(merged.history.map((h) => h.titleId)).toEqual(['good'])
  })
})
