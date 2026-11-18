import { describe, expect, it } from 'vitest'
import { assembleBreak, defaultCampaigns } from '../src/data/ads.js'

describe('ads.assembleBreak', () => {
  it('fills the target without overshooting', () => {
    const res = assembleBreak(defaultCampaigns(), 120, { daypartId: 'evening', seed: 3 })
    expect(res.spots.length).toBeGreaterThan(0)
    expect(res.totalSeconds).toBeLessThanOrEqual(120)
    expect(res.fillPct).toBeGreaterThan(0)
    expect(res.targetSeconds).toBe(120)
  })

  it('never repeats the same spot back-to-back', () => {
    const res = assembleBreak(defaultCampaigns(), 300, { daypartId: 'night', seed: 7 })
    for (let i = 1; i < res.spots.length; i += 1) {
      expect(res.spots[i].spotId).not.toBe(res.spots[i - 1].spotId)
    }
  })

  it('returns an empty break when nothing is eligible', () => {
    const res = assembleBreak([], 120, { daypartId: 'dawn' })
    expect(res.spots).toEqual([])
    expect(res.fillPct).toBe(0)
    expect(res.totalSeconds).toBe(0)
  })

  it('respects daypart targeting', () => {
    const campaigns = defaultCampaigns().map((c) => ({ ...c, dayparts: ['morning'] }))
    const night = assembleBreak(campaigns, 120, { daypartId: 'night', seed: 1 })
    const morning = assembleBreak(campaigns, 120, { daypartId: 'morning', seed: 1 })
    expect(night.fillPct).toBe(0)
    expect(morning.spots.length).toBeGreaterThan(0)
  })

  it('is deterministic for a given seed and skips disabled campaigns', () => {
    const a = assembleBreak(defaultCampaigns(), 120, { daypartId: 'evening', seed: 5 })
    const b = assembleBreak(defaultCampaigns(), 120, { daypartId: 'evening', seed: 5 })
    expect(a.spots.map((s) => s.spotId)).toEqual(b.spots.map((s) => s.spotId))

    const disabled = defaultCampaigns().map((c) => ({ ...c, enabled: false }))
    expect(assembleBreak(disabled, 120, { daypartId: 'evening' }).spots).toEqual([])
  })
})
