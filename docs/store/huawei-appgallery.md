# Huawei AppGallery launch pack — Lumina Voice

Package: `com.luminavoice.app` · Developer: **AL ASAR JADEED** · Website: `www.alasarjadeed.com`
Privacy policy: `https://www.alasarjadeed.com/privacy` · Support: `info@alasarjadeed.com`

## 1. Listing copy

### App name
Lumina Voice

### Short description (English)
Urdu audiobooks, ghazals and dramas from Archive.org. Save offline and sync your place.

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
