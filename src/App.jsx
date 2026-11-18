import { lazy, Suspense } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './state/AppState.jsx'
import { ArtworkProvider, useArtwork } from './state/Artwork.jsx'
import { CatalogProvider, useCatalog } from './state/Catalog.jsx'
import { BroadcastProvider } from './state/Broadcast.jsx'
import { BrandMark, CoverArt, RadioLogo } from './art/covers'
import { IcoCloud, IcoGear, IcoHome, IcoHistory, IcoLib, IcoPause, IcoPlay, IcoRadio, IcoSearch, IcoStudio } from './ui/Icons'
const Auth = lazy(() => import('./pages/Auth'))
const Home = lazy(() => import('./pages/Home'))
const Explore = lazy(() => import('./pages/Explore'))
const Genre = lazy(() => import('./pages/Genre'))
const Search = lazy(() => import('./pages/Search'))
const Title = lazy(() => import('./pages/Title'))
const Series = lazy(() => import('./pages/Series'))
const Person = lazy(() => import('./pages/Person'))
const Radio = lazy(() => import('./pages/Radio'))
const NowPlaying = lazy(() => import('./pages/NowPlaying'))
const Library = lazy(() => import('./pages/Library'))
const History = lazy(() => import('./pages/History'))
const Settings = lazy(() => import('./pages/Settings'))
const Kind = lazy(() => import('./pages/Kind'))
const Admin = lazy(() => import('./pages/Admin'))
const DeviceAdmin = lazy(() => import('./pages/DeviceAdmin'))
const DataTransfer = lazy(() => import('./pages/DataTransfer'))
const Site = lazy(() => import('./pages/Site'))
import ErrorBoundary from './ui/ErrorBoundary'
import { RADIO_ENABLED } from './config/features.js'

function Guard({ children }) {
  const { user } = useApp()
  const loc = useLocation()
  // Logged-out visitors land on the public website; sign-in continues into the app.
  if (!user && loc.pathname !== '/settings' && loc.pathname !== '/site') return <Navigate to="/site" replace />
  return children
}

function MiniBar() {
  const { now, playing, togglePlay } = useApp()
  const { coverFor } = useArtwork()
  const { getTitle } = useCatalog()
  const nav = useNavigate()
  const loc = useLocation()
  if (!now || loc.pathname === '/now') return null
  const title = now.titleId ? getTitle(now.titleId) : null
  return (
    <div className="mini">
      <button onClick={() => nav('/now')} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div className="thumb" style={{ borderRadius: now.kind === 'radio' || now.kind === 'stream' ? '50%' : 10 }}>
          {now.kind === 'radio' || now.kind === 'stream' ? <RadioLogo /> : <CoverArt id={now.cover} src={coverFor(title || now.titleId)} t={title} className="cover-art" />}
        </div>
        <div className="info">
          <div className="t">{now.name}</div>
          <div className="s">{now.sub}</div>
        </div>
      </button>
      <button className="mini-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <IcoPause /> : <IcoPlay />}
      </button>
    </div>
  )
}

function PageFallback() {
  return <div className="empty"><h3>Loading…</h3></div>
}

const tabs = [
  { to: '/', icon: <IcoHome />, label: 'Home', end: true },
  { to: '/search', icon: <IcoSearch />, label: 'Search' },
  { to: '/library', icon: <IcoLib />, label: 'Library' },
  { to: '/history', icon: <IcoHistory />, label: 'History' },
  ...(RADIO_ENABLED ? [{ to: '/radio', icon: <IcoRadio />, label: 'Radio' }] : [])
]

function Shell() {
  const { isAdmin, offline, canInstall } = useApp()
  return (
    <div className="app">
      {offline ? (
        <div className="offline-banner" role="status">
          <IcoCloud off /> Offline — downloaded titles play as normal.
        </div>
      ) : null}
      <aside className="sidebar">
        <div className="brand" title="Lumina Voice">
          <BrandMark />
        </div>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`} title={t.label}>
            {t.icon}
          </NavLink>
        ))}
        {isAdmin ? (
          <NavLink to="/admin" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`} title="Device Admin">
            <IcoStudio />
          </NavLink>
        ) : null}
        <div className="nav-spacer" />
        <NavLink to="/settings" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`} title="Settings">
          <IcoGear />
          {canInstall ? <span className="dot-badge" /> : null}
        </NavLink>
      </aside>
      <div className="main">
        <div className="scroll">
          <Outlet />
        </div>
        <MiniBar />
        <nav className="bottom-nav">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
              {t.icon}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink to="/admin" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`} title="Device Admin">
              <IcoStudio />
            </NavLink>
          ) : null}
          <NavLink to="/settings" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            <IcoGear />
          </NavLink>
        </nav>
      </div>
    </div>
  )
}

function RoutesRoot() {
  const loc = useLocation()
  const embed = RADIO_ENABLED && loc.pathname === '/radio' && new URLSearchParams(loc.search).get('embed') === '1'

  if (embed) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/radio" element={<Radio />} />
          <Route path="*" element={<Navigate to="/radio?embed=1" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/site" element={<Site />} />
      <Route
        path="/"
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      >
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="genre/:name" element={<Genre />} />
        <Route path="kind/:name" element={<Kind />} />
        <Route path="search" element={<Search />} />
        <Route path="title/:id" element={<Title />} />
        <Route path="series/:id" element={<Series />} />
        <Route path="person/:id" element={<Person />} />
        <Route path="radio" element={RADIO_ENABLED ? <Radio /> : <Navigate to="/" replace />} />
        <Route path="now" element={<NowPlaying />} />
        <Route path="library" element={<Library />} />
        <Route path="history" element={<History />} />
        <Route
          path="transfer"
          element={
            <ErrorBoundary>
              <DataTransfer defaultIncludeAudio />
            </ErrorBoundary>
          }
        />
        <Route
          path="settings"
          element={
            <ErrorBoundary>
              <Settings />
            </ErrorBoundary>
          }
        />
        <Route path="admin" element={RADIO_ENABLED ? <Admin /> : <DeviceAdmin />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <CatalogProvider>
      <AppProvider>
        <ArtworkProvider>
          <BroadcastProvider>
            <RoutesRoot />
          </BroadcastProvider>
        </ArtworkProvider>
      </AppProvider>
    </CatalogProvider>
  )
}
