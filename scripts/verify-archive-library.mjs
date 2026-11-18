import { spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { SOURCE_POLICY, eligibleForVerification, normaliseAuthor } from './lib/libraryCandidates.js'
import { classifyRights, rightsAllowPublish } from './lib/archiveRights.js'
import { buildPublishedRecords, publishedManifest } from './lib/archivePublish.js'

const root = path.resolve(import.meta.dirname, '..')
const MAX_SOURCE_BYTES = 400 * 1024 * 1024

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const sourcePath = path.resolve(flag('source', path.join(root, 'data', 'archiveLibraryWorking.json')))
const outPath = path.resolve(flag('out', path.join(root, 'data', 'archiveLibraryVerification.json')))
const publishedPath = path.join(root, 'src', 'data', 'archiveLibraryVerified.json')
const stage = flag('stage', 'metadata')
const limit = Math.max(0, Number(flag('limit', '0')) || 0)
const titleFilter = flag('title', '').toLowerCase()
const categoryFilter = flag('category', '').toLowerCase()
const publish = process.argv.includes('--publish')

if (!['metadata', 'audio'].includes(stage)) throw new Error(`Unknown stage: ${stage}`)
if (publish && stage !== 'audio') throw new Error('--publish requires --stage audio')

const working = JSON.parse(readFileSync(sourcePath, 'utf8'))
if (!Array.isArray(working.records)) throw new Error(`No records in ${sourcePath}`)

let records = working.records.filter(eligibleForVerification)
if (titleFilter) records = records.filter((r) => r.title.toLowerCase().includes(titleFilter))
if (categoryFilter) {
  records = records.filter((r) => r.category?.suggested?.toLowerCase().includes(categoryFilter))
}
if (limit) records = records.slice(0, limit)

const searchCache = new Map()
const metadataCache = new Map()

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LuminaVoice-archive-verifier/1.0' }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

async function advancedSearch(query) {
  if (searchCache.has(query)) return searchCache.get(query)
  const url =
    'https://archive.org/advancedsearch.php' +
    `?q=${encodeURIComponent(query)}` +
    '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator&fl%5B%5D=language' +
    '&rows=5&page=1&output=json'
  const json = await fetchJson(url)
  const docs = Array.isArray(json?.response?.docs) ? json.response.docs : []
  searchCache.set(query, docs)
  return docs
}

async function fetchArchiveMetadata(identifier) {
  if (metadataCache.has(identifier)) return metadataCache.get(identifier)
  const meta = await fetchJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`)
  metadataCache.set(identifier, meta)
  return meta
}

function cleanQuery(value) {
  return String(value || '')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function audioRank(file) {
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.mp3')) return 0
  if (name.endsWith('.m4a')) return 1
  if (name.endsWith('.opus')) return 2
  if (name.endsWith('.ogg') || name.endsWith('.oga')) return 3
  if (name.endsWith('.flac')) return 4
  if (name.endsWith('.wav')) return 5
  return 99
}

function pickAudioFile(files) {
  const audio = (Array.isArray(files) ? files : [])
    .filter((file) => audioRank(file) < 99)
    .sort((a, b) => audioRank(a) - audioRank(b))
  return audio[0] || null
}

const TITLE_STOPWORDS = new Set(['the', 'and', 'of', 'for', 'with', 'from', 'that'])

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function titleMatchScore(meta, file, record) {
  const expected = compact(record.title)
  const haystack = `${compact(meta.title)}|${compact(file?.name)}`
  if (expected && haystack.includes(expected)) return 10

  const tokens = String(record.title || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 4 && !TITLE_STOPWORDS.has(token))
  const text = `${meta.title || ''} ${file?.name || ''}`.toLowerCase()
  const hits = tokens.filter((token) => text.includes(token)).length
  return hits >= 2 ? hits : 0
}

function matchScore(meta, file, record, creator) {
  const urdu = hasUrduEvidence(meta, file) ? 10 : 0
  const creatorMatch = creator && String(meta.creator || '').toLowerCase().includes(creator.toLowerCase()) ? 1 : 0
  return titleMatchScore(meta, file, record) + urdu + creatorMatch
}

function archiveDownloadUrl(identifier, fileName) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`
}

function hasUrduEvidence(meta, file) {
  const text = [meta.language, meta.title, meta.subject, meta.collection, meta.description, meta.creator, meta.uploader, file?.name]
    .filter(Boolean)
    .map((value) => (Array.isArray(value) ? value.join(' ') : value))
    .join(' ')
  return /(\burdu\b|\bur\b|اردو)/i.test(text)
}

async function findArchiveMatch(record) {
  const creator = normaliseAuthor(record.reported.narrator)
  const queries = [`title:("${cleanQuery(record.title)}") AND mediatype:audio`]
  if (creator) queries.push(`creator:("${cleanQuery(creator)}") AND mediatype:audio`)

  const byIdentifier = new Map()
  for (const query of queries) {
    const docs = await advancedSearch(query)
    for (const doc of docs) {
      if (doc?.identifier) byIdentifier.set(doc.identifier, doc)
    }
  }
  if (!byIdentifier.size) return null

  const matches = []
  for (const identifier of [...byIdentifier.keys()].slice(0, 10)) {
    const meta = await fetchArchiveMetadata(identifier)
    const file = pickAudioFile(meta.files)
    if (!file) continue
    const itemMeta = meta.metadata || {}
    if (titleMatchScore(itemMeta, file, record) === 0) continue
    matches.push({
      meta: itemMeta,
      file,
      score: matchScore(itemMeta, file, record, creator)
    })
  }
  matches.sort((a, b) => b.score - a.score)
  return matches[0] || null
}

async function downloadAudio(url, destination) {
  mkdirSync(path.dirname(destination), { recursive: true })
  const response = await fetch(url, { headers: { 'User-Agent': 'LuminaVoice-archive-verifier/1.0' } })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > MAX_SOURCE_BYTES) throw new Error('source-audio-too-large')
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination))
  const bytes = statSync(destination).size
  if (bytes > MAX_SOURCE_BYTES) throw new Error('source-audio-too-large')
  return destination
}

