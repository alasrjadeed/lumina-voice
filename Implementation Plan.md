# Implementation Plan.md — Lumina Voice

Actionable plan with acceptance criteria. Status mirrors `Task.md`; roadmap context in `Phases.md`.
Estimates assume one engineer + AI assistance.

## Milestone A — Launch metadata & discoverability (1–2 days)
| # | Task | Acceptance |
|---|---|---|
| A1 | Add OG/Twitter/canonical/`llms.txt` link block to `index.html` (paste from `open graph tags.md`) | Sharing Debugger + Twitter Validator render the card |
| A2 | Produce `public/og.png` 1200×630 (gold wordmark, `#08070b`, ≤ 300 KB) | File exists; referenced URL 200 over HTTPS |
| A3 | `public/robots.txt` + `public/sitemap.xml` (Home only until prerendering exists) | `curl /robots.txt` returns allow-all + sitemap ref |
| A4 | Self-host fonts (download OFL woff2 into `public/fonts`, replace Google Fonts `<link>`) | No `fonts.googleapis.com` in Network tab |

## Milestone B — Player hardening (2–3 days)
| # | Task | Acceptance |
|---|---|---|
| B1 | Media Session API: metadata (title/cover/artist) + play/pause/seek/next handlers | Controls appear on lock screen & Bluetooth headsets |
| B2 | Background/next-episode reliability: verify `ended` → autoplay with tab hidden | Autoplay fires within 1 s of `ended` in background |
| B3 | Audio error taxonomy: map MediaError codes to the four user states | Simulated 404 shows error + retry, not a silent stall |
| B4 | Precache high-traffic audio after first play (idle callback, std + AAC only) | Revisit plays offline without tapping Download |

## Milestone C — Security closure (1–2 days, see `security.md`)
| # | Task | Acceptance |
|---|---|---|
| C1 | Block `role` self-escalation: revoke UPDATE on `profiles` except `username`, or pin trigger | Modified client PATCH `role` → rejected (42501) |
| C2 | CSP + security headers at host (`nosniff`, HSTS, frame-ancestors for `/radio?embed=1`) | Headers present in `curl -I`; app unaffected |
| C3 | Replace demo/Google stub auth with a real provider (or remove the button) | Only real auth paths remain |
| C4 | RLS test script: non-admin cannot write `stories` | Automated curl check documented in `backend schema.md` |

## Milestone D — Test & CI (2–3 days)
| # | Task | Acceptance |
|---|---|---|
| D1 | Vitest units: `assembleBreak`, `generateSchedule`, `sourceList`, `canonicalArchiveUrl`, `searchCatalog` | ≥ 20 assertions green in CI |
| D2 | Playwright smoke: sign-in → play → download → offline → admin tabs | Passes headless on the preview build |
| D3 | GitHub Action/CI: `npm ci && npm run build && npm test` on push | Red on regression |

## Milestone E — Backend connect (2–4 days, optional by deployment)
| # | Task | Acceptance |
|---|---|---|
| E1 | Provision Supabase, run `SCHEMA_SQL` plus the three `docs/supabase-*.sql` migrations | Operator → Storage health check `ok` |
| E2 | Verify one Archive.org item's direct audio URL and CORS, then publish the Archive-only catalogue | Stream plays on web and tablet from `archive.org` |
| E3 | Cloud catalog publish flow end-to-end (create → play → delete under RLS) | Non-operator write rejected |

## Milestone F — Growth backlog (post-launch)
Per-title prerendered OG (Option A, `open graph tags.md` §4) · push notifications for scheduled shows ·
self-hosted analytics (Matomo/Plausible) · real Lumina Plus checkout replacing the local `premium` toggle ·
`rekhta.js` implement-or-delete · `make-opus.py` output path parametrisation ·
unit-test the ad/rotation generators before touching them.

## Milestone L — 100-title Archive.org library update (see `Audiobook Library 100 Plan.md`)
| # | Task | Acceptance |
|---|---|---|
| L0 | Normalise the 100 candidate records; fix duplicate `URD-AUD-100` / `The School Story`; keep originals immutable | 100 unique IDs; 0 records published |
| L1 | Verify candidate item pages, MP3s, durations, Urdu language, covers and item-level rights | Only `playbackStatus: verified` + explicit rights enter the manifest |
| L2 | Add `verify-archive-library.mjs`, `convert-archive-library.py`, `build-library-catalogue.mjs` (Node built-ins + ffmpeg only) | Manifest schema tests pass; raw MP3s stay outside the repo |
| L3 | Convert verified/cleared audio to `archive/<id>.opus` + `.lo.opus` + `.m4a` | `ffprobe` confirms 24 kHz mono, 24/32/40 kbps; no video |
| L4 | Generate catalogue module, add six genres, route them to `audiobook`, publish verified counts | Six shelves show `published / target`; no blank URLs or guessed rights |
| L5 | Add `ArchiveLibraryAdmin` tab to radio-free `DeviceAdmin` | Operator can intake, review, reject and publish honestly |
| L6 | Tier A APK bundle (12 horror titles), Tier B Docker library, Tier C Archive stream | Airplane-mode playback, LAN playback and stream fallback all pass |
| L7 | Full QA + docs sync | Lint, tests, build, Docker, `cap sync`, Gradle, APK install green; `Task.md` / `Memory.md` updated |

Shortfall rule: if fewer than 100 items verify, publish the verified count and report the gap. Never fill targets with unverified candidates.

Status 2026-11-18: L0, L2, L3, L4 and L5 are done; 0 records published. Full metadata pass on 99 active candidates found 0 verified, 83 rejected and 16 blocked. A later audio pass briefly published 19 records because the verifier mistook `opensource_audio` for a licence; that classifier bug was fixed and all 19 were re-checked live and blocked (`scripts/repair-archive-rights.mjs`). Manifest, generated catalogue and admin summary are back to 0 published. Duplicate candidate replaced, so the working set has 100 active records. L6 (delivery tiers) and final L7 smoke checks remain gated on rights-cleared titles.

## Execution order & dependencies
```
A (metadata)  ─┐
B (player)    ─┼─▶ C (security) ─▶ D (tests/CI) ─▶ E (backend) ─▶ F (growth)
G (docs sync) ─┘      (A2 blocks A1; C2 needs A3)
L (library)   ──▶ L0 → L1 → L2 → L3 → L4 → L5 → L6 → L7 (gates are sequential)
```
- **G — docs sync** runs continuously: every merged task updates `Task.md`, and any key/route/token
  change updates `Memory.md` / `app flow.md` / `Design.md` per `Rules.md` 24–26.

## Definition of done (release)
1. Milestones A–C complete; D green in CI (E if a cloud backend is configured).
2. Lighthouse ≥ 90 PWA/Perf, ≥ 95 A11y on Home, Title, Radio.
3. Offline walkthrough passes: install → download → airplane mode → play → resume.
4. `curl -I /llms.txt` → 200; OG card renders; no secrets in `dist/` or git history.
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Milestone: local broadcast + observability (done 2026-11-17)
- `src/data/stream.js`: dual base URLs, fallback now-playing list, mount variants, `lumina-stream-v2`.
- `src/state/AppState.jsx`: codec-derived MIME for direct mounts; warn log on playback failure.
- `src/lib/logger.js`, `src/main.jsx`, `src/ui/ErrorBoundary.jsx`: pino + opt-in Sentry.
- `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `.env.production`, `.env.example`, `DEPLOY.md`.
- Doc set refreshed; `Auto mcp index.md`, `llms.txt`, `Pino logs.md`, `Sentry alerts.md`.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
