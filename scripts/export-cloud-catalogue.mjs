// Publishes the Archive.org-only Supabase `stories` table as a static snapshot
// that web and tablet apps pull. No audio bytes and no service-role key: the
// publishable key is enough to read the archive-only rows under RLS.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalArchiveUrl } from '../src/data/contentPolicy.js'
import { mapStoryRow } from '../src/data/cloudCatalogue.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUTPUT = resolve(ROOT, 'public/catalogue.json')

function envFile(name) {
  const path = resolve(ROOT, name)
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
    if (!match) continue
    const value = match[2].replace(/^['"]|['"]$/g, '')
    if (value) out[match[1]] = value
  }
  return out
}

const env = { ...envFile('.env'), ...envFile('.env.local'), ...process.env }
const url = String(env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!url || !key) {
  process.stderr.write('catalogue export needs VITE_SUPABASE_URL and a publishable/anon key\n')
  process.exitCode = 1
} else {
  try {
    const response = await fetch(`${url}/rest/v1/stories?select=*&order=created_at.desc`, {
      cache: 'no-store',
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
    })
    if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`)
    const rows = await response.json()
    const stories = []
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!mapStoryRow(row)) continue
      stories.push({ ...row, audio_url: canonicalArchiveUrl(row.audio_url), cover_url: canonicalArchiveUrl(row.cover_url || '') })
    }
    const snapshot = { version: 1, generatedAt: new Date().toISOString(), source: url, stories }
    mkdirSync(resolve(ROOT, 'public'), { recursive: true })
    const temp = `${OUTPUT}.tmp`
    writeFileSync(temp, `${JSON.stringify(snapshot, null, 2)}\n`)
    renameSync(temp, OUTPUT)
    process.stdout.write(`Catalogue snapshot: ${stories.length} Archive.org story/stories -> ${OUTPUT}\n`)
  } catch (error) {
    process.stderr.write(`Catalogue export failed: ${error?.message || error}\n`)
    process.exitCode = 1
  }
}
