import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { CIGS_PER_PACK } from '@/lib/cigarettes';
import type { AccountKind, Database, Tables } from '@/lib/database.types';
import { toActions, type HistoryAction } from '@/lib/history';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { supabase } from '@/lib/supabase';

export type Category = Tables<'categories'>;
export type Pot = AccountKind;
export type EntryType = Tables<'transactions'>['kind'];

type EntryRow = Database['public']['Views']['entries']['Row'];

/**
 * One logical entry. For transfers, `amount_cents` is the outgoing (negative) leg,
 * `account_kind` is the source pot and `to_account_kind` the destination.
 */
export type Entry = EntryRow & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color_slot'> | null;
};

/** What the entry form produces. `minor` is a positive amount in minor units (millimes for TND). */
export type EntryDraft = {
  type: EntryType;
  minor: number;
  categoryId: string | null;
  /** Pot for income/expense; source pot for transfers. */
  pot: Pot;
  /** Destination pot for transfers. */
  toPot: Pot;
  note: string;
  date: string;
  /** New cigarette payments can record the packs they bought. */
  cigarettes?: { brand: string; packs: number; place: string };
};

type Balances = Record<Pot, number> & { currency: string };

type FinanceState = {
  balances: Balances;
  categories: Category[];
  /** Recent entries across all pots, newest first (transfers appear once). */
  activity: Entry[];
  /** Payments that still need a category, newest first. */
  unsorted: Entry[];
  /** Recent actions, newest first, for undo/redo. */
  history: HistoryAction[];
  loading: boolean;
  error: string | null;
};

type FinanceActions = {
  refresh: () => Promise<void>;
  /** Attaches category details to raw entry rows (e.g. from a custom query). */
  withCategories: (rows: EntryRow[]) => Entry[];
  /** Creates a new entry, or updates `existing` (whose type can't change). */
  saveEntry: (draft: EntryDraft, existing?: Entry) => Promise<string | null>;
  categorize: (entryId: string, categoryId: string | null) => Promise<string | null>;
  deleteEntry: (entry: Entry) => Promise<string | null>;
  createCategory: (name: string, icon: string) => Promise<string | null>;
  updateCategory: (id: string, name: string, icon: string) => Promise<string | null>;
  deleteCategory: (id: string) => Promise<string | null>;
  undo: (groupId: number) => Promise<string | null>;
  redo: (groupId: number) => Promise<string | null>;
};

const INITIAL: FinanceState = {
  balances: { card: 0, cash: 0, savings: 0, currency: DEFAULT_CURRENCY },
  categories: [],
  activity: [],
  unsorted: [],
  history: [],
  loading: true,
  error: null,
};

const FinanceContext = createContext<(FinanceState & FinanceActions) | null>(null);

function attachCategories(rows: EntryRow[], categories: Category[]): Entry[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return rows.map((r) => ({ ...r, category: (r.category_id && byId.get(r.category_id)) || null }));
}

