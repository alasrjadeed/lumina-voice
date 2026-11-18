# Pino logs.md — structured browser logging

Implementation: `src/lib/logger.js` (pino browser build).

## Configuration
| Variable | Default | Purpose |
|---|---|---|
| `VITE_LOG_LEVEL` | `debug` in dev, `warn` in prod | pino level |
| `VITE_APP_VERSION` | `1.0.0` | release tag used by alerts |

Logger base is `{ app: 'lumina-voice' }`; objects are emitted as JSON (`browser.asObject: true`).

## Emitted events
| Level | Where | Message |
|---|---|---|
| warn | `src/data/stream.js` | `now-playing fetch failed` (network/CORS), `now-playing HTTP error` (status + URL) |
| warn | `src/state/AppState.jsx` | `audio playback failed` (error + source URL) |
| error | `src/lib/logger.js` via `captureException` | `unhandled error` (window error, rejection, render error) |

Abort errors from polling are ignored. Keys, tokens and full URLs with credentials are never logged.

## Usage
```js
import { logger } from './lib/logger.js'
logger.warn({ station: 'lumina_voice', status: 404 }, 'now-playing HTTP error')
```

Verify by opening DevTools console on `/integrations` with the local AzuraCast offline.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
