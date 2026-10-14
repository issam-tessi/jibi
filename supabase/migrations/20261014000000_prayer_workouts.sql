-- Prayer tracker: one row per prayer per day with how it went.
create table public.prayer_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,
  prayer      text not null check (prayer in ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  status      text not null check (status in ('jamaah', 'ontime', 'late', 'missed')),
  logged_at   timestamptz not null default now(),
  unique (user_id, day, prayer)
);
create index prayer_logs_user_day_idx on public.prayer_logs (user_id, day desc);

-- Workout tracker: a session with exercises done as sets.
create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  performed_at  timestamptz not null default now(),
  name          text check (char_length(name) <= 40),
  note          text check (char_length(note) <= 280),
  created_at    timestamptz not null default now()
);
create index workouts_user_idx on public.workouts (user_id, performed_at desc);

create table public.workout_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  exercise    text not null check (char_length(exercise) between 1 and 60),
  position    int not null default 0,
  weight_kg   numeric(6, 2) check (weight_kg >= 0),
  reps        int not null check (reps between 1 and 1000)
);
create index workout_sets_workout_idx on public.workout_sets (workout_id, position);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise);

alter table public.prayer_logs enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

create policy "own prayer logs" on public.prayer_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own workouts" on public.workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own workout sets" on public.workout_sets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );
