import { useMemo, useState } from 'react'
import { useCatalog } from '../state/Catalog.jsx'
import { useArtwork } from '../state/Artwork.jsx'
import { CoverArt } from '../art/covers'
import { archiveCoverUrl, isLikelyImageUrl, readImageFile } from '../data/artwork'
import { EDITABLE_TITLE_FIELDS, withEpisodePatch } from '../data/userCatalog'
import FolderPicker from '../ui/FolderPicker'
import GenrePicker from '../ui/GenrePicker'
import {
  IcoFolder,
  IcoImage,
  IcoLink,
  IcoRefresh,
  IcoSave,
  IcoTrash,
  IcoUpload,
  IcoX
} from '../ui/Icons'

const FIELD_LABEL = {
  number: 'Catalogue number',
  name: 'Title',
  nameUr: 'Title (Urdu)',
  kind: 'Kind',
  year: 'Year',
  genres: 'Genres',
  authorId: 'Author / poet',
  seriesId: 'Series',
  synopsis: 'Synopsis',
  source: 'Source',
  sourceUrl: 'Source URL'
}

// A blank form seeded from a live title. Every editable field is copied so the
// operator edits real values, and Save diffs them back to only what changed.
function draftFrom(title) {
  return {
    number: title.number || '',
    name: title.name || '',
    nameUr: title.nameUr || '',
    kind: title.kind || 'Ghazals',
    year: title.year || '',
    genres: (title.genres || []).join(', '),
    authorId: title.authorId || '',
    seriesId: title.seriesId || '',
    synopsis: title.synopsis || '',
    featured: !!title.featured,
    top: !!title.top,
    source: title.source || '',
    sourceUrl: title.sourceUrl || '',
    // Episodes ride along so per-part edits are saved with the same Save
    // button as the rest of the form.
    episodes: (title.episodes || []).map((ep) => ({ ...ep }))
  }
}

function episodeSignature(list) {
  return (list || [])
    .map((ep) => `${ep.id}:${ep.title || ''}:${ep.titleEn || ''}:${ep.imageUrl || ''}:${ep.duration || ''}:${ep.free ? 1 : 0}`)
    .join('|')
}

function diff(draft, title) {
  const before = draftFrom(title)
  const out = {}
  for (const key of EDITABLE_TITLE_FIELDS) {
    if (!(key in draft)) continue
    const a = Array.isArray(draft[key]) ? draft[key].join('\u0000') : draft[key]
    const b = Array.isArray(before[key]) ? before[key].join('\u0000') : before[key]
    if (String(a) !== String(b)) out[key] = draft[key]
  }
  if (episodeSignature(draft.episodes) !== episodeSignature(before.episodes)) {
    out.episodes = draft.episodes
  }
  return out
}

