import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { putLocalFile, localObjectUrl } from '../data/localMedia'
import { loadStudio, resolveVoice } from '../data/voiceStudio'
import { CoverArt } from '../art/covers'
import { warmArchiveStream } from '../data/archive'
import { BackBtn, PlayBtn, fmt } from '../ui/Bits'
import { IcoHeart, IcoDown, IcoLock, IcoInfo } from '../ui/Icons'
import { useApp } from '../state/AppState.jsx'
import { useArtwork } from '../state/Artwork.jsx'
import Ratings from './Ratings.jsx'

export default function Title() {
  const { id } = useParams()
  const { getTitle, getAuthor, getSeries } = useCatalog()
  const t = getTitle(id)
  const nav = useNavigate()
  const { playEpisode, resumeTitle, progress, library, toggleLibrary, downloads, toggleDownload, downloadProgress, premium, now, listenedTime } = useApp()
  const { coverFor } = useArtwork()
  const [lockMsg, setLockMsg] = useState(false)
  const [coverUrl, setCoverUrl] = useState(t?.coverUrl || '')
  const [coverColor, setCoverColor] = useState(t?.color || '')
  const [localCover, setLocalCover] = useState('')
  const [uploading, setUploading] = useState(false)

  // Resolve the Archive storage node while the listener is still browsing, so
  // the first tap starts the stream instead of waiting for item metadata.
  useEffect(() => {
    ;(t?.episodes || []).slice(0, 2).forEach((ep) => warmArchiveStream(ep.audio || ep.asset))
  }, [t?.id])

  if (!t) return <p>Not found.</p>
  const author = getAuthor(t.authorId)
  const series = t.seriesId ? getSeries(t.seriesId) : null
  const narrator = resolveVoice(t, loadStudio())
  const p = progress[t.id]
  const inLib = library.includes(t.id)
  const dl = downloads.includes(t.id)
  const dlP = downloadProgress[t.id]

  const goPlay = (ep) => {
    const r = playEpisode(t.id, ep)
    if (r.locked) setLockMsg(true)
    else nav('/now')
  }

  const goResume = () => {
    const r = resumeTitle(t.id)
    if (r.locked) setLockMsg(true)
    else nav('/now')
  }


  const saveCover = async () => {
    const { patchTitle } = useCatalog()
    const updates = {}
    if (coverUrl !== t.coverUrl) updates.coverUrl = coverUrl || ''
    if (coverColor !== t.color) updates.color = coverColor || ''
    if (localCover) updates.cover = `local:${localCover}`
    if (Object.keys(updates).length) {
      patchTitle(t.id, updates)
    }
  }

  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const id = await putLocalFile(`cover-${t.id}`, file)
      await localObjectUrl(id)
      setLocalCover(id)
      setCoverUrl('')
      setCoverColor('')
      await saveCover()
    } catch {
      /* ignore */
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <div className="section-head">
        <BackBtn />
      </div>
      <div className="detail">
        <div>
          <div className="detail-cover cover wide" style={{ aspectRatio: '1' }}>
            <CoverArt id={t.cover} title={t.name} number={t.number} src={coverFor(t)} t={t} className="cover-art" />
          </div>
          <div className="cover-controls" style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Online cover URL"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="input"
              style={{ flex: 1, minWidth: 200 }}
            />
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              Local file
              <input type="file" accept="image/*" onChange={handleCoverFile} style={{ display: 'none' }} />
            </label>
            <input
              type="color"
              value={coverColor || '#e4c36a'}
              onChange={(e) => setCoverColor(e.target.value)}
              className="color-picker"
              style={{ border: 'none', width: 32, height: 32, cursor: 'pointer' }}
            />
            <button className="btn btn-primary" onClick={saveCover} disabled={uploading}>
              {uploading ? 'Saving…' : 'Save cover'}
            </button>
          </div>
        </div>
        <div>
          {series ? <div className="badge">{series.name}</div> : <div className="badge">{t.kind}</div>}
          <h1>{t.number ? `${t.number} ${t.name}` : t.name}</h1>
          {t.nameUr ? (
            <p className="urdu" style={{ fontSize: 22, color: 'var(--gold)', margin: '0 0 8px' }}>
              {t.nameUr}
            </p>
          ) : null}
          <div className="meta">
            {author ? <Link to={`/person/${author.id}`}>{author.name}</Link> : 'Unknown'}
            {' · '}
            {(() => {
              const n = (t.episodes || []).length
              const ep = `${n} ${n === 1 ? 'episode' : 'episodes'}`
              return t.imported
                ? `${ep} · ${(t.genres || []).join(' · ')} · ${t.source || 'import'}`
                : `${ep} · ${(t.genres || []).join(' · ')} · ${(t.episodes[0]?.codec === 'mp3' || /mp3/i.test(t.episodes[0]?.src||t.episodes[0]?.audio||'')) ? 'MP3' : 'Opus'} ${t.episodes[0]?.kbps} kbps mono`
            })()}
            {!t.imported && narrator ? ` · ${narrator.label}` : ''}
          </div>
          <div className="chips">
            {(t.genres || []).map((g) => (
              <Link className="chip" key={g} to={`/genre/${encodeURIComponent(g)}`}>
                {g}
              </Link>
            ))}
          </div>
          <p className="synopsis">{t.synopsis}</p>
          {t.imported && t.sourceUrl ? (
            <p className="meta" style={{ marginTop: -8 }}>
              Source:{' '}
              <a href={t.sourceUrl} target="_blank" rel="noreferrer">
                {t.source || t.sourceUrl}
              </a>
            </p>
          ) : null}
          {!t.imported && narrator ? (
            <p className="meta" style={{ marginTop: -8 }}>
              Narrated by <Link to={`/person/${narrator.id}`}>{narrator.name}</Link> · {narrator.label}
              {narrator.nameUr ? <span className="urdu-inline"> · {narrator.nameUr}</span> : null}
            </p>
          ) : null}
          <p className="meta" style={{ marginTop: -8 }}>
            Already listened: <span style={{ fontWeight: 600 }}>{fmt(listenedTime[t.id])}</span>
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <PlayBtn onClick={goResume}>{p ? 'Resume' : 'Play'}</PlayBtn>
            <button className="btn btn-ghost" onClick={() => toggleLibrary(t.id)}>
              <IcoHeart on={inLib} /> {inLib ? 'In library' : 'Save'}
            </button>
            {!t.imported ? (
              <button className="btn btn-ghost" onClick={() => toggleDownload(t.id)} disabled={!!dlP}>
                <IcoDown on={dl} />{' '}
                {dlP
                  ? `Saving ${dlP.done}/${dlP.total}`
                  : dl
                    ? 'Downloaded'
                    : 'Download'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="row-title">
        <h2>{(t.episodes || []).length === 1 ? 'Episode' : 'Episodes'}</h2>
      </div>
      <div className="ep-list">
        {(t.episodes || []).map((ep, i) => {
          const locked = !ep.free && !premium
          const playing = now?.episodeId === ep.id
          return (
            <button key={ep.id} className={`ep ${playing ? 'playing' : ''}`} onClick={() => goPlay(ep)}>
              {ep.imageUrl ? (
                <span className="ep-thumb">
                  <img src={ep.imageUrl} alt="" loading="lazy" />
                </span>
              ) : (
                <span className="n">{i + 1}</span>
              )}
              <span>
                <div className="t">
                  {t.imported ? ep.titleEn || ep.title : `${t.name} ${ep.titleEn}`}
                </div>
                {t.imported ? (
                  <div className="ep-sub">{t.source || 'Imported'} · playable on this device</div>
                ) : ep.free ? (
                  <>
                    <div className="ep-sub">Free episode · {(ep.codec === 'mp3' || /mp3/i.test(ep.src||ep.audio||'')) ? 'MP3' : 'Opus'} {ep.kbps} kbps mono</div>
                    <div className="free-bar" />
                  </>
                ) : (
                  <div className="ep-sub">Premium episode · {(ep.codec === 'mp3' || /mp3/i.test(ep.src||ep.audio||'')) ? 'MP3' : 'Opus'} {ep.kbps} kbps mono</div>
                )}
              </span>
              <span className="d">{ep.duration ? `${ep.duration} min` : ''}</span>
              <span>{locked ? <IcoLock /> : <IcoInfo />}</span>
            </button>
          )
        })}
      </div>

      <Ratings titleId={t.id} />

      {lockMsg ? (
        <div className="modal-back" onClick={() => setLockMsg(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="kicker">Lumina Plus</div>
            <h2 className="display" style={{ fontSize: 28, margin: '8px 0 10px' }}>
              Unlock the full story
            </h2>
            <p className="synopsis" style={{ marginTop: 0 }}>
              Episode 1 is free. Remaining episodes are included with Lumina Plus.
            </p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                setLockMsg(false)
                nav('/settings')
              }}
            >
              View plans
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => setLockMsg(false)}>
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
