import { useState } from 'react'
import { applyBundle, bundleSummary, exportBundle, parseBundle } from '../data/syncBundle'
import { pickBundleFile, saveBundleFile } from '../platform/fileTransfer'

export default function DataTransfer({ defaultIncludeAudio = false } = {}) {
  const [includeAudio, setIncludeAudio] = useState(defaultIncludeAudio)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [paste, setPaste] = useState('')
  const [preview, setPreview] = useState(null)
  const [pending, setPending] = useState('')

  const clear = () => { setStatus(''); setError('') }

  const doExport = async () => {
    clear(); setBusy(true)
    try {
      const bundle = await exportBundle({ includeAudio })
      const name = `lumina-voice-${new Date().toISOString().slice(0, 10)}.json`
      const where = await saveBundleFile(name, JSON.stringify(bundle))
      setStatus(`Saved ${name} (${bundleSummary(bundle).keys} settings${includeAudio ? `, ${bundle.audio.length} audio files` : ''}) to ${where}.`)
    } catch (e) {
      setError(e.message || 'Could not export the backup.')
    } finally { setBusy(false) }
  }

  const prepare = (text) => {
    clear(); setPending('')
    try {
      const summary = bundleSummary(parseBundle(text))
      setPreview(summary)
      setPending(text)
    } catch (e) {
      setPreview(null)
      setError(e.message || 'Could not read that backup.')
    }
  }

  const chooseFile = async () => {
    clear(); setBusy(true)
    try {
      const text = await pickBundleFile()
      if (text) prepare(text)
    } catch (e) {
      setError(e.message || 'Could not read that file.')
    } finally { setBusy(false) }
  }

  const doImport = async () => {
    if (!pending) return
    clear(); setBusy(true)
    try {
      const result = await applyBundle(pending)
      setStatus(`Restored ${result.keys} settings, ${result.library} library titles and ${result.audioImported} audio files. Reloading…`)
      setTimeout(() => window.location.reload(), 700)
    } catch (e) {
      setError(e.message || 'Could not restore that backup.')
      setBusy(false)
    }
  }

  return (
    <div className="data-transfer">
      <div className="panel-head">
        <div>
          <h2 className="display">Data transfer</h2>
          <p className="meta" style={{ margin: 0 }}>
            Move dashboard content to the Android app without a server or an account.
          </p>
        </div>
      </div>

      <div className="dt-grid">
        <section className="panel dt-card">
          <h3>Export from this device</h3>
          <p className="meta">Saves titles, edits, artwork, website copy, subtitles, listening history, playback prefs and library progress as one JSON file. Signed-in user and radio state stay on the device.</p>
          <label className="dt-check">
            <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} />
            Include imported audio files (larger backup)
          </label>
          <button className="btn btn-primary" onClick={doExport} disabled={busy}>{busy ? 'Working…' : 'Export backup'}</button>
        </section>

        <section className="panel dt-card">
          <h3>Import on this device</h3>
          <p className="meta">Restoring replaces the matching settings on this device. Your signed-in user and radio settings are never copied.</p>
          <button className="btn btn-ghost" onClick={chooseFile} disabled={busy}>Choose backup file</button>
          <textarea
            className="dt-paste"
            value={paste}
            onChange={(e) => { setPaste(e.target.value); setPreview(null); setPending('') }}
            placeholder="Or paste the JSON backup here…"
            aria-label="Backup JSON"
          />
          <button className="btn btn-ghost" onClick={() => prepare(paste)} disabled={!paste.trim() || busy}>Check pasted backup</button>
          {preview ? (
            <div className="dt-preview">
              Ready: {preview.keys} settings · {preview.library} library titles · {preview.audio} audio files.
              <button className="btn btn-primary" onClick={doImport} disabled={busy}>Replace and reload</button>
            </div>
          ) : null}
        </section>
      </div>
      {status ? <div className="info-note">{status}</div> : null}
      {error ? <div className="err">{error}</div> : null}
    </div>
  )
}
