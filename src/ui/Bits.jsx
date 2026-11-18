import { Link, useNavigate } from 'react-router-dom'
import { CoverArt, AvatarArt } from '../art/covers'
import { IcoBack, IcoPlay } from './Icons'
import { useArtwork } from '../state/Artwork.jsx'
import { useCatalog } from '../state/Catalog.jsx'

export function BackBtn() {
  const nav = useNavigate()
  return (
    <button className="back" onClick={() => nav(-1)} aria-label="Back">
      <IcoBack />
    </button>
  )
}

export function TitleTile({ t }) {
  const { getAuthor } = useCatalog()
  const author = getAuthor(t.authorId)
  const { coverFor } = useArtwork()
  return (
    <Link to={`/title/${t.id}`} className="tile">
      <div className="cover">
        <CoverArt id={t.cover} title={t.name} number={t.number} src={coverFor(t)} t={t} className="cover-art" />
      </div>
      <div className="name">{t.number ? `${t.number} ${t.name}` : t.name}</div>
      <div className="sub urdu-inline">{t.nameUr}</div>
      <div className="sub">{author?.name}{t.imported ? ` · ${t.source || 'import'}` : ' · Opus'}</div>
    </Link>
  )
}

export function PersonChip({ p }) {
  const { portraitFor } = useArtwork()
  return (
    <Link to={`/person/${p.id}`} className="person">
      <div className="avatar">
        <AvatarArt name={p.name} seed={p.id} src={portraitFor(p)} />
      </div>
      <div className="nm">{p.name}</div>
      <div className="rl">{p.label || p.role}</div>
    </Link>
  )
}

export function PlayBtn({ onClick, children = 'Play', block }) {
  return (
    <button className={`btn btn-primary ${block ? 'btn-block' : ''}`} onClick={onClick}>
      <IcoPlay /> {children}
    </button>
  )
}

export function fmt(s) {
  if (!s || Number.isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
