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

## Remembered admin
- Operator: `info@alasarjadeed.com`. Credential is already in `src/config/auth.js`; not duplicated here.
