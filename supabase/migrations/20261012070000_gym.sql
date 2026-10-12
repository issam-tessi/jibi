-- Gym tracker: one row per visit, with the time it happened.

create table public.gym_visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visited_at  timestamptz not null default now(),
  workout     text check (char_length(workout) <= 40),
  note        text check (char_length(note) <= 280),
  created_at  timestamptz not null default now()
);

create index gym_visits_user_idx on public.gym_visits (user_id, visited_at desc);

alter table public.gym_visits enable row level security;

create policy "own gym visits" on public.gym_visits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
