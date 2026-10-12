-- Switch to Tunisian dinars. amount_cents holds minor units of the account currency:
-- millimes for TND (1 DT = 1000).
alter table public.accounts alter column currency set default 'TND';
update public.accounts set currency = 'TND';

-- move_money gains a date, so transfers can be back-dated like other entries.
drop function public.move_money(bigint, boolean, text);

create function public.move_money(
  amount bigint,
  to_savings boolean,
  note text default null,
  occurred_on date default current_date
)
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

  insert into public.transactions (account_id, kind, amount_cents, transfer_id, note, occurred_on) values
    (main_id,    'transfer', case when to_savings then -amount else amount end, tid, note, move_money.occurred_on),
    (savings_id, 'transfer', case when to_savings then amount else -amount end, tid, note, move_money.occurred_on);

  return tid;
end;
$$;

-- Edit both legs of a transfer at once.
create function public.update_transfer(
  transfer uuid,
  amount bigint,
  to_savings boolean,
  note text default null,
  occurred_on date default current_date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated int;
begin
  if amount is null or amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  update public.transactions t
  set
    amount_cents = case
      when (a.kind = 'main') = to_savings then -amount
      else amount
    end,
    note = update_transfer.note,
    occurred_on = update_transfer.occurred_on
  from public.accounts a
  where a.id = t.account_id
    and t.transfer_id = update_transfer.transfer;

  get diagnostics updated = row_count;
  if updated <> 2 then
    raise exception 'Transfer not found';
  end if;
end;
$$;

revoke execute on function public.move_money(bigint, boolean, text, date) from public, anon;
grant execute on function public.move_money(bigint, boolean, text, date) to authenticated;
revoke execute on function public.update_transfer(uuid, bigint, boolean, text, date) from public, anon;
grant execute on function public.update_transfer(uuid, bigint, boolean, text, date) to authenticated;
