import { useMemo, useState } from 'react'
import { titles } from '../data/catalog'
import { useCatalog } from '../state/Catalog.jsx'
import {
  SUBTITLE_LANGS,
  allTracks,
  langMeta,
  loadTrack,
  parseSubtitle,
  removeTrack,
  saveTrack,
  toSrt
} from '../data/subtitles'
import { translateCues } from '../ai/subtitleTranslate'
import { IcoTrash, IcoInfo } from '../ui/Icons'

const SAMPLE = `1
00:00:01,000 --> 00:00:04,000
Paste or drop an .srt / .vtt file here, or type cues in this box.

2
00:00:04,500 --> 00:00:08,000
Arabic, English and Urdu are ready — pick the language above.`

// Studio authoring for subtitle tracks. Tracks are stored on this device
// (data/subtitles.js) so the player works offline; the translation button
// routes through the free AI pipeline and is always marked machine-made.
export default function SubtitleStudio() {
  const { getTitle } = useCatalog()
  const [titleId, setTitleId] = useState('')
  const [lang, setLang] = useState('ur')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [tick, setTick] = useState(0)

  const all = useMemo(() => allTracks(), [tick])
  const options = useMemo(() => {
    const imported = titles.map((t) => ({ id: t.id, name: t.name }))
    const extra = Object.keys(all)
      .filter((id) => !titles.some((t) => t.id === id))
      .map((id) => ({ id, name: getTitle(id)?.name || id }))
    return [...extra, ...imported]
  }, [all, getTitle])

  const parsed = useMemo(() => parseSubtitle(text), [text])
  const existing = titleId ? loadTrack(titleId, lang) : null

  const refresh = () => setTick((t) => t + 1)

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const body = await f.text()
    setText(body)
    setNote(`Loaded ${f.name} — ${parseSubtitle(body).length} cues detected.`)
    e.target.value = ''
  }

  const save = () => {
    setErr('')
    if (!titleId) {
      setErr('Pick a title first.')
      return
    }
    const cues = parseSubtitle(text)
    if (!cues.length) {
      setErr('No valid cues found. Check the timings (00:00:01,000 --> 00:00:04,000).')
      return
    }
    saveTrack(titleId, lang, cues, 'manual')
    setNote(`Saved ${cues.length} cues in ${langMeta(lang).label}.`)
    refresh()
  }

  const translate = async () => {
    setErr('')
    setNote('')
    const cues = parseSubtitle(text)
    if (!titleId || !cues.length) {
      setErr('Add the source cues before translating.')
      return
    }
    const meta = langMeta(lang)
    setBusy(true)
    const res = await translateCues(cues, lang, meta.label)
    if (!res.cues.length || !res.translated) {
      setErr('No translation provider responded. Add a free AI key in Settings → Lumina Bot, then retry.')
      setBusy(false)
      return
    }
    saveTrack(titleId, lang, res.cues, 'machine')
    setText(toSrt(res.cues))
    setNote(
      `Machine-translated ${res.translated} cue${res.translated === 1 ? '' : 's'} to ${meta.label}` +
        `${res.failed ? ` (${res.failed} kept in the original language)` : ''} via ${res.provider}. Review before publishing.`
    )
    setBusy(false)
    refresh()
  }

  const loadExisting = () => {
    const track = titleId ? loadTrack(titleId, lang) : null
    if (!track) {
      setErr(`No ${langMeta(lang).label} track saved for this title.`)
      return
    }
    setText(toSrt(track.cues))
    setNote(`Loaded the saved ${langMeta(lang).label} track (${track.cues.length} cues, ${track.source}).`)
    setErr('')
  }

  const drop = () => {
    if (!titleId) return
    removeTrack(titleId, lang)
    setText('')
    setNote(`Removed the ${langMeta(lang).label} track.`)
    setErr('')
    refresh()
  }

  return (
    <>
      <div className="row-title">
        <h2>Subtitles</h2>
        <span className="meta">Arabic · English · Urdu — add more in src/data/subtitles.js</span>
      </div>

      <div className="sub-studio">
        <div className="sub-controls">
          <label>
            <span>Title</span>
            <select value={titleId} onChange={(e) => { setTitleId(e.target.value); setNote(''); setErr('') }}>
              <option value="">Pick a title…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Language</span>
            <select value={lang} onChange={(e) => { setLang(e.target.value); setNote(''); setErr('') }}>
              {SUBTITLE_LANGS.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.label})</option>
              ))}
            </select>
          </label>
          <label className="sub-file">
            <span>Import file</span>
            <input type="file" accept=".srt,.vtt,text/vtt,text/plain" onChange={onFile} />
          </label>
        </div>

        <label className="sr-only" htmlFor="sub-text">Subtitle cues (SRT or WebVTT)</label>
        <textarea
          id="sub-text"
          className="rev-input sub-textarea"
          rows={10}
          placeholder={SAMPLE}
          value={text}
          onChange={(e) => { setText(e.target.value); setNote(''); setErr('') }}
          dir={langMeta(lang).dir}
        />

        <div className="sub-foot">
          <span className="meta">
            {parsed.length} cue{parsed.length === 1 ? '' : 's'} detected
            {existing ? ` · saved track: ${existing.cues.length} (${existing.source})` : ''}
          </span>
          <div className="sub-actions">
            <button className="btn btn-ghost btn-sm" onClick={loadExisting} disabled={!titleId}>Load saved</button>
            <button className="btn btn-ghost btn-sm" onClick={drop} disabled={!titleId || !existing}>Remove</button>
            <button className="btn btn-ghost btn-sm" onClick={translate} disabled={busy || !titleId}>
              {busy ? 'Translating…' : `Translate to ${langMeta(lang).label}`}
            </button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!titleId || !parsed.length}>Save track</button>
          </div>
        </div>

        {err ? <p className="meta" style={{ color: 'var(--danger)' }}>{err}</p> : null}
        {note ? <p className="meta rev-note">{note}</p> : null}
        <p className="meta sub-hint">
          <IcoInfo /> Timings are never changed by translation — only the cue text. Machine output is labelled and
          should be reviewed before publishing, especially for Qur'anic or literary material.
        </p>
      </div>

      {Object.keys(all).length ? (
        <>
          <div className="row-title">
            <h2>Saved tracks</h2>
            <span className="meta">on this device</span>
          </div>
          <div className="mod-list">
            {Object.entries(all).flatMap(([tid, langs]) =>
              Object.entries(langs).map(([code, track]) => (
                <div className="mod-row" key={`${tid}-${code}`}>
                  <div className="mod-main">
                    <div className="mod-head">
                      <strong>{getTitle(tid)?.name || tid}</strong>
                      <span className="chip">{langMeta(code).label}</span>
                      <span className="meta">{track.cues.length} cues · {track.source}</span>
                    </div>
                    <div className="story-sub">{track.cues[0]?.text?.slice(0, 90) || '—'}</div>
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Remove ${langMeta(code).label} track`}
                    onClick={() => { removeTrack(tid, code); refresh() }}
                  >
                    <IcoTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </>
  )
}
