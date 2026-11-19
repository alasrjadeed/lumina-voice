# Memory.md — persistent project facts

Facts an agent must not rediscover. Read before changing anything.

## Identity
- Name: `lumina-voice`, version `1.0.0`, `"private": true`, ESM (`"type": "module"`).
- Dev/preview: `0.0.0.0:4310` (`strictPort` — never falls back; 5173 was abandoned as already used); `allowedHosts: ['.monkeycode-ai.live']`; HMR is **off** (`hmr:false`).
- Build: `npm run build` → `dist/` (default Vite output).
- Verify: `npm test` (vitest, `tests/*.test.js`), `npm run lint` (ESLint flat config `eslint.config.js`); CI runs both + build (`.github/workflows/ci.yml`).
- No React plugin or esbuild config: Vite 8 handles JSX via Oxc (`automatic`); route pages are lazy-loaded with `React.lazy` + `Suspense` in `src/App.jsx`.

## Environment (`.env.example` → `.env`)
| Var | Purpose |
|---|---|
| `VITE_MEDIA_BASE_URL` | Legacy bare-key resolver for non-catalogue media. Archive.org streams are absolute and never use it. |
| `VITE_SUPABASE_URL` | Supabase REST endpoint (`https://ueiwzhjruyijtssysekq.supabase.co`, project `luminavoice`, ap-northeast-1). Empty ⇒ archive-only catalogue, local demo auth. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public key from Supabase → Connect → Framework → React → Vite (`sb_publishable_...`). Safe in static builds. |
| `VITE_SUPABASE_ANON_KEY` | Legacy anon JWT, accepted as fallback when no publishable key is set. |
| Root `.env` | Public Supabase vars only; generated from `.env.local` for `docker-compose` build args. Git-ignored, never holds the service-role key. |
| `VITE_STRIPE_PAYMENT_LINK` | Stripe Payment Link for Lumina Plus checkout. Empty ⇒ demo membership toggle. Link's success URL must be `/?checkout=success`. |

## localStorage / sessionStorage keys (all `lumina-*-v1`)
| Key | Module | Holds |
|---|---|---|
| `lumina-voice-v1` | `state/AppState.jsx` | `{user, library, progress, premium, downloads, autoplay, hq, language}` |
| `lumina-supabase-session-v1` | `data/api.js` | access/refresh tokens + user |
| `lumina-broadcast-v1` | `state/Broadcast.jsx` | schedule, rotation, rules, campaigns, plays, adConfig |
| `lumina-artwork-v1` | `state/Artwork.jsx` | cover/portrait overrides |
| `lumina-user-catalog-v1` | `data/userCatalog.js` | Archive.org-only user titles/authors/poets, sanitised on load/save |
| `lumina-content-policy-v1` | `data/userCatalog.js` | migration marker (`archive-only-2`) for one-time device cleanup |
| `lumina-cloud-catalogue-v1` | `data/cloudCatalogue.js` | last good `/catalogue.json` snapshot (metadata only) so the catalogue survives no signal |
| `lumina-voice-studio-v1` | `data/voiceStudio.js` | narrator assignments, accents, language lock |
| `lumina-file-library-v1` | `data/fileLibrary.js` | grouping prefs, renames |
| `lumina-stream-v2` / `lumina-stream-quality-v1` | `data/stream.js` | local AzuraCast config / preferred mount (v2 replaced v1 on 2026-11-17) |
| `lumina-media-base` | `data/media.js` | runtime media base override |
| `lumina-sw-bust` (sessionStorage) | `index.html` | SW error-recovery flag |
| IndexedDB `lumina-local-media-v1`, store `files` | `data/localMedia.js` | legacy local blobs (not catalogue audio; archive-only policy rejects local imports) |

## Service worker caches
`lumina-shell-v7`, `lumina-static-v7`, `lumina-audio-v1` — registered as `/sw.js?v=7`.
Bumping the cache name is how a stale-cache bug ships. The `v7` bump forces devices off the old demo catalogue.

## Audio conventions
- Catalogue audio is direct `https://archive.org/download/<id>/<file>.{mp3,opus,...}`; no local story audio is shipped.
- Only `ad-*` files and the gated `radio-live.*` desk remain in `public/audio/`; `scripts/prune-native-audio.mjs` keeps only `ad-*` in the APK.
- Downloaded Archive streams are cached by the service worker; the app shell, state and ads work offline without an account.
- Legacy generators (`make-opus.py`, `make-samples.py`, `make-ads.py`) are not used for new catalogue content.

## Auth gotchas
- Fixed demo studio login: username `admin` + password `admin123` (demo only, no backend). Handled in `Auth.jsx` submit before email validation; wrong password shows "Demo studio password is admin123."
- Any email may sign in; **only** `info@alasarjadeed.com` is admin in local/demo and Supabase modes. `roleForEmail()` in `src/config/auth.js` is the only client decision; profile role and `admin`-looking addresses are ignored.
- Server-side admin RLS must use `public.is_operator()` from `docs/supabase-admin-lockdown.sql`; profile role is not trustworthy for writes.
- `Guard` redirects to `/auth` for every route except `/settings` and `/site`.
- `/radio?embed=1` exists only in the gated source; with radio off it redirects to `/`.

## Routing gotchas
- Routed in `App.jsx`: `/auth`, `/`, `/explore`, `/genre/:name`, `/kind/:name`, `/search`,
  `/title/:id`, `/series/:id`, `/person/:id`, `/radio`, `/now`, `/library`, `/settings`, `/admin`.
- **Not routed** (mounted as components): `Advertising`, `Integrations`, `VoiceCorrector`,
  `FileLibrary`, `Catalog.jsx` → tabs inside `Admin.jsx`; `ImportStudio`, `ArtworkStudio` → inside `Settings.jsx`.

