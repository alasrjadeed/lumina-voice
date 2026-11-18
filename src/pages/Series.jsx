import { useNavigate, useParams } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { CoverArt } from '../art/covers'
import { BackBtn, PlayBtn, TitleTile } from '../ui/Bits'
import { useApp } from '../state/AppState.jsx'
import { useArtwork } from '../state/Artwork.jsx'

export default function Series() {
  const { id } = useParams()
  const { getSeries, titlesBySeries, getAuthor } = useCatalog()
  const s = getSeries(id)
  const list = titlesBySeries(id)
  const { resumeTitle } = useApp()
  const { coverFor } = useArtwork()
  const nav = useNavigate()
  if (!s) return <p>Not found.</p>
  const author = getAuthor(s.authorId)
  const first = list[0]
  const totalEps = list.reduce((n, t) => n + t.episodes.length, 0)

  return (
    <>
      <div className="section-head">
        <BackBtn />
      </div>
      <div className="detail">
        <div className="detail-cover cover" style={{ aspectRatio: '1' }}>
          <CoverArt id={first?.cover} title={s.name} src={coverFor(first)} t={first} className="cover-art" />
        </div>
        <div>
          <div className="badge">SERIES</div>
          <h1>{s.name}</h1>
          {s.nameUr ? (
            <p className="urdu" style={{ fontSize: 24, color: 'var(--gold)', margin: '0 0 8px' }}>
              {s.nameUr}
            </p>
          ) : null}
          <div className="meta">
            {author?.name} · {list.length} books · {totalEps} episodes · Opus 24–48 kbps mono
          </div>
          <p className="synopsis">{s.blurb}</p>
          <PlayBtn
            onClick={() => {
              if (!first) return
              const r = resumeTitle(first.id)
              if (r.locked) nav(`/title/${first.id}`)
              else nav('/now')
            }}
          >
            Play
          </PlayBtn>
        </div>
      </div>
      <div className="row-title">
        <h2>In this series</h2>
      </div>
      <div className="series-grid">
        {list.map((t) => (
          <TitleTile key={t.id} t={t} />
        ))}
      </div>
    </>
  )
}
