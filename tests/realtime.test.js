import { describe, expect, it } from 'vitest'

import { parseChange, realtimeConfigured } from '../src/data/realtime.js'

describe('parseChange', () => {
  it('reads a change wrapped in payload.data', () => {
    const change = parseChange({
      event: 'postgres_changes',
      topic: 'realtime:public',
      payload: {
        data: {
          type: 'UPDATE',
          table: 'reviews',
          schema: 'public',
          record: { id: 'r1', title_id: 'ghalib', body: 'Lovely' },
          old_record: { id: 'r1', body: 'Old' },
          commit_timestamp: '2026-11-18T00:00:00Z'
        }
      }
    })
    expect(change).toMatchObject({
      table: 'reviews',
      type: 'UPDATE',
      record: { title_id: 'ghalib' },
      oldRecord: { body: 'Old' }
    })
  })

  it('reads a change with fields directly on the payload', () => {
    const change = parseChange({
      event: 'postgres_changes',
      payload: { type: 'INSERT', table: 'ratings', record: { title_id: 'ghalib', stars: 5 } }
    })
    expect(change.table).toBe('ratings')
    expect(change.type).toBe('INSERT')
    expect(change.record.stars).toBe(5)
    expect(change.oldRecord).toBeNull()
  })

  it('ignores acks, heartbeats, unknown tables and unsubscribed tables', () => {
    expect(parseChange({ event: 'phx_reply', payload: { status: 'ok' } })).toBeNull()
    expect(parseChange({ event: 'heartbeat' })).toBeNull()
    expect(parseChange({ event: 'postgres_changes', payload: { table: 'auth_users' } })).toBeNull()
    expect(parseChange({ event: 'postgres_changes', payload: { table: 'ratings' } }, ['stories'])).toBeNull()
  })
})

describe('realtimeConfigured', () => {
  it('is a boolean even without a browser WebSocket', () => {
    expect(typeof realtimeConfigured()).toBe('boolean')
  })
})
