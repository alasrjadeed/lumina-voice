# Rules.md — how we build Lumina Voice

Binding for every contributor and agent. Read `Brain.md` first, then this.

## Stack rules
1. React 19 + Vite 8 + react-router-dom 7 — **no** new runtime dependencies without removing one.
2. Plain CSS in `src/index.css` using tokens (`--bg`, `--gold`, `--radius`…). No Tailwind, no UI kit, no CSS-in-JS.
3. No backend SDKs — Supabase/Stripe/etc. only via plain `fetch` in `src/data/*`.
4. No icon fonts, no emoji icons — inline SVG from `src/ui/Icons.jsx`.
5. JSX via Vite/Oxc `automatic` — no esbuild config, no React/Babel plugin.

## Code rules
6. Layers: `pages` (views) → `state` (providers) → `data` (loaders) → `ui`/`art` (primitives). Never fetch inside `data` consumers' render path.
7. Every persisted value gets a namespaced key `lumina-<thing>-v1` owned by one module; add it to `Memory.md` in the same change.
8. Data modules must be **no-throw to the UI**: wrap storage/JSON parsing in try/catch and degrade to defaults.
9. `useApp()` must keep its no-throw default shape — components may render without a provider (ErrorBoundary pattern).
10. New user-visible state needs all four states: loading, empty, error, offline/locked.
11. No `any`-style blobs: name mapping functions (`mapStory`, `normaliseSession`) and keep snake_case → camelCase conversion at the data boundary only.
12. Routes go in `App.jsx` under `Guard`; nested/admin-only tools stay component-mounted (see `Memory.md` routing gotcha).

## Audio rules (product identity)
13. Catalogue audio is Archive.org-only. Bundled audio is limited to `ad-*`; no demo, house, local or custom story audio may be added to any catalogue.
14. One `<audio>` element only, owned by `AppState.jsx`. Never create players in pages.
15. Store direct `https://archive.org/download/<id>/<file>` URLs only. Never rewrite them through a media base or append `.opus`/`.m4a`.
16. Every source change must be race-guarded with `loadSeq`.

## Design rules
17. Tokens only — no hard-coded hex, no colours outside `Design.md`.
18. Display serif (Cormorant) for titles, Outfit for UI, Naskh for Urdu. Gold = emphasis/active, never body text.
19. Tap targets ≥ 44 px, icon buttons need `aria-label`, focus rings visible on dark.
20. Motion ≤ 220 ms ease-out; honour `prefers-reduced-motion`.

## Security & repo rules
21. Never commit `.env`, real keys, tokens, or `service.json`-style secrets (`.gitignore` covers `**/.env*`).
22. Secrets never reach the client — public publishable key + RLS only (see `security.md`).
23. Keep `*.py` asset scripts offline-only; don't commit generated audio that isn't referenced by the catalogue.

## Docs rules
24. Docs are part of the change: a new route/key/endpoint updates `Memory.md`; a flow change updates `app flow.md`; content-policy or SQL changes update `backend schema.md`, `DEPLOY.md`, `llms.txt` and `Auto mcp index.md`.
25. `Task.md` moves items todo → doing → done with the commit. `Brain.md` stays ≤ one screen.
26. One claim, one source: don't duplicate SQL/keys across docs — link to `backend schema.md` / `Memory.md`.
27. Checkboxes are status. Never delete a done item; move it to "Done".

## Definition of done
- `npm run build` passes, no console errors on Home / Title / Radio / Settings / Admin.
- Offline path still works (browse + one downloaded title).
- Docs in sync per rules 24–26.
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Observability & deployment rules (31–34)
31. Structured logs go through `src/lib/logger.js` (pino); never sprinkle `console.*` in new code.
32. Sentry calls must go through `captureException`/`captureMessage` and stay inert without `VITE_SENTRY_DSN`.
33. Never log API keys, tokens or full URLs containing credentials. Local endpoint is `http://192.168.1.166:8080` — never silent-fallback to port 80.
34. Deployment changes must update `DEPLOY.md`, `Auto mcp index.md` and this doc set in the same change.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
