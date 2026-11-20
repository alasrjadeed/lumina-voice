import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import ImportStudio from './ImportStudio.jsx'
import ArtworkStudio from './ArtworkStudio.jsx'
import AIServices from './AIServices.jsx'
import { codecInfo } from '../data/catalog.js'
import { checkoutConfigured, startCheckout } from '../data/api.js'
import { rescheduleFromStore } from '../notify.js'
import { voices } from '../data/voices.js'
import { sourceList } from '../data/media.js'
import { formatBytes } from '../pwa.js'
import { RADIO_ENABLED } from '../config/features.js'
import {
  loadPreferredMount,
  loadStreamConfig,
  providerLabel,
  savePreferredMount,
  streamMounts
} from '../data/stream.js'
import ErrorBoundary from '../ui/ErrorBoundary.jsx'
import {
  listVoices,
  listVoicesAsync,
  loadVoicePrefs,
  saveVoicePrefs,
  speak,
  sttSupported,
  stopSpeaking,
  ttsEngine,
  ttsSupported,
  voiceStatus
} from '../ai/deviceVoice.js'

function ToggleRow({ title, sub, on, set }) {
  return (
    <div className="set-row">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
      <button className={`toggle ${on ? 'on' : ''}`} onClick={() => set(!on)} aria-label={title}>
        <i />
      </button>
    </div>
  )
}

function Group({ label, children }) {
  return (
    <section className="set-group">
      <div className="set-group-label kicker">{label}</div>
      <div className="settings-list">{children}</div>
    </section>
  )
}

function StudioFallback({ title }) {
  return (
    <div className="set-row">
      <div>
        <h3>{title}</h3>
        <p>This section could not load. Use Reset and reload if it stays empty.</p>
      </div>
    </div>
  )
}

