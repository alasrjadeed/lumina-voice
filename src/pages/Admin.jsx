import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { useBroadcast } from '../state/Broadcast.jsx'
import { codecInfo } from '../data/catalog'
import { useCatalog } from '../state/Catalog.jsx'
import { automationRules, categories, dayparts, shows, DAYS, hhmm, getShow, getCategory } from '../data/broadcast'
import { resetPwStatusCache } from '../data/pipewire'
import { getMediaBase, setMediaBase, mediaBaseLabel, sourceList, bestSupported, isConfigured } from '../data/media'
import { apiConfigured, backendLabel, healthCheck, SCHEMA_SQL } from '../data/api'
import { loadStreamConfig, providerLabel, streamMounts } from '../data/stream'
import { RadioLogo } from '../art/covers'
import {
  IcoAddContent,
  IcoAdvertising,
  IcoAnalytics,
  IcoAutomation,
  IcoBolt,
  IcoBot,
  IcoClock,
  IcoCloud,
  IcoContent,
  IcoDown,
  IcoFiles,
  IcoGrid,
  IcoLogs,
  IcoOverview,
  IcoPlus,
  IcoQuran,
  IcoSchedule,
  IcoStorage,
  IcoStream,
  IcoStudio,
  IcoSubtitles,
  IcoTrash,
  IcoVoice,
  IcoWave,
  IcoWebsite
} from '../ui/Icons'
import { IcoRadio } from '../ui/Icons'
import { sttSupported, ttsSupported } from '../ai/deviceVoice'
import { formatBytes } from '../pwa.js'
import Advertising from './Advertising'
import Catalog from './Catalog'
import SubtitleStudio from './SubtitleStudio'
import SupabaseAdmin from './SupabaseAdmin.jsx'
import Integrations from './Integrations'
import VoiceCorrector from './VoiceCorrector'
import FileLibrary from './FileLibrary'
import ImportStudio from './ImportStudio.jsx'
import LuminaBot from './LuminaBot.jsx'
import WebsiteAdmin from './WebsiteAdmin.jsx'
import TitleEditor from './TitleEditor.jsx'
import InternetRadio from './InternetRadio.jsx'
import { RADIO_ENABLED } from '../config/features.js'

const TABS = [
  { id: 'overview', label: 'Overview', icon: IcoOverview },
  { id: 'bot', label: 'Lumina Bot', icon: IcoBot },
  { id: 'website', label: 'Website', icon: IcoWebsite },
  { id: 'schedule', label: 'Schedule', icon: IcoSchedule },
  { id: 'create', label: 'Add content', icon: IcoAddContent },
  { id: 'content', label: 'Content', icon: IcoContent },
  { id: 'subtitles', label: 'Subtitles', icon: IcoSubtitles },
  { id: 'files', label: 'Files', icon: IcoFiles },
  { id: 'catalog', label: 'Cloud catalog', icon: IcoCloud },
  { id: 'voices', label: 'Voices', icon: IcoVoice },
  { id: 'automation', label: 'Automation', icon: IcoAutomation },
  { id: 'advertising', label: 'Advertising', icon: IcoAdvertising },
  { id: 'stream', label: 'Live stream', icon: IcoStream },
  { id: 'radio', label: 'Internet Radio', icon: IcoRadio },
  { id: 'analytics', label: 'Analytics', icon: IcoAnalytics },
  { id: 'storage', label: 'Storage', icon: IcoStorage },
  { id: 'supabase', label: 'Supabase', icon: IcoBolt },
  { id: 'logs', label: 'Logs', icon: IcoLogs }
].filter((t) => RADIO_ENABLED || (t.id !== 'stream' && t.id !== 'radio'))

