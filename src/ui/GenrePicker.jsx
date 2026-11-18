import { useState } from 'react'
import { sanitiseGenreName } from '../data/userCatalog'
import { IcoCheck, IcoPlusSmall, IcoX } from './Icons'

// A clickable genre field. Every known genre is offered as a pill — click to
// add, click again to take it off — and an operator can type a name the
// library has never seen. A new name is registered globally, so it shows up as
// a shelf on Explore and as a pill everywhere else afterwards.
//
// `value` is the list of genres on the thing being edited; `onChange` receives
// the whole next list, so an added custom genre and a removed bundled one take
// the same path.
export default function GenrePicker({
  value = [],
  onChange,
  options = [],
  onAddGenre,
  onRemoveGenre,
  label = 'Genres',
  max = 8
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const selected = Array.isArray(value) ? value.filter(Boolean) : []
  const has = (name) => selected.some((g) => g.toLowerCase() === String(name).toLowerCase())
  const customNames = new Set((options || []).map((g) => String(g).toLowerCase()))

  const add = (name) => {
    const clean = sanitiseGenreName(name)
    if (!clean) return
    if (has(clean)) return
    if (selected.length >= max) return
    onAddGenre?.(clean)
    onChange?.([...selected, clean])
  }

  const remove = (name) => {
    onChange?.(selected.filter((g) => g.toLowerCase() !== String(name).toLowerCase()))
  }

  // Genres used by a title but not in the registry still deserve a pill, so the
  // painted state is the union — otherwise a hand-typed name would look absent.
  const pills = []
  const seen = new Set()
  for (const g of [...(options || []), ...selected]) {
    const key = String(g).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    pills.push(g)
  }

  const submitDraft = () => {
    add(draft)
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="genre-picker">
      <div className="genre-pills">
        {pills.map((g) => {
          const on = has(g)
          const custom = !customNames.has(String(g).toLowerCase())
          return (
            <button
              key={g}
              type="button"
              className={`genre-pill ${on ? 'on' : ''}`}
              onClick={() => (on ? remove(g) : add(g))}
              aria-pressed={on}
              title={on ? `Remove ${g}` : `Add ${g}`}
            >
              {g}
              {on ? <span className="genre-x" aria-hidden="true">×</span> : null}
              {custom ? (
                <span
                  className="genre-del"
                  role="button"
                  tabIndex={0}
                  aria-label={`Delete the ${g} genre`}
                  title={`Delete the ${g} genre from the library`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (on) remove(g)
                    onRemoveGenre?.(g)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    e.stopPropagation()
                    if (on) remove(g)
                    onRemoveGenre?.(g)
                  }}
                >
                  ×
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {adding ? (
        <div className="genre-add">
          <input
            className="search-input"
            autoFocus
            value={draft}
            placeholder="New genre name…"
            aria-label={`New ${label.toLowerCase()} name`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitDraft()
              }
              if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={submitDraft} disabled={!draft.trim()}>
            <IcoCheck /> Add
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDraft('')
              setAdding(false)
            }}
          >
            <IcoX /> Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost genre-new" onClick={() => setAdding(true)}>
          <IcoPlusSmall /> Custom genre
        </button>
      )}

      <p className="meta genre-hint">
        {selected.length
          ? `${selected.length} selected — click a pill to take it off.`
          : 'Click a genre to add it.'}
        {selected.length >= max ? ` A title holds up to ${max}.` : ''}
      </p>
    </div>
  )
}
