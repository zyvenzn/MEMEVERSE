-- MEMEVERSE initial schema draft (Supabase/PostgreSQL)
-- Review and apply in a development project first.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null default 'New Player',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  currency text not null default 'USDV',
  balance numeric(20,2) not null default 10000 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Append-only accounting record. Production writes must go through trusted server functions.
create table if not exists public.ledger_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  amount numeric(20,2) not null,
  entry_type text not null,
  reference_id text,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.x_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  handle text unique not null,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  banner_url text,
  premium_until timestamptz
);

create table if not exists public.x_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  name text not null,
  symbol text not null,
  description text not null default '',
  virtual_supply numeric(30,10) not null default 1000000000,
  virtual_reserve numeric(30,10) not null default 0,
  status text not null default 'bonding',
  created_at timestamptz not null default now()
);

create index if not exists x_posts_created_at_idx on public.x_posts(created_at desc);
create index if not exists tokens_created_at_idx on public.tokens(created_at desc);

-- IMPORTANT:
-- Do not expose wallets or ledger_entries to direct client writes.
-- Add RLS policies and trusted server-side transaction functions before online launch.