## Hard-coded external endpoints
- archive.org metadata/search, proxied in dev via `/import-proxy/archive` (25 s timeout).
- Catalogue streams: `https://archive.org/download/{id}/{file}` (canonical host only; `www.` is rewritten).
- Archive covers: `https://archive.org/services/img/{id}`.
- Google Fonts: Cormorant Garamond, Noto Naskh Arabic, Outfit.
- AzuraCast `{base}/api/nowplaying/{shortcode}`; Icecast `{base}/status-json.xsl`.

## Known traps
- `scripts/make-opus.py` output path is `/workspace/public/audio` (container path, not local).
- Directory name has a trailing space: `Lumina Voice ` — quote paths in shell commands.
- Settings (`src/pages/Settings.jsx`) is grouped (`.set-group`); ImportStudio/ArtworkStudio render collapsed by default (`.studio-compact`) with `open` state inside each component — their bodies only mount when open.
- `ImportStudio` takes an `admin` prop (used by the `/admin` "Add content" tab): episode rows in the builder only become episodes if they have an audio URL; edits sync into an existing rotation item via `broadcast.updateRotation`.
- Broadcast Studio redesign: `Admin.jsx` overview uses `.deck` layout; schedule has rows/week-grid toggle; `Broadcast.jsx` exposes `moveRotation(id, dir)`; logs use relative timestamps + severity chips. New CSS block appended at end of `index.css` (deck/week-grid/daypart-strip/log-tools + global `:focus-visible` + `prefers-reduced-motion`).

## Lumina Bot & PipeWire
- `scripts/pw-bridge.mjs` (port 4311) → probed **directly** by the client (not through the Vite proxy). Toggle persisted at `lumina-pw-link`, **default off**. Without the bridge the header falls back to simulated status — never assume `b.pw.available`.
- AI providers (`src/ai/*`): keys in `lumina-ai-keys`, budget in `lumina-ai-budget` (default 200k/day/agent), usage in `lumina-ai-usage` (auto-resets by date). `runPipeline` returns `{provider:'offline'}` when all agents fail — the offline agent in `brain.js` handles report/repair/rebuild/status/skip/takeover intents without any key.
- Control authority: `b.authority {owner, shifts}` → `controlOwnerAt(now)` resolves 'human'|'bot'|'both'. ALL bot desk actions must go through `b.runBotAction(tool, args, force)` — force=true only after explicit human approval in the UI. Bot actions log at 'ai' level; denials at 'warn'.
- LuminaBot page = `src/pages/LuminaBot.jsx`, mounted as admin tab 'bot'. Bot replies are JSON `{reply, actions}` parsed by `parseBotJson` (tolerates code fences).
- AI services live in Settings (`AIServices.jsx`, admin tab "Settings → AI services"). Custom providers: `lumina-ai-custom` = `[{id,name,baseUrl,model,key}]`; pipeline auto-appends `/chat/completions` to baseUrl. `runPipeline(messages, keys)` merges custom keys over built-in keys. Bot page holds no key inputs anymore — only a link to Settings.