export default function TitleEditor({ titleId, onClose, onOpen }) {
  const { titles, authors, poets, genres, kinds, seriesList, patchTitle, resetTitle, hasTitleOverride, addGenre, removeGenre } = useCatalog()
  const { coverFor, setCover } = useArtwork()

  const title = useMemo(() => titles.find((t) => t.id === titleId) || null, [titles, titleId])
  const open = !!titleId

  // Re-seed the form whenever a different title is opened, so an unsaved edit
  // never bleeds from one title into the next. `seededFor` tracks which title
  // the draft belongs to; the title object itself is a fresh reference every
  // render, so it cannot be used for the comparison.
  const [draft, setDraft] = useState(null)
  const [seededFor, setSeededFor] = useState(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')

  if (titleId && seededFor !== titleId && title) {
    setSeededFor(titleId)
    setDraft(draftFrom(title))
    setCoverUrl('')
    setMsg('')
    setErr('')
  } else if (!titleId && seededFor !== null) {
    setSeededFor(null)
    setDraft(null)
  }

  const set = (key, value) => setDraft((d) => (d ? { ...d, [key]: value } : d))

  const people = useMemo(() => {
    const seen = new Set()
    return [...authors, ...poets].filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [authors, poets])

  const results = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s || open) return []
    return titles
      .filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          (t.nameUr || '').includes(search.trim()) ||
          (t.number || '').includes(s) ||
          (t.kind || '').toLowerCase().includes(s)
      )
      .slice(0, 10)
  }, [search, open, titles])

  const configurable = !!draft || (titleId && title)

  const flash = (ok, text) => {
    setErr(ok ? '' : text)
    setMsg(ok ? text : '')
    window.setTimeout(() => {
      setMsg('')
      setErr('')
    }, 2400)
  }

  const save = () => {
    if (!title || !draft) return
    if (!draft.name.trim()) {
      flash(false, 'A title needs a name.')
      return
    }
    const patch = diff(draft, title)
    if (!Object.keys(patch).length) {
      flash(true, 'Nothing changed.')
      return
    }
    patchTitle(title.id, patch)
    flash(true, 'Content information saved.')
  }

  const applyCover = (url) => {
    if (!title) return
    setCover(title.id, url)
  }

  // Episode images live on the episode record itself (not the artwork store),
  // so a part can carry its own picture — useful for an anthology where each
  // instalment has separate art.
  const setEpisodeImage = (episodeId, url) => {
    if (!title) return
    const current = draft?.episodes || title.episodes || []
    const next = withEpisodePatch(current, episodeId, { imageUrl: url })
    if (!next) return
    setDraft((d) => (d ? { ...d, episodes: next } : d))
    patchTitle(title.id, { episodes: next })
    flash(true, url ? 'Episode image saved.' : 'Episode image removed.')
  }

  const applyEpisodeImageUrl = (episodeId, raw) => {
    const value = String(raw || '').trim()
    if (!value) return
    const resolved = /archive\.org/i.test(value) || /^ia[:\s]/i.test(value) ? archiveCoverUrl(value) : value
    if (!isLikelyImageUrl(resolved)) {
      flash(false, 'Paste a direct image URL, an Archive.org item, or pick a file.')
      return
    }
    setEpisodeImage(episodeId, resolved)
  }

  const applyCoverUrl = () => {
    const raw = coverUrl.trim()
    if (!raw) return
    const resolved = /archive\.org/i.test(raw) || /^ia[:\s]/i.test(raw) ? archiveCoverUrl(raw) : raw
    if (!isLikelyImageUrl(resolved)) {
      flash(false, 'Paste a direct image URL, an Archive.org item, or use Choose file.')
      return
    }
    applyCover(resolved)
    setCoverUrl('')
    flash(true, 'Cover image saved.')
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const data = await readImageFile(file)
      applyCover(data)
      flash(true, 'Cover image saved.')
    } catch (error) {
      flash(false, error.message || 'Could not read that file.')
    } finally {
      setBusy(false)
    }
  }

  const cover = title ? coverFor(title) : ''

  return (
    <div className="panel title-editor">
      <div className="row-title" style={{ marginTop: 0 }}>
        <h2>Content information</h2>
        {open ? (
          <button className="btn btn-ghost" onClick={onClose}>
            <IcoX /> Close
          </button>
        ) : null}
      </div>

      {!open || !draft ? (
        <>
          <p className="meta" style={{ marginTop: 0 }}>
            Edit the content information and cover image of any title — including the built-in catalogue.
          </p>
          <div className="search-bar" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search a title to edit by name, number, or kind…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search a title to edit"
            />
          </div>
          <div className="h-scroll">
            {results.map((t) => (
              <button key={t.id} className="add-card" onClick={() => onOpen(t.id)}>
                <span className="add-name">
                  {t.number ? `${t.number} ` : ''}
                  {t.name}
                </span>
                <span className="add-sub">
                  {t.kind} · {t.genres.join(', ')}
                  {hasTitleOverride(t.id) ? ' · edited' : ''}
                </span>
                <span className="add-plus">Edit</span>
              </button>
            ))}
            {!results.length ? (
              <p className="meta" style={{ margin: 0 }}>
                Type to find a title. Or pick one from the queue below.
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="te-preview">
            <div className="te-cover">
              <CoverArt id={title.cover} title="" src={cover} t={title} className="cover-art" />
            </div>
            <div className="te-cover-actions">
              <div className="t">{draft.name || title.name}</div>
              <div className="meta">
                {title.imported ? 'Imported title' : 'Built-in catalogue title'}
                {hasTitleOverride(title.id) ? ' · edited' : ''}
              </div>
              <input
                className="search-input"
                placeholder="https://archive.org/details/… or image URL"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    applyCoverUrl()
                  }
                }}
                aria-label="Cover image URL"
              />
              <div className="te-actions">
                <button className="btn btn-ghost" onClick={applyCoverUrl} disabled={!coverUrl.trim() || busy}>
                  <IcoLink /> Use URL
                </button>
                <label className="btn btn-ghost art-file">
                  <IcoUpload /> {busy ? 'Reading…' : 'Choose file'}
                  <input type="file" accept="image/*" hidden onChange={onFile} />
                </label>
                <FolderPicker
                  kind="image"
                  label="Pick from folder"
                  onPick={(url) => {
                    applyCover(url)
                    flash(true, `Cover set from ${url}`)
                  }}
                />
                {cover ? (
                  <button className="btn btn-ghost" onClick={() => applyCover('')}>
                    <IcoRefresh /> Restore generated cover
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {msg ? <p className="rev-note" style={{ color: 'var(--green)' }}>{msg}</p> : null}
          {err ? <p className="rev-note" style={{ color: 'var(--danger)' }}>{err}</p> : null}

          <div className="te-grid">
            <label>
              {FIELD_LABEL.name}
              <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label>
              {FIELD_LABEL.nameUr}
              <input dir="rtl" lang="ur" value={draft.nameUr} onChange={(e) => set('nameUr', e.target.value)} />
            </label>
            <label>
              {FIELD_LABEL.number}
              <input value={draft.number} onChange={(e) => set('number', e.target.value)} />
            </label>
            <label>
              {FIELD_LABEL.kind}
              <select value={draft.kind} onChange={(e) => set('kind', e.target.value)}>
                {[...new Set([draft.kind, ...kinds])].filter(Boolean).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {FIELD_LABEL.year}
              <input
                type="number"
                min="1900"
                max="2100"
                value={draft.year}
                onChange={(e) => set('year', e.target.value)}
              />
            </label>
            <div className="te-wide">
              <span className="te-label">{FIELD_LABEL.genres}</span>
              <GenrePicker
                value={draft.genres ? draft.genres.split(',').map((g) => g.trim()).filter(Boolean) : []}
                onChange={(list) => set('genres', list.join(', '))}
                options={genres}
                onAddGenre={addGenre}
                onRemoveGenre={removeGenre}
                max={8}
              />
            </div>
            <label>
              {FIELD_LABEL.authorId}
              <select value={draft.authorId} onChange={(e) => set('authorId', e.target.value)}>
                <option value="">— none —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.role ? ` (${p.role})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {FIELD_LABEL.seriesId}
              <select value={draft.seriesId} onChange={(e) => set('seriesId', e.target.value)}>
                <option value="">— none —</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="te-wide">
              {FIELD_LABEL.synopsis}
              <textarea rows="4" value={draft.synopsis} onChange={(e) => set('synopsis', e.target.value)} />
            </label>
            <label>
              {FIELD_LABEL.source}
              <input value={draft.source} onChange={(e) => set('source', e.target.value)} />
            </label>
            <label className="te-wide">
              {FIELD_LABEL.sourceUrl}
              <input value={draft.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} />
            </label>
            <div className="te-toggles">
              <label className="te-check">
                <input type="checkbox" checked={draft.featured} onChange={(e) => set('featured', e.target.checked)} />
                Featured on the home page
              </label>
              <label className="te-check">
                <input type="checkbox" checked={draft.top} onChange={(e) => set('top', e.target.checked)} />
                Show in Top titles
              </label>
            </div>
          </div>

          <EpisodeImages
            episodes={draft.episodes || []}
            onSetImage={setEpisodeImage}
            onApplyUrl={applyEpisodeImageUrl}
          />

          <div className="te-actions te-actions-end">
            {hasTitleOverride(title.id) ? (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  resetTitle(title.id)
                  flash(true, 'Reverted to the original content.')
                }}
              >
                <IcoTrash /> Revert changes
              </button>
            ) : null}
            <button className="btn btn-ghost" onClick={onClose}>
              <IcoX /> Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!configurable}>
              <IcoSave /> Save changes
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Per-episode artwork. Each part can carry its own picture, set by URL or by
// picking a file straight out of the project folder. Saved with the same Save
// button as the rest of the form.
function EpisodeImages({ episodes, onSetImage, onApplyUrl }) {
  const [urls, setUrls] = useState({})
  const [picking, setPicking] = useState(null)

  if (!episodes.length) {
    return (
      <div className="ep-images">
        <h3>Episode images</h3>
        <p className="meta" style={{ margin: 0 }}>
          This title has no episodes yet, so there are no per-part images to set.
        </p>
      </div>
    )
  }

  return (
    <div className="ep-images">
      <h3>Episode images</h3>
      <p className="meta" style={{ marginTop: 0 }}>
        Give a part its own picture — useful for an anthology or a series where each instalment has separate art.
      </p>
      <div className="ep-image-list">
        {episodes.map((ep, i) => (
          <div key={ep.id} className="ep-image-row">
            <div className="ep-image-thumb">
              {ep.imageUrl ? (
                <img src={ep.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="ep-image-empty">{i + 1}</span>
              )}
            </div>
            <div className="ep-image-main">
              <div className="t">
                {i + 1}. {ep.titleEn || ep.title || `Episode ${i + 1}`}
              </div>
              <div className="te-actions">
                <input
                  className="search-input"
                  placeholder="https://archive.org/details/… or image URL"
                  value={urls[ep.id] || ''}
                  onChange={(e) => setUrls((u) => ({ ...u, [ep.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onApplyUrl(ep.id, urls[ep.id])
                      setUrls((u) => ({ ...u, [ep.id]: '' }))
                    }
                  }}
                  aria-label={`Image URL for ${ep.titleEn || ep.title || `episode ${i + 1}`}`}
                />
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    onApplyUrl(ep.id, urls[ep.id])
                    setUrls((u) => ({ ...u, [ep.id]: '' }))
                  }}
                  disabled={!(urls[ep.id] || '').trim()}
                >
                  <IcoLink /> Use URL
                </button>
                <label className="btn btn-ghost art-file">
                  <IcoImage /> Choose file
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      try {
                        const data = await readImageFile(file)
                        onSetImage(ep.id, data)
                      } catch {
                        /* readImageFile rejects a non-image */
                      }
                    }}
                  />
                </label>
                <FolderPicker
                  kind="image"
                  label="Pick from folder"
                  open={picking === ep.id}
                  onClose={() => setPicking(null)}
                  onPick={(url) => {
                    onSetImage(ep.id, url)
                    setPicking(null)
                  }}
                />
                {!picking ? (
                  <button className="btn btn-ghost" onClick={() => setPicking(ep.id)}>
                    <IcoFolder /> Browse folder
                  </button>
                ) : null}
                {ep.imageUrl ? (
                  <button className="btn btn-ghost" onClick={() => onSetImage(ep.id, '')}>
                    <IcoTrash /> Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
