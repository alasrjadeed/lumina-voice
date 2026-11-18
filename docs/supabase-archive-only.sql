-- Run once in Supabase Dashboard → SQL Editor for the shared Lumina Voice project.
-- Goal: the cloud catalogue can contain Archive.org streams only. Advertising
-- data and listener library/progress/history are not touched.

begin;

-- Avoid the CORS-less first hop from www.archive.org.
update public.stories
set audio_url = regexp_replace(audio_url, '^https://www\.archive\.org/', 'https://archive.org/')
where audio_url ilike 'https://www.archive.org/%';

-- Remove old demo/R2/local rows from every device's shared catalogue.
delete from public.stories
where audio_url !~* '^https://archive\.org/download/[^/]+/.+\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(\?.*)?$';

-- Future writes must pass the same rule, including writes made by older apps.
alter table public.stories drop constraint if exists stories_archive_audio_url_chk;
alter table public.stories add constraint stories_archive_audio_url_chk
  check (audio_url ~* '^https://archive\.org/download/[^/]+/.+\.(mp3|m4a|aac|ogg|oga|opus|flac|wav)(\?.*)?$');

commit;

-- Verify:
-- select id, title, audio_url from public.stories order by created_at desc;
