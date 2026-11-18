// House catalogue audio lives under /audio/ (or as bare asset ids) and is pruned
// from the native APK to keep it small. Those titles cannot play on a device,
// so they are hidden there instead of showing a broken Play button. Archive.org
// streams, imported titles and locally replaced audio always stay available.
// Serial shells with no episodes are kept so their links can be added later.
export function titlePlayableOnDevice(title, { native = false } = {}) {
  if (!title) return false
  const episodes = Array.isArray(title.episodes) ? title.episodes : []
  if (!episodes.length) return true
  if (!native || title.imported) return true
  return episodes.some((ep) => {
    const src = String(ep?.asset || ep?.audio || '')
    return /^https?:\/\//i.test(src) || /^(local:|blob:|data:)/i.test(src)
  })
}
