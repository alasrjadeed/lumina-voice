# Audiobook Library 100 Plan.md — Lumina Voice v1.1.0

Status: **P0 + tooling complete; 0 records published**. This document remains the gate for the next library update. A verifier bug once treated `opensource_audio` as public domain and published 19 records; the classifier now requires explicit licence/rights evidence and those 19 were re-checked live and blocked.

## Execution log — 2026-11-17

- **P0 done** — immutable candidate copy, normalised working set, 100 unique IDs, duplicate flagged, six suggested categories. 99 candidates remain active; one replacement is still needed.
- **P2 tooling done** — `scripts/normalize-archive-candidates.mjs`, `scripts/verify-archive-library.mjs`, `scripts/build-library-catalogue.mjs` and pure helpers in `scripts/lib/libraryCandidates.js`. Node built-ins + `ffprobe` only; no new runtime dependency.
- **P4 wiring done** — generated `src/data/generated/archiveLibrary.js` is imported into `titles` / `authors`; it starts empty. `src/data/archiveLibraryVerified.json` is the publish manifest and is empty.
- **P1 metadata pilot** — 10 horror candidates checked against Archive.org: 0 verified, 9 rejected as English/`language-unconfirmed`, 1 blocked on `rights-unknown`. The verifier now requires a real title match before accepting a creator/Urdu match. Nothing was published.
- **Full metadata pass** — all 99 active candidates checked against Archive.org: **0 verified, 83 rejected, 16 blocked**. 76 rejections are `language-unconfirmed` (exact title match exists, often English/LibriVox or audio-drama), 7 have no matching item with audio. All 16 blocked items are real Urdu MP3s whose item metadata gives no explicit reuse licence (`rights-unknown`).
- **Blocked IDs** — `URD-AUD-025, 030, 042, 044, 046, 055, 058, 059, 067, 068, 079, 082, 086, 096, 097, 099`. Most are `syedirfanalidotcom` / `Server555` uploads with Urdu evidence but no licence/rights statement. They remain unpublished under the source policy.
- **Blocked review complete** — item metadata and descriptions for all 16 blocked IDs were inspected: no `licenseurl`, rights statement, permission text or reuse terms. `opensource_audio` is a collection tag, not a licence. All 16 stay excluded.
- **Duplicate fixed** — `data/archiveLibraryReplacements.json` supplies one new Archive.org lead (`Stories for Poor Erum`, ID `URD-AUD-101`) for the duplicated `URD-AUD-100` row. `data/archiveLibraryWorking.json` now has **100 active records, 0 duplicates**; the original candidate copy is untouched.
- **Remaining milestones landed** — `scripts/convert-archive-library.py` (ffmpeg Opus 32k/24k + AAC, rights gated), `scripts/build-library-admin-summary.mjs`, and a read-only **Archive library** tab in Device Admin (target counts + review queue, no publish control).
- **Still blocked** — 0 records can publish. No supplied or replacement lead has explicit reuse rights. `src/data/archiveLibraryVerified.json` and the generated catalogue stay empty; Stage audio + conversion is a no-op until rights are cleared.
- **Rights search closed (2026-11-19)** — live Archive.org `advancedsearch` returned 0 items for `mediatype:audio AND language:urdu AND licenseurl:*creativecommons.org*` combined with `subject:fiction`, story/novel titles, `collection:audiobooks`, or horror/mystery/detective subjects. `collection:librivox` has no Urdu items. 72 CC/PD Urdu audio items do exist, but they are religious lectures/fiqh series that this plan explicitly excludes from the six fiction buckets; they are not counted and must not be relabelled. The gate therefore stays at 0 published for all six targets.
- **First rights-cleared title delivered** — `IqbalQaidEAzamAwrPakistan` is a real Urdu audiobook with a 29:51 playable MP3 and an explicit CC0 1.0 `licenseurl`. It was added to the live Supabase `stories` catalogue (not to this plan's manifest, because it is not one of the 100 leads and fits none of the six buckets). Its description records the item page and licence URL. The 15-minute exporter publishes it to `public/catalogue.json`; web and tablet both render it.

## 0. Non-negotiable decision

The two attached files are a **candidate lead list**, not a library.

- `/home/oem/Downloads/urdu_audiobook_catalogue_100.json`
- `/home/oem/Downloads/urdu_audiobook_catalogue_100.csv`

Current state of those files:

| Check | Result |
|---|---|
| Records | 100 |
| Item pages (`archive_item_url`) | 0 filled |
| Direct MP3 URLs | 0 filled |
| Urdu titles | 0 filled |
| Independently verified playback | 0 |
| Rights | `unknown` on all 100 |
| Reported total duration | ~54h 26m (index-reported, unverified) |
| Unique IDs | **No** — `URD-AUD-100` is used twice |
| Duplicate title | `The School Story` appears as `URD-AUD-015` and `URD-AUD-100` |
| Source policy | Internet Archive only |
| Radio | Remains off (`VITE_RADIO_ENABLED=false`); no radio UI, voice calls or `:8080` traffic |

**Nothing from this list may appear in the public library until its Archive.org item, MP3, duration, language and rights are verified.** The Hindi Audio Books index is allowed only as a lead generator; every published record must cite its own Archive.org item page.

## 1. Target structure

| Category | Target | Rule |
|---|---:|---|
| Horror / supernatural | 30 | Must be verified Urdu audio filed as horror/ghost/gothic/supernatural |
| Mystery / detective | 20 | Detective, investigation, crime mystery, suspense |
| Urdu short stories | 20 | Short fiction, not novels or religious texts |
| Classic novels | 15 | Full-length classic fiction / tragedy / historical novel |
| Adventure / fantasy | 10 | Adventure, fantasy, epic, mythology, speculative journeys |
| Children's stories | 5 | Short child-safe stories/fairy tales |
| **Total** | **100** | Counts include only published, verified records |

Candidate labels do not match these buckets (14 `Classic novel`, many `Horror / *`, `Gothic / *`, `Adventure / *`, etc.). Reclassification is manual and must be recorded in the verification manifest. Do not assume the attached distribution already meets the targets.

### Four `Ihya Uloom-ud-Deen` volumes

These are documented Urdu MP3 audiobooks, but they are **religious literature, not horror**.

- Store them in `reference/ihya-uloom-urdu.json` with `excludeFrom100: true`.
- Do not count them toward any of the six targets.
- Verify them only as a separate optional seventh shelf after explicit admin approval.
- Never relabel them as horror to fill the 30-slot target.

## 2. Data contract

Use one reviewed manifest as the source of truth: `src/data/archiveLibraryVerified.json`.

| Requested field | Manifest field | App mapping / rule |
|---|---|---|
| ID | `id` | `URD-AUD-001`; also becomes asset id `archive/urd-aud-001` |
| Title | `title` | `titles[].name` |
| Urdu title | `urduTitle` | `titles[].nameUr`; blank until a human confirms the Urdu spelling |
| Author | `author` | `authors[]` entry + `authorId`; normalise punctuation/spacing |
| Category | `category` | One of the six target strings; becomes `genres[0]` |
| Language | `language` | `ur` only after listening to the item; `reportedLanguage` keeps the index claim |
| Narrator | `narrator` | Item metadata narrator/creator; if absent use `''`, never the index claim as fact |
| Duration | `durationSeconds` | Integer seconds from `ffprobe`; episode `duration` |
| Archive URL | `archiveItemUrl` | Canonical `https://archive.org/details/<id>` |
| MP3 URL | `directMp3Url` | Canonical `https://archive.org/download/<id>/<file>`; random storage nodes are never stored |
| Play status | `playbackStatus` | `verified` / `unavailable` |
| Download status | `downloadStatus` | `verified` / `unavailable` / `rights-blocked` |
| Rights | `rights` | `{ status, licenseUrl, attribution, source, verifiedAt }` |
| Cover | `coverUrl` | `archiveCoverUrl(identifier)` or item metadata cover, HTTP 200 checked |

Additional required fields:

```json
{
  "identifier": "archive-item-id",
  "audioFile": "original-file.mp3",
  "reportedNarrator": "Syed Irfan Ali (reported by source index)",
  "reportedDuration": "00:29:47",
  "candidateSourceUrl": "https://hindiaudiobooksfree.wordpress.com/...",
  "assetId": "archive/urd-aud-001",
  "checkedAt": "2026-11-17T00:00:00Z",
  "checkedBy": "operator-or-agent",
  "notes": ""
}
```

Rights enum: `public-domain`, `cc0`, `cc-by`, `cc-by-sa`, `licensed`, `unknown`, `restricted`.

- `public-domain` / `cc0` / `cc-by`: eligible for offline bundle with attribution.
- `cc-by-sa` / `licensed`: admin decision required before inclusion; attribution/share-alike must be shown on the title page.
- `unknown` / `restricted`: excluded from the public library. Keep only in the internal rejected list.

## 3. Verification gate

Implement `scripts/verify-archive-library.mjs` using Node built-in `fetch` only. No new npm dependency.

For each candidate:

1. **Normalise** — keep the original download immutable; write a working copy. Fix `URD-AUD-100`: keep `URD-AUD-015` (`The School Story`), reassign or drop the duplicate, and source a replacement so the final list still has 100 unique IDs.
2. **Search** — use the existing `archive_search_url` plus `archive.org/advancedsearch.php` / `archive.org/metadata/<id>` through `/import-proxy/archive` helpers already in `src/data/archive.js`. Accept only Archive.org results.
3. **Fetch item metadata** — record `identifier`, `title`, `creator`, `language`, `licenseurl`, `rights`, `rightsstatement`, `description`, and all audio files.
4. **Select audio** — prefer the MP3 whose filename/title matches the candidate. Reject video, broken files, unrelated items and misleading matches. Store the canonical download URL, never a `dn*.archive.org` node.
5. **Probe** — `ffprobe` the downloaded source for codec, sample rate, channels and exact duration. Do not trust the index duration.
6. **Play** — test 30 seconds through both the canonical URL and `fastArchiveStream()` in `src/data/archive.js`. Mark `playbackStatus: verified` only when audio advances without a stall and the speech is Urdu.
7. **Confirm language & narrator** — a human listens for Urdu and checks metadata. If metadata disagrees with the index, metadata + listening win.
8. **Check rights** — item-level rights first, then collection/file notes. If no explicit reusable status exists, set `unknown`; do not infer rights from author death date.
9. **Check cover** — `/services/img/<id>` must return a real image; otherwise leave `coverUrl` blank and let procedural artwork handle it.
10. **Write results** — append to `src/data/archiveLibraryVerified.json` only if all gates pass; write failures to `data/archiveLibraryRejected.json` with a reason (`no-item`, `no-audio`, `not-urdu`, `rights-unknown`, `dead-link`, `duplicate`).

Exit gate for phase: at least one fully verified record per target category before bulk conversion. If Archive.org cannot supply 100 verified items, publish the honest verified count and report the shortfall; never fabricate URLs, durations or rights.

## 4. Audio acquisition & conversion

Add `scripts/convert-archive-library.py`; keep `scripts/make-opus.py` unchanged for existing narrated tracks.

- Download only records with `playbackStatus: verified` and approved rights.
- Raw downloads live in `/tmp/lumina-archive-sources/<id>/` and are never committed.
- Output under `public/audio/archive/` using asset id `archive/<id>`:

| Variant | Command target | Purpose |
|---|---|---|
| `<id>.opus` | Opus 32 kbps, 24 kHz mono | Default |
| `<id>.lo.opus` | Opus 24 kbps, 24 kHz mono | Data saver |
| `<id>.m4a` | AAC 40 kbps mono | Safari/fallback |

- Never emit video or 128 kbps+ audio.
- Write `sha256`, bytes and probed duration into the manifest after conversion.
- Verify with `ffprobe` that every output is mono audio with the expected codec and bitrate.
- Do not overwrite existing programme assets (`raat-01`, `quran-01`, etc.).

## 5. Catalogue integration

### 5.1 Generated module

Add `scripts/build-library-catalogue.mjs` that reads the verified manifest and writes `src/data/generated/archiveLibrary.js`:

- one `titles[]` entry per published record
- one author entry per normalised author (deduped)
- `kind: 'Audiobook'`
- `genres: [category]`
- `lang: 'ur'`
- `sourceUrl: archiveItemUrl`
- `sourceLabel: 'Internet Archive'`
- `rights` attribution string for the title page
- `episodes: [{ id: '<id>-e1', title: title/urduTitle, duration: durationSeconds, src: 'archive/<id>' }]`

`src/data/catalog.js` imports the generated array and spreads it into `titles` / `authors`. The generated file is deterministic; editing it by hand is not allowed.

### 5.2 Genres and routing

- Add six bundled genres to `genres[]`: `Horror / supernatural`, `Mystery / detective`, `Urdu short stories`, `Classic novels`, `Adventure / fantasy`, `Children's stories`.
- Keep one `audiobook` catalogue; the six genres become first-class Explore/Search shelves. No new route is needed.
- Extend `catalogueForTitle()` so any title with one of those genres still resolves to `audiobook` (not `drama`).
- Reuse existing `coverFor()` / artwork store; no new cover component.
- `metadata.js` classification precedence stays intact; add library genres only after the existing Quran/Poetry/Comedy rules, so religious items cannot be mis-filed.

### 5.3 Counts

Export `libraryCategoryCounts()` from the generated module. Device Admin and `/library` show **published verified counts only**, e.g. `Horror / supernatural 12/30`. Candidate counts are admin-only and clearly labelled.

## 6. Admin workflow

Add `src/pages/ArchiveLibraryAdmin.jsx`, mounted as a new `DeviceAdmin` tab. Do not add a route.

Tabs/sections:

1. **Candidate intake** — paste JSON/CSV or pick the two downloaded files; shows duplicate/blank-field warnings.
2. **Verification queue** — table with ID, title, target category, item link, MP3 link, duration, rights, playback, download, publish state.
3. **Actions per row** — Open item, Check metadata, Probe audio, Mark rights, Mark verified, Reject, Publish. Browser actions only update review state and export a manifest; download/conversion stays in the terminal script.
4. **Summary** — target vs verified vs published counts for all six categories; blocked count; shortfall warning.
5. **Import result** — paste the converted manifest produced by the Python script; it must pass the same schema checks before appearing in `/library`.

Reuse `fetchArchiveItem`, `searchArchiveAudio`, `fastArchiveStream`, `archiveCoverUrl` from `src/data/archive.js`; reuse `userCatalog` sanitisation and `Catalog` merge. No new runtime dependency, no radio strings, no `:8080` requests.

## 7. Offline, caching and storage

Reported durations total ~54h. At three variants that is roughly **2.2 GiB**, too large to pre-bundle into the APK by default.

Delivery tiers:

| Tier | Content | Availability |
|---|---|---|
| A — APK offline bundle | 12 curated verified horror titles, default Opus only (~250 MB) | Works with no network after install |
| B — Local Docker library | All published metadata + converted audio served from `http://<this-machine>:4310` | Works on home LAN with no internet |
| C — Archive stream | Canonical Archive.org MP3 URLs for every verified record | Internet required; `fastArchiveStream` avoids dead nodes |

Rules:

- Bundle metadata/covers for all 100; audio is cached on first play or explicit Download.
- Keep `lumina-library-cache-v1` as the planned key for cached asset ids + byte totals; add it to `Memory.md` in the implementation commit.
- Add the new key to `syncBundle.js` allowlist only if cache state should transfer; never transfer audio bytes by default.
- Bump service worker to `/sw.js?v=7` and shell/static cache names when shipping new assets.
- Respect the existing download button, SW `CACHE_AUDIO` API and data-saver `hq` switch.

## 8. UI changes

- `/library` — six category tiles with `published / target` counts, verified-only toggle, sort by title/author/duration, RTL Urdu titles.
- `/explore` and `/genre/:name` — new shelves appear automatically from `genres[]`; no empty shelves for zero-published categories.
- Search — add the six genre chips; show `Internet Archive` source badge.
- Title page — show narrator, exact duration, source link, rights/attribution and `Verified <date>`.
- Device Admin — new Archive library tab described above.
- NowPlaying — unchanged player; announcements continue through the native Urdu TTS path.
- Settings → Data transfer — no UI copy change unless the new cache key is included.

Design stays dark gold-on-ink, token-only CSS, ≥44 px targets, inline SVG icons, motion ≤220 ms.

## 9. QA and verification checklist

### Unit tests

- 100 unique IDs in candidate working copy after dedupe.
- Published manifest has no blank `archiveItemUrl`, `directMp3Url`, `durationSeconds`, `playbackStatus` or `rights`.
- Rights enum enforced; `unknown` never published.
- Category values are exactly the six targets and counts do not exceed targets.
- `catalogueForTitle()` routes all six genres to `audiobook`.
- `sourceList('archive/urd-aud-001')` returns `.opus`, `.lo.opus`, `.m4a`.
- Generated catalogue has no duplicate title IDs and every episode has numeric duration.

### Browser / Docker

```bash
npm run lint
npm test
VITE_SUPABASE_URL= npm run build
docker-compose up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4310/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4310/audio/archive/urd-aud-001.opus
```

Playwright smoke: candidate upload → verification states → publish → Library counts → play one converted title → offline replay → zero radio strings → zero `:8080` requests.

### Tablet

```bash
npx cap sync android
cd android
JAVA_HOME=/tmp/opencode/jdk21 ANDROID_HOME=/home/oem/Android/Sdk ./gradlew assembleDebug --no-daemon
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

On `0102MT2504242159060`: open `/library`, confirm six shelves and counts; play a Tier A title in airplane mode; confirm announcement uses `ur-PK`; check no console errors and storage stays under budget.

## 10. Rollout sequence

| Phase | Work | Exit criterion |
|---|---|---|
| P0 | Data hygiene: dedupe, stable IDs, category mapping, immutable originals | 100 unique candidate IDs, 0 published |
| P1 | Verify 12 horror candidates end-to-end | ≥10 have item + MP3 + duration + rights verified |
| P2 | Build manifest schema + verification script | Rejected records carry reasons; no unknown rights pass |
| P3 | Convert P1 audio | All variants pass `ffprobe`; raw sources outside repo |
| P4 | Generated catalogue + genres + routing | Unit tests green; titles visible only when verified |
| P5 | Device Admin queue UI | Operator can intake, review, reject, publish honestly |
| P6 | Scale verification across remaining categories | Six target counts filled or shortfall documented |
| P7 | Tier A/B/C caching + Library UI | Offline horror bundle + LAN library + Archive fallback |
| P8 | Full QA + Docker + APK release | All checks in §9 pass; docs updated |

## 11. Definition of done

- [ ] 100 unique candidate IDs; duplicate `URD-AUD-100` / `The School Story` resolved.
- [ ] Every published record has a verified Archive.org item page, playable MP3, probed duration, confirmed Urdu language and explicit rights.
- [ ] Four `Ihya Uloom-ud-Deen` volumes remain excluded from the six-category target.
- [ ] Generated catalogue builds from the reviewed manifest; no hand-edited 100-title array.
- [ ] Six shelves show honest `published / target` counts.
- [ ] No blank MP3 URLs, guessed rights or index-reported durations are shipped.
- [ ] Tier A APK bundle, Tier B Docker library and Tier C Archive stream all tested.
- [ ] Radio remains disabled; no new runtime dependency; no new routes.
- [ ] `npm run lint`, `npm test`, build, Docker rebuild, `cap sync`, Gradle build and APK install pass.
- [ ] `Task.md`, `Implementation Plan.md`, `Memory.md` and `Brain.md` updated with the shipped state.

## 12. Risks

| Risk | Response |
|---|---|
| Fewer than 100 verifiable Archive items | Publish verified count; never fabricate. Shortfall is a report, not a blocker for a smaller release. |
| Rights unclear on most items | Exclude from bundle; keep as internal candidate. |
| Archive node stalls | Store canonical URL; resolve with `fastArchiveStream()`; keep local Docker copies. |
| APK size | Tier A only in APK; rest cached from LAN or Archive. |
| Mislabelled category | Human review before publish; counts come only from published records. |
| Duplicate/blank candidate data | P0 gate blocks everything until fixed. |
| Radio accidentally returns | Keep `VITE_RADIO_ENABLED=false`; QA asserts zero radio strings and zero `:8080` requests. |
