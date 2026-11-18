import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { getVoice, titlesByVoice } from '../data/voices'
import { AvatarArt } from '../art/covers'
import { BackBtn, TitleTile, PlayBtn } from '../ui/Bits'
import { sourceList } from '../data/media'
import { useArtwork } from '../state/Artwork.jsx'

export default function Person() {
  const { id } = useParams()
  const { getAuthor, titles, titlesByAuthor } = useCatalog()
  const author = getAuthor(id)
  const voice = getVoice(id)
  const p = author || voice
  const list = author ? titlesByAuthor(id) : titlesByVoice(id, titles)
  const sampleRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const { portraitFor } = useArtwork()
  if (!p) return <p>Not found.</p>

  const playSample = () => {
    const el = sampleRef.current
    if (!el || !voice) return
    if (playing) {
      el.pause()
      setPlaying(false)
      return
    }
    while (el.firstChild) el.removeChild(el.firstChild)
    sourceList(voice.sample).forEach((s) => {
      const source = document.createElement('source')
      source.src = s.src
      source.type = s.type
      el.appendChild(source)
    })
    el.load()
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }

  return (
    <>
      <div className="section-head">
        <BackBtn />
        <h1>{p.name}</h1>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 22 }}>
        <div className="avatar" style={{ width: 96, height: 96 }}>
          <AvatarArt name={p.name} seed={p.id} src={portraitFor(p)} />
        </div>
        <div>
          <div className="badge">{p.label || p.role}</div>
          {p.nameUr ? (
            <p className="urdu" style={{ fontSize: 22, color: 'var(--gold)', margin: '4px 0 8px' }}>
              {p.nameUr}
            </p>
          ) : null}
          <p className="synopsis" style={{ margin: 0 }}>
            {p.bio}
          </p>
          {voice ? (
            <div style={{ marginTop: 12 }}>
              <PlayBtn onClick={playSample}>{playing ? 'Pause sample' : 'Hear sample'}</PlayBtn>
              <audio ref={sampleRef} preload="none" onEnded={() => setPlaying(false)} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="row-title">
        <h2>{voice ? 'Narrated titles' : 'Works'}</h2>
      </div>
      <div className="grid">
        {list.map((t) => (
          <TitleTile key={t.id} t={t} />
        ))}
      </div>
    </>
  )
}
