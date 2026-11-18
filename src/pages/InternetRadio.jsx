import { useState } from 'react'
import { RADIO_STREAM_URL, AZURACAST_API_URL, hasRadioStream, hasAzuraCast } from '../config/radio'
import { getNowPlaying } from '../api/azuracast'

export default function InternetRadio() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const test = async () => {
    setLoading(true)
    setErr('')
    try {
      if (hasAzuraCast()) {
        const s = await getNowPlaying('2')
        setStatus(s)
      } else {
        setStatus({ note: 'No AzuraCast API configured. Using stream URL only.' })
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="panel-head">
        <div>
          <h2>Internet Radio (Al Asar Jadeed)</h2>
          <p className="meta">Link-based 24/7 radio. Store only URLs + metadata. No permanent audio files.</p>
        </div>
        <button className="btn" onClick={test} disabled={loading}>{loading ? 'Testing...' : 'Test connection'}</button>
      </div>

      <div className="grid two">
        <div className="card">
          <h3>Stream</h3>
          <p className="meta">VITE_RADIO_STREAM_URL</p>
          <code style={{ wordBreak: 'break-all' }}>{RADIO_STREAM_URL || '(not set)'}</code>
          <p className="meta" style={{ marginTop: 10 }}>{hasRadioStream() ? 'Configured' : 'Missing'}</p>
        </div>
        <div className="card">
          <h3>AzuraCast API</h3>
          <p className="meta">VITE_AZURACAST_API_URL / VITE_AZURACAST_API_KEY</p>
          <code style={{ wordBreak: 'break-all' }}>{AZURACAST_API_URL || '(not set)'}</code>
          <p className="meta" style={{ marginTop: 10 }}>{hasAzuraCast() ? 'Configured' : 'Not configured'}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Approved Sources (link-only)</h3>
        <p className="meta">Add direct audio streams or licensed sources. YouTube links are not recommended for 24/7 rebroadcast.</p>
        <div className="form-row" style={{ marginTop: 12 }}>
          <input className="search-input" placeholder="Title (e.g. Morning Programme)" />
          <input className="search-input" placeholder="Source URL (direct .mp3/.m4a/.aac/.opus)" />
          <select className="select">
            <option>direct_stream</option>
            <option>live_stream</option>
          </select>
          <select className="select">
            <option>Urdu</option>
            <option>Arabic</option>
            <option>English</option>
          </select>
          <button className="btn">Add source (metadata only)</button>
        </div>
        <p className="meta" style={{ marginTop: 10 }}>Only URL + metadata stored. No file upload.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Scheduler</h3>
        <p className="meta">Manage programme times. When connected to AzuraCast, use its API to push schedules. Current UI uses local schedule; sync coming next.</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Connection Status</h3>
        {err ? <p className="meta" style={{ color: 'var(--red)' }}>{err}</p> : null}
        {status ? <pre style={{ overflow: 'auto', fontSize: 12 }}>{JSON.stringify(status, null, 2)}</pre> : <p className="meta">Click "Test connection" to check AzuraCast.</p>}
      </div>
    </div>
  )
}
