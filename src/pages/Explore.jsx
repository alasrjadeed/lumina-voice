import { Link } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { TitleTile, BackBtn } from '../ui/Bits'

export default function Explore() {
  const { genres, titlesByGenre, titles } = useCatalog()
  const imported = titles.filter((t) => t.imported)
  return (
    <>
      <div className="section-head">
        <BackBtn />
        <h1>Explore More</h1>
      </div>
      {imported.length ? (
        <section>
          <div className="row-title">
            <h2>Added from Settings</h2>
            <Link to="/settings">Manage</Link>
          </div>
          <div className="h-scroll">
            {imported.map((t) => (
              <TitleTile key={t.id} t={t} />
            ))}
          </div>
        </section>
      ) : null}
      {genres.map((g) => {
        // Imported titles belong on the shelf for their genre too — filtering
        // them out here is what made a shelf look empty after an import.
        const list = titlesByGenre(g)
        if (!list.length) return null
        return (
          <section key={g}>
            <div className="row-title">
              <h2>{g}</h2>
              <Link to={`/genre/${encodeURIComponent(g)}`}>See all</Link>
            </div>
            <div className="h-scroll">
              {list.map((t) => (
                <TitleTile key={t.id} t={t} />
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
