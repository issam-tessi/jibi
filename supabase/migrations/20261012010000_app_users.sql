-- Fixed list of people who can use jibi.
-- Each one signs in through Supabase Auth with an internal email (<username>@jibi.app);
-- the password is set once on first use and stored hashed in auth.users.
-- To add someone later: insert a row here.

create table public.app_users (
  username      text primary key check (username ~ '^[a-z0-9_]+$'),
  display_name  text not null,
  icon          text not null,
  sort_order    int not null default 0
);

insert into public.app_users (username, display_name, icon, sort_order) values
  ('issam', 'Issam', '🦁', 1),
  ('azizi', 'Azizi', '🦊', 2),
  ('firas', 'Firas', '🐺', 3),
  ('adem',  'Adem',  '🐻', 4);

-- No policies: clients can't read or change this table directly, only via the functions below.
alter table public.app_users enable row level security;

create function public.app_user_email(username text)
returns text
language sql
immutable
set search_path = ''
as $$ select lower(username) || '@jibi.app' $$;

-- Public list for the "Who are you?" screen, including whether each person has set a password yet.
create function public.list_app_users()
returns table (username text, display_name text, icon text, has_password boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.username,
    u.display_name,
    u.icon,
    exists (select 1 from auth.users a where a.email = public.app_user_email(u.username))
  from public.app_users u
  order by u.sort_order, u.username
$$;

revoke execute on function public.list_app_users() from public;
grant execute on function public.list_app_users() to anon, authenticated;

-- Only people on the list can create an account, and only once (auth.users.email is unique).
create function public.enforce_app_user_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.app_users u where public.app_user_email(u.username) = lower(new.email)
  ) then
    raise exception 'Sign-up is restricted to jibi users';
  end if;
  return new;
end;
$$;

create trigger enforce_app_user_allowlist
  before insert on auth.users
  for each row execute function public.enforce_app_user_allowlist();
