# Chat log — 2026-11-18

Saved session record for the Supabase cross-device sync work. Sensitive values (account password, PAT) are intentionally omitted.

## Goal
Connect Lumina Voice web and Android tablet builds to Supabase with maximum usable features while preserving offline-first playback. Publish source on GitHub with a project site and free-tier keep-alive, then two-way-sync local metadata (saved titles, playback positions, history) between the Android app and the local web app. Audio files stay on device.

## Decisions
- Vite React app, not Next.js. SDK-free `fetch` client using the public URL + publishable key from Supabase → Connect → Framework → React → Vite. No service-role key.
- `isOfflineError()` allows sign-in fallback to the local demo account with no signal.
- `DeviceAdmin.jsx` is the active `/admin` page while radio is off; `SupabaseAdmin.jsx` is the single Supabase panel.
- Realtime is a plain WebSocket Phoenix client (`phx_join` on `realtime:public`), no SDK.
- `user_state` stores only `library`, `progress`, `history` JSON plus `client_id`/`updated_at`; `client_id` prevents own-write echo.
- GitHub: public repo `alasrjadeed/lumina-voice`, Pages from `main` `/docs`, daily keep-alive workflow.

## Work completed in this session
- Created `src/data/userState.js`: `fetchUserState`, `saveUserState`, `mergeUserState`, `sameUserState`. Merge unions saves, keeps the newest position per title, and de-duplicates/caps history at 200.
- Created `docs/supabase-user-state.sql`: table, RLS policies, `grant select, insert, update, delete ... to authenticated`, and realtime publication. Applied in Supabase SQL editor successfully.
- Added `user_state` to `src/data/realtime.js` `TABLES` and to the schema hint in `src/data/api.js`.
- Wired sync into `src/state/AppState.jsx`: per-app `CLIENT_ID`, pull on sign-in/session restore, debounced push (1.5 s), 30 s heartbeat, flush on hide, realtime pull from other devices.
- Added tests `tests/userState.test.js` and `tests/realtime.test.js`; total suite now 145 passing.
- Added password recovery (`/auth/v1/recover`) in `Auth.jsx` and display-name editing via `updateProfile()` in `Settings.jsx`.
- Wired realtime refresh into `Ratings.jsx`, `Catalog.jsx` and profile state in `AppState.jsx`.

## Debugging notes
- First authenticated REST GET on `user_state` returned 403 `permission denied for table user_state`, hint `GRANT SELECT ON public.user_state TO authenticated;` — fixed by applying the grant; subsequent GET returned 200.
- App still showed no POST in browser network. Root cause: `127.0.0.1:4310` is the Docker container, and only a local `npm run build` had been run. After `docker-compose up -d --build`, the app issued both the GET (with `limit=1`) and the POST, and the row was created with the signed-in user's library.
- Realtime probe: heartbeat `status: ok`; `phx_join` on `realtime:public` returned `postgres_changes` ids for `stories` and `user_state`. Wrong event `phoenix_join` gives `unmatched topic`.

## Verification
- `npm run lint` clean, `npm test` 145/145, `npm run build` clean.
- Native: `npx cap sync android`, `node scripts/prune-native-audio.mjs` (334.1 MB freed), `clean assembleDebug`, `adb install -r` Success; APK 6.4 MB.
- Web: `docker-compose up -d --build`, container recreated; browser network confirmed `user_state` GET + POST and a stored row.
- Committed and pushed as `1c35ee2` (`master → main`).
- Docs updated: `Brain.md`, `Task.md`, `Memory.md`, `DEPLOY.md`, `llms.txt`.

## Known limitations / blocked
- Merge is additive: unsaving a title on one device does not remove it on the other.
- Google OAuth unavailable until enabled in Supabase Auth dashboard (`google: false`).
- Stripe checkout is demo-only without `VITE_STRIPE_PAYMENT_LINK`.
- Live speech-to-text unavailable: no `RECORD_AUDIO`/mic permission in the WebView.
- GitHub Actions secrets and Pages API writes returned 403 with the PAT; Pages was enabled manually. The PAT pasted earlier should be rotated.

