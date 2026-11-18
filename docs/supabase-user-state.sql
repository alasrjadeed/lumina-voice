-- Lumina Voice · cross-device local-data sync
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Only JSON metadata is stored here. Audio files stay on the device.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  library jsonb not null default '[]'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  client_id text,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- New tables created in the SQL editor need explicit grants for PostgREST.
grant select, insert, update, delete on public.user_state to authenticated;

drop policy if exists "own user_state read" on public.user_state;
create policy "own user_state read" on public.user_state
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "own user_state insert" on public.user_state;
create policy "own user_state insert" on public.user_state
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own user_state update" on public.user_state;
create policy "own user_state update" on public.user_state
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Let the Android app and the local web app see each other's changes live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_state'
  ) then
    alter publication supabase_realtime add table public.user_state;
  end if;
end $$;
