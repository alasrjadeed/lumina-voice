import { describe, expect, it } from 'vitest'
import {
  DAYS,
  buildRotation,
  generateSchedule,
  getShow,
  hhmm,
  nextSlot,
  slotForTime,
  controlOwnerAt
} from '../src/data/broadcast.js'

describe('broadcast.buildRotation', () => {
  it('skips serial parts that have no audio yet instead of crashing', () => {
    const rotation = buildRotation()
    expect(rotation.length).toBeGreaterThan(0)
    expect(rotation.some((r) => String(r.titleId).startsWith('hp-'))).toBe(false)
    for (const item of rotation) expect(typeof item.audio).toBe('string')
  })
})

describe('broadcast.generateSchedule', () => {
  const schedule = generateSchedule()

  it('covers a full day for weekday and weekend patterns', () => {
    for (const day of [1, 5]) {
      const slots = schedule.filter((s) => s.days.includes(day)).sort((a, b) => a.start - b.start)
      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0].start).toBe(0)
      for (let i = 1; i < slots.length; i += 1) {
        expect(slots[i].start).toBe(slots[i - 1].end) // contiguous, no gaps
      }
      expect(slots[slots.length - 1].end).toBe(1440)
    }
    for (const day of [0, 6]) {
      const slots = schedule.filter((s) => s.days.includes(day)).sort((a, b) => a.start - b.start)
      expect(slots[0].start).toBe(0)
      expect(slots[slots.length - 1].end).toBe(1440)
    }
  })

  it('only references valid days and existing shows', () => {
    for (const s of schedule) {
      expect(s.days.length).toBeGreaterThan(0)
      s.days.forEach((d) => expect(DAYS[d]).toBeTypeOf('string'))
      expect(getShow(s.showId)).toBeTruthy()
      expect(s.end).toBeGreaterThan(s.start)
    }
  })

  it('slotForTime returns the airing show at a given minute', () => {
    const slot = slotForTime(schedule, 3, 600) // Wednesday 10:00
    expect(slot).toBeTruthy()
    expect(slot.days).toContain(3)
    expect(slot.start).toBeLessThanOrEqual(600)
    expect(slot.end).toBeGreaterThan(600)
    expect(getShow(slot.showId)).toBeTruthy()
  })

  it('nextSlot finds a later slot on the same day', () => {
    const slot = nextSlot(schedule, 2, 0) // Tuesday midnight
    expect(slot).toBeTruthy()
    expect(slot.start).toBeGreaterThan(0)
  })

  it('hhmm formats minutes of day', () => {
    expect(hhmm(0)).toBe('00:00')
    expect(hhmm(610)).toBe('10:10')
    expect(hhmm(1439)).toBe('23:59')
  })
})

describe('broadcast.controlOwnerAt', () => {
  const at = (h, m, day = 2) => new Date(2026, 0, 6 + ((day - 2 + 7) % 7), h, m)

  it('falls back to the global owner when no shift matches', () => {
    expect(controlOwnerAt(at(10, 0), { owner: 'human', shifts: [] })).toBe('human')
    expect(controlOwnerAt(at(10, 0), { owner: 'bot', shifts: [] })).toBe('bot')
  })

  it('applies a matching day/time shift over the global owner', () => {
    const auth = { owner: 'human', shifts: [{ id: 's1', days: [2], start: 540, end: 1080, owner: 'bot' }] }
    expect(controlOwnerAt(at(9, 30), auth)).toBe('bot')
    expect(controlOwnerAt(at(8, 59), auth)).toBe('human')
    expect(controlOwnerAt(at(18, 0), auth)).toBe('human') // end is exclusive
  })

  it('handles shift windows that cross midnight', () => {
    const auth = { owner: 'human', shifts: [{ id: 's2', days: [2], start: 1320, end: 120, owner: 'bot' }] }
    expect(controlOwnerAt(at(23, 30), auth)).toBe('bot')
    expect(controlOwnerAt(at(0, 30), auth)).toBe('bot')
    expect(controlOwnerAt(at(1, 59), auth)).toBe('bot')
    expect(controlOwnerAt(at(2, 0), auth)).toBe('human')
    expect(controlOwnerAt(at(12, 0), auth)).toBe('human')
  })
})
