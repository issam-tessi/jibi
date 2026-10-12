import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { Tables } from '@/lib/database.types';
import { addDays, today } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

export type GymVisit = Tables<'gym_visits'>;

/** How far back visits are loaded (covers the 12-week heatmap and streaks). */
export const GYM_WINDOW_DAYS = 365;

type GymState = { visits: GymVisit[]; loading: boolean; error: string | null };

type GymActions = {
  refresh: () => Promise<void>;
  checkIn: (visit: { at: Date; workout: string | null; note: string }) => Promise<string | null>;
  deleteVisit: (id: string) => Promise<string | null>;
};

const Context = createContext<(GymState & GymActions) | null>(null);

export function GymProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<GymState>({ visits: [], loading: true, error: null });

  const refresh = useCallback(async () => {
    const since = new Date(`${addDays(today(), -GYM_WINDOW_DAYS)}T00:00:00`).toISOString();
    const { data, error } = await supabase
      .from('gym_visits')
      .select('*')
      .gte('visited_at', since)
      .order('visited_at', { ascending: false })
      .limit(1000);
    setState({ visits: data ?? [], loading: false, error: error?.message ?? null });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const actions = useMemo<GymActions>(() => {
    const run = async (op: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await op;
      if (!error) await refresh();
      return error?.message ?? null;
    };
    return {
      refresh,
      checkIn: ({ at, workout, note }) =>
        run(supabase.from('gym_visits').insert({ visited_at: at.toISOString(), workout, note: note.trim() || null })),
      deleteVisit: (id) => run(supabase.from('gym_visits').delete().eq('id', id)),
    };
  }, [refresh]);

  return <Context value={{ ...state, ...actions }}>{children}</Context>;
}

export function useGym() {
  const ctx = use(Context);
  if (!ctx) throw new Error('useGym must be used inside <GymProvider>');
  return ctx;
}
