export const IcoHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
  </svg>
)
export const IcoSearch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
)
export const IcoLib = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 4h12v16H6z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
)
export const IcoRadio = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M7 8 17 4" />
    <circle cx="9" cy="14" r="2" />
    <path d="M14 12h4M14 16h4" />
  </svg>
)
export const IcoGear = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.7 1 1.2 1.7 1.2H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
export const IcoPlay = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l12-7z" />
  </svg>
)
export const IcoPause = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
)
export const IcoBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 6 9 12l6 6" />
  </svg>
)
export const IcoLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)
export const IcoInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v7M12 7h.01" />
  </svg>
)
export const IcoHeart = ({ on }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
  </svg>
)
export const IcoDown = ({ on }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14" stroke={on ? '#e4c36a' : 'currentColor'} />
  </svg>
)
export const IcoSkip = ({ dir = 1 }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ transform: dir < 0 ? 'scaleX(-1)' : undefined }}>
    <path d="M5 5v14l10-7z" />
    <rect x="17" y="5" width="2.4" height="14" rx="1" />
  </svg>
)
export const IcoStudio = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M8 20v-3M16 20v-3M6 20h12" />
    <path d="M8 9v4M12 8v6M16 10v3" strokeLinecap="round" />
  </svg>
)
export const IcoBolt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M13 3 5 13h5l-1 8 8-10h-5z" strokeLinejoin="round" />
  </svg>
)
export const IcoClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinecap="round" />
  </svg>
)
export const IcoHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 6v6l4 2" strokeLinecap="round" />
  </svg>
)
export const IcoDelete = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" />
  </svg>
)
export const IcoTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" />
  </svg>
)
// Star — `on` fills it (gold), default is a hollow outline.
export const IcoStar = ({ on = false }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill={on ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" />
  </svg>
)
export const IcoPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IcoWave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M3 12h2l2-6 3 14 3-18 3 16 2-6h3" />
  </svg>
)
export const IcoMegaphone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
    <path d="M18.5 7a7 7 0 0 1 0 10" />
  </svg>
)
export const IcoGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
)
export const IcoCloud = ({ off }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 9.2 3.5 3.5 0 0 1 17.5 18z" />
    {off ? <path d="M4 4l16 16" /> : <path d="M12 12v4m-2-2 2 2 2-2" />}
  </svg>
)
export const IcoGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7 12.9 19.6C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.7 7.4l6.3 5.3C38.3 37.3 44 31.5 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
)

// ---------- Studio section icons ----------
// One per Admin tab. Same 24px grid, 1.8 stroke and `currentColor` as the rest
// of the set, so a tab icon inherits the tab's own colour and active state.
const S = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const IcoOverview = ({ size }) => (
  <S size={size}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>
)
export const IcoBot = ({ size }) => (
  <S size={size}><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1.2" /><path d="M9 13v1M15 13v1" /><path d="M2 12v4M22 12v4" /></S>
)
export const IcoWebsite = ({ size }) => (
  <S size={size}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></S>
)
export const IcoSchedule = ({ size }) => (
  <S size={size}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M8 14h3M8 17h6" /></S>
)
export const IcoAddContent = ({ size }) => (
  <S size={size}><path d="M12 5v14M5 12h14" /></S>
)
export const IcoContent = ({ size }) => (
  <S size={size}><path d="M5 3h9l5 5v13H5z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></S>
)
export const IcoSubtitles = ({ size }) => (
  <S size={size}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M6 10h4M12 10h6M6 14h6M14 14h4" /></S>
)
export const IcoFiles = ({ size }) => (
  <S size={size}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></S>
)
export const IcoArchive = ({ size }) => (
  <S size={size}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11h14V8M9 12h6M9 16h4" /></S>
)
export const IcoVoice = ({ size }) => (
  <S size={size}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3M8 21h8" /></S>
)
export const IcoAutomation = ({ size }) => (
  <S size={size}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></S>
)
export const IcoAdvertising = ({ size }) => (
  <S size={size}><path d="M4 10v4a1 1 0 0 0 1 1h2l4 3V6L7 9H5a1 1 0 0 0-1 1z" /><path d="M15 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></S>
)
export const IcoStream = ({ size }) => (
  <S size={size}><circle cx="12" cy="12" r="2.5" /><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9" /><path d="M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8" /></S>
)
export const IcoAnalytics = ({ size }) => (
  <S size={size}><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-3" /></S>
)
export const IcoStorage = ({ size }) => (
  <S size={size}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></S>
)
export const IcoLogs = ({ size }) => (
  <S size={size}><path d="M5 4h11l4 4v12H5z" /><path d="M8 9h5M8 13h7M8 17h4" /></S>
)

