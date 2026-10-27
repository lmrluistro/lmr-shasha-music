-- LMR x SHASHA music site: database and storage security
-- Admin email: unicohijo87@gmail.com
create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  artist text not null default 'LMR',
  audio_url text not null,
  cover_url text,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  message text not null check (char_length(message) between 1 and 500),
  song_id uuid references public.songs(id) on delete set null,
  song_title text,
  approved boolean not null default false,
  likes integer not null default 0 check (likes >= 0),
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'email') = 'unicohijo87@gmail.com', false);
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

drop policy if exists "Published songs are visible to everyone" on public.songs;
create policy "Published songs are visible to everyone"
on public.songs for select to anon, authenticated
using (published = true or public.is_site_admin());

drop policy if exists "Only admin can insert songs" on public.songs;
create policy "Only admin can insert songs"
on public.songs for insert to authenticated
with check (public.is_site_admin());

drop policy if exists "Only admin can update songs" on public.songs;
create policy "Only admin can update songs"
on public.songs for update to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "Only admin can delete songs" on public.songs;
create policy "Only admin can delete songs"
on public.songs for delete to authenticated
using (public.is_site_admin());

drop policy if exists "Public can submit pending messages" on public.messages;
create policy "Public can submit pending messages"
on public.messages for insert to anon, authenticated
with check (approved = false and likes = 0);

drop policy if exists "Approved messages are visible to everyone" on public.messages;
create policy "Approved messages are visible to everyone"
on public.messages for select to anon, authenticated
using (approved = true or public.is_site_admin());

drop policy if exists "Only admin can update messages" on public.messages;
create policy "Only admin can update messages"
on public.messages for update to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

drop policy if exists "Only admin can delete messages" on public.messages;
create policy "Only admin can delete messages"
on public.messages for delete to authenticated
using (public.is_site_admin());

grant select on public.songs, public.messages to anon, authenticated;
grant insert, update, delete on public.songs to authenticated;
grant insert on public.messages to anon, authenticated;
grant update, delete on public.messages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('songs', 'songs', true, 52428800, array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/wav','audio/ogg']),
  ('covers', 'covers', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read music assets" on storage.objects;
create policy "Public can read music assets"
on storage.objects for select to anon, authenticated
using (bucket_id in ('songs', 'covers'));

drop policy if exists "Admin can upload music assets" on storage.objects;
create policy "Admin can upload music assets"
on storage.objects for insert to authenticated
with check (bucket_id in ('songs', 'covers') and public.is_site_admin());

drop policy if exists "Admin can update music assets" on storage.objects;
create policy "Admin can update music assets"
on storage.objects for update to authenticated
using (bucket_id in ('songs', 'covers') and public.is_site_admin())
with check (bucket_id in ('songs', 'covers') and public.is_site_admin());

drop policy if exists "Admin can delete music assets" on storage.objects;
create policy "Admin can delete music assets"
on storage.objects for delete to authenticated
using (bucket_id in ('songs', 'covers') and public.is_site_admin());
