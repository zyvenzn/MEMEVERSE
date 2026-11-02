-- X Network social features (run AFTER supabase/x_network_schema.sql).
-- Replies, likes, reposts, follows, trending, notifications and direct messages.
-- Already applied to the X-Network Supabase project; kept here so the database can be rebuilt from the repo.

alter table public.x_posts add column if not exists parent_id bigint references public.x_posts(id) on delete cascade;
create index if not exists x_posts_parent_id_idx on public.x_posts(parent_id) where parent_id is not null;

create table if not exists public.x_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id bigint not null references public.x_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists x_likes_post_id_idx on public.x_likes(post_id);

create table if not exists public.x_reposts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id bigint not null references public.x_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists x_reposts_post_id_idx on public.x_reposts(post_id);
create index if not exists x_reposts_user_id_idx on public.x_reposts(user_id, created_at desc);

create table if not exists public.x_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists x_follows_following_idx on public.x_follows(following_id);

create table if not exists public.x_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null constraint x_notifications_actor_fkey references public.x_profiles(user_id) on delete cascade,
  type text not null check (type in ('like','repost','reply','follow')),
  post_id bigint references public.x_posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists x_notifications_user_idx on public.x_notifications(user_id, created_at desc);
create index if not exists x_notifications_actor_idx on public.x_notifications(actor_id);
create index if not exists x_notifications_post_idx on public.x_notifications(post_id) where post_id is not null;

create table if not exists public.x_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null constraint x_messages_sender_fkey references public.x_profiles(user_id) on delete cascade,
  recipient_id uuid not null constraint x_messages_recipient_fkey references public.x_profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists x_messages_recipient_idx on public.x_messages(recipient_id, created_at desc);
create index if not exists x_messages_sender_idx on public.x_messages(sender_id, created_at desc);

-- Notification triggers (security definer: clients can never insert notifications directly).
create or replace function public.x_notify_like() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select author_id into owner from public.x_posts where id = new.post_id;
  if owner is not null and owner <> new.user_id
     and not exists (select 1 from public.x_notifications n where n.user_id = owner and n.actor_id = new.user_id and n.type = 'like' and n.post_id = new.post_id) then
    insert into public.x_notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end $$;

create or replace function public.x_notify_repost() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select author_id into owner from public.x_posts where id = new.post_id;
  if owner is not null and owner <> new.user_id
     and not exists (select 1 from public.x_notifications n where n.user_id = owner and n.actor_id = new.user_id and n.type = 'repost' and n.post_id = new.post_id) then
    insert into public.x_notifications (user_id, actor_id, type, post_id) values (owner, new.user_id, 'repost', new.post_id);
  end if;
  return new;
end $$;

create or replace function public.x_notify_reply() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  if new.parent_id is null then return new; end if;
  select author_id into owner from public.x_posts where id = new.parent_id;
  if owner is not null and owner <> new.author_id then
    insert into public.x_notifications (user_id, actor_id, type, post_id) values (owner, new.author_id, 'reply', new.id);
  end if;
  return new;
end $$;

create or replace function public.x_notify_follow() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.x_notifications n where n.user_id = new.following_id and n.actor_id = new.follower_id and n.type = 'follow') then
    insert into public.x_notifications (user_id, actor_id, type) values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end $$;

revoke execute on function public.x_notify_like(), public.x_notify_repost(), public.x_notify_reply(), public.x_notify_follow() from public, anon, authenticated;

drop trigger if exists x_like_notify on public.x_likes;
create trigger x_like_notify after insert on public.x_likes for each row execute function public.x_notify_like();
drop trigger if exists x_repost_notify on public.x_reposts;
create trigger x_repost_notify after insert on public.x_reposts for each row execute function public.x_notify_repost();
drop trigger if exists x_reply_notify on public.x_posts;
create trigger x_reply_notify after insert on public.x_posts for each row execute function public.x_notify_reply();
drop trigger if exists x_follow_notify on public.x_follows;
create trigger x_follow_notify after insert on public.x_follows for each row execute function public.x_notify_follow();

-- Row Level Security
alter table public.x_likes enable row level security;
alter table public.x_reposts enable row level security;
alter table public.x_follows enable row level security;
alter table public.x_notifications enable row level security;
alter table public.x_messages enable row level security;

