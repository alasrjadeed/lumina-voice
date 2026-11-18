import { titles, getTitle } from './catalog'

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const dayparts = [
  { id: 'late', name: 'Late Night', start: 0, end: 300 },
  { id: 'dawn', name: 'Dawn', start: 300, end: 480 },
  { id: 'morning', name: 'Morning', start: 480, end: 720 },
  { id: 'afternoon', name: 'Afternoon', start: 720, end: 1020 },
  { id: 'evening', name: 'Evening', start: 1020, end: 1260 },
  { id: 'night', name: 'Night', start: 1260, end: 1440 }
]

export const categories = [
  { id: 'drama', name: 'Drama', color: '#e4c36a' },
  { id: 'espionage', name: 'Espionage', color: '#8b7cf6' },
  { id: 'crime', name: 'Crime', color: '#ef6b6b' },
  { id: 'comedy', name: 'Comedy', color: '#3dd68c' },
  { id: 'poetry', name: 'Poetry', color: '#a99dff' },
  { id: 'quran', name: 'Quran Kareem', color: '#6ad48c' },
  { id: 'audiobook', name: 'Audiobooks', color: '#f0d78a' },
  { id: 'autobiography', name: 'Autobiography', color: '#c9b48a' },
  { id: 'music', name: 'Music & Beds', color: '#6ad4e4' },
  { id: 'id', name: 'IDs & Jingles', color: '#9a9488' }
]

export const shows = [
  {
    id: 'subah-nazm',
    name: 'Subah ki Nazm',
    nameUr: 'صبح کی نظم',
    type: 'poetry',
    categories: ['poetry'],
    blurb: 'Dawn poetry to open the city — recited softly as the light arrives.'
  },
  {
    id: 'drama-hour',
    name: 'Drama Hour',
    nameUr: 'ڈرامہ آور',
    type: 'drama',
    categories: ['drama', 'espionage'],
    blurb: 'Back-to-back fully scored Urdu dramas in the Lumina repertory.'
  },
  {
    id: 'safar-audiobook',
    name: 'Safar Audiobooks',
    nameUr: 'سفر آڈیو بکس',
    type: 'audiobook',
    categories: ['audiobook'],
    blurb: 'Long-form audiobooks for the weekend — settle in for the ride.'
  },
  {
    id: 'shaam-crime',
    name: 'Shaam ka Jurm',
    nameUr: 'شام کا جرم',
    type: 'drama',
    categories: ['crime', 'drama'],
    blurb: 'Crime and noir as the evening closes in on the docks.'
  },
  {
    id: 'raat-musafir',
    name: 'Raat ke Musafir',
    nameUr: 'رات کے مسافر',
    type: 'drama',
    categories: ['espionage', 'crime'],
    blurb: 'The midnight espionage block — couriers, envelopes, and quiet danger.'
  },
  {
    id: 'live-darbar',
    name: 'Live Darbar',
    nameUr: 'لائیو دربار',
    type: 'live',
    categories: ['drama', 'poetry', 'comedy', 'music'],
    blurb: 'A hosted live block — requests, dedications, and the operator on air.'
  },
  {
    id: 'quran-kareem',
    name: 'Quran Kareem',
    nameUr: 'قرآن کریم',
    type: 'quran',
    categories: ['quran'],
    blurb: 'Recitation and tafsir — the Quran Kareem catalogue, read and explained.'
  },
  {
    id: 'auto-mix',
    name: 'Lumina Auto Mix',
    nameUr: 'لمینا آٹو مکس',
    type: 'auto',
    categories: ['drama', 'espionage', 'crime', 'comedy', 'poetry', 'quran', 'audiobook', 'music'],
    blurb: 'The AI programme — an endless, daypart-aware mix across the whole library.'
  }
]

export const getShow = (id) => shows.find((s) => s.id === id)
export const getCategory = (id) => categories.find((c) => c.id === id)

