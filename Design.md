# Design.md — Lumina Voice design system

## Identity
Cinematic, nocturnal, literary. A radio station that reads to you in the dark.
Never: white backgrounds, Material/Bootstrap look, stock gradients, generic card grids.

## Tokens (`src/index.css` → `:root`)
```css
--bg: #08070b;      --bg-2: #100f16;
--panel: #16141e;   --panel-2: #1c1a26;
--line: rgba(255,255,255,.08);
--text: #f4efe6;    --muted: #9a9488;
--gold: #e4c36a;    --gold-2: #f0d78a;   /* brand accent, CTAs, active states */
--violet: #8b7cf6;  --violet-2: #a99dff; /* ambient glows, live/AI states */
--green: #3dd68c;   /* live / success */ --danger: #ef6b6b;
--shadow: 0 18px 50px rgba(0,0,0,.45);
--radius: 18px;  --nav: 72px;  --mini: 68px;
--font: 'Outfit', system-ui, sans-serif;
--display: 'Cormorant Garamond', Georgia, serif;
--naskh: 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', serif;
```
Only these values may appear in components — extend the token, never hard-code a hex.

## Typography scale
| Role | Family | Use |
|---|---|---|
| Display | Cormorant Garamond 500–700 | Titles: `.now-title` 28px, section heads 28–32px, stat values 30px |
| UI | Outfit 300–700 | Body, buttons, labels, nav |
| Urdu/Arabic | Noto Naskh Arabic 400–700 | `.ur`/naskh blocks, RTL copy |
| Mono | ui-monospace / SF Mono / Menlo | URLs, SQL, file paths, codec labels (12px) |

Body 16px base, muted `#9a9488` for secondary lines, gold for emphasis — never gold body text.

## Surface & layout
- App frame `.app`: `100vh` flex, background = two radial glows (violet top-left, gold top-right) over `--bg`.
- Desktop: 88px icon sidebar (`.sidebar`) + scroll column (`.scroll`) + MiniBar + bottom nav.
  Mobile: bottom-nav only (`--nav: 72px`), MiniBar above it (`--mini: 68px`).
- Panels: `--panel` fill, 1px `--line` border, `--radius` 18px, `--shadow` for elevated ones.
- Spacing rhythm: 8 / 12 / 16 / 24 / 32 / 48. Page padding 24–32 desktop, 16 mobile.

## Components (`.class` names live in `src/index.css`, `src/ui/Bits.jsx`)
- **Brand mark / covers** — procedural SVG in `src/art/covers.jsx` (`BrandMark`, `CoverArt`, `AvatarArt`, `RadioLogo`); palettes `cipher1…noor`.
- **Pills / chips** — fully rounded (`999px`), gold fill when active, transparent + `--line` when idle.
- **MiniBar** — sticky mini player: thumb (radius 10, circular for radio), title/sub, round play button.
- **Nav buttons** — icon-only, `.active` = gold.
- **Offline banner** — full-width, above shell, `role="status"`.
- **Empty states** — `.empty h3` display serif 28px + one gold line of copy.
- **Admin tables/panels** — stat cards (display 30px values), mono for URLs/SQL, danger red for destructive only.

## States
- Hover: gold border/glow, no transform jumps > 2px.
- Focus: 2px gold outline, visible on dark (`:focus-visible`).
- Loading: text "Loading…" (never spinners > 40px).
- Error: `.danger` text + explicit action button (see the `index.html` recovery screen style).
- Live/ON AIR: green dot + `--green`, AI mode: `--violet`.

## Motion
Minimal and purposeful: 150–220 ms ease-out for state changes, `prefers-reduced-motion` respected.
No parallax, no carousels, no looping decorative animation (it is an audio product — motion means state).

## Accessibility
- Contrast ≥ 4.5:1 (`--text` on `--bg` ≈ 15:1, `--muted` on `--panel` ≈ 6:1).
- Tap targets ≥ 44px (nav, mini-play, pills).
- Icons always have `aria-label` (`Play`, `Pause`, `Settings`…).
- RTL-ready: `dir` support in manifest (`lang: "ur"`, `dir: "rtl"`); logical spacing where possible.

## Asset rules
- Icons: inline SVG from `src/ui/Icons.jsx` — no icon font, no emoji.
- Covers: 640px square, JPEG data URL ≤ 420 KB (`readImageFile` in `data/artwork.js`).
- Audio never has artwork baked in; covers resolve via `coverFor(titleId)`.
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Operational states
- Stream badges: `EXTERNAL · LIVE STREAM`, `EXTERNAL · LIVE WITH A HOST`, `OFF AIR`, `Station unreachable` — use existing `--green` live dot and `--danger` error text only.
- Integration check rows reuse `.check-row.ok|fail|wait|todo`; a local-server failure must show the concrete reason (`HTTP 404`, `Network or CORS error`) plus the hint, never a blank state.
- No visual changes for logging/Sentry; alerts are silent to the user.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
