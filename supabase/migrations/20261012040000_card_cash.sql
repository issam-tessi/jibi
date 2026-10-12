-- Split the main balance into Card and Cash. Pots per user: card, cash, savings.
-- Any move between two pots is a 'transfer' (two rows sharing transfer_id: -x from, +x to).

alter table public.accounts drop constraint accounts_kind_check;
update public.accounts set kind = 'card', name = 'Card' where kind = 'main';
alter table public.accounts
  add constraint accounts_kind_check check (kind in ('card', 'cash', 'savings')),
  alter column kind set default 'card';

insert into public.accounts (user_id, name, kind)
select distinct user_id, 'Cash', 'cash' from public.accounts
on conflict do nothing;

-- One row per logical entry. Transfers appear once (their outgoing leg) with from/to pots.
create view public.entries
with (security_invoker = true)
as
select
  t.id,
  t.kind,
  t.amount_cents,
  t.category_id,
  t.transfer_id,
  t.note,
  t.occurred_on,
  t.created_at,
  a.kind as account_kind,
  ta.kind as to_account_kind
from public.transactions t
join public.accounts a on a.id = t.account_id
left join public.transactions t2 on t2.transfer_id = t.transfer_id and t2.id <> t.id
left join public.accounts ta on ta.id = t2.account_id
where t.kind <> 'transfer' or t.amount_cents < 0;

-- Moves between pots --------------------------------------------------------------

drop function public.move_money(bigint, boolean, text, date);
drop function public.update_transfer(uuid, bigint, boolean, text, date);

create function public.pot_id(pot text)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select id from public.accounts where user_id = auth.uid() and kind = pot $$;

create function public.move_money(
  amount bigint,
  from_pot text,
  to_pot text,
  note text default null,
  occurred_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  from_id uuid := public.pot_id(from_pot);
  to_id uuid := public.pot_id(to_pot);
  tid uuid := gen_random_uuid();
begin
  if amount is null or amount <= 0 then raise exception 'Amount must be positive'; end if;
  if from_id is null or to_id is null then raise exception 'Unknown pot'; end if;
  if from_id = to_id then raise exception 'Pick two different pots'; end if;

  insert into public.transactions (account_id, kind, amount_cents, transfer_id, note, occurred_on) values
    (from_id, 'transfer', -amount, tid, note, move_money.occurred_on),
    (to_id,   'transfer',  amount, tid, note, move_money.occurred_on);
  return tid;
end;
$$;

create function public.update_transfer(
  transfer uuid,
  amount bigint,
  from_pot text,
  to_pot text,
  note text default null,
  occurred_on date default current_date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  from_id uuid := public.pot_id(from_pot);
  to_id uuid := public.pot_id(to_pot);
  n int;
begin
  if amount is null or amount <= 0 then raise exception 'Amount must be positive'; end if;
  if from_id is null or to_id is null then raise exception 'Unknown pot'; end if;
  if from_id = to_id then raise exception 'Pick two different pots'; end if;

  -- The outgoing leg is the negative one; update it last so both legs are still distinguishable.
  update public.transactions
  set account_id = to_id, amount_cents = amount, note = update_transfer.note, occurred_on = update_transfer.occurred_on
  where transfer_id = transfer and amount_cents > 0;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Transfer not found'; end if;

  update public.transactions
  set account_id = from_id, amount_cents = -amount, note = update_transfer.note, occurred_on = update_transfer.occurred_on
  where transfer_id = transfer and amount_cents < 0;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Transfer not found'; end if;
end;
$$;

revoke execute on function public.pot_id(text) from public, anon;
grant execute on function public.pot_id(text) to authenticated;
revoke execute on function public.move_money(bigint, text, text, text, date) from public, anon;
grant execute on function public.move_money(bigint, text, text, text, date) to authenticated;
revoke execute on function public.update_transfer(uuid, bigint, text, text, text, date) from public, anon;
grant execute on function public.update_transfer(uuid, bigint, text, text, text, date) to authenticated;

-- New users get all three pots ----------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.accounts (user_id, name, kind) values
    (new.id, 'Card', 'card'),
    (new.id, 'Cash', 'cash'),
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
