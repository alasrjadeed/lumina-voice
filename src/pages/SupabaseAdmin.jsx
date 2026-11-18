import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { apiConfigured, backendLabel, fetchProfiles, healthCheck, rest, updateProfile } from '../data/api'
import { IcoBolt } from '../ui/Icons'

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <span className="stat-sub">{sub}</span>
    </div>
  )
}

// Exercises every Supabase table the app owns: auth/profile, cloud catalogue,
// ratings and reviews. Catalog.jsx handles story CRUD and review moderation;
// this panel adds profile/role control and a live view of all four tables.
export default function SupabaseAdmin() {
  const { isAdmin } = useApp()
  const [health, setHealth] = useState(null)
  const [counts, setCounts] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    if (!apiConfigured()) return
    setBusy(true)
    setMsg('')
    try {
      const [h, ps, stories, ratings, reviews] = await Promise.all([
        healthCheck(),
        fetchProfiles(),
        rest('stories?select=id&limit=500'),
        rest('ratings?select=user_id,title_id&limit=500'),
        rest('reviews?select=id&limit=500')
      ])
      setHealth(h)
      setProfiles(ps || [])
      setCounts({
        profiles: (ps || []).length,
        stories: (stories || []).length,
        ratings: (ratings || []).length,
        reviews: (reviews || []).length
      })
    } catch (e) {
      setMsg(e.message || 'Could not load Supabase data')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const changeRole = async (profile, role) => {
    setBusy(true)
    setMsg('')
    try {
      await updateProfile(profile.id, { role })
      await load()
    } catch (e) {
      setMsg(e.message || 'Could not change role')
      setBusy(false)
    }
  }

  if (!apiConfigured()) {
    return (
      <div className="panel">
        <h2 className="display">Supabase</h2>
        <p className="meta">Not configured. Add the URL and publishable key to .env.local, then rebuild.</p>
      </div>
    )
  }

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Supabase</h2>
          <p className="meta" style={{ margin: 0 }}>{backendLabel()} · auth, profiles, catalogue, ratings and reviews</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="stat-grid">
        <Stat label="Connection" value={health?.ok ? 'Live' : health ? 'Error' : 'Checking'} sub={health?.ok ? 'REST reachable' : health?.reason || backendLabel()} tone={health?.ok ? 'good' : ''} />
        <Stat label="Profiles" value={counts?.profiles ?? '—'} sub="auth users" />
        <Stat label="Stories" value={counts?.stories ?? '—'} sub="cloud catalogue" />
        <Stat label="Ratings" value={counts?.ratings ?? '—'} sub="listener stars" />
        <Stat label="Reviews" value={counts?.reviews ?? '—'} sub="written feedback" />
      </div>

      {msg ? <p className="meta" style={{ color: 'var(--danger)' }}>{msg}</p> : null}

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Profiles &amp; roles</h2>
          <Link to="/settings" className="btn btn-ghost">Account settings</Link>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Role changes write to the profiles table. Cloud catalog also manages stories and moderates reviews.
        </p>
        {profiles.length ? (
          <div>
            {profiles.map((p) => (
              <div className="set-row" key={p.id}>
                <div>
                  <h3>{p.username || p.id.slice(0, 8)}</h3>
                  <p>{p.role || 'listener'} · {p.id.slice(0, 8)}</p>
                </div>
                {isAdmin ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`btn ${p.role === 'listener' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => changeRole(p, 'listener')}
                      disabled={busy}
                    >
                      Listener
                    </button>
                    <button
                      className={`btn ${p.role === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => changeRole(p, 'admin')}
                      disabled={busy}
                    >
                      Admin
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="meta">No profile rows yet — they are created when someone signs up.</p>
        )}
      </div>
    </>
  )
}

export const supabaseTab = { id: 'supabase', label: 'Supabase', icon: IcoBolt }
