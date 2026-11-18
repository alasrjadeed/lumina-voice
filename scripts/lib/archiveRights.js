// Pure rights classification for Archive.org items.
// No browser APIs, no network, no dependencies — safe for Node scripts and Vitest.
//
// A collection tag such as `opensource_audio` describes where an item is
// filed, not what the uploader allows. It must never establish reuse rights.

export const ALLOWED_RIGHTS = Object.freeze(['public-domain', 'cc0', 'cc-by', 'cc-by-sa', 'licensed'])

export function rightsAllowPublish(rights) {
  return !!rights && ALLOWED_RIGHTS.includes(rights.status) && rights.evidence !== 'none'
}

export function classifyRights(meta, now = new Date().toISOString()) {
  const licenseUrl = String(meta?.licenseurl || meta?.license_url || '').trim()
  const license = licenseUrl.toLowerCase()
  const statement = `${meta?.rights || ''} ${meta?.rightsstatement || ''}`.toLowerCase()

  let status = 'unknown'
  let evidence = 'none'

  // An explicit reservation wins over any other signal.
  if (/all rights reserved/.test(statement)) {
    status = 'restricted'
    evidence = 'rights-statement'
  } else if (/public.?domain|publicdomain/.test(license) || /creativecommons\.org\/publicdomain/.test(license)) {
    status = 'public-domain'
    evidence = 'license-url'
  } else if (/creativecommons\.org\/(licenses\/)?zero/.test(license)) {
    status = 'cc0'
    evidence = 'license-url'
  } else if (/creativecommons\.org\/licenses\/by-sa/.test(license)) {
    status = 'cc-by-sa'
    evidence = 'license-url'
  } else if (/creativecommons\.org\/licenses\/by-nc/.test(license)) {
    status = 'licensed'
    evidence = 'license-url'
  } else if (/creativecommons\.org\/licenses\/by\//.test(license)) {
    status = 'cc-by'
    evidence = 'license-url'
  } else if (/public.?domain|publicdomain/.test(statement)) {
    status = 'public-domain'
    evidence = 'rights-statement'
  }

  return {
    status,
    evidence,
    licenseUrl,
    attribution: String(meta?.creator || meta?.artist || '').trim(),
    source: 'archive-item-metadata',
    verifiedAt: now
  }
}