export default function Admin() {
  const { user, isAdmin } = useApp()
  const b = useBroadcast()
  const [tab, setTab] = useState('overview')
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const badges = useMemo(
    () => ({
      content: b.rotation.length,
      create: null,
      logs: b.logs.length,
      schedule: b.schedule.length
    }),
    [b.rotation.length, b.schedule.length, b.logs.length]
  )
  // PipeWire link: when the bridge is up, ON AIR reflects real system playback.
  const pwLive = b.pw?.available ? b.pw.playing : b.live
  const pwLabel = b.pw?.available
    ? b.pw.muted
      ? 'muted'
      : `${Math.round((b.pw.volume || 0) * 100)}%`
    : ''
  if (!user) return <Navigate to="/auth" replace />
  if (!isAdmin) {
    return (
      <div className="empty">
        <h3>Studio access only</h3>
        <p>Sign in as the studio operator (username “admin”) to open the broadcast studio.</p>
      </div>
    )
  }

  return (
    <>
      <div className="admin-head">
        <div className="admin-head-l">
          <IcoStudio />
          <div>
            <div className="kicker">Broadcast Studio</div>
            <h1>Sada Bahar Control Room</h1>
          </div>
        </div>
        <div className="admin-status">
          <span className="status-chip clock" title="Studio time">
            <IcoClock />
            {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`status-chip listeners ${b.live ? 'on' : ''}`}>
            <IcoWave />
            {b.listeners.toLocaleString()} listening
          </span>
          {b.pw?.available ? (
            <span
              className={`status-chip volume ${b.pw.muted ? 'muted' : 'on'}`}
              title={`PipeWire · ${b.pw.sink || 'default sink'}`}
            >
              <IcoWave />
              {pwLabel}
            </span>
          ) : null}
          <span className={`onair-pill ${pwLive ? (b.mode === 'manual' ? 'live' : 'auto') : 'off'}`} title={b.pw?.available ? 'Linked to PipeWire output' : 'Simulated status (PipeWire bridge not running)'}>
            <span className={pwLive ? 'dotpulse' : ''} />
            {pwLive ? (b.mode === 'manual' ? 'ON AIR · LIVE' : 'ON AIR · AUTO') : 'OFF AIR'}
          </span>
        </div>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Studio sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} />
            <span className="tab-label">{t.label}</span>
            {badges[t.id] ? <span className="tab-badge">{badges[t.id]}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <Overview /> : null}
      {tab === 'bot' ? <LuminaBot /> : null}
      {tab === 'website' ? <WebsiteAdmin /> : null}
      {tab === 'schedule' ? <Schedule /> : null}
      {tab === 'create' ? <AddContent /> : null}
      {tab === 'content' ? <Content /> : null}
      {tab === 'subtitles' ? <SubtitleStudio /> : null}
      {tab === 'files' ? <FileLibrary /> : null}
      {tab === 'catalog' ? <Catalog /> : null}
      {tab === 'voices' ? <VoiceCorrector /> : null}
      {tab === 'automation' ? <Automation /> : null}
      {tab === 'advertising' ? <Advertising /> : null}
      {tab === 'stream' && RADIO_ENABLED ? <Integrations /> : null}
      {tab === 'radio' && RADIO_ENABLED ? <InternetRadio /> : null}
      {tab === 'analytics' ? <Analytics /> : null}
      {tab === 'storage' ? <Storage /> : null}
      {tab === 'supabase' ? <SupabaseAdmin /> : null}
      {tab === 'logs' ? <Logs /> : null}
    </>
  )
}

