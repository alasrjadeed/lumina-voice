import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (rel) => readFileSync(path.join(root, rel), 'utf8')

function sourceFiles(dir = 'src', out = []) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(rel, out)
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(rel)
  }
  return out
}

describe('Huawei AppGallery store readiness', () => {
  it('ships an accessible privacy policy with developer and data-deletion details', () => {
    const policy = read('src/pages/Privacy.jsx')
    expect(policy).toContain('Privacy policy')
    expect(policy).toContain('AL ASAR JADEED')
    expect(policy).toContain('info@alasarjadeed.com')
    expect(policy).toContain('No audio bytes are uploaded')
    expect(read('src/App.jsx')).toContain('path="/privacy"')
    expect(read('src/pages/Settings.jsx')).toContain('to="/privacy"')
  })

  it('keeps LAN addresses and broadcast keys out of shipped source and public docs', () => {
    for (const file of [...sourceFiles(), 'public/llms.txt', 'llms.txt']) {
      const text = read(file)
      expect(text, file).not.toMatch(/192\.168\./)
      expect(text, file).not.toMatch(/8d5eaee6a93d7ad8/)
    }
  })

  it('uses a store release manifest without cleartext traffic', () => {
    expect(read('android/app/src/release/AndroidManifest.xml')).toContain('android:usesCleartextTraffic="false"')
  })

  it('has a signed, versioned store build path', () => {
    const gradle = read('android/app/build.gradle')
    expect(gradle).toContain('versionCode 2')
    expect(gradle).toContain('versionName "1.0.0"')
    expect(gradle).toContain('signingConfig signingConfigs.release')
    expect(JSON.parse(read('package.json')).scripts['build:store']).toBe(
      'node scripts/prepare-store-env.mjs && vite build --mode store'
    )
  })

  it('blanks broadcast values before Vite inlines the store environment', () => {
    const generator = read('scripts/prepare-store-env.mjs')
    const example = read('.env.store.example')
    for (const key of [
      'VITE_AZURACAST_API_KEY',
      'VITE_AZURACAST_BASE_URL',
      'VITE_AZURACAST_API_URL',
      'VITE_RADIO_STREAM_URL',
      'VITE_STREAM_LISTEN_BASE'
    ]) {
      expect(generator, key).toContain(`${key}=`)
      expect(example, key).toContain(`${key}=`)
    }
    expect(generator).toContain('VITE_RADIO_ENABLED=false')
    expect(generator).toContain('VITE_CATALOGUE_SNAPSHOT_URL=/catalogue.json')
    expect(example).toContain('VITE_RADIO_ENABLED=false')
  })

  it('documents store listing, rights and release checks', () => {
    const doc = read('docs/store/huawei-appgallery.md')
    expect(doc).toContain('com.luminavoice.app')
    expect(doc).toContain('https://www.alasarjadeed.com/privacy')
    expect(doc).toContain('Rights checklist')
  })
})
