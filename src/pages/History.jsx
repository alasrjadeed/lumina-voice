import { Link } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { useCatalog } from '../state/Catalog.jsx'
import { IcoDelete, IcoHistory } from '../ui/Icons'

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export default function History() {
  const { history, getHistory, setHistory } = useApp()
  const { getTitle, getAuthor } = useCatalog()
  const items = getHistory()

  const clearHistory = async () => {
    if (!window.confirm('Clear all listening history?')) return
    setHistory([])
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('lumina-history-v1')
    } catch {}
  }

  const removeEntry = (id) => {
    setHistory(history.filter((h) => h.id !== id))
    try {
      if (typeof localStorage !== 'undefined') {
        const all = JSON.parse(localStorage.getItem('lumina-history-v1') || '[]')
        localStorage.setItem('lumina-history-v1', JSON.stringify(all.filter((h) => h.id !== id)))
      }
    } catch {}
  }

  const totalMinutes = Math.floor(
    items.reduce((sum, h) => sum + Number(h.positionSeconds || 0), 0) / 60
  )

  return (
    <>
      <div className="section-head">
        <IcoHistory />
        <h1>Listening history</h1>
      </div>
      <div className="meta" style={{ marginBottom: 16 }}>
        {items.length} session{items.length !== 1 ? 's' : ''} ·
        {totalMinutes} min listened total
      </div>
      {items.length === 0 ? (
        <div className="empty">
          <h3>No listening history yet</h3>
          <p>Play any audiobook and your time here will be tracked.</p>
        </div>
      ) : (
        <>
          <div className="h-scroll">
            <button className="btn btn-ghost btn-block" onClick={clearHistory}>
              <IcoDelete /> Clear history
            </button>
          </div>
          <div className="grid">
            {items.map((h) => {
              const t = getTitle(h.titleId)
              const author = t ? getAuthor(t.authorId) : null
              const minutes = Math.floor(Number(h.positionSeconds || 0) / 60)
              const secs = Math.floor(Number(h.positionSeconds || 0) % 60)
              return (
                <Link key={h.id} to={`/title/${h.titleId}`} className="tile">
                  <div className="cover">
                    <div className="cover-art" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
                      {t ? (
                        <img
                          src={`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%231a1420'/><text x='50%' y='50%' textAnchor='middle' fill='%23e4c36a' fontSize='24'>Cover</text></svg>`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 14 }}>
                          {t?.name || 'Unknown title'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="name">{t ? t.name : 'Unknown title'}</div>
                  <div className="sub">
                    {author ? author.name : ''}
                    {h.episodeId ? ` · Episode ${h.episodeId.replace('hist-', '')}` : ''}
                  </div>
                  <div className="sub">
                    {fmtDate(h.startedAt)} · {minutes}m {secs.toString().padStart(2, '0')}
                  </div>
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => { e.stopPropagation(); removeEntry(h.id) }}
                    title="Remove from history"
                  >
                    <IcoDelete />
                  </button>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