## Follow-up: tablet playback + web admin
- User reported the tablet's Archive.org Harry Potter audiobook was not playing and asked for a permanent fix; also asked that the website recognise the admin account.
- Device diagnosis over CDP: the imported title had 18 chapter MP3s with good URLs. The cached metadata storage node (`ia600906.us.archive.org`) returned response headers but zero bytes for minutes; the canonical `archive.org/download/...` URL redirected to a working node and played. Ghalib archive audio still worked, proving general connectivity was fine.
- Fix in `src/state/AppState.jsx` `loadOpus`: try canonical URL first, keep the direct node as a second candidate, and add a 15 s no-data watchdog that switches source. Verified on the reinstalled APK: Chapter 01 reached `readyState 4`, `currentTime > 12 s`, buffered > 1000 s.
- Web admin: Supabase profile was already `admin`; added `roleFor()` so the operator email cannot be demoted by a stale profile or realtime event. Verified `/admin` on the rebuilt Docker web app.
- Rebuilt and installed the 6.4 MB APK; rebuilt the Docker web container. Lint, 145 tests and build pass.

## Follow-up: Plus gate on admin email
- User reported `/title/hp-01` still showed the Lumina Plus modal for `info@alasarjadeed.com`.
- Fixed in `src/state/AppState.jsx`: `hasPremium` now grants Plus from admin role/operator email, so a stored `premium:false` cannot trigger the lock. All playback/precache/autoplay checks use it. Initial user role is also normalised with `roleFor()` so stored `role:'listener'` cannot hide `/admin`.
- Verified on rebuilt Docker web with stored `premium:false` and `role:'listener'`: `/title/raat-02` had 6 episodes, 0 locks and no Plus modal; `/admin` opened. Rebuilt and reinstalled the 6.4 MB APK. Lint, 145 tests and build pass.

## Follow-up: single admin + cross-platform sharing
- User clarified: any email account may sign in, but admin must be only `info@alasarjadeed.com` on GitHub, local web and Supabase; the tablet must keep sharing data with other platforms.
- Replaced the local `roleFor()` with `roleForEmail()` in `src/config/auth.js`: exact operator email → admin, every other email → listener regardless of profile row or `admin`-looking address. App State and Settings/Admin panels now use it; Supabase profile values can no longer grant admin or Plus in the app.
- Supabase admin UI now only lets the operator change their own role. Added `docs/supabase-admin-lockdown.sql`: `public.is_operator()`, `enforce_operator_role()` trigger, one-time repair of stale admin rows (e.g. `smoke1`), and stories RLS by operator email. Needs to be run in Supabase SQL Editor because dashboard login is not available here.
- Cross-platform sharing stays platform-neutral: tablet and web share Supabase REST/Realtime metadata, and `/transfer` exports/imports the same JSON bundle offline.

## Follow-up: install banner + silent Archive audio
- User reported two console messages on `http://localhost:4310`: "Banner not shown: beforeinstallpromptevent.preventDefault() called" and "MediaElementAudioSource outputs zeroes due to CORS access restrictions" with no sound.
- Fixed install warning by no longer cancelling `beforeinstallprompt`; Chrome can show its native banner, and the Settings button still uses the stored event where supported.
- Fixed muted audio by canonicalizing `www.archive.org/download/...` to `archive.org/download/...` and setting `crossOrigin="anonymous"` only on archive.org hosts before loading. Other external URLs are never hijacked by Web Audio; they use the decorative pulse. Verified both `127.0.0.1:4310/now` and `localhost:4310/now` played Ghalib with `readyState 4`, `currentTime > 4 s`, no error.
- Rebuilt Docker web and reinstalled the 6.4 MB APK. Lint, 146 tests and build pass.

