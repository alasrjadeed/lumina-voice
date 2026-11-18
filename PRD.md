# PRD — Lumina Voice

**Version** 1.0 · **Status** live (private build) · **Owner** Lumina Voice
**One-liner:** Urdu-first audio streaming PWA — audio-films, dramas, audiobooks and a local broadcast desk, built for low bandwidth and offline nights. Public live radio is paused until resources allow relaunch.

## 1. Problem
Urdu listeners have no focused, low-bandwidth, installable home for audio drama and radio:
mainstream apps stream high-bitrate audio, ignore Urdu narration needs, and offer no offline story
experience. Publishers have no simple way to schedule a station, insert ads, and publish audio.

## 2. Goals
| # | Goal | Measure |
|---|---|---|
| G1 | Instant, resilient listening | Play < 1.5 s after tap on a warm cache; works with zero backend config |
| G2 | Data-friendly | Default stream ≤ 48 kbps mono; `.lo` 24 k mode selectable; offline downloads |
| G3 | Urdu-first quality | Urdu/English voices, Naskh typography, RTL-ready manifest |
| G4 | Self-serve publishing | Admin adds content, schedules shows, runs ads — no code changes |
| G5 | Shareable & discoverable | Valid OG cards, `llms.txt`, installable PWA |

## 3. Users
1. **Listener** — signs in (or demo), browses, downloads, listens offline.
2. **Admin/Station operator** — Broadcast Studio: schedule, rotation, automation, ads, stream, analytics, logs.
3. **AI/agent integrator** — reads `llms.txt`, `Auto mcp index.md`, `backend schema.md` to operate the system.

## 4. Scope — features
### P0 (must ship)
- Auth (Supabase or local demo) with one operator account
- Archive.org-only catalogue + search + library + continue-listening progress
- Single-element audio engine: direct Archive streams, autoplay-next, language switch
- Offline: install, download episodes, offline banner, cache-first shell/audio
- Live radio source kept fully gated but paused
- Broadcast Studio: schedule, rotation, automation rules, ad breaks, logs
- Import Studio: Archive.org item URL/identifier/search only

### P1 (should)
- Cloud catalogue CRUD (Supabase `stories` + Archive.org URLs), health check
- Voice Studio (per-title narrator, language lock, accent rate/pitch)
- Artwork Studio overrides; procedural SVG fallbacks
- OG/Twitter cards, canonical + sitemap, `llms.txt` linked
- Media Session API controls

### P2 (could)
- Push notifications, real OAuth, real premium checkout, per-title prerendered OG,
  publisher self-serve upload, recommendations, social sharing from the player

## 5. Non-goals (v1)
Video · light theme · user-generated playlists/social graph · ML recommendations · multi-language UI
(localization of copy) · DRM.

## 6. Constraints
- Fully client-side bundle; no SSR. Backends optional (offline-first by design).
- Audio ≤ 48 kbps mono; storage for downloaded audio lives in the service worker cache.
- No SDKs in the bundle (plain `fetch`); no UI component libraries; no icon fonts.

## 7. Success metrics
- Lighthouse: PWA ≥ 90, A11y ≥ 95, Perf ≥ 90 on Home/Title/Radio.
- Offline play: a downloaded title plays with network disabled.
- Zero-config boot: no env vars → full catalogue browsable and playable.
- Admin task: add a title and schedule a show in < 5 minutes without editing code.

## 8. Risks
| Risk | Mitigation |
|---|---|
| Cache/SW staleness breaks the app | Versioned cache names + inline recovery script (`lumina-sw-bust`) |
| Anon key exposure | RLS only; no secrets client-side (see `security.md`) |
| Content rights | Only self-generated TTS samples + archive.org items; see `licence.md` |
| SPA single-`index.html` limits crawler metadata | Phase 4 prerender (see `open graph tags.md`) |

## 9. Related docs
`TRD.md` (technical) · `app flow.md` (journeys) · `PRD` ↔ `Phases.md` / `Implementation Plan.md` / `Task.md`.
---
- Support Autobiography category in broadcast.

## Added goal (2026-11-17)
| G6 | Local broadcast ownership | A CasaOS-hosted AzuraCast station drives `/radio` with real metadata; no external VPS required for local use; failures are observable in logs and optional Sentry alerts. |

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
