import { useEffect, useState } from 'react'

const palettes = {
  cipher1: ['#3a1d2e', '#8b3a4a', '#e4c36a'],
  cipher2: ['#1c2438', '#4a6fa5', '#c9a227'],
  cipher3: ['#24182e', '#6b3fa0', '#e8d7a0'],
  cipher4: ['#1a2220', '#2f6b5a', '#d4c48a'],
  cipher5: ['#2a1820', '#7a3048', '#f0d78a'],
  cipher6: ['#1e1a16', '#8a6a3a', '#f3e2b0'],
  cipher7: ['#201820', '#5a3a48', '#c9b48a'],
  cipher8: ['#161820', '#3a4a68', '#e4c36a'],
  harbor1: ['#12202a', '#2a5a78', '#c8d4e0'],
  harbor2: ['#1a1612', '#6a4a28', '#e8c070'],
  harbor3: ['#121418', '#3a3a48', '#8a9aaa'],
  harbor4: ['#182028', '#4a7088', '#d0c8a8'],
  harbor5: ['#221018', '#6a2838', '#e0b070'],
  harbor6: ['#101820', '#2a4860', '#a8c0d0'],
  velvet1: ['#2a1220', '#8a2848', '#e8c0c8'],
  velvet2: ['#1a1224', '#5a2a78', '#d8c0e0'],
  velvet3: ['#241820', '#7a4a58', '#f0d0b0'],
  velvet4: ['#101018', '#3a3050', '#c8b890'],
  velvet5: ['#201018', '#6a2038', '#e8c8a0'],
  moon1: ['#2a2410', '#c9a227', '#fff3c0'],
  moon2: ['#241828', '#8a5080', '#f0d0a0'],
  moon3: ['#182018', '#4a7850', '#e0d090'],
  moon4: ['#201828', '#6a4888', '#e8d8b0'],
  orchard: ['#142018', '#3a6848', '#d8e0b0'],
  solen: ['#1c1828', '#6a5088', '#f0d8a0'],
  bryn: ['#12161c', '#3a5068', '#c0d0e0'],
  noor: ['#1a1420', '#684868', '#e8c8c0'],
  aurora: ['#12101c', '#6a48c8', '#e4c36a'],
  // Quran Kareem: deep night-green ground, gold leaf, warm parchment type.
  quran1: ['#0d1a14', '#1e5a3c', '#e8d9a0'],
  quran2: ['#101a16', '#2a6b4a', '#f0e2b0'],
  quran3: ['#0b1512', '#174d38', '#d8c98a']
}

// Cover plates that carry the Quran mark. Generated covers have no picture to
// draw from, so the mark is what makes the shelf legible at tile size.
export const QURAN_COVERS = new Set(['quran1', 'quran2', 'quran3'])

// A title belongs in Quran Kareem if its genre, kind or name says so. Covers
// are keyed by palette id, which a remapped or operator-set cover can change,
// so this is the durable test — the Urdu translation audiobook keeps the mark
// wherever it is drawn.
export function isQuranTitle(t) {
  if (!t) return false
  const genres = (t.genres || []).map((g) => String(g).toLowerCase())
  if (genres.includes('quran kareem') || genres.includes('tilawat') || genres.includes('tafsir')) return true
  if (genres.includes('urdu translation') || genres.includes('translation')) return true
  if (t.kind === 'Quran Kareem') return true
  return /quran|qur['’ʻ]?an|koran|tafsir|tilawat/i.test(t.name || '')
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function CoverSvg({ id, title, number, className, quran }) {
  const p = palettes[id] || palettes.cipher1
  const h = hash(id + (title || ''))
  const r1 = 20 + (h % 40)
  const r2 = 50 + ((h >> 3) % 40)
  const showMark = quran || QURAN_COVERS.has(id)
  return (
    <svg className={className} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p[0]} />
          <stop offset="55%" stopColor={p[1]} />
          <stop offset="100%" stopColor={p[2]} />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#g-${id})`} />
      <circle cx={80 + (h % 80)} cy={90} r={r1} fill={p[2]} opacity="0.18" />
      <circle cx={300} cy={280} r={r2} fill="#000" opacity="0.18" />
      <path d={`M0 ${220 + (h % 40)} Q 200 ${140 + (h % 60)} 400 ${240}`} fill="none" stroke={p[2]} strokeWidth="18" opacity="0.22" />
      <rect x="28" y="28" width="344" height="344" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      {showMark ? (
        <g
          transform="translate(200 176)"
          fill="none"
          stroke={p[2]}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.92"
        >
          <path d="M0 -78c13 13 22 22 22 32 0 9-9 15-22 15s-22-6-22-15c0-10 9-19 22-32z" />
          <path d="M0 -31v17" />
          <path d="M-84 116c0-35 13-59 44-82 15-11 28-24 40-39 12 15 25 28 40 39 31 23 44 47 44 82" />
          <path d="M-92 116h184" />
          <path d="M-30 80c13-7 22-9 30-9s17 2 30 9" />
          <path d="M0 71v45" />
        </g>
      ) : null}
      {number ? (
        <text x="40" y="72" fill={p[2]} fontFamily="Outfit, sans-serif" fontSize="22" letterSpacing="4" fontWeight="700">
          {number}
        </text>
      ) : null}
      {title ? (
        <text x="40" y="360" fill="#fff" fontFamily="Cormorant Garamond, serif" fontSize="28" fontWeight="600">
          {title.length > 18 ? title.slice(0, 16) + '…' : title}
        </text>
      ) : null}
    </svg>
  )
}

// The Quran opening plate: a mosque arch over an open book, in gold leaf.
// Shared by covers, the kind/catalogue selectors and the studio so one mark
// means one thing wherever an operator sees it.
export function QuranMark({ size, className }) {
  const dims = size ? { width: size, height: size } : { width: '58%', height: '58%' }
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      {...dims}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M60 14c6 6 10 10 10 15 0 4-4 7-10 7s-10-3-10-7c0-5 4-9 10-15z" />
      <path d="M60 36v8" />
      <path d="M22 104c0-16 6-27 20-38 7-5 13-11 18-18 5 7 11 13 18 18 14 11 20 22 20 38" />
      <path d="M18 104h84" />
      <path d="M46 88c6-3 10-4 14-4s8 1 14 4" />
      <path d="M60 84v20" />
    </svg>
  )
}

