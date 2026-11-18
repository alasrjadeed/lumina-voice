// Advertising module for Lumina Voice — original, fictional campaigns only.
//
// A "campaign" is an advertiser's booking: one or more spots of fixed broadcast
// lengths (15 / 20 / 30s). Ad breaks are assembled to an exact target duration by
// scheduling campaigns into a break, respecting weight, daypart targeting and
// avoiding back-to-back repeats. Every aired spot is written to a play log, which
// feeds the impressions / fill / revenue report in the Broadcast Studio.

import { daypartOf } from './broadcast'

export const adCategories = [
  { id: 'local', name: 'Local Business', color: '#3dd68c' },
  { id: 'brand', name: 'National Brand', color: '#e4c36a' },
  { id: 'promo', name: 'House Promo', color: '#8b7cf6' },
  { id: 'psa', name: 'Public Service', color: '#6ad4e4' }
]

export const getAdCategory = (id) => adCategories.find((c) => c.id === id)

// Standard broadcast spot lengths, in seconds.
export const spotLengths = [15, 20, 30, 45]

let uid = 0
const nextId = (p) => `${p}-${Date.now().toString(36)}-${(uid++).toString(36)}`

function spot(id, name, seconds, audio) {
  return { id, name, seconds, audio }
}

// Seed campaigns — every advertiser is invented for this demo.
export function defaultCampaigns() {
  return [
    {
      id: 'camp-chai-khana',
      advertiser: 'Chai Khana',
      advertiserUr: 'چائے خانہ',
      category: 'local',
      weight: 3,
      enabled: true,
      dayparts: ['all'],
      cpm: 160,
      impressions: 18420,
      startMin: 0,
      endMin: 1440,
      spots: [
        spot('sp-chai-30', 'Signature 30s', 30, 'ad-chai-khana'),
        spot('sp-chai-15', 'Evening cut 15s', 15, 'ad-chai-khana')
      ]
    },
    {
      id: 'camp-noor-mobile',
      advertiser: 'Noor Mobile',
      advertiserUr: 'نور موبائل',
      category: 'local',
      weight: 2,
      enabled: true,
      dayparts: ['all'],
      cpm: 140,
      impressions: 12130,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-noor-20', 'Handset 20s', 20, 'ad-noor-mobile')]
    },
    {
      id: 'camp-roshni-solar',
      advertiser: 'Roshni Solar',
      advertiserUr: 'روشنی سولر',
      category: 'brand',
      weight: 2,
      enabled: true,
      dayparts: ['morning', 'afternoon'],
      cpm: 260,
      impressions: 9080,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-roshni-20', 'Energy saver 20s', 20, 'ad-roshni-solar')]
    },
    {
      id: 'camp-kaghaz-books',
      advertiser: 'Kaghaz Book Ghar',
      advertiserUr: 'کاغذ کتاب گھر',
      category: 'local',
      weight: 1,
      enabled: true,
      dayparts: ['all'],
      cpm: 110,
      impressions: 6420,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-kaghaz-15', 'Shelf 15s', 15, 'ad-kaghaz-books')]
    },
    {
      id: 'camp-bazaar-fresh',
      advertiser: 'Bazaar Fresh',
      advertiserUr: 'بازار فریش',
      category: 'brand',
      weight: 2,
      enabled: true,
      dayparts: ['dawn', 'morning'],
      cpm: 210,
      impressions: 7450,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-bazaar-20', 'Morning market 20s', 20, 'ad-bazaar-fresh')]
    },
    {
      id: 'camp-sehat-line',
      advertiser: 'Sehat Line',
      advertiserUr: 'صحت لائن',
      category: 'psa',
      weight: 1,
      enabled: true,
      dayparts: ['all'],
      cpm: 0,
      impressions: 10340,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-sehat-30', 'Helpline 30s', 30, 'ad-sehat-line')]
    },
    {
      id: 'camp-safeer-travels',
      advertiser: 'Safeer Travels',
      advertiserUr: 'سفیر ٹریولز',
      category: 'local',
      weight: 2,
      enabled: true,
      dayparts: ['evening', 'night'],
      cpm: 190,
      impressions: 5210,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-safeer-30', 'Intercity 30s', 30, 'ad-safeer-travels')]
    },
    {
      id: 'camp-lumina-plus',
      advertiser: 'Lumina Plus',
      advertiserUr: 'لومینا پلس',
      category: 'promo',
      weight: 4,
      enabled: true,
      dayparts: ['all'],
      cpm: 0,
      impressions: 21760,
      startMin: 0,
      endMin: 1440,
      spots: [spot('sp-plus-15', 'Subscribe 15s', 15, 'ad-lumina-plus')]
    }
  ]
}

function targetsDaypart(campaign, daypartId) {
  return !campaign.dayparts || campaign.dayparts.includes('all') || campaign.dayparts.includes(daypartId)
}

