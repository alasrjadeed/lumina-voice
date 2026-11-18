-- Run once in the Supabase SQL Editor for project ueiwzhjruyijtssysekq.
-- Goal: anyone may sign in, but exactly one email is an admin everywhere
-- (local web, Android tablet and Supabase row policies). No service key needed
-- by the app; this is a one-time dashboard migration.

begin;

-- Cheap security-definer check usable from RLS without exposing auth.users.
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(coalesce(email, '')) = lower('info@alasarjadeed.com')
  );
$$;

revoke all on function public.is_operator() from public;
grant execute on function public.is_operator() to authenticated;

-- Keep the profiles table itself honest: role is derived from the auth email,
-- not from whatever a client sends in a PATCH.
create or replace function public.enforce_operator_role()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_email text;
begin
  select lower(coalesce(email, '')) into user_email
  from auth.users where id = new.id;

  if user_email = lower('info@alasarjadeed.com') then
    new.role := 'admin';
  else
    new.role := 'listener';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_operator_role on public.profiles;
create trigger enforce_operator_role
before insert or update of role on public.profiles
for each row execute function public.enforce_operator_role();

-- Repair any profile rows promoted during testing (for example "smoke1").
update public.profiles p
set role = case
  when lower(coalesce(u.email, '')) = lower('info@alasarjadeed.com') then 'admin'
  else 'listener'
end
from auth.users u
where u.id = p.id;

-- Server-side authorization now matches the app: operator email only.
drop policy if exists "admins manage stories" on public.stories;
create policy "operator manages stories" on public.stories
  for all to authenticated
  using (public.is_operator())
  with check (public.is_operator());

commit;

-- Verify in the SQL Editor:
-- select p.username, p.role, u.email
-- from public.profiles p join auth.users u on u.id = p.id
-- order by p.role desc, p.username;