export function CoverArt({ id, title, number, className, src, t }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [src])
  if (src && !broken) {
    return (
      <img
        className={className}
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={() => setBroken(true)}
      />
    )
  }
  return <CoverSvg id={id} title={title} number={number} className={className} quran={isQuranTitle(t)} />
}

function AvatarSvg({ name, seed }) {
  const h = hash(seed || name)
  const hues = [28, 42, 265, 200, 340, 160]
  const hue = hues[h % hues.length]
  const initials = (name || '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
      <rect width="120" height="120" fill={`hsl(${hue} 28% 18%)`} />
      <circle cx="60" cy="46" r="22" fill={`hsl(${hue} 40% 62%)`} />
      <ellipse cx="60" cy="104" rx="38" ry="28" fill={`hsl(${hue} 34% 48%)`} />
      <text x="60" y="52" textAnchor="middle" fill="#1a1408" fontFamily="Outfit, sans-serif" fontSize="18" fontWeight="700">
        {initials}
      </text>
    </svg>
  )
}

export function AvatarArt({ name, seed, src }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [src])
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={() => setBroken(true)}
      />
    )
  }
  return <AvatarSvg name={name} seed={seed} />
}

export function RadioLogo() {
  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden>
      <defs>
        <radialGradient id="rg" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#f4efe6" />
          <stop offset="55%" stopColor="#8b7cf6" />
          <stop offset="100%" stopColor="#1a1430" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="#120f1c" />
      <circle cx="200" cy="200" r="150" fill="url(#rg)" opacity="0.95" />
      <circle cx="200" cy="200" r="92" fill="#f4efe6" />
      <rect x="184" y="128" width="32" height="88" rx="16" fill="#2a2438" />
      <rect x="168" y="208" width="64" height="18" rx="8" fill="#2a2438" />
      <circle cx="200" cy="248" r="10" fill="#e4c36a" />
      <path d="M118 168c28-48 136-48 164 0" fill="none" stroke="#e4c36a" strokeWidth="10" strokeLinecap="round" />
      <path d="M98 148c40-72 164-72 204 0" fill="none" stroke="#8b7cf6" strokeWidth="8" strokeLinecap="round" opacity="0.85" />
      <circle cx="86" cy="92" r="18" fill="#e4c36a" />
      <circle cx="318" cy="78" r="28" fill="#f0d78a" opacity="0.85" />
      <circle cx="330" cy="250" r="14" fill="#8b7cf6" />
      <text x="200" y="330" textAnchor="middle" fill="#f4efe6" fontFamily="Outfit, sans-serif" fontSize="20" letterSpacing="6" fontWeight="600">
        SADA BAHAR
      </text>
    </svg>
  )
}

export function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="18" fill="none" stroke="#e4c36a" strokeWidth="2.4" />
      <path d="M32 18v12M26 26l6 4 6-4" fill="none" stroke="#e4c36a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 38c2.4 6 6.2 9 10 9s7.6-3 10-9" fill="none" stroke="#8b7cf6" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
