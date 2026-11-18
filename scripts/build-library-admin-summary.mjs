import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { SOURCE_POLICY, TARGET_CATEGORIES } from './lib/libraryCandidates.js'

const root = path.resolve(import.meta.dirname, '..')

function readJson(relativePath, fallback) {
  const fullPath = path.join(root, relativePath)
  return existsSync(fullPath) ? JSON.parse(readFileSync(fullPath, 'utf8')) : fallback
}

const working = readJson('data/archiveLibraryWorking.json', { records: [] })
const verification = readJson('data/archiveLibraryVerification.json', {
  checkedAt: '',
  stage: 'metadata',
  results: []
})
const manifest = readJson('src/data/archiveLibraryVerified.json', { records: [] })

const results = new Map(
  (Array.isArray(verification.results) ? verification.results : []).map((result) => [result.id, result])
)
const published = new Set(
  (Array.isArray(manifest.records) ? manifest.records : []).map((record) => record.id)
)

const records = (Array.isArray(working.records) ? working.records : []).map((record) => {
  const result = results.get(record.id)
  const status = published.has(record.id)
    ? 'verified'
    : result?.status || record.status || 'candidate'
  return {
    id: record.id,
    title: record.title,
    category: record.category?.suggested || '',
    status,
    rightsStatus: result?.rights?.status || record.verification?.rights?.status || 'unknown',
    reason: Array.isArray(result?.reasons) && result.reasons.length ? result.reasons[0] : '',
    identifier: result?.identifier || '',
    archiveItemUrl: result?.archiveItemUrl || record.archiveSearchUrl || ''
  }
})

const targets = TARGET_CATEGORIES.map(({ id, label, target }) => ({
  id,
  label,
  target,
  candidates: records.filter((r) => r.category === label).length,
  verified: records.filter((r) => r.category === label && r.status === 'verified' && published.has(r.id)).length,
  blocked: records.filter((r) => r.category === label && r.status === 'blocked').length,
  rejected: records.filter((r) => r.category === label && r.status === 'rejected').length,
  published: records.filter((r) => r.category === label && published.has(r.id)).length
}))

const outputDir = path.join(root, 'src', 'data', 'generated')
const outputPath = path.join(outputDir, 'archiveLibraryAdmin.json')
mkdirSync(outputDir, { recursive: true })
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourcePolicy: SOURCE_POLICY,
      checkedAt: verification.checkedAt || '',
      stage: verification.stage || 'metadata',
      totals: {
        candidates: records.length,
        verified: records.filter((r) => published.has(r.id)).length,
        blocked: records.filter((r) => r.status === 'blocked').length,
        rejected: records.filter((r) => r.status === 'rejected').length,
        unchecked: records.filter((r) => r.status === 'candidate').length,
        published: published.size
      },
      targets,
      records
    },
    null,
    2
  )}\n`
)
process.stdout.write(
  `Generated admin summary: ${records.length} candidate(s), ${published.size} published → ${path.relative(root, outputPath)}\n`
)
