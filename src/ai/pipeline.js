// Lumina Bot · provider pipeline with fallback and daily token budgets.
// Tries each keyed provider in order; on quota/429/error it falls through to
// the next. When every remote provider is unavailable the offline agent in
// brain.js takes over, so the bot never goes dark.
import { allProviders, estimateTokens, loadBudget, loadCustom } from './providers'

const LS_USAGE = 'lumina-ai-usage'
const COOLDOWN_MS = 5 * 60 * 1000

// --- daily usage accounting (localStorage, resets when the date changes) ---
function readUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(LS_USAGE) || '{}')
    const today = new Date().toDateString()
    if (u.date !== today) return { date: today, tokens: {} }
    return u
  } catch {
    return { date: new Date().toDateString(), tokens: {} }
  }
}

function writeUsage(u) {
  try {
    localStorage.setItem(LS_USAGE, JSON.stringify(u))
  } catch {
    /* ignore */
  }
}

export function tokensToday(providerId) {
  return readUsage().tokens[providerId] || 0
}

function addTokens(providerId, n) {
  const u = readUsage()
  u.tokens[providerId] = (u.tokens[providerId] || 0) + n
  writeUsage(u)
}

// --- provider health (in-memory, per session) ---
const health = {}
function healthFor(id) {
  if (!health[id]) health[id] = { ok: false, lastError: '', cooldownUntil: 0 }
  return health[id]
}
allProviders().forEach((p) => healthFor(p.id))

export function providerHealth() {
  return health
}

export function providerStatus() {
  const budget = loadBudget()
  const customKeys = Object.fromEntries(loadCustom().map((c) => [c.id, c.key]))
  return allProviders().map((p) => ({
    id: p.id,
    name: p.name,
    custom: !!p.custom,
    hasKey: !!customKeys[p.id],
    used: tokensToday(p.id),
    budget,
    cooldown: Math.max(0, healthFor(p.id).cooldownUntil - Date.now()) > 0
  }))
}

/**
 * Run a prompt through the fallback chain.
 * `messages` = [{role, content}]. Returns
 *   { text, provider, tokens, offline: false }  on remote success
 *   { text, provider: 'offline', tokens: 0, offline: true }  when all fail.
 */
export async function runPipeline(messages, keys, signal) {
  const budget = loadBudget()
  const customKeys = Object.fromEntries(loadCustom().map((c) => [c.id, c.key]))
  for (const p of allProviders()) {
    const h = healthFor(p.id)
    const key = customKeys[p.id] || keys?.[p.id]
    if (!key) continue
    if (h.cooldownUntil > Date.now()) continue
    const used = tokensToday(p.id)
    if (used >= budget) continue
    try {
      const res = await p.call({ messages, key, signal })
      const tokens = res.tokens || estimateTokens(res.text)
      addTokens(p.id, tokens)
      h.ok = true
      h.lastError = ''
      if (!res.text?.trim()) throw new Error('empty response')
      return { text: res.text, provider: p.id, tokens, offline: false }
    } catch (e) {
      h.ok = false
      h.lastError = String(e.message || e)
      // Quota / rate-limit style failures earn a cooldown; others just fall through.
      if (/429|quota|rate/i.test(h.lastError)) h.cooldownUntil = Date.now() + COOLDOWN_MS
    }
  }
  return null
}
