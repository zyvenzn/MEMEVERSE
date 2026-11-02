alter table public.profiles
  drop constraint if exists profiles_birthday_public_format_check;

alter table public.profiles
  add constraint profiles_birthday_public_format_check
  check (
    birthday_public is null
    or (
      birthday_public ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
      and to_char(
        make_date(
          2000,
          split_part(birthday_public, '-', 1)::integer,
          split_part(birthday_public, '-', 2)::integer
        ),
        'MM-DD'
      ) = birthday_public
    )
  );
