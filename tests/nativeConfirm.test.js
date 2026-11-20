import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('native confirmations', () => {
  it('does not rely on window.confirm in Android WebView screens', () => {
    for (const path of ['../src/pages/FileLibrary.jsx', '../src/pages/History.jsx']) {
      expect(readSource(path), path).not.toMatch(/window\.confirm\s*\(/)
    }
  })
})
