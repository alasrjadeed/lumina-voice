import { describe, expect, it } from 'vitest'

import { fileActionOptions } from '../src/data/fileLibrary'

describe('file library actions', () => {
  it('offers edit, replace and share on every file', () => {
    expect(fileActionOptions({ imported: false }).map((a) => a.id)).toEqual([
      'play',
      'edit',
      'replace',
      'share',
      'open',
      'delete'
    ])
  })

  it('allows deletion for every part', () => {
    const house = fileActionOptions({ imported: false }).find((a) => a.id === 'delete')
    const imported = fileActionOptions({ imported: true }).find((a) => a.id === 'delete')
    expect(house.disabled).toBeUndefined()
    expect(imported.disabled).toBeUndefined()
    expect(house.label).toBe('Delete part')
    expect(imported.label).toBe('Delete part')
  })
})
