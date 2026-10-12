-- Core schema for jibi: accounts, categories, transactions.
-- Every row belongs to a user and is protected by row-level security,
-- so the publishable key in the client can only ever touch the caller's own data.

create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  currency    char(3) not null default 'EUR',
  created_at  timestamptz not null default now()
);

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  kind        text not null check (kind in ('income', 'expense')),
  created_at  timestamptz not null default now(),
  unique (user_id, name, kind)
);

-- Amounts are stored as signed integer cents: positive = income, negative = expense.
-- Never use floats for money.
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete cascade,
  category_id   uuid references public.categories (id) on delete set null,
  amount_cents  bigint not null check (amount_cents <> 0),
  occurred_on   date not null default current_date,
  note          text check (char_length(note) <= 280),
  created_at    timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_category_idx on public.transactions (category_id);

-- Row-level security ---------------------------------------------------------

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "own accounts" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own categories" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A transaction may only reference the caller's own account and category.
create policy "own transactions" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
    and (category_id is null or exists (
      select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid())
    ))
  );

-- Seed a default account and categories for every new user -------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (user_id, name) values (new.id, 'Main');

  insert into public.categories (user_id, name, kind)
  select new.id, c.name, c.kind
  from (values
    ('Salary', 'income'),
    ('Other income', 'income'),
    ('Housing', 'expense'),
    ('Groceries', 'expense'),
    ('Transport', 'expense'),
    ('Eating out', 'expense'),
    ('Health', 'expense'),
    ('Leisure', 'expense'),
    ('Other', 'expense')
  ) as c (name, kind);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
