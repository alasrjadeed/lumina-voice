import { Link } from 'react-router-dom'
import { TitleTile } from '../ui/Bits'
import { useApp } from '../state/AppState.jsx'
import { useCatalog } from '../state/Catalog.jsx'
import { formatBytes } from '../pwa.js'

export default function Library() {
  const { titles } = useCatalog()
  const { library, downloads, progress, offline, offlineBytes } = useApp()
  const saved = titles.filter((t) => library.includes(t.id) && !t.imported)
  const dl = titles.filter((t) => downloads.includes(t.id))
  const cont = titles.filter((t) => progress[t.id])
  const imported = titles.filter((t) => t.imported)

  return (
    <>
      <div className="section-head">
        <h1>Library</h1>
      </div>
      <div className="row-title">
        <h2>Continue listening</h2>
      </div>
      {cont.length ? (
        <div className="h-scroll">
          {cont.map((t) => (
            <TitleTile key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <p className="meta">Start any title — your place is saved here.</p>
      )}

      {imported.length ? (
        <>
          <div className="row-title">
            <h2>Added from Settings</h2>
            <Link to="/settings">Manage</Link>
          </div>
          <div className="h-scroll">
            {imported.map((t) => (
              <TitleTile key={t.id} t={t} />
            ))}
          </div>
        </>
      ) : null}

      <div className="row-title">
        <h2>Saved</h2>
      </div>
      {saved.length ? (
        <div className="grid">
          {saved.map((t) => (
            <TitleTile key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>Your shelf is empty</h3>
          <p>Save audio-films and series to find them later.</p>
        </div>
      )}

      <div className="row-title">
        <h2>Downloads</h2>
        {dl.length ? (
          <span className="meta">
            {formatBytes(offlineBytes)} offline{offline ? ' · playing offline' : ''}
          </span>
        ) : null}
      </div>
      {dl.length ? (
        <div className="grid">
          {dl.map((t) => (
            <TitleTile key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <p className="meta">Offline copies appear here after you download a title.</p>
      )}
    </>
  )
}