function Overview() {
  const b = useBroadcast()
  const app = useApp()
  const nav = useNavigate()
  const pwLive = b.pw?.available ? b.pw.playing : b.live
  const streamCfg = RADIO_ENABLED ? loadStreamConfig() : null
  const streamMountCount = streamCfg?.enabled ? streamMounts(streamCfg).length : 0
  const now = new Date()
  const todays = useMemo(
    () =>
      b.schedule
        .filter((s) => s.days.includes(now.getDay()))
        .sort((a, b2) => a.start - b2.start),
    [b.schedule]
  )
  return (
    <>
      <div className="deck">
        <div className="panel onair-card deck-now">
          <div className="onair-art">
            <RadioLogo />
          </div>
          <div className="kicker">{b.show ? b.show.name.toUpperCase() : 'OFF AIR'}</div>
          <h2 className="display">{b.onAir ? b.onAir.name : 'Station is off air'}</h2>
          {b.onAir?.nameUr ? <p className="urdu" style={{ color: 'var(--gold)' }}>{b.onAir.nameUr}</p> : null}
          <div className="progress-track"><i style={{ width: `${b.progressPct}%` }} /></div>
          <div className="meta" style={{ marginTop: 8 }}>
            {b.onAir ? `${b.progressPct}% played · ~${b.remainingMin} min left` : 'Start the broadcast to go on air'}
          </div>
          <div className="next-up">
            <IcoClock />
            <span>
              Next: <strong>{b.nextItem ? b.nextItem.name : '—'}</strong>
            </span>
          </div>
        </div>

        <div className="deck-side">
          <div className="stat-grid deck-stats">
            <Stat label="Listeners (est.)" value={b.listeners.toLocaleString()} sub="Live estimate" tone={b.live ? 'good' : ''} />
            <Stat label="Daypart" value={b.daypart.name} sub={`${hhmm(b.daypart.start)}–${hhmm(b.daypart.end)}`} />
            {RADIO_ENABLED ? (
              <Stat
                label="External stream"
                value={streamCfg.enabled ? providerLabel(streamCfg.provider) : 'Studio AI'}
                sub={streamCfg.enabled ? `${streamMountCount} mount${streamMountCount === 1 ? '' : 's'} · ${streamCfg.baseUrl.replace(/^https?:\/\//, '')}` : 'No AzuraCast / Icecast connected'}
                tone={streamCfg.enabled ? 'good' : ''}
              />
            ) : (
              <Stat label="Broadcast source" value="Studio AI" sub="Local automation · radio paused" />
            )}
            <Stat label="On air" value={pwLive ? 'Live' : 'Off air'} sub={b.pw?.available ? `PipeWire · ${b.pw.sink || 'default sink'}` : (b.mode === 'manual' ? 'Operator desk' : 'AI automation')} tone={pwLive ? 'good' : 'bad'} />
            <Stat
              label="Device runtime"
              value={ttsSupported() ? 'Hybrid' : 'Cloud'}
              sub={`${app.swReady ? 'offline-ready' : 'sw starting'} · ${ttsSupported() ? 'on-device voice' : 'no device speech'}`}
              tone={ttsSupported() ? 'good' : ''}
            />
          </div>

          <div className="panel desk">
            <div className="row-title" style={{ marginTop: 0 }}>
              <h2>Run the desk</h2>
              <span className={`desk-mode ${b.mode === 'manual' ? 'manual' : ''}`}>
                {b.mode === 'manual' ? 'MANUAL' : 'AUTO'}
              </span>
              <span className={`owner-chip ${b.ownerNow}`} title="Who owns the desk right now">
                {b.ownerNow.toUpperCase()} desk
              </span>
            </div>
            <div className="control-grid">
              {!b.live ? (
                <button className="btn btn-primary ctl ctl-go" onClick={b.startBroadcast}>Start broadcast</button>
              ) : (
                <button className="btn btn-ghost ctl ctl-stop" onClick={b.stopBroadcast}>Stop broadcast</button>
              )}
              {b.mode === 'manual' ? (
                <button className="btn btn-ghost ctl" onClick={b.returnToAI}><IcoBolt /> Return to AI</button>
              ) : (
                <button className="btn btn-primary ctl" onClick={b.goLive}><IcoStudio /> Take over live</button>
              )}
              <button className="btn btn-ghost ctl" onClick={b.skipItem}>Skip item</button>
              <button className="btn btn-ghost ctl" onClick={b.insertStationId}>Insert station ID</button>
            </div>
            <p className="meta" style={{ marginTop: 14, marginBottom: 0 }}>
              {RADIO_ENABLED && streamCfg.enabled
                ? `Public Radio page is pointed at ${providerLabel(streamCfg.provider)} (${streamCfg.baseUrl}). The Studio AI still runs this desk.`
                : b.mode === 'manual'
                  ? 'You are the operator. Items advance manually; the AI is on standby.'
                  : 'The AI is running the schedule 100% automatically. Take over any time for a live desk.'}
            </p>
            {RADIO_ENABLED ? (
              <button className="linkish" style={{ marginTop: 12 }} onClick={() => nav('/radio')}>
                Preview public radio page →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="row-title">
        <h2>Today&apos;s programme</h2>
        <span className="meta">{DAYS[now.getDay()]}</span>
      </div>
      <div className="timeline rail" role="list" aria-label="Today's programme">
        {todays.map((s) => {
          const show = getShow(s.showId)
          const nowMin = now.getHours() * 60 + now.getMinutes()
          const active = nowMin >= s.start && nowMin < s.end
          const dur = Math.max(30, s.end - s.start)
          return (
            <div
              key={s.id}
              role="listitem"
              className={`tl-slot ${active ? 'active' : ''}`}
              style={{ flexGrow: dur, flexBasis: 0 }}
              title={`${hhmm(s.start)}–${hhmm(s.end)} · ${show?.name || 'Programme'}`}
            >
              <span className="tl-time">{hhmm(s.start)}</span>
              <span className="tl-name">{show?.name || 'Programme'}</span>
              <span className="tl-dur">{Math.round(dur / 60)}h</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Schedule() {
  const b = useBroadcast()
  const now = new Date()
  const [view, setView] = useState('rows')
  const sorted = useMemo(
    () => [...b.schedule].sort((a, c) => a.start - c.start || a.days[0] - c.days[0]),
    [b.schedule]
  )
  const grid = useMemo(() => {
    // 7 day columns × 24 hour rows, blocks positioned by start/end minutes.
    return DAYS.map((_, di) => sorted.filter((s) => s.days.includes(di)))
  }, [sorted])
  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Weekly schedule</h2>
          <p className="meta" style={{ margin: 0 }}>{b.schedule.length} slots · all times local</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="stream-quality" role="group" aria-label="Schedule view">
            <button className={`quality-pill ${view === 'rows' ? 'active' : ''}`} onClick={() => setView('rows')}>
              Rows
            </button>
            <button className={`quality-pill ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>
              Week grid
            </button>
          </div>
          <button className="btn btn-ghost" onClick={b.addSlot}><IcoPlus /> Add slot</button>
          <button className="btn btn-ghost" onClick={() => b.generateBlock(360, 8)}><IcoGrid /> 8-hour block</button>
          <button className="btn btn-primary" onClick={b.applyAISchedule}><IcoBolt /> AI generate week</button>
        </div>
      </div>

      {view === 'rows' ? (
        <div className="slot-list">
          {sorted.map((s) => (
            <SlotRow key={s.id} slot={s} today={now.getDay()} />
          ))}
        </div>
      ) : (
        <div className="week-grid" role="table" aria-label="Weekly schedule grid">
          <div className="week-head" role="row">
            <span className="week-corner" role="columnheader">Time</span>
            {DAYS.map((d, i) => (
              <span key={d} role="columnheader" className={i === now.getDay() ? 'today' : ''}>{d}</span>
            ))}
          </div>
          {Array.from({ length: 24 }, (_, h) => (
            <div className="week-row" role="row" key={h}>
              <span className="week-hour" role="rowheader">{String(h).padStart(2, '0')}:00</span>
              {DAYS.map((_, di) => {
                const at = grid[di].find((s) => Math.floor(s.start / 60) === h)
                const cont = grid[di].some((s) => Math.floor(s.start / 60) < h && Math.ceil(s.end / 60) > h)
                const sh = at ? getShow(at.showId) : null
                const live = di === now.getDay() && now.getHours() === h && at
                return (
                  <span key={di} className={`week-cell ${cont ? 'cont' : ''} ${live ? 'live' : ''}`}>
                    {at ? (
                      <span className="week-block" title={`${hhmm(at.start)}–${hhmm(at.end)}`}>
                        <b>{sh?.name || 'Programme'}</b>
                        <i>{hhmm(at.start)}–{hhmm(at.end)}</i>
                      </span>
                    ) : null}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function SlotRow({ slot, today }) {
  const b = useBroadcast()
  const active = slot.days.includes(today) && (() => {
    const m = new Date().getHours() * 60 + new Date().getMinutes()
    return m >= slot.start && m < slot.end
  })()
  const toggleDay = (d) => {
    const days = slot.days.includes(d) ? slot.days.filter((x) => x !== d) : [...slot.days, d].sort()
    if (days.length) b.updateSlot(slot.id, { days })
  }
  return (
    <div className={`slot-row ${active ? 'active' : ''}`}>
      <div className="slot-days">
        {DAYS.map((d, i) => (
          <button key={d} className={`day-chip ${slot.days.includes(i) ? 'on' : ''}`} onClick={() => toggleDay(i)}>
            {d[0]}
          </button>
        ))}
      </div>
      <input
        type="time"
        className="time-input"
        value={hhmm(slot.start)}
        onChange={(e) => b.updateSlot(slot.id, { start: timeToMin(e.target.value) })}
      />
      <span className="tl-arrow">→</span>
      <input
        type="time"
        className="time-input"
        value={hhmm(slot.end)}
        onChange={(e) => b.updateSlot(slot.id, { end: timeToMin(e.target.value) })}
      />
      <select className="select" value={slot.showId} onChange={(e) => b.updateSlot(slot.id, { showId: e.target.value })}>
        {shows.map((sh) => (
          <option key={sh.id} value={sh.id}>
            {sh.type === 'quran' ? '☾ ' : ''}{sh.name}
          </option>
        ))}
      </select>
      <span className={`tag ${getShow(slot.showId)?.type === 'live' ? 'live' : ''}`}>{getShow(slot.showId)?.type}</span>
      <button className="icon-btn" onClick={() => b.removeSlot(slot.id)} aria-label="Remove slot">
        <IcoTrash />
      </button>
    </div>
  )
}

function AddContent() {
  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Add content</h2>
          <p className="meta" style={{ margin: 0 }}>
            Pull from Archive.org, paste an audio URL, or upload files — then send the title straight to the broadcast rotation.
          </p>
        </div>
      </div>
      <ImportStudio admin />
    </>
  )
}

function Content() {
  const { titles } = useCatalog()
  const b = useBroadcast()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return titles
      .filter((t) => t.name.toLowerCase().includes(s) || (t.nameUr || '').includes(q) || t.number.includes(s))
      .slice(0, 8)
  }, [q])

  const counts = useMemo(() => {
    const m = {}
    categories.forEach((c) => (m[c.id] = 0))
    b.rotation.forEach((r) => (m[r.category] = (m[r.category] || 0) + 1))
    return m
  }, [b.rotation])

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Rotation library</h2>
          <p className="meta" style={{ margin: 0 }}>{b.rotation.length} items queued for automation</p>
        </div>
      </div>

      <TitleEditor
        titleId={editing}
        onClose={() => setEditing(null)}
        onOpen={(id) => setEditing(id)}
      />

      <div className="cat-split sticky-legend">
        {categories.map((c) => (
          <div
            key={c.id}
            className={`cat-pill ${counts[c.id] ? '' : 'zero'}`}
            style={{ borderColor: counts[c.id] ? c.color : undefined }}
          >
            <span className="cat-dot" style={{ background: c.color }} />
            {c.id === 'quran' ? <IcoQuran size={13} /> : null}
            {c.name}
            <b>{counts[c.id] || 0}</b>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Add a title to rotation</h2>
        </div>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <input placeholder="Search titles by name or number…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="h-scroll">
          {results.map((t) => (
            <div key={t.id} className="add-card-wrap">
              <button className="add-card" onClick={() => b.addToRotation(t)}>
                <span className="add-name">{t.number} {t.name}</span>
                <span className="add-sub">{t.kind} · {t.genres.join(', ')}</span>
                <span className="add-plus"><IcoPlus /> Add</span>
              </button>
              <button
                className="btn btn-ghost add-edit"
                onClick={() => setEditing(t.id)}
                aria-label={`Edit content information for ${t.name}`}
              >
                Edit
              </button>
            </div>
          ))}
          {!results.length ? <p className="meta" style={{ margin: 0 }}>Type to search the catalogue.</p> : null}
        </div>
      </div>

      <div className="rot-list">
        {b.rotation.map((r, idx) => (
          <div key={r.id} className={`rot-row ${r.enabled ? '' : 'muted'}`}>
            <span className="rot-cat" style={{ background: getCategory(r.category)?.color }} />
            <div className="rot-order" role="group" aria-label={`Reorder ${r.name}`}>
              <button
                className="icon-btn"
                onClick={() => b.moveRotation(r.id, -1)}
                disabled={idx === 0}
                aria-label="Move up"
                title="Move up"
              >
                <span className="ico-flip"><IcoDown /></span>
              </button>
              <button
                className="icon-btn"
                onClick={() => b.moveRotation(r.id, 1)}
                disabled={idx === b.rotation.length - 1}
                aria-label="Move down"
                title="Move down"
              >
                <IcoDown />
              </button>
            </div>
            <div className="rot-main">
              <div className="rot-name">{r.number ? `${r.number} ` : ''}{r.name}</div>
              <div className="rot-sub">
                {getCategory(r.category)?.name} · {r.minutes} min · Opus {r.kbps} kbps
                {' · '}{b.spins[r.id] || 0} spins
                {r.synthetic ? ' · synthetic' : ''}
              </div>
            </div>
            <label className="weight">
              Weight
              <input
                type="number"
                min="1"
                max="9"
                value={r.weight}
                onChange={(e) => b.updateRotation(r.id, { weight: Math.max(1, Math.min(9, Number(e.target.value) || 1)) })}
              />
            </label>
            <button
              className={`toggle ${r.enabled ? 'on' : ''}`}
              onClick={() => b.updateRotation(r.id, { enabled: !r.enabled })}
              aria-label="Toggle in rotation"
            >
              <i />
            </button>
            {/* The two row actions share one cell so they stay on a single
                line instead of wrapping into an implicit grid row. */}
            <div className="rot-actions">
              <button className="icon-btn" onClick={() => setEditing(r.titleId || r.id)} aria-label={`Edit ${r.name}`} title="Edit content information">
                <IcoStudio />
              </button>
              <button className="icon-btn" onClick={() => b.removeRotation(r.id)} aria-label="Remove" title="Remove from rotation">
                <IcoTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Automation() {
  const b = useBroadcast()
  const [picked, setPicked] = useState(null)
  const pickedDp = dayparts.find((d) => d.id === (picked || b.daypart.id))
  const slotsIn = b.schedule.filter((s) => Math.floor(s.start / 60) * 60 >= pickedDp.start && s.start < pickedDp.end)
  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Automation engine</h2>
          <p className="meta" style={{ margin: 0 }}>100% hands-free scheduling, dayparting, and continuity.</p>
        </div>
        <button className="btn btn-primary" onClick={b.applyAISchedule}><IcoBolt /> Regenerate schedule with AI</button>
      </div>

      <div className="ai-banner">
        <IcoWave />
        <div>
          <strong>AI programming is {b.mode === 'ai' ? 'in control' : 'on standby'}.</strong>
          <p className="meta" style={{ margin: '4px 0 0' }}>
            The engine reads the timetable, matches the current daypart, pulls from the weighted rotation, inserts station IDs,
            and keeps the stream seamless — no operator required. Take over from the Overview tab at any time.
          </p>
        </div>
      </div>

      <div className="rule-list">
        {automationRules.map((rule) => {
          const on = b.ruleOn(rule.id, rule.enabled)
          return (
            <div className="set-row" key={rule.id}>
              <div>
                <h3>{rule.name}</h3>
                <p>{rule.desc}</p>
              </div>
              <button className={`toggle ${on ? 'on' : ''}`} onClick={() => b.setRule(rule.id, !on)} aria-label={rule.name}>
                <i />
              </button>
            </div>
          )
        })}
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Dayparts</h2>
          <span className="meta">{slotsIn.length} slot{slotsIn.length === 1 ? '' : 's'} starting in {pickedDp.name.toLowerCase()}</span>
        </div>
        <div className="daypart-strip" role="list" aria-label="Daypart dial">
          {dayparts.map((d) => {
            const w = d.end - d.start
            return (
              <button
                type="button"
                role="listitem"
                key={d.id}
                className={`daypart ${b.daypart.id === d.id ? 'active' : ''} ${picked === d.id ? 'picked' : ''}`}
                style={{ flexGrow: w }}
                onClick={() => setPicked(d.id)}
                aria-pressed={picked === d.id}
              >
                <div className="daypart-name">{d.name}</div>
                <div className="daypart-time">{hhmm(d.start)}–{hhmm(d.end)}</div>
                {b.daypart.id === d.id ? <div className="kicker">now</div> : null}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function Analytics() {
  const b = useBroadcast()
  const series = useMemo(() => {
    const base = new Date()
    return Array.from({ length: 24 }, (_, h) => {
      const d = new Date(base)
      d.setHours(h, 0, 0, 0)
      return { h, v: estimate(h) }
    })
    function estimate(h) {
      const dp = dayparts.find((x) => h * 60 >= x.start && h * 60 < x.end) || dayparts[0]
      const table = { late: 420, dawn: 690, morning: 1480, afternoon: 1210, evening: 2360, night: 1780 }
      return table[dp.id] + ((h * 37) % 180) - 60
    }
  }, [])
  const max = Math.max(...series.map((s) => s.v))
  const top = useMemo(() => {
    const list = b.rotation
      .map((r) => ({ name: r.name, n: b.spins[r.id] || 0 }))
      .sort((a, c) => c.n - a.n)
      .slice(0, 6)
    return list
  }, [b.rotation, b.spins])
  const topMax = Math.max(1, ...top.map((t) => t.n))

  return (
    <>
      <div className="stat-grid">
        <Stat label="Live listeners (est.)" value={b.listeners.toLocaleString()} sub="Right now" tone="good" />
        <Stat label="Items played" value={Object.values(b.spins).reduce((a, c) => a + c, 0).toLocaleString()} sub="This session" />
        <Stat label="Rotation size" value={String(b.rotation.filter((r) => r.enabled).length)} sub="Enabled items" />
        <Stat label="Slots scheduled" value={String(b.schedule.length)} sub="Per week" />
        {RADIO_ENABLED ? (
          (() => {
            const sc = loadStreamConfig()
            return (
              <Stat
                label="External stream"
                value={sc.enabled ? providerLabel(sc.provider) : 'Studio AI'}
                sub={sc.enabled ? sc.baseUrl.replace(/^https?:\/\//, '') : 'Not connected'}
                tone={sc.enabled ? 'good' : ''}
              />
            )
          })()
        ) : null}
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Estimated audience by hour</h2>
        </div>
        <div className="bars">
          {series.map((s) => (
            <div
              className={`bar-col ${s.h === new Date().getHours() ? 'now' : ''}`}
              key={s.h}
              title={`${hhmm(s.h * 60)} · ${s.v} est.${s.h === new Date().getHours() ? ' · current hour' : ''}`}
            >
              <div className="bar" style={{ height: `${Math.round((s.v / max) * 100)}%` }} />
              <span className="bar-label">{s.h % 3 === 0 ? s.h : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Top spins this session</h2>
        </div>
        {top.map((t) => (
          <div className="hbar" key={t.name}>
            <span className="hbar-name">{t.name}</span>
            <div className="hbar-track"><i style={{ width: `${Math.round((t.n / topMax) * 100)}%` }} /></div>
            <span className="hbar-val">{t.n}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function relativeTime(t) {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Logs() {
  const b = useBroadcast()
  const [level, setLevel] = useState('all')
  const [autoscroll, setAutoscroll] = useState(true)
  const [tick, setTick] = useState(0)
  // Refresh relative timestamps once a minute while the tab is open.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])
  const levels = ['all', 'info', 'warn', 'ai', 'error']
  const shown = b.logs.filter((l) => level === 'all' || l.level === level)
  const exportLogs = () => {
    const text = b.logs
      .map((l) => `${new Date(l.t).toISOString()} [${l.level}] ${l.text}`)
      .join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumina-broadcast-log.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Broadcast log</h2>
          <p className="meta" style={{ margin: 0 }}>Newest first · {shown.length} of {b.logs.length} entries</p>
        </div>
        <div className="log-tools">
          <div className="log-filters" role="group" aria-label="Filter by severity">
            {levels.map((lv) => (
              <button
                key={lv}
                className={`log-chip ${lv} ${level === lv ? 'active' : ''}`}
                onClick={() => setLevel(lv)}
                aria-pressed={level === lv}
              >
                {lv === 'all' ? 'All' : lv}
              </button>
            ))}
          </div>
          <label className="ep-free" title="Keep newest entry in view">
            <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} />
            Auto-scroll
          </label>
          <button className="btn btn-ghost" onClick={exportLogs}>Export</button>
        </div>
      </div>
      <div className={`log-list ${autoscroll ? 'autoscroll' : ''}`} data-tick={tick}>
        {shown.map((l, i) => (
          <div className={`log-row ${l.level}`} key={i}>
            <span className="log-time" title={new Date(l.t).toLocaleString()}>
              <b>{relativeTime(l.t)}</b>
              <i>{new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</i>
            </span>
            <span className={`log-dot ${l.level}`} />
            <span className="log-text">{l.text}</span>
          </div>
        ))}
        {!shown.length ? <p className="meta" style={{ margin: 0 }}>No entries at this level.</p> : null}
      </div>
    </>
  )
}

function Storage() {
  const { titles } = useCatalog()
  const app = useApp()
  const b = useBroadcast()
  const [base, setBase] = useState(getMediaBase())
  const [saved, setSaved] = useState(false)
  const [health, setHealth] = useState(null)
  const [busy, setBusy] = useState(false)
  const deviceCodec = bestSupported()

  const sample = titles.find((t) => (t.episodes || []).length) || titles[0]
  const sources = sourceList(sample?.episodes?.[0]?.asset)

  const save = () => {
    setMediaBase(base)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const runCheck = async () => {
    setBusy(true)
    setHealth(await healthCheck())
    setBusy(false)
  }

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Media &amp; data infrastructure</h2>
          <p className="meta" style={{ margin: 0 }}>Cloudflare R2 for objects · Supabase for database &amp; auth</p>
        </div>
      </div>

      <div className="arch-flow">
        <div className="arch-node">
          <div className="arch-title">Studio</div>
          <div className="arch-sub">Uploads optimised audio</div>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node r2">
          <div className="arch-title">Cloudflare R2</div>
          <div className="arch-sub">10 GB free · zero egress</div>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node supa">
          <div className="arch-title">Supabase</div>
          <div className="arch-sub">stores audio_url + metadata</div>
        </div>
        <div className="arch-arrow">→</div>
        <div className="arch-node">
          <div className="arch-title">Listener app</div>
          <div className="arch-sub">streams the R2 URL</div>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Object storage" value={isConfigured() ? 'CDN' : 'Local'} sub={mediaBaseLabel()} tone={isConfigured() ? 'good' : ''} />
        <Stat label="Database / auth" value={apiConfigured() ? 'Supabase' : 'Offline'} sub={backendLabel()} tone={apiConfigured() ? 'good' : ''} />
        <Stat label="Device codec" value={deviceCodec.toUpperCase()} sub={deviceCodec === 'opus' ? 'best efficiency' : 'AAC fallback'} />
        <Stat label="Delivery variants" value="3" sub="Opus · Opus-lo · AAC" />
        {RADIO_ENABLED ? (
          (() => {
            const sc = loadStreamConfig()
            const n = streamMounts(sc).length
            return (
              <Stat
                label="Live stream"
                value={sc.enabled ? providerLabel(sc.provider) : 'Offline'}
                sub={sc.enabled ? `${n} mount${n === 1 ? '' : 's'} · ${sc.baseUrl.replace(/^https?:\/\//, '')}` : 'Studio AI broadcast'}
                tone={sc.enabled ? 'good' : ''}
              />
            )
          })()
        ) : null}
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Media base URL</h2>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Point the app at your R2 bucket or custom domain. Leave empty to serve the bundled files.
        </p>
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <input
            placeholder="https://media.luminavoice.app/audio"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={save}>{saved ? 'Saved ✓' : 'Save base URL'}</button>
          <button className="btn btn-ghost" onClick={() => { setBase(''); setMediaBase('') }}>
            Use bundled files
          </button>
          <button className="btn btn-ghost" onClick={runCheck} disabled={busy}>
            {busy ? 'Checking…' : 'Test Supabase connection'}
          </button>
        </div>
        {health ? (
          <p className="meta" style={{ marginTop: 12, marginBottom: 0, color: health.ok ? 'var(--green)' : 'var(--muted)' }}>
            {health.ok ? 'Supabase reachable.' : `Supabase: ${health.reason}`}
          </p>
        ) : null}
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>PipeWire status link</h2>
          <span className={`status-chip ${b.pw?.available ? 'on' : ''}`}>
            {b.pw?.available ? 'linked' : 'not linked'}
          </span>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          Optional. Links the studio ON AIR pill and volume chip to the real system sound server via the local
          bridge (<code>node scripts/pw-bridge.mjs</code>). Leave this off — the header falls back to simulated
          status, which is what most installs want.
        </p>
        <div className="set-row">
          <div>
            <h3>Link status to PipeWire</h3>
            <p>
              {!b.pwEnabled
                ? 'Off — status is simulated. Start the bridge, then switch this on to link live audio.'
                : b.pw?.available
                  ? `${b.pw.playing ? 'Playing' : 'Silent'} · ${b.pw.muted ? 'muted' : `${Math.round((b.pw.volume || 0) * 100)}%`} · ${b.pw.sink || 'default sink'}`
                  : 'Bridge not reachable — status is simulated.'}
            </p>
          </div>
          <button
            className={`toggle ${b.pwEnabled ? 'on' : ''}`}
            onClick={() => {
              // Re-arm the reachability check so an operator who has just
              // started the bridge can link it without reloading the page.
              resetPwStatusCache()
              b.setPwEnabled(!b.pwEnabled)
            }}
            aria-label="Link status to PipeWire"
          >
            <i />
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Device services</h2>
          <span className={`status-chip ${app.swReady ? 'on' : ''}`}>{app.swReady ? 'offline-ready' : 'sw starting'}</span>
        </div>
        <p className="meta" style={{ marginTop: 0 }}>
          The hybrid runtime: everything runs on the listener's device first — speech, offline cache, profile — and
          cloud providers only add on top when keys exist. 100% usable with zero API spend.
        </p>
        <div className="set-row">
          <div>
            <h3>On-device speech</h3>
            <p>
              Text-to-speech {ttsSupported() ? '✓ available' : '✗ not in this browser'} · voice commands{' '}
              {sttSupported() ? '✓ available' : '✗ not in this browser'} — configured in Settings → Voice &amp;
              language.
            </p>
          </div>
        </div>
        <div className="set-row">
          <div>
            <h3>Offline cache</h3>
            <p>Service worker {app.swReady ? 'active' : 'inactive'} · {formatBytes(app.offlineBytes || 0)} of audio downloaded</p>
          </div>
          <Link to="/settings" className="btn btn-ghost">Open Settings</Link>
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Codec policy</h2>
        </div>
        <div className="set-row">
          <div>
            <h3>{codecInfo.format} ({codecInfo.ext})</h3>
            <p>{codecInfo.bitrate} · {codecInfo.channels} · {codecInfo.sampleRate}</p>
            <p style={{ marginTop: 4 }}>{codecInfo.fallback}</p>
            <p style={{ marginTop: 8 }}>{codecInfo.profile}</p>
            <div className="voice-cast" style={{ marginTop: 10 }}>
              <span className="quality-pill">Young British</span>
              <span className="quality-pill">British male</span>
              <span className="quality-pill">British female</span>
              <span className="quality-pill">Young girl, Pakistan</span>
              <span className="quality-pill">Pakistani male</span>
              <span className="quality-pill">Pakistani female</span>
            </div>
          </div>
        </div>
        <div className="set-row" style={{ marginTop: 8 }}>
          <div>
            <h3>Example source negotiation</h3>
            <p>{sample?.name} · {sample?.episodes?.[0]?.asset}</p>
          </div>
        </div>
        <div className="src-table">
          {sources.map((s, i) => (
            <div className="src-row" key={s.src}>
              <span className="src-order">{i + 1}</span>
              <code className="src-url">{s.src}</code>
              <span className="src-type">{s.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Supabase schema</h2>
        </div>
        <pre className="code-block">{SCHEMA_SQL}</pre>
        <p className="meta" style={{ marginBottom: 0 }}>
          Audio never lives in the database — only the R2 <code>audio_url</code>. Flip the bucket to private and issue
          presigned URLs for premium titles.
        </p>
      </div>
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

function timeToMin(v) {
  const [h, m] = v.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
