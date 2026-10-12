import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Tables } from '@/lib/database.types';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { supabase } from '@/lib/supabase';

export type Category = Tables<'categories'>;

export type Entry = Tables<'transactions'> & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color_slot'> | null;
};

export type EntryType = Entry['kind'];

/** What the entry form produces. `minor` is a positive amount in minor units (millimes for TND). */
export type EntryDraft = {
  type: EntryType;
  minor: number;
  categoryId: string | null;
  toSavings: boolean;
  note: string;
  date: string;
};

type Balances ={ main: number; savings: number; currency: string };

type FinanceState = {
  balances: Balances;
  categories: Category[];
  /** Everything that touched the main balance, newest first (transfers appear once). */
  activity: Entry[];
  /** Payments that still need a category, newest first. */
  unsorted: Entry[];
  loading: boolean;
  error: string | null;
};

type FinanceActions = {
  mainAccountId: string | undefined;
  refresh: () => Promise<void>;
  /** Creates a new entry, or updates `existing` (whose type can't change). */
  saveEntry: (draft: EntryDraft, existing?: Entry) => Promise<string | null>;
  categorize: (entryId: string, categoryId: string | null) => Promise<string | null>;
  deleteEntry: (entry: Entry) => Promise<string | null>;
  createCategory: (name: string, icon: string) => Promise<string | null>;
  deleteCategory: (id: string) => Promise<string | null>;
};

const ENTRY_SELECT = '*, category:categories(id, name, icon, color_slot)';

const INITIAL: FinanceState = {
  balances: { main: 0, savings: 0, currency: DEFAULT_CURRENCY },
  categories: [],
  activity: [],
  unsorted: [],
  loading: true,
  error: null,
};

const FinanceContext = createContext<(FinanceState & FinanceActions) | null>(null);

/** Single source of truth for the signed-in user's money; every mutation refreshes balances everywhere. */
export function FinanceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<FinanceState>(INITIAL);
  const [accountIds, setAccountIds] = useState<{ main?: string; savings?: string }>({});

  const refresh = useCallback(async () => {
    const [balances, categories, unsorted] = await Promise.all([
      supabase.from('account_balances').select('*'),
      supabase.from('categories').select('*').order('created_at'),
      supabase
        .from('transactions')
        .select(ENTRY_SELECT)
        .eq('kind', 'expense')
        .is('category_id', null)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    const main = balances.data?.find((b) => b.kind === 'main');
    const savings = balances.data?.find((b) => b.kind === 'savings');

    const activity = main
      ? await supabase
          .from('transactions')
          .select(ENTRY_SELECT)
          .eq('account_id', main.id)
          .order('occurred_on', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100)
      : { data: [], error: null };

    setAccountIds({ main: main?.id, savings: savings?.id });
    setState({
      balances: {
        main: main?.balance_cents ?? 0,
        savings: savings?.balance_cents ?? 0,
        currency: main?.currency ?? DEFAULT_CURRENCY,
      },
      categories: categories.data ?? [],
      activity: activity.data ?? [],
      unsorted: unsorted.data ?? [],
      loading: false,
      error: (balances.error ?? categories.error ?? unsorted.error ?? activity.error)?.message ?? null,
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
      mainAccountId: accountIds.main,
      refresh,
      saveEntry: (draft, existing) => {
        const note = draft.note.trim() || null;
        if (draft.type === 'transfer') {
          const args = { amount: draft.minor, to_savings: draft.toSavings, note, occurred_on: draft.date };
          return run(
            existing?.transfer_id
              ? supabase.rpc('update_transfer', { transfer: existing.transfer_id, ...args })
              : supabase.rpc('move_money', args)
          );
        }
        const fields = {
          amount_cents: draft.type === 'expense' ? -draft.minor : draft.minor,
          category_id: draft.type === 'expense' ? draft.categoryId : null,
          note,
          occurred_on: draft.date,
        };
        if (existing) return run(supabase.from('transactions').update(fields).eq('id', existing.id));
        if (!accountIds.main) return Promise.resolve('Balance account not found.');
        return run(
          supabase.from('transactions').insert({ ...fields, account_id: accountIds.main, kind: draft.type })
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
      deleteCategory: (id) => run(supabase.from('categories').delete().eq('id', id)),
    };
  }, [refresh, accountIds, state.categories]);

  return <FinanceContext value={{ ...state, ...actions }}>{children}</FinanceContext>;
}

export function useFinance() {
  const ctx = use(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside <FinanceProvider>');
  return ctx;
}
