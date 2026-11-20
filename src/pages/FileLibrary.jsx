import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { useApp } from '../state/AppState.jsx'
import { CoverArt } from '../art/covers'
import { useArtwork } from '../state/Artwork.jsx'
import {
  GROUP_MODES,
  episodeFileName,
  episodeSource,
  fileActionOptions,
  folderStats,
  loadFileLibraryPrefs,
  saveFileLibraryPrefs,
  titleMatches,
  virtualPath
} from '../data/fileLibrary'
import { IcoEdit, IcoLink, IcoMore, IcoPlay, IcoGrid, IcoTrash, IcoUpload } from '../ui/Icons'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { slugId } from '../data/userCatalog'
import { deleteLocalFile, getLocalFile, isLocalAsset, localId, putLocalFile } from '../data/localMedia'
import { shareMedia } from '../platform/fileTransfer'

function Chevron({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={open ? 'file-chevron open' : 'file-chevron'}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function FolderMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h6l2 2h10v10H3z" />
    </svg>
  )
}

function FileMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h8l5 5v13H7z" />
      <path d="M15 3v5h5" />
    </svg>
  )
}

const KINDS = ['Audiobook', 'Audio-film', 'Drama']

export default function FileLibrary() {
  const { titles, authors, poets, getAuthor, getSeries, patchTitle, removeImportedTitle, upsertPerson } = useCatalog()
  const { playEpisode, removeFromLibrary } = useApp()
  const { coverFor } = useArtwork()
  const nav = useNavigate()
  const prefs = useMemo(() => loadFileLibraryPrefs(), [])
  const [groupBy, setGroupBy] = useState(prefs.groupBy)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(() => new Set(prefs.open))
  const [selected, setSelected] = useState(null)
  const [partName, setPartName] = useState('')
  const [bookName, setBookName] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [dragOver, setDragOver] = useState('')
  const [menuFor, setMenuFor] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notice, setNotice] = useState('')
  const replaceRef = useRef(null)
  const audioInputRef = useRef(null)
  const nameInputRef = useRef(null)

  useEffect(() => {
    if (!menuFor) return undefined
    const close = (e) => {
      if (!e.target.closest?.('.file-action-wrap')) setMenuFor('')
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [menuFor])

  const query = q.trim().toLowerCase()

  const visible = useMemo(
    () =>
      titles.filter((t) => {
        const author = getAuthor(t.authorId)
        const series = t.seriesId ? getSeries(t.seriesId) : null
        return titleMatches(t, author, series, query)
      }),
    [titles, getAuthor, getSeries, query]
  )

  const groups = useMemo(() => {
    const map = new Map()
    const put = (key, label, extra, title) => {
      if (!map.has(key)) map.set(key, { id: key, label, extra, titles: [] })
      map.get(key).titles.push(title)
    }
    visible.forEach((t) => {
      if (groupBy === 'title') {
        put(`title:${t.id}`, t.name, t.kind, t)
        return
      }
      if (groupBy === 'kind') {
        put(`kind:${t.kind || 'Other'}`, t.kind || 'Other', '', t)
        return
      }
      if (groupBy === 'series') {
        const series = t.seriesId ? getSeries(t.seriesId) : null
        if (series) put(`series:${series.id}`, series.name, series.genre, t)
        else put('series:standalone', 'Standalone titles', 'No series', t)
        return
      }
      const author = getAuthor(t.authorId)
      put(`author:${author?.id || 'unknown'}`, author?.name || 'Unknown', author?.role || 'Author', t)
    })
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [visible, groupBy, getAuthor, getSeries])

  const totals = folderStats(visible)

  const persistOpen = (next) => {
    setOpen(next)
    saveFileLibraryPrefs({ groupBy, open: [...next] })
  }

  const setMode = (id) => {
    setGroupBy(id)
    setOpen(new Set())
    saveFileLibraryPrefs({ groupBy: id, open: [] })
    setSelected(null)
  }

  const toggle = (id) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveFileLibraryPrefs({ groupBy, open: [...next] })
      return next
    })
  }

  const expandAll = () => {
    const next = new Set()
    groups.forEach((g) => {
      next.add(g.id)
      g.titles.forEach((t) => next.add(`title:${t.id}`))
    })
    persistOpen(next)
  }

  const play = (title, ep) => {
    const r = playEpisode(title.id, ep)
    if (!r.locked) nav('/now')
  }

  const pick = (g, t, ep, i) => {
    const author = getAuthor(t.authorId)
    const series = t.seriesId ? getSeries(t.seriesId) : null
    setSelected({
      fileId: `${t.id}:${ep.id}`,
      title: t,
      ep,
      index: i,
      author,
      series,
      path: virtualPath([g.label, groupBy === 'title' ? '' : t.name, episodeFileName(ep, i, t)])
    })
    setPartName(ep.titleEn || ep.title || '')
    setBookName(t.name || '')
    setAuthorName(author?.name || '')
  }

  const liveTitle = selected ? titles.find((t) => t.id === selected.title.id) || selected.title : null
  const liveEp = liveTitle && selected ? (liveTitle.episodes || []).find((e) => e.id === selected.ep.id) || selected.ep : null
  const liveIndex = liveTitle && liveEp ? (liveTitle.episodes || []).findIndex((e) => e.id === liveEp.id) : -1
  // House titles are edited through local overrides, so every file is editable.
  // Only imported parts can be deleted outright.
  const canEdit = !!liveTitle

  const renamePart = () => {
    if (!canEdit || !liveEp) return
    const name = partName.trim()
    if (!name) return
    const episodes = (liveTitle.episodes || []).map((e) =>
      e.id === liveEp.id ? { ...e, titleEn: name, title: name } : e
    )
    patchTitle(liveTitle.id, { episodes })
  }

  const movePart = (dir) => {
    if (!canEdit || liveIndex < 0) return
    const episodes = [...(liveTitle.episodes || [])]
    const next = liveIndex + dir
    if (next < 0 || next >= episodes.length) return
    const tmp = episodes[liveIndex]
    episodes[liveIndex] = episodes[next]
    episodes[next] = tmp
    patchTitle(liveTitle.id, { episodes })
    setSelected((s) => s && { ...s, index: next, ep: tmp })
  }

  const setKind = (kind) => {
    if (!canEdit) return
    patchTitle(liveTitle.id, { kind })
  }

  const people = useMemo(() => {
    const seen = new Set()
    return [...authors, ...poets].filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [authors, poets])

  const renameBook = () => {
    if (!canEdit) return
    const name = bookName.trim()
    if (!name) return
    patchTitle(liveTitle.id, { name })
  }

  const moveToAuthor = () => {
    if (!canEdit) return
    const name = authorName.trim()
    if (!name) return
    const existing = people.find((p) => p.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      patchTitle(liveTitle.id, { authorId: existing.id })
      setSelected((s) => s && { ...s, author: existing })
      return
    }
    const person = {
      id: slugId('author', name),
      name,
      nameUr: '',
      role: 'Author',
      bio: `Added from Files · Author.`,
      imported: true
    }
    upsertPerson('Author', person)
    patchTitle(liveTitle.id, { authorId: person.id })
    setSelected((s) => s && { ...s, author: person })
  }

  const dropOnGroup = (g, titleId) => {
    const title = titles.find((t) => t.id === titleId)
    if (!title?.imported) return
    if (groupBy === 'kind' && g.label && KINDS.includes(g.label)) {
      patchTitle(title.id, { kind: g.label })
      return
    }
    if (groupBy === 'author') {
      const authorId = g.id.replace(/^author:/, '')
      if (!authorId || authorId === 'unknown') return
      const person = getAuthor(authorId)
      if (!person) return
      patchTitle(title.id, { authorId: person.id })
    }
  }

  const partIndex = (title, ep) => Math.max(0, (title.episodes || []).findIndex((e) => e.id === ep.id))

  const patchEpisode = (title, ep, patch) => {
    patchTitle(title.id, {
      episodes: (title.episodes || []).map((e) => (e.id === ep.id ? { ...e, ...patch } : e))
    })
  }

  const chooseReplace = (title, ep) => {
    replaceRef.current = { titleId: title.id, epId: ep.id }
    audioInputRef.current?.click()
    setMenuFor('')
  }

  const replaceAudio = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const target = replaceRef.current
    replaceRef.current = null
    if (!file || !target) return
    const title = titles.find((t) => t.id === target.titleId)
    const ep = (title?.episodes || []).find((item) => item.id === target.epId)
    if (!title || !ep) return
    setNotice('Replacing audio…')
    try {
      const id = isLocalAsset(ep.asset) ? localId(ep.asset) : slugId('audio', file.name)
      await putLocalFile(id, file)
      patchEpisode(title, ep, { asset: `local:${id}`, audio: '' })
      setNotice(`Replaced audio for ${episodeFileName(ep, partIndex(title, ep), title)}.`)
    } catch (err) {
      setNotice(err.message || 'Could not replace that audio file.')
    }
  }

  const shareFile = async (title, ep) => {
    const name = episodeFileName(ep, partIndex(title, ep), title)
    try {
      const file = isLocalAsset(ep.asset) ? await getLocalFile(localId(ep.asset)) : null
      const url = (!file && /^https?:/i.test(ep.audio || '') ? ep.audio : '') ||
        `${window.location.origin}/title/${encodeURIComponent(title.id)}`
      const result = await shareMedia({ file, url, name, title: name, text: `${title.name} · Lumina Voice` })
      setNotice(result === 'link-copied' ? 'Link copied to clipboard.' : result === 'downloaded' ? 'Audio downloaded.' : 'Shared.')
    } catch (err) {
      if (err.name !== 'AbortError') setNotice(err.message || 'Could not share this file.')
    }
  }

  const deletePart = async (title, ep) => {
    const name = episodeFileName(ep, partIndex(title, ep), title)
    if (isLocalAsset(ep.asset)) await deleteLocalFile(localId(ep.asset)).catch(() => {})
    const episodes = (title.episodes || []).filter((e) => e.id !== ep.id)
    if (!episodes.length) {
      await removeImportedTitle(title.id)
      removeFromLibrary(title.id)
      setSelected((s) => (s?.title.id === title.id ? null : s))
      setNotice(`Deleted ${title.name} and its last part.`)
      return
    }
    patchTitle(title.id, { episodes })
    if (selected?.title.id === title.id && selected.ep.id === ep.id) setSelected(null)
    setNotice(`Deleted ${name}.`)
  }

  const editPart = (g, title, ep, i) => {
    pick(g, title, ep, i)
    setMenuFor('')
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }

  const runAction = (id, g, title, ep, i) => {
    setMenuFor('')
    if (id === 'play') play(title, ep)
    else if (id === 'edit') editPart(g, title, ep, i)
    else if (id === 'replace') chooseReplace(title, ep)
    else if (id === 'share') shareFile(title, ep)
    else if (id === 'open') nav(`/title/${title.id}`)
    else if (id === 'delete' && title.imported) {
      setPendingDelete({ title, ep, name: episodeFileName(ep, partIndex(title, ep), title) })
    }
  }

  const actionIcon = (id) =>
    id === 'edit' ? <IcoEdit /> : id === 'replace' ? <IcoUpload /> : id === 'share' ? <IcoLink /> : id === 'delete' ? <IcoTrash /> : <IcoPlay />

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">File library</h2>
          <p className="meta" style={{ margin: 0 }}>
            Directories by {groupBy} · {groups.length} folders · {totals.books} titles · {totals.files} episode files
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={expandAll}>
            <IcoGrid /> Expand all
          </button>
          <button className="btn btn-ghost" onClick={() => persistOpen(new Set())}>
            Collapse
          </button>
        </div>
      </div>

      <div className="stream-quality" role="tablist" aria-label="Group files" style={{ marginBottom: 14 }}>
        {GROUP_MODES.map((m) => (
          <button key={m.id} className={`quality-pill ${groupBy === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="search-bar" style={{ marginBottom: 14 }}>
        <input
          placeholder="Filter by book, author, series, episode, or file…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {notice ? <p className="meta file-notice" role="status">{notice}</p> : null}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.opus,.m4a,.mp3,.wav,.flac"
        className="sr-only"
        onChange={replaceAudio}
        aria-label="Replacement audio file"
      />

      <div className="file-lib">
        <div className="file-tree panel">
          {groups.length ? (
            groups.map((g) => {
              const gOpen = open.has(g.id) || !!query
              const stats = folderStats(g.titles)
              return (
                <div key={g.id} className="file-branch">
                  <button
                    type="button"
                    className={`file-row folder ${dragOver === g.id ? 'drop' : ''}`}
                    onClick={() => toggle(g.id)}
                    onDragOver={(e) => {
                      if (groupBy !== 'author' && groupBy !== 'kind') return
                      e.preventDefault()
                      setDragOver(g.id)
                    }}
                    onDragLeave={() => setDragOver((id) => (id === g.id ? '' : id))}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver('')
                      dropOnGroup(g, e.dataTransfer.getData('text/plain'))
                    }}
                  >
                    <Chevron open={gOpen} />
                    <span className="file-ico">
                      <FolderMark />
                    </span>
                    <span className="file-name">{g.label}</span>
                    <span className="file-meta">
                      {g.extra ? `${g.extra} · ` : ''}
                      {stats.books} {stats.books === 1 ? 'title' : 'titles'} · {stats.files} files
                    </span>
                  </button>
                  {gOpen
                    ? g.titles
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((t) => {
                          const tId = `title:${t.id}`
                          const tOpen = groupBy === 'title' || open.has(tId) || !!query
                          const eps = t.episodes || []
                          return (
                            <div key={t.id} className="file-branch nested">
                              {groupBy === 'title' ? null : (
                                <button type="button" className="file-row folder" onClick={() => toggle(tId)}>
                                  <Chevron open={tOpen} />
                                  <span className="file-ico">
                                    <FolderMark />
                                  </span>
                                  <span className="file-name">{t.number ? `${t.number} ${t.name}` : t.name}</span>
                                  <span className="file-meta">
                                    {t.kind}
                                    {t.imported ? ` · ${t.source || 'import'}` : ''} · {eps.length} {eps.length === 1 ? 'part' : 'parts'}
                                  </span>
                                </button>
                              )}
                              {(groupBy === 'title' || tOpen)
                                ? eps.map((ep, i) => {
                                    const fileId = `${t.id}:${ep.id}`
                                    const active = selected?.fileId === fileId
                                    const name = episodeFileName(ep, i, t)
                                    return (
                                      <div key={ep.id} className="file-leaf-wrap">
                                        <div
                                          role="button"
                                          tabIndex={0}
                                          className={`file-row leaf ${active ? 'active' : ''}`}
                                          onClick={() => pick(g, t, ep, i)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault()
                                              pick(g, t, ep, i)
                                            }
                                          }}
                                          draggable={!!t.imported}
                                          onDragStart={(e) => {
                                            if (!t.imported) return
                                            e.dataTransfer.setData('text/plain', t.id)
                                            e.dataTransfer.effectAllowed = 'move'
                                          }}
                                        >
                                          <span className="file-indent" />
                                          <span className="file-ico">
                                            <FileMark />
                                          </span>
                                          <span className="file-name">{name}</span>
                                          <span className="file-meta">
                                            {ep.duration ? `${ep.duration} min · ` : ''}
                                            {episodeSource(ep, t)}
                                          </span>
                                          <span className="file-action-wrap">
                                            <button
                                              type="button"
                                              className="file-action-btn"
                                              aria-label={`Actions for ${name}`}
                                              aria-expanded={menuFor === fileId}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setMenuFor((current) => (current === fileId ? '' : fileId))
                                              }}
                                            >
                                              <IcoMore />
                                            </button>
                                            {menuFor === fileId ? (
                                              <div className="file-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                                                {fileActionOptions(t).map((action) => (
                                                  <button
                                                    key={action.id}
                                                    type="button"
                                                    role="menuitem"
                                                    className={action.id === 'delete' ? 'danger' : ''}
                                                    disabled={action.disabled}
                                                    onClick={() => runAction(action.id, g, t, ep, i)}
                                                  >
                                                    {actionIcon(action.id)}
                                                    <span>{action.label}</span>
                                                  </button>
                                                ))}
                                              </div>
                                            ) : null}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })
                                : null}
                            </div>
                          )
                        })
                    : null}
                </div>
              )
            })
          ) : (
            <p className="meta" style={{ margin: 0 }}>
              No files match that filter.
            </p>
          )}
        </div>

        <div className="file-detail panel">
          {selected && liveTitle && liveEp ? (
            <>
              <div className="file-detail-cover">
                <CoverArt id={liveTitle.cover} title={liveTitle.name} src={coverFor(liveTitle)} t={liveTitle} className="cover-art" />
              </div>
              <div className="kicker">{canEdit ? 'ORGANISE PART' : 'EPISODE FILE'}</div>
              <h3>{episodeFileName(liveEp, Math.max(0, liveIndex), liveTitle)}</h3>
              <p className="meta">{selected.path}</p>
              <div className="file-kv">
                <div>
                  <span>Title</span>
                  <b>{liveTitle.name}</b>
                </div>
                <div>
                  <span>Author</span>
                  <b>{selected.author?.name || 'Unknown'}</b>
                </div>
                <div>
                  <span>Kind</span>
                  <b>{liveTitle.kind}</b>
                </div>
                <div>
                  <span>Part</span>
                  <b>
                    {liveIndex + 1} of {(liveTitle.episodes || []).length}
                  </b>
                </div>
                <div>
                  <span>Duration</span>
                  <b>{liveEp.duration ? `${liveEp.duration} min` : 'Unknown'}</b>
                </div>
                <div>
                  <span>Source</span>
                  <b>{episodeSource(liveEp, liveTitle)}</b>
                </div>
                <div>
                  <span>Codec</span>
                  <b>{(liveEp.codec || 'opus').toUpperCase()}{liveEp.kbps ? ` · ${liveEp.kbps} kbps` : ''}</b>
                </div>
                {selected.series ? (
                  <div>
                    <span>Series</span>
                    <b>{selected.series.name}</b>
                  </div>
                ) : null}
              </div>
              {canEdit ? (
                <div className="file-organise">
                  <label className="field">
                    <span>Book folder</span>
                    <div className="art-actions">
                      <input className="search-input" value={bookName} onChange={(e) => setBookName(e.target.value)} placeholder="Title name" />
                      <button className="btn btn-ghost" onClick={renameBook}>Rename</button>
                    </div>
                  </label>
                  <label className="field">
                    <span>Author directory</span>
                    <div className="art-actions">
                      <input className="search-input" list="file-authors" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Move to author" />
                      <button className="btn btn-ghost" onClick={moveToAuthor}>Move</button>
                    </div>
                    <datalist id="file-authors">
                      {people.map((p) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </label>
                  <label className="field">
                    <span>Part name</span>
                    <div className="art-actions">
                      <input ref={nameInputRef} className="search-input" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Episode or part title" />
                      <button className="btn btn-ghost" onClick={renamePart}>Rename</button>
                    </div>
                  </label>
                  <label className="field">
                    <span>Kind folder</span>
                    <select className="select" value={liveTitle.kind} onChange={(e) => setKind(e.target.value)}>
                      {KINDS.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => movePart(-1)} disabled={liveIndex <= 0}>
                      Move up
                    </button>
                    <button className="btn btn-ghost" onClick={() => movePart(1)} disabled={liveIndex >= (liveTitle.episodes || []).length - 1}>
                      Move down
                    </button>
                  </div>
                </div>
              ) : null}
              <p className="meta" style={{ marginTop: 12 }}>
                Changes to house files are saved as local overrides. Only imported parts can be deleted.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <button className="btn btn-primary" onClick={() => play(liveTitle, liveEp)}>
                  <IcoPlay /> Play part
                </button>
                <button className="btn btn-ghost" onClick={() => chooseReplace(liveTitle, liveEp)}>
                  <IcoUpload /> Replace audio
                </button>
                <button className="btn btn-ghost" onClick={() => shareFile(liveTitle, liveEp)}>
                  <IcoLink /> Share
                </button>
                <button className="btn btn-ghost" onClick={() => nav(`/title/${liveTitle.id}`)}>
                  Open title
                </button>
                {liveTitle.imported ? (
                  <button
                    className="btn btn-ghost danger"
                    onClick={() => setPendingDelete({
                      title: liveTitle,
                      ep: liveEp,
                      name: episodeFileName(liveEp, partIndex(liveTitle, liveEp), liveTitle)
                    })}
                  >
                    <IcoTrash /> Delete part
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: 12 }}>
              <h3>Choose a file</h3>
              <p>Open a folder, then select an episode or part to see its path, source, and duration.</p>
            </div>
          )}
        </div>
      </div>
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete this part?"
          message={`“${pendingDelete.name}” will be removed from this device. This cannot be undone.`}
          confirmLabel="Delete part"
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            const { title, ep } = pendingDelete
            setPendingDelete(null)
            await deletePart(title, ep)
          }}
        />
      ) : null}
    </>
  )
}
