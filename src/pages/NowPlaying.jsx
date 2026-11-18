import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CoverArt, RadioLogo } from '../art/covers'
import AudioSpectrum from '../ui/AudioSpectrum'
import { BackBtn, fmt } from '../ui/Bits'
import { RADIO_ENABLED } from '../config/features.js'
import {
  IcoPause,
  IcoPlay,
  IcoRepeat,
  IcoRepeatOne,
  IcoShuffle,
  IcoSkip,
  IcoSliders,
  IcoVolume,
  IcoVolumeOff
} from '../ui/Icons'
import { useApp } from '../state/AppState.jsx'
import { useArtwork } from '../state/Artwork.jsx'
import { useCatalog } from '../state/Catalog.jsx'
import { loadStudio, resolveVoice } from '../data/voiceStudio'
import { bestSupported } from '../data/media'
import {
  listenOnce,
  loadVoicePrefs,
  parseVoiceCommand,
  speak,
  sttSupported,
  ttsSupported
} from '../ai/deviceVoice'
import {
  SUBTITLE_LANGS,
  autoTrackFor,
  cueAt,
  languagesFor,
  langMeta,
  loadTrack,
  prefFor,
  setPref
} from '../data/subtitles'
import {
  loadPreferredMount,
  loadStreamConfig,
  savePreferredMount,
  streamMounts
} from '../data/stream'

