export const RECENT_KEY = 'lumina-search-recent-v1'
const WEIGHTS = { name: 10, nameUr: 10, number: 8, author: 6, narrator: 5, genre: 4, synopsis: 2 }

export function normalise(value) {
  return String(value || '').toLowerCase().replace(/[\u064b-\u065f]/g, '').replace(/\s+/g, ' ').trim()
}

export function tokens(q) {
  return normalise(q).split(' ').filter(Boolean)
}

function textScore(value, words, weight) {
  const text = normalise(value)
  if (!text || !words.length) return 0
  let score = 0
  for (const word of words) {
    if (!text.includes(word)) continue
    score += weight
    if (text === word) score += weight
    else if (text.startsWith(word)) score += weight / 2
  }
  return score
}

export function scoreTitle(title, q, extraTexts = []) {
  const words = tokens(q)
  if (!words.length) return 0
  const author = extraTexts[0] || ''
  const narrator = extraTexts[1] || ''
  return (
    textScore(title.name, words, WEIGHTS.name) +
    textScore(title.nameUr, words, WEIGHTS.nameUr) +
    textScore(title.number, words, WEIGHTS.number) +
    textScore(author, words, WEIGHTS.author) +
    textScore(narrator, words, WEIGHTS.narrator) +
    (title.genres || []).reduce((n, g) => n + textScore(g, words, WEIGHTS.genre), 0) +
    textScore(title.synopsis, words, WEIGHTS.synopsis) +
    textScore(title.kind, words, WEIGHTS.genre)
  )
}

export function scoreSeries(series, q) {
  const words = tokens(q)
  return textScore(series.name, words, 10) + textScore(series.nameUr, words, 10) + textScore(series.genre, words, 4)
}

export function scorePerson(person, q) {
  const words = tokens(q)
  return (
    textScore(person.name, words, 10) +
    textScore(person.nameUr, words, 10) +
    textScore(person.role, words, 5) +
    textScore(person.label, words, 5) +
    textScore(person.bio, words, 2)
  )
}

function byScore(a, b) {
  return b.score - a.score || String(a.label || a.name || '').localeCompare(String(b.label || b.name || ''))
}

export function rankResults(results, q, context = {}) {
  const words = tokens(q)
  if (!words.length) return { titles: [], series: [], people: [], genres: [], kinds: [] }
  const titles = (results.titles || []).map((t) => ({
    item: t,
    score: scoreTitle(t, q, [
      context.authorName?.(t) || '',
      context.narratorName?.(t) || ''
    ])
  }))
  const series = (results.series || []).map((s) => ({ item: s, score: scoreSeries(s, q) }))
  const people = (results.people || []).map((p) => ({ item: p, score: scorePerson(p, q) }))
  const genres = (context.genres || []).filter((g) => words.every((w) => normalise(g).includes(w))).map((g) => ({ item: g, score: textScore(g, words, 10) }))
  const kinds = (context.kinds || []).filter((k) => words.every((w) => normalise(k).includes(w))).map((k) => ({ item: k, score: textScore(k, words, 10) }))
  return {
    titles: titles.sort(byScore),
    series: series.sort(byScore),
    people: people.sort(byScore),
    genres: genres.sort(byScore),
    kinds: kinds.sort(byScore)
  }
}

export function highlight(text, q) {
  const source = String(text || '')
  const words = tokens(q)
  if (!words.length) return [{ text: source, hit: false }]
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  return source.split(re).filter(Boolean).map((part) => ({ text: part, hit: words.includes(normalise(part)) }))
}

export function loadRecent() {
  try {
    const list = JSON.parse((typeof localStorage !== 'undefined' && localStorage.getItem(RECENT_KEY)) || '[]')
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string').slice(0, 8) : []
  } catch { return [] }
}

export function clearRecent() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(RECENT_KEY)
  } catch { /* ignore */ }
}

export function addRecent(q) {
  const value = normalise(q)
  if (!value) return loadRecent()
  const next = [value, ...loadRecent().filter((x) => x !== value)].slice(0, 8)
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* ignore quota */ }
  return next
}
