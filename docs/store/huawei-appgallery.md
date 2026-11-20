# Huawei AppGallery launch pack — Lumina Voice

Package: `com.luminavoice.app` · Developer: **AL ASAR JADEED** · Website: `www.alasarjadeed.com`
Privacy policy: `https://www.alasarjadeed.com/privacy` · Support: `info@alasarjadeed.com`

## 1. Listing copy

### App name
Lumina Voice

### Short description (English)
Urdu audiobooks, ghazals & dramas. Stream Archive.org, save offline, sync.

### Short description (Urdu)
آرکائیو کے اردو آڈیو بوکس، غزلیں اور ڈرامے۔ آف لائن محفوظ کریں اور جگہ سنک کریں۔

### Full description (English)
Lumina Voice is a free, offline-first player for Urdu audiobooks, ghazals and audio dramas.

- Streams public audio directly from Archive.org — the app does not host or re-encode audio.
- Save episodes for offline listening with subtitles and covers.
- Keep your library, saved positions, history, ratings and reviews in sync between the Android app and the website.
- Anyone can create a free profile; only the developer account manages the shared catalogue.
- Browse by title, kind, genre, author and poet, with search and listening history.
- Delete imported or bundled/cloud parts from the File Library on the device.
- Metadata-only transfer lets you move your library to another device without copying audio bytes.
- No live radio, no advertising SDK and no behavioural tracking in this release.

Audio is supplied by Archive.org. Lumina Voice is developed by AL ASAR JADEED.

### Full description (Urdu)
لومینا وائس اردو آڈیو بوکس، غزلیں اور آڈیو ڈراموں کا مفت آف لائن پلیئر ہے۔

- آڈیو براہِ راست آرکائیو ڈاٹ اورگ سے اسٹریم ہوتی ہے؛ ایپ اسے میزبانی یا دوبارہ انکوڈ نہیں کرتی۔
- اقساط، سب ٹائٹلز اور کور آف لائن سننے کے لیے محفوظ کریں۔
- لائبریری، محفوظ جگہ، تاریخ، ریٹنگ اور تبصرے ویب اور اینڈرائیڈ پر سنک رہتے ہیں۔
- ہر کوئی مفت پروفائل بنا سکتا ہے؛ مشترکہ کیٹلاگ صرف ڈویلپر اکاؤنٹ ہی منیج کرتا ہے۔
- عنوان، قسم، صنف، مصنف اور شاعر کے لحاظ سے براؤز کریں، سرچ اور ہسٹری کے ساتھ۔
- فائل لائبریری سے درآمد شدہ یا بلٹ ان/cloud اقساط ڈیوائس سے حذف کریں۔
- میٹا ڈیٹا ٹرانسفر audio بائٹس کے بغیر دوسری ڈیوائس پر لائبریری منتقل کرتا ہے۔
- اس ریلیز میں لائیو ریڈیو، اشتہاری SDK یا رویے کی ٹریکنگ نہیں ہے۔

آڈیو آرکائیو ڈاٹ اورگ فراہم کرتا ہے۔ لومینا وائس AL ASAR JADEED کی تیار کردہ ہے۔

## 2. Keywords

Urdu audiobooks, Urdu ghazals, audio dramas, Archive.org audio, offline audiobook, subtitles, Urdu stories, Ghalib, audiobook player

## 3. Screenshots

Use a real Huawei/Android device, portrait, at least three images:

1. Home — hero and shelves.
2. Explore — catalogue grid and search.
3. Title — episode list, subtitle and download controls.
4. Library — downloads and continue listening.
5. Settings — sync and exact developer card.

Do not include locally imported copyrighted test titles or private LAN/radio screens.

## 4. Content rating answers

- Categories: Music & Audio / Books & Reference / Entertainment.
- No violence, nudity, sexual content, gambling, tobacco, alcohol or drugs.
- No live streaming or radio in this release.
- User-generated content: ratings and short reviews; public-read, author-only edits, admin moderation.
- Age recommendation: 3+ / Everyone.

## 5. Rights checklist

- Ship only Archive.org titles with a public-domain licence, explicit reuse licence or written permission.
- Current launch catalogue: `selected-ghazals-of-ghalib` (bundled) and `IqbalQaidEAzamAwrPakistan` (cloud CC0).
- Keep imported test titles off the release device and screenshots.
- Keep Archive.org attribution visible in the app and store listing.

## 6. Store build

