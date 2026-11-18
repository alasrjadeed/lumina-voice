import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  SOURCE_POLICY,
  applyReplacements,
  normaliseCandidates,
  summariseTargets
} from './lib/libraryCandidates.js'

const root = path.resolve(import.meta.dirname, '..')

function flag(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const source = path.resolve(
  flag('source', '/home/oem/Downloads/urdu_audiobook_catalogue_100.json')
)
const outDir = path.resolve(flag('out-dir', path.join(root, 'data')))
const appDataDir = path.join(root, 'src', 'data')

const raw = JSON.parse(readFileSync(source, 'utf8'))
if (!Array.isArray(raw.records) || raw.records.length === 0) {
  throw new Error(`No records found in ${source}`)
}

const replacementsPath = path.resolve(
  flag('replacements', path.join(outDir, 'archiveLibraryReplacements.json'))
)
const replacements = existsSync(replacementsPath)
  ? JSON.parse(readFileSync(replacementsPath, 'utf8')).replacements || []
  : []
const applied = applyReplacements(raw.records, replacements)
const working = normaliseCandidates(applied.records)
const duplicates = working.filter((record) => record.status === 'duplicate').length
const now = new Date().toISOString()

mkdirSync(outDir, { recursive: true })
mkdirSync(appDataDir, { recursive: true })

const candidatePath = path.join(outDir, 'archiveLibraryCandidates.json')
if (!existsSync(candidatePath)) {
  writeFileSync(
    candidatePath,
    `${JSON.stringify(
      {
        sourcePolicy: SOURCE_POLICY,
        sourceFile: source,
        createdAt: now,
        recordCount: raw.records.length,
        records: raw.records
      },
      null,
      2
    )}\n`
  )
}

const workingPath = path.join(outDir, 'archiveLibraryWorking.json')
writeFileSync(
  workingPath,
  `${JSON.stringify(
    {
      version: 1,
      sourcePolicy: SOURCE_POLICY,
      createdAt: now,
      sourceFile: source,
      recordCount: working.length,
      activeCount: working.length - duplicates,
      duplicateCount: duplicates,
      replacementsApplied: applied.applied,
      records: working
    },
    null,
    2
  )}\n`
)

const verifiedPath = path.join(appDataDir, 'archiveLibraryVerified.json')
if (!existsSync(verifiedPath)) {
  writeFileSync(
    verifiedPath,
    `${JSON.stringify(
      {
        version: 1,
        sourcePolicy: SOURCE_POLICY,
        generatedAt: now,
        recordCount: 0,
        records: []
      },
      null,
      2
    )}\n`
  )
}

const summary = summariseTargets(working)
const lines = [
  `candidates: ${working.length} (${working.length - duplicates} active, ${duplicates} duplicate, ${applied.applied.length} replacement applied)`,
  ...summary.map((row) => `${row.label}: ${row.candidates} candidate(s) / ${row.target} target`),
  `working: ${path.relative(root, workingPath)}`,
  `verified manifest: ${path.relative(root, verifiedPath)}`
]
process.stdout.write(`${lines.join('\n')}\n`)
