# Lumina Voice — zero-cost, library-only launch

The app ships as a **static PWA**. The device does the work: local state, procedural
artwork, on-device voice, ads, downloaded audio and an Archive.org-only catalogue.
The provider runs one small nginx container on port **4310**. No database, no
streaming server, no paid service, no API key is required to launch.

## 1. What gets deployed

| Layer | Choice | Cost |
|---|---|---|
| Build | `node:22-alpine` + Vite 8 (pinned so the engine floor cannot drift) | build-time only |
| Runtime | `nginx:1.27-alpine`, static `dist/`, SPA fallback | one small container |
| Content | 1 Archive.org title with 35 direct MP3 episodes; only `ad-*` audio bundled | zero |
| Auth | Supabase Auth (free tier) with local demo fallback when offline | zero |
| Logs/alerts | pino at `warn`; Sentry disabled without a DSN | zero |
| Radio | Fully gated by `VITE_RADIO_ENABLED=false` | zero |
| Archive library | 100-title plan on hold; 0 rights-cleared records published | zero |
| Data transfer | Settings → Transfer data (`/transfer`) exports/imports metadata-only JSON; no audio bytes | zero |
| Cross-device sync | Supabase `user_state` carries only library/progress/history metadata between Android and web; audio stays on device | zero |

`.dockerignore` excludes `.env`, `.env.local`, `.env.development` and
`.env.*.local`. Only `.env.production` is copied (radio flag `false`). The
public Supabase URL and publishable key (from Project → Connect → Framework →
React → Vite) are passed as Docker build args from the root `.env` file by
`docker-compose.yml`, so local-only keys never enter the image. The app keeps
its fetch client; no Supabase SDK is installed. Never add the service-role key
or a DSN to a build arg.

## 2. Deploy (on the CasaOS host)

Copy this folder to `/DATA/AppData/lumina-voice`, then:

```sh
cd /DATA/AppData/lumina-voice
docker compose build --no-cache
docker compose up -d
docker ps            # lumina-voice: 0.0.0.0:4310->80/tcp, restart unless-stopped
```

Open `http://192.168.1.166:4310` from a device on the LAN. Port 80 stays with
CasaOS; no reverse proxy is needed. The build container exits after producing
`dist/`, so steady-state resource use is just nginx plus static files.

### Local desktop (this machine)

The desktop Docker CLI here is `docker-compose` (there is no `docker compose`
plugin). The `lumina-voice` container is already running with
`restart: unless-stopped`, so it survives reboots and does not need VS Code.

```sh
docker-compose up -d --build
curl -I http://localhost:4310/          # 200
curl -I http://192.168.1.152:4310/      # 200 from another LAN device
```

`~/Desktop/Lumina Voice.desktop` starts the container if it is stopped and opens
`http://localhost:4310/` in the default browser. It runs
`scripts/open-lumina.sh`, which derives the project path from the script
location (the project directory name ends in a space). To rebuild after code
changes, run `docker-compose up -d --build` once; the launcher then just starts
and opens the existing image.

### Cloud catalogue updates (admin → cron → devices)

The local website's **Device Admin → Cloud catalogue** page remains the place to
add, edit, publish/unpublish and delete Archive.org story links. Each save writes
metadata only to Supabase `stories`; no audio file is uploaded. Apply
`docs/supabase-cloud-catalogue.sql` once to add the `published` flag. A 15-minute
cron job publishes the published archive-only rows as a static snapshot:

```sh
npm run catalogue:export          # writes public/catalogue.json now
bash scripts/install-catalogue-cron.sh   # installs the 15-minute crontab entry
```

Run `npm run catalogue:export` before `npm run build` when packaging the APK so
its bundled fallback snapshot is current; the app still refreshes from the LAN at
runtime.

`docker-compose.yml` mounts `public/catalogue.json` into nginx, so the site serves
`/catalogue.json` with `Cache-Control: no-store` without a rebuild. Apps pull the
snapshot on sign-in, on resume and every 15 minutes; Supabase Realtime also
refreshes an open tab. `VITE_CATALOGUE_SNAPSHOT_URL` defaults to `/catalogue.json`
on the web; `.env.production` points the APK at
`http://192.168.1.166:4310/catalogue.json`. A transient failure keeps the last
cached snapshot under `lumina-cloud-catalogue-v1`.

