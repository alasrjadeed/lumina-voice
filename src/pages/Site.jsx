import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../state/AppState.jsx'
import { useCatalog } from '../state/Catalog.jsx'
import { useBroadcast } from '../state/Broadcast.jsx'
import { CoverArt, BrandMark, RadioLogo } from '../art/covers'
import { loadSiteConfig } from '../data/site'
import { hhmm } from '../data/broadcast'
import { RADIO_ENABLED } from '../config/features.js'

// Public website (/site) — no login required. Same auth store as the app, so
// one profile opens both. Content comes from the site config, so edits appear
// here live.
export default function Site() {
  const { user } = useApp()
  const { titles } = useCatalog()
  const b = useBroadcast()
  const cfg = useMemo(() => loadSiteConfig(), [])

  const featured = useMemo(() => titles.filter((t) => !t.imported).slice(0, 6), [titles])

  return (
    <div className="site-page">
      <header className="site-header">
        <div className="brand" title="Lumina Voice">
          <BrandMark />
        </div>
        <nav className="site-nav" aria-label="Site">
          <a href="#shows">Shows</a>
          <a href="#about">About</a>
          {RADIO_ENABLED ? <Link to="/radio?embed=1">Live radio</Link> : null}
        </nav>
        <div className="site-auth">
          {user ? (
            <>
              <span className="site-profile" title="Same profile in the app">
                <span className="site-avatar">{(user.name || 'L').slice(0, 1).toUpperCase()}</span>
                {user.name}
                {RADIO_ENABLED && user.role === 'admin' ? <span className="tag live">studio</span> : null}
              </span>
              <Link to="/" className="btn btn-primary">Open app</Link>
              {RADIO_ENABLED && user.role === 'admin' ? <Link to="/admin" className="btn btn-ghost">Studio</Link> : null}
            </>
          ) : (
            <>
              <Link to="/auth" className="btn btn-ghost">Sign in</Link>
              <Link to="/auth" className="btn btn-primary">Listen now</Link>
            </>
          )}
        </div>
      </header>

      {cfg.showLiveStrip && b.live && RADIO_ENABLED ? (
        <div className="site-live" role="status">
          <span className="dotpulse" /> LIVE · {b.item?.name || 'Sada Bahar radio'} · {b.listeners.toLocaleString()} listening · desk: {b.ownerNow.toUpperCase()}
        </div>
      ) : null}

      <section className="site-hero">
        <p className="kicker">{cfg.heroKicker}</p>
        <h1>{cfg.heroTitle}</h1>
        <p className="site-sub">{cfg.heroSub}</p>
        <div className="site-cta">
          <Link to="/auth" className="btn btn-primary">Start listening — free</Link>
          {RADIO_ENABLED ? <Link to="/radio?embed=1" className="btn btn-ghost">Live radio player</Link> : null}
        </div>
        <div className="site-hero-art">
          {RADIO_ENABLED && b.live ? <RadioLogo /> : <CoverArt id="aurora" src="" className="cover-art" />}
        </div>
      </section>

      <section className="site-strip" aria-label="Audio quality">
        {RADIO_ENABLED && b.daypart ? (
          <span>Daypart · {b.daypart.name} ({hhmm(b.daypart.start)}–{hhmm(b.daypart.end)})</span>
        ) : null}
        <span>Opus 24–48 kbps mono</span>
        <span>Works offline · installable</span>
        <span>Web · mobile · offline — one profile</span>
      </section>

      {cfg.showFeatured && featured.length ? (
        <section className="site-section" id="shows">
          <div className="section-head">
            <h2>{cfg.showsTitle}</h2>
          </div>
          <div className="site-grid">
            {featured.map((t) => (
              <Link to={`/title/${t.id}`} key={t.id} className="site-card">
                <div className="site-card-art">
                  <CoverArt id={t.cover} src="" t={t} className="cover-art" />
                </div>
                <div className="site-card-t">{t.name}</div>
                <div className="meta">{t.kind} · {t.episodes?.length || 0} parts</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="site-section" id="about">
        <div className="section-head">
          <h2>{cfg.aboutTitle}</h2>
        </div>
        <p className="site-about">{cfg.aboutBody}</p>
        <div className="site-auth" style={{ marginTop: 18 }}>
          <Link to="/auth" className="btn btn-primary">{user ? 'Open the app' : 'Create your profile'}</Link>
          {RADIO_ENABLED && user?.role === 'admin' ? <Link to="/admin" className="btn btn-ghost">Open Broadcast Studio</Link> : null}
        </div>
      </section>

      <footer className="site-footer">{cfg.footerNote}</footer>
    </div>
  )
}
