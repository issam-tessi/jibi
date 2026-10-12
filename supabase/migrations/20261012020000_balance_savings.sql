-- Balance + Savings model.
--   income   : money added to the main balance        (amount > 0, main account)
--   expense  : a payment from the main balance         (amount < 0, main account, category optional -> "To sort")
--   transfer : main <-> savings, stored as two rows sharing transfer_id (one -x, one +x)

-- Accounts: exactly one 'main' and one 'savings' per user ---------------------

alter table public.accounts
  add column kind text not null default 'main' check (kind in ('main', 'savings'));

create unique index accounts_user_kind_idx on public.accounts (user_id, kind);

insert into public.accounts (user_id, name, kind)
select a.user_id, 'Savings', 'savings'
from public.accounts a
where a.kind = 'main'
on conflict do nothing;

-- Categories: user-defined expense categories with an emoji and a palette slot -

delete from public.categories where kind = 'income';
alter table public.categories drop constraint if exists categories_user_id_name_kind_key;
alter table public.categories drop column kind;

alter table public.categories
  add column icon text not null default '🏷️',
  -- 1..8 = fixed categorical palette slot (resolved to a color in the app); null = folds into "Other".
  add column color_slot smallint check (color_slot between 1 and 8);

create unique index categories_user_name_idx on public.categories (user_id, lower(name));

with defaults (name, icon, slot) as (
  values
    ('Housing', '🏠', 1), ('Groceries', '🛒', 2), ('Transport', '🚌', 3), ('Eating out', '🍔', 4),
    ('Health', '💊', 5), ('Leisure', '🎮', 6), ('Other', '📦', 7)
)
update public.categories c
set icon = d.icon, color_slot = d.slot
from defaults d
where c.name = d.name;

-- Transactions ----------------------------------------------------------------

alter table public.transactions
  add column kind text,
  add column transfer_id uuid;

update public.transactions
set kind = case when amount_cents > 0 then 'income' else 'expense' end;

alter table public.transactions
  alter column kind set not null,
  add constraint transactions_kind_check check (
    (kind = 'income'   and amount_cents > 0 and category_id is null and transfer_id is null)
    or (kind = 'expense'  and amount_cents < 0 and transfer_id is null)
    or (kind = 'transfer' and category_id is null and transfer_id is not null)
  );

create index transactions_transfer_idx on public.transactions (transfer_id) where transfer_id is not null;
create index transactions_unsorted_idx on public.transactions (user_id)
  where kind = 'expense' and category_id is null;

-- Balances (respects RLS of the caller) ---------------------------------------

create view public.account_balances
with (security_invoker = true)
as
select
  a.id,
  a.kind,
  a.name,
  a.currency,
  coalesce(sum(t.amount_cents), 0)::bigint as balance_cents
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- Move money between main and savings atomically -------------------------------

create function public.move_money(amount bigint, to_savings boolean, note text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  main_id uuid;
  savings_id uuid;
  tid uuid := gen_random_uuid();
begin
  if amount is null or amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id into main_id from public.accounts where user_id = auth.uid() and kind = 'main';
  select id into savings_id from public.accounts where user_id = auth.uid() and kind = 'savings';
  if main_id is null or savings_id is null then
    raise exception 'Balance or savings account missing';
  end if;

  insert into public.transactions (account_id, kind, amount_cents, transfer_id, note) values
    (main_id,    'transfer', case when to_savings then -amount else amount end, tid, note),
    (savings_id, 'transfer', case when to_savings then amount else -amount end, tid, note);

  return tid;
end;
$$;

revoke execute on function public.move_money(bigint, boolean, text) from public, anon;
grant execute on function public.move_money(bigint, boolean, text) to authenticated;

-- New users: main + savings accounts and default categories --------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (user_id, name, kind) values
    (new.id, 'Balance', 'main'),
    (new.id, 'Savings', 'savings');

  insert into public.categories (user_id, name, icon, color_slot)
  select new.id, c.name, c.icon, c.slot
  from (values
    ('Housing', '🏠', 1), ('Groceries', '🛒', 2), ('Transport', '🚌', 3), ('Eating out', '🍔', 4),
    ('Health', '💊', 5), ('Leisure', '🎮', 6), ('Other', '📦', 7)
  ) as c (name, icon, slot);

  return new;
end;
$$;
