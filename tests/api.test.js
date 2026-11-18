import { describe, expect, it } from 'vitest'

import { isOfflineError } from '../src/data/api.js'

describe('isOfflineError', () => {
  it('recognises transport failures as offline', () => {
    expect(isOfflineError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isOfflineError(new Error('Network request failed'))).toBe(true)
    expect(isOfflineError('offline')).toBe(true)
  })

  it('does not hide real backend errors', () => {
    expect(isOfflineError(new Error('Invalid login credentials'))).toBe(false)
    expect(isOfflineError({ message: 'No profile row found' })).toBe(false)
    expect(isOfflineError(null)).toBe(false)
  })
})
