-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe to run again at any time (it also upgrades an older copy to add movies).

create table if not exists public.shows (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  media         text not null default 'tv',
  tmdb_id       integer not null,
  status        text not null default 'watching',
  rating        integer default 0,
  notes         text default '',
  watched       jsonb not null default '{}'::jsonb,
  meta          jsonb,
  meta_updated  timestamptz,
  added_at      timestamptz default now(),
  last_watched  timestamptz
);

-- upgrade path for an earlier version without movies
alter table public.shows add column if not exists media text not null default 'tv';
alter table public.shows drop constraint if exists shows_user_id_tmdb_id_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'shows_user_media_tmdb_key') then
    alter table public.shows add constraint shows_user_media_tmdb_key unique (user_id, media, tmdb_id);
  end if;
end $$;

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data    jsonb not null default '{}'::jsonb
);

alter table public.shows    enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own shows" on public.shows;
create policy "own shows" on public.shows
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
