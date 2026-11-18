// Lumina Bot · free / daily-token AI providers.
// Each provider is called through the same shape:
//   call({ messages, tools, signal }) -> { text, tokens }
// Keys live in localStorage (Settings → AI services). Missing key = skipped.
// All listed tiers are free-daily-quota services; the daily token budget is
// enforced in pipeline.js on top of the provider's own quota.

const LS_KEYS = 'lumina-ai-keys'
const LS_BUDGET = 'lumina-ai-budget'

export const DEFAULT_DAILY_BUDGET = 200000 // tokens per provider per day

export function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS) || '{}')
  } catch {
    return {}
  }
}

export function saveKeys(keys) {
  try {
    localStorage.setItem(LS_KEYS, JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

export function loadBudget() {
  const n = Number(localStorage.getItem(LS_BUDGET))
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_BUDGET
}

export function saveBudget(n) {
  try {
    localStorage.setItem(LS_BUDGET, String(Math.max(1000, Number(n) || DEFAULT_DAILY_BUDGET)))
  } catch {
    /* ignore */
  }
}

// Rough token estimate for budget accounting (chars / 4).
export const estimateTokens = (s) => Math.ceil((s || '').length / 4)

async function jsonFetch(url, opts, signal) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20000)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener?.('abort', onAbort)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    clearTimeout(t)
    signal?.removeEventListener?.('abort', onAbort)
  }
}

async function geminiCall({ messages, key }) {
  const body = {
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  }
  const data = await jsonFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  const tokens = data?.usageMetadata?.totalTokenCount || estimateTokens(text)
  return { text, tokens }
}

async function openaiCompatible({ url, model, messages, key }) {
  const data = await jsonFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages })
  })
  const text = data?.choices?.[0]?.message?.content || ''
  const tokens = (data?.usage?.total_tokens) || estimateTokens(text)
  return { text, tokens }
}

// Registry — order matters: this is the fallback chain.
export const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini (free)',
    hint: 'aistudio.google.com → Get API key',
    call: ({ messages, key }) => geminiCall({ messages, key })
  },
  {
    id: 'groq',
    name: 'Groq (free daily)',
    hint: 'console.groq.com → API keys',
    call: ({ messages, key }) =>
      openaiCompatible({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        messages,
        key
      })
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (free models)',
    hint: 'openrouter.ai → Keys',
    call: ({ messages, key }) =>
      openaiCompatible({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages,
        key
      })
  },
  {
    id: 'mistral',
    name: 'Mistral (free tier)',
    hint: 'console.mistral.ai → API keys',
    call: ({ messages, key }) =>
      openaiCompatible({
        url: 'https://api.mistral.ai/v1/chat/completions',
        model: 'mistral-small-latest',
        messages,
        key
      })
  }
]

// --- user-added custom providers (OpenAI-compatible endpoints) --------------
const LS_CUSTOM = 'lumina-ai-custom'

export function loadCustom() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]')
    return Array.isArray(list) ? list.filter((c) => c && c.id && c.baseUrl) : []
  } catch {
    return []
  }
}

export function saveCustom(list) {
  try {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(Array.isArray(list) ? list : []))
  } catch {
    /* ignore */
  }
}

export function newCustomProvider() {
  return { id: `custom-${Date.now()}`, name: 'My provider', baseUrl: '', model: '', key: '' }
}

// Built-ins + customs as one callable chain (customs run last).
export function allProviders() {
  return [
    ...PROVIDERS,
    ...loadCustom().map((c) => ({
      id: c.id,
      name: c.name || c.baseUrl,
      hint: c.baseUrl,
      custom: true,
      call: ({ messages, key }) => {
        const base = c.baseUrl.replace(/\/+$/, '')
        const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`
        return openaiCompatible({ url, model: c.model || 'gpt-4o-mini', messages, key })
      }
    }))
  ]
}
