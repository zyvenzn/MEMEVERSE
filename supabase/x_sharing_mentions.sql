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
create index if not exists x_mentions_post_idx on public.x_mentions (post_id);
alter table public.x_mentions enable row level security;
drop policy if exists "Mentions are visible with public posts" on public.x_mentions;
create policy "Mentions are visible with public posts" on public.x_mentions for select to anon, authenticated using (true);
grant select on public.x_mentions to anon, authenticated;
revoke insert, update, delete on public.x_mentions from anon, authenticated;
alter table public.x_notifications drop constraint if exists x_notifications_type_check;
alter table public.x_notifications add constraint x_notifications_type_check check (type in ('like', 'repost', 'reply', 'follow', 'mention'));
create or replace function public.x_sync_post_mentions()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare matched record; mentioned_uid uuid; mention_row_id bigint;
begin
  for matched in
    select distinct lower(m.parts[2]) as handle
    from regexp_matches(new.body, '(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{3,20})', 'g') as m(parts)
  loop
    select p.user_id into mentioned_uid from public.x_profiles p where p.handle = matched.handle limit 1;
    if mentioned_uid is not null then
      mention_row_id := null;
      insert into public.x_mentions (post_id, mentioned_user_id, mentioned_by_user_id)
      values (new.id, mentioned_uid, new.author_id)
      on conflict (post_id, mentioned_user_id) do nothing
      returning id into mention_row_id;
      if mention_row_id is not null and mentioned_uid <> new.author_id then
        insert into public.x_notifications (user_id, actor_id, type, post_id)
        values (mentioned_uid, new.author_id, 'mention', new.id);
      end if;
    end if;
    mentioned_uid := null;
  end loop;
  return new;
end;
$$;
revoke execute on function public.x_sync_post_mentions() from public, anon, authenticated;
drop trigger if exists x_post_sync_mentions on public.x_posts;
create trigger x_post_sync_mentions after insert on public.x_posts for each row execute function public.x_sync_post_mentions();
do $$ begin
  begin alter publication supabase_realtime add table public.x_mentions;
  exception when duplicate_object then null;
  end;
end $$;
