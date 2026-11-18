import { useRef, useState } from 'react'
import { CoverArt, AvatarArt } from '../art/covers'
import { useArtwork } from '../state/Artwork.jsx'
import { useCatalog } from '../state/Catalog.jsx'
import { useApp } from '../state/AppState.jsx'
import { useBroadcast } from '../state/Broadcast.jsx'
import { archiveCoverUrl, isLikelyImageUrl, readImageFile } from '../data/artwork'
import { archiveIdentifier, fetchArchiveItem, isArchiveUrl, isAudioUrl, looksLikeArchiveId, searchArchiveAudio } from '../data/archive'
import { slugId } from '../data/userCatalog'
import { deleteLocalFile, putLocalFile } from '../data/localMedia'
import { voices } from '../data/voices'
import { catalogues, getCatalogue, catalogueForTitle } from '../data/catalog'
import { completeMetadata } from '../data/metadata'
import GenrePicker from '../ui/GenrePicker'
import {
  IcoEdit,
  IcoImage,
  IcoPlus,
  IcoPlusSmall,
  IcoRefresh,
  IcoSave,
  IcoTrash,
  IcoUpload,
  IcoX
} from '../ui/Icons'

// The genre/kind/role/catalogue block for something being added, completed from
// whatever the source gave us. Shared by the archive path and the local-file
// path so a stored file is described as fully as a fetched link.
function completedForm(item, form = {}) {
  const done = completeMetadata(item, form)
  return {
    kind: done.kind,
    genre: done.genre,
    genres: done.genres,
    catalogue: catalogueForTitle({ kind: done.kind, genres: done.genres }),
    role: done.role
  }
}

const KINDS = ['Audiobook', 'Audio-film', 'Drama', 'Ghazals', 'Quran Kareem']
const ROLES = ['Author', 'Poet', 'Reciter']

const emptyForm = () => ({
  source: '',
  name: '',
  creator: '',
  role: 'Author',
  kind: 'Audiobook',
  genre: 'Poetry',
  genres: ['Poetry'],
  catalogue: '',
  synopsis: '',
  audioUrl: '',
  coverUrl: '',
  portraitUrl: '',
  duration: '',
  year: String(new Date().getFullYear()),
  number: '',
  seriesId: '',
  voiceId: '',
  featured: false,
  top: false
})

