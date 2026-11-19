import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  authors as bundledAuthors,
  poets as bundledPoets,
  titles as bundledTitles,
  seriesList,
  genres,
  kinds,
  catalogues,
  getCatalogue,
  catalogueForTitle,
  hero,
  getSeries
} from '../data/catalog'
import { voices, voiceForTitle } from '../data/voices'
import { loadStudio, resolveVoice } from '../data/voiceStudio'
import {
  loadUserCatalog,
  saveUserCatalog,
  sanitiseUserCatalog,
  slugId,
  nextPalette,
  sanitiseTitlePatch,
  sanitiseGenreName,
  sanitiseGenreList
} from '../data/userCatalog'
import { deleteLocalFile, isLocalAsset, localId } from '../data/localMedia'
import { titlePlayableOnDevice } from '../data/playability'
import { fetchCatalogue, loadCachedCatalogue } from '../data/cloudCatalogue'
import { subscribeToChanges } from '../data/realtime'

const Ctx = createContext(null)

function merge(user, native = false, cloud = []) {
  const authors = [...bundledAuthors, ...(user.authors || [])]
  const poets = [...bundledPoets, ...(user.poets || [])]
  const overrides = user.overrides || {}
  // An override applies on top of whichever title it names — bundled, cloud or
  // imported — so the studio can correct any entry in the catalogue.
  const applyOverride = (t) => (overrides[t.id] ? { ...t, ...overrides[t.id] } : t)
  // A cloud row replaces the bundled fallback for the same Archive item; a
  // device import keeps priority so an operator's local edits still win.
  const cloudSources = new Set(cloud.map((t) => t.sourceUrl))
  const bundled = bundledTitles.filter((t) => !cloudSources.has(t.sourceUrl))
  // The APK ships no house audio. On a device, hide entries that could only
  // produce "no audio on this device" instead of cluttering every shelf.
  const titles = [...bundled, ...cloud, ...(user.titles || [])]
    .map(applyOverride)
    .filter((t) => titlePlayableOnDevice(t, { native }))
  return { authors, poets, titles }
}

