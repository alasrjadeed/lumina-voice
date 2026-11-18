import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import {
  MAX_BODY,
  deleteReview,
  fetchRatings,
  fetchReviews,
  mergeLocal,
  myLocalRating,
  myLocalReview,
  saveRating,
  saveReview,
  summarise
} from '../data/ratings'
import { IcoStar, IcoTrash } from '../ui/Icons'

function Stars({ value, onChange, size = 22, label }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  const interactive = typeof onChange === 'function'
  return (
    <div
      className={`stars ${interactive ? 'stars-input' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label}
      onMouseLeave={() => interactive && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= shown ? 'on' : ''}`}
          style={{ fontSize: size }}
          disabled={!interactive}
          role={interactive ? 'radio' : undefined}
          aria-checked={interactive ? value === n : undefined}
          aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
          onMouseEnter={() => interactive && setHover(n)}
          onFocus={() => interactive && setHover(n)}
          onClick={() => interactive && onChange(n)}
        >
          <IcoStar on={n <= shown} />
        </button>
      ))}
    </div>
  )
}

function when(iso) {
  const d = new Date(iso || 0)
  if (Number.isNaN(d.getTime()) || !iso) return ''
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} months ago`
  return d.toLocaleDateString()
}

export default function Ratings({ titleId }) {
  const { user } = useApp()
  const [ratings, setRatings] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)

  const load = useCallback(async (signal) => {
    const [r, v] = await Promise.all([fetchRatings(titleId, signal), fetchReviews(titleId, signal)])
    const merged = mergeLocal({ ratings: r || [], reviews: v || [], titleId, names: user ? { [user.id]: user.name } : {} })
    setRatings(merged.ratings)
    setReviews(merged.reviews)
    setLoading(false)
  }, [titleId, user])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    load(ac.signal)
    return () => ac.abort()
  }, [load])

  const summary = summarise(ratings)
  const mine = user ? ratings.find((r) => r.userId === user.id) : null
  const myStars = user ? mine?.stars || myLocalRating(titleId, user.id) : 0
  const myReview = user ? reviews.find((r) => r.userId === user.id) : null
  const canWrite = !!user?.id

  const rate = async (n) => {
    if (!canWrite) return
    setBusy(true)
    const res = await saveRating(titleId, user.id, n)
    setNote(res.local ? 'Saved on this device — it will sync when you reconnect.' : 'Thanks for rating.')
    await load()
    setBusy(false)
  }

  const submitReview = async () => {
    if (!canWrite) return
    const body = draft.trim()
    if (!body) {
      setNote('Write something first.')
      return
    }
    setBusy(true)
    const res = await saveReview(titleId, user.id, body)
    setNote(res.local ? 'Saved on this device — it will sync when you reconnect.' : 'Review published.')
    setDraft('')
    setEditing(false)
    await load()
    setBusy(false)
  }

  const remove = async () => {
    if (!canWrite) return
    setBusy(true)
    await deleteReview(titleId, user.id)
    setNote('Review removed.')
    await load()
    setBusy(false)
  }

  const startEdit = () => {
    setDraft(myReview?.body || myLocalReview(titleId, user?.id) || '')
    setEditing(true)
  }

  return (
    <section className="reviews" aria-label="Ratings and reviews">
      <div className="row-title">
        <h2>Ratings &amp; reviews</h2>
      </div>

      <div className="rev-summary">
        <div className="rev-score">
          <strong>{summary.count ? summary.average.toFixed(1) : '—'}</strong>
          <Stars value={Math.round(summary.average)} size={16} label={`Average ${summary.average || 0} out of 5`} />
          <span className="rev-count">
            {summary.count ? `${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'}` : 'No ratings yet'}
          </span>
        </div>
        <div className="rev-hist" aria-hidden="true">
          {[5, 4, 3, 2, 1].map((s) => {
            const n = summary.histogram[s - 1] || 0
            const pct = summary.count ? Math.round((n / summary.count) * 100) : 0
            return (
              <div className="rev-bar" key={s}>
                <span>{s}</span>
                <div className="track">
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="n">{n}</span>
              </div>
            )
          })}
        </div>
      </div>

      {canWrite ? (
        <div className="rev-form">
          <div className="rev-form-head">
            <span>Your rating</span>
            <Stars value={myStars} onChange={rate} label="Rate this title out of 5" />
          </div>
          {myReview && !editing ? (
            <div className="rev-own">
              <p>{myReview.body}</p>
              <div className="rev-own-foot">
                <span className="meta">Your review · {when(myReview.updatedAt || myReview.createdAt)}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={startEdit} disabled={busy}>
                    Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={remove} disabled={busy} aria-label="Delete your review">
                    <IcoTrash />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <label className="sr-only" htmlFor="rev-body">
                Your review
              </label>
              <textarea
                id="rev-body"
                className="rev-input"
                rows={4}
                maxLength={MAX_BODY}
                placeholder="Share what you thought of it…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="rev-form-foot">
                <span className="meta">{draft.length}/{MAX_BODY}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {editing ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setDraft('') }} disabled={busy}>
                      Cancel
                    </button>
                  ) : null}
                  <button className="btn btn-primary btn-sm" onClick={submitReview} disabled={busy || !draft.trim()}>
                    {editing ? 'Save changes' : 'Post review'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="rev-gate">
          <Stars value={0} size={20} label="Sign in to rate" />
          <p>
            <Link to="/auth">Sign in</Link> to rate this title or write a review.
          </p>
        </div>
      )}

      {note ? (
        <p className="meta rev-note" role="status">
          {note}
        </p>
      ) : null}

      <div className="rev-list">
        {loading ? (
          <p className="meta">Loading reviews…</p>
        ) : reviews.length ? (
          reviews.map((r) => (
            <article className="rev" key={r.id || `${r.userId}-${r.createdAt}`}>
              <div className="rev-avatar" aria-hidden="true">
                {(r.name || 'L')[0].toUpperCase()}
              </div>
              <div className="rev-body">
                <div className="rev-head">
                  <strong>{r.userId === user?.id ? `${r.name} (you)` : r.name}</strong>
                  <span className="meta">{when(r.updatedAt || r.createdAt)}</span>
                </div>
                <Stars value={Number((ratings.find((x) => x.userId === r.userId) || {}).stars) || 0} size={14} label="Rating" />
                <p>{r.body}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="meta">No written reviews yet — be the first.</p>
        )}
      </div>
    </section>
  )
}
