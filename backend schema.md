# backend schema.md — Supabase + Archive.org

Base schema: `SCHEMA_SQL` in `src/data/api.js` (also displayed in Admin → Storage).
Policy migrations: `docs/supabase-admin-lockdown.sql`, `docs/supabase-archive-only.sql`,
`docs/supabase-cloud-catalogue.sql` and `docs/supabase-user-state.sql`. Audio bytes are **never** stored in Supabase or
the transfer bundle — only a direct Archive.org URL as text.

## 1. Services
| Service | Owns | Config |
|---|---|---|
| Supabase Auth | credentials (`auth.users`, protected) | `VITE_SUPABASE_URL`, publishable key |
| Supabase Postgres | `profiles`, `stories`, `ratings`, `reviews`, `user_state` + RLS | same |
| Internet Archive | every catalogue audio file | `https://archive.org/download/<id>/<file>` |
| Archive covers | cover images | `https://archive.org/services/img/<id>` |

All optional: without env vars the app runs on the archive-only catalogue with local demo auth.

## 2. Tables

### `profiles` — 1:1 with `auth.users`
```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  role text not null default 'listener',   -- 'listener' | 'admin'
  created_at timestamptz default now()
);
```

### `stories` — the cloud catalogue
```sql
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  audio_url text not null,        -- https://archive.org/download/<id>/<file>.<ext>
  cover_url text,                 -- Archive.org image URL
  duration integer,               -- seconds, for fast UI
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
alter table stories add column if not exists cover_url text;
create index if not exists stories_created_idx on stories (created_at desc);

alter table public.stories drop constraint if exists stories_archive_audio_url_chk;
alter table public.stories add constraint stories_archive_audio_url_chk
  check (audio_url ~* '^https://archive\.org/download/[^/]+/.+\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(\?.*)?$');
```

`stories.published` (boolean, default true) is the publish switch. Draft rows stay
visible in Admin → Cloud catalogue but are skipped by the exporter and by the app.
Apply `docs/supabase-cloud-catalogue.sql` once to add it to an existing project.
Every published archive-only row is also exported to `public/catalogue.json` by
`npm run catalogue:export` (install with `scripts/install-catalogue-cron.sh` for a
15-minute cron). The snapshot holds `{version, generatedAt, source, stories}` —
metadata only. `src/data/cloudCatalogue.js` maps each row to one app title with a
single playable episode and an `Audiobook · archive.org` source link; devices
pull the snapshot and keep the last good copy in `lumina-cloud-catalogue-v1`.

### Auto-profile trigger
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## 3. Row Level Security
```sql
alter table profiles enable row level security;
alter table stories  enable row level security;

-- profiles: anyone signed in may read; you may edit only your own row.
create policy "profiles readable" on profiles for select using (true);
create policy "own profile insert" on profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile writable" on profiles for update to authenticated using (auth.uid() = id);

-- stories: public read; only the operator email may write.
create policy "stories readable" on stories for select using (true);
create policy "admins manage stories" on stories for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());
```
Run `docs/supabase-admin-lockdown.sql` for `public.is_operator()`, the role-enforcement trigger and the one-time stale-admin repair. Only `info@alasarjadeed.com` may be admin; all other emails are listeners.

## 4. Client API (`src/data/api.js`, plain `fetch`, no SDK)
| Group | Functions | Endpoint |
|---|---|---|
| Session | `getStoredSession`, `isSignedIn`, `validToken` (refresh ≤ 60 s skew) | `localStorage['lumina-supabase-session-v1']` |
| Auth | `signUp`, `signIn`, `signOut`, `refreshSession`, `getUser` | `POST /auth/v1/signup`, `/auth/v1/token?grant_type=password|refresh_token`, `/auth/v1/logout`, `GET /auth/v1/user` |
| Profiles | `ensureProfile`, `fetchProfile`, `fetchProfiles`, `updateProfile` | `/rest/v1/profiles` |
| Stories | `fetchStories`, `createStory`, `updateStory`, `deleteStory` | `/rest/v1/stories` |
| Helpers | `canonicalArchiveUrl`, `isArchiveAudioUrl`, `isLikelyAudioUrl`, `healthCheck`, `backendLabel`, `apiConfigured` | — |

Headers on every REST call: `apikey: <anon>`, `Authorization: Bearer <jwt>`,
`Prefer: return=representation` (writes). Errors surface as `Supabase <status>: <body>`.

## 5. Media URL resolution
```
stories.audio_url → canonicalArchiveUrl() → https://archive.org/download/<id>/<file>
                  → isArchiveAudioUrl()  → accepted only if direct audio file
                  → AppState.loadOpus()  → canonical stream, then direct-node failover
```
`www.archive.org` is rewritten to `archive.org` before storage and playback so CORS and cloud rows match. Non-Archive URLs are filtered on read and rejected on write.

## 6. Bundled audio
Only `ad-*` files are bundled in web and native builds. Catalogue audio is never copied into `public/audio`, IndexedDB, Supabase or the transfer bundle.

## 7. Setup checklist
1. Create/use the Supabase project → copy the public URL + publishable key to `.env`.
2. Run `SCHEMA_SQL` in the SQL editor, then `docs/supabase-admin-lockdown.sql`, `docs/supabase-archive-only.sql` and `docs/supabase-user-state.sql`.
3. Sign in with `info@alasarjadeed.com`; no other account can be admin.
4. Keep Archive.org URLs direct; do not set a media base for catalogue audio.
5. Admin → Storage → **Test Supabase connection** must return `ok`.
6. Never commit `.env` (`.gitignore` already excludes `**/.env*`).
---
Updated: added Autobiography category and Quran Kareem/Urdu Translation handling.

## External broadcast config (not Postgres)
These values live in the browser's `lumina-stream-v2` record, produced by `src/data/stream.js`:
```json
{ "enabled": true, "provider": "azuracast", "baseUrl": "http://192.168.1.166:8080",
  "streamBaseUrl": "http://192.168.1.166:8080", "shortcode": "lumina_voice",
  "stationId": "2", "listenUrl": "", "mount": "", "autoRefresh": true }
```
AzuraCast station id `2` is addressed as `/api/station/2/nowplaying` with `X-API-Key`; public reads use `/api/nowplaying/lumina_voice`. No key is stored in this document.

## Radio feature — PAUSED (2026-11-17)
- Public live radio is disabled until broadcast resources are available. Radio source is kept intact for a one-switch relaunch.
- Feature flag: `VITE_RADIO_ENABLED` (default `false`, set in `.env.production` / `.env.example`). `src/config/features.js` exports `RADIO_ENABLED`.
- When `false`: no Radio nav tab or `/radio` route (old `/radio` redirects to `/`), no embed page, no Home/Site radio links, no Broadcast Studio (`/admin` redirects to `/`, studio nav hidden), no radio voice commands or alerts, no external-stream stats/embeds, and no requests to `http://192.168.1.166:8080`. `loadStreamConfig()` reports `enabled: false`; `useNowPlaying`, `playExternal`, `playRadio`, `playBroadcast`, AzuraCast API and show reminders are no-ops.
- All radio code (Broadcast Studio, bundled Sada Bahar desk, AzuraCast config, embeds) stays in the source tree, fully gated — nothing radio-related runs while the flag is off.
- Relaunch: set `VITE_RADIO_ENABLED=true`, rebuild (`npm run build` / `docker compose up -d --build`) and radio pages, tabs, embeds and stream calls return unchanged.
- Verified: `npm run lint`, `npm test` (97/97), `npm run build`; browser smoke test confirmed no radio links, `/radio` → `/`, no `:8080` requests.
