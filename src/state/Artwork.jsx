import { createContext, useContext, useMemo, useState } from 'react'
import {
  coverFor as coverOf,
  loadArtwork,
  portraitFor as portraitOf,
  saveArtwork
} from '../data/artwork'

const Ctx = createContext(null)

export function ArtworkProvider({ children }) {
  const [art, setArt] = useState(() => loadArtwork())

  const persist = (next) => {
    const clean = saveArtwork(next)
    setArt(clean)
    return clean
  }

  const setCover = (titleId, url) => {
    const covers = { ...art.covers }
    if (url) covers[titleId] = url
    else delete covers[titleId]
    return persist({ ...art, covers })
  }

  const setPortrait = (personId, url) => {
    const people = { ...art.people }
    if (url) people[personId] = url
    else delete people[personId]
    return persist({ ...art, people })
  }

  const resetAll = () => persist({ covers: {}, people: {} })

  const value = useMemo(
    () => ({
      art,
      covers: art.covers,
      people: art.people,
      setCover,
      setPortrait,
      resetAll,
      coverFor: (title) => coverOf(art, title),
      portraitFor: (person) => portraitOf(art, person)
    }),
    [art]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useArtwork() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    return {
      art: { covers: {}, people: {} },
      covers: {},
      people: {},
      setCover: () => {},
      setPortrait: () => {},
      resetAll: () => {},
      coverFor: () => '',
      portraitFor: () => ''
    }
  }
  return ctx
}
