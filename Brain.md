# Brain.md — Lumina Voice

> The single source of truth an agent reads first. Keep it short, keep it true.

## What this is
**Lumina Voice** — a PWA for Urdu audio-films, dramas, series and audiobooks. (Live radio is paused; source kept for relaunch.)
Tagline: *"Close your eyes. The story begins."*
Stack: **Vite 8 + React 19 + react-router-dom 7**, plain CSS, no UI framework, no React SDK for the backend. Route pages are lazy-loaded (`React.lazy` + `Suspense`); JSX transformed by Vite/Oxc.

## Non-negotiables
1. Runs **fully offline** on the bundled catalogue — no env vars required.
2. Audio is **Opus 24–48 kbps mono** (`.opus` / `.lo.opus`) with **AAC `.m4a` fallback**. Never ship video, never ship 128 kbps+ audio.
3. Audio bytes never enter Supabase — only the text URL (Cloudflare R2 or `/public/audio`).
4. Dark, gold-on-ink UI (`#08070b` / `#e4c36a`). No white themes, no default component libraries.
5. Every persisted value uses a `lumina-*-v1` key (see `Memory.md`).
6. Never commit `.env`, real keys, or generated media sources.

## Where things live
| Need | File |
|---|---|
| Routes / shell | `src/App.jsx` |
| Playback + auth + downloads | `src/state/AppState.jsx` |
| Device voice (browser + Android TTS) | `src/ai/deviceVoice.js`, `src/platform/nativeTts.js`, `UrduTtsPlugin.java` |
| Bundled catalogue | `src/data/catalog.js` |
| Archive library verification | `Audiobook Library 100 Plan.md`, `scripts/verify-archive-library.mjs`, `scripts/convert-archive-library.py`, `data/archiveLibraryWorking.json` |
| Archive library review UI | `src/pages/ArchiveLibraryAdmin.jsx` (Device Admin → Archive library), `src/data/generated/archiveLibraryAdmin.json` |
| Supabase (auth + REST + SQL) | `src/data/api.js` |
| Radio stream (AzuraCast/Icecast) | `src/data/stream.js` |
| Broadcast automation + ads | `src/data/broadcast.js`, `src/data/ads.js` |
| PWA / service worker | `src/pwa.js`, `public/sw.js` |
| Design tokens | `src/index.css` (`:root`) |
| Admin studio (12 tabs) | `src/pages/Admin.jsx` |
| Docs index | `README.md` (this file set below) |

## Doc map
`PRD.md` (why/what) → `TRD.md` (technical) → `Architecture.md` (how it fits) →
`app flow.md` (user journeys) → `backend schema.md` (DB) → `Design.md` + `UI-UX Design Brief.md` (look & feel) →
`Phases.md` + `Implementation Plan.md` + `Task.md` (plan & status) →
`Audiobook Library 100 Plan.md` (next library update, verification gates) →
`Rules.md` (how we work) · `security.md` · `open graph tags.md` · `llms.txt` · `Auto mcp index.md` · `Memory.md` (facts) · `licence.md`

## Current state (v1.0.0)
- Bundled catalogue: 25 titles, 4 series, 5 authors, 3 poets, 6 voices, 1 radio station ("Sada Bahar").
- Auth: Supabase (optional) or local demo; email containing `admin` ⇒ admin role.
- Admin "Broadcast Studio": schedule, rotation, automation rules, advertising, live stream, analytics, storage, logs.
- Installs as PWA; offline downloads cached by the service worker.
---
Autobiography category added to broadcast; Holy Quran Urdu Translation in Quran Kareem with Urdu Translation genre.

## Local broadcast deployment (2026-11-17)
- CasaOS UI: `http://192.168.1.166` (port 80). AzuraCast: `http://192.168.1.166:8080` — station `lumina_voice` (id `2`).
- Web app container: `http://192.168.1.166:4310` (`docker-compose up -d --build`; `Dockerfile` + `nginx.conf`).
- `src/data/stream.js` keeps the API base and the listener base separate; both default to port **8080**, because port 80 belongs to CasaOS.
- Mounts: `/listen/{shortcode}/live`, `/listen/{shortcode}live`, `radio.opus`, `radio.m4a`, `radio.mp3`; config key `lumina-stream-v2`.
- Observability: `src/lib/logger.js` (pino browser logging) + optional Sentry alerts via `VITE_SENTRY_DSN`. See `Pino logs.md`, `Sentry alerts.md`, `DEPLOY.md`.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` opens the radio-free Device Admin for admins), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (107/107), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
