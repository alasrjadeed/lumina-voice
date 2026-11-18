import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../state/Catalog.jsx'
import { loadSiteConfig, saveSiteConfig } from '../data/site'

// Admin → Website: controls the public marketing site (/site). Same browser,
// same profile — edits here show on the site immediately after save.
export default function WebsiteAdmin() {
  const { titles } = useCatalog()
  const [cfg, setCfg] = useState(() => loadSiteConfig())
  const [saved, setSaved] = useState(false)

  const fields = [
    ['announcement', 'Announcement strip', 'Short line shown above the hero.'],
    ['heroKicker', 'Hero kicker', 'Small gold label above the headline.'],
    ['heroTitle', 'Hero headline', 'The big promise of the library.'],
    ['heroSub', 'Hero subtitle', 'One or two sentences under the headline.'],
    ['showsTitle', 'Shows section title', 'Heading for the featured-shows grid.'],
    ['aboutTitle', 'About headline', 'Section title on the about block.'],
    ['aboutBody', 'About body', 'What the library is; mention the studio and the bot.'],
    ['footerNote', 'Footer line', 'Copyright / location line.']
  ]

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }))

  const save = () => {
    saveSiteConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const reset = () => {
    localStorage.removeItem('lumina-site-config')
    setCfg(loadSiteConfig())
  }

  const previewFeatured = useMemo(() => titles.filter((t) => !t.imported).slice(0, 6), [titles])

  return (
    <>
      <div className="panel-head">
        <div>
          <h2 className="display">Website</h2>
          <p className="meta" style={{ margin: 0 }}>
            The public site at <code>/site</code> — no login needed to browse. Same profile signs into site, app and
            studio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/site" className="btn btn-ghost" target="_blank" rel="noreferrer">Open site ↗</Link>
          <button className="btn btn-primary" onClick={save}>{saved ? 'Saved ✓' : 'Save changes'}</button>
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Content</h2>
          <button className="btn btn-ghost" onClick={reset}>Restore defaults</button>
        </div>
        {fields.map(([k, label, hint]) => (
          <label className="field" key={k}>
            <span>{label} — <span className="meta">{hint}</span></span>
            {k === 'aboutBody' || k === 'heroSub' ? (
              <textarea className="search-input" rows={3} value={cfg[k]} onChange={(e) => set(k, e.target.value)} />
            ) : (
              <input className="search-input" value={cfg[k]} onChange={(e) => set(k, e.target.value)} />
            )}
          </label>
        ))}
        <div className="stream-quality" role="group" aria-label="Site sections" style={{ marginTop: 12 }}>
          <button
            className={`quality-pill ${cfg.showFeatured ? 'active' : ''}`}
            onClick={() => set('showFeatured', !cfg.showFeatured)}
          >
            Featured shows {cfg.showFeatured ? 'on' : 'off'}
          </button>
          <button
            className={`quality-pill ${cfg.showLiveStrip ? 'active' : ''}`}
            onClick={() => set('showLiveStrip', !cfg.showLiveStrip)}
          >
            Live strip {cfg.showLiveStrip ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="row-title" style={{ marginTop: 0 }}>
          <h2>Featured on the site</h2>
          <span className="meta">first {previewFeatured.length} titles, same catalog the app shows</span>
        </div>
        <div className="site-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
          {previewFeatured.map((t) => (
            <div className="site-card" key={t.id}>
              <div className="site-card-t">{t.name}</div>
              <div className="meta">{t.kind}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
