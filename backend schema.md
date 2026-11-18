# backend schema.md — Supabase + R2

Single source of truth: `SCHEMA_SQL` in `src/data/api.js` (also displayed in Admin → Storage).
Audio bytes are **never** stored in Supabase — only the text URL pointing at Cloudflare R2.

## 1. Services
| Service | Owns | Config |
|---|---|---|
| Supabase Auth | credentials (`auth.users`, protected) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Supabase Postgres | `profiles`, `stories` + RLS | same |
| Cloudflare R2 | audio objects (10 GB free, zero egress) | `VITE_MEDIA_BASE_URL` (public/custom-domain URL) |
| Supabase Storage / any CDN | cover images (optional) | absolute URL in `stories.cover_url` |

All optional: without env vars the app runs on the bundled catalogue with local demo auth.

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
  audio_url text not null,        -- Cloudflare R2 public URL (text only)
  cover_url text,                 -- Archive.org / R2 / any image URL
  duration integer,               -- seconds, for fast UI
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
alter table stories add column if not exists cover_url text;
create index if not exists stories_created_idx on stories (created_at desc);
```

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

-- stories: public read; only admins may write.
create policy "stories readable" on stories for select using (true);
create policy "admins manage stories" on stories for all to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
```
Promote yourself once after signing up:
```sql
update profiles set role = 'admin' where id = '<your-user-uuid>';
```

## 4. Client API (`src/data/api.js`, plain `fetch`, no SDK)
| Group | Functions | Endpoint |
|---|---|---|
| Session | `getStoredSession`, `isSignedIn`, `validToken` (refresh ≤ 60 s skew) | `localStorage['lumina-supabase-session-v1']` |
| Auth | `signUp`, `signIn`, `signOut`, `refreshSession`, `getUser` | `POST /auth/v1/signup`, `/auth/v1/token?grant_type=password|refresh_token`, `/auth/v1/logout`, `GET /auth/v1/user` |
| Profiles | `ensureProfile`, `fetchProfile`, `fetchProfiles`, `updateProfile` | `/rest/v1/profiles` |
| Stories | `fetchStories`, `createStory`, `updateStory`, `deleteStory` | `/rest/v1/stories` |
| Helpers | `r2Url`, `isLikelyAudioUrl`, `healthCheck`, `backendLabel`, `apiConfigured` | — |

Headers on every REST call: `apikey: <anon>`, `Authorization: Bearer <jwt>`,
`Prefer: return=representation` (writes). Errors surface as `Supabase <status>: <body>`.

## 5. Media URL resolution
```
audio_url in stories  ──r2Url()──▶  absolute http(s) URL
  ├─ already absolute  → used as-is
  └─ bare key           → `${VITE_MEDIA_BASE_URL}/${key}`
bundled assets         → `/audio/<id>.opus` | `.lo.opus` | `.m4a` | `.en.*`
```
Source ladder is built by `sourceList()` in `src/data/media.js` (see `TRD.md` FR-1).

## 6. R2 bucket layout (convention)
```
audio/
  <asset-id>.opus          48k mono
  <asset-id>.lo.opus       24k data-saver
  <asset-id>.m4a           AAC fallback
  <asset-id>.en.*          English variants
```
Same filenames as `public/audio/`, so switching bases is a one-variable change.

## 7. Setup checklist
1. Create Supabase project → copy URL + anon key to `.env`.
2. Run `SCHEMA_SQL` in the SQL editor (tables, index, trigger, RLS).
3. Sign up, promote yourself to admin (SQL above).
4. Create R2 bucket → set public/custom-domain base URL → `VITE_MEDIA_BASE_URL`.
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
