const DB = 'lumina-local-media-v1'
const STORE = 'files'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser cannot store local files.'))
      return
    }
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      // Only create the store if it does not exist. Bumping the DB version must
      // never delete existing files — downloaded audio persists across updates.
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB failed'))
  })
}

function mimeFromName(name, fallback = '') {
  const n = String(name || '').split('?')[0].toLowerCase()
  if (/\.opus$|\.ogg$|\.oga$/.test(n)) return 'audio/ogg; codecs=opus'
  if (/\.m4a$|\.aac$/.test(n)) return 'audio/mp4'
  if (/\.mp3$/.test(n)) return 'audio/mpeg'
  if (/\.wav$/.test(n)) return 'audio/wav'
  if (/\.flac$/.test(n)) return 'audio/flac'
  return fallback
}

export async function putLocalFile(id, file) {
  const typed =
    file && !file.type
      ? new File([file], file.name, { type: mimeFromName(file.name, 'application/octet-stream') })
      : file
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(typed, id)
    tx.oncomplete = () => {
      db.close()
      resolve(id)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error || new Error('Could not store that file'))
    }
  })
}

export async function listLocalFileIds() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAllKeys()
    req.onsuccess = () => { db.close(); resolve(req.result.map(String)) }
    req.onerror = () => { db.close(); reject(req.error || new Error('Could not list local files')) }
  })
}

export async function getLocalFile(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => {
      db.close()
      resolve(req.result || null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function deleteLocalFile(id) {
  const cached = blobCache.get(id)
  if (cached?.url) URL.revokeObjectURL(cached.url)
  blobCache.delete(id)
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

const blobCache = new Map()

export async function localObjectUrl(id) {
  if (blobCache.has(id)) return blobCache.get(id)
  const file = await getLocalFile(id)
  if (!file) return ''
  const url = URL.createObjectURL(file)
  const type = file.type || mimeFromName(file.name)
  const packed = { url, type }
  blobCache.set(id, packed)
  return packed
}

export function isLocalAsset(asset) {
  return typeof asset === 'string' && asset.startsWith('local:')
}

export function localId(asset) {
  return isLocalAsset(asset) ? asset.slice(6) : ''
}
