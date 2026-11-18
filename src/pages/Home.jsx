import { Link, useNavigate } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { voices } from '../data/voices'
import { CoverArt } from '../art/covers'
import { PersonChip, TitleTile, PlayBtn } from '../ui/Bits'
import { useApp } from '../state/AppState.jsx'
import { useArtwork } from '../state/Artwork.jsx'
import { RADIO_ENABLED } from '../config/features.js'

const kinds = [
  { label: 'Audio-films', kind: 'Audio-film' },
  { label: 'Series & dramas', kind: 'Drama' },
  { label: 'Audiobooks', kind: 'Audiobook' },
  ...(RADIO_ENABLED ? [{ label: 'Live radio', to: '/radio' }] : [])
]

export default function Home() {
  const { authors, poets, seriesList, titles, hero, getTitle, getAuthor, titlesByKind } = useCatalog()
  const { resumeTitle } = useApp()
  const { coverFor } = useArtwork()
  const nav = useNavigate()
  // A stale hero id or an empty catalogue must never take down the whole app.
  const t = getTitle(hero.titleId) || titles.find((x) => x.featured && !x.imported) || titles[0]
  if (!t) return <div className="panel">No titles are available yet.</div>
  const author = getAuthor(t.authorId)
  const featured = titles.filter((x) => x.featured && !x.imported)
  const top = titles.filter((x) => x.top && !x.imported)
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
        Lumina Voice brings you the finest Urdu audio-films, dramas, series, and audiobooks{RADIO_ENABLED ? ', and live radio' : ''}, all in one beautifully crafted app. Close your eyes. The story begins.
      </p>
      <p className="manifesto">
        Dive into a world where sound takes center stage, and let your imagination soar with our exclusive collection of content, carefully curated to keep you entertained, inspired, and engaged. Whether you&apos;re on the go, relaxing at home, or seeking a moment of escape, Lumina Voice offers a rich auditory experience that transports you into the heart of every story.
      </p>
      <div className="kind-pills">
        {kinds.map((k) =>
          k.to ? (
            <Link key={k.label} className="kind-pill" to={k.to}>
              {k.label}
            </Link>
          ) : (
            <Link key={k.label} className="kind-pill" to={`/kind/${encodeURIComponent(k.kind)}`}>
              {k.label}
            </Link>
          )
        )}
      </div>
      <div className="codec-chip">Opus · 24–48 kbps mono · speech-optimised</div>

      {imported.length ? (
        <>
          <div className="row-title">
            <h2>Added from Settings</h2>
            <Link to="/settings">Manage</Link>
          </div>
          <div className="h-scroll">
            {imported.map((x) => (
              <TitleTile key={x.id} t={x} />
            ))}
          </div>
        </>
      ) : null}

      <div className="row-title">
        <h2>Audio-films</h2>
        <Link to="/kind/Audio-film">See all</Link>
      </div>
      <div className="h-scroll">
        {titlesByKind('Audio-film').filter((x) => !x.imported).slice(0, 10).map((x) => (
          <TitleTile key={x.id} t={x} />
        ))}
      </div>

      <div className="row-title">
        <h2>Featured</h2>
        <Link to="/explore">Explore more</Link>
      </div>
      <div className="h-scroll">
        {featured.map((x) => (
          <TitleTile key={x.id} t={x} />
        ))}
      </div>

      <div className="row-title">
        <h2>Series &amp; dramas</h2>
      </div>
      <div className="h-scroll">
        {seriesList.map((s) => (
          <Link to={`/series/${s.id}`} className="tile" key={s.id}>
            <div className="cover">
              <CoverArt id={titles.find((x) => x.seriesId === s.id)?.cover} title={s.name} number="" src={coverFor(titles.find((x) => x.seriesId === s.id))} t={titles.find((x) => x.seriesId === s.id)} className="cover-art" />
            </div>
            <div className="name">{s.name}</div>
            <div className="sub urdu-inline">{s.nameUr}</div>
            <div className="sub">{s.genre} · {s.books} titles</div>
          </Link>
        ))}
      </div>

      <div className="row-title">
        <h2>Audiobooks</h2>
        <Link to="/kind/Audiobook">See all</Link>
      </div>
      <div className="h-scroll">
        {titlesByKind('Audiobook').filter((x) => !x.imported).map((x) => (
          <TitleTile key={x.id} t={x} />
        ))}
      </div>

      <div className="row-title">
        <h2>Authors</h2>
      </div>
      <div className="h-scroll">
        {authors.filter((p) => !p.imported).map((p) => (
          <PersonChip key={p.id} p={p} />
        ))}
      </div>

      <div className="row-title">
        <h2>Poets</h2>
      </div>
      <div className="h-scroll">
        {poets.filter((p) => !p.imported).map((p) => (
          <PersonChip key={p.id} p={p} />
        ))}
      </div>

      <div className="row-title">
        <h2>Voice artists</h2>
      </div>
      <div className="h-scroll">
        {voices.map((p) => (
          <PersonChip key={p.id} p={{ ...p, role: p.label }} />
        ))}
      </div>

      <div className="row-title">
        <h2>Continue the night</h2>
      </div>
      <div className="h-scroll">
        {top.map((x) => (
          <TitleTile key={x.id} t={x} />
        ))}
      </div>
      <p className="meta" style={{ marginTop: 24 }}>
        With {author?.name} and a growing house of original Urdu audio-films.
      </p>
    </>
  )
}
