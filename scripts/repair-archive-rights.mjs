// One-shot safety repair: re-check the rights of every published verification
// result against live Archive.org metadata using the corrected classifier.
// A record that no longer has explicit reuse evidence is demoted to `blocked`
// and removed from the published manifest.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { classifyRights, rightsAllowPublish } from './lib/archiveRights.js'
import { buildPublishedRecords, publishedManifest } from './lib/archivePublish.js'

const root = path.resolve(import.meta.dirname, '..')
const verificationPath = path.join(root, 'data', 'archiveLibraryVerification.json')
const workingPath = path.join(root, 'data', 'archiveLibraryWorking.json')
const publishedPath = path.join(root, 'src', 'data', 'archiveLibraryVerified.json')

const verification = JSON.parse(readFileSync(verificationPath, 'utf8'))
const working = JSON.parse(readFileSync(workingPath, 'utf8'))
if (!Array.isArray(verification?.results) || !Array.isArray(working?.records)) {
  throw new Error('Expected a verification result set and a working candidate set')
}

async function fetchArchiveMetadata(identifier) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LuminaVoice-archive-verifier/1.0' }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()).metadata || {}
  } finally {
    clearTimeout(timer)
  }
}

const now = new Date().toISOString()
let repaired = 0
let kept = 0
const results = []

for (const result of verification.results) {
  if (result.status !== 'verified') {
    results.push(result)
    continue
  }

  let rights
  try {
    rights = classifyRights(await fetchArchiveMetadata(result.identifier), now)
  } catch {
    // No live metadata means no evidence — block conservatively.
    rights = {
      status: 'unknown',
      evidence: 'none',
      licenseUrl: '',
      attribution: '',
      source: 'archive-item-metadata',
      verifiedAt: now
    }
  }

  if (rightsAllowPublish(rights)) {
    kept += 1
    results.push({ ...result, rights })
    continue
  }

  repaired += 1
  results.push({
    ...result,
    status: 'blocked',
    reasons: [`rights-${rights.status}`],
    rights,
    playback: 'unverified',
    download: 'unverified',
    durationSeconds: null,
    checkedAt: now,
    rightsRepairedAt: now
  })
}

writeFileSync(
  verificationPath,
  `${JSON.stringify(
    {
      ...verification,
      checkedAt: now,
      rightsRepairAt: now,
      rightsRepairNote: 'Re-classified published rights without collection tags as evidence; unverified items are blocked.',
      recordCount: results.length,
      results
    },
    null,
    2
  )}\n`
)

const published = buildPublishedRecords(results, working.records, now)
writeFileSync(publishedPath, `${JSON.stringify(publishedManifest(published, now), null, 2)}\n`)

process.stdout.write(
  `Rights repair: ${repaired} blocked, ${kept} kept, ${published.length} published → ${path.relative(root, publishedPath)}\n`
)
