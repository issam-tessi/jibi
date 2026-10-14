-- Add Maryem to the people who can use jibi (she sets her password on first sign-in).
insert into public.app_users (username, display_name, icon, sort_order) values
  ('maryem', 'Maryem', '🦋', 5)
on conflict (username) do nothing;
