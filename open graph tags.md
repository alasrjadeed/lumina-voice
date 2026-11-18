# open graph tags.md — social sharing metadata

Status: **not yet in `index.html`** — paste the block below into `<head>` before `<title>`.

## 1. Static tags (site-wide)

```html
<!-- Open Graph -->
<meta property="og:type"        content="website" />
<meta property="og:site_name"   content="Lumina Voice" />
<meta property="og:title"       content="Lumina Voice — Urdu audio-films, dramas & live radio" />
<meta property="og:description" content="Close your eyes. The story begins. Urdu audio-films, dramas, series, audiobooks and live radio — streamed as Opus 24–48 kbps mono." />
<meta property="og:url"         content="https://luminavoice.app/" />
<meta property="og:image"       content="https://luminavoice.app/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt"   content="Lumina Voice — gold wordmark on a dark night-sky background" />
<meta property="og:locale"      content="en_US" />
<meta property="og:locale:alternate" content="ur_PK" />

<!-- Twitter / X -->
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:title"       content="Lumina Voice — Urdu audio-films, dramas & live radio" />
<meta name="twitter:description" content="Close your eyes. The story begins. Urdu audio-films, dramas, series, audiobooks and live radio." />
<meta name="twitter:image"       content="https://luminavoice.app/og.png" />
<meta name="twitter:image:alt"   content="Lumina Voice — gold wordmark on a dark night-sky background" />
```

Replace `https://luminavoice.app/` with the real production origin everywhere.

## 2. Asset spec — `public/og.png`
- **1200 × 630 px**, PNG/JPEG ≤ 300 KB (target ~180 KB).
- Safe zones: keep text inside the middle 1000 px (X crops ~15% on card preview).
- Look: `--bg #08070b`, gold `#e4c36a` wordmark, violet radial glow top-left (match `Design.md`).
- Also ship `public/twitter-card.png` only if a different crop is needed (same size).
- Fallback if missing: platforms show a broken/blank card — **add the image before the tags**.

## 3. Also add in `<head>` while there
```html
<link rel="canonical" href="https://luminavoice.app/" />
<link rel="alternate" type="text/plain" href="/llms.txt" title="Lumina Voice LLM summary" />
<meta name="theme-color" content="#08070b" />   <!-- already present -->
```

## 4. Per-route dynamic tags (phase 2)
The SPA has one `index.html`, so crawlers only see the static tags. To share a specific title:
- Option A (recommended): prerender `/title/:id` OG tags at deploy (small Node script over `src/data/catalog.js`).
- Option B: add `?t=<id>` landing route server-side.
- Fallback: keep the generic tags above — they are valid for every route.

Per-title field mapping: `og:title` ← `title.name`, `og:description` ← first line of synopsis,
`og:image` ← `coverFor(id)` (or `https://archive.org/services/img/{id}`), `og:type` → `video.other` is
wrong here — use `website` (audio is streamed, not a page-level `video`/`music.song` object).

## 5. Validation checklist
- [ ] Facebook Sharing Debugger → no `og:image` error
- [ ] Twitter Card Validator → `summary_large_image` renders
- [ ] WhatsApp/Telegram preview shows title + description
- [ ] `og:url` matches the canonical URL exactly (no trailing-slash mismatch)
- [ ] Image loads over HTTPS, ≤ 300 KB, correct 1200×630 dimensions
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Local deployment note
OG/Twitter tags must keep a **public** absolute URL. Never put `192.168.1.166:8080` or `192.168.1.166:4310` in `og:url`, `og:image` or `twitter:player` — LAN addresses are not crawlable. The local broadcast server affects the player only; social previews stay on the production domain.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
