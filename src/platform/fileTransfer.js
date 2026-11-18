import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export async function saveBundleFile(name, text) {
  if (Capacitor.isNativePlatform()) {
    const path = `backups/${name}`
    await Filesystem.mkdir({ path: 'backups', directory: Directory.Data, recursive: true }).catch(() => {})
    await Filesystem.writeFile({ path, data: text, directory: Directory.Data, encoding: Encoding.UTF8 })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data })
    try {
      await Share.share({ title: 'Lumina Voice backup', text: 'Lumina Voice data bundle', files: [uri], dialogTitle: 'Share backup' })
    } catch {
      // Sharing is optional — the file is already saved on the device.
    }
    return uri
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}

export function pickBundleFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      file.text().then(resolve, reject)
    }
    input.click()
  })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(reader.error || new Error('Could not read the audio file'))
    reader.readAsDataURL(file)
  })
}

function downloadFile(file, name) {
  const objectUrl = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

// Share one audio part: the file itself on native/web where supported, a link
// otherwise. Returns the method used so the caller can show an honest message.
export async function shareMedia({ file = null, url = '', name = 'audio', title = 'Lumina Voice', text = '' } = {}) {
  if (Capacitor.isNativePlatform()) {
    if (file) {
      try {
        const data = await fileToBase64(file)
        const safeName = String(name || 'audio').replace(/[^a-z0-9._-]+/gi, '_').slice(-80) || 'audio'
        const path = `shares/${safeName}`
        await Filesystem.mkdir({ path: 'shares', directory: Directory.Cache, recursive: true }).catch(() => {})
        await Filesystem.writeFile({ path, data, directory: Directory.Cache })
        const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
        await Share.share({ title, text, files: [uri], dialogTitle: 'Share audio' })
        return 'shared-file'
      } catch {
        // Fall back to the link below if the file cannot be staged for sharing.
      }
    }
    if (url) {
      await Share.share({ title, text, url, dialogTitle: 'Share audio' })
      return 'shared-link'
    }
    throw new Error('This file cannot be shared.')
  }

  if (file && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] })
    return 'shared-file'
  }
  if (url && navigator.share) {
    await navigator.share({ title, text, url })
    return 'shared-link'
  }
  if (url) {
    await navigator.clipboard?.writeText(url)
    return 'link-copied'
  }
  if (file) {
    downloadFile(file, name)
    return 'downloaded'
  }
  throw new Error('This file cannot be shared.')
}