export const automationRules = [
  {
    id: 'autofill',
    name: 'Auto-fill empty slots',
    desc: 'When the timetable has a gap, the AI dips into the rotation and keeps the stream seamless.',
    enabled: true,
    locked: true
  },
  {
    id: 'station-id',
    name: 'Station ID interval',
    desc: 'Insert a Sada Bahar station ID every 15 minutes between programmes.',
    enabled: true,
    freqMin: 15
  },
  {
    id: 'daypart',
    name: 'Daypart-aware programming',
    desc: 'Match the mood to the hour — poetry at dawn, crime at dusk, night travellers late.',
    enabled: true
  },
  {
    id: 'ai-host',
    name: 'AI voice host',
    desc: 'Neural Pakistani host with a young British station ID. Links programmes in Urdu, never robotic.',
    enabled: true
  },
  {
    id: 'no-repeat',
    name: 'No repeat window',
    desc: 'Avoid replaying the same title within a 90 minute window.',
    enabled: true,
    windowMin: 90
  },
  {
    id: 'crossfade',
    name: 'Crossfade & level match',
    desc: 'Blend item boundaries and normalise speech loudness for a broadcast feel.',
    enabled: true
  },
  {
    id: 'fallback',
    name: 'Fallback rotation',
    desc: 'If a category runs dry, fall back to the full library so the stream never stops.',
    enabled: true
  }
]

let uid = 0
const nextId = (p) => `${p}-${Date.now().toString(36)}-${(uid++).toString(36)}`

