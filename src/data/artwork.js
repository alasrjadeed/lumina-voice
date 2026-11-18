const KEY = 'lumina-artwork-v1'
const MAX_BYTES = 420000

export const emptyArtwork = () => ({ covers: {}, people: {} })

export function isImageSrc(v) {
  if (!v || typeof v !== 'string') return false
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith('data:image/') ||
    v.startsWith('blob:') ||
    v.startsWith('/')
  )
}

export function isLikelyImageUrl(v) {
  if (!v) return false
  const s = String(v).trim()
  if (s.startsWith('data:image/')) return true
  if (s.startsWith('/')) return true
  try {
    const u = new URL(s)
    if (!/^https?:$/i.test(u.protocol)) return false
    if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(u.pathname)) return true
    if (u.hostname.endsWith('archive.org')) return true
    if (u.hostname.includes('ia') && u.hostname.includes('archive')) return true
    if (/\/services\/img\//i.test(u.pathname)) return true
    if (/cover|jacket|front|thumb|image|portrait|photo|picture/i.test(s)) return true
    return /^https?:\/\//i.test(s)
  } catch {
    return false
  }
}

export function archiveCoverUrl(input) {
  const raw = (input || '').trim()
  if (!raw) return ''
  if (isImageSrc(raw) && !/archive\.org\/details\//i.test(raw) && !/^ia[:\s]/i.test(raw)) {
    if (/archive\.org\/services\/img\//i.test(raw)) return raw
    if (/archive\.org\/download\//i.test(raw) && /\.(jpe?g|png|gif|webp)/i.test(raw)) return raw
  }
  let id
  const details = raw.match(/archive\.org\/details\/([^/?#]+)/i)
  const img = raw.match(/archive\.org\/services\/img\/([^/?#]+)/i)
  const dl = raw.match(/archive\.org\/download\/([^/?#]+)/i)
  if (details) id = details[1]
  else if (img) id = img[1]
  else if (dl) id = dl[1]
  else id = raw.replace(/^ia[:\s]+/i, '').trim()
  if (!id || /\s/.test(id) && !details) {
    if (/^https?:\/\//i.test(raw)) return raw
  }
  id = id.replace(/\/+$/, '')
  if (!id) return raw
  return `https://archive.org/services/img/${encodeURIComponent(id)}`
}

export function loadArtwork() {
  try {
    if (typeof localStorage === 'undefined') return emptyArtwork()
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyArtwork()
    const parsed = JSON.parse(raw)
    return {
      covers: parsed.covers && typeof parsed.covers === 'object' ? parsed.covers : {},
      people: parsed.people && typeof parsed.people === 'object' ? parsed.people : {}
    }
  } catch {
    return emptyArtwork()
  }
}

export function saveArtwork(next) {
  const clean = {
    covers: next.covers || {},
    people: next.people || {}
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(clean))
  } catch {
    /* quota */
  }
  return clean
}

export function coverFor(art, title) {
  if (!title) return ''
  const id = typeof title === 'string' ? title : title.id
  return (art?.covers && art.covers[id]) || (typeof title === 'object' ? title.coverUrl : '') || ''
}

export function portraitFor(art, person) {
  if (!person) return ''
  const id = typeof person === 'string' ? person : person.id
  return (art?.people && art.people[id]) || (typeof person === 'object' ? person.imageUrl : '') || ''
}

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choose a JPEG, PNG, WebP, or GIF.'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const max = 640
        const scale = Math.min(1, max / Math.max(img.width, img.height) || 1)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        let quality = 0.82
        let data = canvas.toDataURL('image/jpeg', quality)
        while (data.length > MAX_BYTES && quality > 0.4) {
          quality -= 0.12
          data = canvas.toDataURL('image/jpeg', quality)
        }
        if (data.length > MAX_BYTES) {
          reject(new Error('Image is still too large after shrinking. Use a URL instead.'))
          return
        }
        resolve(data)
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    img.src = url
  })
}
