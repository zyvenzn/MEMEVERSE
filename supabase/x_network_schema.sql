-- Run in Supabase Dashboard > SQL Editor > New query.
-- This is for the separate X Network Supabase project.
create table if not exists public.x_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.x_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists x_posts_created_at_idx on public.x_posts(created_at desc);
create index if not exists x_posts_author_id_idx on public.x_posts(author_id);

create or replace function public.x_create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_handle text;
begin
  requested_handle := lower(coalesce(new.raw_user_meta_data ->> 'handle', ''));
  if requested_handle !~ '^[a-z0-9_]{3,20}$' then
    requested_handle := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;
  insert into public.x_profiles (user_id, handle, display_name)
  values (new.id, requested_handle, left(coalesce(new.raw_user_meta_data ->> 'display_name', requested_handle), 40))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists x_auth_user_created on auth.users;
create trigger x_auth_user_created after insert on auth.users
for each row execute procedure public.x_create_profile_for_new_user();

alter table public.x_profiles enable row level security;
alter table public.x_posts enable row level security;
drop policy if exists "X profiles are viewable by everyone" on public.x_profiles;
create policy "X profiles are viewable by everyone" on public.x_profiles for select using (true);
drop policy if exists "Users can update their own X profile" on public.x_profiles;
create policy "Users can update their own X profile" on public.x_profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "X posts are viewable by everyone" on public.x_posts;
create policy "X posts are viewable by everyone" on public.x_posts for select using (true);
drop policy if exists "Users can create their own X posts" on public.x_posts;
create policy "Users can create their own X posts" on public.x_posts for insert to authenticated
with check ((select auth.uid()) = author_id);
drop policy if exists "Users can delete their own X posts" on public.x_posts;
create policy "Users can delete their own X posts" on public.x_posts for delete to authenticated
using ((select auth.uid()) = author_id);
grant usage on schema public to anon, authenticated;
grant select on public.x_profiles, public.x_posts to anon, authenticated;
grant update on public.x_profiles to authenticated;
grant insert, delete on public.x_posts to authenticated;
grant usage, select on sequence public.x_posts_id_seq to authenticated;
