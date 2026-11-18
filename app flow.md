# app flow.md — routes & user journeys

## 1. Route table (`src/App.jsx`)
| Path | View | Guard | Notes |
|---|---|---|---|
| `/auth` | `Auth` | public | email/password, demo entry, Google (stub) |
| `/` | `Home` | signed-in | hero, kind rails, featured, people |
| `/explore` | `Explore` | signed-in | full browse |
| `/genre/:name` | `Genre` | signed-in | genre listing |
| `/kind/:name` | `Kind` | signed-in | kind listing (drama/audiobook/…) |
| `/search` | `Search` | signed-in | `searchCatalog` |
| `/title/:id` | `Title` | signed-in | episodes, lock, heart, download |
| `/series/:id` | `Series` | signed-in | season/episode list |
| `/person/:id` | `Person` | signed-in | author/poet/voice profile |
| `/radio` | `Radio` | signed-in | internal broadcast or external mount |
| `/radio?embed=1` | `Radio` | public | **bare player, no shell/nav** (iframe) |
| `/now` | `NowPlaying` | signed-in | full player: seek, language, quality pills |
| `/library` | `Library` | signed-in | continue, saved, downloads |
| `/settings` | `Settings` | **allowed signed-out** | account, PWA install, Import Studio, Artwork Studio |
| `/admin` | `Admin` | admin only | Broadcast Studio (12 tabs) |

`Guard` → any non-signed-in hit (except `/settings`) redirects to `/auth`.
Non-admin hitting `/admin` renders "Studio access only".

## 2. Shell
```
App (Catalog → App → Artwork → Broadcast providers)
 └ Route: /auth → Auth (no shell)
 └ Route: /  Guard → Shell
     ├ offline banner (when offline)
     ├ sidebar: brand · Home · Search · Library · Radio · [Studio] · install dot · Settings
     ├ <Outlet/> (scroll area)
     ├ MiniBar (hidden on /now; shows now.title art + play/pause)
     └ bottom-nav (same tabs, mobile)
```

## 3. Core journeys

### A. Listener — first session
`/auth` → sign in (or demo) → `/` Home → tap hero `raat-01` → `/title/raat-01` → Play episode 1 →
audio loads (Opus; `.lo` if `hq=false`; AAC fallback) → MiniBar appears → `/now` for full player →
progress saved to `progress[titleId]` → next episode autoplays on `ended`.

### B. Listener — offline
`/library` → Download on a title → SW `CACHE_AUDIO` with `DL_PROGRESS → DL_DONE` → `downloads[]` recorded →
network drops → offline banner → downloaded titles still play; non-downloaded titles fail gracefully.

### C. Listener — live radio
`/radio` → *Play live* → external mount (`playExternal`, direct URL) or internal broadcast
(`playBroadcast` from bundled `radio-live.opus`) → now-playing polls every 15 s →
`/radio?embed=1` for third-party iframes (embed snippets generated in `Integrations`).

### D. Listener — import own audio
`/settings` → Import Studio → Archive.org id/URL/search **or** custom URL **or** local file →
file stored in IndexedDB (`local:` asset) → episodes created → title appears in Catalog with
auto kind/genre → plays like any bundled title.

### E. Admin — run the station
`/auth` (admin role) → `/admin` → Overview: on-air card, listeners, daypart, today's timeline →
Desk: *Start broadcast* / *Take over* / *Skip item* / *Insert station ID* / *Return to AI* →
Schedule: add slot, 8-hour block, *AI generate week* → Content: rotation weights 1–9 →
Automation: toggle 7 rules → Advertising: campaigns/spots/CPM, break preview →
Logs: last 80 entries. The 1-second `BroadcastProvider` tick keeps `onAir/show/progress/remaining` live.

### F. Admin — add cloud content
`/admin` → Cloud catalog → `healthCheck` → create story with R2 `audio_url` (+ cover, duration) →
row written under RLS `admins manage stories` → playable via `VITE_MEDIA_BASE_URL`.

## 4. State machines
```
Auth:    signed-out ─ signIn/signUp ─▶ session ─ refresh(≤60 s skew) ─▶ session
                                  └ failed ─▶ error message (stay)
Audio:   idle ─ play(…) ─▶ loading ─ playing ⇄ paused ─ ended ─▶ autoplay-next (free|premium)
                                  └ error(2/4) ─▶ playError message
Broadcast: mode 'ai' ⇄ 'manual'; live on/off; schedule → rotation → onAir item each tick
Download: idle ─ CACHE_AUDIO ─▶ progress% ─ DL_DONE ─▶ cached; DELETE_AUDIO ─▶ idle
```

## 5. Cross-cutting behaviours
- Language switch (`ur`/`en`) reloads the current source with `.en.*` preference.
- `hq` toggle switches `.opus` ↔ `.lo.opus`.
- Service worker failure → inline recovery screen in `index.html` ("Reset and reload").
- All data modules read-first-then-merge, so a corrupt storage key never bricks the app.
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Flow: local live radio (2026-11-17)
1. Open `http://192.168.1.166:4310/radio` -> config loads from `lumina-stream-v2` (defaults: API `:8080`, listen `:8080`, shortcode `lumina_voice`).
2. `useNowPlaying` polls `/api/nowplaying/lumina_voice`; on 404 it falls back to `/api/nowplaying` and picks the station entry.
3. `Listen live` calls `playExternal` with the recommended mount (`/listen/lumina_voice/live`); user can switch quality in `/integrations`.
4. Failed fetch/play writes a pino warn log; with a Sentry DSN it also becomes an alert. The UI shows the reason and hint.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
