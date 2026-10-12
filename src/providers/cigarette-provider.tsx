import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Tables } from '@/lib/database.types';
import { addDays, today } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { useFinance } from '@/providers/finance-provider';

export type CigPack = Tables<'cig_packs'>;
export type CigSmoke = Tables<'cig_smokes'>;

/** How many days of individual smokes are loaded for stats. */
export const SMOKE_WINDOW_DAYS = 30;

type CigaretteState = {
  /** Cigarettes left, per brand id. */
  stock: Record<string, number>;
  packs: CigPack[];
  /** Smokes in the last SMOKE_WINDOW_DAYS, newest first. */
  smokes: CigSmoke[];
  loading: boolean;
  error: string | null;
};

type CigaretteActions = {
  refresh: () => Promise<void>;
  smoke: (brand: string, note: string) => Promise<string | null>;
  deleteSmoke: (id: string) => Promise<string | null>;
};

const Context = createContext<(CigaretteState & CigaretteActions) | null>(null);

export function CigaretteProvider({ children }: PropsWithChildren) {
  const { activity } = useFinance();
  const [state, setState] = useState<CigaretteState>({ stock: {}, packs: [], smokes: [], loading: true, error: null });

  const refresh = useCallback(async () => {
    const since = new Date(`${addDays(today(), -SMOKE_WINDOW_DAYS)}T00:00:00`).toISOString();
    const [stock, packs, smokes] = await Promise.all([
      supabase.from('cig_stock').select('*'),
      supabase.from('cig_packs').select('*').order('bought_on', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
      supabase.from('cig_smokes').select('*').gte('smoked_at', since).order('smoked_at', { ascending: false }).limit(1000),
    ]);
    setState({
      stock: Object.fromEntries((stock.data ?? []).map((s) => [s.brand, s.left_count])),
      packs: packs.data ?? [],
      smokes: smokes.data ?? [],
      loading: false,
      error: (stock.error ?? packs.error ?? smokes.error)?.message ?? null,
    });
  }, []);

  // Payments (and the packs they bought) change elsewhere, so follow the finance activity feed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh, activity]);

  const actions = useMemo<CigaretteActions>(() => {
    const run = async (op: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await op;
      if (!error) await refresh();
      return error?.message ?? null;
    };
    return {
      refresh,
      smoke: (brand, note) => run(supabase.from('cig_smokes').insert({ brand, note: note.trim() || null })),
      deleteSmoke: (id) => run(supabase.from('cig_smokes').delete().eq('id', id)),
    };
  }, [refresh]);

  return <Context value={{ ...state, ...actions }}>{children}</Context>;
}

export function useCigarettes() {
  const ctx = use(Context);
  if (!ctx) throw new Error('useCigarettes must be used inside <CigaretteProvider>');
  return ctx;
}