```bash
npm run catalogue:export
npm run build:store
npx cap sync android
node scripts/prune-native-audio.mjs
cd android
JAVA_HOME=/tmp/opencode/jdk21 ANDROID_HOME=/home/oem/Android/Sdk ./gradlew clean bundleRelease --no-daemon
```

`build:store` runs `scripts/prepare-store-env.mjs`, which writes `.env.store` from the
public Supabase values and explicitly blanks every AzuraCast/radio variable. Vite inlines
all `VITE_*` values, so this step is required before `cap sync`; never copy `.env.local`
into a store build.

Signed bundle: `android/app/build/outputs/bundle/release/app-release.aab`
Signed APK alternative: `android/app/build/outputs/apk/release/app-release.apk`

The signing keystore and passwords live outside the repo at `~/.android/lumina-voice-release.*`.
Back them up securely; a lost keystore prevents future updates.

## 7. Release checks

- `versionCode 2`, `versionName 1.0.0`.
- Release manifest disables cleartext traffic.
- No `192.168.*`, `:8080`, AzuraCast key or radio request in the build.
- Catalogue loads from the bundled `/catalogue.json`.
- Privacy URL opens and Settings → Privacy policy works.
- Account deletion request opens with support email.
- Delete part, clear history, subtitles, offline playback and sync all pass on device.
- Only `ad-*` audio remains in native assets.

## 8. AGC publish page — exact field map

### Create the app
| Field | Value |
|---|---|
| App category | App (not Game) |
| App name | `Lumina Voice` |
| Urdu app name | `لومینا وائس` |
| Package name | `com.luminavoice.app` |
| Default language | English, then add an Urdu localization |
| Developer / provider | `AL ASAR JADEED` |
| Website | `https://www.alasarjadeed.com` |
| Support email | `info@alasarjadeed.com` |
| Privacy policy URL | `https://www.alasarjadeed.com/privacy` |
| Pricing | Free |
| Release type | Public release (not beta) |
| Countries/regions | All available markets except Chinese mainland |
| Device types | Phone and tablet |
| HMS SDK | None — standard Android WebView/Capacitor app |

### Localized listing fields
| Field | English | Urdu |
|---|---|---|
| App name | Lumina Voice | لومینا وائس |
| Short description | Urdu audiobooks, ghazals & dramas. Stream Archive.org, save offline, sync. | آرکائیو کے اردو آڈیو بوکس، غزلیں اور ڈرامے۔ آف لائن محفوظ کریں اور جگہ سنک کریں۔ |
| Full description | Use section 1 above | Use section 1 above |
| What's new | `First AppGallery release: offline Urdu audiobooks, ghazals and dramas from Archive.org with subtitles, sync and metadata-only transfer.` | `پہلا ایپ گیلری ریلیز: آرکائیو کے اردو آڈیو بوکس، غزلیں اور ڈرامے، سب ٹائٹلز، سنک اور میٹا ڈیٹا ٹرانسفر کے ساتھ۔` |
| Keywords | `Urdu audiobooks, Urdu ghazals, audio dramas, Archive.org audio, offline audiobook, subtitles, Urdu stories, Ghalib, audiobook player` | `اردو آڈیو بوکس، اردو غزلیں، آڈیو ڈرامے، آرکائیو آڈیو، آف لائن آڈیو بوک، سب ٹائٹلز، اردو کہانیاں، غالب، آڈیو بوک پلیئر` |

### Category and tags
- Primary category: Music & Audio.
- Secondary category if available: Books & Reference.
- Tags: `Urdu`, `Audiobook`, `Ghazal`, `Audio Drama`, `Archive.org`, `Offline`.

### Graphics
- App icon: 512×512 PNG (or the exact size AGC requests, e.g. 192×192), no transparency, dark/gold Lumina mark.
- Screenshots: 3–8 images. Recommended size **450 × 800 px portrait** (or 800 × 450 px landscape). Every side must be 320–3840 px. PNG/JPG/JPEG ≤5 MB each; WEBP ≤100 KB each.
- Resize/crop existing captures with: `magick input.png -resize 450x800^ -gravity center -extent 450x800 -strip out.png` (use `convert` on older ImageMagick).
- Order: Home → Explore → Title → Library → Settings.
- Optional promo image: 1280×720 PNG/JPG, ≤5 MB.
- Never include imported copyrighted test titles, private LAN addresses or radio screens.

