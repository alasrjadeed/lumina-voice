import { isArchiveContent } from './contentPolicy'

// Archive-only catalogue: a title is visible only when it has a real
// Archive.org stream. Advertising audio is handled separately by ads.js.
export function titlePlayableOnDevice(title) {
  return isArchiveContent(title)
}
