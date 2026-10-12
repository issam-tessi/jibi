import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type TransactionWithCategory = Tables<'transactions'> & {
  category: Pick<Tables<'categories'>, 'name' | 'kind'> | null;
};

type FinanceData = {
  accounts: Tables<'accounts'>[];
  categories: Tables<'categories'>[];
  transactions: TransactionWithCategory[];
};

const EMPTY: FinanceData = { accounts: [], categories: [], transactions: [] };

/** Loads the signed-in user's accounts, categories and recent transactions; refetches when the screen gains focus. */
export function useFinanceData(limit = 200) {
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [accounts, categories, transactions] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('categories').select('*').order('name'),
      supabase
        .from('transactions')
        .select('*, category:categories(name, kind)')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);
    const firstError = accounts.error ?? categories.error ?? transactions.error;
    setError(firstError?.message ?? null);
    setData({
      accounts: accounts.data ?? [],
      categories: categories.data ?? [],
      transactions: transactions.data ?? [],
    });
    setLoading(false);
  }, [limit]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { ...data, error, loading, refresh };
}