## 3. Native Android tablet build (Capacitor)

The PWA is wrapped with Capacitor 8 so the tablet runs a real installed app with
all web assets bundled locally. To keep the APK small (~6 MB), catalogue audio is
**not** bundled: only the `ad-*` advertisement files ship. Every title streams
from a direct `https://archive.org/download/...` URL; no media-base override or
bundled `/audio/` story path is used.

```sh
# one-time, after changing web code:
npm run build                        # uses .env.local: Supabase URL + publishable key
npx cap sync android                 # copy dist/ + plugins into android/
node scripts/prune-native-audio.mjs  # keep only ad-*.opus/.m4a in the APK

# build the APK (Capacitor 8 needs JDK 21; system JDK here is 17):
cd android
JAVA_HOME=/path/to/jdk21 ANDROID_HOME=/home/oem/Android/Sdk \
  ./gradlew clean assembleDebug --no-daemon

# install on the connected tablet:
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.luminavoice.app/.MainActivity
```

`android/local.properties` pins `sdk.dir=/home/oem/Android/Sdk`. Launcher icons
and splash screens are generated from `public/icon-512.png`; the app id is
`com.luminavoice.app`. ESLint ignores `android/` (generated bridge code).

`vite.config.js` sets `build.cssTarget: 'chrome90'`. Do not remove it: Vite 8's
CSS minifier otherwise rewrites `(max-width: 900px)` to range syntax
`(width<=900px)`, which the tablet's Android 8.1 WebView treats as `not all` —
this silently disables the bottom-nav/sidebar responsive layout.

## 4. Tablet-first verification (do this before desktop rollout)

Test on the target tablet in both orientations. The layout has a bottom nav at
`<=900px` and touch-sized controls; portrait and landscape both matter.

1. **Install as PWA** — open the site, use the browser's *Add to Home screen*,
   launch from the icon. Manifest, icons and `/sw.js?v=7` must all load.
2. **Navigate** — `/site` is public; `/` redirects to `/site` when signed out.
   Bottom nav reaches Search / Library / Settings (plus Device Admin for admins). No Radio tab.
3. **Radio is gone** — no "Radio", "Sada Bahar", "ON AIR" or "Studio" text;
   `/radio` redirects to `/`; `/admin` opens Device Admin for admins; zero requests to `:8080`.
4. **Play** — open `Selected Ghazals of Ghalib`, play an Archive.org MP3,
   check MiniBar + `/now`, pause/resume and seek. No demo/house/local titles may appear.
5. **Offline** — after first load, switch the tablet to airplane mode. The shell,
   ads, saved state and previously downloaded audio must work; uncached Archive streams need a network.
6. **Touch** — bottom nav, toggles, sliders and player buttons are reachable
   with a thumb; no clipped text in landscape.
7. **Data transfer** — as admin, open Device Admin → Data transfer. Export
   creates `backups/lumina-voice-*.json` in app storage and offers a share sheet;
   import reads a `.json` file or pasted JSON and reloads with Archive.org links,
   artwork, website copy and preferences. Audio bytes, non-Archive entries and
   the signed-in user are never copied.
8. **Urdu voice** — in the native APK, Settings → Device voice shows
   `Android voice ready · com.google.android.tts` and lists local `ur-PK` /
   `ur-IN` voices. Tap Test and confirm the Urdu sentence is spoken. Android
   WebView has no Web Speech API, so the `UrduTts` Capacitor plugin uses the
   installed text-to-speech pack; browsers use `speechSynthesis`. No key or
   network call is involved.
9. **Console** — no app errors. With Supabase connected, a fresh install makes
   auth/settings calls only; with no signal, login falls back to the local demo
   account and the bundled catalog keeps working.

## 5. Local checks before copying the folder

```sh
npm ci
npm run lint     # clean
npm test         # 150 passing
npm run build    # main bundle + lazy Admin/Radio/Sentry chunks
```

Then `docker build -t lumina-voice:local .` and a browser smoke test at
`http://127.0.0.1:4310` using a tablet viewport.

## 6. Radio feature — PAUSED (2026-11-17)

- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` opens the radio-free Device Admin for admins), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (107/107), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.

## 7. Rollback

`docker compose down` → restore the previous image or `dist/` → `docker compose up -d`.
There are no migrations, so rollback is image-only.
