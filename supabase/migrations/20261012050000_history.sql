-- Action history with undo / redo.
-- Every insert/update/delete on transactions and categories is logged with before/after snapshots.
-- Rows changed in the same database transaction share group_id (e.g. both legs of a move, or a category
-- delete plus the payments it un-sorted), so one "action" is undone or redone as a unit.

create table public.history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  group_id    bigint not null,
  at          timestamptz not null default now(),
  op          text not null check (op in ('insert', 'update', 'delete')),
  table_name  text not null check (table_name in ('transactions', 'categories')),
  row_id      uuid not null,
  old_row     jsonb,
  new_row     jsonb,
  undone      boolean not null default false
);

create index history_user_group_idx on public.history (user_id, group_id desc);

alter table public.history enable row level security;
create policy "read own history" on public.history
  for select to authenticated
  using (user_id = (select auth.uid()));

create function public.log_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := coalesce(new.user_id, old.user_id);
begin
  -- Undo/redo replays set this flag so they don't log themselves.
  if coalesce(current_setting('jibi.replaying', true), '') = 'on' then
    return null;
  end if;

  -- A fresh action makes older undone actions un-redoable (normal undo-stack behaviour).
  delete from public.history h where h.user_id = owner and h.undone and h.group_id <> txid_current();

  insert into public.history (user_id, group_id, op, table_name, row_id, old_row, new_row)
  values (
    owner,
    txid_current(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger log_history after insert or update or delete on public.transactions
  for each row execute function public.log_history();
create trigger log_history after insert or update or delete on public.categories
  for each row execute function public.log_history();

-- Writes one snapshot back (insert or overwrite). Runs as the caller, so RLS still applies.
create function public.history_put(table_name text, snapshot jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if table_name = 'categories' then
    insert into public.categories
    select * from jsonb_populate_record(null::public.categories, snapshot)
    on conflict (id) do update set
      name = excluded.name, icon = excluded.icon, color_slot = excluded.color_slot;
  else
    insert into public.transactions
    select * from jsonb_populate_record(null::public.transactions, snapshot)
    on conflict (id) do update set
      account_id = excluded.account_id, category_id = excluded.category_id, kind = excluded.kind,
      transfer_id = excluded.transfer_id, amount_cents = excluded.amount_cents,
      occurred_on = excluded.occurred_on, note = excluded.note;
  end if;
end;
$$;

create function public.history_remove(table_name text, row_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if table_name = 'categories' then
    delete from public.categories where id = row_id;
  else
    delete from public.transactions where id = row_id;
  end if;
end;
$$;

-- Undo (redo = false) or redo (redo = true) one action group.
create function public.replay_history(group_id bigint, redo boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  h record;
begin
  if not exists (
    select 1 from public.history x
    where x.group_id = replay_history.group_id and x.user_id = auth.uid() and x.undone = redo
  ) then
    raise exception 'Nothing to %', case when redo then 'redo' else 'undo' end;
  end if;

  perform set_config('jibi.replaying', 'on', true);

  -- 1) Rows that must exist again: categories first, since transactions reference them.
  for h in
    select * from public.history x
    where x.group_id = replay_history.group_id and x.user_id = auth.uid()
      and x.op = case when redo then 'insert' else 'delete' end
    order by (x.table_name = 'transactions'), x.id
  loop
    perform public.history_put(h.table_name, case when redo then h.new_row else h.old_row end);
  end loop;

  -- 2) Updates go back to their before (undo) or after (redo) state.
  for h in
    select * from public.history x
    where x.group_id = replay_history.group_id and x.user_id = auth.uid() and x.op = 'update'
    order by case when redo then x.id end, case when not redo then x.id end desc
  loop
    perform public.history_put(h.table_name, case when redo then h.new_row else h.old_row end);
  end loop;

  -- 3) Rows that must disappear: transactions first.
  for h in
    select * from public.history x
    where x.group_id = replay_history.group_id and x.user_id = auth.uid()
      and x.op = case when redo then 'delete' else 'insert' end
    order by (x.table_name = 'categories'), x.id desc
  loop
    perform public.history_remove(h.table_name, h.row_id);
  end loop;

  perform set_config('jibi.replaying', 'off', true);

  update public.history x set undone = not redo
  where x.group_id = replay_history.group_id and x.user_id = auth.uid();
end;
$$;

-- history is only written by the trigger (security definer) and replay_history; give replay the right to flip `undone`.
create policy "flag own history" on public.history
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke execute on function public.history_put(text, jsonb) from public, anon;
revoke execute on function public.history_remove(text, uuid) from public, anon;
revoke execute on function public.replay_history(bigint, boolean) from public, anon;
grant execute on function public.history_put(text, jsonb) to authenticated;
grant execute on function public.history_remove(text, uuid) to authenticated;
grant execute on function public.replay_history(bigint, boolean) to authenticated;
revoke execute on function public.log_history() from public, anon, authenticated;

-- Clients may only flip the undone flag; snapshots are immutable.
revoke insert, update, delete on public.history from anon, authenticated;
grant update (undone) on public.history to authenticated;
