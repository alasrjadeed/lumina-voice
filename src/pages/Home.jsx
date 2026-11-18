import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { CoverArt } from '../art/covers'
import { PersonChip, TitleTile, PlayBtn } from '../ui/Bits'
import { useApp } from '../state/AppState.jsx'
import { useArtwork } from '../state/Artwork.jsx'
import { RADIO_ENABLED } from '../config/features.js'

function Shelf({ title, to, items }) {
  if (!items.length) return null
  return (
    <>
      <div className="row-title">
        <h2>{title}</h2>
        {to ? <Link to={to}>See all</Link> : null}
      </div>
      <div className="h-scroll">
        {items.map((x) => <TitleTile key={x.id} t={x} />)}
      </div>
    </>
  )
}

export default function Home() {
  const { authors, poets, seriesList, titles, hero, kinds, getTitle, getAuthor, titlesByKind } = useCatalog()
  const { resumeTitle } = useApp()
  const { coverFor } = useArtwork()
  const nav = useNavigate()
  const t = getTitle(hero.titleId) || titles.find((x) => x.featured) || titles[0]
  if (!t) return <div className="panel">No Archive.org titles are available yet.</div>
  const author = getAuthor(t.authorId)
  const featured = titles.filter((x) => x.featured)
  const top = titles.filter((x) => x.top)
  const imported = titles.filter((x) => x.imported)

  return (
    <>
      <div className="hero">
        <div className="hero-card">
          <CoverArt id={t.cover} title="" number="" src={coverFor(t)} t={t} className="hero-art" />
          <div className="hero-fade" />
          <div className="hero-copy">
            <div className="kicker">{hero.kicker}</div>
            <h1>{t.name}</h1>
            <p className="urdu" style={{ fontSize: 18, color: '#f0d78a' }}>{t.nameUr}</p>
            <p>{hero.line}</p>
            <div className="hero-actions">
              <PlayBtn
                onClick={() => {
                  const r = resumeTitle(t.id)
                  if (r.locked) nav(`/title/${t.id}`)
                  else nav('/now')
                }}
              >
                Play
              </PlayBtn>
              <div className="play-dots">
                <span className="dot on" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        </div>
        <div className="hero-card" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
          <CoverArt id={t.cover} title={t.name} number={t.number} src={coverFor(t)} t={t} className="cover-art" />
        </div>
      </div>

      <p className="manifesto">
        Lumina Voice is a quiet place to listen. Every recording in the library is streamed directly from the Internet Archive — no house demos, no placeholder stories.
      </p>
      {RADIO_ENABLED ? (
        <p className="manifesto">Live radio is available from the Radio tab.</p>
      ) : null}

      <div className="kind-pills">
        {kinds
          .filter((kind) => titlesByKind(kind).length)
          .map((kind) => (
            <Link key={kind} className="kind-pill" to={`/kind/${encodeURIComponent(kind)}`}>{kind}</Link>
          ))}
      </div>
      <div className="codec-chip">Archive.org · public-domain audio · streamed in the browser</div>

      <Shelf title="Added from Settings" to="/settings" items={imported} />
      {kinds.map((kind) => (
        <Shelf
          key={kind}
          title={kind}
          to={`/kind/${encodeURIComponent(kind)}`}
          items={titlesByKind(kind).filter((x) => !x.imported)}
        />
      ))}
      <Shelf title="Featured" to="/explore" items={featured} />

      {seriesList.length ? (
        <>
          <div className="row-title"><h2>Series</h2></div>
          <div className="h-scroll">
            {seriesList.map((s) => {
              const first = titles.find((x) => x.seriesId === s.id)
              return (
                <Link to={`/series/${s.id}`} className="tile" key={s.id}>
                  <div className="cover">
                    <CoverArt id={first?.cover} title={s.name} number="" src={coverFor(first)} t={first} className="cover-art" />
                  </div>
                  <div className="name">{s.name}</div>
                  <div className="sub urdu-inline">{s.nameUr}</div>
                  <div className="sub">{s.genre} · {titles.filter((x) => x.seriesId === s.id).length} titles</div>
                </Link>
              )
            })}
          </div>
        </>
      ) : null}

      {authors.length ? (
        <>
          <div className="row-title"><h2>Authors</h2></div>
          <div className="h-scroll">{authors.map((p) => <PersonChip key={p.id} p={p} />)}</div>
        </>
      ) : null}
      {poets.length ? (
        <>
          <div className="row-title"><h2>Poets</h2></div>
          <div className="h-scroll">{poets.map((p) => <PersonChip key={p.id} p={p} />)}</div>
        </>
      ) : null}

      <Shelf title="Continue the night" items={top} />
      <p className="meta" style={{ marginTop: 24 }}>
        {author ? `Read by the Internet Archive community · ${author.name}.` : 'Audio from the Internet Archive.'}
      </p>
    </>
  )
}
