import { useEffect, useState } from 'react'
import { MEDIA_ROOTS, humanSize, listFolder, toWebPath } from '../data/mediaBrowser'
import { IcoFolder } from './Icons'

// Pick an image (or audio file) that already lives in the project folder.
// Renders nothing useful when the folder index is unavailable — e.g. a hosted
// static build with no middleware — so it degrades to "type a URL" instead of
// offering a button that cannot work.
export default function FolderPicker({
  kind = 'image',
  label = 'Pick from folder',
  open: openProp,
  onPick,
  onClose
}) {
  const [open, setOpen] = useState(false)
  const [dir, setDir] = useState('public')
  const [customDir, setCustomDir] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('')

  const shown = openProp === undefined ? open : openProp

  const load = async (target) => {
    setBusy(true)
    setErr('')
    try {
      const list = await listFolder(target, kind)
      setFiles(list)
      if (!list.length) setErr(`No ${kind} files in ${target}.`)
    } catch (error) {
      setFiles([])
      setErr(error.message || 'Could not read that folder.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (shown) load(dir)
    // Re-reading on every open keeps the listing fresh after files are added.
  }, [shown, dir, kind])

  const choose = (file) => {
    onPick?.(toWebPath(file.url))
  }

  const filtered = filter.trim()
    ? files.filter((f) => f.url.toLowerCase().includes(filter.trim().toLowerCase()))
    : files

  return (
    <div className="folder-picker">
      {openProp === undefined ? (
        <button
          type="button"
          className={`btn btn-ghost ${open ? 'active' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <IcoFolder />
          {open ? 'Hide folder' : label}
        </button>
      ) : null}

      {!shown ? null : (
        <div className="folder-body">
          <div className="folder-roots">
            {MEDIA_ROOTS.map((r) => (
              <button
                key={r.dir}
                type="button"
                className={`quality-pill ${dir === r.dir ? 'active' : ''}`}
                onClick={() => setDir(r.dir)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="folder-bar">
            <input
              className="search-input"
              value={customDir}
              placeholder="…or type a folder, e.g. public/audio"
              aria-label="Folder path"
              onChange={(e) => setCustomDir(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const next = customDir.trim() || '.'
                  setDir(next)
                }
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDir(customDir.trim() || '.')}
              disabled={!customDir.trim()}
            >
              Open
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => load(dir)} disabled={busy}>
              {busy ? 'Reading…' : 'Refresh'}
            </button>
            {onClose ? (
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
            ) : null}
          </div>

          <p className="meta" style={{ margin: '6px 0 0' }}>
            Reading <b>{dir.replace(/^\.$/, 'project root')}</b> — {filtered.length} {kind} file
            {filtered.length === 1 ? '' : 's'}
          </p>

          {files.length > 4 ? (
            <input
              className="search-input"
              placeholder="Filter by file name…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter files"
              style={{ marginTop: 8 }}
            />
          ) : null}

          {err ? <p className="meta" style={{ color: 'var(--danger)' }}>{err}</p> : null}

          {filtered.length ? (
            <div className="folder-grid">
              {filtered.slice(0, 120).map((f) => (
                <button
                  key={f.url}
                  type="button"
                  className="folder-item"
                  onClick={() => choose(f)}
                  title={`${toWebPath(f.url)}${f.size ? ` · ${humanSize(f.size)}` : ''}`}
                >
                  {kind === 'image' ? (
                    <img src={toWebPath(f.url)} alt="" loading="lazy" />
                  ) : (
                    <span className="folder-audio">{f.ext.toUpperCase()}</span>
                  )}
                  <span className="folder-name">{f.name}</span>
                  {f.size ? <span className="folder-size">{humanSize(f.size)}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
