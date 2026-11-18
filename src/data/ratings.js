// Ratings & reviews — Supabase-backed when configured, with a device-local
// mirror so the app keeps working offline (device-first). One rating and one
// review per user per title; whole stars 1–5 for the rating.
import { apiConfigured, getStoredSession, getProfile, rest } from './api'

const LS_RATINGS = 'lumina-ratings'
const LS_REVIEWS = 'lumina-reviews'

export const MAX_BODY = 2000

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {}
  } catch {
    return {}
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

/* ---------------- local mirror helpers ---------------- */

function localRating(titleId) {
  const all = readLocal(LS_RATINGS)
  return all[titleId] || {}
}

function localReview(titleId) {
  const all = readLocal(LS_REVIEWS)
  return all[titleId] || {}
}

function putLocalRating(titleId, userId, stars) {
  const all = readLocal(LS_RATINGS)
  all[titleId] = { ...(all[titleId] || {}), [userId]: { stars, updatedAt: Date.now() } }
  writeLocal(LS_RATINGS, all)
}

function putLocalReview(titleId, userId, body) {
  const all = readLocal(LS_REVIEWS)
  all[titleId] = { ...(all[titleId] || {}), [userId]: { body, updatedAt: Date.now() } }
  writeLocal(LS_REVIEWS, all)
}

function dropLocalReview(titleId, userId) {
  const all = readLocal(LS_REVIEWS)
  if (all[titleId]) {
    delete all[titleId][userId]
    if (!Object.keys(all[titleId]).length) delete all[titleId]
    writeLocal(LS_REVIEWS, all)
  }
}

/* ---------------- summaries ---------------- */

// Weighted nothing, nothing fancy: plain mean, rounded to one decimal.
export function summarise(ratings = []) {
  const stars = ratings.map((r) => Number(r.stars)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 5)
  if (!stars.length) return { count: 0, average: 0, histogram: [0, 0, 0, 0, 0] }
  const histogram = [0, 0, 0, 0, 0]
  for (const s of stars) histogram[Math.round(s) - 1] += 1
  const average = Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10
  return { count: stars.length, average, histogram }
}

/* ---------------- remote (Supabase) ---------------- */

export async function fetchRatings(titleId, signal) {
  if (!apiConfigured() || !titleId) return null
  try {
    const rows = await rest(`ratings?select=user_id,stars,updated_at&title_id=eq.${encodeURIComponent(titleId)}`, { signal })
    return (rows || []).map((r) => ({ userId: r.user_id, stars: r.stars, updatedAt: r.updated_at }))
  } catch {
    return null
  }
}

export async function fetchReviews(titleId, signal) {
  if (!apiConfigured() || !titleId) return null
  try {
    const id = encodeURIComponent(titleId)
    const rows = await rest(`reviews?select=id,user_id,body,created_at,updated_at&title_id=eq.${id}&order=created_at.desc`, { signal })
    const list = rows || []
    const names = await Promise.all(
      [...new Set(list.map((r) => r.user_id))].map(async (uid) => {
        const p = await getProfile(uid).catch(() => null)
        return [uid, p?.username || 'Listener']
      })
    )
    const byId = Object.fromEntries(names)
    return list.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: byId[r.user_id] || 'Listener',
      body: r.body,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  } catch {
    return null
  }
}

async function token() {
  const s = getStoredSession()
  return s?.access_token || ''
}

export async function saveRating(titleId, userId, stars, signal) {
  const value = Math.max(1, Math.min(5, Math.round(Number(stars) || 0)))
  putLocalRating(titleId, userId, value)
  if (!apiConfigured()) return { ok: true, local: true, stars: value }
  try {
    const t = await token()
    await rest('ratings?on_conflict=user_id,title_id', {
      method: 'POST',
      token: t,
      signal,
      prefer: 'resolution=merge-duplicates,return=representation',
      body: { user_id: userId, title_id: titleId, stars: value, updated_at: new Date().toISOString() }
    })
    return { ok: true, local: false, stars: value }
  } catch (e) {
    return { ok: true, local: true, stars: value, pending: String(e.message || e) }
  }
}

export async function saveReview(titleId, userId, body, signal) {
  const text = String(body || '').trim().slice(0, MAX_BODY)
  if (!text) return { ok: false, error: 'Write something first.' }
  putLocalReview(titleId, userId, text)
  if (!apiConfigured()) return { ok: true, local: true }
  try {
    const t = await token()
    await rest('reviews?on_conflict=user_id,title_id', {
      method: 'POST',
      token: t,
      signal,
      prefer: 'resolution=merge-duplicates,return=representation',
      body: { user_id: userId, title_id: titleId, body: text, updated_at: new Date().toISOString() }
    })
    return { ok: true, local: false }
  } catch (e) {
    return { ok: true, local: true, pending: String(e.message || e) }
  }
}

export async function deleteReview(titleId, userId, signal) {
  dropLocalReview(titleId, userId)
  if (!apiConfigured()) return { ok: true, local: true }
  try {
    const t = await token()
    await rest(`reviews?user_id=eq.${encodeURIComponent(userId)}&title_id=eq.${encodeURIComponent(titleId)}`, {
      method: 'DELETE',
      token: t,
      signal,
      prefer: 'return=minimal'
    })
    return { ok: true, local: false }
  } catch (e) {
    return { ok: true, local: true, pending: String(e.message || e) }
  }
}

/* ---------------- merged view used by the UI ---------------- */

// Local entries are merged in so an offline write shows immediately; remote
// rows win on conflict because they carry the shared truth.
export function mergeLocal({ ratings, reviews, titleId, names = {} }) {
  const localR = localRating(titleId)
  const localV = localReview(titleId)
  const rOut = [...(ratings || [])]
  for (const [uid, v] of Object.entries(localR)) {
    const i = rOut.findIndex((r) => r.userId === uid)
    if (i === -1) rOut.push({ userId: uid, stars: v.stars, updatedAt: v.updatedAt, local: true })
  }
  const vOut = [...(reviews || [])]
  for (const [uid, v] of Object.entries(localV)) {
    const i = vOut.findIndex((r) => r.userId === uid)
    if (i === -1) {
      vOut.push({
        id: `local-${uid}`,
        userId: uid,
        name: names[uid] || 'You',
        body: v.body,
        createdAt: v.updatedAt,
        updatedAt: v.updatedAt,
        local: true
      })
    }
  }
  vOut.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return { ratings: rOut, reviews: vOut }
}

export function myLocalRating(titleId, userId) {
  return localRating(titleId)[userId]?.stars || 0
}

export function myLocalReview(titleId, userId) {
  return localReview(titleId)[userId]?.body || ''
}