export function categoryForTitle(t) {
  const first = (t.genres || [])[0]
  // An explicit catalogue wins, so a title filed under Quran Kareem lands in
  // the Quran block even when its kind or genre would suggest otherwise. Any
  // title that says "Quran" in its name is treated the same way.
  if (first === 'Quran Kareem' || t.kind === 'Quran Kareem' || /quran|qur['’ʻ]?an|koran/i.test(t.name || '')) return 'quran'
  if (first === 'Autobiography' || first === 'Memoir' || t.kind === 'Autobiography') return 'autobiography'
  if (t.kind === 'Audiobook') return 'audiobook'
  if (first === 'Espionage') return 'espionage'
  if (first === 'Crime') return 'crime'
  if (first === 'Comedy') return 'comedy'
  if (first === 'Poetry') return 'poetry'
  if (first === 'Drama') return 'drama'
  return 'drama'
}

export function buildRotation(list = titles) {
  // Serial shells (e.g. the seven Harry Potter parts) have no audio yet, so
  // they cannot be broadcast. Never dereference a missing first episode.
  const items = list.filter((t) => (t.episodes || []).length).map((t) => {
    const ep = t.episodes[0]
    return {
      id: `rot-${t.id}`,
      titleId: t.id,
      name: t.name,
      nameUr: t.nameUr,
      number: t.number,
      category: categoryForTitle(t),
      audio: ep.audio,
      minutes: ep.duration || 22,
      kbps: ep.kbps,
      weight: 1,
      enabled: true,
      synthetic: false
    }
  })
  items.push(
    {
      id: 'rot-id-main',
      name: 'Sada Bahar Station ID',
      nameUr: 'صدابہار اسٹیشن آئی ڈی',
      category: 'id',
      audio: '/audio/radio-live.opus',
      minutes: 1,
      kbps: 40,
      weight: 3,
      enabled: true,
      synthetic: true
    },
    {
      id: 'rot-jingle-dawn',
      name: 'Dawn Jingle',
      nameUr: 'صبح کی دھن',
      category: 'id',
      audio: '/audio/nazm-01.opus',
      minutes: 1,
      kbps: 48,
      weight: 2,
      enabled: true,
      synthetic: true
    },
    {
      id: 'rot-bed-lantern',
      name: 'Lantern Music Bed',
      nameUr: 'لالٹین میوزک بیڈ',
      category: 'music',
      audio: '/audio/nazm-02.opus',
      minutes: 3,
      kbps: 48,
      weight: 1,
      enabled: true,
      synthetic: true
    }
  )
  return items
}

function pattern(startHour, entries) {
  let min = startHour * 60
  return entries.map((e) => {
    const slot = { id: nextId('slot'), start: min, end: min + e.dur, showId: e.showId }
    min += e.dur
    return slot
  })
}

export function generateSchedule() {
  const weekday = pattern(0, [
    { showId: 'raat-musafir', dur: 120 },
    { showId: 'auto-mix', dur: 180 },
    { showId: 'subah-nazm', dur: 180 },
    { showId: 'auto-mix', dur: 120 },
    { showId: 'drama-hour', dur: 120 },
    { showId: 'auto-mix', dur: 300 },
    { showId: 'shaam-crime', dur: 120 },
    { showId: 'live-darbar', dur: 180 },
    { showId: 'raat-musafir', dur: 120 }
  ]).map((s) => ({ ...s, days: [1, 2, 3, 4, 5] }))

  const weekend = pattern(0, [
    { showId: 'raat-musafir', dur: 120 },
    { showId: 'auto-mix', dur: 180 },
    { showId: 'subah-nazm', dur: 180 },
    { showId: 'safar-audiobook', dur: 180 },
    { showId: 'drama-hour', dur: 180 },
    { showId: 'auto-mix', dur: 180 },
    { showId: 'live-darbar', dur: 240 },
    { showId: 'raat-musafir', dur: 180 }
  ]).map((s) => ({ ...s, days: [0, 6] }))

  return [...weekday, ...weekend]
}

export function hhmm(min) {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function minutesOfDay(d) {
  return d.getHours() * 60 + d.getMinutes()
}

export function daypartOf(min) {
  return dayparts.find((d) => min >= d.start && min < d.end) || dayparts[0]
}

export function slotForTime(schedule, day, min) {
  return schedule.find((s) => s.days.includes(day) && min >= s.start && min < s.end) || null
}

export function nextSlot(schedule, day, min) {
  const ordered = schedule
    .filter((s) => s.days.includes(day))
    .sort((a, b) => a.start - b.start)
  return ordered.find((s) => s.start > min) || ordered[0] || null
}

export function playlistForShow(show, rotation) {
  if (!show) return []
  const pool = rotation.filter((r) => r.enabled && show.categories.includes(r.category))
  const fallback = rotation.filter((r) => r.enabled && r.category !== 'id')
  return pool.length ? pool : fallback
}

export function itemAtIndex(list, minutesInto) {
  if (!list.length) return null
  const total = list.reduce((a, r) => a + Math.max(1, r.minutes), 0)
  let offset = ((minutesInto % total) + total) % total
  for (const r of list) {
    const d = Math.max(1, r.minutes)
    if (offset < d) return { item: r, offset, remaining: d - offset, totalCycle: total }
    offset -= d
  }
  return { item: list[0], offset: 0, remaining: list[0].minutes, totalCycle: total }
}

export function airForTime(state, now = new Date()) {
  const day = now.getDay()
  const min = minutesOfDay(now)
  const slot = slotForTime(state.schedule, day, min)
  const show = slot ? getShow(slot.showId) : getShow('auto-mix')
  const rotation = state.rotation
  const list = playlistForShow(show, rotation)
  const minutesInto = slot ? min - slot.start : min
  const at = itemAtIndex(list, minutesInto)
  const after = at ? itemAtIndex(list, minutesInto + 1) : null
  return {
    slot,
    show,
    item: at ? at.item : null,
    progressPct: at ? Math.round((at.offset / Math.max(1, at.item.minutes)) * 100) : 0,
    remainingMin: at ? Math.round(at.remaining) : 0,
    next: after && after.item !== (at && at.item) ? after.item : list[1] || list[0] || null
  }
}

export function estimateListeners(now = new Date(), isLive) {
  const min = minutesOfDay(now)
  const dp = daypartOf(min)
  const base = { late: 420, dawn: 690, morning: 1480, afternoon: 1210, evening: 2360, night: 1780 }[dp.id]
  const wobble = Math.round(Math.sin(min / 23) * 60) + (min % 17) - 8
  const liveBoost = isLive ? 340 : 0
  return Math.max(80, base + wobble + liveBoost)
}

// Who owns the desk right now: 'human' | 'bot' | 'both'.
// Shift windows override the global default owner.
export function controlOwnerAt(now = new Date(), authority = { owner: 'both', shifts: [] }) {
  const min = now.getHours() * 60 + now.getMinutes()
  const day = now.getDay()
  const inWindow = (s) => {
    if (!s.days.includes(day)) return false
    // Windows that cross midnight (start > end) spill into the next day,
    // so a 22:00–02:00 shift still matches 00:30.
    if (s.start < s.end) return min >= s.start && min < s.end
    return min >= s.start || min < s.end
  }
  const hit = (authority.shifts || []).find(inWindow)
  return hit ? hit.owner : authority.owner || 'both'
}

export function newSlot(days = [1, 2, 3, 4, 5]) {
  return { id: nextId('slot'), days: [...days], start: 600, end: 660, showId: 'auto-mix' }
}

export function newRotationItem(t) {
  const ep = t.episodes?.[0]
  if (!ep) return null
  return {
    id: nextId('rot'),
    titleId: t.id,
    name: t.name,
    nameUr: t.nameUr,
    number: t.number,
    category: categoryForTitle(t),
    audio: ep.audio,
    minutes: ep.duration || 22,
    kbps: ep.kbps,
    weight: 1,
    enabled: true,
    synthetic: false
  }
}

export function rotationItemForTitle(rotation, titleId) {
  return rotation.find((r) => r.titleId === titleId)
}

export function titleOfItem(item) {
  return item && item.titleId ? getTitle(item.titleId) : null
}
