// Shared manifest writer for the verifier and the rights-repair script.
// No browser APIs, no network, no dependencies.

import { SOURCE_POLICY, suggestedAssetId } from './libraryCandidates.js'
import { rightsAllowPublish } from './archiveRights.js'

export function buildPublishedRecords(results, workingRecords, now = new Date().toISOString()) {
  const byId = new Map(workingRecords.map((record) => [record.id, record]))
  const records = []

  for (const result of results) {
    if (result.status !== 'verified' || !rightsAllowPublish(result.rights)) continue
    const record = byId.get(result.id)
    if (!record) continue
    records.push({
      id: record.id,
      title: record.title,
      urduTitle: record.urduTitle,
      author: record.author,
      category: record.category.suggested,
      language: 'ur',
      narrator: record.narrator || result.rights.attribution,
      durationSeconds: result.durationSeconds,
      archiveItemUrl: result.archiveItemUrl,
      directMp3Url: result.directMp3Url,
      coverUrl: `https://archive.org/services/img/${result.identifier}`,
      assetId: suggestedAssetId(record.id),
      playbackStatus: 'verified',
      downloadStatus: 'verified',
      rights: result.rights,
      checkedAt: result.checkedAt || now
    })
  }

  return records
}

export function publishedManifest(records, now = new Date().toISOString()) {
  return {
    version: 1,
    sourcePolicy: SOURCE_POLICY,
    generatedAt: now,
    recordCount: records.length,
    records
  }
}
