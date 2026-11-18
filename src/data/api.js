// Supabase backend for Lumina Voice — Auth + PostgreSQL, spoken to over plain
// fetch (no SDK), so the bundle stays tiny and there is nothing to tree-shake.
//
// Architecture:
//   - Internet Archive   hosts every public-domain audio file. The app only stores
//                        the direct HTTPS download URL as text.
//   - Supabase Auth      owns credentials in the protected `auth.users` table.
//   - Supabase `profiles` links a listener row 1:1 to `auth.users.id`.
//   - Supabase `stories`  is the Archive-only catalogue: title, description,
//                        audio_url, duration — never the audio bytes themselves.
//
// If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent, every call degrades
// gracefully so the app runs fully offline on the bundled catalog.

import { canonicalArchiveUrl, isArchiveAudioUrl } from './contentPolicy'

const URL_ = (import.meta.env?.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
// Supabase's Connect dialog now issues a publishable key (sb_publishable_...).
// Older anon JWTs still work, so keep them as a fallback for existing setups.
const ANON = (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim()

const SESSION_KEY = 'lumina-supabase-session-v1'

export function apiConfigured() {
  return URL_.length > 0 && ANON.length > 0
}

export function backendLabel() {
  if (!apiConfigured()) return 'Bundled catalog (offline)'
  try {
    return new URL(URL_).host
  } catch {
    return 'Supabase'
  }
}

// Realtime speaks the Phoenix protocol over a plain WebSocket, so no SDK is
// needed. Browsers cannot set headers on a WebSocket: Supabase accepts the
// publishable key as `apikey` and the signed-in JWT as `access_token`.
export function realtimeEndpoint(token) {
  if (!apiConfigured()) return ''
  try {
    const u = new URL(URL_)
    const ws = u.protocol === 'https:' ? 'wss:' : 'ws:'
    const base = `${ws}//${u.host}/realtime/v1/websocket?apikey=${encodeURIComponent(ANON)}&vsn=1.0.0`
    return token ? `${base}&access_token=${encodeURIComponent(token)}` : base
  } catch {
    return ''
  }
}

// A connected app must still work with no signal. Only transport-level failures
// count as offline — a real Supabase error (wrong password, missing profile)
// must be shown to the listener instead of being hidden behind demo auth.
export function isOfflineError(error) {
  const msg = String(error?.message || error || '')
  return error instanceof TypeError || /failed to fetch|network|offline|load failed/i.test(msg)
}

/* ------------------------------------------------------------------ *
 * Session store — access/refresh tokens kept in localStorage.
 * ------------------------------------------------------------------ */

let session = null
try {
  if (typeof localStorage !== 'undefined') {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  }
} catch {
  session = null
}

function persistSession(next) {
  session = next
  try {
    if (typeof localStorage === 'undefined') return
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function getStoredSession() {
  return session
}

export function isSignedIn() {
  return !!session?.access_token
}

async function authRequest(path, { method = 'POST', body, token, extraHeaders } = {}) {
  if (!apiConfigured()) throw new Error('Supabase is not configured')
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method,
    headers: {
      apikey: ANON,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extraHeaders || {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.msg || data?.error_description || data?.message || res.statusText
    throw new Error(msg)
  }
  return data
}

// Anon key alone is enough to read/write under RLS using the signed-in JWT.
function withAuth(token) {
  const bearer = token || session?.access_token || ANON
  return {
    apikey: ANON,
    Authorization: `Bearer ${bearer}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  }
}

// Low-level REST escape hatch — used by feature modules (ratings, reviews)
// that own their own tables rather than the catalogue helpers below.
export async function rest(path, { method = 'GET', body, token, signal, prefer } = {}) {
  if (!apiConfigured()) throw new Error('Supabase is not configured')
  const headers = withAuth(token)
  if (prefer) headers.Prefer = prefer
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    signal,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }
  return res.status === 204 ? null : res.json()
}

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

function normaliseSession(raw) {
  if (!raw?.access_token) return null
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_at: raw.expires_at || (raw.expires_in ? Math.floor(Date.now() / 1000) + raw.expires_in : null),
    user: raw.user
      ? {
          id: raw.user.id,
          email: raw.user.email,
          createdAt: raw.user.created_at,
          emailConfirmed: !!raw.user.email_confirmed_at
        }
      : undefined
  }
}

export async function signUp({ email, password, username }) {
  const raw = await authRequest('signup', { body: { email, password } })
  // Depending on project settings Supabase either returns a session immediately or
  // asks the user to confirm their email first.
  const sess = normaliseSession(raw)
  if (!sess) return { needsConfirmation: true, user: raw?.user ? { id: raw.user.id, email: raw.user.email } : null }
  persistSession(sess)
  await ensureProfile({ id: sess.user.id, username: username || email.split('@')[0] })
  return { needsConfirmation: false, session: sess }
}

export async function signIn({ email, password }) {
  const raw = await authRequest('token?grant_type=password', { body: { email, password } })
  const sess = normaliseSession(raw)
  if (!sess) throw new Error('No session returned')
  persistSession(sess)
  await ensureProfile({ id: sess.user?.id, username: email.split('@')[0] })
  return sess
}

export async function signOut() {
  try {
    if (apiConfigured() && session?.access_token) {
      await authRequest('logout', { token: session.access_token, extraHeaders: {} })
    }
  } catch {
    /* best-effort */
  }
  persistSession(null)
}

// Supabase sends a one-time recovery link to the address on file. The link
// opens /auth#access_token=... which consumeOAuthRedirect() already handles,
// so password reset needs no new route or callback page.
export async function requestPasswordReset(email) {
  if (!apiConfigured()) throw new Error('Supabase is not configured')
  const address = String(email || '').trim()
  if (!address.includes('@')) throw new Error('Enter your email address.')
  await authRequest('recover', { body: { email: address } })
  return true
}

/* ------------------------------------------------------------------ *
 * OAuth (Google via Supabase /auth/v1/authorize, implicit flow)
 * ------------------------------------------------------------------ */

// Builds the Supabase authorize URL. Requires the Google provider to be enabled
// in the Supabase dashboard (Auth → Providers → Google) with the redirect URL
// https://<your-project>.supabase.co/auth/v1/callback whitelisted.
export function oauthAuthorizeUrl(provider = 'google') {
  if (!apiConfigured()) return ''
  const redirectTo = `${window.location.origin}/auth`
  return `${URL_}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`
}

// After Supabase redirects back to /auth with tokens in the URL fragment,
// persist the session and return it (or null when there is nothing to consume).
export async function consumeOAuthRedirect() {
  if (!apiConfigured() || typeof window === 'undefined') return null
  let hash
  try {
    hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
  } catch {
    return null
  }
  const access_token = hash.get('access_token')
  if (!access_token) return null
  const sess = normaliseSession({
    access_token,
    refresh_token: hash.get('refresh_token'),
    expires_in: Number(hash.get('expires_in')) || 3600,
    token_type: hash.get('token_type')
  })
  if (!sess) return null
  persistSession(sess)
  const live = await getUser(sess.access_token)
  if (live) sess.user = live
  try {
    window.history.replaceState({}, '', window.location.pathname)
  } catch {
    /* ignore */
  }
  return sess
}

/* ------------------------------------------------------------------ *
 * Premium checkout (Stripe Payment Link — no server code required)
 * ------------------------------------------------------------------ */

const CHECKOUT_URL = (import.meta.env?.VITE_STRIPE_PAYMENT_LINK || '').trim()

export function checkoutConfigured() {
  return CHECKOUT_URL.length > 0
}

// Opens the Stripe Payment Link. Configure the link's success URL to
// https://<origin>/?checkout=success so the app can unlock Lumina Plus on return.
export function startCheckout(userId) {
  if (!CHECKOUT_URL || typeof window === 'undefined') return false
  let url
  try {
    url = new URL(CHECKOUT_URL)
  } catch {
    return false
  }
  if (userId) url.searchParams.set('client_reference_id', String(userId))
  url.searchParams.set('cancel_return_url', `${window.location.origin}/settings`)
  window.location.href = url.toString()
  return true
}

export async function refreshSession() {
  if (!apiConfigured() || !session?.refresh_token) return null
  try {
    const raw = await authRequest('token?grant_type=refresh_token', {
      body: { refresh_token: session.refresh_token }
    })
    const sess = normaliseSession(raw)
    if (sess) persistSession(sess)
    return sess
  } catch {
    persistSession(null)
    return null
  }
}

export async function getUser(token) {
  if (!apiConfigured()) return null
  const bearer = token || session?.access_token
  if (!bearer) return null
  try {
    const u = await authRequest('user', { method: 'GET', token: bearer })
    return { id: u.id, email: u.email, createdAt: u.created_at, emailConfirmed: !!u.email_confirmed_at }
  } catch {
    return null
  }
}

// Refreshes the access token when it is within a minute of expiry.
export async function validToken() {
  if (!session) return null
  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at && session.expires_at - now < 60 && session.refresh_token) {
    const refreshed = await refreshSession()
    return refreshed?.access_token || null
  }
  return session.access_token
}

/* ------------------------------------------------------------------ *
 * profiles — 1:1 with auth.users
 * ------------------------------------------------------------------ */

export async function ensureProfile({ id, username }) {
  if (!apiConfigured() || !id) return null
  try {
    const token = await validToken()
    const [row] = await rest('profiles', {
      method: 'POST',
      token,
      body: [{ id, username: username || null }],
      prefer: 'resolution=merge-duplicates,return=representation'
    })
    return row
  } catch {
    return null
  }
}

export async function fetchProfile(userId) {
  if (!apiConfigured() || !userId) return null
  const rows = await rest(`profiles?select=*&id=eq.${encodeURIComponent(userId)}&limit=1`)
  const r = (rows || [])[0]
  if (!r) return null
  return { id: r.id, username: r.username, role: r.role || 'listener', createdAt: r.created_at }
}

// Alias — feature modules read "get the profile for this id".
export const getProfile = fetchProfile

export async function fetchProfiles(signal) {
  const rows = await rest('profiles?select=*', { signal })
  return (rows || []).map((r) => ({ id: r.id, username: r.username, role: r.role || 'listener', createdAt: r.created_at }))
}

export async function updateProfile(userId, patch) {
  const token = await validToken()
  const [row] = await rest(`profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    token,
    body: patch
  })
  return row
}

/* ------------------------------------------------------------------ *
 * stories — the catalogue of titles + Archive.org audio URLs
 * ------------------------------------------------------------------ */

function mapStory(r) {
  const audioUrl = canonicalArchiveUrl(r.audio_url)
  if (!isArchiveAudioUrl(audioUrl)) return null
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    audioUrl,
    coverUrl: canonicalArchiveUrl(r.cover_url) || '',
    duration: r.duration,
    authorId: r.author_id,
    createdAt: r.created_at
  }
}

export async function fetchStories(signal) {
  const rows = await rest('stories?select=*&order=created_at.desc', { signal })
  return (rows || []).map(mapStory).filter(Boolean)
}

// Log a public-domain recording whose stream already lives on Archive.org.
export async function createStory({ title, description, audioUrl, coverUrl, duration, authorId }) {
  const stream = canonicalArchiveUrl(audioUrl)
  if (!isArchiveAudioUrl(stream)) throw new Error('Only direct Archive.org audio URLs can be saved.')
  const token = await validToken()
  const [row] = await rest('stories', {
    method: 'POST',
    token,
    body: [{
      title,
      description,
      audio_url: stream,
      cover_url: canonicalArchiveUrl(coverUrl) || null,
      duration,
      author_id: authorId || null
    }]
  })
  return mapStory(row)
}

export async function updateStory(id, patch) {
  const token = await validToken()
  const payload = {}
  if (patch.title !== undefined) payload.title = patch.title
  if (patch.description !== undefined) payload.description = patch.description
  if (patch.audioUrl !== undefined) {
    const stream = canonicalArchiveUrl(patch.audioUrl)
    if (!isArchiveAudioUrl(stream)) throw new Error('Only direct Archive.org audio URLs can be saved.')
    payload.audio_url = stream
  }
  if (patch.coverUrl !== undefined) payload.cover_url = canonicalArchiveUrl(patch.coverUrl) || null
  if (patch.duration !== undefined) payload.duration = patch.duration
  const [row] = await rest(`stories?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', token, body: payload })
  return mapStory(row)
}

export async function deleteStory(id) {
  const token = await validToken()
  await rest(`stories?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', token, prefer: 'return=minimal' })
  return true
}

/* ------------------------------------------------------------------ *
 * media helpers
 * ------------------------------------------------------------------ */

// Legacy bare-key resolver for non-catalogue media. Archive.org streams are always
// absolute URLs and are never rewritten through VITE_MEDIA_BASE_URL.
export function r2Url(keyOrUrl) {
  if (!keyOrUrl) return ''
  if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl
  const base = (getMediaBase() || '').replace(/\/+$/, '')
  const key = keyOrUrl.replace(/^\/+/, '')
  return base ? `${base}/${key}` : `/${key}`
}

function getMediaBase() {
  return (import.meta.env?.VITE_MEDIA_BASE_URL || '').trim()
}

// Validates a pasted Archive.org stream before it is written to the database.
export function isLikelyAudioUrl(url) {
  return isArchiveAudioUrl(canonicalArchiveUrl(url))
}

export { isArchiveAudioUrl, canonicalArchiveUrl }

export async function healthCheck(signal) {
  if (!apiConfigured()) return { ok: false, reason: 'not-configured' }
  try {
    await rest('stories?select=id&limit=1', { signal })
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

// SQL to create the schema (shown in the Studio → Storage tab).
export const SCHEMA_SQL = `-- Lumina Voice · Supabase schema
-- Audio is NEVER stored here — only a direct Archive.org URL as text.
-- Run docs/supabase-admin-lockdown.sql and docs/supabase-archive-only.sql
-- after this base schema; they are the authoritative policy migrations.

-- Exactly one operator may administer the shared app.
create or replace function public.is_operator()
returns boolean language sql stable security definer
set search_path = public, auth as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and lower(coalesce(email, '')) = lower('info@alasarjadeed.com')
  );
$$;
revoke all on function public.is_operator() from public;
grant execute on function public.is_operator() to authenticated;

-- Table A · profiles (1:1 with the protected auth.users table)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  role text not null default 'listener',   -- 'listener' | 'admin'
  created_at timestamptz default now()
);

-- Table B · stories (the library catalogue)
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
  check (audio_url ~* '^https://archive\\.org/download/[^/]+/.+\\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(\\?.*)?$');

-- Auto-create a profile row whenever a user signs up.
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

-- Row Level Security
alter table profiles enable row level security;
alter table stories  enable row level security;

-- profiles: anyone signed in may read; you may edit only your own row.
create policy "profiles readable" on profiles
  for select using (true);
create policy "own profile insert" on profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "own profile writable" on profiles
  for update to authenticated using (auth.uid() = id);

-- stories: public read; only the operator email may write.
create policy "stories readable" on stories
  for select using (true);
create policy "admins manage stories" on stories
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- Realtime: publish the tables the app listens to, so a change on one device
-- appears live on the other (web and tablet). Safe to run more than once.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then alter publication supabase_realtime add table public.profiles; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stories'
  ) then alter publication supabase_realtime add table public.stories; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ratings'
  ) then alter publication supabase_realtime add table public.ratings; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews'
  ) then alter publication supabase_realtime add table public.reviews; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_state'
  ) then alter publication supabase_realtime add table public.user_state; end if;
end $$;

-- grant select, insert, update, delete on public.user_state to authenticated;
-- Cross-device local data: complete SQL is in docs/supabase-user-state.sql.

-- Admin is fixed to info@alasarjadeed.com. Run docs/supabase-admin-lockdown.sql
-- in the Supabase SQL Editor; it adds the operator check, repairs stale profile
-- roles and makes the stories policy use the email, not a writable role column.`
