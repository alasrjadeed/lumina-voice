import { describe, expect, it } from 'vitest'

import verifiedManifest from '../src/data/archiveLibraryVerified.json'
import { classifyRights, rightsAllowPublish } from '../scripts/lib/archiveRights.js'
import {
  TARGET_CATEGORIES,
  applyReplacements,
  eligibleForVerification,
  normaliseAuthor,
  normaliseCandidates,
  normaliseCategory,
  parseDuration,
  summariseTargets
} from '../scripts/lib/libraryCandidates.js'

const candidates = [
  {
    id: 'URD-AUD-001',
    title: 'Dracula',
    author: 'Bram Stoker',
    category: 'Horror / vampire',
    duration: '00:29:47',
    narrator: 'Syed Irfan Ali (reported by source index)',
    archive_search_url: 'https://archive.org/search?q=dracula'
  },
  {
    id: 'URD-AUD-002',
    title: 'The Turn of the Screw',
    author: 'Henry James',
    category: 'Horror / supernatural',
    duration: '00:25:45'
  },
  {
    id: 'URD-AUD-003',
    title: 'Dracula',
    author: 'Bram Stoker',
    category: 'Horror / vampire',
    duration: '00:29:47'
  },
  {
    id: 'URD-AUD-100',
    title: 'Ten Days in a Mad-House',
    author: 'Nellie Bly',
    category: 'Nonfiction / investigative',
    duration: '01:02:00'
  }
]

describe('Archive.org candidate normalisation', () => {
  it('assigns unique sequential ids and keeps the original id for traceability', () => {
    const rows = normaliseCandidates(candidates)
    expect(rows.map((row) => row.id)).toEqual([
      'URD-AUD-001',
      'URD-AUD-002',
      'URD-AUD-003',
      'URD-AUD-004'
    ])
    expect(rows[3].sourceId).toBe('URD-AUD-100')
  })

  it('flags duplicate titles and removes them from verification', () => {
    const rows = normaliseCandidates(candidates)
    expect(rows[2].status).toBe('duplicate')
    expect(rows[2].duplicateOf).toBe('URD-AUD-001')
    expect(rows[2].replacementNeeded).toBe(true)
    expect(rows.filter(eligibleForVerification)).toHaveLength(3)
  })

  it('keeps reported values separate from verified values', () => {
    const row = normaliseCandidates(candidates)[0]
    expect(row.reported.narrator).toBe('Syed Irfan Ali (reported by source index)')
    expect(row.reported.durationSeconds).toBe(1787)
    expect(row.narrator).toBe('')
    expect(row.durationSeconds).toBeNull()
    expect(row.language).toBe('')
    expect(row.verification.playback).toBe('unverified')
    expect(row.verification.rights.status).toBe('unknown')
  })

  it('normalises author names and durations safely', () => {
    expect(normaliseAuthor('  Syed Irfan Ali (reported by source index) ')).toBe('Syed Irfan Ali')
    expect(parseDuration('01:02:00')).toBe(3720)
    expect(parseDuration('bad')).toBeNull()
  })

  it('maps every candidate label into one of the six target categories', () => {
    expect(normaliseCategory("Fantasy / children's story")).toBe("Children's stories")
    expect(normaliseCategory('Horror / ghost')).toBe('Horror / supernatural')
    expect(normaliseCategory('Detective / gothic mystery')).toBe('Horror / supernatural')
    expect(normaliseCategory('Adventure / fantasy')).toBe('Adventure / fantasy')
    expect(normaliseCategory('Short stories')).toBe('Urdu short stories')
    expect(normaliseCategory('Urdu classic novel')).toBe('Classic novels')
  })

  it('summarises all six targets without claiming published content', () => {
    const summary = summariseTargets(normaliseCandidates(candidates))
    expect(summary.map((row) => row.id)).toEqual(TARGET_CATEGORIES.map((row) => row.id))
    expect(summary.reduce((sum, row) => sum + row.target, 0)).toBe(100)
    expect(summary.every((row) => row.published === 0)).toBe(true)
  })

  it('replaces a duplicate source row without editing the supplied records', () => {
    const replacements = [
      {
        replacesSourceId: 'URD-AUD-003',
        record: { id: 'URD-AUD-101', title: 'A New Story', author: 'Someone', category: 'Short stories' }
      }
    ]
    const result = applyReplacements(candidates, replacements)
    expect(result.applied).toEqual(['URD-AUD-003'])
    expect(result.records).toHaveLength(candidates.length)
    expect(result.records[2].title).toBe('A New Story')
    expect(candidates[2].title).toBe('Dracula')
    expect(normaliseCandidates(result.records).filter((row) => row.status === 'duplicate')).toHaveLength(0)
  })

  it('leaves an unmatched duplicate in place so it stays flagged', () => {
    const result = applyReplacements(candidates, [])
    expect(result.applied).toEqual([])
    expect(result.duplicateIds).toEqual(['URD-AUD-003'])
  })
})

describe('Archive.org rights classification', () => {
  const now = '2026-11-18T00:00:00.000Z'

  it('never treats an opensource collection tag as reuse rights', () => {
    const rights = classifyRights(
      {
        collection: 'opensource_audio, audiobooks',
        creator: 'Syed Irfan Ali',
        licenseurl: null,
        rights: null,
        rightsstatement: null
      },
      now
    )
    expect(rights.status).toBe('unknown')
    expect(rights.evidence).toBe('none')
    expect(rightsAllowPublish(rights)).toBe(false)
  })

  it('only recognises explicit licence URLs or explicit rights statements', () => {
    expect(classifyRights({ licenseurl: 'https://creativecommons.org/licenses/by/4.0/' }, now).status).toBe('cc-by')
    expect(classifyRights({ rights: 'This work is in the public domain.' }, now).status).toBe('public-domain')
    expect(
      classifyRights(
        { licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/', rights: 'All rights reserved' },
        now
      ).status
    ).toBe('restricted')
  })

  it('keeps every published manifest record backed by explicit reuse evidence', () => {
    expect(verifiedManifest.records.every((record) => rightsAllowPublish(record.rights))).toBe(true)
  })
})
