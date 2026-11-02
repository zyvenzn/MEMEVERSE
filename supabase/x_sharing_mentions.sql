-- MEMEVERSE X Network: validated mentions and mention notifications.
-- Apply after the existing X Network social schema.
create table if not exists public.x_mentions (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.x_posts(id) on delete cascade,
  mentioned_user_id uuid not null references public.x_profiles(user_id) on delete cascade,
  mentioned_by_user_id uuid not null references public.x_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint x_mentions_post_user_unique unique (post_id, mentioned_user_id)
);
create index if not exists x_mentions_mentioned_user_created_idx on public.x_mentions (mentioned_user_id, created_at desc);
create index if not exists x_mentions_mentioned_by_created_idx on public.x_mentions (mentioned_by_user_id, created_at desc);
create index if not exists x_mentions_post_idx on public.x_mentions (post_id);

alter table public.x_mentions enable row level security;
drop policy if exists "Mentions are visible with public posts" on public.x_mentions;
create policy "Mentions are visible with public posts" on public.x_mentions
  for select to anon, authenticated using (true);
drop policy if exists "Authors can add verified mentions to their posts" on public.x_mentions;
create policy "Authors can add verified mentions to their posts" on public.x_mentions
  for insert to authenticated
  with check (
    mentioned_by_user_id = (select auth.uid())
    and exists (
      select 1
      from public.x_posts p
      join public.x_profiles target on target.user_id = x_mentions.mentioned_user_id
      where p.id = x_mentions.post_id
        and p.author_id = (select auth.uid())
        and p.body ~* ('(^|[^A-Za-z0-9_])@' || target.handle || '([^A-Za-z0-9_]|$)')
    )
  );
grant select on public.x_mentions to anon, authenticated;
grant insert on public.x_mentions to authenticated;
revoke update, delete on public.x_mentions from anon, authenticated;

alter table public.x_notifications
  drop constraint if exists x_notifications_type_check;
alter table public.x_notifications
  add constraint x_notifications_type_check
  check (type in ('like', 'repost', 'reply', 'follow', 'mention'));
create unique index if not exists x_notifications_mention_unique_idx
  on public.x_notifications (user_id, actor_id, type, post_id)
  where type = 'mention';

drop policy if exists "Users create notifications for verified mentions" on public.x_notifications;
create policy "Users create notifications for verified mentions" on public.x_notifications
  for insert to authenticated
  with check (
    actor_id = (select auth.uid())
    and type = 'mention'
    and post_id is not null
    and exists (
      select 1 from public.x_mentions m
      where m.post_id = x_notifications.post_id
        and m.mentioned_user_id = x_notifications.user_id
        and m.mentioned_by_user_id = (select auth.uid())
    )
  );
grant insert on public.x_notifications to authenticated;

create or replace function public.x_notify_mention()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.mentioned_user_id <> new.mentioned_by_user_id then
    insert into public.x_notifications (user_id, actor_id, type, post_id)
    values (new.mentioned_user_id, new.mentioned_by_user_id, 'mention', new.post_id)
    on conflict (user_id, actor_id, type, post_id) where type = 'mention' do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.x_notify_mention() from public, anon, authenticated;
drop trigger if exists x_mention_notification on public.x_mentions;
create trigger x_mention_notification
  after insert on public.x_mentions
  for each row execute function public.x_notify_mention();

do $$
begin
  begin
    alter publication supabase_realtime add table public.x_mentions;
  exception when duplicate_object then null;
  end;
end;
$$;
