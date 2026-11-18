import { useParams } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { TitleTile, BackBtn } from '../ui/Bits'
import { IcoQuran } from '../ui/Icons'

const labels = {
  'Audio-film': 'Audio-films',
  Drama: 'Series & dramas',
  Audiobook: 'Audiobooks',
  'Quran Kareem': 'Quran Kareem',
  Ghazals: 'Ghazals'
}

export default function Kind() {
  const { name } = useParams()
  const { titlesByKind } = useCatalog()
  const list = titlesByKind(name)
  const quran = name === 'Quran Kareem'
  return (
    <>
      <div className="section-head">
        <BackBtn />
        <h1 className={quran ? 'head-with-icon' : undefined}>
          {quran ? <IcoQuran size={26} /> : null}
          {labels[name] || name}
        </h1>
      </div>
      <p className="meta" style={{ marginBottom: 18 }}>
        {quran
          ? 'Recitation, translation and tafsir · Opus · 24–48 kbps mono'
          : 'Opus · 24–48 kbps mono · crisp speech for low internet speeds'}
      </p>
      {list.length ? (
        <div className="grid">
          {list.map((t) => (
            <TitleTile key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <p className="meta">Nothing in this shelf yet. Imported titles live under Added from Settings.</p>
      )}
    </>
  )
}
