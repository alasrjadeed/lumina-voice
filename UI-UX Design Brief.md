# UI/UX Design Brief — Lumina Voice

## 1. Product in one sentence
An Urdu-first audio streaming PWA where a listener signs in, browses a curated catalogue or live radio,
downloads for offline, and listens in a dark, quiet, story-led interface.

## 2. Audience
| Persona | Need | Design implication |
|---|---|---|
| **Urdu listener** (primary, PK/diaspora) | Drama/audiobooks at night, low bandwidth | RTL-capable type, Naskh for Urdu, `.lo` data-saver default-able, offline first-class |
| **Radio listener** | Live station, now-playing, minimal taps | `/radio` reachable in one tap from bottom nav; embeddable `?embed=1` player |
| **Publisher / admin** | Upload, schedule, ads, analytics | `/admin` Broadcast Studio — dense, data-forward, mono for URLs/SQL |
| **Occasional web user** | Just press play | Installable PWA, guest/demo auth, no onboarding walls |

## 3. Principles
1. **Listen, don't look** — the player is always one tap away (MiniBar), controls ≥ 44px.
2. **Dark by default** — a night product; light theme is out of scope.
3. **Content, not chrome** — covers + titles carry the screen; no decorative widgets.
4. **Honest states** — offline, download progress, codec/quality and live status are always visible.
5. **Two densities** — listener screens airy; admin screens compact and tabular.

## 4. Information architecture
```
/auth ─▶ / (Home: hero, kind pills, rails, people)
          ├─ /explore ─ /genre/:name ─ /kind/:name
          ├─ /search
          ├─ /title/:id ─▶ /now (full player)
          │     └─ /series/:id · /person/:id
          ├─ /library (continue · saved · downloads)
          ├─ /radio (internal broadcast or external mount; ?embed=1 bare)
          ├─ /settings (Import Studio · Artwork Studio · PWA install · account)
          └─ /admin (Overview · Schedule · Content · Files · Cloud · Voices ·
                     Automation · Advertising · Stream · Analytics · Storage · Logs)
```

## 5. Key screens & jobs
| Screen | Must answer in 3 seconds | Primary action |
|---|---|---|
| Auth | "Can I just start?" | Sign in / demo entry |
| Home | "What should I hear?" | Play hero or a rail item |
| Title | "What's in it, is it free, can I download?" | Play episode · heart · download |
| Now Playing | "Where am I, what quality?" | Seek · language pill · quality pill |
| Library | "What was I listening to?" | Resume · manage downloads |
| Radio | "Who's on air right now?" | Play live · see now-playing |
| Settings | "Offline, install, my art, my imports" | Import / artwork / account |
| Admin | "Is the station running?" | Take over · skip · return to AI |

## 6. Critical flows
1. **First run**: open app → `/auth` (or demo) → Home hero → tap → plays within one screen.
2. **Download for offline**: Title → download button → progress % in Library → offline banner confirms.
3. **Live radio**: Radio → play → Now Playing shows now-playing + mount pills (opus/m4a/mp3).
4. **Admin intervention**: Admin → Overview → *Take over* / *Skip* / *Return to AI* → Logs entry.

## 7. States every screen needs
Loading ("Loading…") · Empty (`.empty` display heading + one gold line + action) ·
Error (plain-language cause + recovery button) · Offline (banner, downloads still playable) ·
Premium locked (lock icon, non-free episodes) · Admin-only ("Studio access only").

## 8. Accessibility contract
WCAG 2.2 AA: contrast, 44px targets, `:focus-visible` gold outline, `aria-label` on all icon buttons,
`role="status"` on the offline banner, reduced-motion honoured, keyboard-reachable player controls.

## 9. Out of scope (v1)
Light theme · video · social features (follow/share graphs) · recommendations ML · multi-profile households.

## 10. Handoff
Tokens and component classes: `Design.md` + `src/index.css`. Layout shell: `src/App.jsx`.
Journeys/routes: `app flow.md`. Deviation from `Design.md` requires updating it in the same change.
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## Local server journey (2026-11-17)
- Listener opens `/radio` on `192.168.1.166:4310`; page auto-uses the local AzuraCast mount and shows real now-playing data.
- Operator opens `/integrations`: API URL `http://192.168.1.166:8080`, listener URL `http://192.168.1.166:8080`, shortcode `lumina_voice`. Optional exact listen URL overrides generated mounts.
- Every state (ready / waiting / unreachable / off air) is visible in the readiness list; errors include an actionable hint.
- Logging and Sentry run invisibly; no extra UI chrome.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