// Assembles a single ad break of exactly `targetSeconds` (or as close as the pool
// allows without overshooting) from the eligible campaigns. Weighted rotation gives
// heavy campaigns more slots; the same spot never plays twice in a row.
export function assembleBreak(campaigns, targetSeconds = 120, { daypartId, seed = 0 } = {}) {
  const eligible = campaigns.filter(
    (c) => c.enabled && c.spots?.length && targetsDaypart(c, daypartId)
  )
  if (!eligible.length) return { spots: [], totalSeconds: 0, fillPct: 0, targetSeconds }

  // Expand into a weighted ticket pool so heavier campaigns draw more often.
  const pool = []
  eligible.forEach((c) => {
    const tickets = Math.max(1, c.weight || 1)
    for (let i = 0; i < tickets; i += 1) pool.push(c)
  })

  const spots = []
  let total = 0
  let cursor = seed % pool.length
  let guard = 0
  let lastSpotId = null

  while (total < targetSeconds && guard < 400) {
    guard += 1
    const campaign = pool[cursor % pool.length]
    cursor += 1
    const candidates = campaign.spots.filter((s) => s.id !== lastSpotId)
    // No-repeat rule: if this campaign's only available spot just played but
    // another campaign in the pool can take the slot, step to the next entry
    // instead of repeating. (A single-campaign pool has no alternative.)
    const elsewhere = !candidates.length && pool.some((c) => c.spots.some((s) => s.id !== lastSpotId))
    if (elsewhere) continue
    const list = candidates.length ? candidates : campaign.spots
    // Prefer the longest spot that still fits the remaining time.
    const remaining = targetSeconds - total
    const fit = list
      .filter((s) => s.seconds <= remaining)
      .sort((a, b) => b.seconds - a.seconds)[0]
    if (!fit) {
      // Nothing fits; if a short spot remains unused anywhere, try the pool once more.
      if (list.some((s) => s.seconds > remaining)) continue
      break
    }
    spots.push({
      campaignId: campaign.id,
      advertiser: campaign.advertiser,
      advertiserUr: campaign.advertiserUr,
      category: campaign.category,
      cpm: campaign.cpm || 0,
      spotId: fit.id,
      name: fit.name,
      seconds: fit.seconds,
      audio: fit.audio
    })
    total += fit.seconds
    lastSpotId = fit.id
  }

  return {
    spots,
    totalSeconds: total,
    fillPct: targetSeconds ? Math.round((total / targetSeconds) * 100) : 0,
    targetSeconds
  }
}

// Minutes-of-day boundary of the next ad break for a given interval.
export function nextBreakBoundary(now, everyMin = 30) {
  const min = now.getHours() * 60 + now.getMinutes()
  const at = Math.ceil((min + 1) / everyMin) * everyMin
  return at
}

export function minutesUntilBreak(now, everyMin = 30) {
  const min = now.getHours() * 60 + now.getMinutes()
  const sec = now.getSeconds()
  const boundary = nextBreakBoundary(now, everyMin)
  const diffMin = boundary - min
  return Math.max(0, diffMin * 60 - sec)
}

export function breakIndexAt(now, everyMin = 30) {
  const min = now.getHours() * 60 + now.getMinutes()
  return Math.floor(min / everyMin)
}

// Aggregate the play log into a per-campaign report with revenue at CPM.
export function campaignReport(campaigns, plays = []) {
  const rows = campaigns.map((c) => {
    const airs = plays.filter((p) => p.campaignId === c.id)
    const sessionImpressions = airs.length
    const impressions = (c.impressions || 0) + sessionImpressions
    const seconds = airs.reduce((a, p) => a + (p.seconds || 0), 0)
    const revenue = ((c.cpm || 0) * sessionImpressions) / 1000
    return {
      id: c.id,
      advertiser: c.advertiser,
      advertiserUr: c.advertiserUr,
      category: c.category,
      enabled: c.enabled,
      weight: c.weight,
      cpm: c.cpm || 0,
      impressions,
      sessionImpressions,
      seconds,
      revenue
    }
  })
  const totalImpressions = rows.reduce((a, r) => a + r.sessionImpressions, 0)
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0)
  const totalSeconds = rows.reduce((a, r) => a + r.seconds, 0)
  return { rows, totalImpressions, totalRevenue, totalSeconds }
}

// Builds a contiguous programming block that fills exactly `hours` from `startMin`,
// alternating shows by daypart. Ad breaks are counted but not stored as slots.
export function buildExactBlock(startMin, hours, dayIndex) {
  const showForMinute = (min) => {
    const dp = daypartOf(((min % 1440) + 1440) % 1440).id
    if (dp === 'late' || dp === 'night') return 'raat-musafir'
    if (dp === 'dawn') return 'subah-nazm'
    if (dp === 'morning') return 'drama-hour'
    if (dp === 'afternoon') return 'safar-audiobook'
    if (dp === 'evening') return 'shaam-crime'
    return 'auto-mix'
  }
  const endMin = startMin + hours * 60
  const slots = []
  let cur = startMin
  let i = 0
  while (cur < endMin) {
    const remaining = endMin - cur
    // 60-minute blocks, with the final block trimmed so the total is exact.
    const dur = Math.min(60, remaining)
    let showId = showForMinute(cur)
    // Every third block, rotate to the live desk / auto mix for variety.
    if (i % 3 === 2) showId = showId === 'live-darbar' ? 'auto-mix' : 'live-darbar'
    slots.push({ id: nextId('slot'), days: [dayIndex], start: cur, end: cur + dur, showId })
    cur += dur
    i += 1
  }
  return slots
}

export function newCampaign() {
  return {
    id: nextId('camp'),
    advertiser: 'New advertiser',
    advertiserUr: '',
    category: 'local',
    weight: 1,
    enabled: true,
    dayparts: ['all'],
    cpm: 100,
    impressions: 0,
    startMin: 0,
    endMin: 1440,
    spots: []
  }
}

export function newSpot(seconds = 30) {
  return { id: nextId('sp'), name: `${seconds}s spot`, seconds, audio: '' }
}
