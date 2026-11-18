# AGENTS.md — Lumina Voice project instructions

Read `Brain.md` first, then `Rules.md` and `Memory.md`. Keep those files current.

- Stack: Vite 8 + React 19 + react-router-dom 7, plain CSS, no UI kit, no backend SDKs. JSX via Vite/Oxc (no esbuild or React plugin config). Route pages lazy-loaded via React.lazy + Suspense.
- `build.cssTarget: 'chrome90'` in `vite.config.js` is required: without it Vite 8 emits range-syntax media queries (`(width<=900px)`) that Android 8.1 WebView reads as `not all`, disabling the responsive layout.
- Native tablet app: Capacitor 8 (`android/`, app id `com.luminavoice.app`). APK path: `npm run build` → `npx cap sync android` → `node scripts/prune-native-audio.mjs` → in `android/`: `JAVA_HOME=/tmp/opencode/jdk21 ANDROID_HOME=/home/oem/Android/Sdk ./gradlew clean assembleDebug --no-daemon` (system JDK is 17, Capacitor 8 needs 21; Gradle wrapper must stay at 8.14.3 because AGP 8.13.0 breaks on Gradle 9.6+). Install with `adb install -r`.
- `scripts/prune-native-audio.mjs` must run after every `cap sync`: it deletes all native audio except `ad-*` (keeps the APK ~6 MB instead of ~341 MB). Catalogue audio is delivered from Archive/RSS via an admin media-base override; without one, bundled `/audio/` files are absent in the APK. `gradlew clean assembleDebug` is required — incremental packaging leaves zero-padding and can balloon a small APK back to hundreds of MB.
- Data transfer: `/transfer` (Settings → Transfer data) exports/imports a no-loss JSON bundle via `src/data/syncBundle.js`. `defaultIncludeAudio` is on for the route, off in the admin tab. User/session and radio keys stay excluded.
- Verify every change: `npm run lint`, `npm test`, `npm run build`.
- Local broadcast server: CasaOS `http://192.168.1.166` (80), AzuraCast `http://192.168.1.166:8080`, station `lumina_voice` (id 2). App container: `http://192.168.1.166:4310`.
- `src/data/stream.js` owns API base (`baseUrl`), listener base (`streamBaseUrl`) and mount URLs. Never collapse both bases to port 80.
- Logs: `src/lib/logger.js` (pino). Alerts: `captureException`/`captureMessage` (Sentry, opt-in via `VITE_SENTRY_DSN`). No `console.*` in new code.
- Never commit `.env`, API keys, Sentry DSNs or generated media.
- Update this doc set (`DEPLOY.md`, `Auto mcp index.md`, `llms.txt`) whenever endpoints or scripts change.

Updated: React 19 / Vite 8 / Router 7 / Vitest 5 stack, lazy routes, radio fully gated.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` opens the radio-free Device Admin for admins), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (107/107), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
