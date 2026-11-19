# Auto mcp index.md — machine-facing index (MCP / agent interfaces)

Auto-generated inventory of everything an agent or MCP client can hook into for this project.
Regenerate whenever a server, endpoint, or script changes. Last checked: **2026-11-18**.

## 1. MCP servers configured
| Server | Status | Notes |
|---|---|---|
| *(none)* | — | No MCP servers are configured for this workspace. Opencode `list_mcp_resources` returns `resources: []`, `templates: []`. |

### Add one
`opencode.json` (project root or `~/.config/opencode/`):
```jsonc
{
  "mcp": {
    "supabase": { "type": "local", "command": ["npx", "-y", "@supabase/mcp-server-supabase@latest"],
                  "environment": { "SUPABASE_ACCESS_TOKEN": "<token>" } },
    "firecrawl": { "type": "local", "command": ["npx", "-y", "firecrawl-mcp"],
                   "environment": { "FIRECRAWL_API_KEY": "<key>" } }
  }
}
```
Useful candidates: **Supabase MCP** (schema/auth/RLS ops), **Playwright/Chromium MCP** (UI smoke),
**Archive.org API** (catalogue verification), **GitHub MCP** (issues/PRs).

## 2. Local programmatic interfaces (no MCP needed)

### npm scripts
| Command | Effect |
|---|---|
| `npm run dev` | Vite dev server `0.0.0.0:4310` (HMR off, archive proxy on) |
| `npm run build` | Production bundle → `dist/` |
| `npm run preview` | Serve `dist/` on `0.0.0.0:4310`, `allowedHosts: ['.monkeycode-ai.live']` |
| `docker-compose up -d --build` | Build and run the nginx image `lumina-voice:local` on `4310:80`, `restart: unless-stopped` |
| `scripts/open-lumina.sh` | Start `lumina-voice` if stopped, wait for http://localhost:4310/, open it via `xdg-open` (desktop launcher calls this) |

### Archive.org library scripts (planned update, tooling landed)
| Script | Purpose | Notes |
|---|---|---|
| `scripts/normalize-archive-candidates.mjs` | Copy the 100 supplied candidates into `data/`, assign unique IDs, flag duplicates, suggest the six target categories | `--source`, `--out-dir`; never overwrites an existing verified manifest |
| `scripts/verify-archive-library.mjs` | Search/fetch Archive.org metadata, pick a direct audio file, classify rights, require Urdu evidence, optionally download + `ffprobe` | `--stage metadata|audio`, `--limit`, `--title`, `--category`, `--out`, `--publish`; results in `data/archiveLibraryVerification.json` |
| `scripts/repair-archive-rights.mjs` | Re-check every published result against live Archive metadata and block anything without explicit reuse evidence | Use after any verifier change; rewrites verification + manifest, then run the two builders below |
| `scripts/lib/archiveRights.js` | Pure rights classifier: only explicit `licenseurl`/rights statements grant reuse rights | `opensource_audio` collection tags are never evidence; `rightsAllowPublish()` gates the manifest |
| `scripts/lib/archivePublish.js` | Shared published-record and manifest builder | Used by verifier and rights-repair script |
| `scripts/build-library-catalogue.mjs` | Generate `src/data/generated/archiveLibrary.js` from `src/data/archiveLibraryVerified.json` | Run only after a reviewed publish; generated file is imported by `src/data/catalog.js` |
| `scripts/build-library-admin-summary.mjs` | Generate `src/data/generated/archiveLibraryAdmin.json` (targets, totals, review queue) from working + verification + manifest | Imported by the read-only Archive library tab in Device Admin |
| `scripts/prune-native-audio.mjs` | Delete every native APK audio file except `ad-*` after `cap sync` | Required before every `clean assembleDebug`; cuts the APK from ~341 MB to ~6 MB |
| `scripts/export-cloud-catalogue.mjs` | Publish published archive-only Supabase `stories` rows to `public/catalogue.json` | `npm run catalogue:export`; skips drafts; uses the publishable/anon key only, never a service key |
| `scripts/install-catalogue-cron.sh` | Install the 15-minute catalogue publisher crontab entry | Idempotent; reads `.env.local` from the project root |
| `scripts/convert-archive-library.py` | Convert verified, rights-cleared MP3s to Opus 32k/24k mono + AAC 48k fallback | `--limit`, `--id`, `--out-dir`, `--dry-run`, `--force`; skips anything without explicit reuse rights |

### Native Android plugin (local, no npm package)
| Bridge | Methods | Purpose |
|---|---|---|
| `UrduTts` (`android/app/src/main/java/com/luminavoice/app/UrduTtsPlugin.java`, JS wrapper `src/platform/nativeTts.js`) | `status` · `voices` · `speak({text,lang,rate,pitch,voiceURI})` · `stop`; events `start` / `end` / `error` | Reaches the tablet's installed Android `TextToSpeech` Urdu pack because Android WebView has no `speechSynthesis`. Registered in `MainActivity`; `<queries>` declares `TTS_SERVICE` for Android 11+. |