### Package upload
| Field | Value |
|---|---|
| File | `android/app/build/outputs/bundle/release/app-release.aab` |
| APK alternative | `android/app/build/outputs/apk/release/app-release.apk` |
| Version | `1.0.0` |
| Version code | `2` |
| File size | ~5.4 MB AAB / ~5.6 MB APK |
| Min Android | 8.0 (API 24) |
| Target Android | API 36 |
| Signing certificate | `CN=AL ASAR JADEED, OU=Lumina Voice, O=AL ASAR JADEED, L=Islamabad, ST=Islamabad, C=PK` |
| Certificate SHA-256 | `2f8c2c08683c857b30113e41ed55fe1fb487d16d58ccb0373cb957ef75c3f0ff` |

### Permissions and SDK declaration
| Item | Answer |
|---|---|
| `android.permission.INTERNET` | Required — stream Archive.org audio and sync metadata with Supabase. |
| App-private file storage | Downloads, covers and subtitles stay on device; no external-storage permission. |
| Share feature | Android FileProvider shares a metadata backup with the app the user chooses. |
| Camera / microphone / contacts / location / SMS | Not requested or used. |
| Third-party services | Supabase (sign-in + metadata sync), Archive.org (audio + catalogue), Sentry (disabled by default). |
| SDKs | Capacitor 8, `@capacitor/filesystem`, `@capacitor/share`; no HMS SDK, no ad SDK, no analytics SDK. |
| In-app purchases | No; the store build has no payment link. |
| Live streaming / radio | No; feature is paused and gated off. |

### Privacy tags / data-use form
| Data | Collected | Purpose | Shared with | Retention | Deletion |
|---|---|---|---|---|---|
| Email, user ID, display name | Yes | Sign-in, account ownership, support | Supabase | Until account deletion | Settings → Delete account |
| Library, positions, history, search recents, settings, imported Archive links, artwork, subtitles | Yes | Sync between web and Android | Supabase under user ID | Until account deletion | Settings → Delete account |
| Ratings and reviews | Yes | Public reader feedback | Supabase (public read) | Until author deletes or account removal | Author can delete in Title page |
| Offline audio, covers, subtitles | Device only | Offline playback | Not uploaded | Until removed from File Library | File Library delete |
| IP/request data | Processed by providers | Deliver audio and API responses | Archive.org, Supabase | Provider-controlled | Not stored by Lumina Voice |
| Diagnostics | Local only | Error logs | Sentry only if a DSN is configured; store build is blank | Session/local | Not retained by developer |
| Sensitive data, precise location, contacts, call/SMS, photos, biometrics, payment data | No | — | — | — | — |

- Data is sent over HTTPS; audio bytes are never uploaded to Supabase or transfer bundles.
- Data is not sold and is not used for targeted advertising.
- Not directed at children under 13.
- Account deletion path: Settings → Account → Delete account prepares `info@alasarjadeed.com` with the signed-in email and user ID; operator deletes cloud data and confirms by email. Offline files are removed separately from File Library.

### Age-rating questionnaire
| Question area | Answer |
|---|---|
| Target age | 3+ / Everyone |
| Violence, horror, nudity, sexual content | No |
| Profanity or hate speech | No |
| Gambling, tobacco, alcohol, drugs | No |
| Live streaming or chat | No |
| User-generated content | Yes — ratings and short reviews only; public read, author-only edits, admin moderation, no chat or DMs |
| Personal information | Yes — email and user ID for sign-in/sync; see privacy tags |
| Precise location, contacts, camera, microphone | No |
| Advertising or in-app purchase | No |
| Content intended for minors | No |
| Medical, legal, financial or religious instruction | No |

If AGC's generated rating is higher than 3+ because of public reviews, accept the generated rating rather than changing answers.

### Reviewer notes
- Reviewers may register with any email; no test account is required. Do not provide the admin account.
- Sign in, open a title, play an Archive.org stream, save a download, add a subtitle, rate/review, check Settings → Privacy policy and Delete account.
- Expected catalogue at launch: `selected-ghazals-of-ghalib` (bundled) and `IqbalQaidEAzamAwrPakistan` (cloud CC0). No imported test titles.

### Pre-submit blockers
- Publish `src/pages/Privacy.jsx` at `https://www.alasarjadeed.com/privacy`; the URL currently returns 404.
- Sign in to Huawei Developer/AGC and create the app with the exact package above.
- Capture screenshots from a release device with no copyrighted imports.
- Confirm the two-catalogue rights list is acceptable, then upload the AAB and submit.