function probeDuration(file) {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) throw new Error(result.stderr?.trim() || 'ffprobe failed')
  const seconds = Math.round(Number(result.stdout.trim()))
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('invalid-duration')
  return seconds
}

async function verifyRecord(record) {
  const now = new Date().toISOString()
  const result = {
    id: record.id,
    title: record.title,
    category: record.category.suggested,
    checkedAt: now,
    stage,
    status: 'checked',
    reasons: [],
    playback: 'unverified',
    download: 'unverified',
    durationSeconds: null,
    reportedLengthSeconds: null
  }

  try {
    const match = await findArchiveMatch(record)
    if (!match) {
      result.status = 'rejected'
      result.reasons.push('no-archive-item-with-audio')
      return result
    }

    const { meta, file } = match
    result.identifier = String(meta.identifier || '')
    result.archiveItemUrl = result.identifier ? `https://archive.org/details/${result.identifier}` : ''
    result.audioFile = String(file.name || '')
    result.directMp3Url = archiveDownloadUrl(result.identifier, result.audioFile)
    result.reportedLengthSeconds = Number(file.length) > 0 ? Math.round(Number(file.length)) : null
    result.rights = classifyRights(meta, now)
    result.languageEvidence = hasUrduEvidence(meta, file)

    if (!result.languageEvidence) {
      result.status = 'rejected'
      result.reasons.push('language-unconfirmed')
      return result
    }
    if (!rightsAllowPublish(result.rights)) {
      result.status = 'blocked'
      result.reasons.push(`rights-${result.rights.status}`)
      return result
    }

    if (stage === 'audio') {
      const destination = path.join(
        '/tmp/lumina-archive-sources',
        result.identifier,
        path.basename(result.audioFile)
      )
      await downloadAudio(result.directMp3Url, destination)
      result.durationSeconds = probeDuration(destination)
      result.playback = 'verified'
      result.download = 'verified'
      result.status = 'verified'
    }

    return result
  } catch (error) {
    result.status = 'rejected'
    result.reasons.push(error instanceof Error ? error.message : 'verification-error')
    return result
  }
}

const results = []
process.stdout.write(`Verifying ${records.length} candidate(s) at ${stage} stage…\n`)
for (const record of records) {
  const result = await verifyRecord(record)
  results.push(result)
  const detail = result.identifier || result.reasons.join(', ')
  process.stdout.write(`${result.id} ${result.status} ${detail}\n`)
}

mkdirSync(path.dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      version: 1,
      sourcePolicy: SOURCE_POLICY,
      checkedAt: new Date().toISOString(),
      stage,
      recordCount: results.length,
      results
    },
    null,
    2
  )}\n`
)

if (publish) {
  const now = new Date().toISOString()
  const published = buildPublishedRecords(results, working.records, now)
  writeFileSync(publishedPath, `${JSON.stringify(publishedManifest(published, now), null, 2)}\n`)
  process.stdout.write(`Published ${published.length} verified record(s) to ${path.relative(root, publishedPath)}\n`)
}

const counts = results.reduce((acc, result) => {
  acc[result.status] = (acc[result.status] || 0) + 1
  return acc
}, {})
process.stdout.write(`${JSON.stringify(counts)}\n`)
process.stdout.write(`results: ${path.relative(root, outPath)}\n`)