## Follow-up: archive-only catalogue
- User asked to keep content from `https://archive.org/` and the adverts, and to remove every other demo/house/local item from the catalogue on web, tablet and cloud.
- Added `src/data/contentPolicy.js` as the single gate: direct `https://archive.org/download/<id>/<audio>` URLs only, canonicalising `www.archive.org` to `archive.org`. Filtered bundled/generated titles, user catalog (with a startup migration), playability, Import Studio, Supabase story reads/writes and `/transfer` through it.
- Shipped catalogue is now only `selected-ghazals-of-ghalib` with 35 direct MP3 episodes; demo house titles, Harry Potter shells, demo people/series and `hero.titleId: 'raat-02'` were removed. Ads in `src/data/ads.js` and native `ad-*` audio are untouched.
- `syncBundle.js` now exports/imports metadata only: old non-Archive catalog entries and any audio bytes are dropped. DataTransfer UI no longer offers an audio toggle.
- Added `docs/supabase-archive-only.sql` (delete non-Archive rows + URL check constraint) and bumped service-worker shell/static caches to `v7`. Removed `tests/harryPotter.test.js`; added `tests/archiveOnly.test.js`.
- Verified: `npm run lint` clean, `npm test` 152/152, `npm run build` clean. Docker/APK rebuild, web smoke and tablet CDP smoke (all seven routes, SW `v7`, no `:8080`, no console errors) passed. Deleted the one non-Archive cloud story (`testr` / YouTube) via authenticated REST; Supabase SQL migrations remain unapplied.

## Session close (2026-11-18)
- Committed as `431eeb5` ("Enforce archive-only catalogue across web, tablet and cloud") and pushed to `origin/main`, which is the repo's default branch. The stray `master` branch created by the first push was deleted; local `master` tracks `origin/main` and the tree is clean.
- Final state: APK installed and smoke-tested on the tablet, web container rebuilt, cloud catalogue empty of non-Archive rows, 152/152 tests green. Two Supabase DDL migrations remain pending SQL Editor access.

## Remembered admin
- Operator: `info@alasarjadeed.com`. Credential is already in `src/config/auth.js`; not duplicated here.

## Cloud catalogue rollout (2026-11-19)
- User rejected trimming the local website: it stays a private, full-featured dashboard. Reverted the outbound-link cleanup so GitHub/Deploy/llms, station-dashboard and archive-item links are back.
- Kept the Archive-only gate intact. Admin → Cloud catalogue remains the single place to add/edit Archive.org links; rows still show the `Audiobook · archive.org` details link.
- Added a `published` draft/live switch to Admin → Cloud catalogue (`docs/supabase-cloud-catalogue.sql`) and made the exporter skip drafts.
- Added a cron-published snapshot: `scripts/export-cloud-catalogue.mjs` (`npm run catalogue:export`) writes `public/catalogue.json`; `scripts/install-catalogue-cron.sh` installs a 15-minute job. nginx serves the file `no-store` through a compose bind mount, so content updates need no rebuild.
- `src/data/cloudCatalogue.js` maps each story row to one playable app title and caches the last snapshot under `lumina-cloud-catalogue-v1`; `CatalogProvider` pulls on mount/resume/timer plus Realtime. The APK uses the LAN snapshot URL from `.env.production`.
- Verified: lint clean, 155/155 tests, production build, live snapshot export (0 archive rows currently in Supabase).

## Supabase migrations + rights clearance (2026-11-19)
- User supplied a Supabase Management API PAT; all three pending SQL files were applied through `POST /v1/projects/ueiwzhjruyijtssysekq/database/query` and verified in Postgres (`published` column, `stories_archive_audio_url_chk`, `is_operator()`, role trigger, operator RLS policy, 1 correct admin, 0 stray admins). `stories?select=id,published` now returns 200 over the app's publishable key. No secret key is stored in the repo or `.env`.
- Rights review closed with evidence: Archive.org has 0 explicit-licensed Urdu fiction items for the six plan buckets; 72 CC/PD Urdu audio items are religious lectures excluded by the plan. One real CC0 Urdu audiobook (`IqbalQaidEAzamAwrPakistan`, 29:51 MP3) was added to Supabase `stories` with its item page and licence URL in the description. Exporter published it to `public/catalogue.json`; Docker rebuilt; web and tablet both render it with library 11 + 10 imports intact and no console errors. The 100-title plan manifest stays at 0 — no fiction bucket can be filled by relabelling.
- Verified: lint clean, 156/156 tests, production build, Docker rebuild, web + native CDP checks.
