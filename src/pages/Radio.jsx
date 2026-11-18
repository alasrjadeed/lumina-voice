import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { radioStation } from '../data/catalog'
import { getVoice } from '../data/voices'
import { hhmm, DAYS, getShow } from '../data/broadcast'
import { RadioLogo } from '../art/covers'
import { PlayBtn } from '../ui/Bits'
import { IcoPause, IcoPlay } from '../ui/Icons'
import { useApp } from '../state/AppState.jsx'
import { useLiveMeta } from '../hooks/useLiveMeta'

import { useBroadcast } from '../state/Broadcast.jsx'
import { useNowPlaying } from '../state/useNowPlaying'
import {
  loadPreferredMount,
  loadStreamConfig,
  mountFor,
  providerLabel,
  savePreferredMount,
  streamMounts
} from '../data/stream'

export default function Radio() {
  const { playBroadcast, playExternal, now, playing, togglePlay } = useApp()
  useLiveMeta()
  const b = useBroadcast()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const embed = params.get('embed') === '1'

  const externalCfg = useMemo(() => loadStreamConfig(), [])
  const externalMounts = useMemo(() => (externalCfg.enabled ? streamMounts(externalCfg) : []), [externalCfg])
  const [mountId, setMountId] = useState(() => loadPreferredMount())
  const activeMount = externalMounts.length ? mountFor(externalCfg, mountId) : null
  const { data: ext, error: extError } = useNowPlaying(externalCfg, { enabled: externalCfg.enabled })

  const live = now?.kind === 'radio' && playing
  const streamLive = now?.kind === 'stream' && playing
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
  const today = new Date().getDay()
  const upcoming = b.schedule
    .filter((s) => s.days.includes(today) && s.end > nowMin)
    .sort((x, y) => x.start - y.start)
    .slice(0, 4)

  const listen = () => {
    if (externalCfg.enabled) {
      const mount = activeMount
      if (mount) {
        playExternal(mount.url, {
          name: ext?.station || radioStation.name,
          sub: `${mount.label} · external live stream`,
          codec: mount.codec
        })
        if (!embed) nav('/now')
        return
      }
    }
    playBroadcast(b.onAir, b.show?.name)
    if (!embed) nav('/now')
  }

  const pickMount = (id) => {
    setMountId(id)
    savePreferredMount(id)
    if (!externalCfg.enabled) return
    const mount = mountFor(externalCfg, id)
    if (!mount) return
    if (now?.kind === 'stream') {
      playExternal(mount.url, {
        name: ext?.station || radioStation.name,
        sub: `${mount.label} · external live stream`,
        codec: mount.codec
      })
    }
  }

  // Compact player for iframe embeds: no navigation, no schedule.
  if (embed) {
    const title = externalCfg.enabled && ext ? ext.title : b.onAir ? b.onAir.name : radioStation.name
    const sub = externalCfg.enabled
      ? `${providerLabel(externalCfg.provider)}${ext?.isLive ? ' · live host' : ''} · ${ext?.listeners?.toLocaleString() || 0} listening`
      : `${b.listeners.toLocaleString()} listening · ${b.show?.name || 'AI automation'}`
    const isPlaying = streamLive || live
    return (
      <div className="radio-page embed-mode">
        <div className="embed-player">
          <div className="embed-main">
            <div className="radio-logo">
              <RadioLogo />
            </div>
            <div className="embed-copy">
              <div className="kicker">SADA BAHAR · LIVE</div>
              <h1>{title}</h1>
              <p className="meta">{sub}</p>
            </div>
            <button className="embed-play" onClick={isPlaying ? togglePlay : listen} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <IcoPause /> : <IcoPlay />}
            </button>
          </div>
          {externalMounts.length > 1 ? (
            <div className="stream-quality embed-quality" role="group" aria-label="Stream quality">
              {externalMounts.map((m) => (
                <button
                  key={m.id}
                  className={`quality-pill ${activeMount?.id === m.id ? 'active' : ''}`}
                  onClick={() => pickMount(m.id)}
                >
                  {m.codec.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="radio-page">
            
      <div className="radio-hero">
        <div className="radio-logo">
          <RadioLogo />
        </div>
        <div className="radio-copy">
          <div className="badge">
            {externalCfg.enabled
              ? ext?.isLive
                ? 'EXTERNAL · LIVE WITH A HOST'
                : 'EXTERNAL · LIVE STREAM'
              : b.live
                ? b.mode === 'manual'
                  ? 'LIVE WITH A HOST'
                  : 'LIVE RADIO · AUTO'
                : 'OFF AIR'}
          </div>
          <h1>{radioStation.name}</h1>
          <p className="urdu" style={{ fontSize: 28, color: 'var(--gold)', marginBottom: 8 }}>
            {radioStation.nameUr}
          </p>
          <p>{radioStation.tagline}</p>
          <p className="urdu" style={{ fontSize: 16, color: 'var(--muted)', marginTop: -12 }}>
            {radioStation.taglineUr}
          </p>
          <p className="meta">
            Hosted by <Link to="/person/pk-female">{getVoice('pk-female').name}</Link>
            {' · '}station IDs by <Link to="/person/gb-young">{getVoice('gb-young').name}</Link>
          </p>

          {externalCfg.enabled ? (
            <div className="onair-now">
              <div className="kicker">
                ON AIR NOW · {providerLabel(externalCfg.provider).toUpperCase()}
              </div>
              <h2 className="display">
                {extError ? 'Station unreachable' : ext ? ext.title : 'Contacting station…'}
              </h2>
              {ext?.artist ? (
                <p className="meta" style={{ margin: '4px 0 0' }}>{ext.artist}</p>
              ) : null}
              {extError ? (
                <div className="meta" style={{ marginTop: 6 }}>
                  {extError.reason} — the stream may still play. {extError.hint || ''}
                </div>
              ) : (
                <div className="meta" style={{ marginTop: 6 }}>
                  {ext?.listeners?.toLocaleString() || 0} listening
                  {ext?.liveName ? ` · host: ${ext.liveName}` : ''}
                </div>
              )}
            </div>
          ) : b.live ? (
            <div className="onair-now">
              <div className="kicker">ON AIR NOW · {b.show?.name?.toUpperCase()}</div>
              <h2 className="display">{b.onAir ? b.onAir.name : '—'}</h2>
              <div className="progress-track"><i style={{ width: `${b.progressPct}%` }} /></div>
              <div className="meta" style={{ marginTop: 6 }}>
                {b.listeners.toLocaleString()} listening · next: {b.nextItem ? b.nextItem.name : '—'}
              </div>
            </div>
          ) : null}

          <PlayBtn onClick={listen} block={false}>
            {live || streamLive ? 'Listening live' : 'Listen live'}
          </PlayBtn>
          <div className="codec-chip">
            {externalCfg.enabled
              ? `External stream · ${externalCfg.provider === 'icecast' ? 'Icecast mount' : 'AzuraCast'} · direct connection`
              : `Live radio · Opus ${radioStation.kbps} kbps mono · ${b.mode === 'manual' ? 'operator' : 'AI automation'}`}
          </div>
          {externalMounts.length > 1 ? (
            <div className="stream-quality" role="group" aria-label="Stream quality">
              <span className="quality-label">Quality</span>
              {externalMounts.map((m) => (
                <button
                  key={m.id}
                  className={`quality-pill ${activeMount?.id === m.id ? 'active' : ''}`}
                  onClick={() => pickMount(m.id)}
                >
                  {m.codec.toUpperCase()}
                  {m.recommended ? ' · recommended' : ''}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="row-title">
        <h2>Today&apos;s line-up</h2>
      </div>
      <div className="timeline">
        {upcoming.map((s) => {
          const show = getShow(s.showId)
          const active = nowMin >= s.start && nowMin < s.end
          return (
            <div key={s.id} className={`tl-slot ${active ? 'active' : ''}`}>
              <span className="tl-time">{hhmm(s.start)}</span>
              <span className="tl-name">{show?.name || 'Programme'}</span>
              <span className="tl-dur">{DAYS[today]} · {Math.round((s.end - s.start) / 60)}h</span>
            </div>
          )
        })}
        {!upcoming.length ? <p className="meta">The line-up resets at midnight — an endless AI mix keeps the station alive.</p> : null}
      </div>
    </div>
  )
}
