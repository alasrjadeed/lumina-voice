# TRD — Technical Requirements Document (Lumina Voice)

## 1. Stack (fixed)
| Layer | Choice | Notes |
|---|---|---|
| Build | Vite 8 (Oxc/rolldown) | JSX automatic, no esbuild/React plugin config; route pages lazy-loaded via `React.lazy` + `Suspense` |
| UI | React 19.3 + react-router-dom 7.18 | Functional components + hooks only |
| Styling | Plain CSS in `src/index.css` | Tokens in `:root`; no CSS-in-JS, no Tailwind/UI kit |
| Backend | Supabase Auth + PostgREST over `fetch` | No SDK in bundle |
| Media | Internet Archive direct audio; only `ad-*` bundled | Public read, no media credentials |
| Radio | AzuraCast / Icecast now-playing JSON | 15 s poll, abortable |
| PWA | Hand-written `public/sw.js` | No Workbox |
| Artwork | Procedural SVG (`src/art/covers.jsx`) + image overrides | No image-gen dependency |
| Scripts | Python 3 (edge-tts, ffmpeg, pure-Python PNG) | `scripts/*.py`, offline asset production |

## 2. Functional requirements
- **FR-1 Playback:** one `HTMLAudioElement`; direct Archive.org URL, canonical-first with direct-node failover;
  `loadSeq` race guard; `preload="none"`; progress persisted per `titleId`; autoplay-next on `ended`.
- **FR-2 Auth:** email/password (Supabase) or local demo; session persisted; access token refreshed within
  60 s of expiry; sign-out clears storage; role resolution uses exact operator email; profile roles are ignored.
- **FR-3 Catalogue:** Archive-only bundled + user catalogue; CRUD for Archive.org user titles; search across
  titles/series/people/voices including Voice Studio overrides.
- **FR-4 Offline:** `CACHE_AUDIO` with `DL_PROGRESS`/`DL_DONE`, `DELETE_AUDIO`, `AUDIO_STATUS`, `CLEAR_AUDIO`;
  `downloads[]` in `lumina-voice-v1`; offline banner for shell, state, ads and downloaded audio.
- **FR-5 Broadcast:** deterministic schedule generation, dayparts, rotation weights, 7 automation rules,
  station-ID injection, ad break assembly (no back-to-back repeats, longest-fitting spot), 80-entry log.
- **FR-6 Stream integration:** provider detection (AzuraCast/Icecast), mounts (opus/aac/mp3), preferred mount
  persistence, embed snippets (iframe `/radio?embed=1`, `<audio>`, JS widget, markdown), config issue checks.
- **FR-7 Import:** Archive.org id/URL/search (proxied), direct audio URL validation (`isArchiveAudioUrl`),
  multi-track → episodes, auto kind/genre inference, auto author creation. Custom/local story audio is rejected.
- **FR-8 Roles:** listener vs operator (`info@alasarjadeed.com`); operator routes render "Studio access only" for others.

## 3. Non-functional requirements
| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Bundle | JS+CSS initial ≤ 400 KB gzipped (excluding audio) |
| NFR-2 | First play on warm cache | ≤ 1.5 s from tap |
| NFR-3 | Audio source | Direct Archive.org audio only; no first-party transcoding or bundled story files |
| NFR-4 | Image budget | Cover JPEG ≤ 420 KB, 640 px; `og.png` ≤ 300 KB @1200×630 |
| NFR-5 | Lighthouse | Perf ≥ 90, A11y ≥ 95, PWA ≥ 90, Best Practices ≥ 95 |
| NFR-6 | Browser support | Last 2 versions Chrome/Edge/Firefox/Safari; iOS Safari 16+ (Opus via AAC fallback) |
| NFR-7 | Offline | Shell, state, ads and downloaded audio with zero network |
| NFR-8 | Resilience | Every fetch is no-throw to the UI; failures degrade to bundled data |
| NFR-9 | A11y | WCAG 2.2 AA: 44 px targets, `:focus-visible`, `aria-label` on icon buttons, `role="status"` banners |
| NFR-10 | Persistence | All keys `lumina-*-v1`; migration = bump suffix + keep read fallback |

## 4. Data & storage
- localStorage keys and IndexedDB schema: `Memory.md`.
- Supabase schema/RLS: `backend schema.md` (`SCHEMA_SQL` in `src/data/api.js`).
- Service worker caches: `lumina-shell-v8` / `lumina-static-v8` / `lumina-audio-v1`.

## 5. API surface consumed
| Endpoint | Purpose |
|---|---|
| `POST {supa}/auth/v1/signup \| token?grant_type=password \| refresh_token \| logout`, `GET /auth/v1/user` | Auth |
| `GET/POST/PATCH/DELETE {supa}/rest/v1/profiles` | Profiles (RLS: own-row writes) |
| `GET/POST/PATCH/DELETE {supa}/rest/v1/stories` | Catalogue (RLS: operator writes) |
| `{azura}/api/nowplaying/{shortcode}` (+ `/api/station/{id}/nowplaying`, `X-API-Key`) | Now playing (gated off) |
| `{icecast}/status-json.xsl` | Now playing (gated off) |
| `https://archive.org/metadata/{id}`, `advancedsearch.php` (dev-proxied `/import-proxy/archive`) | Import |
| `https://archive.org/download/{id}/{file}` | Catalogue audio |

No first-party server exists; do not invent one.

## 6. Environments
| Env | Purpose |
|---|---|
| Dev | `npm run dev` → `0.0.0.0:4310`, HMR off, SW unregistered (DEV), archive proxy on |
| Preview | `npm run preview` → same host/port, `allowedHosts: ['.monkeycode-ai.live']` |
| Prod | `npm run build` → static `dist/`, served by any static host; env vars baked at build |

## 7. Testing requirements
- Unit: `assembleBreak` (break math, no repeats), `generateSchedule` (slots/dayparts), `canonicalArchiveUrl`
  and `isArchiveAudioUrl`, archive-only catalogue/transfer filters.
- Manual script: install PWA → play an Archive stream → download → airplane mode → play cached audio → sign in →
  admin tabs render → confirm no radio requests.
- Release gate: `npm run build` + the manual script (see `Phases.md` gate rules).

## 8. Versioning
App `package.json` version; storage keys `-v1`; SW caches `-v8/-v1`; registration query `?v=7`.
Any breaking storage change bumps the key suffix and writes a migration note in `Memory.md`.
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## NFR-7 — Deployment & observability
- Container: multi-stage `Dockerfile` (node:20-alpine build → nginx:1.27-alpine), SPA fallback in `nginx.conf`, host port `4310`.
- Local endpoints: AzuraCast API/listener `http://192.168.1.166:8080`; CasaOS UI `:80`; app `:4310`.
- Logs: pino (`src/lib/logger.js`), JSON browser objects, level `VITE_LOG_LEVEL` (`warn` prod / `debug` dev).
- Alerts: `@sentry/browser` loaded dynamically only with `VITE_SENTRY_DSN`; `captureException` on window errors, unhandled rejections, render errors, stream fetch and playback failures. No DSN ⇒ no network calls.
- Tests: 97 vitest cases (Vitest 5); ESLint 10 flat config; Vite 8 build (main ~316 KB / ~100 KB gz, Admin/Radio/Sentry split into lazy chunks); Docker image smoke test on `:4312`.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
