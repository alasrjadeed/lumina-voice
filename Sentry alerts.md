# Sentry alerts.md — opt-in error alerting

Implementation: `src/lib/logger.js` + `src/main.jsx` + `src/ui/ErrorBoundary.jsx`.

## Configuration
| Variable | Default | Purpose |
|---|---|---|
| `VITE_SENTRY_DSN` | empty | Sentry DSN. Empty ⇒ SDK chunk is never downloaded and no alerts are sent. |
| `VITE_SENTRY_ENVIRONMENT` | `production` (`development` in dev) | Sentry environment |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | `0` | Performance tracing sample rate |
| `VITE_APP_VERSION` | `1.0.0` | Release tag |

`@sentry/browser` is a dynamic import; Vite emits it as a separate chunk that is fetched only when a DSN exists.

## Captured events
- `window` `error` and `unhandledrejection` → `captureException(error, { source })`
- React render errors in `ErrorBoundary.componentDidCatch` → `captureException(err, { source: 'ErrorBoundary', componentStack })`
- Every `captureException` also writes a pino `error` log, so offline users still get local diagnostics.

Stream HTTP/network failures and playback failures are logged as pino warnings, not sent as exceptions; set a DSN and watch those logs if you want alert rules for them.

## Local server note
Sentry must stay pointed at the production project. Do not attach `192.168.1.166:8080` or `192.168.1.166:4310` URLs as tags — they are LAN-only and not useful off-site. No API key or station secret is ever attached to an event.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
