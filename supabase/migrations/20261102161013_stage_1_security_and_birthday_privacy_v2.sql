alter table public.profiles
  drop constraint if exists profiles_birthday_public_reasonable_check;

alter table public.profiles
  alter column birthday_public type text
  using case
    when birthday_public is null then null
    else to_char(birthday_public, 'MM-DD')
  end;

comment on column public.profiles.birthday_public is
  'Public birthday display value in MM-DD format only; full birth date is stored in profile_private.';

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
