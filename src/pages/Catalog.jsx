import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/AppState.jsx'
import { titles } from '../data/catalog'
import {
  apiConfigured,
  backendLabel,
  createStory,
  deleteStory,
  fetchStories,
  healthCheck,
  isLikelyAudioUrl,
  r2Url,
  updateStory
} from '../data/api'
import { getMediaBase } from '../data/media'
import { archiveCoverUrl, isLikelyImageUrl } from '../data/artwork'
import { CoverArt } from '../art/covers'
import { IcoPlus, IcoTrash, IcoCloud, IcoInfo } from '../ui/Icons'
import ReviewModeration from './ReviewModeration.jsx'
import { subscribeToChanges } from '../data/realtime'

const EMPTY = { title: '', description: '', audioUrl: '', coverUrl: '', duration: '' }

export default function Catalog() {
  const { user } = useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const mounted = useRef(true)

  const configured = apiConfigured()

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await fetchStories()
      if (mounted.current) setRows(list)
    } catch (e) {
      if (mounted.current) setErr(e.message)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    mounted.current = true
    load()
    if (configured) healthCheck().then((h) => mounted.current && setHealth(h))
    return () => {
      mounted.current = false
    }
  }, [configured, load])

  // Cloud catalogue edits made in another browser or on the tablet appear here
  // automatically — one shared library instead of two stale copies.
  useEffect(() => {
    if (!configured) return undefined
    let timer = null
    const stop = subscribeToChanges(['stories'], () => {
      clearTimeout(timer)
      timer = setTimeout(load, 400)
    })
    return () => {
      clearTimeout(timer)
      stop()
    }
  }, [configured, load])

  const preview = useMemo(() => (form.audioUrl ? r2Url(form.audioUrl.trim()) : ''), [form.audioUrl])
  const urlValid = form.audioUrl ? isLikelyAudioUrl(preview) : false

  const reset = () => {
    setForm(EMPTY)
    setEditing(null)
    setErr('')
    setNotice('')
  }

  const save = async (e) => {
    e.preventDefault()
    setErr('')
    setNotice('')
    if (!form.title.trim()) return setErr('A title is required.')
    if (!urlValid) return setErr('Paste the public R2 audio URL (ending in .opus / .m4a / .mp3).')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        audioUrl: preview,
        coverUrl: form.coverUrl.trim()
          ? (/archive\.org/i.test(form.coverUrl) ? archiveCoverUrl(form.coverUrl.trim()) : form.coverUrl.trim())
          : '',
        duration: form.duration ? Math.round(Number(form.duration) * 60) : null
      }
      if (editing) {
        const row = await updateStory(editing, payload)
        setRows((r) => r.map((x) => (x.id === editing ? row : x)))
        setNotice('Story updated in Supabase.')
      } else {
        const row = await createStory({ ...payload, authorId: user?.id })
        setRows((r) => [row, ...r])
        setNotice('Story saved — audio_url now points at Cloudflare R2.')
      }
      reset()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (row) => {
    setEditing(row.id)
    setForm({
      title: row.title || '',
      description: row.description || '',
      audioUrl: row.audioUrl || '',
      coverUrl: row.coverUrl || '',
      duration: row.duration ? String(Math.round(row.duration / 60)) : ''
    })
    setNotice('')
    setErr('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (row) => {
    try {
      await deleteStory(row.id)
      setRows((r) => r.filter((x) => x.id !== row.id))
      setNotice('Story removed from Supabase (the R2 object is untouched).')
    } catch (e) {
      setErr(e.message)
    }
  }

  const importBundled = () => {
    setNotice(
      `The bundled catalogue (${titles.length} titles) always plays offline. Supabase rows are an optional cloud layer on top.`
    )
  }

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Cloud catalogue</h2>
          <p className="meta" style={{ margin: 0 }}>
            {configured ? `Supabase · ${backendLabel()}` : 'Not configured — running on the bundled catalogue'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={importBundled}><IcoInfo /> How this works</button>
          <button className="btn btn-ghost" onClick={load} disabled={!configured || loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="arch-flow">
        <div className="arch-node r2">
          <div className="arch-title">1 · Cloudflare R2</div>
          <div className="arch-sub">Upload the .opus object, copy its public URL</div>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node supa">
          <div className="arch-title">2 · Supabase stories</div>
          <div className="arch-sub">Save title, summary, duration, audio_url</div>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node">
          <div className="arch-title">3 · Player</div>
          <div className="arch-sub">Drops the URL straight into &lt;audio&gt;</div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Backend" value={configured ? 'Supabase' : 'Bundled'} sub={backendLabel()} tone={configured ? 'good' : ''} />
        <Stat label="Cloud stories" value={String(rows.length)} sub="Rows in the stories table" />
        <Stat label="Reachable" value={health ? (health.ok ? 'Yes' : 'No') : '—'} sub={health?.ok ? 'PostgREST healthy' : health?.reason || 'not checked'} tone={health?.ok ? 'good' : ''} />
        <Stat label="R2 base" value={getMediaBase() ? 'Custom' : 'Bundled'} sub={getMediaBase() || 'set VITE_MEDIA_BASE_URL'} />
      </div>

      {!configured ? (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="row-title" style={{ marginTop: 0 }}>
            <h2>Connect Supabase to enable the cloud catalogue</h2>
          </div>
          <p className="meta" style={{ marginTop: 0 }}>
            Add your project URL and anon key to <code>.env</code>, then restart. The bundled {titles.length}-title library keeps
            the app fully functional until then.
          </p>
          <pre className="code-block">{`VITE_MEDIA_BASE_URL=https://media.yourdomain.com/audio
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>`}</pre>
        </div>
      ) : null}

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>{editing ? 'Edit story' : 'Add a story'}</h2>
          <span className="meta">Step 2 · metadata only, never the audio file</span>
        </div>

        <form onSubmit={save} className="story-form">
          <div className="camp-grid">
            <label className="ad-field">
              <span>Title</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Khaamosh Relay — Episode 1" />
            </label>
            <label className="ad-field">
              <span>Duration (minutes)</span>
              <input type="number" min="0" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="22" />
            </label>
          </div>
          <label className="ad-field" style={{ marginTop: 12 }}>
            <span>Description</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A sealed drop, a courier, and a city that listens through the rain."
            />
          </label>
          <label className="ad-field" style={{ marginTop: 12 }}>
            <span>Cover URL (Archive.org, R2, or any image)</span>
            <input
              value={form.coverUrl}
              onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              placeholder="https://archive.org/details/raat-ke-musafir or a direct .jpg"
            />
          </label>
          {form.coverUrl ? (
            <div className="art-row" style={{ marginTop: 10 }}>
              <div className="art-thumb">
                <CoverArt
                  id={form.cover || 'cipher1'}
                  title={form.title}
                  src={isLikelyImageUrl(form.coverUrl) ? (/archive\.org/i.test(form.coverUrl) ? archiveCoverUrl(form.coverUrl) : form.coverUrl) : ''}
                  t={{ name: form.title, genres: form.genres, kind: form.kind }}
                  className="cover-art"
                />
              </div>
              <div className="meta">
                {/archive\.org/i.test(form.coverUrl)
                  ? `Archive.org thumbnail · ${archiveCoverUrl(form.coverUrl)}`
                  : 'Custom cover preview'}
              </div>
            </div>
          ) : null}
          <label className="ad-field" style={{ marginTop: 12 }}>
            <span>Audio URL (Cloudflare R2)</span>
            <input
              value={form.audioUrl}
              onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              placeholder="https://media.yourdomain.com/audio/raat-01.opus"
            />
          </label>

          {form.audioUrl ? (
            <div className={`url-check ${urlValid ? 'ok' : 'bad'}`}>
              {urlValid ? 'Looks like a playable audio URL' : 'Not a recognised audio URL'} · {preview}
            </div>
          ) : null}

          {err ? <div className="err" style={{ textAlign: 'left', marginTop: 10 }}>{err}</div> : null}
          {notice ? <div className="info-note" style={{ marginTop: 10 }}>{notice}</div> : null}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit" disabled={saving || !configured}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Save to Supabase'}
            </button>
            {editing ? (
              <button className="btn btn-ghost" type="button" onClick={reset}>Cancel</button>
            ) : null}
            {!configured ? <span className="meta" style={{ alignSelf: 'center' }}>Configure Supabase first.</span> : null}
          </div>
        </form>
      </div>

      <div className="row-title">
        <h2>Stories in Supabase</h2>
        <span className="meta">{rows.length} rows</span>
      </div>

      {rows.length ? (
        <div className="story-list">
          {rows.map((r) => (
            <div className="story-row" key={r.id}>
              <div className="story-main">
                <div className="story-title">{r.title}</div>
                <div className="story-url">{r.audioUrl}</div>
                <div className="story-sub">
                  {r.duration ? `${Math.round(r.duration / 60)} min · ` : ''}
                  {r.description || 'No description'}
                </div>
              </div>
              <audio className="story-audio" controls preload="none" src={r.audioUrl} />
              <button className="btn btn-ghost" onClick={() => startEdit(r)}>Edit</button>
              <button className="icon-btn" onClick={() => remove(r)} aria-label="Delete story"><IcoTrash /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <IcoCloud />
          <h3>{configured ? 'No cloud stories yet' : 'Cloud layer not connected'}</h3>
          <p>
            {configured
              ? 'Upload an .opus file to R2, paste its public URL above, and save the metadata here.'
              : 'The bundled catalogue is serving the app. Add Supabase credentials to start a cloud library.'}
          </p>
          <button className="btn btn-ghost" onClick={reset} style={{ marginTop: 10 }}><IcoPlus /> Add the first story</button>
        </div>
      )}

      <ReviewModeration />
    </>
  )
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone || ''}`}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}