drop policy if exists "Likes are viewable by everyone" on public.x_likes;
create policy "Likes are viewable by everyone" on public.x_likes for select using (true);
drop policy if exists "Users can like as themselves" on public.x_likes;
create policy "Users can like as themselves" on public.x_likes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can remove their own likes" on public.x_likes;
create policy "Users can remove their own likes" on public.x_likes for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Reposts are viewable by everyone" on public.x_reposts;
create policy "Reposts are viewable by everyone" on public.x_reposts for select using (true);
drop policy if exists "Users can repost as themselves" on public.x_reposts;
create policy "Users can repost as themselves" on public.x_reposts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can remove their own reposts" on public.x_reposts;
create policy "Users can remove their own reposts" on public.x_reposts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Follows are viewable by everyone" on public.x_follows;
create policy "Follows are viewable by everyone" on public.x_follows for select using (true);
drop policy if exists "Users can follow as themselves" on public.x_follows;
create policy "Users can follow as themselves" on public.x_follows for insert to authenticated with check ((select auth.uid()) = follower_id);
drop policy if exists "Users can unfollow" on public.x_follows;
create policy "Users can unfollow" on public.x_follows for delete to authenticated using ((select auth.uid()) = follower_id);

drop policy if exists "Users read their own notifications" on public.x_notifications;
create policy "Users read their own notifications" on public.x_notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users mark their own notifications read" on public.x_notifications;
create policy "Users mark their own notifications read" on public.x_notifications for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete their own notifications" on public.x_notifications;
create policy "Users delete their own notifications" on public.x_notifications for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Participants read messages" on public.x_messages;
create policy "Participants read messages" on public.x_messages for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
drop policy if exists "Users send messages as themselves" on public.x_messages;
create policy "Users send messages as themselves" on public.x_messages for insert to authenticated with check ((select auth.uid()) = sender_id);
drop policy if exists "Recipients mark messages read" on public.x_messages;
create policy "Recipients mark messages read" on public.x_messages for update to authenticated
using ((select auth.uid()) = recipient_id) with check ((select auth.uid()) = recipient_id);

-- Views (security_invoker so the caller's RLS applies)
create or replace view public.x_post_view with (security_invoker = true) as
select p.id, p.author_id, p.body, p.created_at, p.parent_id,
  pr.handle, pr.display_name, pr.avatar_url,
  (select count(*) from public.x_likes l where l.post_id = p.id)::int as like_count,
  (select count(*) from public.x_reposts r where r.post_id = p.id)::int as repost_count,
  (select count(*) from public.x_posts c where c.parent_id = p.id)::int as reply_count,
  exists (select 1 from public.x_likes l where l.post_id = p.id and l.user_id = (select auth.uid())) as liked,
  exists (select 1 from public.x_reposts r where r.post_id = p.id and r.user_id = (select auth.uid())) as reposted
from public.x_posts p
join public.x_profiles pr on pr.user_id = p.author_id;

create or replace view public.x_repost_view with (security_invoker = true) as
select pv.*, r.user_id as reposter_id, rp.handle as reposter_handle, rp.display_name as reposter_name, r.created_at as event_at
from public.x_reposts r
join public.x_post_view pv on pv.id = r.post_id
join public.x_profiles rp on rp.user_id = r.user_id;

create or replace view public.x_profile_view with (security_invoker = true) as
select pr.user_id, pr.handle, pr.display_name, pr.bio, pr.avatar_url, pr.created_at,
  (select count(*) from public.x_follows f where f.following_id = pr.user_id)::int as followers_count,
  (select count(*) from public.x_follows f where f.follower_id = pr.user_id)::int as following_count,
  (select count(*) from public.x_posts p where p.author_id = pr.user_id and p.parent_id is null)::int as posts_count
from public.x_profiles pr;

create or replace view public.x_trending with (security_invoker = true) as
select lower(m[1]) as tag, count(*)::int as posts
from public.x_posts p, lateral regexp_matches(p.body, '([#$][A-Za-z_][A-Za-z0-9_]{1,29})', 'g') as m
where p.created_at > now() - interval '24 hours'
group by 1
order by 2 desc, 1
limit 10;

-- Grants: Supabase default privileges are broad, so reset to least privilege.
revoke all on public.x_likes, public.x_reposts, public.x_follows, public.x_notifications, public.x_messages from anon, authenticated;
revoke all on public.x_post_view, public.x_repost_view, public.x_profile_view, public.x_trending from anon, authenticated;

grant select on public.x_likes, public.x_reposts, public.x_follows to anon, authenticated;
grant insert, delete on public.x_likes, public.x_reposts, public.x_follows to authenticated;
grant select, delete on public.x_notifications to authenticated;
grant update (read) on public.x_notifications to authenticated;
grant select, insert on public.x_messages to authenticated;
grant update (read_at) on public.x_messages to authenticated;
grant usage, select on sequence public.x_messages_id_seq to authenticated;
grant select on public.x_post_view, public.x_repost_view, public.x_profile_view, public.x_trending to anon, authenticated;

-- Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.x_posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.x_notifications; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.x_messages; exception when duplicate_object then null; end;
end $$;
