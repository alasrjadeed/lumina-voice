-- Run once in Supabase Dashboard → SQL Editor for the shared Lumina Voice project.
-- Adds the publish switch used by Admin → Cloud catalogue and the 15-minute
-- snapshot exporter. Metadata only; no audio bytes and no service key involved.

begin;

alter table public.stories
  add column if not exists published boolean not null default true;

-- Rows saved before this migration are live by default.
update public.stories set published = true where published is null;

create index if not exists stories_published_created_idx
  on public.stories (published, created_at desc);

commit;

-- Verify:
-- select id, title, published, audio_url from public.stories order by created_at desc;
