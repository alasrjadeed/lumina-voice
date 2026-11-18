# Phases.md — delivery roadmap

Each phase ends with a verifiable outcome. Current position: **Phase 3 complete**.

## Phase 0 — Foundation ✅
Vite 8 + React 19 scaffold · routing shell (sidebar/bottom-nav/MiniBar) · design tokens in `src/index.css` ·
procedural SVG artwork (`src/art/covers.jsx`) · `npm run build` green.
**Outcome:** app boots, dark shell renders, routes navigate.

## Phase 1 — Catalogue & playback ✅
25-title bundled catalogue (`src/data/catalog.js`) · single-`<audio>` engine in `AppState.jsx` ·
Opus / `.lo` / AAC source ladder · progress persistence + autoplay-next · search, library, title/series/person pages.
**Outcome:** any bundled title plays offline with resume.

## Phase 2 — PWA & offline ✅
`manifest.webmanifest` (`standalone`, `ur`, `rtl`) · `sw.js` shell/static/audio caches ·
download-for-offline with progress + status messages · install prompt + iOS hint · offline banner ·
index.html cache-bust recovery.
**Outcome:** installable; downloads play with the network off.

## Phase 3 — Backend & studio ✅
Supabase auth + `profiles`/`stories` RLS schema over fetch · Import Studio (Archive.org, URL, local file) ·
Artwork Studio · Voice Studio (narrator, language, accents) · Broadcast Studio with schedule/rotation/
automation/advertising/analytics/storage/logs · AzuraCast/Icecast integrations.
**Outcome:** admin can run a station and add content without code.

## Phase 4 — Launch hardening ⬅ *next*
- [ ] Open Graph tags + `og.png` (see `open graph tags.md`)
- [ ] Link `llms.txt` from `<head>`; verify `/llms.txt` serves
- [ ] Canonical URL + sitemap + `robots.txt`
- [ ] Media Session API (lock-screen/Bluetooth controls)
- [ ] Real OAuth provider replacing the fake Google button
- [ ] Lighthouse ≥ 95 PWA/perf/a11y on Home, Radio, Title
**Outcome:** shareable, crawlable, installable production build.

## Phase 5 — Growth
Programmatic per-title OG prerendering · push notifications for shows · analytics (privacy-light, self-hosted
Matomo/Plausible) · Ad delivery measurement beyond the in-app CPM report · SEO landing pages per
genre/series · localization pass (Urdu RTL everywhere).

## Phase 6 — Monetisation
Lumina Plus as a real subscription (checkout + entitlement check replacing the local `premium` toggle) ·
ad-server bridge for the existing campaign engine · publisher self-serve upload.

## Phase gates
| Gate | Rule |
|---|---|
| Leave a phase | `npm run build` succeeds, no console errors on Home/Title/Radio/Settings/Admin |
| Ship to users | OG tags valid, `llms.txt` present, offline download works, RLS policies tested with a non-admin user |
| Change design | `Design.md` updated in the same change |
| New persisted key | `Memory.md` table updated |
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Phase 7 — Local broadcast + observability (done 2026-11-17)
1. Point the app at the CasaOS host's AzuraCast (`:8080`), separate API/listener bases.
2. Ship a Docker/nginx image for CasaOS on port `:4310`.
3. Add pino structured logs and opt-in Sentry alerts.
4. Verify lint, tests, build, image smoke test.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
