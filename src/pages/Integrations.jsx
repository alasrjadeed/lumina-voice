import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppState.jsx'
import { useNowPlaying } from '../state/useNowPlaying'
import {
  configIssues,
  defaultStreamConfig,
  detectProvider,
  embedSnippets,
  loadStreamConfig,
  providerLabel,
  saveStreamConfig,
  streamMounts
} from '../data/stream'
import { IcoInfo, IcoWave } from '../ui/Icons'

const STATE_LABEL = { ok: 'READY', fail: 'ACTION', wait: 'WAITING', todo: 'TODO' }

const TABS = [
  { id: 'iframe', label: 'Iframe player' },
  { id: 'audio', label: 'HTML5 audio' },
  { id: 'widget', label: 'Now-playing widget' },
  { id: 'markdown', label: 'Markdown' }
]

export default function Integrations() {
  const { playExternal, now, playing, togglePlay } = useApp()
  const [cfg, setCfg] = useState(() => loadStreamConfig())
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState('')
  const [snippetTab, setSnippetTab] = useState('html')
  const [testing, setTesting] = useState(false)

  const issues = configIssues(cfg)
  const mounts = useMemo(() => streamMounts(cfg), [cfg])
  const snippets = useMemo(() => embedSnippets(cfg), [cfg])
  const { data, error, updatedAt } = useNowPlaying(cfg, { enabled: saved || cfg.enabled, intervalMs: 15000 })

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 1600)
    return () => clearTimeout(t)
  }, [saved])

  const persist = (next) => {
    const clean = saveStreamConfig(next)
    setCfg(clean)
    setSaved(true)
  }

  const update = (patch) => setCfg((c) => ({ ...c, ...patch }))

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(id)
    setTimeout(() => setCopied(''), 1500)
  }

  const playMount = (mount) => {
    if (now?.src === mount.url && playing) {
      togglePlay()
      return
    }
    playExternal(mount.url, {
      name: data?.station || 'Sada Bahar',
      sub: `${mount.label} · external live stream`,
      codec: mount.codec
    })
  }

  const embedUrl = typeof window !== 'undefined' ? `${window.location.origin}/radio?embed=1` : '/radio?embed=1'
  const checks = [
    {
      id: 'config',
      label: 'Station connection saved',
      state: cfg.enabled && !issues.length ? 'ok' : cfg.baseUrl.trim() && issues.length ? 'fail' : 'todo',
      detail: cfg.enabled && !issues.length ? cfg.baseUrl : issues[0] || 'Add an AzuraCast or Icecast base URL'
    },
    {
      id: 'api',
      label: 'Now-playing metadata reachable',
      state: !cfg.enabled ? 'todo' : error ? 'fail' : data ? 'ok' : 'wait',
      detail: error ? error.reason : data ? `${providerLabel(cfg.provider)} responded at ${new Date(updatedAt).toLocaleTimeString()}` : 'Waiting for the first poll'
    },
    {
      id: 'mounts',
      label: 'Direct listener mounts generated',
      state: mounts.length ? 'ok' : 'todo',
      detail: mounts.length ? `${mounts.length} mount${mounts.length === 1 ? '' : 's'} \u00b7 ${mounts.map((m) => m.codec).join(', ')}` : 'Save a station URL to build mount links'
    },
    {
      id: 'onair',
      label: 'Station is on air',
      state: !data ? 'wait' : data.isLive ? 'ok' : 'todo',
      detail: !data ? 'No metadata yet' : data.isLive ? `${data.title}${data.liveName ? ` \u00b7 host ${data.liveName}` : ''}` : `AutoDJ: ${data.title} (no live host)`
    },
    {
      id: 'embed',
      label: 'Iframe embed route available',
      state: 'ok',
      detail: 'Public compact player, no sign-in required'
    }
  ]

  const snippetForTab = () => {
    if (snippetTab === 'iframe') return snippets.iframe
    if (snippetTab === 'audio') return snippets.audio
    if (snippetTab === 'widget') return snippets.widget
    return snippets.markdown
  }

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Live stream &amp; embeds</h2>
          <p className="meta" style={{ margin: 0 }}>
            Connect an external AzuraCast or Icecast server — Lumina reads metadata and links listeners straight to it.
          </p>
        </div>
        <div className={`onair-pill ${data?.isLive ? 'live' : 'off'}`}>
          <span className={data?.isLive ? 'dotpulse' : 'dot'} />
          {data?.isLive ? 'EXTERNAL LIVE' : cfg.enabled ? 'CONNECTED' : 'NOT CONFIGURED'}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Station connection</h2>
          <span className="meta">Read-only · no proxying</span>
        </div>

        <div className="camp-grid">
          <label className="ad-field">
            <span>Provider</span>
            <select className="select" value={cfg.provider} onChange={(e) => update({ provider: e.target.value })}>
              <option value="azuracast">AzuraCast</option>
              <option value="icecast">Icecast</option>
            </select>
          </label>
          <label className="ad-field">
            <span>Station API URL</span>
            <input
              value={cfg.baseUrl}
              onChange={(e) => {
                const baseUrl = e.target.value
                update({ baseUrl, provider: detectProvider(baseUrl) })
              }}
              placeholder="https://radio.example.com:8080"
            />
          </label>
          <label className="ad-field">
            <span>Listener base URL</span>
            <input
              value={cfg.streamBaseUrl || ''}
              onChange={(e) => update({ streamBaseUrl: e.target.value })}
              placeholder="https://radio.example.com:8080"
            />
          </label>
          <label className="ad-field">
            <span>Exact listen URL (optional)</span>
            <input
              value={cfg.listenUrl || ''}
              onChange={(e) => update({ listenUrl: e.target.value })}
              placeholder="https://radio.example.com:8080/listen/lumina_voice/live"
            />
          </label>
          {cfg.provider === 'azuracast' ? (
            <label className="ad-field">
              <span>Station shortcode</span>
              <input value={cfg.shortcode} onChange={(e) => update({ shortcode: e.target.value })} placeholder="lumina" />
            </label>
          ) : (
            <label className="ad-field">
              <span>Mount</span>
              <input value={cfg.mount} onChange={(e) => update({ mount: e.target.value })} placeholder="/stream" />
            </label>
          )}
          {cfg.provider === 'azuracast' ? (
            <>
              <label className="ad-field">
                <span>Station ID (admin API, optional)</span>
                <input value={cfg.stationId} onChange={(e) => update({ stationId: e.target.value })} placeholder="1" />
              </label>
              <label className="ad-field">
                <span>API key (optional)</span>
                <input
                  type="password"
                  value={cfg.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value })}
                  placeholder="Only for private stations"
                />
              </label>
            </>
          ) : null}
          <label className="ad-field">
            <span>Custom mount override (optional)</span>
            <input value={cfg.mount} onChange={(e) => update({ mount: e.target.value })} placeholder="/radio.opus" />
          </label>
        </div>

        <label className="ad-field" style={{ marginTop: 14 }}>
          <span>Auto-refresh now-playing</span>
          <button className={`toggle ${cfg.autoRefresh ? 'on' : ''}`} onClick={() => update({ autoRefresh: !cfg.autoRefresh })} aria-label="Auto refresh">
            <i />
          </button>
        </label>

        {issues.length ? (
          <div className="url-check bad" style={{ marginTop: 14 }}>
            {issues.map((i) => (
              <div key={i}>{i}</div>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => persist(cfg)} disabled={issues.length > 0}>
            {saved ? 'Saved ✓' : 'Save connection'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setTesting(true)
              persist(cfg)
              setTimeout(() => setTesting(false), 900)
            }}
            disabled={issues.length > 0}
          >
            {testing ? 'Testing…' : 'Save & test'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setCfg({ ...defaultStreamConfig })
              saveStreamConfig({ ...defaultStreamConfig })
            }}
          >
            Disconnect
          </button>
          {cfg.baseUrl ? (
            <a className="btn btn-ghost" href={cfg.baseUrl} target="_blank" rel="noreferrer noopener">
              Open station dashboard ↗
            </a>
          ) : null}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Launch readiness</h2>
          <button className="btn btn-ghost" onClick={() => { persist(cfg); setTesting(true); setTimeout(() => setTesting(false), 900) }} disabled={issues.length > 0 || testing}>
            {testing ? 'Checking\u2026' : 'Re-check'}
          </button>
        </div>
        <div className="check-list">
          {checks.map((c) => (
            <div className={`check-row ${c.state}`} key={c.id}>
              <span className="check-icon" aria-hidden="true">{c.state === 'ok' ? '\u2713' : c.state === 'fail' ? '!' : c.state === 'wait' ? '\u2026' : '\u25CB'}</span>
              <div className="check-main">
                <div className="check-label">{c.label}</div>
                <div className="check-detail">{c.detail}</div>
              </div>
              <span className="check-state">{STATE_LABEL[c.state]}</span>
            </div>
          ))}
        </div>
        <p className="meta" style={{ marginBottom: 0, marginTop: 12 }}>
          Embed player URL: <code>{embedUrl}</code>
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Now playing</h2>
          {updatedAt ? <span className="meta">updated {new Date(updatedAt).toLocaleTimeString()}</span> : null}
        </div>

        {!cfg.enabled ? (
          <p className="meta" style={{ margin: 0 }}>
            Add a station URL above to pull its live now-playing metadata. Until then the built-in AI broadcast engine drives
            the Radio page.
          </p>
        ) : error ? (
          <div className="stream-error">
            <strong>{error.reason}</strong>
            {error.hint ? <p>{error.hint}</p> : null}
          </div>
        ) : data ? (
          <div className="np-grid">
            <div className="np-art">{data.art ? <img src={data.art} alt="" /> : <IcoWave />}</div>
            <div className="np-main">
              <div className="kicker">
                {data.isLive ? 'ON AIR · LIVE' : 'ON AIR'} · {providerLabel(data.provider)}
              </div>
              <h3 className="display">{data.title}</h3>
              {data.artist ? <p className="meta" style={{ margin: '2px 0 0' }}>{data.artist}{data.album ? ` · ${data.album}` : ''}</p> : null}
              <div className="np-stats">
                <span><b>{data.listeners.toLocaleString()}</b> listeners</span>
                {data.liveName ? <span>host: <b>{data.liveName}</b></span> : null}
                {data.elapsed != null ? <span><b>{data.elapsed}s</b> into track</span> : null}
                <span className="meta">{data.station}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="meta" style={{ margin: 0 }}>Contacting the station…</p>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Listener mounts</h2>
          <span className="meta">Direct URLs · browser connects to the station, not to Lumina</span>
        </div>
        {mounts.length ? (
          <div className="mount-list">
            {mounts.map((m) => (
              <div className="mount-row" key={m.id}>
                <span className={`tag ${m.recommended ? 'live' : ''}`}>{m.codec}</span>
                <div className="mount-main">
                  <div className="mount-label">{m.label}{m.recommended ? ' · recommended' : ''}</div>
                  <code className="mount-url">{m.url}</code>
                </div>
                <button className="btn btn-ghost" onClick={() => playMount(m)}>
                  {now?.src === m.url && playing ? 'Pause' : 'Test play'}
                </button>
                <button className="btn btn-ghost" onClick={() => copy(m.url, m.id)}>
                  {copied === m.id ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="meta" style={{ margin: 0 }}>Save a station URL to generate its mount links.</p>
        )}
        {now?.kind === 'stream' ? (
          <p className="meta" style={{ marginBottom: 0, marginTop: 12 }}>
            Player is on the external stream: <code>{now.src}</code>
          </p>
        ) : null}
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Embed generator</h2>
          <span className="meta">Paste the master stream into any website</span>
        </div>

        <div className="admin-tabs" style={{ marginBottom: 12 }}>
          {TABS.map((t) => (
            <button key={t.id} className={`admin-tab ${snippetTab === t.id ? 'active' : ''}`} onClick={() => setSnippetTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <pre className="code-block embed-block">{snippetForTab()}</pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => copy(snippetForTab(), 'snippet')}>
            {copied === 'snippet' ? 'Copied ✓' : 'Copy snippet'}
          </button>
          <span className="meta" style={{ alignSelf: 'center' }}>
            Now-playing endpoint: <code>{snippets.nowPlayingUrl}</code>
          </span>
        </div>

        <div className="embed-notes">
          <IcoInfo />
          <div>
            <p>
              <strong>iframes</strong> need the host app to allow framing. The snippet points at this app&apos;s
              <code> /radio?embed=1</code> route — add it as a compact player in a CMS or blog.
            </p>
            <p>
              <strong>CORS:</strong> browsers can only read <code>nowplaying</code> / <code>status-json.xsl</code> when the
              station allows your origin. AzuraCast: Administration → System Settings → API Access, then whitelist the origin
              or enable public API. Icecast: add <code>Access-Control-Allow-Origin</code> to the status JSON.
            </p>
            <p>
              <strong>No proxying:</strong> Lumina never relays the stream. Listeners connect directly to the station, so the
              station&apos;s bandwidth and uptime rules apply.
            </p>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16, background: 'rgba(255,255,255,0.02)' }}>
          <div className="row-title" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: 16 }}>Recommended AzuraCast setup</h2>
          </div>
          <div className="setup-steps">
            <div><b>1</b> Install AzuraCast on a small VPS (Docker Compose, ~$5/mo).</div>
            <div><b>2</b> Create the station, set AutoDJ to loop the Lumina rotation, enable the Opus mount at 48 kbps.</div>
            <div><b>3</b> Copy the station shortcode and public URL into this form.</div>
            <div><b>4</b> Paste the generated widget into your site; the app keeps its own simulated schedule for the Studio.</div>
          </div>
          <p className="meta" style={{ marginBottom: 0, marginTop: 12 }}>
            One station can serve the mobile app, the web player, and any embed simultaneously — the stream is shared.
          </p>
        </div>
      </div>
    </>
  )
}
