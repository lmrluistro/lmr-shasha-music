-- LMR x SHASHA starter schema for Supabase
-- Replace admin@example.com with your admin email in is_site_admin().
create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  artist text not null default 'LMR ❤️ SHASHA',
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
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = lower('admin@example.com')
  );
$$;

drop policy if exists "Anyone can read published songs" on public.songs;
create policy "Anyone can read published songs" on public.songs
for select to anon, authenticated using (published = true or public.is_site_admin());

drop policy if exists "Admin can insert songs" on public.songs;
create policy "Admin can insert songs" on public.songs
for insert to authenticated with check (public.is_site_admin());

drop policy if exists "Admin can update songs" on public.songs;
create policy "Admin can update songs" on public.songs
for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Admin can delete songs" on public.songs;
create policy "Admin can delete songs" on public.songs
for delete to authenticated using (public.is_site_admin());

drop policy if exists "Anyone can submit a message" on public.messages;
create policy "Anyone can submit a message" on public.messages
for insert to anon, authenticated with check (
  approved = false and char_length(trim(name)) > 0 and char_length(trim(message)) > 0
);

drop policy if exists "Anyone can read approved messages" on public.messages;
create policy "Anyone can read approved messages" on public.messages
for select to anon, authenticated using (approved = true or public.is_site_admin());

drop policy if exists "Admin can moderate messages" on public.messages;
create policy "Admin can moderate messages" on public.messages
for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Admin can delete messages" on public.messages;
create policy "Admin can delete messages" on public.messages
for delete to authenticated using (public.is_site_admin());

-- Basic public like counter. For production, add rate limiting/CAPTCHA to prevent abuse.
create or replace function public.increment_message_like(message_id uuid)
returns integer language plpgsql security definer set search_path = ''
as $$
declare new_count integer;
begin
  update public.messages set likes = likes + 1
  where id = message_id and approved = true
  returning likes into new_count;
  return new_count;
end;
$$;
grant execute on function public.increment_message_like(uuid) to anon, authenticated;

-- Storage: create public buckets 'songs' and 'covers' in the Supabase dashboard.
-- These policies restrict uploading/updating/deleting to your configured admin.
drop policy if exists "Admin can upload song files" on storage.objects;
create policy "Admin can upload song files" on storage.objects
for insert to authenticated with check (bucket_id in ('songs','covers') and public.is_site_admin());
drop policy if exists "Admin can update song files" on storage.objects;
create policy "Admin can update song files" on storage.objects
for update to authenticated using (bucket_id in ('songs','covers') and public.is_site_admin())
with check (bucket_id in ('songs','covers') and public.is_site_admin());
drop policy if exists "Admin can delete song files" on storage.objects;
create policy "Admin can delete song files" on storage.objects
for delete to authenticated using (bucket_id in ('songs','covers') and public.is_site_admin());
