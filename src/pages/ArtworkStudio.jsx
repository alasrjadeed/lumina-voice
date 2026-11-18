import { useMemo, useState } from 'react'
import { voices } from '../data/voices'
import { useCatalog } from '../state/Catalog.jsx'
import { CoverArt, AvatarArt } from '../art/covers'
import { useArtwork } from '../state/Artwork.jsx'
import { archiveCoverUrl, isLikelyImageUrl, readImageFile } from '../data/artwork'

export default function ArtworkStudio() {
  const { authors, poets, titles } = useCatalog()
  const people = useMemo(
    () => [
      ...authors.map((p) => ({ ...p, kind: 'Author' })),
      ...poets.map((p) => ({ ...p, kind: 'Poet' })),
      ...voices.map((p) => ({ ...p, kind: 'Voice artist' }))
    ],
    [authors, poets]
  )
  const { coverFor, portraitFor, setCover, setPortrait, resetAll, covers, people: portraits } = useArtwork()
  const [tab, setTab] = useState('covers')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(false)

  const filteredTitles = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || tab !== 'covers') return titles
    return titles.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.nameUr || '').includes(q) ||
        (t.number || '').includes(s)
    )
  }, [q, tab, titles])

  const filteredPeople = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || tab !== 'people') return people
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.nameUr || '').includes(q) ||
        (p.kind || '').toLowerCase().includes(s) ||
        (p.label || '').toLowerCase().includes(s)
    )
  }, [q, tab, people])

  const applied = Object.keys(covers).length + Object.keys(portraits).length

  const flash = (ok, text) => {
    setErr(ok ? '' : text)
    setMsg(ok ? text : '')
    window.setTimeout(() => {
      setMsg('')
      setErr('')
    }, 2200)
  }

  return (
    <div className="set-row art-studio studio-compact">
      <div style={{ width: '100%' }}>
        <div className="studio-head">
          <div>
            <h3>Covers &amp; portraits</h3>
            <p>
              Replace generated book fronts and author pictures with a URL or a local file.
              {applied ? ` ${applied} custom image${applied === 1 ? '' : 's'} saved on this device.` : ''}
            </p>
          </div>
          <button
            className={`btn ${open ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? 'Close' : 'Edit artwork'}
          </button>
        </div>
        {!open ? null : (
        <div className="studio-body">
        <div className="stream-quality" role="tablist" aria-label="Artwork" style={{ marginTop: 12 }}>
          <button className={`quality-pill ${tab === 'covers' ? 'active' : ''}`} onClick={() => setTab('covers')}>
            Book fronts
          </button>
          <button className={`quality-pill ${tab === 'people' ? 'active' : ''}`} onClick={() => setTab('people')}>
            Authors &amp; poets
          </button>
          {applied ? (
            <button className="quality-pill" onClick={() => { resetAll(); flash(true, 'Custom artwork cleared.') }}>
              Reset all
            </button>
          ) : null}
        </div>
        <input
          className="search-input"
          placeholder={tab === 'covers' ? 'Search titles…' : 'Search authors, poets, narrators…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginTop: 12 }}
        />
        {msg ? <p style={{ marginTop: 8, color: 'var(--green)' }}>{msg}</p> : null}
        {err ? <p style={{ marginTop: 8, color: 'var(--danger)' }}>{err}</p> : null}
        <div className="art-list">
          {tab === 'covers'
            ? filteredTitles.map((t) => (
                <ArtRow
                  key={t.id}
                  kind="cover"
                  name={t.number ? `${t.number} ${t.name}` : t.name}
                  sub={t.nameUr || t.kind}
                  palette={t.cover}
                  src={coverFor(t)}
                  onApply={(url) => {
                    setCover(t.id, url)
                    flash(true, 'Cover saved.')
                  }}
                  onClear={() => {
                    setCover(t.id, '')
                    flash(true, 'Cover restored.')
                  }}
                  onError={(m) => flash(false, m)}
                />
              ))
            : filteredPeople.map((p) => (
                <ArtRow
                  key={p.id}
                  kind="person"
                  name={p.name}
                  sub={`${p.kind}${p.nameUr ? ` · ${p.nameUr}` : ''}`}
                  seed={p.id}
                  src={portraitFor(p)}
                  onApply={(url) => {
                    setPortrait(p.id, url)
                    flash(true, 'Portrait saved.')
                  }}
                  onClear={() => {
                    setPortrait(p.id, '')
                    flash(true, 'Portrait restored.')
                  }}
                  onError={(m) => flash(false, m)}
                />
              ))}
        </div>
        </div>
        )}
      </div>
    </div>
  )
}

function ArtRow({ kind, name, sub, palette, seed, src, onApply, onClear, onError }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const applyUrl = () => {
    const raw = url.trim()
    if (!raw) return
    const resolved = /archive\.org/i.test(raw) || /^ia[:\s]/i.test(raw) ? archiveCoverUrl(raw) : raw
    if (!isLikelyImageUrl(resolved)) {
      onError('Paste a direct image URL, an Archive.org item, or use Choose file.')
      return
    }
    onApply(resolved)
    setUrl('')
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const data = await readImageFile(file)
      onApply(data)
    } catch (err) {
      onError(err.message || 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="art-row">
      <div className={`art-thumb ${kind === 'person' ? 'round' : ''}`}>
        {kind === 'cover' ? (
          <CoverArt id={palette} title={name} src={src} className="cover-art" />
        ) : (
          <AvatarArt name={name} seed={seed} src={src} />
        )}
      </div>
      <div className="art-meta">
        <div className="t">{name}</div>
        <div className="meta">{sub}</div>
        <div className="art-actions">
          <input
            className="search-input"
            placeholder="https://archive.org/details/… or image URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyUrl()
              }
            }}
          />
          <button className="btn btn-ghost" onClick={applyUrl} disabled={!url.trim() || busy}>
            Use URL
          </button>
          <label className="btn btn-ghost art-file">
            {busy ? 'Reading…' : 'Choose file'}
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
          {src ? (
            <button className="btn btn-ghost" onClick={onClear}>
              Restore
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
