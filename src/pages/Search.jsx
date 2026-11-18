import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { useCatalog } from '../state/Catalog.jsx'
import { CoverArt, AvatarArt } from '../art/covers'
import { useArtwork } from '../state/Artwork.jsx'
import { BackBtn, TitleTile } from '../ui/Bits'
import { IcoPlay, IcoVoice, IcoX } from '../ui/Icons'
import { listenOnce, sttSupported } from '../ai/deviceVoice'
import { addRecent, clearRecent, highlight, loadRecent, rankResults } from '../data/search'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'titles', label: 'Titles' },
  { id: 'series', label: 'Series' },
  { id: 'people', label: 'People' },
  { id: 'genres', label: 'Genres' }
]

function Hit({ text, q }) {
  return highlight(text, q).map((part, i) => (
    part.hit ? <mark key={i} className="search-hit">{part.text}</mark> : <span key={i}>{part.text}</span>
  ))
}

export default function Search() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [recent, setRecent] = useState(() => loadRecent())
  const [listening, setListening] = useState(false)
  const { searchCatalog, getAuthor, titlesBySeries, genres, kinds, titles } = useCatalog()
  const { coverFor, portraitFor } = useArtwork()
  const { resumeTitle } = useApp()
  const nav = useNavigate()

  const raw = useMemo(() => searchCatalog(q), [q, searchCatalog])
  const results = useMemo(() => rankResults(raw, q, {
    genres,
    kinds,
    authorName: (t) => getAuthor(t.authorId)?.name || '',
    narratorName: () => ''
  }), [raw, q, genres, kinds, getAuthor])

  const has = q.trim().length > 0
  const total = results.titles.length + results.series.length + results.people.length + results.genres.length + results.kinds.length
  const popular = useMemo(() => genres.slice(0, 8), [genres])
  const picks = useMemo(() => titles.filter((t) => t.top).slice(0, 6), [titles])

  const submit = (e) => {
    e.preventDefault()
    setRecent(addRecent(q))
  }

  const mic = () => {
    if (!sttSupported()) return
    setListening(true)
    listenOnce({
      lang: 'ur-PK',
      onResult: (text) => setQ(text),
      onEnd: () => setListening(false),
      onError: () => setListening(false)
    })
  }

  const play = (t) => {
    const r = resumeTitle(t.id)
    if (!r?.locked) nav('/now')
  }

  const visible = (id) => filter === 'all' || filter === id

  return (
    <div className="search-page">
      <div className="search-top">
        <BackBtn />
        <form className="search-input" onSubmit={submit} role="search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setFilter('all') }}
            placeholder="Titles, writers, voices, genres…"
            aria-label="Search the library"
            autoFocus
          />
          {q ? <button type="button" className="search-icon-btn" onClick={() => setQ('')} aria-label="Clear search"><IcoX size={16} /></button> : null}
          {sttSupported() ? (
            <button type="button" className={`search-icon-btn ${listening ? 'listening' : ''}`} onClick={mic} aria-label="Speak search">
              <IcoVoice size={16} />
            </button>
          ) : null}
        </form>
      </div>

      {has ? (
        <>
          <div className="search-filters" role="group" aria-label="Filter results">
            {FILTERS.map((f) => {
              const n = f.id === 'all' ? total : results[f.id]?.length || 0
              return (
                <button key={f.id} className={`chip ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>
                  {f.label} <span>{n}</span>
                </button>
              )
            })}
          </div>
          <p className="search-count" aria-live="polite">{total} {total === 1 ? 'result' : 'results'} for “{q}”</p>
        </>
      ) : null}

      {!has ? (
        <>
          {recent.length ? (
            <section className="search-section">
              <div className="search-section-head">
                <h2>Recent searches</h2>
                <button className="linkish" onClick={() => { clearRecent(); setRecent([]) }}>Clear</button>
              </div>
              <div className="search-chips">
                {recent.map((r) => <button key={r} className="chip" onClick={() => setQ(r)}>{r}</button>)}
              </div>
            </section>
          ) : null}
          <section className="search-section">
            <div className="search-section-head"><h2>Browse by genre</h2></div>
            <div className="search-chips">
              {popular.map((g) => <button key={g} className="chip" onClick={() => setQ(g)}>{g}</button>)}
            </div>
          </section>
          <section className="search-section">
            <div className="search-section-head">
              <h2>Hand-picked</h2>
              <Link to="/explore" className="linkish">Explore all →</Link>
            </div>
            <div className="search-tiles">{picks.map((t) => <TitleTile key={t.id} t={t} />)}</div>
          </section>
          <p className="search-tip">Try a title, a poet, a narrator, or a genre — Urdu and English both work.</p>
        </>
      ) : null}

      {has && !total ? (
        <div className="empty search-none">
          <h3>No matches</h3>
          <p>Nothing in the Lumina library for “{q}”. Try a shorter word or a genre.</p>
        </div>
      ) : null}

      {has && visible('titles') && results.titles.length ? (
        <section className="search-section">
          <div className="search-section-head"><h2>Titles <span>{results.titles.length}</span></h2></div>
          <div className="search-results">
            {results.titles.map(({ item: t }) => (
              <div className="search-row" key={t.id}>
                <Link to={`/title/${t.id}`} className="search-link">
                  <div className="thumb"><CoverArt id={t.cover} title={t.name} number={t.number} src={coverFor(t)} t={t} className="cover-art" /></div>
                  <div className="search-text">
                    <div className="ttl"><Hit text={t.name} q={q} /></div>
                    {t.nameUr ? <div className="sub urdu-inline"><Hit text={t.nameUr} q={q} /></div> : null}
                    <div className="sub">{getAuthor(t.authorId)?.name || 'Lumina Voice'} · {t.kind}{t.imported ? ' · imported' : ''}</div>
                  </div>
                </Link>
                <button className="search-play" onClick={() => play(t)} aria-label={`Play ${t.name}`}><IcoPlay size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {has && visible('series') && results.series.length ? (
        <section className="search-section">
          <div className="search-section-head"><h2>Series <span>{results.series.length}</span></h2></div>
          <div className="search-results">
            {results.series.map(({ item: s }) => {
              const first = titlesBySeries(s.id)[0]
              return (
                <Link to={`/series/${s.id}`} className="search-link search-row" key={s.id}>
                  <div className="thumb"><CoverArt id="cipher1" title={s.name} src={coverFor(first)} t={first} className="cover-art" /></div>
                  <div className="search-text">
                    <div className="ttl"><Hit text={s.name} q={q} /></div>
                    {s.nameUr ? <div className="sub urdu-inline"><Hit text={s.nameUr} q={q} /></div> : null}
                    <div className="sub">Series · {titlesBySeries(s.id).length} titles</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {has && visible('people') && results.people.length ? (
        <section className="search-section">
          <div className="search-section-head"><h2>People <span>{results.people.length}</span></h2></div>
          <div className="search-results">
            {results.people.map(({ item: p }) => (
              <Link to={`/person/${p.id}`} className="search-link search-row" key={p.id}>
                <div className="thumb round"><AvatarArt name={p.name} seed={p.id} src={portraitFor(p)} /></div>
                <div className="search-text">
                  <div className="ttl"><Hit text={p.name} q={q} /></div>
                  <div className="sub">{p.label || p.role}{p.kind === 'voice' ? ' · voice artist' : ''}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {has && visible('genres') && results.genres.length ? (
        <section className="search-section">
          <div className="search-section-head"><h2>Genres <span>{results.genres.length}</span></h2></div>
          <div className="search-chips">
            {results.genres.map(({ item: g }) => <Link key={g} to={`/genre/${encodeURIComponent(g)}`} className="chip"><Hit text={g} q={q} /></Link>)}
          </div>
        </section>
      ) : null}
    </div>
  )
}
