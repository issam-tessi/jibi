-- Cigarette tracker: packs bought (optionally tied to the payment that bought them) and cigarettes smoked.
-- Stock per brand = cigarettes bought - cigarettes smoked.

create table public.cig_packs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Deleting the payment removes the packs it bought.
  transaction_id  uuid references public.transactions (id) on delete cascade,
  brand           text not null check (char_length(brand) between 1 and 40),
  packs           int not null default 1 check (packs between 1 and 50),
  cigarettes      int not null default 20 check (cigarettes between 1 and 1000),
  -- Total paid for all `packs`, in minor units of the account currency.
  price_cents     bigint check (price_cents > 0),
  place           text check (char_length(place) <= 80),
  bought_on       date not null default current_date,
  created_at      timestamptz not null default now()
);

create table public.cig_smokes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand       text not null check (char_length(brand) between 1 and 40),
  note        text check (char_length(note) <= 280),
  smoked_at   timestamptz not null default now()
);

create index cig_packs_user_idx on public.cig_packs (user_id, bought_on desc);
create index cig_smokes_user_idx on public.cig_smokes (user_id, smoked_at desc);

alter table public.cig_packs enable row level security;
alter table public.cig_smokes enable row level security;

create policy "own packs" on public.cig_packs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (transaction_id is null or exists (
      select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())
    ))
  );

create policy "own smokes" on public.cig_smokes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Cigarettes left per brand (summed server-side so it never hits the row limit).
create view public.cig_stock
with (security_invoker = true)
as
select brand, sum(bought)::int as bought, sum(smoked)::int as smoked, (sum(bought) - sum(smoked))::int as left_count
from (
  select brand, cigarettes as bought, 0 as smoked from public.cig_packs
  union all
  select brand, 0, 1 from public.cig_smokes
) s
group by brand;
