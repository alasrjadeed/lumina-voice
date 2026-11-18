import { useState } from 'react'
import {
  PROVIDERS,
  loadKeys,
  saveKeys,
  loadBudget,
  saveBudget,
  loadCustom,
  saveCustom,
  newCustomProvider
} from '../ai/providers'
import { runPipeline, tokensToday } from '../ai/pipeline'
import { IcoPlus, IcoTrash } from '../ui/Icons'

// AI services management — used in Settings (full) and linkable from the bot.
export default function AIServices() {
  const [keys, setKeys] = useState(() => loadKeys())
  const [budget, setBudget] = useState(() => loadBudget())
  const [custom, setCustom] = useState(() => loadCustom())
  const [test, setTest] = useState({}) // id -> {busy, ok, msg}

  const setKey = (id, v) => {
    const k = { ...keys, [id]: v.trim() }
    setKeys(k)
    saveKeys(k)
  }

  const setCustomField = (id, field, v) => {
    const list = custom.map((c) => (c.id === id ? { ...c, [field]: v } : c))
    setCustom(list)
    saveCustom(list)
  }

  const addCustom = () => {
    const list = [...custom, newCustomProvider()]
    setCustom(list)
    saveCustom(list)
  }

  const removeCustom = (id) => {
    const list = custom.filter((c) => c.id !== id)
    setCustom(list)
    saveCustom(list)
  }

  const testProvider = async (id, key) => {
    if (!key) return
    setTest((t) => ({ ...t, [id]: { busy: true } }))
    const started = Date.now()
    const res = await runPipeline(
      [
        { role: 'system', content: 'Reply with exactly: OK' },
        { role: 'user', content: 'ping' }
      ],
      { [id]: key }
    )
    const ok = !!res && res.provider === id
    setTest((t) => ({
      ...t,
      [id]: {
        busy: false,
        ok,
        msg: ok ? `✓ ${Date.now() - started}ms` : res ? `fell through to ${res.provider}` : '✗ unreachable or quota exceeded'
      }
    }))
  }

  const chain = [...PROVIDERS.map((p) => ({ id: p.id, name: p.name, key: keys[p.id] || '' })), ...custom.map((c) => ({ id: c.id, name: c.name || c.baseUrl, key: c.key || '' }))]

  return (
    <>
      {PROVIDERS.map((p) => (
        <div className="set-row" key={p.id}>
          <div style={{ minWidth: 0 }}>
            <h3>
              {p.name}
              {keys[p.id] ? <span className="tag live" style={{ marginLeft: 8 }}>key set</span> : null}
              <span className="meta" style={{ marginLeft: 8 }}>
                {tokensToday(p.id).toLocaleString()} tokens today
              </span>
            </h3>
            <p>
              Free key: <span className="ai-hint">{p.hint}</span>
            </p>
            <div className="ai-key-row">
              <input
                className="search-input"
                type="password"
                placeholder="API key (empty = skip agent)"
                value={keys[p.id] || ''}
                onChange={(e) => setKey(p.id, e.target.value)}
              />
              <button
                className="btn btn-ghost"
                disabled={!keys[p.id] || test[p.id]?.busy}
                onClick={() => testProvider(p.id, keys[p.id])}
              >
                {test[p.id]?.busy ? 'Testing…' : 'Test'}
              </button>
            </div>
            {test[p.id]?.msg ? (
              <p className="meta" style={{ color: test[p.id].ok ? 'var(--green)' : 'var(--muted)' }}>
                {test[p.id].msg}
              </p>
            ) : null}
          </div>
        </div>
      ))}

      <div className="set-row">
        <div style={{ minWidth: 0, width: '100%' }}>
          <h3>
            Custom providers
            <button className="btn btn-ghost" style={{ marginLeft: 10, height: 30 }} onClick={addCustom}>
              <IcoPlus /> Add provider
            </button>
          </h3>
          <p>
            Any OpenAI-compatible endpoint (base URL + model + key). Tried after the built-ins in the fallback chain.
          </p>
          {custom.map((c) => (
            <div className="custom-provider" key={c.id}>
              <input
                className="search-input"
                placeholder="Name (e.g. Together, local Ollama)"
                value={c.name}
                onChange={(e) => setCustomField(c.id, 'name', e.target.value)}
              />
              <input
                className="search-input"
                placeholder="Base URL (https://api.example.com/v1)"
                value={c.baseUrl}
                onChange={(e) => setCustomField(c.id, 'baseUrl', e.target.value)}
              />
              <input
                className="search-input"
                placeholder="Model (e.g. llama-3.3-70b)"
                value={c.model}
                onChange={(e) => setCustomField(c.id, 'model', e.target.value)}
              />
              <input
                className="search-input"
                type="password"
                placeholder="API key"
                value={c.key}
                onChange={(e) => setCustomField(c.id, 'key', e.target.value)}
              />
              <div className="custom-actions">
                <button
                  className="btn btn-ghost"
                  disabled={!c.key || !c.baseUrl || test[c.id]?.busy}
                  onClick={() => testProvider(c.id, c.key)}
                >
                  {test[c.id]?.busy ? '…' : 'Test'}
                </button>
                <button className="icon-btn" aria-label="Remove provider" onClick={() => removeCustom(c.id)}>
                  <IcoTrash />
                </button>
              </div>
              {test[c.id]?.msg ? (
                <p className="meta" style={{ color: test[c.id].ok ? 'var(--green)' : 'var(--muted)', gridColumn: '1 / -1' }}>
                  {test[c.id].msg}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="set-row">
        <div style={{ minWidth: 0 }}>
          <h3>Daily token budget per agent — {budget.toLocaleString()}</h3>
          <p>Quota guard on top of each provider's own free-tier limit. Counters reset at midnight.</p>
          <input
            type="range"
            min="10000"
            max="1000000"
            step="10000"
            value={budget}
            onChange={(e) => {
              const v = Number(e.target.value)
              setBudget(v)
              saveBudget(v)
            }}
          />
        </div>
      </div>

      <div className="set-row">
        <div style={{ minWidth: 0, width: '100%' }}>
          <h3>Fallback chain</h3>
          <p>
            Lumina Bot tries agents in order; quota or error advances to the next. When every agent is unavailable a
            built-in offline agent (no key, no network) keeps the bot alive.
          </p>
          <div className="pipe-chain">
            {chain.map((c) => (
              <span className={`pipe-node ${c.key ? 'ok' : ''}`} key={c.id}>
                {c.name}
              </span>
            ))}
            <span className="pipe-node offline">offline agent</span>
          </div>
        </div>
      </div>
    </>
  )
}