export default function NowPlaying() {
  const {
    now, playing, playError, togglePlay, time, duration, seek, playEpisode, playExternal,
    playRadio, language, setLanguage, autoplay, setAutoplay,
    volume, setVolume, muted, toggleMute, shuffle, toggleShuffle, repeat, cycleRepeat, rate, setRate,
    audioRef
  } = useApp()
  const { coverFor } = useArtwork()
  const { getTitle } = useCatalog()
  const nav = useNavigate()
  const streamCfg = useMemo(() => loadStreamConfig(), [])
  const mounts = useMemo(() => (streamCfg.enabled ? streamMounts(streamCfg) : []), [streamCfg])
  const [mountId, setMountId] = useState(() => loadPreferredMount())
  // Device voice: announce + optional one-shot voice commands (both on-device).
  const [vprefs] = useState(() => loadVoicePrefs())
  const [listening, setListening] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [heard, setHeard] = useState('')
  const lastAnnounced = useRef('')
  // Subtitles — language tracks stored on this device (see data/subtitles.js).
  const [subLang, setSubLang] = useState(() => {
    if (!now?.titleId) return ''
    const pref = prefFor(now.titleId)
    return pref === 'off' ? '' : pref || autoTrackFor(now.titleId) || ''
  })
  const [subTick, setSubTick] = useState(0)
  const subTitleId = now?.titleId || ''
  const subPref = prefFor(subTitleId)

  useEffect(() => {
    if (!subTitleId) {
      setSubLang('')
      return
    }
    const pref = prefFor(subTitleId)
    setSubLang(pref === 'off' ? '' : pref || autoTrackFor(subTitleId) || '')
  }, [subTitleId, subTick])

  const subLangs = useMemo(() => languagesFor(subTitleId), [subTitleId, subTick])
  const subCues = useMemo(
    () => (subLang ? loadTrack(subTitleId, subLang)?.cues || [] : []),
    [subTitleId, subLang, subTick]
  )
  const activeCue = subLang ? cueAt(subCues, time) : null
  const subMeta = subLang ? langMeta(subLang) : null

  // Keep the overlay honest when tracks are edited in another tab (Admin).
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || /^lumina-subtitle/.test(e.key)) setSubTick((t) => t + 1)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!vprefs.announce || !playing || !now || !ttsSupported()) return
    if (lastAnnounced.current === now.episodeId) return
    lastAnnounced.current = now.episodeId
    speak(`${now.name}`, {
      lang: (now.lang || language) === 'ur' ? 'ur-PK' : 'en-GB',
      voiceURI: vprefs.voiceURI,
      rate: vprefs.rate,
      pitch: vprefs.pitch
    })
  }, [now, playing, vprefs.announce, vprefs.voiceURI, vprefs.rate, vprefs.pitch, language])

  const runVoiceCmd = (text) => {
    const cmd = parseVoiceCommand(text)
    if (!cmd) {
      speak(language === 'ur' ? 'معذرت، سمجھ نہیں آئی۔ دوبارہ کہیے۔' : 'Sorry, I did not understand. Please say that again.', {
        lang: language === 'ur' ? 'ur-PK' : 'en-GB',
        voiceURI: vprefs.voiceURI,
        rate: vprefs.rate,
        pitch: vprefs.pitch
      })
      return
    }
    if (cmd.action === 'toggle') togglePlay()
    else if (cmd.action === 'radio') {
      if (RADIO_ENABLED) playRadio()
      else speak(language === 'ur' ? 'ریڈیو فی الحال دستیاب نہیں۔' : 'Radio is currently unavailable.', { lang: language === 'ur' ? 'ur-PK' : 'en-GB', voiceURI: vprefs.voiceURI, rate: vprefs.rate, pitch: vprefs.pitch })
    }
    else if (cmd.action === 'lang') setLanguage(cmd.arg)
    else if (cmd.action === 'status') {
      speak(now ? `اب چل رہا ہے، ${now.name}` : language === 'ur' ? 'کچھ نہیں چل رہا۔' : 'Nothing is playing.', {
        lang: (now?.lang || language) === 'ur' ? 'ur-PK' : 'en-GB',
        voiceURI: vprefs.voiceURI,
        rate: vprefs.rate,
        pitch: vprefs.pitch
      })
    } else if (cmd.action === 'next' || cmd.action === 'prev') {
      const title = now?.titleId ? getTitle(now.titleId) : null
      if (title?.episodes) {
        const idx = title.episodes.findIndex((e) => e.id === now.episodeId)
        const ep = title.episodes[idx + (cmd.action === 'next' ? 1 : -1)]
        if (ep) {
          const r = playEpisode(title.id, ep)
          if (r.locked) nav(`/title/${title.id}`)
        }
      }
    }
  }

  const startListening = () => {
    if (listening || !sttSupported()) return
    setListening(true)
    setHeard('')
    listenOnce({
      lang: language === 'ur' ? 'ur-PK' : 'en-GB',
      onResult: (text) => {
        setHeard(text)
        runVoiceCmd(text)
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false)
    })
  }

  if (!now) {
    return (
      <>
        <div className="section-head">
          <BackBtn />
          <h1>Now playing</h1>
        </div>
        <div className="empty">
          <h3>Silence, for now</h3>
          <p>Choose an audio-film, series, or audiobook{RADIO_ENABLED ? ', or Sada Bahar live radio' : ''}.</p>
        </div>
      </>
    )
  }

  const title = now.titleId ? getTitle(now.titleId) : null
  const narrator = title ? resolveVoice(title, loadStudio()) : null
  const isStream = now.kind === 'stream'
  const isLive = now.kind === 'radio' || isStream

  const skip = (dir) => {
    if (!title) return
    const idx = title.episodes.findIndex((e) => e.id === now.episodeId)
    const next = title.episodes[idx + dir]
    if (next) {
      const r = playEpisode(title.id, next)
      if (r.locked) nav(`/title/${title.id}`)
    }
  }

  return (
    <div className="full-player">
      <div className="kicker">
        {isLive ? 'NOW LISTEN SADA BAHAR LIVE' : 'NOW PLAYING'}
      </div>
      <div
        className="now-stage"
        style={{
          position: 'relative',
          width: 260,
          height: 260,
          borderRadius: isLive ? '50%' : 24,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          border: '1px solid var(--line)',
          background: isLive ? '#0a0a0f' : '#121018'
        }}
      >
        {isLive ? (
          <RadioLogo />
        ) : (
          <>
            <CoverArt
              id={now.cover}
              title=""
              src={coverFor(title || now.titleId)}
              t={title}
              className="cover-art"
            />
            <div
              className="cover-gradient"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 100%)',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
          </>
        )}
      </div>
      {!isLive ? (
        <div className="now-spectrum-block">
          <div className="now-spectrum-label">Audio spectrum</div>
          <div className="now-spectrum-track">
            <AudioSpectrum
              mediaEl={audioRef?.current}
              active={playing}
              width={260}
              height={64}
              className="now-spectrum-canvas"
            />
          </div>
        </div>
      ) : null}
      {activeCue ? (
        <div
          className="sub-overlay"
          dir={subMeta?.dir || 'ltr'}
          lang={subLang}
          role="region"
          aria-live="off"
          aria-label={`Subtitles in ${subMeta?.label || subLang}`}
        >
          {activeCue.text}
        </div>
      ) : null}
      {/* data-* hooks so automation (and the OS media session) can tell which
          part is actually playing without scraping the subtitle text. */}
      <div className="now-title" data-episode={now.episodeId || ''} data-title={now.titleId || ''} style={{ maxWidth: '100%', overflowWrap: 'break-word' }}>{now.name}</div>
      {now.nameUr ? (
        <div className="urdu" style={{ fontFamily: 'var(--naskh)', fontSize: 22, color: 'var(--gold)', maxWidth: '100%', overflowWrap: 'break-word' }}>
          {now.nameUr}
        </div>
      ) : null}
      <div className="now-sub">{now.sub}</div>
      {playError ? (
        <p className="meta" style={{ color: 'var(--danger)', marginTop: 8 }}>
          {playError}
        </p>
      ) : null}
      {narrator && !isLive && !title?.imported ? (
        <div className="meta" style={{ marginTop: 4 }}>
          Narrated by <Link to={`/person/${narrator.id}`}>{narrator.name}</Link> · {narrator.label}
        </div>
      ) : null}
      {!isStream && !title?.imported ? (
        <div className="stream-quality" role="group" aria-label="Spoken language">
          <span className="quality-label">Language</span>
          <button
            className={`quality-pill ${(now.lang || language) === 'ur' ? 'active' : ''}`}
            onClick={() => setLanguage('ur')}
          >
            Urdu
          </button>
          <button
            className={`quality-pill ${(now.lang || language) === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
        </div>
      ) : null}
      {subLangs.length ? (
        <div className="stream-quality" role="group" aria-label="Subtitles">
          <span className="quality-label">Subtitles</span>
          <button
            className={`quality-pill ${subPref === null ? 'active' : ''}`}
            onClick={() => {
              setPref(subTitleId, '')
              setSubLang(autoTrackFor(subTitleId))
            }}
            title="Show the best available track automatically"
          >
            Auto
          </button>
          <button
            className={`quality-pill ${subPref === 'off' ? 'active' : ''}`}
            onClick={() => {
              setPref(subTitleId, 'off')
              setSubLang('')
            }}
          >
            Off
          </button>
          {SUBTITLE_LANGS.filter((l) => subLangs.includes(l.code)).map((l) => (
            <button
              key={l.code}
              className={`quality-pill ${subLang === l.code ? 'active' : ''}`}
              onClick={() => setSubLang(setPref(subTitleId, l.code))}
              title={`Subtitles in ${l.label}`}
            >
              {l.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="codec-chip">
        {title?.imported
          ? `Imported · ${title.source || 'external'} · direct`
          : isStream
            ? `External · ${(now.codec || 'stream').toUpperCase()} · direct connection`
            : `${bestSupported() === 'opus' ? 'Opus' : 'AAC'} · mono · ${now.kind === 'radio' ? 'live' : '24 kHz speech'}`}
      </div>
      {isStream && mounts.length > 1 ? (
        <div className="stream-quality" role="group" aria-label="Stream quality">
          {mounts.map((m) => (
            <button
              key={m.id}
              className={`quality-pill ${mountId === m.id || (!mountId && m.recommended) || now.src === m.url ? 'active' : ''}`}
              onClick={() => {
                setMountId(m.id)
                savePreferredMount(m.id)
                playExternal(m.url, {
                  name: now.name,
                  sub: `${m.label} · external live stream`,
                  codec: m.codec
                })
              }}
            >
              {m.codec.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}
      {!isLive ? (
        <>
          <input
            className="seek"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div className="times">
            <span>{fmt(time)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </>
      ) : (
        <div className="times" style={{ justifyContent: 'center' }}>
          <span>
            {isStream
              ? 'External live stream · audio plays directly from the station'
              : `Live stream · Opus ${now.kbps || 40} kbps mono`}
          </span>
        </div>
      )}
      <div className="player-controls">
        {!isLive ? (
          <button onClick={() => skip(-1)} aria-label="Previous">
            <IcoSkip dir={-1} />
          </button>
        ) : null}
        <button className="round-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <IcoPause /> : <IcoPlay />}
        </button>
        {!isLive ? (
          <button onClick={() => skip(1)} aria-label="Next">
            <IcoSkip dir={1} />
          </button>
        ) : null}
        {vprefs.commands && sttSupported() ? (
          <button
            className={`mic-btn ${listening ? 'listening' : ''}`}
            onClick={startListening}
            aria-label={listening ? 'Listening…' : 'Voice command'}
            title={`Voice command — play, pause, next${RADIO_ENABLED ? ', radio' : ''}, Urdu, English`}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        ) : null}
      </div>
      {/* Volume is the one control that always applies, so it stays on screen
          for live radio too. Shuffle and repeat only mean something when there
          is a queue of parts, so they remain episode-only. */}
      <div className="player-extras">
        <div className="volume-group">
          <button
            type="button"
            className="volume-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? <IcoVolumeOff /> : <IcoVolume />}
          </button>
          <input
            className="volume-range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
        {!isLive ? (
          <div className="extra-btns">
            <button
              type="button"
              className={`extra-btn ${shuffle ? 'active' : ''}`}
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Shuffle"
              title={shuffle ? 'Shuffle on — parts play in a random order' : 'Shuffle off'}
            >
              <IcoShuffle />
            </button>
            <button
              type="button"
              className={`extra-btn ${repeat !== 'off' ? 'active' : ''}`}
              onClick={cycleRepeat}
              aria-label={`Repeat: ${repeat === 'one' ? 'this track' : repeat === 'all' ? 'all' : 'off'}`}
              title={
                repeat === 'off'
                  ? 'Repeat off'
                  : repeat === 'all'
                    ? 'Repeat all — loops the whole title'
                    : 'Repeat one — loops this track'
              }
            >
              {repeat === 'one' ? <IcoRepeatOne /> : <IcoRepeat />}
            </button>
            <button
              type="button"
              className={`extra-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              aria-controls="player-settings"
              aria-label="Player settings"
              title="Player settings"
            >
              <IcoSliders />
            </button>
          </div>
        ) : null}
      </div>

      {showSettings && !isLive ? (
        <div className="player-settings" id="player-settings">
          <div className="ps-row">
            <span className="ps-label">Speed</span>
            <div className="stream-quality">
              {[0.75, 1, 1.25, 1.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`quality-pill ${rate === r ? 'active' : ''}`}
                  onClick={() => setRate(r)}
                >
                  {r}×
                </button>
              ))}
            </div>
          </div>
          <div className="ps-row">
            <span className="ps-label">Continue</span>
            <div className="ps-text">
              <label className="ps-check">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />
                <span>Play the next part automatically</span>
              </label>
              <p className="meta" style={{ margin: '4px 0 0' }}>
                {shuffle
                  ? 'Shuffle is on — the next part is chosen at random.'
                  : repeat === 'all'
                    ? 'Repeat all — after the last part it starts again.'
                    : repeat === 'one'
                      ? 'Repeat one — this track loops.'
                      : 'In order, then stops after the last part.'}
              </p>
            </div>
          </div>
          <div className="ps-row">
            <span className="ps-label">Volume</span>
            <div className="ps-text ps-value">{Math.round((muted ? 0 : volume) * 100)}%</div>
          </div>
        </div>
      ) : null}

      {vprefs.commands && sttSupported() ? (
        <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>
          {listening ? `🎤 Listening… say play, pause, next${RADIO_ENABLED ? ', radio' : ''}, Urdu or English` : heard ? `Heard: “${heard}”` : 'Voice commands run on this device — nothing is sent online.'}
        </p>
      ) : null}
    </div>
  )
}
