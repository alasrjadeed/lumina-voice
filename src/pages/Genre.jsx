import { useParams } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { TitleTile, BackBtn } from '../ui/Bits'

export default function Genre() {
  const { name } = useParams()
  const { titlesByGenre } = useCatalog()
  // Imported titles live on their genre shelf as well as under "Added from
  // Settings", so a title you just filed here is not silently missing.
  const list = titlesByGenre(name)
  return (
    <>
      <div className="section-head">
        <BackBtn />
        <h1>{name}</h1>
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((t) => (
            <TitleTile key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <p className="meta">Nothing in this shelf yet. Import a title and file it here, or add one from the Studio.</p>
      )}
    </>
  )
}