// ---------- Studio action icons ----------
export const IcoLink = ({ size = 16 }) => (
  <S size={size}><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></S>
)
export const IcoUpload = ({ size = 16 }) => (
  <S size={size}><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></S>
)
export const IcoFolder = ({ size = 16 }) => (
  <S size={size}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></S>
)
export const IcoSave = ({ size = 16 }) => (
  <S size={size}><path d="M5 3h11l3 3v15H5z" /><path d="M9 3v6h6V3" /><rect x="8" y="13" width="8" height="6" rx="1" /></S>
)
export const IcoUndo = ({ size = 16 }) => (
  <S size={size}><path d="M4 10h10a5 5 0 0 1 0 10H8" /><path d="m8 6-4 4 4 4" /></S>
)
export const IcoImage = ({ size = 16 }) => (
  <S size={size}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m4 18 5-5 4 4 3-3 4 4" /></S>
)
export const IcoEdit = ({ size = 16 }) => (
  <S size={size}><path d="M4 20h4L20 8l-4-4L4 16z" /><path d="m14 6 4 4" /></S>
)
export const IcoCheck = ({ size = 16 }) => (
  <S size={size}><path d="m5 13 4 4L19 7" /></S>
)
export const IcoX = ({ size = 16 }) => (
  <S size={size}><path d="M6 6l12 12M18 6 6 18" /></S>
)
export const IcoRefresh = ({ size = 16 }) => (
  <S size={size}><path d="M20 11a8 8 0 1 0-2 6" /><path d="M20 5v6h-6" /></S>
)
export const IcoSearchSmall = ({ size = 16 }) => (
  <S size={size}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>
)
export const IcoPlusSmall = ({ size = 16 }) => (
  <S size={size}><path d="M12 5v14M5 12h14" /></S>
)
export const IcoMore = ({ size = 16 }) => (
  <S size={size}><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" /></S>
)

// Quran Kareem. The same opening-plate mark as the cover art, on the shared
// 24px grid so it drops straight into tabs, pills and the catalogue selector.
export const IcoQuran = ({ size = 16 }) => (
  <S size={size}>
    <path d="M12 2.8c1.6 1.6 2.8 2.8 2.8 4 0 1.1-1.1 1.9-2.8 1.9S9.2 7.9 9.2 6.8c0-1.2 1.2-2.4 2.8-4z" />
    <path d="M12 8.7V11" />
    <path d="M6.6 21c0-3.4 1.2-5.7 4.2-7.9 1-.8 1.2-1.2 1.2-1.6 0 .4.2.8 1.2 1.6 3 2.2 4.2 4.5 4.2 7.9" />
    <path d="M4.6 21h14.8" />
    <path d="M9.4 17.6c1.1-.5 1.8-.7 2.6-.7s1.5.2 2.6.7" />
    <path d="M12 16.9V21" />
  </S>
)

// ---------- Player transport icons ----------
export const IcoShuffle = ({ size = 20 }) => (
  <S size={size}><path d="M17 4h4v4" /><path d="M3 20 21 4" /><path d="M17 20h4v-4" /><path d="m3 4 6 6" /><path d="m15 14 6 6" /></S>
)
export const IcoRepeat = ({ size = 20 }) => (
  <S size={size}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></S>
)
export const IcoRepeatOne = ({ size = 20 }) => (
  <S size={size}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /><path d="M11 15v-4l-2 1" /></S>
)
export const IcoVolume = ({ size = 18 }) => (
  <S size={size}><path d="M4 10v4a1 1 0 0 0 1 1h2l4 3V6L7 9H5a1 1 0 0 0-1 1z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" /></S>
)
export const IcoVolumeOff = ({ size = 18 }) => (
  <S size={size}><path d="M4 10v4a1 1 0 0 0 1 1h2l4 3V6L7 9H5a1 1 0 0 0-1 1z" /><path d="m16 10 5 5M21 10l-5 5" /></S>
)
export const IcoSliders = ({ size = 18 }) => (
  <S size={size}><path d="M4 6h10M18 6h2" /><circle cx="16" cy="6" r="2" /><path d="M4 12h4M12 12h8" /><circle cx="10" cy="12" r="2" /><path d="M4 18h10M18 18h2" /><circle cx="16" cy="18" r="2" /></S>
)