export default function ImportStudio({ admin = false }) {
  const {
    authors,
    poets,
    importedTitles,
    upsertPerson,
    addImportedTitle,
    removeImportedTitle,
    getAuthor,
    seriesList,
    genres,
    addGenre,
    removeGenre
  } = useCatalog()
  const { setCover, setPortrait, coverFor } = useArtwork()
  const { addToLibrary, removeFromLibrary } = useApp()
  const broadcast = useBroadcast()
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [localAudioName, setLocalAudioName] = useState('')
  const [hits, setHits] = useState([])
  const [tracks, setTracks] = useState([])
  const [dropOver, setDropOver] = useState(false)
  const [open, setOpen] = useState(admin)
  const [showAllImports, setShowAllImports] = useState(false)
  const [mode, setMode] = useState('add')
  const [editId, setEditId] = useState('')
  const [epRows, setEpRows] = useState([])
  const [saveOpts, setSaveOpts] = useState({ rotation: true, library: true })
  const [editQ, setEditQ] = useState('')
  const lookupSeq = useRef(0)
  const lookupAbort = useRef(null)
  const localAudioIdRef = useRef('')

  const advanced = admin && mode === 'add'

  const beginLookup = () => {
    lookupAbort.current?.abort()
    const ctrl = new AbortController()
    lookupAbort.current = ctrl
    lookupSeq.current += 1
    return { seq: lookupSeq.current, signal: ctrl.signal }
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const flash = (ok, text) => {
    setErr(ok ? '' : text)
    setMsg(ok ? text : '')
  }

  const applyArchiveItem = (item, extra = {}) => {
    // Fill every field from the source, and where the source is silent say what
    // the item plainly is — an entry saved from Settings should look complete,
    // not like a half-read link.
    const done = completeMetadata(item, { ...extra, sourceUrl: extra.source || item.sourceUrl })
    const guessedGenre = extra.genre || done.genre
    const guessedKind = extra.kind || done.kind
    setForm((f) => ({
      ...f,
      source: extra.source || item.sourceUrl || f.source,
      name: done.name,
      creator: done.creator,
      synopsis: done.synopsis,
      audioUrl: item.audioUrl || '',
      coverUrl: extra.coverUrl || item.coverUrl,
      portraitUrl: extra.portraitUrl || f.portraitUrl,
      year: String(done.year),
      duration: done.duration || (item.duration ? String(item.duration) : ''),
      kind: guessedKind,
      genre: guessedGenre,
      genres: extra.genres || done.genres,
      catalogue: catalogueForTitle({ kind: guessedKind, genres: done.genres }),
      role: extra.role || done.role
    }))
    setTracks(item.tracks || [])
    if (admin) {
      setEpRows(
        (item.tracks || []).map((tr, i) => ({
          titleEn: tr.name || `Episode ${i + 1}`,
          duration: tr.duration || '',
          audio: tr.audioUrl || '',
          free: true
        }))
      )
    }
  }

  const clearLocalAudio = () => {
    if (localAudioIdRef.current) deleteLocalFile(localAudioIdRef.current).catch(() => {})
    localAudioIdRef.current = ''
    setLocalAudioName('')
  }

  const lookup = async () => {
    const raw = form.source.trim()
    if (!raw) return flash(false, 'Paste an Archive.org URL or identifier, a custom audio URL, or a search phrase.')
    const { seq, signal } = beginLookup()
    setBusy(true)
    flash(true, '')
    setHits([])
    try {
      if (isAudioUrl(raw) && !isArchiveUrl(raw)) {
        let guessed = form.name
        if (!guessed) {
          try {
            const path = new URL(raw).pathname.split('/').pop() || ''
            guessed = decodeURIComponent(path.replace(/\.[^.]+$/, '')).replace(/[-_]+/g, ' ')
          } catch {
            guessed = ''
          }
        }
        set({ source: raw, audioUrl: raw, name: guessed })
        clearLocalAudio()
        setTracks([])
        flash(true, 'Custom audio URL ready. Add a title if needed, then save.')
        return
      }
      if (isArchiveUrl(raw) || looksLikeArchiveId(raw)) {
        try {
          const item = await fetchArchiveItem(raw, signal)
          if (seq !== lookupSeq.current) return
          applyArchiveItem(item)
          clearLocalAudio()
          flash(true, item.tracks?.length > 1 ? `Loaded ${item.name} · ${item.tracks.length} tracks.` : `Loaded ${item.name} from Archive.org.`)
          return
        } catch (e) {
          if (isArchiveUrl(raw) && /\/details\/|\/download\/|\/metadata\//i.test(raw)) throw e
        }
      }
      let found = []
      try {
        found = await searchArchiveAudio(raw, 8, signal)
      } catch {
        throw new Error('Archive.org search is unreachable. Paste an item URL, or add a local file.')
      }
      if (seq !== lookupSeq.current) return
      if (found.length === 1) {
        const item = await fetchArchiveItem(found[0].identifier, signal)
        if (seq !== lookupSeq.current) return
        applyArchiveItem(item)
        clearLocalAudio()
        flash(true, item.tracks?.length > 1 ? `Loaded ${item.name} · ${item.tracks.length} tracks.` : `Loaded ${item.name} from Archive.org.`)
        return
      }
      setHits(found)
      if (!found.length) flash(false, 'No Archive.org audio matched that search.')
      else flash(true, `${found.length} Archive.org audio titles. Choose one.`)
    } catch (e) {
      if (seq !== lookupSeq.current) return
      if (e.message === 'cancelled') return
      flash(false, e.message || 'Could not read that source.')
    } finally {
      if (seq === lookupSeq.current) setBusy(false)
    }
  }

  const pickHit = async (hit) => {
    const { seq, signal } = beginLookup()
    setBusy(true)
    try {
      const item = await fetchArchiveItem(hit.identifier, signal)
      if (seq !== lookupSeq.current) return
      applyArchiveItem(item, {
        coverUrl: /^data:image\//.test(form.coverUrl) ? form.coverUrl : item.coverUrl,
        portraitUrl: form.portraitUrl
      })
      clearLocalAudio()
      setHits([])
      flash(true, item.tracks?.length > 1 ? `Using ${item.name} · ${item.tracks.length} tracks.` : `Using Archive.org audio: ${item.name}.`)
    } catch (e) {
      if (seq !== lookupSeq.current) return
      if (e.message === 'cancelled') return
      flash(false, e.message || 'Could not load that Archive.org item.')
    } finally {
      if (seq === lookupSeq.current) setBusy(false)
    }
  }

  const takeAudioFile = async (file) => {
    if (!file) return
    lookupAbort.current?.abort()
    lookupSeq.current += 1
    setBusy(true)
    try {
      const id = slugId('audio', file.name)
      await putLocalFile(id, file)
      if (localAudioIdRef.current) deleteLocalFile(localAudioIdRef.current).catch(() => {})
      localAudioIdRef.current = id
      setLocalAudioName(file.name)
      const mins = await new Promise((resolve) => {
        const el = document.createElement('audio')
        el.preload = 'metadata'
        const url = URL.createObjectURL(file)
        el.onloadedmetadata = () => {
          const m = el.duration && Number.isFinite(el.duration) ? Math.max(1, Math.round(el.duration / 60)) : 0
          URL.revokeObjectURL(url)
          resolve(m)
        }
        el.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(0)
        }
        el.src = url
      })
      const guessedName = form.name || file.name.replace(/\.[^.]+$/, '')
      const guessed = { name: guessedName, subject: file.name, description: '' }
      set({
        audioUrl: '',
        name: guessedName,
        source: '',
        duration: mins ? String(mins) : '',
        ...completedForm(guessed)
      })
      setTracks([])
      setHits([])
      flash(true, 'Audio file stored on this device.')
    } catch (e2) {
      flash(false, e2.message || 'Could not store that audio file.')
    } finally {
      setBusy(false)
    }
  }

  const onAudioFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    await takeAudioFile(file)
  }

  const onCoverFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await readImageFile(file)
      set({ coverUrl: data })
    } catch (e2) {
      flash(false, e2.message)
    }
  }

  const onPortraitFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await readImageFile(file)
      set({ portraitUrl: data })
    } catch (e2) {
      flash(false, e2.message)
    }
  }

  const findOrCreatePerson = (name, role, portrait) => {
    const all = [...authors, ...poets]
    const existing = all.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (portrait) setPortrait(existing.id, portrait)
      return existing.id
    }
    const person = {
      id: slugId(role === 'Poet' ? 'poet' : 'author', name),
      name,
      nameUr: '',
      role,
      bio: `Added from Settings · ${role}.`,
      imported: true
    }
    upsertPerson(role, person)
    if (portrait) setPortrait(person.id, portrait)
    return person.id
  }

  const save = () => {
    lookupAbort.current?.abort()
    lookupSeq.current += 1
    setBusy(false)
    const name = form.name.trim()
    const creator = form.creator.trim() || 'Unknown'
    if (!name) return flash(false, 'A title is required.')
    const localId = localAudioIdRef.current
    const audio = localId ? `local:${localId}` : form.audioUrl.trim()
    const rowAudio = admin && epRows.some((r) => (r.audio || '').trim())
    const customUrl = !localId && !tracks.length && isAudioUrl(audio)
    if (!audio && !tracks.length && !rowAudio) return flash(false, 'Add Archive.org audio, a custom audio URL, a local file, or an episode audio URL.')
    if (!localId && !tracks.length && !rowAudio && !isAudioUrl(audio)) {
      return flash(false, 'That does not look like a playable audio URL.')
    }
    const cover = form.coverUrl.trim()
      ? (/archive\.org/i.test(form.coverUrl) ? archiveCoverUrl(form.coverUrl) : form.coverUrl.trim())
      : ''
    const portrait = form.portraitUrl.trim()
      ? (/archive\.org/i.test(form.portraitUrl) ? archiveCoverUrl(form.portraitUrl) : form.portraitUrl.trim())
      : ''
    const authorId = findOrCreatePerson(creator, form.role, portrait)
    const ia = localId || customUrl ? '' : archiveIdentifier(form.source) || archiveIdentifier(audio)
    const existing = importedTitles.find(
      (t) =>
        (ia && archiveIdentifier(t.sourceUrl) === ia) ||
        (!customUrl && !localId && t.sourceUrl && form.source.trim() && t.sourceUrl === form.source.trim()) ||
        (!ia && !localId && t.sourceUrl && t.sourceUrl === audio) ||
        (localId && t.source === 'local' && (t.name || '').toLowerCase() === name.toLowerCase())
    )
    const titleId = editId || existing?.id || (ia ? `ia-${ia.replace(/[^A-Za-z0-9._-]+/g, '-')}`.slice(0, 80) : slugId('user', name))
    const mins = Math.max(0, Number(form.duration) || 0)
    const builtEpisodes =
      !localId && tracks.length
        ? tracks.map((tr, i) => ({
            id: `${titleId}-e${i + 1}`,
            title: `قسط ${i + 1}`,
            titleEn: tr.name || `Episode ${i + 1}`,
            duration: tr.duration || 0,
            free: true,
            asset: '',
            audio: tr.audioUrl,
            codec: 'external',
            kbps: 64,
            channels: 'mono'
          }))
        : [
            {
              id: `${titleId}-e1`,
              title: 'قسط 1',
              titleEn: tracks[0]?.name || 'Episode 1',
              duration: mins,
              free: true,
              asset: localId ? `local:${localId}` : '',
              audio: localId ? '' : audio,
              codec: 'external',
              kbps: 64,
              channels: 'mono'
            }
          ]
    // Admin episode builder overrides when it has rows with audio.
    const customEpisodes = epRows
      .map((r, i) => ({
        id: `${titleId}-e${i + 1}`,
        title: `قسط ${i + 1}`,
        titleEn: r.titleEn || `Episode ${i + 1}`,
        duration: Math.max(0, Number(r.duration) || 0),
        free: r.free !== false,
        asset: '',
        audio: (r.audio || '').trim(),
        codec: 'external',
        kbps: 64,
        channels: 'mono'
      }))
      .filter((e) => e.audio)
    if (!audio && !tracks.length && !customEpisodes.length) {
      return flash(false, 'Add Archive.org audio, a custom audio URL, a local file, or an episode audio URL.')
    }
    const episodes = advanced && customEpisodes.length ? customEpisodes : builtEpisodes
    const draft = {
      id: titleId,
      name,
      authorId,
      number: form.number.trim(),
      seriesId: form.seriesId || null,
      voiceId: form.voiceId || undefined,
      featured: !!form.featured,
      top: !!form.top,
      kind: form.kind,
      genres: (form.genres && form.genres.length ? form.genres : [form.genre]),
      year: Number(form.year) || new Date().getFullYear(),
      coverUrl: cover,
      source: localId ? 'local' : ((customUrl || !isArchiveUrl(form.source || audio)) ? 'url' : 'archive.org'),
      sourceUrl: localId ? '' : customUrl ? audio : (/^https?:/i.test(form.source.trim()) ? form.source.trim() : (/^https?:/i.test(audio) ? audio : '')),
      synopsis: form.synopsis.trim() || `${name}, added from Settings.`,
      episodes
    }
    addImportedTitle(draft)
    if (cover) setCover(titleId, cover)
    if (saveOpts.library) addToLibrary(titleId)
    else if (editId) removeFromLibrary(titleId)
    if (admin && saveOpts.rotation && !editId) {
      try {
        broadcast.addToRotation(draft)
      } catch {
        /* rotation optional */
      }
    }
    if (admin && editId) {
      const rot = (broadcast.rotation || []).find((r) => r.titleId === editId)
      if (rot) broadcast.updateRotation(rot.id, { name, number: draft.number, minutes: episodes[0]?.duration || rot.minutes })
    }
    lookupAbort.current?.abort()
    lookupSeq.current += 1
    setBusy(false)
    if (admin && editId) {
      flash(true, `${name} updated.`)
      return
    }
    setForm(emptyForm())
    localAudioIdRef.current = ''
    setLocalAudioName('')
    setHits([])
    setTracks([])
    setEpRows([])
    setEditId('')
    flash(true, admin && saveOpts.rotation ? `${name} saved to library and rotation.` : `${name} is in your library.`)
  }

  const editSearch = (editQ || '').trim().toLowerCase()
  const editMatches = importedTitles
    .filter((t) => !editSearch || (t.name || '').toLowerCase().includes(editSearch) || (t.sourceUrl || '').toLowerCase().includes(editSearch))
    .slice(0, 12)

  const loadForEdit = (t) => {
    const author = getAuthor(t.authorId)
    setEditId(t.id)
    setForm({
      source: t.sourceUrl || '',
      name: t.name || '',
      creator: author?.name || '',
      role: t.genres?.includes('Poetry') || author?.role === 'Poet' ? 'Poet' : 'Author',
      kind: t.kind || 'Audiobook',
      genre: t.genres?.[0] || 'Poetry',
      genres: t.genres?.length ? [...t.genres] : ['Poetry'],
      catalogue: catalogueForTitle(t),
      synopsis: t.synopsis || '',
      audioUrl: (t.episodes || []).map((e) => e.audio).find(isAudioUrl) || '',
      coverUrl: t.coverUrl || '',
      portraitUrl: '',
      duration: t.episodes?.[0]?.duration ? String(Math.round(t.episodes[0].duration)) : '',
      year: String(t.year || new Date().getFullYear()),
      number: t.number || '',
      seriesId: t.seriesId || '',
      voiceId: t.voiceId || '',
      featured: !!t.featured,
      top: !!t.top
    })
    const localEp = (t.episodes || []).find((e) => (e.asset || '').startsWith('local:'))
    if (localEp) localAudioIdRef.current = localEp.asset.slice(6)
    setEpRows(
      (t.episodes || []).map((e) => ({
        titleEn: e.titleEn || '',
        duration: e.duration || '',
        audio: e.audio || '',
        free: e.free !== false
      }))
    )
    setTracks([])
    setHits([])
    setLocalAudioName('')
    setOpen(true)
    flash(true, `Editing ${t.name}.`)
  }

  const coverPreview = form.coverUrl
    ? (/archive\.org/i.test(form.coverUrl) ? archiveCoverUrl(form.coverUrl) : form.coverUrl)
    : ''
  const portraitPreview = form.portraitUrl
    ? (/archive\.org/i.test(form.portraitUrl) ? archiveCoverUrl(form.portraitUrl) : form.portraitUrl)
    : ''

  const imported = importedTitles || []
  const visibleImports = showAllImports ? imported : imported.slice(0, 3)

  return (
    <div className="set-row art-studio studio-compact">
      <div style={{ width: '100%' }}>
        <div className="studio-head">
          <div>
            <h3>Add local or online content</h3>
            <p>
              Archive.org, a custom audio URL, or a file on this device.
              {imported.length ? ` ${imported.length} added on this device.` : ''}
            </p>
          </div>
          <button
            className={`btn ${open ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? <IcoX /> : <IcoPlus />}
            {open ? 'Close' : 'Add content'}
          </button>
        </div>
        {!open ? null : (
        <div className="studio-body">
        {admin ? (
          <div className="stream-quality" role="group" aria-label="Studio mode" style={{ marginTop: 12 }}>
            <button className={`quality-pill ${mode === 'add' ? 'active' : ''}`} onClick={() => { setMode('add'); setEditId('') }}>
              Add new
            </button>
            <button
              className={`quality-pill ${mode === 'edit' ? 'active' : ''}`}
              onClick={() => { setMode('edit'); setEditId('') }}
            >
              Edit existing
            </button>
          </div>
        ) : null}
        {admin && mode === 'edit' ? (
          <div style={{ marginTop: 12 }}>
            <input
              className="search-input"
              placeholder="Search added titles…"
              value={editQ}
              onChange={(e) => setEditQ(e.target.value)}
            />
            <div className="art-list">
              {editMatches.map((t) => (
                <div className="art-row with-actions" key={t.id}>
                  <div className="art-thumb">
                    <CoverArt id={t.cover} title={t.name} src={coverFor(t)} t={t} className="cover-art" />
                  </div>
                  <div className="art-meta">
                    <div className="t">{t.name}</div>
                    <div className="meta">
                      {getAuthor(t.authorId)?.name || 'Unknown'} · {t.source || 'import'} · {(t.episodes || []).length} ep
                      {editId === t.id ? ' · editing' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => loadForEdit(t)}><IcoEdit /> Edit</button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        removeFromLibrary(t.id)
                        removeImportedTitle(t.id)
                        if (editId === t.id) setEditId('')
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!editMatches.length ? <p className="meta" style={{ margin: 0 }}>No added titles yet.</p> : null}
            </div>
          </div>
        ) : null}
        <label className="field" style={{ marginTop: 12 }}>
          <span>Archive.org URL, identifier, or search</span>
          <div className="art-actions">
            <input
              className="search-input"
              placeholder="archive.org/details/… · identifier · https://…mp3 · title search"
              value={form.source}
              onChange={(e) => set({ source: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  lookup()
                }
              }}
            />
            <button className="btn btn-ghost" onClick={lookup} disabled={busy}>
              <IcoRefresh /> {busy ? 'Reading…' : 'Fetch'}
            </button>
          </div>
        </label>
        {tracks.length > 1 ? (
          <div className="art-list" style={{ marginTop: 10 }}>
            <p className="meta">{tracks.length} tracks will be saved as episodes.</p>
            {tracks.slice(0, 8).map((tr, i) => (
              <div className="meta" key={tr.fileName || i}>
                {i + 1}. {tr.name}
                {tr.duration ? ` · ${tr.duration} min` : ''}
              </div>
            ))}
            {tracks.length > 8 ? <div className="meta">+{tracks.length - 8} more</div> : null}
          </div>
        ) : null}
        {hits.length ? (
          <div className="art-list" style={{ marginTop: 10 }}>
            {hits.map((h) => (
              <button type="button" className="art-row" key={h.identifier} onClick={() => pickHit(h)} disabled={busy}>
                <div className="art-thumb">
                  <CoverArt id="cipher1" title={h.name} src={h.coverUrl} t={{ name: h.name }} className="cover-art" />
                </div>
                <div className="art-meta">
                  <div className="t">{h.name}</div>
                  <div className="meta">{h.creator} · archive.org{h.year ? ` · ${h.year}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <div className="import-grid">
          <label className="field">
            <span>Title</span>
            <input className="search-input" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Book or programme title" />
          </label>
          <label className="field">
            <span>Author or poet</span>
            <input className="search-input" value={form.creator} onChange={(e) => set({ creator: e.target.value })} placeholder="Name" />
          </label>
        </div>

        {admin ? (
          <div className="import-grid" style={{ marginTop: 12 }}>
            <label className="field">
              <span>Catalogue number</span>
              <input className="search-input" value={form.number} onChange={(e) => set({ number: e.target.value })} placeholder="e.g. SB-114" />
            </label>
            <label className="field">
              <span>Series</span>
              <select className="select" value={form.seriesId} onChange={(e) => set({ seriesId: e.target.value })}>
                <option value="">Standalone</option>
                {(seriesList || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Voice</span>
              <select className="select" value={form.voiceId} onChange={(e) => set({ voiceId: e.target.value })}>
                <option value="">Automatic</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.label} — {v.name}</option>
                ))}
              </select>
            </label>
            <div className="field" style={{ display: 'flex', gap: 18, alignItems: 'center', minHeight: 38 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />
                Featured
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.top} onChange={(e) => set({ top: e.target.checked })} />
                Top rated
              </label>
            </div>
          </div>
        ) : null}

        <details className="disclosure">
          <summary>More details — role, kind, genre, duration, year, synopsis</summary>
          <div className="import-grid">
            <label className="field">
              <span>Role</span>
              <select className="select" value={form.role} onChange={(e) => set({ role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Catalogue</span>
              <select
                className="select"
                value={form.catalogue || ''}
                onChange={(e) => {
                  // Picking a catalogue sets the genre and kind together, and
                  // the broadcast category follows from them — one choice, not
                  // three that can disagree.
                  const c = getCatalogue(e.target.value)
                  if (!c) {
                    set({ catalogue: '' })
                    return
                  }
                  set({ catalogue: c.id, genre: c.genres[0], genres: [...c.genres], kind: c.kinds[0] })
                }}
              >
                <option value="">— pick automatically —</option>
                {catalogues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category === 'quran' ? '☾ ' : ''}{c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Kind</span>
              <select
                className="select"
                value={form.kind}
                onChange={(e) => set({ kind: e.target.value, catalogue: '' })}
              >
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <div className="field field-wide">
              <span>Genres</span>
              <GenrePicker
                value={form.genres || (form.genre ? [form.genre] : [])}
                onChange={(list) => {
                  // A title may sit on several shelves. The first stays the
                  // primary genre, which is what the catalogue mapping reads,
                  // and a hand edit drops the catalogue back to automatic.
                  set({ genres: list, genre: list[0] || 'Poetry', catalogue: '' })
                }}
                options={genres}
                onAddGenre={addGenre}
                onRemoveGenre={removeGenre}
                max={8}
              />
            </div>
            <label className="field">
              <span>Duration (minutes)</span>
              <input className="search-input" type="number" min="0" value={form.duration} onChange={(e) => set({ duration: e.target.value })} placeholder="Leave blank if unknown" />
            </label>
            <label className="field">
              <span>Year</span>
              <input className="search-input" type="number" min="1" value={form.year} onChange={(e) => set({ year: e.target.value })} />
            </label>
          </div>

          <label className="field" style={{ marginTop: 12 }}>
            <span>Synopsis</span>
            <textarea className="textarea" rows={3} value={form.synopsis} onChange={(e) => set({ synopsis: e.target.value })} placeholder="A short description for the title page." />
          </label>

          <label className="field" style={{ marginTop: 12 }}>
            <span>Audio URL (if not using Archive.org or a local file)</span>
            <input
              className="search-input"
              value={form.audioUrl}
              onChange={(e) => {
                const v = e.target.value
                if (tracks.length && !tracks.some((t) => t.audioUrl === v)) setTracks([])
                if (v.trim()) {
                  lookupAbort.current?.abort()
                  lookupSeq.current += 1
                  setBusy(false)
                  setHits([])
                  clearLocalAudio()
                }
                set({
                  audioUrl: v,
                  source: v.trim() && (isArchiveUrl(form.source) || looksLikeArchiveId(form.source)) ? '' : form.source
                })
              }}
              placeholder="https://… .mp3 / .opus / .m4a"
            />
          </label>
        </details>
        <div
          className={`art-actions import-drop ${dropOver ? 'over' : ''}`}
          style={{ marginTop: 8 }}
          onDragOver={(e) => {
            e.preventDefault()
            setDropOver(true)
          }}
          onDragLeave={() => setDropOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDropOver(false)
            const file = [...(e.dataTransfer.files || [])].find((f) => /audio|opus|mpeg|mp4|ogg|flac|wav/i.test(f.type || f.name))
            if (file) takeAudioFile(file)
            else flash(false, 'Drop an audio file (.mp3, .opus, .m4a, .ogg, .flac, .wav).')
          }}
        >
          <label className="btn btn-ghost art-file">
            <IcoUpload /> {localAudioName ? localAudioName : 'Choose or drop local audio'}
            <input type="file" accept="audio/*,.opus,.mp3,.m4a,.ogg,.flac,.wav" hidden onChange={onAudioFile} />
          </label>
        </div>

        {admin ? (
          <div className="ep-builder">
            <div className="row-title" style={{ marginTop: 16, marginBottom: 0 }}>
              <h2>Episodes {epRows.length ? `(${epRows.length})` : ''}</h2>
              <button
                className="btn btn-ghost"
                onClick={() => setEpRows((r) => [...r, { titleEn: `Episode ${r.length + 1}`, duration: '', audio: '', free: true }])}
              >
                <IcoPlusSmall /> Add episode
              </button>
            </div>
            <p className="meta" style={{ margin: '4px 0 0' }}>
              Optional — fetched Archive.org tracks fill this automatically. Rows with an audio URL are saved as separate episodes.
            </p>
            {epRows.map((r, i) => (
              <div className="ep-row" key={i}>
                <span className="ep-num">{i + 1}</span>
                <input
                  className="search-input"
                  value={r.titleEn}
                  placeholder="Episode title"
                  onChange={(e) => setEpRows((rows) => rows.map((x, j) => (j === i ? { ...x, titleEn: e.target.value } : x)))}
                />
                <input
                  className="search-input"
                  type="number"
                  min="0"
                  style={{ maxWidth: 90 }}
                  value={r.duration}
                  placeholder="Min"
                  onChange={(e) => setEpRows((rows) => rows.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))}
                />
                <input
                  className="search-input"
                  value={r.audio}
                  placeholder="https://… audio URL"
                  onChange={(e) => setEpRows((rows) => rows.map((x, j) => (j === i ? { ...x, audio: e.target.value } : x)))}
                />
                <label className="ep-free" title="Free to play">
                  <input
                    type="checkbox"
                    checked={r.free !== false}
                    onChange={(e) => setEpRows((rows) => rows.map((x, j) => (j === i ? { ...x, free: e.target.checked } : x)))}
                  />
                  Free
                </label>
                <button
                  className="icon-btn"
                  aria-label="Remove episode"
                  onClick={() => setEpRows((rows) => rows.filter((_, j) => j !== i))}
                >
                  <IcoTrash />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <details className="disclosure">
          <summary>Cover &amp; portrait pictures</summary>
          <div className="import-art" style={{ marginTop: 12 }}>
            <div>
              <div className="art-thumb" style={{ width: 64, height: 64 }}>
                <CoverArt id={form.cover || 'cipher1'} title={form.name} src={isLikelyImageUrl(coverPreview) ? coverPreview : ''} t={{ name: form.name, genres: form.genres, kind: form.kind }} className="cover-art" />
              </div>
              <div className="meta" style={{ marginTop: 6 }}>Book front</div>
              <input
                className="search-input"
                style={{ marginTop: 6 }}
                placeholder="Cover URL or archive.org/details/…"
                value={form.coverUrl}
                onChange={(e) => set({ coverUrl: e.target.value })}
              />
              <label className="btn btn-ghost art-file" style={{ marginTop: 6 }}>
                <IcoImage /> Choose cover
                <input type="file" accept="image/*" hidden onChange={onCoverFile} />
              </label>
            </div>
            <div>
              <div className="art-thumb round" style={{ width: 64, height: 64 }}>
                <AvatarArt name={form.creator || 'Author'} seed={form.creator} src={isLikelyImageUrl(portraitPreview) ? portraitPreview : ''} />
              </div>
              <div className="meta" style={{ marginTop: 6 }}>Author / poet picture</div>
              <input
                className="search-input"
                style={{ marginTop: 6 }}
                placeholder="Portrait URL or archive.org/details/…"
                value={form.portraitUrl}
                onChange={(e) => set({ portraitUrl: e.target.value })}
              />
              <label className="btn btn-ghost art-file" style={{ marginTop: 6 }}>
                <IcoImage /> Choose picture
                <input type="file" accept="image/*" hidden onChange={onPortraitFile} />
              </label>
            </div>
          </div>
        </details>

        {msg ? <p style={{ marginTop: 10, color: 'var(--green)' }}>{msg}</p> : null}
        {err ? <p style={{ marginTop: 10, color: 'var(--danger)' }}>{err}</p> : null}

        {admin ? (
          <div className="save-opts">
            <label>
              <input
                type="checkbox"
                checked={saveOpts.library}
                onChange={(e) => setSaveOpts((o) => ({ ...o, library: e.target.checked }))}
              />
              Add to my library
            </label>
            {!editId ? (
              <label>
                <input
                  type="checkbox"
                  checked={saveOpts.rotation}
                  onChange={(e) => setSaveOpts((o) => ({ ...o, rotation: e.target.checked }))}
                />
                Add to broadcast rotation
              </label>
            ) : null}
          </div>
        ) : null}

        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save} disabled={busy}>
          <IcoSave /> {editId ? 'Save changes' : 'Add to library'}
        </button>
        {editId ? (
          <button
            className="btn btn-ghost"
            style={{ marginTop: 14, marginLeft: 8 }}
            onClick={() => {
              setEditId('')
              setForm(emptyForm())
              setEpRows([])
              setLocalAudioName('')
              localAudioIdRef.current = ''
              flash(true, 'Back to adding a new title.')
            }}
          >
            <IcoX /> Cancel edit
          </button>
        ) : null}

        {imported.length ? (
          <>
            <div className="row-title" style={{ marginTop: 22 }}>
              <h2>Imported on this device</h2>
            </div>
            <div className="art-list">
              {visibleImports.map((t) => {
                const author = getAuthor(t.authorId)
                return (
                  <div className="art-row" key={t.id}>
                    <div className="art-thumb">
                      <CoverArt id={t.cover} title={t.name} src={coverFor(t)} t={t} className="cover-art" />
                    </div>
                    <div className="art-meta">
                      <div className="t">{t.name}</div>
                      <div className="meta">
                        {author?.name || 'Unknown'} · {t.source || 'import'}
                        {t.sourceUrl ? ` · ${t.sourceUrl}` : ''}
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          setCover(t.id, '')
                          removeFromLibrary(t.id)
                          removeImportedTitle(t.id)
                        }}
                      >
                        <IcoTrash /> Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {imported.length > 3 ? (
              <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setShowAllImports((s) => !s)}>
                {showAllImports ? 'Show less' : `Show all ${imported.length}`}
              </button>
            ) : null}
          </>
        ) : null}
        </div>
        )}
      </div>
    </div>
  )
}
