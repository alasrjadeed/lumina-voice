# Huawei AppGallery chat / working notes

Exported 20 November 2026 from the OpenCode session.

## Store readiness implemented

- Commit `84d80b9`: public `/privacy` route, in-app privacy/deletion entries, store-only Vite build, release cleartext overlay, out-of-repo signing, versionCode 2 / versionName 1.0.0, signed AAB/APK, listing docs and guard tests.
- Commit `329b8f1`: corrected screenshot specs and expanded AGC publish page field map.
- Commit `d49d9ee`: documented AGC App Signing steps.

Artifacts:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab` (~5.4 MB)
- APK: `android/app/build/outputs/apk/release/app-release.apk` (~5.6 MB)
- Signing certificate: `/home/oem/.android/lumina-upload-certificate.pem`
- Desktop copy: `/home/oem/Desktop/lumina-upload-certificate.pem`
- Upload key SHA-256: `2F:8C:2C:08:68:3C:85:7B:30:11:3E:41:ED:55:FE:1F:B4:87:D1:6D:58:CC:B0:37:3C:B9:57:EF:75:C3:F0:FF`

## AGC publish page — exact values

### Create the app
| Field | Value |
|---|---|
| App category | App (not Game) |
| App name | `Lumina Voice` |
| Urdu app name | `لومینا وائس` |
| Package name | `com.luminavoice.app` |
| Default language | English, then add Urdu localization |
| Developer / provider | `AL ASAR JADEED` |
| Website | `https://www.alasarjadeed.com` |
| Support email | `info@alasarjadeed.com` |
| Privacy policy URL | `https://www.alasarjadeed.com/privacy` |
| Pricing | Free |
| Release type | Public release (not beta) |
| Countries/regions | All available markets except Chinese mainland |
| Device types | Phone and tablet |
| HMS SDK | None — standard Android WebView/Capacitor app |

### Brief introduction (74/80)

```text
Urdu audiobooks, ghazals & dramas. Stream Archive.org, save offline, sync.
```

### Full introduction

```text
Lumina Voice is a free, offline-first player for Urdu audiobooks, ghazals and audio dramas. It streams public audio directly from Archive.org; the app does not host, re-encode or proxy the audio.

• Save episodes, covers and subtitles on your device for offline listening.
• Browse by title, kind, genre, author and poet, with search and listening history.
• Keep your library, saved positions, history, ratings and reviews in sync between the Android app and the website.
• Anyone can create a free profile; only the developer account manages the shared catalogue.
• Delete imported or bundled/cloud parts from the File Library on this device.
• Metadata-only transfer moves your library to another device without copying audio bytes.
• Subtitles are available in Urdu, English and Arabic with Auto/Off selection.
• Live radio is not included in this release. There is no advertising SDK or behavioural tracking.

Audio is supplied by Archive.org. Lumina Voice is developed by AL ASAR JADEED · WEBSITE: www.alasarjadeed.com.
```

### New features

```text
First AppGallery release: offline Urdu audiobooks, ghazals and dramas from Archive.org with subtitles, cloud sync and metadata-only transfer.
```

### Category and tags

- Primary category: Music & Audio.
- Secondary category if available: Books & Reference.
- Tags: `Urdu`, `Audiobook`, `Ghazal`, `Audio Drama`, `Archive.org`, `Offline`.

### Visual assets

- Count: 3–8.
- Recommended: 450 × 800 px portrait (or 800 × 450 px landscape).
- Side length: 320–3840 px.
- PNG/JPG/JPEG ≤5 MB each; WEBP ≤100 KB each.
- Resize command: `magick input.png -resize 450x800^ -gravity center -extent 450x800 -strip out.png`
- Order: Home → Explore → Title → Library → Settings.
- Do not include copyrighted imported test titles, private LAN addresses or radio screens.

## App Signing (required before AAB upload)

AGC → Apps and atomic services → Android → **Lumina Voice** → Distribute → Services → **App Signing**.

1. Sign the app signing service agreement.
2. Select **Method 1: AppGallery Connect creates and manages signature keys** (new app).
3. Upload `/home/oem/Desktop/lumina-upload-certificate.pem` (or the `.android` original).
4. Submit, wait for AGC key creation, then upload `app-release.aab`.
5. Future updates must use the same local keystore (`~/.android/lumina-voice-release.jks`, alias `lumina`).

Never upload the `.jks`, properties file, or passwords. If Method 1 is unavailable, an APK was already associated with the app; use Method 2 with `pepk.jar` and the same keystore.

## Remaining blockers

- Publish `src/pages/Privacy.jsx` at `https://www.alasarjadeed.com/privacy` (currently 404).
- Complete Huawei Developer/AGC verification if not already done.
- Capture compliant screenshots from a release device.
- Confirm launch catalogue rights, then submit for review.
