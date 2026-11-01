-- MEMEVERSE X social interactions: replies, reposts and public profile banners
begin;
alter table public.profiles add column if not exists banner_url text;
alter table public.x_posts alter column body type text;
create table if not exists public.x_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.x_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists x_replies_post_created_idx on public.x_replies(post_id,created_at);
create table if not exists public.x_reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.x_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
create index if not exists x_reposts_post_idx on public.x_reposts(post_id);
alter table public.x_replies enable row level security;
alter table public.x_reposts enable row level security;
drop policy if exists "Replies are readable by everyone" on public.x_replies;
create policy "Replies are readable by everyone" on public.x_replies for select to anon,authenticated using(true);
drop policy if exists "Users create own replies" on public.x_replies;
create policy "Users create own replies" on public.x_replies for insert to authenticated with check(auth.uid()=author_id);
drop policy if exists "Users delete own replies" on public.x_replies;
create policy "Users delete own replies" on public.x_replies for delete to authenticated using(auth.uid()=author_id);
drop policy if exists "Reposts are readable by everyone" on public.x_reposts;
create policy "Reposts are readable by everyone" on public.x_reposts for select to anon,authenticated using(true);
drop policy if exists "Users create own reposts" on public.x_reposts;
create policy "Users create own reposts" on public.x_reposts for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Users remove own reposts" on public.x_reposts;
create policy "Users remove own reposts" on public.x_reposts for delete to authenticated using(auth.uid()=user_id);
grant select on public.x_replies,public.x_reposts to anon,authenticated;
grant insert,delete on public.x_replies,public.x_reposts to authenticated;
grant update (display_name,bio,avatar_url,banner_url) on public.profiles to authenticated;
commit;
