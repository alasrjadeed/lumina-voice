// Show reminders for Lumina Voice — local scheduled notifications for upcoming
// scheduled shows (fires N minutes before a slot starts).
//
// These are *local* reminders: the page schedules a timer and the service worker
// posts the notification when it fires, while Lumina Voice is open (or installed
// and kept running). True server-pushed Web Push (arriving with the app closed)
// needs a backend with VAPID keys; this covers the client-only case honestly.

import { getShow, hhmm } from './data/broadcast'
import { RADIO_ENABLED } from './config/features.js'

const LEAD_MIN = 10

let timers = []

export function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
}

export function cancelReminders() {
  timers.forEach((t) => clearTimeout(t))
  timers = []
}

async function fire(slot) {
  const show = getShow(slot.showId)
  const title = show?.name || 'Lumina Voice'
  const opts = {
    body: `Starts at ${hhmm(slot.start)} on Sada Bahar — ${show?.blurb || 'live now in ten minutes'}`,
    icon: '/icon-192.png',
    badge: '/icon-512.png',
    tag: `show-${slot.showId}-${slot.days.join('')}-${slot.start}`,
    data: { path: RADIO_ENABLED ? '/radio' : '/' },
    renotify: false
  }
  try {
    if (navigator.serviceWorker?.ready) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, opts)
      return
    }
  } catch {
    /* fall through to plain Notification */
  }
  try {
    new Notification(title, opts)
  } catch {
    /* denied / unsupported */
  }
}

// Schedule reminders for the next `max` upcoming slots of today. Returns how
// many timers were armed (0 when notifications are unavailable).
export function scheduleShowReminders(schedule, { max = 6, leadMin = LEAD_MIN } = {}) {
  if (!RADIO_ENABLED) return
  cancelReminders()
  if (!canNotify() || !Array.isArray(schedule) || !schedule.length) return 0
  const now = new Date()
  const today = now.getDay()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const upcoming = schedule
    .filter((s) => s.days.includes(today) && s.start > nowMin)
    .sort((a, b) => a.start - b.start)
    .slice(0, max)
  upcoming.forEach((slot) => {
    const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(slot.start / 60), slot.start % 60)
    const fireAt = startsAt.getTime() - leadMin * 60000
    const delay = fireAt - now.getTime()
    if (delay <= 0) return
    timers.push(setTimeout(() => fire(slot), delay))
  })
  return timers.length
}

// Re-arm reminders from the persisted Broadcast schedule (Settings / boot use).
export function rescheduleFromStore() {
  try {
    const raw = JSON.parse(localStorage.getItem('lumina-broadcast-v1') || 'null')
    const schedule = raw?.schedule
    if (Array.isArray(schedule) && schedule.length) return scheduleShowReminders(schedule)
  } catch {
    /* ignore */
  }
  return 0
}