## Hybrid device-first runtime & website
- Device voice: `src/ai/deviceVoice.js` — `speak/listVoicesAsync/listenOnce/parseVoiceCommand`, plus `prepareSpeechText`, `speechRate`, `rankVoices`; prefs in `lumina-device-voice` `{announce, commands, voiceURI, rate, pitch}`. Browsers use `speechSynthesis`; the tablet uses the local Capacitor `UrduTts` plugin (Android `TextToSpeech`) because Android WebView has no `speechSynthesis`. STT = webkitSpeechRecognition (Chrome). No provider involvement — the bot's cloud providers are enhancement only; offline agent + device voice keep the app fully functional with zero keys.
- Urdu speech quality: `prepareSpeechText` converts Latin digits to Urdu digits, normalises `؟ ، ؛ !`, turns a trailing `…` into `۔` and a mid-sentence one into `،`, strips markup and collapses spaces. `speechRate(1, 'ur-PK') = 0.95`, pitch defaults to 1. Auto voice selection prefers a local, named `ur-PK` voice (on this tablet `ur-pk-x-cfn-local`) over network/generic voices.
- Public site at `/site` (outside Guard, no login). Content: `src/data/site.js` (`lumina-site-config`), edited by admin tab 'website'. Logged-out Guard sends visitors to `/site` (only `/settings` and `/site` are exempt). Same localStorage auth (`lumina-voice-v1`) = one profile across site, app, studio.
- `.cover-art` is `position:absolute; inset:0` — any wrapper MUST be `position:relative` with explicit size (site cards use `.site-card-art` aspect-ratio:1), otherwise the SVG overlays the page and blocks clicks.
- Playwright gotchas: `page.goto` reloads the SPA and clears in-memory `now` state (navigate client-side instead — the radio page's button is **`Listen live`**, there is no `.round-play` there); `getByRole('button', {name:'Test'})` on Settings matches the device-voice Test first — scope with `.locator('.set-row', {hasText:'Google Gemini'})`; tab labels carry count badges, so use `/^Content/` not an exact match.

## Live Supabase backend (project ueiwzhjruyijtssysekq)
- Config in `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (legacy anon JWT). Secret key is never in frontend env — used only for admin-API/psql from the terminal.
- DB access: direct host resolves IPv6-only here; use the session pooler `aws-0-ap-northeast-1.pooler.supabase.com:5432` with user `postgres.ueiwzhjruyijtssysekq` (Node `pg` from /tmp/opencode/psqlrun — psql not installed).
- Tables created via psql need explicit GRANTs to `anon`/`authenticated` (dashboard-created tables get them automatically; psql ones don't → 429/403 confusion). Also applied: signup trigger, RLS policies.
- Studio operator: `info@alasarjadeed.com` / `Aroojaamir@1` (role=admin in profiles; renamed from `admin@luminavoice.app`, which no longer authenticates). Demo `admin`/`admin123` offline fallback password also changed to `Aroojaamir@1`. Free-tier signup hits `over_email_send_rate_limit` (2/hour) — create test users via `POST /auth/v1/admin/users` with the secret key and `email_confirm:true`.
- Dev deps on this box: pipewire is **opt-in** now (see the PipeWire section) — no probe unless `lumina-pw-link === 'on'`, so the old "/pipewire 500s" symptom is gone. `pg` installed only in /tmp/opencode/psqlrun.

## Archive.org streaming test
- Direct stream URL form: `https://archive.org/download/<id>/<file>.mp3`. Import Studio accepts an Archive item URL, identifier or search phrase and stores only the resolved URL; non-Archive/custom URLs and local files are rejected.
- Storage stays tiny: the library row in `lumina-user-catalog-v1` is a URL pointer; audio bytes are never stored in Supabase or the transfer bundle.
- Import Studio panel starts collapsed — click "Add content" before looking for the source input.

## archive.org stream stalls (fixed)
- `archive.org/download/<id>/<file>` 302-redirects to a RANDOM storage node. Slow/dead nodes (`dn*.ca.archive.org`, ~20 KB/s) make the `<audio>` element starve → playback mutes/stops mid-track (~1:14 on the Nisa item). Healthy primaries are named in `archive.org/metadata/<id>` as `d1` + `dir` (600–700 KB/s).
- Fix: `fastArchiveStream(url)` in `src/data/archive.js` rebuilds `https://<d1><dir>/<file>`; called from `loadOpus` in AppState for any archive.org/download URL, falling back to the original on failure.
- Speed (2026-11-18): the resolved `{d1, dir}` pair is cached per item in a module `Map` (including failed lookups) and `warmArchiveStream()` is called for the first two episodes in `Title.jsx`. Do not remove the cache — the metadata call cost 1.326 s on the tablet; with warming, first sound is ~0.89 s and the next play ~0.51 s.
- Stall watchdog in the AppState audio effect: if a playing element makes no progress for ~8s (and its buffer isn't healthy), it re-requests once, then retries up to 2× before surfacing 'The stream stopped responding'.

## Subtitles / captions
- `src/data/subtitles.js` is the single source of truth. `SUBTITLE_LANGS` (ar/en/ur with `dir`) — **adding a language is one line there**; the player and the admin studio both read the registry, so nothing else needs touching.
- Cues are stored per title per language on the device under `lumina-subtitles`; the chosen language per title is `lumina-subtitle-prefs`. There is no server table for subtitles — the app stays offline-capable and no content is uploaded.
- Supabase connection (2026-11-18): connected via Supabase → Connect → **Framework → React → Vite**. `npm run build` uses `.env.local`; Docker takes the public vars as build args from root `.env` (created with `grep '^VITE_SUPABASE_' .env.local > .env`). The app keeps its tiny fetch client — no `@supabase/supabase-js` dependency. `isOfflineError()` lets sign-in fall back to the local demo account with no signal. Never pass the service-role key.
- Supabase keep-alive (2026-11-18): `.github/workflows/supabase-keepalive.yml` pings auth + REST daily at 04:17 UTC so the free project is never paused for inactivity. Uses the public URL/publishable key inline (safe by design) with optional repo secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` as overrides. GitHub disables scheduled workflows after 60 days of no repo activity — keep committing or use `workflow_dispatch` occasionally.
- Project website (2026-11-18): `docs/index.html` is a self-contained static landing page published by GitHub Pages from `main` `/docs` at https://alasrjadeed.github.io/lumina-voice/. It is a project site, not the app; the app itself is not hosted there. Keep it dependency-free and update it when the repo URL or feature list changes.
- Supabase admin panel (2026-11-18): `src/pages/SupabaseAdmin.jsx` is the single source of truth, shown as a tab in both `DeviceAdmin.jsx` (active while radio is off) and `Admin.jsx` (radio on). It queries all four tables (`profiles`, `stories`, `ratings`, `reviews`) on a health check and exposes profile role changes; story CRUD + review moderation remain in `Catalog.jsx`. Keep new Supabase admin UI here, not duplicated in `Admin.jsx`.
- Cloud catalogue delivery (2026-11-19): the local website stays full-featured/private; Admin → Cloud catalogue is the only editor for Archive.org story links and has a `published` draft/live switch (`docs/supabase-cloud-catalogue.sql`). `npm run catalogue:export` skips drafts, reads `stories` with the publishable key and writes `public/catalogue.json`; `scripts/install-catalogue-cron.sh` installs a 15-minute cron. nginx serves the file with `no-store` via a bind mount, so no rebuild is needed. `src/data/cloudCatalogue.js` maps each row to one app title + one episode and derives the single `Audiobook · archive.org` details link. `CatalogProvider` fetches on mount, resume and every 15 minutes, plus Realtime; failures keep the cached copy. The APK uses `VITE_CATALOGUE_SNAPSHOT_URL=http://192.168.1.152:4310/catalogue.json` because its own origin is a bundled asset host; the native WebView allows that one cleartext LAN fetch and nginx sends CORS headers. No audio bytes and no service-role key are involved.
- Realtime (2026-11-18): `src/data/realtime.js` is a plain WebSocket Phoenix client (`phx_join` on `realtime:public`, `event: 'postgres_changes'`), with heartbeat, reconnect, token refresh and unsubscribe. `parseChange()` is unit-tested. Wrong event name `phoenix_join` returns `unmatched topic`; heartbeat returns `status: ok`. Wire new tables in the `TABLES` array and call `subscribeToChanges()` from the owning page/state.
- Cross-device metadata sync (2026-11-19): `user_state` holds `library`, `progress`, `history` JSON **plus the full metadata bundle** under `progress.__sync_bundle` (imported Archive titles, artwork, subtitles, history, settings — never audio bytes). This avoids a new SQL column. SQL lives in `docs/supabase-user-state.sql` — includes the easy-to-miss `grant select, insert, update, delete on public.user_state to authenticated;` and realtime publication. `src/data/userState.js` fetches/upserts/merges; `AppState` pulls on sign-in and realtime, pushes `exportBundle()` debounced (1.5 s), every 30 s, and on hide. `cloudReady` state gates all writes until the initial cloud read finishes, so a fresh device cannot overwrite good data; imported-title IDs from the bundle are added to `validIds` so they are not dropped as stale. `CatalogProvider` merges remote imports into live state via `lumina:catalog-sync`. `CLIENT_ID` prevents own-write echo. Merge is add-only (union/newest/dedupe) by design, so deletes on one device do not remove from the other. Verified: clean web localStorage pulled tablet's 11 titles + 10 imports; cloud row stayed intact.
- Local web at `127.0.0.1:4310` is the **Docker** container. After code changes, `docker-compose up -d --build` is required before browser testing — a local `npm run build` does not update it. This was the reason a `user_state` GET/POST appeared missing during debugging.
- Archive playback (2026-11-18): `fastArchiveStream()` metadata `d1` node can be stale and stall a whole item (Harry Potter 18-chapter import) while `https://archive.org/download/...` redirects to a working node. `loadOpus` now keeps both candidates, tries canonical first, and has a 15 s watchdog that switches to the direct node only when no bytes arrive. On-device CDP verified Chapter 01 played and kept buffering. Keep both candidates — removing either reintroduces a one-node failure.
- Operator account to remember: `info@alasarjadeed.com` (already in `src/config/auth.js` as the local demo admin; Supabase `profiles.role = 'admin'`). `roleForEmail()` is the only role decision: this exact email is admin, every other signed-in email is a listener, even if its profile row says `admin` or its address contains "admin". `hasPremium` grants Plus from that identity even when saved `premium` is false. Do not duplicate the password into docs; it is already in the tracked config.
- Supabase lockdown migration lives at `docs/supabase-admin-lockdown.sql`. It must be run in the Supabase SQL Editor (dashboard auth was not available to the agent); it repairs stale `smoke1`-style admin rows and makes stories RLS use `public.is_operator()` instead of the writable profile role.
- Cross-platform sharing is intentional: the tablet is not a silo. Same Supabase project/Realtime for metadata on web/tablet, and `/transfer` JSON for offline or cross-device migration. Never add an Android-only admin path.
- Web audio (2026-11-18): never route a cross-origin stream through `createMediaElementSource()` without CORS — Chrome mutes it. Archive.org sends ACAO only from `archive.org` and its storage nodes, not from the first `www.archive.org` redirect, so canonicalize `www.` URLs and set `crossOrigin="anonymous"` for archive hosts only. Non-CORS external audio stays plain media + decorative pulse. Do not remove this distinction.
- PWA install: do not `preventDefault()` on `beforeinstallprompt` unless calling `prompt()` immediately; otherwise Chrome logs "Banner not shown" and suppresses its banner. Deferred Settings button still works where supported.

## Archive-only content policy (2026-11-18)
- `src/data/contentPolicy.js` is the only place that decides whether content is publishable: a title needs at least one direct `https://archive.org/download/<id>/<audio-file>` URL. `www.` is canonicalised to `archive.org` so CORS and Supabase rows match.
- `src/data/catalog.js` ships only `selected-ghazals-of-ghalib` (35 LibriVox MP3 episodes) plus one poet; demo/house audio, Harry Potter shells, demo people/series and empty shelves were removed. `src/data/generated/archiveLibrary.js` remains empty (0 rights-cleared records).
- `src/data/userCatalog.js` sanitises on load/save and writes `lumina-content-policy-v1 = archive-only-2` after one cleanup; library, progress, history and ad data are untouched.
- `src/data/playability.js`, `src/state/Catalog.jsx`, Import Studio, Catalog admin, Home and `src/data/api.js` all use the same gate. Cloud `stories` rows with non-Archive audio are filtered on read and rejected on write.
- `docs/supabase-archive-only.sql` deletes old non-Archive cloud rows and adds `stories_archive_audio_url_chk`; it must be run in the Supabase SQL Editor alongside the admin-lockdown migration.
- `src/data/syncBundle.js` no longer transfers audio bytes (`audio: []`) and sanitises catalog entries on export/import. DataTransfer UI has no audio toggle.
- Auto captions (2026-11-18): `prefFor()` returns `null` for Auto, `'off'` for off, otherwise a language code. `autoTrackFor()` picks the first saved track in Urdu→English→Arabic order; NowPlaying reads it on mount and route change. Live transcription of the playing audio is not possible here: `SpeechRecognition` in the Android WebView has no `audio` property and `getUserMedia({audio:true})` is denied, so captions are saved-track playback only.
- `parseSubtitle()` swallows both SRT and WebVTT (BOM, CRLF, cue ids, NOTE/STYLE blocks, numeric counters), strips `<i>`/`<b>`/ASS overrides, drops inverted ranges, and sorts by start.
- `cueAt()` treats `end` as EXCLUSIVE (`t >= c.end` advances). A cue vanishes exactly on its stated end time.
- Auto-translation goes through `runPipeline` (free providers only), 25 cues per call, timings never change, a cue whose line is missing keeps its ORIGINAL text rather than being dropped, and the result is saved with `source: 'machine'`.
- The overlay is `position: fixed` pinned to the bottom (84px up on phones so it clears the control bar). It must NOT live inside `.full-player` — that column is `justify-content: center`, so an extra child overflows past the top of the viewport (the original bug: `y = -133`).

## Ratings & reviews
- Tables `ratings` / `reviews`, both `unique(user_id, title_id)` → one per user per title. The app writes with `POST ...?on_conflict=user_id,title_id` + `Prefer: resolution=merge-duplicates,return=representation`, so re-rating updates in place instead of 409-ing.
- RLS: `select` is public (signed-out visitors read reviews); write policies are `auth.uid() = user_id`. A cross-user UPDATE/DELETE returns **200 with 0 rows affected** — RLS filters silently, it does not error. Assert on the row count, not the status code.
- `src/data/ratings.js` mirrors every write to `lumina-ratings` / `lumina-reviews` so an offline write shows immediately; `mergeLocal()` folds those in and remote rows win on conflict.
- Only registered users get the form; everyone else sees `.rev-gate` with a link to /auth.
- Making test users costs no email: insert into `auth.users` (columns `id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, email_change, email_change_token_new, recovery_token, created_at, updated_at`) with `crypt(pw, gen_salt('bf'))`, THEN insert the matching `auth.identities` row (`provider: 'email'`). `confirmed_at` and `identities.email` are GENERATED columns — never insert them. Skip the identities row and the password grant fails with "Database error querying schema".

## Local tooling
- `/tmp/opencode` is wiped between sessions. Anything worth keeping (smokes, psql scripts) must be recreated; the app source is what persists.
- Working smokes: `/tmp/opencode/smoke-ratings.mjs` (30 checks, ratings + reviews + subtitle studio + overlay), `/tmp/opencode/smoke-regression.mjs` (26 checks, routes/site/admin/archive/bridge/reduced-motion), `/tmp/opencode/psqlrun/rls-test.mjs` (20 RLS checks). All use the public anon key only.
- `pg` must be installed in `/tmp/opencode` with a `{"type":"module"}` package.json.
- Dev server: `npx vite --host 0.0.0.0 --port 4310`; PipeWire bridge: `node scripts/pw-bridge.mjs` (port 4311). Both need restarting after a wipe.

## Editing title content (Admin → Content)
- `src/pages/TitleEditor.jsx` + a per-device override layer. The studio can now rewrite any title, **including the built-in catalogue** — `patchImportedTitle` only ever reached user-imported titles, which was the gap.
- Mechanics: bundled titles are never mutated. Their edits go into `overrides[titleId]` inside `lumina-user-catalog-v1`, and `merge()` in `src/state/Catalog.jsx` applies `{ ...t, ...overrides[t.id] }` after concatenating bundled + imported. Imported titles keep editing in place as before.
- `EDITABLE_TITLE_FIELDS` is the whitelist — `id`, `episodes`, and asset ids are deliberately absent, so no UI path can detach a title from its audio. Extend that array to make a new field editable; nothing else needs changing.
- `sanitiseTitlePatch()` normalises on the way in: genres split on commas + trimmed + de-duped, a non-numeric year is dropped rather than written as NaN, `featured`/`top` coerced to booleans, strings trimmed.
- Covers reuse the existing artwork store (`lumina-artwork-v1`) via `useArtwork().setCover`, and `coverFor()` checks that store before `title.coverUrl` — so a cover set here wins everywhere the title is drawn. Archive.org item links are resolved through `archiveCoverUrl()` to `/services/img/<id>`.
- **Seeding gotcha:** the draft must be seeded during render and tracked with a `seededFor` id, NOT in a `useEffect` keyed on the title object. `titles` is rebuilt with fresh object identities on every catalog change, so an effect depending on `title` re-seeds on each keystroke and wipes what the operator is typing. Rendering the form branch also has to tolerate `draft === null` on the first pass (`!open || !draft`), or the first click throws `Cannot read properties of null`.
- Admin Content tab is `getByRole('tab', { name: /^Content/ })` in Playwright — an exact `'Content'` match collides with both "Add content" and the "Content 30" badge.

## Quran catalogues, genres & metadata
- [x] Quran Kareem is a **genre, kind, broadcast category and catalogue** at once, plus a `quran-kareem` show; `auto-mix` includes `quran`. `catalogueForTitle()` / `categoryForTitle()` do the routing.
- **Any title with "Quran" in its name auto-files into Quran Kareem** — `catalogueForTitle`, `categoryForTitle` and the `metadata.js` rule all test the name as well as genre/kind, which is why the Quran rule sits first and broadest in `RULES`. Match the apostrophe forms too: `/qur['’ʻ]?an/i`, or `Qur’an with Tarjuma` (typographic apostrophe) slips through to Drama.
- **`quran-urdu` was removed.** The Urdu translation is a *title* (`quran-urdu-01`), not a separate catalogue — there is no `quran-urdu` catalogue id any more, and the `parent`/`rootCatalogues`/`childCatalogues` nesting is gone. The single **`quran` catalogue now lists every Quran genre** (`Quran Kareem`, `Tilawat`, `Urdu Translation`, `Tafsir`), so picking it ticks all four pills. `catalogueForTitle` returns `quran` for anything Quran.
- The **catalogue selector sets genre + kind together**; hand-editing either one resets the catalogue back to automatic. Don't "helpfully" sync them elsewhere.
- `categoryForTitle` precedence: `quran` (genre *or* kind) → `Audiobook` → genre order (Espionage/Crime/Comedy/Poetry/Drama) → `drama`.
- Custom genres live in `userCatalog.genres`, sanitised, merged with bundled genres **plus any genre a title already carries**. A genre with no titles must NOT render an empty Explore shelf.
- Genre is a **pill picker** (`src/ui/GenrePicker.jsx`), not a `<select>`, in both ImportStudio and TitleEditor.
- `src/data/metadata.js` is the auto-fill brain (`completeMetadata`, `classify`), wired into `applyArchiveItem` and the local-file `completedForm()`. Classification precedence: `quran-translation → tafsir → quran → poetry → comedy → espionage → crime → drama`.
- **Genre and kind shelves show imported titles too.** `Explore.jsx`, `Genre.jsx` and `Kind.jsx` must NOT filter `!t.imported` — that filter made a shelf look empty right after an import. "Added from Settings" on Explore is the *manage* view, not the only place an import appears.
- Bundled Quran titles: `quran-01` Surah Yaseen, `quran-urdu-01` Holy Quran Urdu Translation, `tafsir-01` Tafsir — Surah An-Nisa. People: `qari-abdul-basit` (Reciter), `maulana-waheed` (Translator). Audio is **placeholders copied from `nazm-01`** — this box has neither `ffmpeg` nor `edge-tts`, so `scripts/make-opus.py` cannot run here. Re-render `quran-01`, `quran-urdu-01`, `tafsir-01` (`.opus`/`.lo.opus`/`.m4a`) whenever recording is possible.
- The Quran mark is reused as `QuranMark` in `covers.jsx` and `IcoQuran` in `Icons.jsx`; it is drawn **inside** `CoverSvg` (not an overlay) so every call site gets it with no positioned wrapper.

## Player queue (volume / shuffle / repeat)
- Defaults `repeat:'off'`, `volume:1`, `muted:false`, `shuffle:false`, `rate:1`, stored in `lumina-voice-v1`.
- **Repeat is ONE button with three states** (off → all → one), matching a car stereo.
- **Shuffle picks a random *other* part of the same title**; repeat-all wraps to the first part; repeat-one restarts the track — it does not advance the queue.
- `onEnd` must read shuffle/repeat through **refs** (`shuffleRef`, `repeatRef`). The listener is bound once per track, so a direct closure read goes stale.
- Volume is the only control that always applies, so it also renders on live radio; shuffle/repeat/settings/seek are episode-only, and live radio has no seek at all. Keep it light — resist adding more here.

## Grid rows (the "gap between text" class of bug)
- `.rot-row` is `6px auto minmax(0,1fr) auto auto auto` with the two row buttons living in a single `.rot-actions` cell. A grid declaring N columns but rendering >N children silently wraps into an implicit row — that is what made rotation rows 118px tall with a 725px dead cell.
- Phones (≤640px) use explicit `grid-row`/`grid-column` for a deliberate two-line layout (116px).
- Audit heuristic: a fixed-column grid whose **visible child count exceeds the declared column count** is the bug. `repeat(auto-fit, …)` templates and even child counts fill complete rows and are **not** bugs — `stat-grid`, `control-grid` and `import-grid` are all fine.

## PipeWire (optional, opt-in)
- `pwEnabled` defaults to **false** unless `lumina-pw-link === 'on'`. It is opt-in so a normal install never probes a closed port.
- `src/data/pipewire.js` probes the bridge **directly** at `${location.protocol}//${location.hostname}:4311/pipewire`, bypassing the Vite proxy — a refused connection is then an ordinary network error instead of a logged 500. Module-level `unavailable` + `inflight` guards stop repeat probes (StrictMode double-mounts the provider) and stop polling once known-down.
- `resetPwStatusCache()` re-arms the check; it is called from the Studio toggle so an operator who has just started the bridge needn't reload.
- Vite `/pipewire` proxies (dev *and* preview) carry `configure: (proxy) => proxy.on('error', () => {})`. Still, the only fully clean answer is not sending the request.
---
- Autobiography broadcast category (#c9b48a); categoryForTitle routes Autobiography/Memoir.

## Local broadcast + observability (2026-11-17)
- Host: CasaOS `192.168.1.166:80`, AzuraCast `192.168.1.166:8080`, web app `192.168.1.166:4310`. Station shortcode `lumina_voice`, id `2`.
- Stream config key is now `lumina-stream-v2` (old `-v1` intentionally ignored so local defaults apply).
- `defaultStreamConfig` reads `VITE_AZURACAST_BASE_URL`, `VITE_STREAM_LISTEN_BASE`, `VITE_AZURACAST_SHORTCODE`, `VITE_AZURACAST_STATION_ID`, `VITE_AZURACAST_API_KEY`, `VITE_STREAM_LISTEN_URL`; it falls back to the browser hostname + `:8080`.
- `VITE_SENTRY_DSN` unset ⇒ zero alert network traffic. `VITE_LOG_LEVEL` defaults `debug` in dev, `warn` in prod. Sentry is a dynamic-import chunk loaded only when configured.
- Deploy: `docker-compose up -d --build`; nginx does SPA `try_files` fallback; `/media-index` is dev-only and returns 404 in the image.
- Server was unreachable from the dev machine at the time of the update; endpoints were verified earlier (`/api/status`, `/api/stations`).

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` opens the radio-free Device Admin for admins), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.

## Native tablet sign-off (2026-11-17)
- Capacitor 8 APK (`com.luminavoice.app`, `android/app/build/outputs/apk/debug/app-debug.apk`) installed on `iPadAirPro` / `0102MT2504242159060`.
- CDP audit over `adb forward tcp:9222 localabstract:webview_devtools_remote_<PID>`: `/`, `/now`, `/library`, `/settings`, `/site` render; `/admin` and `/radio` redirect to `/`; 48×48 px bottom-nav targets; zero radio strings or `/admin`, `/radio` links; no horizontal overflow.
- Landscape (user rotation 1): `appDir: row`, sidebar visible, bottom nav hidden, no overflow. Portrait restored (rotation 0) afterwards.
- Bundled audio plays from `https://localhost/audio/raat-01.opus`; with airplane mode on it still advances (`paused: false`) and pages load from the service worker. WebView keeps `navigator.onLine` true in airplane mode, so the cosmetic offline banner does not appear — functional offline playback is unaffected.
- Final checks passed: lint clean, 97/97 tests, production build clean (main chunk 315.64 KB / 100.45 KB gzip).

## Device-local admin login (2026-11-17)
- `src/config/auth.js` holds the bundled operator account `info@alasarjadeed.com` / `Aroojaamir@1`; `admin` is accepted as an alias in local-demo mode.
- Auth page hint prefills both fields; a wrong password is rejected. Login resolves to `{ email: 'info@alasarjadeed.com', role: 'admin' }` and premium access.
- This is a device-local demo credential shipped in the bundle, not a server secret; a public deployment must use a real auth provider.
- Verified on tablet after `cap sync` + APK reinstall: hint text, failed login error, and successful admin session.

## Local Docker launch (2026-11-17)
- The Vite preview that owned port 4310 was stopped; `docker-compose up -d --build` now runs `lumina-voice` on `0.0.0.0:4310->80/tcp` with `restart: unless-stopped`. Docker starts on boot; VS Code is not required.
- `~/Desktop/Lumina Voice.desktop` (trusted, executable) calls `scripts/open-lumina.sh`, which checks Docker, starts the container if stopped, waits for `http://localhost:4310/`, then runs `xdg-open`. The script derives the project root from its own path because the directory name ends in a space.
- Local host is this machine at `192.168.1.152`; CasaOS host `192.168.1.166` was unreachable. `docker compose` plugin is absent — use `docker-compose`.
- After source changes rebuild once with `docker-compose up -d --build`; the launcher only starts/reopens the existing image.

## Natural Urdu device voice (2026-11-17)
- Android WebView reports `typeof speechSynthesis === 'undefined'`, so the Web Speech API could never use the tablet's installed Urdu pack. Added a local Capacitor plugin `UrduTtsPlugin.java` (registered in `MainActivity`, `<queries>` for `TTS_SERVICE` in the manifest) and JS wrapper `src/platform/nativeTts.js`; no new npm dependency and no network call.
- Plugin methods: `status`, `voices`, `speak({text,lang,rate,pitch,voiceURI})`, `stop`; it notifies `start/end/error`. It tries `ur-PK` → `ur-IN` → `ur`, then picks a local named voice; if none is installed it rejects with a clear message. `Settings` shows the engine, Urdu-pack state, voice picker, speed and pitch sliders; `NowPlaying` passes pitch through announcements and voice-command replies.
- Verified on tablet after `cap sync` + APK install: `urduAvailable=true`, engine `com.google.android.tts`, Test speaks, logcat shows `speak lumina-1 lang=ur-PK voice=ur-pk-x-cfn-local`; voices list includes local and network `ur-PK`/`ur-IN` options. Lint clean, 113/113 tests, production build clean.

## Data transfer, audio delivery and APK size (2026-11-18)

- Settings → **Transfer data** opens `/transfer` on web and native. It exports/imports the `syncBundle.js` metadata-only JSON (history, search recents, device voice, AI usage/budget/custom, Archive.org titles, edits, artwork, subtitles, playback prefs, library progress). Audio bytes, non-Archive titles, signed-in user, session keys, radio config and `lumina-ai-keys` are never transferred.
- Native APK audio is pruned after `cap sync` by `scripts/prune-native-audio.mjs`: only `ad-*` files remain. Catalogue audio comes only from direct Archive.org URLs on web and tablet; no media-base override or bundled `/audio/` story path is used.
- Gradle wrapper **must remain 8.14.3** (AGP 8.13.0 fails on Gradle 9.6+ with `InternalProblems` removed). JDK 21 at `/tmp/opencode/jdk21` is required. `gradlew clean assembleDebug` is mandatory: incremental packaging left ~328 MB of zero padding after pruning; a clean build produced a 6.4 MB APK.
- Audio spectrum on Android 8.1 WebView: `createMediaElementSource()` may be called only once per `<audio>` element and mutes native playback, so native never creates the graph. `src/ui/AudioSpectrum.jsx` caches the web graph in a `WeakMap` keyed by the media element and marks failures in a `WeakSet`. Keep the canvas out of `.now-stage`: cover art stays clean, and the labelled `.now-spectrum-block` strip sits below the cover (64 px tall).
- Login crash fixed (2026-11-18): `hero.titleId` no longer points at a missing asset. It now targets `selected-ghazals-of-ghalib`; Home falls back to the first featured title and guards an empty catalogue. The old `raat-02`/`hp-01` note is superseded by the archive-only cleanup.
- Verified: lint clean, 123/123 tests, production build, `cap sync`, native prune (334 MB freed), `clean assembleDebug` (6.4 MB APK), fresh `adb install`; on-device CDP after login rendered `/`, `/explore`, `/library`, `/history`, `/settings`, `/admin`, `/transfer` with zero console errors and no `:8080` traffic.

## Device Admin, data transfer and search (2026-11-17)
- `/admin` now renders `DeviceAdmin` for admins while radio is off; tabs cover content, imports, files via FileLibrary, website, bot, subtitles, voices, advertising, cloud catalog and Data transfer. Old `Admin.jsx` stays untouched for radio relaunch.
- `src/data/syncBundle.js` exports/imports a versioned JSON bundle of allowlisted metadata only; audio bytes, non-Archive entries, user/session and radio keys are excluded. `@capacitor/filesystem` + `@capacitor/share` save/share it on Android; file-picker and paste-JSON fallbacks are built in.
- Search is a full page: sticky input with clear and optional speech input, filter chips with counts, recent/popular searches, genre browse, hand-picked tiles, grouped ranked results, highlighted matches and quick play. `src/data/search.js` owns scoring and recent history.
- Verified: lint clean, 107/107 tests, production build, `cap sync`, APK install; on-device CDP confirmed Device Admin with zero radio strings, export wrote `backups/lumina-voice-*.json`, paste-import restored data while preserving the admin user, and search empty/results states with no overflow.

## 100-title Archive.org library update — in progress (2026-11-17)
- Full plan: `Audiobook Library 100 Plan.md`; milestones L0–L7 in `Implementation Plan.md`; live status in `Task.md`. L0/L2/L4 wiring landed; **0 records published**.
- Attached candidates: `/home/oem/Downloads/urdu_audiobook_catalogue_100.json` and `.csv`. They are leads only: 100 records, 0 item URLs, 0 MP3 URLs, 0 Urdu titles, 0 independently verified playback, rights `unknown` on all 100, ~54h 26m index-reported duration.
- L0 done: immutable copy `data/archiveLibraryCandidates.json`; normalised `data/archiveLibraryWorking.json` uses sequential IDs `URD-AUD-001..100` and keeps `sourceId`. Duplicate `The School Story` was replaced by a separate lead in `data/archiveLibraryReplacements.json` (`URD-AUD-101`, Stories for Poor Erum, Archive item `3ErumMotherSyedirfanali`). Working set: **100 active, 0 duplicates, 1 replacement applied**.
- Source policy: Internet Archive only. The Hindi Audio Books index may generate search leads but is never provenance or rights evidence. Every published record needs its own Archive.org item page, playable MP3, probed duration, confirmed Urdu language, checked cover and explicit rights.
- Target buckets: Horror / supernatural 30, Mystery / detective 20, Urdu short stories 20, Classic novels 15, Adventure / fantasy 10, Children's stories 5. Counts include published verified records only.
- The four `Ihya Uloom-ud-Deen` volumes are religious literature, not horror: keep in `reference/ihya-uloom-urdu.json` with `excludeFrom100: true`; add a seventh shelf only after explicit admin approval.
- Tooling landed: `scripts/normalize-archive-candidates.mjs`, `scripts/verify-archive-library.mjs` (stages `metadata` / `audio`, flags `--limit`, `--title`, `--category`, `--out`, `--publish`), `scripts/build-library-catalogue.mjs`, `scripts/build-library-admin-summary.mjs`, `scripts/convert-archive-library.py` (ffmpeg only, rights-gated, writes `data/libraryConversionReport.json`), pure helpers in `scripts/lib/libraryCandidates.js`. Source-of-truth manifest `src/data/archiveLibraryVerified.json`; generated modules `archiveLibrary.js` (catalogue) and `archiveLibraryAdmin.json` (admin review) imported by `catalog.js` and `DeviceAdmin.jsx`.
- Verifier enums/statuses: `checked`, `rejected` (`no-archive-item-with-audio`, `language-unconfirmed`, `ffprobe` errors), `blocked` (`rights-unknown`/`rights-restricted`), `verified`. It requires a real title match before accepting a creator/Urdu match; an early false match to an unrelated Urdu item was fixed. Full metadata pass (`data/archiveLibraryVerification.json`): 0 verified, 83 rejected (76 `language-unconfirmed`, 7 `no-archive-item-with-audio`), 16 blocked (`rights-unknown`). Blocked IDs: `URD-AUD-025, 030, 042, 044, 046, 055, 058, 059, 067, 068, 079, 082, 086, 096, 097, 099`. All are Urdu MP3s without explicit reuse terms; none published.
- Rights bug (2026-11-18): the verifier treated the `opensource_audio` collection tag as public domain and published 19 records with no licence. Fixed in `scripts/lib/archiveRights.js` — only an explicit `licenseurl` or rights statement grants reuse rights, `evidence` records the source, `all rights reserved` wins, and `rightsAllowPublish()` gates publishing. `scripts/repair-archive-rights.mjs` re-checked all 19 live on Archive.org, blocked them, and regenerated manifest/catalogue/admin summary back to **0 published**. Regression tests assert collection tags never grant rights.
- Silent playback (2026-11-18): `createMediaElementSource()` in `AudioSpectrum` muted audio on Android WebView even though `currentTime` advanced. Native now never creates the analyser graph; the canvas draws an animated pulse while playing. Verified with `dumpsys audio`: a started OpenSL ES player appears only when the analyser is disabled. Web keeps the real analyser.
- Archive.org direct playback is the main feature and must stay: Add content stores only the URL, `loadOpus()` streams it directly, and `fastArchiveStream()` only reads metadata JSON. `sourceList()`/`assetUrl()` now pass direct URLs through untouched so a `.mp3` link never becomes `.mp3.opus`; the background precache skips direct streams entirely.
- Harry Potter (superseded 2026-11-18): the seven empty `hp-01`–`hp-07` shells were removed from the shipped catalogue. The failover fix below remains for any future Archive.org serial with a stalled storage node.
- Broadcast crash (2026-11-18): any code that reads `t.episodes[0]` must tolerate serial shells with no audio. `buildRotation()` filters empty-episode titles, `newRotationItem()` returns `null`, `addToRotation()` logs a warning, and the Admin sample-source panel picks the first title with audio. This was the `broadcast.js:174` `TypeError` that took down `<BroadcastProvider>` on first render.
- Playability filter (superseded 2026-11-18): `titlePlayableOnDevice()` used to hide bundled `/audio/` house titles only on native. It now requires real Archive.org audio on every platform; `CatalogProvider.merge()` and `BroadcastProvider` rebuild from that same playable set.
- Spectrum visibility (2026-11-18): `mixBlendMode: screen` made canvas bars disappear over cover art. Bars now draw on a dark scrim with bright gold→violet gradients and there is a second labelled 260×52 strip below the Now Playing cover. Native must still avoid `createMediaElementSource()` (it mutes audio), so its bars are an animated play/pause pulse.
- File library actions (superseded 2026-11-18): the `⋯` menu still exists, but local replacement audio is no longer accepted for the shipped catalogue. Archive-only entries come from direct URLs; `putLocalFile` remains for legacy in-memory artwork/file helpers, not new catalogue content.
- Planned storage key: `lumina-library-cache-v1` (cached archive URLs + byte totals). Add it to this table and to `syncBundle.js` allowlist only if cache state should transfer; audio bytes are never transferred.
- Delivery tiers (superseded 2026-11-18): no story audio is bundled in the APK or Docker image. Every published title streams from a canonical Archive.org URL; only `ad-*` audio ships natively.
- Planned service worker bump: `/sw.js?v=7` plus shell/static cache rename when new library assets ship. Radio remains off; no new routes; no `:8080` traffic.