export default function Settings() {
  const app = useApp() || {}
  const user = app.user || null
  const logout = typeof app.logout === 'function' ? app.logout : () => {}
  const updateName = typeof app.updateName === 'function' ? app.updateName : async () => ({ ok: true, local: true })
  const premium = !!app.premium
  const setPremium = typeof app.setPremium === 'function' ? app.setPremium : () => {}
  const autoplay = app.autoplay !== false
  const setAutoplay = typeof app.setAutoplay === 'function' ? app.setAutoplay : () => {}
  const hq = app.hq !== false
  const setHq = typeof app.setHq === 'function' ? app.setHq : () => {}
  const language = app.language === 'en' ? 'en' : 'ur'
  const setLanguage = typeof app.setLanguage === 'function' ? app.setLanguage : () => {}
  const isAdmin = !!app.isAdmin
  const setRole = typeof app.setRole === 'function' ? app.setRole : () => {}
  const downloads = Array.isArray(app.downloads) ? app.downloads : []
  const clearOffline = typeof app.clearOffline === 'function' ? app.clearOffline : async () => {}
  const offline = !!app.offline
  const offlineBytes = app.offlineBytes || 0
  const swReady = !!app.swReady
  const installed = !!app.installed
  const promptInstall = typeof app.promptInstall === 'function' ? app.promptInstall : async () => ({ outcome: 'manual' })
  const nav = useNavigate()
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window
  const [notifyPerm, setNotifyPerm] = useState(() => (notifSupported ? Notification.permission : 'unsupported'))
  const [roleMsg, setRoleMsg] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [nameMsg, setNameMsg] = useState('')
  const [nameBusy, setNameBusy] = useState(false)
  const [installMsg, setInstallMsg] = useState('')
  const streamCfg = useMemo(() => loadStreamConfig(), [])
  const streamMountsList = useMemo(() => (streamCfg.enabled ? streamMounts(streamCfg) : []), [streamCfg])
  const [mountId, setMountId] = useState(() => loadPreferredMount())
  const [previewId, setPreviewId] = useState('')
  const sampleRef = useRef(null)
  // Device voice — Android TTS on the tablet, Web Speech in browsers. Both offline.
  const [vprefs, setVprefs] = useState(() => loadVoicePrefs())
  const [vtest, setVtest] = useState('')
  const [devVoices, setDevVoices] = useState(() => listVoices(language))
  const [voiceInfo, setVoiceInfo] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([listVoicesAsync(language), voiceStatus()]).then(([found, info]) => {
      if (!live) return
      setDevVoices(found)
      setVoiceInfo(info)
    }).catch(() => {})
    return () => { live = false }
  }, [language])
  const setVPref = (patch) => {
    const next = { ...vprefs, ...patch }
    setVprefs(next)
    saveVoicePrefs(next)
  }

  const askNotify = async () => {
    if (!notifSupported) return
    try {
      const p = await Notification.requestPermission()
      setNotifyPerm(p)
      // Arm show reminders right away once granted (also re-armed by Broadcast).
      if (p === 'granted') rescheduleFromStore()
    } catch {
      setNotifyPerm('denied')
    }
  }

  useEffect(() => {
    setNameDraft(user?.name || '')
  }, [user?.name])

  const saveName = async () => {
    setNameBusy(true)
    setNameMsg('')
    const res = await updateName(nameDraft)
    setNameMsg(res.ok ? (res.local ? 'Saved on this device.' : 'Saved to your profile on every device.') : (res.error || 'Could not save that name.'))
    setNameBusy(false)
  }

  const toggleRole = async () => {
    const next = isAdmin ? 'listener' : 'admin'
    setRoleMsg('')
    const res = await setRole(next)
    if (res && res.ok === false) setRoleMsg(res.error || 'Could not save that change.')
  }

  const playSample = (v) => {
    const el = sampleRef.current
    if (!el) return
    if (previewId === v.id && !el.paused) {
      el.pause()
      setPreviewId('')
      return
    }
    while (el.firstChild) el.removeChild(el.firstChild)
    sourceList(v.sample || '').forEach((s) => {
      const source = document.createElement('source')
      source.src = s.src
      source.type = s.type
      el.appendChild(source)
    })
    el.load()
    el.play().then(() => setPreviewId(v.id)).catch(() => setPreviewId(''))
  }

  return (
    <div className="settings-page">
      <div className="section-head">
        <h1>Settings</h1>
      </div>

      <Group label="Account">
        {user ? (
          <div className="set-row">
            <div>
              <h3>{user.name || 'Signed in'}</h3>
              <p>{user.email || ''}</p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => {
                logout()
                nav('/auth')
              }}
            >
              Log out
            </button>
          </div>
        ) : null}
        {user ? (
          <div className="set-row">
            <div style={{ flex: 1 }}>
              <h3>Display name</h3>
              <p>Shown beside your reviews on every device.</p>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={40}
                placeholder="Your name"
                aria-label="Display name"
                style={{ maxWidth: 280, marginTop: 8 }}
              />
              {nameMsg ? <p className="meta">{nameMsg}</p> : null}
            </div>
            <button
              className="btn btn-ghost"
              disabled={nameBusy || !nameDraft.trim() || nameDraft.trim() === (user.name || '')}
              onClick={saveName}
            >
              {nameBusy ? 'Saving…' : 'Save name'}
            </button>
          </div>
        ) : (
          <div className="set-row">
            <div>
              <h3>Not signed in</h3>
              <p>Sign in to save your library, membership, and studio access.</p>
            </div>
            <button className="btn btn-primary" onClick={() => nav('/auth')}>
              Sign in
            </button>
          </div>
        )}

        <div className="premium-banner compact">
          <div className="kicker">{premium ? 'ACTIVE' : 'LUMINA PLUS'}</div>
          <div className="premium-line">
            <h3 className="display premium-title">
              {premium ? 'Every episode, unlocked' : 'Unlock premium episodes'}
            </h3>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!premium && checkoutConfigured()) {
                  startCheckout(user?.id)
                  return
                }
                setPremium(!premium)
              }}
            >
              {premium ? 'Turn off membership' : checkoutConfigured() ? 'Start Lumina Plus' : 'Start Lumina Plus (demo)'}
            </button>
          </div>
          <p className="meta">
            {premium
              ? `Every episode of every title is open to you — audio-films, series, poets${RADIO_ENABLED ? ', and live radio' : ''}.`
              : 'First episode free on every title. Plus opens the rest of the house.'}
            {checkoutConfigured() && !premium ? " Secure checkout — you'll be returned here to unlock Plus." : ''}
          </p>
        </div>
      </Group>

      <Group label="Playback">
        <ToggleRow
          title="Autoplay next episode"
          sub="Continue the story without lifting a finger."
          on={autoplay}
          set={setAutoplay}
        />
        <ToggleRow
          title="High quality audio"
          sub={hq ? 'Opus 40–48 kbps mono on Wi-Fi.' : 'Opus 24 kbps mono for slow connections.'}
          on={hq}
          set={setHq}
        />

        {streamMountsList.length ? (
          <div className="set-row">
            <div>
              <h3>Live stream quality</h3>
              <p>
                {providerLabel(streamCfg.provider)} · {(streamCfg.baseUrl || '').replace(/^https?:\/\//, '')}. Direct connection, never proxied.
              </p>
              <div className="stream-quality" role="group" aria-label="Live stream quality" style={{ marginTop: 10 }}>
                {streamMountsList.map((m) => (
                  <button
                    key={m.id}
                    className={`quality-pill ${mountId === m.id || (!mountId && m.recommended) ? 'active' : ''}`}
                    onClick={() => {
                      setMountId(m.id)
                      savePreferredMount(m.id)
                    }}
                  >
                    {['opus', 'aac', 'mp3'].includes(m.codec) ? m.codec.toUpperCase() : m.label}
                    {m.recommended ? ' · recommended' : ''}
                  </button>
                ))}
              </div>
            </div>
            {isAdmin ? (
              <Link to="/admin" className="linkish">
                Open Device Admin →
              </Link>
            ) : null}
          </div>
        ) : null}

        <details className="set-row disclosure-row">
          <summary>
            <span>
              <h3>Audio codec</h3>
              <p>{codecInfo.format} ({codecInfo.ext}) · {codecInfo.bitrate} {codecInfo.channels}.</p>
            </span>
          </summary>
          <p style={{ marginTop: 8 }}>
            {codecInfo.profile}. {codecInfo.sampleRate}. {codecInfo.fallback}. {codecInfo.platforms}.
          </p>
        </details>
      </Group>

      <Group label="Voice &amp; language">
        <div className="set-row">
          <div>
            <h3>Spoken language</h3>
            <p>
              {language === 'en'
                ? 'Programmes play in English. Stories still keep their Urdu titles on screen.'
                : 'Programmes play in Urdu. English titles stay as written.'}
            </p>
            <div className="stream-quality" role="group" aria-label="Spoken language" style={{ marginTop: 10 }}>
              <button className={`quality-pill ${language === 'ur' ? 'active' : ''}`} onClick={() => setLanguage('ur')}>
                Urdu · اردو
              </button>
              <button className={`quality-pill ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>
                English
              </button>
            </div>
          </div>
        </div>

        <div className="set-row">
          <div>
            <h3>Voice cast</h3>
            <p>Neural speech, not a robotic synthesiser. British English or Pakistani Urdu, chosen above.</p>
            <div className="voice-cast" style={{ marginTop: 10 }}>
              {voices.map((v) => (
                <button
                  key={v.id}
                  className={`quality-pill ${previewId === v.id ? 'active' : ''}`}
                  onClick={() => playSample(v)}
                >
                  {previewId === v.id ? 'Playing · ' : ''}{v.label}
                </button>
              ))}
            </div>
            <audio ref={sampleRef} preload="none" onEnded={() => setPreviewId('')} />
          </div>
        </div>

        <div className="set-row">
          <div style={{ width: '100%', minWidth: 0 }}>
            <h3>
              Device voice
              <span className="tag live" style={{ marginLeft: 8, background: 'rgba(61,214,140,0.16)', color: 'var(--green)' }}>
                100% free · on-device
              </span>
            </h3>
            <p>
              Announcements and voice commands use the installed Urdu voice on the tablet (Android text-to-speech),
              or Web Speech in a browser. No key, no account, works offline.
            </p>
            {voiceInfo && ttsEngine() === 'native' ? (
              <p className="meta" style={{ marginTop: 6 }}>
                {!voiceInfo.available
                  ? voiceInfo.error || 'Starting the Android voice engine…'
                  : voiceInfo.urduAvailable === false
                    ? 'Urdu pack not detected — install Urdu (Pakistan) for this speech engine in Android settings.'
                    : `Android voice ready${voiceInfo.engine ? ` · ${voiceInfo.engine}` : ''}. Urdu digits, pauses and phrasing are shaped for natural speech.`}
              </p>
            ) : null}
            {ttsSupported() ? (
              <>
                <ToggleRow
                  title="Announce now playing"
                  sub="The device voice reads out each track as it starts."
                  on={vprefs.announce}
                  set={(v) => setVPref({ announce: v })}
                />
                <div className="set-row" style={{ paddingTop: 0 }}>
                  <div style={{ width: '100%', minWidth: 0 }}>
                    <h3 style={{ fontSize: 13 }}>Voice &amp; speed</h3>
                    <div className="ai-key-row">
                      <select
                        className="select"
                        value={vprefs.voiceURI}
                        onChange={(e) => setVPref({ voiceURI: e.target.value })}
                        aria-label="Device voice"
                      >
                        <option value="">Auto (best match)</option>
                        {devVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} · {v.lang}
                          </option>
                        ))}
                      </select>
                      <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={vprefs.rate}
                        onChange={(e) => setVPref({ rate: Number(e.target.value) })}
                        aria-label="Voice speed"
                        title="Voice speed"
                      />
                      <input
                        type="range"
                        min="0.7"
                        max="1.3"
                        step="0.05"
                        value={vprefs.pitch}
                        onChange={(e) => setVPref({ pitch: Number(e.target.value) })}
                        aria-label="Voice pitch"
                        title="Voice pitch"
                      />
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setVtest('Testing device voice…')
                          const okSpoken = speak(
                            language === 'ur'
                              ? 'لومینا وائس۔ آنکھیں بند کیجیے، کہانی شروع ہوتی ہے۔'
                              : 'Welcome to Lumina Voice. Close your eyes, the story begins.',
                            {
                              voiceURI: vprefs.voiceURI,
                              rate: vprefs.rate,
                              pitch: vprefs.pitch,
                              lang: language === 'ur' ? 'ur-PK' : 'en-GB'
                            }
                          )
                          setVtest(okSpoken ? 'Speaking on this device…' : 'Device speech not supported here.')
                        }}
                      >
                        Test
                      </button>
                    </div>
                    {vtest ? <p className="meta" style={{ marginTop: 8 }}>{vtest}</p> : null}
                  </div>
                </div>
              </>
            ) : (
              <p className="meta">This browser has no device speech engine — Chrome and Safari support it.</p>
            )}
            {sttSupported() ? (
              <ToggleRow
                title="Voice commands"
                sub={`A mic button appears on the player: play/pause, next${RADIO_ENABLED ? ', radio' : ''}, Urdu, English.`}
                on={vprefs.commands}
                set={(v) => setVPref({ commands: v })}
              />
            ) : (
              <p className="meta" style={{ marginBottom: 0 }}>Voice commands need Chrome's speech recognition.</p>
            )}
            {ttsSupported() ? (
              <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => stopSpeaking()}>
                Stop speaking
              </button>
            ) : null}
          </div>
        </div>
      </Group>

      <Group label="AI services">
        <AIServices />
      </Group>

      <Group label="This device">
        {user && RADIO_ENABLED ? (
          <div className="set-row">
            <div>
              <h3>Studio access</h3>
              <p>
                {isAdmin
                  ? 'You have operator access to the Sada Bahar broadcast studio.'
                  : app.authConfigured
                    ? 'Enable to run the broadcast automation desk. The role is stored on your Supabase profile.'
                    : 'Enable to run the broadcast automation desk.'}
              </p>
              {roleMsg ? <p style={{ color: 'var(--danger)' }}>{roleMsg}</p> : null}
              {isAdmin ? (
                <Link to="/admin" className="linkish" style={{ display: 'inline-block', marginTop: 6 }}>
                  Open Broadcast Studio →
                </Link>
              ) : null}
            </div>
            <button className={`toggle ${isAdmin ? 'on' : ''}`} onClick={toggleRole} aria-label="Studio access">
              <i />
            </button>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="set-row">
            <div>
              <h3>Device Admin</h3>
              <p>Manage content, website copy and backups from the dashboard on this device.</p>
              <Link to="/admin" className="linkish" style={{ display: 'inline-block', marginTop: 6 }}>
                Open dashboard →
              </Link>
            </div>
          </div>
        ) : null}

        {notifSupported ? (
          <div className="set-row">
            <div>
              <h3>New title alerts</h3>
              <p>
                {notifyPerm === 'granted'
                  ? 'Notifications are allowed on this device — alerts for new titles will arrive here.'
                  : notifyPerm === 'denied'
                    ? 'Notifications are blocked. Allow them for this site in your browser settings to get alerts.'
                    : 'A quiet nudge when a new film drops. Your browser will ask for permission.'}
              </p>
            </div>
            {notifyPerm === 'granted' ? (
              <span className="tag live">enabled</span>
            ) : notifyPerm === 'denied' ? (
              <span className="tag">blocked</span>
            ) : (
              <button className="btn btn-ghost" onClick={askNotify}>
                Enable alerts
              </button>
            )}
          </div>
        ) : null}

        <div className="set-row">
          <div>
            <h3>Offline listening</h3>
            <p>
              {swReady ? 'Installed app can play downloaded titles with no connection.' : 'Preparing offline support…'}
              {offline ? ' You are offline right now.' : ''}
              {' · '}{downloads.length} title{downloads.length === 1 ? '' : 's'} downloaded · {formatBytes(offlineBytes)} stored
            </p>
          </div>
          {downloads.length ? (
            <button className="btn btn-ghost" onClick={() => clearOffline()}>
              Clear downloads
            </button>
          ) : (
            <span className={`tag ${swReady ? 'live' : ''}`}>{swReady ? 'ready' : 'off'}</span>
          )}
        </div>

        <div className="set-row">
          <div>
            <h3>Transfer data</h3>
            <p>Copy your library, edits, history and settings to another device without losing anything. Imported audio is included; your account and radio state stay put.</p>
          </div>
          <button className="btn btn-primary" onClick={() => nav('/transfer')}>
            Transfer data
          </button>
        </div>

        <div className="set-row">
          <div>
            <h3>Install Lumina Voice</h3>
            <p>
              {installed
                ? 'Lumina is installed on this device. Open it from your home screen for full-screen playback.'
                : 'Add Lumina to your home screen for full-screen playback and offline audio.'}
            </p>
            {installMsg ? <p style={{ marginTop: 6, color: 'var(--gold)' }}>{installMsg}</p> : null}
          </div>
          {installed ? (
            <span className="tag live">installed</span>
          ) : (
            <button
              className="btn btn-primary"
              onClick={async () => {
                const r = await promptInstall()
                if (r.outcome === 'accepted' || r.outcome === 'already') setInstallMsg('Installed.')
                else if (r.outcome === 'dismissed') setInstallMsg('Install dismissed.')
                else if (r.outcome === 'ios') setInstallMsg('On iPhone: tap Share, then Add to Home Screen.')
                else setInstallMsg('Use your browser menu — Install app or Add to Home Screen.')
              }}
            >
              Install app
            </button>
          )}
        </div>
      </Group>

      <Group label="Studio">
        <ErrorBoundary fallback={<StudioFallback title="Add local or online content" />}>
          <ImportStudio />
        </ErrorBoundary>
        <ErrorBoundary fallback={<StudioFallback title="Covers & portraits" />}>
          <ArtworkStudio />
        </ErrorBoundary>
      </Group>

      <Group label="Developer">
        <div className="set-row">
          <div>
            <h3>AL ASAR JADEED</h3>
            <p>
              WEBSITE:{' '}
              <a className="linkish" href="https://www.alasarjadeed.com" target="_blank" rel="noopener">
                www.alasarjadeed.com
              </a>
            </p>
          </div>
          <a className="btn btn-ghost" href="https://www.alasarjadeed.com" target="_blank" rel="noopener">
            Open website
          </a>
        </div>
      </Group>

      <p className="settings-foot meta">
        AL ASAR JADEED · WEBSITE: <a href="https://www.alasarjadeed.com" target="_blank" rel="noopener">www.alasarjadeed.com</a>
        <br />
        Urdu audio-films, dramas, series and audiobooks{RADIO_ENABLED ? ', and live radio' : ''} from Archive.org. Close your eyes. The story begins. Version 1.0.0
      </p>
    </div>
  )
}
