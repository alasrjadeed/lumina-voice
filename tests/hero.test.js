import { describe, expect, it } from 'vitest'

import { getTitle, hero, titles } from '../src/data/catalog'

describe('home hero', () => {
  it('points at a real, featured title so Home cannot crash after login', () => {
    const title = getTitle(hero.titleId)
    expect(title).toBeDefined()
    expect(title?.featured).toBe(true)
    expect(titles.some((entry) => entry.id === hero.titleId)).toBe(true)
  })
})
