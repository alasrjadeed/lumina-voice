# Architecture.md

## 1. High-level

```
┌─────────────────────────── Browser (PWA) ────────────────────────────┐
│  React 19 SPA · react-router 7 · plain CSS                          │
│  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │ pages/*    │ │ state/*   │ │ data/*   │ │ art/covers.jsx (SVG) │  │
│  │ (21 views) │◀│ Providers │◀│ loaders  │ │ procedural artwork   │  │
│  └────────────┘ └───────────┘ └──────────┘ └──────────────────────┘  │
│         │ single <audio> element (AppState)                         │
│         │ MessageChannel                                            │
│  ┌──────▼──────────────────────────────┐                            │
│  │ Service worker  public/sw.js        │  caches: shell/static/audio │
│  └─────────────────────────────────────┘                            │
└──────┬────────────────┬───────────────────┬─────────────────────────┘
       │ REST (fetch)   │ now-playing       │ media (cache-first)
┌──────▼──────┐  ┌──────▼───────────┐  ┌────▼──────────────────────┐
│  Supabase   │  │ AzuraCast /      │  │ Cloudflare R2  (or        │
│  Auth + PG  │  │ Icecast          │  │ bundled /public/audio)    │
│  (optional) │  │ (optional)       │  │ Opus 24–48k + AAC         │
└─────────────┘  └──────────────────┘  └───────────────────────────┘
```

All three backends are **optional**. Missing config degrades to the bundled offline catalogue.

## 2. Frontend layers

| Layer | Dir | Rule |
|---|---|---|
| Presentation | `src/pages`, `src/ui`, `src/art` | Dumb components; no fetch here except page-level loaders |
| State | `src/state` — `CatalogProvider` → `AppProvider` → `ArtworkProvider` → `BroadcastProvider` | Provider order in `App.jsx` matters; `useApp()` returns no-op defaults without a provider |
| Data | `src/data` | One module per concern; each owns its `localStorage` key |
| Build | `vite.config.js` | Vite/Oxc JSX automatic (no esbuild/React plugin), lazy route chunks, audio MIME middleware, `/import-proxy/archive` → archive.org |

## 3. Playback pipeline

1. `playEpisode / playRadio / playBroadcast / playExternal` in `AppState.jsx`.
2. `sourceList(assetId, {hq, lang})` (`data/media.js`) builds `<source>` order:
   `.opus` → `.lo.opus` (when `hq=false`) → `.m4a`; `lang:'en'` prefers `<asset>.en.*`.
   Local imports resolve to `local:` blobs from IndexedDB (`data/localMedia.js`).
3. `loadSeq` counter guards against race conditions on rapid track changes.
4. Events: `timeupdate` → `progress[titleId]`, `ended` → autoplay next (free or premium).
5. SW caches every same-origin audio request cache-first on first play.

External radio mounts (`.opus/.m4a/.mp3`) bypass the proxy and play directly.

## 4. Backend split

- **Supabase Auth** — credentials in `auth.users`; session in `localStorage['lumina-supabase-session-v1']`, refreshed 60 s before expiry.
- **Supabase Postgres** — `profiles` (1:1 with auth.users, `role`) and `stories` (catalogue text rows). RLS in `backend schema.md`.
- **Cloudflare R2** — audio objects; the app only stores `VITE_MEDIA_BASE_URL + key` as text.
- **AzuraCast / Icecast** — live radio now-playing + mounts, polled every 15 s (`state/useNowPlaying.js`).

No SDKs: everything is plain `fetch` in `src/data/api.js`.

## 5. Service worker (`public/sw.js`, registered `?v=5`)

| Cache | Holds |
|---|---|
| `lumina-shell-v5` | `index.html` + precached shell |
| `lumina-static-v5` | hashed `/assets/*`, Google Fonts (stale-while-revalidate) |
| `lumina-audio-v1` | downloaded/streamed audio (cache-first) |

Message API (from `src/pwa.js`): `CACHE_AUDIO`, `DELETE_AUDIO`, `AUDIO_STATUS`, `CLEAR_AUDIO`, `SKIP_WAITING`.
Navigations, `/src/*` and `/import-proxy/*` always hit the network. `index.html` contains an inline
recovery script (`lumina-sw-bust`) that wipes SW+caches on module-load failures.

## 6. Broadcast engine

`state/Broadcast.jsx` runs a 1-second tick over the schedule produced by `data/broadcast.js`
(dayparts → 7 shows → rotation items), injects station IDs/jingles, fires ad breaks from
`data/ads.js` every `adConfig.everyMin` (default 30 min, 120 s break), and persists everything to
`lumina-broadcast-v1`. Two modes: `ai` (generated schedule) and `manual` (desk queue).
---
Broadcast: autobiography category and routing added.

## 7. Local broadcast deployment + observability
```
CasaOS host 192.168.1.166
 :80   CasaOS UI
 :8080 AzuraCast (API /api/nowplaying/{shortcode}, mounts /listen/...)
 :4310 Lumina Voice nginx container (built from Dockerfile)
```
- `src/data/stream.js` normalises the two bases: API `baseUrl`, listener `streamBaseUrl`; a `listenUrl` override wins. Fallback: `/api/nowplaying` list when the shortcode route 404s.
- `'audio/mpeg'` is used for extensionless `/live` mounts; `playExternal` passes the codec's MIME through `loadOpus`.
- `src/lib/logger.js` = pino structured logs; Sentry is loaded only when `VITE_SENTRY_DSN` is set. Global `error`/`unhandledrejection` and `ErrorBoundary` funnel into `captureException`.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
