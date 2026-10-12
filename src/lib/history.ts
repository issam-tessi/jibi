import type { AccountKind, Database } from '@/lib/database.types';
import { formatMoney } from '@/lib/money';
import { potIcon, potLabel } from '@/lib/pots';

type HistoryRow = Database['public']['Tables']['history']['Row'];
type Snapshot = Record<string, unknown> | null;

export type HistoryAction = {
  groupId: number;
  at: string;
  undone: boolean;
  icon: string;
  title: string;
  detail: string;
};

type Lookup = {
  potOf: (accountId: string) => AccountKind | undefined;
  categoryName: (id: string | null | undefined) => string | null;
  currency: string;
};

/** Groups raw history rows into user-facing actions, newest first. */
export function toActions(rows: HistoryRow[], lookup: Lookup): HistoryAction[] {
  const groups = new Map<number, HistoryRow[]>();
  for (const r of rows) {
    const list = groups.get(r.group_id) ?? [];
    list.push(r);
    groups.set(r.group_id, list);
  }
  return [...groups.values()]
    .map((g) => ({ groupId: g[0].group_id, at: g[0].at, undone: g[0].undone, ...describe(g, lookup) }))
    .sort((a, b) => b.groupId - a.groupId);
}

function describe(group: HistoryRow[], { potOf, categoryName, currency }: Lookup) {
  const fmt = (v: unknown) => formatMoney(Math.abs(Number(v) || 0), currency);
  const snap = (r: HistoryRow) => (r.new_row ?? r.old_row) as Snapshot;
  const pot = (s: Snapshot) => potOf(String(s?.account_id ?? ''));
  const where = (s: Snapshot) => `${potIcon(pot(s))} ${potLabel(pot(s))}`;

  const cats = group.filter((r) => r.table_name === 'categories');
  const txs = group.filter((r) => r.table_name === 'transactions');

  // Category actions (a delete may also un-sort some payments in the same group).
  if (cats.length) {
    const c = cats[0];
    const s = snap(c);
    const name = `${s?.icon ?? ''} ${s?.name ?? ''}`.trim();
    if (c.op === 'insert') return { icon: '🏷️', title: 'Created category', detail: name };
    if (c.op === 'delete')
      return {
        icon: '🗑️',
        title: 'Deleted category',
        detail: txs.length ? `${name} · ${txs.length} payment(s) moved to To sort` : name,
      };
    const before = c.old_row as Snapshot;
    return { icon: '✏️', title: 'Edited category', detail: `${before?.icon ?? ''} ${before?.name ?? ''} → ${name}`.trim() };
  }

  const first = txs[0];
  const s = snap(first);
  const kind = s?.kind;

  if (kind === 'transfer') {
    const out = txs.find((r) => Number(snap(r)?.amount_cents) < 0) ?? first;
    const inn = txs.find((r) => Number(snap(r)?.amount_cents) > 0) ?? first;
    const path = `${where(snap(out))} → ${where(snap(inn))}`;
    const verb = first.op === 'insert' ? 'Moved' : first.op === 'delete' ? 'Deleted move' : 'Edited move';
    return { icon: '⇄', title: `${verb} ${fmt(snap(out)?.amount_cents)}`, detail: path };
  }

  const amount = fmt(s?.amount_cents);
  const label = kind === 'income' ? 'money added' : 'payment';
  const cat = kind === 'expense' ? (categoryName(s?.category_id as string) ?? 'To sort') : null;
  const tail = [where(s), cat, s?.note].filter(Boolean).join(' · ');

  if (first.op === 'insert')
    return { icon: kind === 'income' ? '➕' : '🧾', title: kind === 'income' ? `Added ${amount}` : `Payment ${amount}`, detail: tail };
  if (first.op === 'delete') return { icon: '🗑️', title: `Deleted ${label} ${amount}`, detail: tail };

  const before = first.old_row as Snapshot;
  const after = first.new_row as Snapshot;
  const onlyCategory =
    before && after && before.category_id !== after.category_id &&
    ['amount_cents', 'note', 'occurred_on', 'account_id'].every((k) => before[k] === after[k]);
  if (onlyCategory)
    return {
      icon: '🗂️',
      title: `Sorted payment ${amount}`,
      detail: `${categoryName(before?.category_id as string) ?? 'To sort'} → ${categoryName(after?.category_id as string) ?? 'To sort'}`,
    };
  return { icon: '✏️', title: `Edited ${label}`, detail: `${fmt(before?.amount_cents)} → ${amount} · ${tail}` };
}
