# security.md — Lumina Voice threat model & controls

## 1. Architecture assumptions
- The app is a **static SPA**: everything in `dist/` is public, including JS.
- The only server-side trust boundary is **Supabase RLS**. Third parties: Cloudflare R2 (public media),
  AzuraCast/Icecast (public streams), archive.org (public import source).
- Therefore: **no secret ever ships in the bundle.** `VITE_*` vars are public by design.

## 2. Controls in place
| Area | Control | Where |
|---|---|---|
| Credentials | Supabase Auth owns hashes in protected `auth.users`; client never sees passwords | `data/api.js` |
| Data access | RLS on `profiles` + `stories`; writes require `role='admin'` | `SCHEMA_SQL` |
| Session | Access + refresh tokens in `localStorage['lumina-supabase-session-v1']`, auto-refresh ≤ 60 s skew, cleared on sign-out | `data/api.js` |
| Media | R2 objects are public read-only audio; no write credentials in client; URLs validated (`isLikelyAudioUrl`) before persistence | `api.js` |
| Stream keys | Station admin API key (`X-API-Key`) stored **locally only** in `lumina-stream-v1`, never logged, never sent anywhere but the station's own host | `data/stream.js` |
| Imports | archive.org accessed through dev proxy `/import-proxy/archive`; 12 s race timeouts; only metadata + audio URLs parsed, no HTML execution | `data/archive.js` |
| XSS surface | React default escaping; **no `dangerouslySetInnerHTML`**, no `eval`, no user HTML rendering; embed snippets are shown as **copyable text**, not injected | all pages |
| Service worker | Precache allowlist; navigations/network passthrough; caches deleted on version bump; inline recovery script prevents a stuck-broken cache | `public/sw.js`, `index.html` |
| Error handling | `ErrorBoundary` around heavy routes; data modules swallow storage errors instead of crashing | `ui/ErrorBoundary.jsx` |
| Repo hygiene | `.gitignore` excludes `**/.env*`, keys (`*.pem`, `*.key`), logs, AI tool dirs | `.gitignore` |
| Transport | All endpoints HTTPS in production; dev proxy only rewrites archive.org | `vite.config.js` |

## 3. Accepted risks / limitations (documented, not bugs)
1. **Anon key is public** — safe only because RLS governs every table. Never create a table without RLS.
2. **`role` escalation via `updateProfile`** — the client can PATCH its own profile row (RLS allows own-row
   update). Postgres RLS does **not** restrict which columns change, so a modified client could set
   `role='admin'` on its own row. Mitigations: (a) run an `revoke update on profiles` + column-level grant, or
   (b) trigger that pins `role` unless the caller is already admin. **Action item — see `Task.md`.**
3. **Demo auth** — local mode trusts an email containing `admin`; fine for offline demo, must never be the
   production auth path.
4. **OAuth stub** — the Google button on `Auth.jsx` is a fake guest login; ship a real provider before launch.
5. **localStorage tokens** are readable by any script on the origin → keep the origin free of third-party
   scripts (currently: Google Fonts only — consider self-hosting fonts to shrink this to zero).
6. **No CSP yet** — recommend adding:
   ```
   Content-Security-Policy: default-src 'self'; media-src 'self' https: data: blob:;
     connect-src 'self' https://*.supabase.co https://archive.org https://*.azuracast.host;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;
     img-src 'self' data: https:; frame-src 'self'; object-src 'none'; base-uri 'self'
   ```
   (Adjust hosts to the real deployment; `blob:` is required for local-file playback.)

## 4. Never do
- Store audio bytes, passwords, or Stripe/SMTP/AWS secrets in Supabase or the bundle.
- Send the R2/CDN or station admin key to any host other than its own.
- Render imported HTML/markdown as HTML.
- Disable RLS "just for testing" in a shared project.
- Log tokens, `apikey`, or full auth headers.

## 5. Incident playbook
1. Suspected key leak → rotate Supabase anon + any station API key; recreate R2 credentials.
2. Bad data writes → verify RLS policies in SQL editor (compare with `backend schema.md`).
3. App stuck/broken after deploy → bump SW cache names + `?v=` registration; users already have the
   inline "Reset and reload" recovery.
4. Revoked access → `signOut()` + delete session key; RLS denies on next request.

## 6. Pre-launch checklist
- [ ] Column-level protection (or trigger) for `profiles.role` (risk #2)
- [ ] Real OAuth provider; remove demo admin-email rule in production build
- [ ] CSP + `Strict-Transport-Security` + `X-Content-Type-Options: nosniff` headers at the host
- [ ] Self-hosted fonts (drop `fonts.googleapis.com` from `connect`/`style` origins)
- [ ] RLS test: non-admin client cannot `POST /rest/v1/stories`
- [ ] `.env` absent from `dist/` and from git history
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Local server & alerting (2026-11-17)
- AzuraCast admin key belongs in `.env` (`VITE_AZURACAST_API_KEY`) or the Integrations form — never in docs, logs or screenshots. The public `/api/nowplaying/{shortcode}` route needs no key and is preferred.
- The browser talks to `192.168.1.166:8080` directly; cross-origin reads require AzuraCast/CasaOS CORS or a proxy. Failures are logged without the key.
- `VITE_SENTRY_DSN` is public by design but should be a project DSN with only the needed environment. Set `VITE_SENTRY_TRACES_SAMPLE_RATE=0` unless tracing is needed.
- Never put LAN IPs in OG tags or public embeds; use the production domain.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