/** Single source of truth for the signed-in user's money; every mutation refreshes balances everywhere. */
export function FinanceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<FinanceState>(INITIAL);
  const [potIds, setPotIds] = useState<Partial<Record<Pot, string>>>({});

  const refresh = useCallback(async () => {
    const [balances, categories, activity, unsorted, history] = await Promise.all([
      supabase.from('account_balances').select('*'),
      supabase.from('categories').select('*').order('created_at'),
      supabase
        .from('entries')
        .select('*')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('entries')
        .select('*')
        .eq('kind', 'expense')
        .is('category_id', null)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('history').select('*').order('id', { ascending: false }).limit(400),
    ]);

    const rows = balances.data ?? [];
    const pick = (kind: Pot) => rows.find((b) => b.kind === kind);
    const cats = categories.data ?? [];

    setPotIds({ card: pick('card')?.id, cash: pick('cash')?.id, savings: pick('savings')?.id });
    setState({
      balances: {
        card: pick('card')?.balance_cents ?? 0,
        cash: pick('cash')?.balance_cents ?? 0,
        savings: pick('savings')?.balance_cents ?? 0,
        currency: pick('card')?.currency ?? DEFAULT_CURRENCY,
      },
      categories: cats,
      activity: attachCategories(activity.data ?? [], cats),
      unsorted: attachCategories(unsorted.data ?? [], cats),
      history: toActions(history.data ?? [], {
        potOf: (id) => rows.find((b) => b.id === id)?.kind,
        categoryName: (id) => cats.find((c) => c.id === id)?.name ?? null,
        currency: pick('card')?.currency ?? DEFAULT_CURRENCY,
      }),
      loading: false,
      error: (balances.error ?? categories.error ?? activity.error ?? unsorted.error)?.message ?? null,
    });
  }, []);

  useEffect(() => {
    // Initial load; state updates happen after the network round trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const actions = useMemo<FinanceActions>(() => {
    const run = async (op: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await op;
      if (!error) await refresh();
      return error?.message ?? null;
    };

    return {
      refresh,
      withCategories: (rows) => attachCategories(rows, state.categories),
      saveEntry: (draft, existing) => {
        const note = draft.note.trim() || null;
        if (draft.type === 'transfer') {
          const args = {
            amount: draft.minor,
            from_pot: draft.pot,
            to_pot: draft.toPot,
            note,
            occurred_on: draft.date,
          };
          return run(
            existing?.transfer_id
              ? supabase.rpc('update_transfer', { transfer: existing.transfer_id, ...args })
              : supabase.rpc('move_money', args)
          );
        }
        const accountId = potIds[draft.pot];
        if (!accountId) return Promise.resolve('Account not found.');
        const fields = {
          account_id: accountId,
          amount_cents: draft.type === 'expense' ? -draft.minor : draft.minor,
          category_id: draft.type === 'expense' ? draft.categoryId : null,
          note,
          occurred_on: draft.date,
        };
        if (existing) return run(supabase.from('transactions').update(fields).eq('id', existing.id));
        const cigs = draft.type === 'expense' ? draft.cigarettes : undefined;
        if (!cigs) return run(supabase.from('transactions').insert({ ...fields, kind: draft.type }));
        return run(
          (async () => {
            const { data, error } = await supabase
              .from('transactions')
              .insert({ ...fields, kind: draft.type })
              .select('id')
              .single();
            if (error || !data) return { error };
            return supabase.from('cig_packs').insert({
              transaction_id: data.id,
              brand: cigs.brand,
              packs: cigs.packs,
              cigarettes: cigs.packs * CIGS_PER_PACK,
              price_cents: draft.minor,
              place: cigs.place.trim() || null,
              bought_on: draft.date,
            });
          })()
        );
      },
      categorize: (entryId, categoryId) =>
        run(supabase.from('transactions').update({ category_id: categoryId }).eq('id', entryId)),
      deleteEntry: (entry) =>
        run(
          entry.transfer_id
            ? supabase.from('transactions').delete().eq('transfer_id', entry.transfer_id)
            : supabase.from('transactions').delete().eq('id', entry.id)
        ),
      createCategory: (name, icon) => {
        const used = new Set(state.categories.map((c) => c.color_slot));
        const slot = [1, 2, 3, 4, 5, 6, 7, 8].find((s) => !used.has(s)) ?? null;
        return run(supabase.from('categories').insert({ name: name.trim(), icon, color_slot: slot }));
      },
      updateCategory: (id, name, icon) =>
        run(supabase.from('categories').update({ name: name.trim(), icon }).eq('id', id)),
      deleteCategory: (id) => run(supabase.from('categories').delete().eq('id', id)),
      undo: (groupId) => run(supabase.rpc('replay_history', { group_id: groupId, redo: false })),
      redo: (groupId) => run(supabase.rpc('replay_history', { group_id: groupId, redo: true })),
    };
  }, [refresh, potIds, state.categories]);

  return <FinanceContext value={{ ...state, ...actions }}>{children}</FinanceContext>;
}

export function useFinance() {
  const ctx = use(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside <FinanceProvider>');
  return ctx;
}
