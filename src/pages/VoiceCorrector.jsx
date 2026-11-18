import { useMemo, useState } from 'react'
import { voices } from '../data/voices'
import { useCatalog } from '../state/Catalog.jsx'
import {
  defaultAccents,
  languageLabel,
  languages,
  loadStudio,
  saveStudio
} from '../data/voiceStudio'

const LANG_OPTS = [
  { id: 'default', label: 'Follow listener' },
  { id: 'ur', label: 'Urdu' },
  { id: 'en', label: 'English' }
]

export default function VoiceCorrector() {
  const { titles } = useCatalog()
  const [studio, setStudio] = useState(() => loadStudio())
  const [q, setQ] = useState('')
  const [saved, setSaved] = useState(false)

  const persist = (next) => {
    const clean = saveStudio(next)
    setStudio(clean)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return titles
    return titles.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.nameUr || '').includes(q) ||
        (t.number || '').includes(s) ||
        (t.voiceId || '').includes(s)
    )
  }, [q])

  const setAssignment = (titleId, patch) => {
    const prev = studio.assignments[titleId] || {}
    const next = { ...prev, ...patch }
    if (!next.voiceId) delete next.voiceId
    if (!next.language || next.language === 'default') delete next.language
    const assignments = { ...studio.assignments }
    if (!next.voiceId && !next.language) delete assignments[titleId]
    else assignments[titleId] = next
    persist({ ...studio, assignments })
  }

  const setAccent = (voiceId, field, value) => {
    persist({
      ...studio,
      accents: { ...studio.accents, [voiceId]: { ...studio.accents[voiceId], [field]: value } }
    })
  }

  const resetAccents = () => persist({ ...studio, accents: { ...defaultAccents } })
  const resetAssignments = () => persist({ ...studio, assignments: {} })

  return (
    <>
      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Language &amp; voice corrector</h2>
          {saved ? <span className="tag live">saved</span> : null}
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Reassign narrators and spoken language per title. Listener language applies unless a title is locked here, or studio lock is on.
        </p>
        <div className="voice-corrector-grid">
          <label className="field">
            <span>Studio default language</span>
            <select
              className="select"
              value={studio.defaultLanguage}
              onChange={(e) => persist({ ...studio, defaultLanguage: e.target.value })}
            >
              <option value="listener">Listener choice</option>
              {languages().map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label} · {l.native}
                </option>
              ))}
            </select>
          </label>
          <div className="set-row" style={{ padding: 0, border: 0 }}>
            <div>
              <h3>Lock language</h3>
              <p>Override every listener with the studio default.</p>
            </div>
            <button
              className={`toggle ${studio.lockLanguage ? 'on' : ''}`}
              onClick={() => persist({ ...studio, lockLanguage: !studio.lockLanguage })}
              aria-label="Lock language"
            >
              <i />
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Accent</h2>
          <button className="btn btn-ghost" onClick={resetAccents}>Reset accents</button>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Rate and pitch used when regenerating neural speech. British voices stay on English; Pakistani voices stay on Urdu.
        </p>
        <div className="accent-list">
          {voices.map((v) => {
            const a = studio.accents[v.id] || defaultAccents[v.id]
            return (
              <div className="accent-row" key={v.id}>
                <div>
                  <strong>{v.name}</strong>
                  <div className="meta">{v.label} · {v.locale}</div>
                </div>
                <label className="field">
                  <span>Rate {a.rate > 0 ? '+' : ''}{a.rate}%</span>
                  <input
                    type="range"
                    min="-8"
                    max="12"
                    value={a.rate}
                    onChange={(e) => setAccent(v.id, 'rate', Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>Pitch {a.pitch > 0 ? '+' : ''}{a.pitch} Hz</span>
                  <input
                    type="range"
                    min="-8"
                    max="14"
                    value={a.pitch}
                    onChange={(e) => setAccent(v.id, 'pitch', Number(e.target.value))}
                  />
                </label>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Title voices</h2>
          <button className="btn btn-ghost" onClick={resetAssignments}>Reset titles</button>
        </div>
        <input
          className="search-input"
          placeholder="Search titles, Urdu names, voice ids"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 12, width: '100%' }}
        />
        <div className="voice-assign-list">
          {filtered.map((t) => {
            const asg = studio.assignments[t.id] || {}
            const voiceId = asg.voiceId || t.voiceId || ''
            const language = asg.language || 'default'
            return (
              <div className="voice-assign-row" key={t.id}>
                <div>
                  <div className="t">{t.number ? `${t.number} ${t.name}` : t.name}</div>
                  <div className="meta">
                    {t.kind}
                    {t.nameUr ? ` · ${t.nameUr}` : ''}
                    {asg.voiceId || asg.language ? ` · override ${languageLabel(asg.language)}` : ''}
                  </div>
                </div>
                <select
                  className="select"
                  value={voiceId}
                  onChange={(e) => setAssignment(t.id, { voiceId: e.target.value })}
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.label}
                    </option>
                  ))}
                </select>
                <select
                  className="select"
                  value={language}
                  onChange={(e) => setAssignment(t.id, { language: e.target.value })}
                >
                  {LANG_OPTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
