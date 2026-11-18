import { useCallback, useEffect, useState } from 'react'
import { apiConfigured, getStoredSession, rest } from '../data/api'
import { getTitle } from '../data/catalog'
import { IcoTrash, IcoStar } from '../ui/Icons'

const token = () => getStoredSession()?.access_token || ''

// Studio moderation — every review across every title, newest first, grouped
// so an admin can spot and remove abuse. Reads the same tables the public
// title page writes to (RLS lets admins see all, delete is still per-row).
export default function ReviewModeration() {
  const [rows, setRows] = useState([])
  const [ratings, setRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (!apiConfigured()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErr('')
    try {
      const [reviews, allRatings] = await Promise.all([
        rest('reviews?select=id,user_id,title_id,body,created_at,updated_at&order=created_at.desc&limit=200'),
        rest('ratings?select=user_id,title_id,stars&limit=500')
      ])
      const byUser = {}
      for (const r of allRatings || []) byUser[`${r.title_id}:${r.user_id}`] = r.stars
      setRatings(byUser)
      setRows(reviews || [])
    } catch (e) {
      setErr(String(e.message || e))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (row) => {
    setRows((r) => r.filter((x) => x.id !== row.id))
    try {
      const t = token()
      await rest(`reviews?id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE', token: t, prefer: 'return=minimal' })
    } catch (e) {
      setErr(`Could not delete: ${String(e.message || e)}`)
      load()
    }
  }

  const shown = rows.filter((r) => {
    if (!q.trim()) return true
    const title = getTitle(r.title_id)
    return `${title?.name || r.title_id} ${r.body} ${r.user_id}`.toLowerCase().includes(q.trim().toLowerCase())
  })

  return (
    <>
      <div className="row-title">
        <h2>Reviews &amp; ratings</h2>
        <span className="meta">{rows.length} review{rows.length === 1 ? '' : 's'}</span>
      </div>

      {!apiConfigured() ? (
        <p className="meta">Connect Supabase to moderate reviews.</p>
      ) : (
        <>
          <input
            className="rev-input"
            style={{ marginBottom: 12 }}
            placeholder="Search by title, text or user id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search reviews"
          />
          {err ? <p className="meta" style={{ color: 'var(--danger)' }}>{err}</p> : null}
          {loading ? (
            <p className="meta">Loading reviews…</p>
          ) : shown.length ? (
            <div className="mod-list">
              {shown.map((r) => {
                const title = getTitle(r.title_id)
                const stars = ratings[`${r.title_id}:${r.user_id}`] || 0
                return (
                  <div className="mod-row" key={r.id}>
                    <div className="mod-main">
                      <div className="mod-head">
                        <strong>{title?.name || r.title_id}</strong>
                        <span className="stars" aria-label={`${stars} out of 5`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span className={`star ${n <= stars ? 'on' : ''}`} key={n}>
                              <IcoStar on={n <= stars} />
                            </span>
                          ))}
                        </span>
                        <span className="meta">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p>{r.body}</p>
                      <div className="story-sub">user {String(r.user_id).slice(0, 8)}…</div>
                    </div>
                    <button className="icon-btn" onClick={() => remove(r)} aria-label="Delete review">
                      <IcoTrash />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="meta">{q ? 'No reviews match that search.' : 'No reviews yet.'}</p>
          )}
        </>
      )}
    </>
  )
}