### Python asset generators (`scripts/*.py`)
| Script | Purpose | Key env |
|---|---|---|
| `voices.py` | edge-tts voice cast helper (imported by others) | — |
| `make-opus.py` | track → `.opus` / `.lo.opus` / `.m4a` (+ `.en` variants) | `LUMINA_TRACK`, `LUMINA_LANG=ur\|en\|both` (output hardcoded `/workspace/public/audio`) |
| `make-samples.py` | `sample-<voice>.*` voice previews | — |
| `make-ads.py` | the 8 `ad-<slug>.*` spots | — |
| `make-icons.py` | pure-Python PNG icons from `favicon.svg` | — |

### Service-worker message API (via `src/pwa.js`, MessageChannel)
`CACHE_AUDIO` → `DL_PROGRESS` / `DL_DONE` · `DELETE_AUDIO` · `AUDIO_STATUS` → `{cached,bytes}` ·
`CLEAR_AUDIO` · `SKIP_WAITING`.

## 3. HTTP surfaces (environment-dependent)
| Surface | Auth | Used by |
|---|---|---|
| `{VITE_SUPABASE_URL}/auth/v1/*` | publishable key header | `src/data/api.js` |
| `{VITE_SUPABASE_URL}/rest/v1/{profiles,stories,ratings,reviews,user_state}` | publishable key + user JWT, RLS | `src/data/api.js`, `src/data/ratings.js`, `src/data/userState.js` |
| `/catalogue.json` (or `VITE_CATALOGUE_SNAPSHOT_URL`) | public, `no-store` | `src/data/cloudCatalogue.js`, `src/state/Catalog.jsx`; written by cron |
| `https://archive.org/download/{id}/{file}` | public read | `src/state/AppState.jsx` (catalogue audio) |
| `{VITE_MEDIA_BASE_URL}/<asset>` | public read | legacy non-catalogue media only |
| `{azuracast}/api/nowplaying/{shortcode}` (+ `X-API-Key` admin) | station-local, radio off | `src/data/stream.js` |
| `{icecast}/status-json.xsl` | public, radio off | `src/data/stream.js` |
| `https://archive.org/metadata/{id}` · `advancedsearch.php` | public (dev-proxied `/import-proxy/archive`) | `src/data/archive.js` |
| `/llms.txt`, `/manifest.webmanifest`, `/sw.js?v=7` | public | crawler/PWA |

## 4. Agent-readable entry points
1. `public/llms.txt` — human/LLM product summary served at `/llms.txt`.
2. `Brain.md` — doc map; `Memory.md` — stable facts (keys, routes, traps).
3. `Rules.md` — constraints before editing; `Task.md` — current work state.
4. `src/data/contentPolicy.js` — single Archive.org-only content gate.
5. `backend schema.md`, `docs/supabase-admin-lockdown.sql`, `docs/supabase-archive-only.sql`, `docs/supabase-cloud-catalogue.sql`, `docs/supabase-user-state.sql` — SQL policy sources; this file — interfaces.

## 5. Generated / do-not-edit
`package-lock.json` · `dist/**` · `public/catalogue.json` (produced by `catalogue:export`) · `public/audio/*` (produced by `scripts/*.py`) ·
`public/icon-*.png` · `node_modules/**` · `src/data/generated/archiveLibrary.js` (produced by `build-library-catalogue.mjs`) ·
`src/data/generated/archiveLibraryAdmin.json` (produced by `build-library-admin-summary.mjs`) ·
`data/archiveLibraryWorking.json`, `data/archiveLibraryVerification.json` and `data/libraryConversionReport.json` (produced by the library scripts).
## 6. Launch + observability (2026-11-17)
| Surface | Address / module | Auth | Used by |
|---|---|---|---|
| Lumina Voice app | `http://localhost:4310` / `http://192.168.1.152:4310` (Docker/nginx, static PWA) | public | listeners |
| CasaOS UI | `http://192.168.1.166` (80) | local login | server management (host only) |
| Structured logs | `src/lib/logger.js` (pino) | — | all modules |
| Sentry alerts | `captureException` / `captureMessage`, enabled by `VITE_SENTRY_DSN` | DSN | global hooks, ErrorBoundary; off in shipped build |

The shipped image contains no Supabase URL, no Sentry DSN and no stream config.
`.env.local` is excluded by `.dockerignore`; only `.env.production` (radio flag off)
is baked in. AzuraCast endpoints in `src/data/stream.js` are gated and make no calls.

New npm/deploy interfaces: `docker-compose build|up -d` (image `lumina-voice:local`), `Dockerfile` (node:22-alpine → nginx:1.27-alpine), `nginx.conf` (SPA fallback), `.env.example`. New docs: `DEPLOY.md` (zero-cost tablet-first launch), `Pino logs.md`, `Sentry alerts.md`.

---
Updated: local broadcast deployment, pino logs, Sentry alerts, Autobiography category and Quran Kareem/Urdu Translation handling.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` opens the radio-free Device Admin for admins), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (107/107), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