export function CatalogProvider({ children }) {
  const [user, setUser] = useState(() => loadUserCatalog())
  const [cloudTitles, setCloudTitles] = useState(() => loadCachedCatalogue())

  // Cron publishes the snapshot; devices pull it. Realtime is a bonus for an
  // open tab, and the cached copy keeps the catalogue alive with no signal.
  const refreshCatalogue = useCallback(async () => {
    try {
      setCloudTitles(await fetchCatalogue())
    } catch {
      /* keep the last good snapshot */
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const run = () => {
      if (mounted) refreshCatalogue()
    }
    run()
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') run()
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(run, 15 * 60 * 1000)
    const stop = subscribeToChanges(['stories'], run)
    return () => {
      mounted = false
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
      stop()
    }
  }, [refreshCatalogue])

  const persist = (next) => {
    const clean = saveUserCatalog(next)
    setUser(clean)
    return clean
  }

  // Another device pushed a fresh metadata bundle through Supabase user_state.
  // Merge its imported titles into the live catalog without a page reload.
  useEffect(() => {
    const onSync = (event) => {
      const incoming = sanitiseUserCatalog(event.detail)
      setUser((current) => {
        const ids = new Set((current.titles || []).map((t) => t.id))
        const merged = {
          ...incoming,
          titles: [...(current.titles || []), ...(incoming.titles || []).filter((t) => !ids.has(t.id))],
          authors: [...(current.authors || []), ...(incoming.authors || []).filter((a) => !(current.authors || []).some((x) => x.id === a.id))],
          poets: [...(current.poets || []), ...(incoming.poets || []).filter((p) => !(current.poets || []).some((x) => x.id === p.id))]
        }
        return saveUserCatalog(merged)
      })
    }
    window.addEventListener('lumina:catalog-sync', onSync)
    return () => window.removeEventListener('lumina:catalog-sync', onSync)
  }, [])

  const native = Capacitor.isNativePlatform()
  const merged = useMemo(() => merge(user, native, cloudTitles), [user, native, cloudTitles])

  // Every genre the library knows about: the bundled shelves, the ones added by
  // hand, and any that a title already carries — so a name typed straight into
  // a title is still offered as a pill next time.
  const allGenres = useMemo(() => {
    const out = []
    const seen = new Set()
    const push = (raw) => {
      const name = sanitiseGenreName(raw)
      if (!name) return
      const key = name.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      out.push(name)
    }
    genres.forEach(push)
    ;(user.genres || []).forEach(push)
    merged.titles.forEach((t) => (t.genres || []).forEach(push))
    return out
  }, [merged, user])

  const addGenre = (name) => {
    const clean = sanitiseGenreName(name)
    if (!clean) return null
    const exists = allGenres.some((g) => g.toLowerCase() === clean.toLowerCase())
    if (exists) return allGenres.find((g) => g.toLowerCase() === clean.toLowerCase())
    persist({ ...user, genres: sanitiseGenreList([...(user.genres || []), clean]) })
    return clean
  }

  const removeGenre = (name) => {
    const key = String(name || '').toLowerCase()
    const next = (user.genres || []).filter((g) => g.toLowerCase() !== key)
    persist({ ...user, genres: next })
  }

  const getAuthor = (id) => merged.authors.find((a) => a.id === id) || merged.poets.find((p) => p.id === id)

  const getTitle = (id) => merged.titles.find((t) => t.id === id)

  const titlesBySeries = (seriesId) => merged.titles.filter((t) => t.seriesId === seriesId)
  const titlesByAuthor = (authorId) => merged.titles.filter((t) => t.authorId === authorId)
  const titlesByGenre = (genre) => merged.titles.filter((t) => (t.genres || []).includes(genre))
  const titlesByKind = (kind) => merged.titles.filter((t) => t.kind === kind)

  const searchCatalog = (q) => {
    const s = q.trim().toLowerCase()
    if (!s) return { titles: [], series: [], people: [] }
    const hit = (v) => (v || '').toLowerCase().includes(s)
    const voiceHit = (t) => {
      const v = resolveVoice(t, loadStudio()) || voiceForTitle(t)
      return v && (hit(v.name) || hit(v.nameUr) || hit(v.label) || hit(v.role))
    }
    return {
      titles: merged.titles.filter((t) => {
        const author = getAuthor(t.authorId)
        return (
          hit(t.name) ||
          hit(t.nameUr) ||
          (t.number || '').includes(s) ||
          hit(t.kind) ||
          hit(t.source) ||
          hit(t.sourceUrl) ||
          hit(t.synopsis) ||
          (t.genres || []).some((g) => hit(g)) ||
          hit(author?.name) ||
          hit(author?.nameUr) ||
          voiceHit(t)
        )
      }),
      series: seriesList.filter((x) => hit(x.name) || hit(x.nameUr) || hit(x.genre)),
      people: [
        ...[...merged.authors, ...merged.poets].filter((p) => hit(p.name) || hit(p.nameUr) || hit(p.role)),
        ...voices.filter((v) => hit(v.name) || hit(v.nameUr) || hit(v.label) || hit(v.role) || hit(v.bio)).map((v) => ({
          ...v,
          kind: 'voice'
        }))
      ]
    }
  }

  const upsertPerson = (role, person) => {
    const key = role === 'Poet' ? 'poets' : 'authors'
    const list = [...(user[key] || [])]
    const i = list.findIndex((p) => p.id === person.id)
    if (i >= 0) list[i] = { ...list[i], ...person }
    else list.push(person)
    return persist({ ...user, [key]: list })
  }

  const addImportedTitle = (draft) => {
    const title = {
      id: draft.id || slugId('user', draft.name),
      number: draft.number || '',
      name: draft.name,
      nameUr: draft.nameUr || '',
      seriesId: draft.seriesId || null,
      voiceId: draft.voiceId || 'pk-female',
      authorId: draft.authorId,
      genres: draft.genres || ['Audiobook'],
      kind: draft.kind || 'Audiobook',
      featured: !!draft.featured,
      top: !!draft.top,
      year: draft.year || new Date().getFullYear(),
      cover: draft.cover || nextPalette(user.titles.length),
      coverUrl: draft.coverUrl || '',
      source: draft.source || 'import',
      sourceUrl: draft.sourceUrl || '',
      synopsis: draft.synopsis || '',
      imported: true,
      episodes: draft.episodes
    }
    const previous = (user.titles || []).filter((t) => t.id === title.id)
    const keep = new Set((title.episodes || []).map((e) => e.asset).filter(isLocalAsset))
    previous.forEach((t) => {
      (t.episodes || []).forEach((ep) => {
        if (isLocalAsset(ep.asset) && !keep.has(ep.asset)) {
          deleteLocalFile(localId(ep.asset)).catch(() => {})
        }
      })
    })
    return persist({ ...user, titles: [title, ...(user.titles || []).filter((t) => t.id !== title.id)] })
  }

  const removeImportedTitle = async (titleId) => {
    const title = (user.titles || []).find((t) => t.id === titleId)
    if (title?.episodes) {
      for (const ep of title.episodes) {
        if (isLocalAsset(ep.asset)) {
          try {
            await deleteLocalFile(localId(ep.asset))
          } catch {
            /* ignore */
          }
        }
      }
    }
    return persist({ ...user, titles: (user.titles || []).filter((t) => t.id !== titleId) })
  }

  const patchImportedTitle = (titleId, patch) => {
    const list = user.titles || []
    const i = list.findIndex((t) => t.id === titleId)
    if (i < 0) return user
    const next = [...list]
    next[i] = { ...next[i], ...patch, imported: true, id: titleId }
    return persist({ ...user, titles: next })
  }

  // Works on every title, bundled ones included. Imported titles keep their
  // change in the title record itself; bundled titles get an override entry so
  // the shipped catalogue constant is never mutated.
  const patchTitle = (titleId, patch) => {
    const clean = sanitiseTitlePatch(patch)
    if (!Object.keys(clean).length) return user
    const isImported = (user.titles || []).some((t) => t.id === titleId)
    if (isImported) return patchImportedTitle(titleId, clean)
    const overrides = { ...(user.overrides || {}) }
    overrides[titleId] = { ...(overrides[titleId] || {}), ...clean }
    persist({ ...user, overrides })
    return overrides
  }

  const resetTitle = (titleId) => {
    const overrides = { ...(user.overrides || {}) }
    delete overrides[titleId]
    persist({ ...user, overrides })
    return overrides
  }

  const hasTitleOverride = (titleId) => !!(user.overrides || {})[titleId]

  const value = useMemo(
    () => ({
      titles: merged.titles,
      authors: merged.authors,
      poets: merged.poets,
      importedTitles: user.titles || [],
      importedAuthors: user.authors || [],
      importedPoets: user.poets || [],
      overrides: user.overrides || {},
      seriesList,
      genres: allGenres,
      bundledGenres: genres,
      customGenres: user.genres || [],
      addGenre,
      removeGenre,
      kinds,
      catalogues,
      getCatalogue,
      catalogueForTitle,
      hero,
      getSeries,
      getAuthor,
      getTitle,
      titlesBySeries,
      titlesByAuthor,
      titlesByGenre,
      titlesByKind,
      searchCatalog,
      upsertPerson,
      addImportedTitle,
      removeImportedTitle,
      patchImportedTitle,
      patchTitle,
      resetTitle,
      hasTitleOverride
    }),
    [merged, user]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCatalog() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    return {
      titles: bundledTitles,
      authors: bundledAuthors,
      poets: bundledPoets,
      importedTitles: [],
      importedAuthors: [],
      importedPoets: [],
      overrides: {},
      seriesList,
      genres,
      bundledGenres: genres,
      customGenres: [],
      addGenre: () => null,
      removeGenre: () => {},
      kinds,
      catalogues,
      getCatalogue,
      catalogueForTitle,
      hero,
      getSeries,
      getAuthor: (id) => bundledAuthors.find((a) => a.id === id) || bundledPoets.find((p) => p.id === id),
      getTitle: (id) => bundledTitles.find((t) => t.id === id),
      titlesBySeries: (id) => bundledTitles.filter((t) => t.seriesId === id),
      titlesByAuthor: (id) => bundledTitles.filter((t) => t.authorId === id),
      titlesByGenre: (g) => bundledTitles.filter((t) => t.genres.includes(g)),
      titlesByKind: (k) => bundledTitles.filter((t) => t.kind === k),
      searchCatalog: () => ({ titles: [], series: [], people: [] }),
      upsertPerson: () => {},
      addImportedTitle: () => {},
      removeImportedTitle: () => {},
      patchImportedTitle: () => {},
      patchTitle: () => {},
      resetTitle: () => {},
      hasTitleOverride: () => false
    }
  }
  return ctx
}
