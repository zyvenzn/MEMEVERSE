create table if not exists public.x_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.x_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.x_bookmarks enable row level security;

create policy "Users read their own bookmarks"
  on public.x_bookmarks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create their own bookmarks"
  on public.x_bookmarks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users remove their own bookmarks"
  on public.x_bookmarks for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists x_bookmarks_user_created_idx
  on public.x_bookmarks (user_id, created_at desc);
create index if not exists x_follows_followed_idx
  on public.x_follows (followed_id);
create index if not exists x_likes_post_idx
  on public.x_likes (post_id);
create index if not exists x_posts_author_created_idx
  on public.x_posts (author_id, created_at desc);
create index if not exists x_replies_author_idx
  on public.x_replies (author_id);

revoke all on table public.x_posts, public.x_follows, public.x_likes,
  public.x_replies, public.x_reposts, public.x_bookmarks from anon;
grant select on table public.x_posts, public.x_replies to anon;

revoke all on table public.x_posts, public.x_follows, public.x_likes,
  public.x_replies, public.x_reposts, public.x_bookmarks from authenticated;
grant select, insert, delete on table public.x_posts, public.x_follows,
  public.x_likes, public.x_replies, public.x_reposts, public.x_bookmarks
  to authenticated;

alter publication supabase_realtime add table public.x_posts;
