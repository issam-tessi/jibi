import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { PrayerName, PrayerStatus, Tables } from '@/lib/database.types';
import { addDays, today } from '@/lib/dates';
import { db } from '@/lib/db';

export type PrayerLog = Tables<'prayer_logs'>;

/** Days of history loaded for the grid and streaks. */
export const PRAYER_WINDOW_DAYS = 120;

type PrayerState = { logs: PrayerLog[]; loading: boolean; error: string | null };

type PrayerActions = {
  refresh: () => Promise<void>;
  /** Sets a prayer's status for a day; `null` clears it. */
  mark: (day: string, prayer: PrayerName, status: PrayerStatus | null) => Promise<string | null>;
};

const Context = createContext<(PrayerState & PrayerActions) | null>(null);

export function PrayerProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PrayerState>({ logs: [], loading: true, error: null });

  const refresh = useCallback(async () => {
    const { data, error } = await db
      .from('prayer_logs')
      .select('*')
      .gte('day', addDays(today(), -PRAYER_WINDOW_DAYS))
      .order('day', { ascending: false })
      .limit(1000);
    setState({ logs: data ?? [], loading: false, error: error?.message ?? null });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const actions = useMemo<PrayerActions>(
    () => ({
      refresh,
      mark: async (day, prayer, status) => {
        // Optimistic: taps should feel instant.
        setState((s) => ({
          ...s,
          logs: [
            ...s.logs.filter((l) => !(l.day === day && l.prayer === prayer)),
            ...(status ? [{ id: `tmp-${day}-${prayer}`, user_id: '', day, prayer, status, logged_at: new Date().toISOString() }] : []),
          ],
        }));
        const { error } = status
          ? await db.from('prayer_logs').upsert({ day, prayer, status }, { onConflict: 'user_id,day,prayer' })
          : await db.from('prayer_logs').delete().eq('day', day).eq('prayer', prayer);
        await refresh();
        return error?.message ?? null;
      },
    }),
    [refresh]
  );

  return <Context value={{ ...state, ...actions }}>{children}</Context>;
}

export function usePrayers() {
  const ctx = use(Context);
  if (!ctx) throw new Error('usePrayers must be used inside <PrayerProvider>');
  return ctx;
}
