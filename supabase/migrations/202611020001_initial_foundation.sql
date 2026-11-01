-- MEMEVERSE: initial Supabase foundation
-- Apply to a NEW Supabase project using the Supabase CLI or SQL Editor.
-- This migration creates identity, virtual wallets, an append-only ledger,
-- and a minimal social feed. It does NOT implement trading/token execution.

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  display_name text not null default 'New Player',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_bio_length check (char_length(bio) <= 160)
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  currency text not null default 'USDV' check (currency = 'USDV'),
  balance numeric(20,2) not null default 10000.00 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(20,2) not null check (amount <> 0),
  currency text not null default 'USDV' check (currency = 'USDV'),
  entry_type text not null check (entry_type in ('initial_grant','purchase','sale','reward','adjustment','transfer_in','transfer_out')),
  reference_id text,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_user_created_idx
  on public.ledger_entries(user_id, created_at desc);

create table if not exists public.x_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists x_posts_created_idx on public.x_posts(created_at desc);

create table if not exists public.x_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint x_follows_no_self check (follower_id <> followed_id)
);

create table if not exists public.x_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.x_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Every new auth user receives a profile and a one-time virtual starter grant.
-- The SECURITY DEFINER function has a fixed search_path to avoid object shadowing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_handle text;
  requested_name text;
begin
  generated_handle := 'player_' || replace(substr(new.id::text, 1, 8), '-', '');
  requested_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'New Player');

  insert into public.profiles (id, handle, display_name)
  values (new.id, generated_handle, left(requested_name, 40))
  on conflict (id) do nothing;

  insert into public.wallets (user_id, currency, balance)
  values (new.id, 'USDV', 10000.00)
  on conflict (user_id) do nothing;

  insert into public.ledger_entries (user_id, amount, currency, entry_type, description)
  values (new.id, 10000.00, 'USDV', 'initial_grant', 'One-time MEMEVERSE demo starter balance');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_memeverse on auth.users;
create trigger on_auth_user_created_memeverse
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at is maintained by the database, not trusted to the client.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at before update on public.wallets
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.x_posts enable row level security;
alter table public.x_follows enable row level security;
alter table public.x_likes enable row level security;

-- Public profile/feed reads; only the owner may edit their own profile.
drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles for select to anon, authenticated using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- A player can read only their own balance and ledger.
-- There are deliberately NO client INSERT/UPDATE/DELETE policies on these tables.
drop policy if exists "Users read own wallet" on public.wallets;
create policy "Users read own wallet"
  on public.wallets for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users read own ledger" on public.ledger_entries;
create policy "Users read own ledger"
  on public.ledger_entries for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Posts are readable by everyone" on public.x_posts;
create policy "Posts are readable by everyone"
  on public.x_posts for select to anon, authenticated using (true);

drop policy if exists "Users create own posts" on public.x_posts;
create policy "Users create own posts"
  on public.x_posts for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "Users delete own posts" on public.x_posts;
create policy "Users delete own posts"
  on public.x_posts for delete to authenticated
  using (auth.uid() = author_id);

drop policy if exists "Follows are readable by authenticated users" on public.x_follows;
create policy "Follows are readable by authenticated users"
  on public.x_follows for select to authenticated using (true);

drop policy if exists "Users manage their own follows" on public.x_follows;
create policy "Users manage their own follows"
  on public.x_follows for insert to authenticated with check (auth.uid() = follower_id);

drop policy if exists "Users unfollow themselves" on public.x_follows;
create policy "Users unfollow themselves"
  on public.x_follows for delete to authenticated using (auth.uid() = follower_id);

drop policy if exists "Likes are readable by authenticated users" on public.x_likes;
create policy "Likes are readable by authenticated users"
  on public.x_likes for select to authenticated using (true);

drop policy if exists "Users like as themselves" on public.x_likes;
create policy "Users like as themselves"
  on public.x_likes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users remove their own likes" on public.x_likes;
create policy "Users remove their own likes"
  on public.x_likes for delete to authenticated using (auth.uid() = user_id);

-- Restrict direct table privileges as an additional layer alongside RLS.
revoke all on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;
revoke all on public.ledger_entries from anon, authenticated;
grant select on public.ledger_entries to authenticated;

grant select on public.profiles, public.x_posts to anon, authenticated;
grant update (display_name, bio, avatar_url) on public.profiles to authenticated;
grant insert, delete on public.x_posts to authenticated;
grant select, insert, delete on public.x_follows, public.x_likes to authenticated;

commit;
