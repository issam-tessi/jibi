import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { toISODate, today } from '@/lib/dates';
import { useAuth } from '@/providers/auth-provider';
import { useFinance, type Entry, type Pot } from '@/providers/finance-provider';

/** Pots the user recounts when panicking (savings rarely leaks unnoticed). */
export type PanicPot = Extract<Pot, 'card' | 'cash'>;
export const PANIC_POTS: PanicPot[] = ['card', 'cash'];

type Amounts = Record<PanicPot, number>;

/** What the user told us when hitting the panic button. Stored per user on this device. */
export type PanicSnapshot = {
  /** Date of the last logged entry: the "dark period" runs from here to the activation day. */
  since: string;
  /** ISO timestamp of activation. */
  activatedAt: string;
  /** What Jibi thought was left at activation. */
  recorded: Amounts;
  /** What was really left (counted by the user). */
  actual: Amounts;
};

export type PanicReport = PanicSnapshot & {
  /** Activation day, YYYY-MM-DD. */
  until: string;
  /** Days in the dark period (at least 1). */
  days: number;
  /** Unexplained money per pot at activation (recorded − actual; negative = found money). */
  gap: Amounts;
  /** Of that gap, what has since been logged as back-dated entries. */
  explained: Amounts;
  /** Gap still unexplained, per pot (never below 0). */
  remaining: Amounts;
  /** Totals across pots (burned clamps found money to 0). */
  burned: number;
  explainedTotal: number;
  remainingTotal: number;
  /** Average unlogged spend per day. */
  burnRate: number;
  /** Entries logged since activation. */
  loggedSince: number;
};

type Panic = {
  active: boolean;
  report: PanicReport | null;
  /** Date of the last entry, i.e. where a new dark period would start. */
  lastEntryDate: string;
  activate: (actual: Amounts) => Promise<void>;
  /** Ends panic mode; with `logRemaining`, the still-missing money is saved as payments to sort. */
  deactivate: (logRemaining: boolean) => Promise<string | null>;
};

const PanicContext = createContext<Panic | null>(null);

/** Read by `useTheme()` so the whole app turns to embers while panic mode is on. */
export function usePanicActive() {
  return use(PanicContext)?.active ?? false;
}

const NOTE = '🔥 Unlogged spending (panic mode)';

export function daysBetween(from: string, to: string) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Net effect on each pot of entries logged during panic mode but dated inside the dark period. */
function backfilled(activity: Entry[], snapshot: PanicSnapshot, until: string): Amounts {
  const delta: Amounts = { card: 0, cash: 0 };
  for (const e of activity) {
    if (e.created_at < snapshot.activatedAt || e.occurred_on > until) continue;
    const from = e.account_kind as Pot;
    if (from === 'card' || from === 'cash') delta[from] += e.amount_cents;
    const to = e.to_account_kind as Pot | null;
    if (e.kind === 'transfer' && (to === 'card' || to === 'cash')) delta[to] -= e.amount_cents;
  }
  return delta;
}

export function PanicProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { activity, balances, saveEntry } = useFinance();
  const key = `jibi.panic.${session?.user.id ?? ''}`;
  const [snapshot, setSnapshot] = useState<PanicSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        try {
          setSnapshot(raw ? (JSON.parse(raw) as PanicSnapshot) : null);
        } catch {
          setSnapshot(null);
        }
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const lastEntryDate = activity[0]?.occurred_on ?? today();

  const report = useMemo<PanicReport | null>(() => {
    if (!snapshot) return null;
    const until = toISODate(new Date(snapshot.activatedAt));
    const days = Math.max(1, daysBetween(snapshot.since, until));
    const done = backfilled(activity, snapshot, until);
    const gap = { card: 0, cash: 0 } as Amounts;
    const explained = { card: 0, cash: 0 } as Amounts;
    const remaining = { card: 0, cash: 0 } as Amounts;
    for (const p of PANIC_POTS) {
      gap[p] = snapshot.recorded[p] - snapshot.actual[p];
      // Back-dated expenses push the balance down (negative delta), explaining part of the gap.
      explained[p] = Math.max(0, Math.min(Math.max(gap[p], 0), -done[p]));
      remaining[p] = Math.max(0, gap[p] - explained[p]);
    }
    const burned = Math.max(0, gap.card + gap.cash);
    const explainedTotal = Math.min(burned, explained.card + explained.cash);
    return {
      ...snapshot,
      until,
      days,
      gap,
      explained,
      remaining,
      burned,
      explainedTotal,
      remainingTotal: remaining.card + remaining.cash,
      burnRate: burned / days,
      loggedSince: activity.filter((e) => e.created_at >= snapshot.activatedAt).length,
    };
  }, [snapshot, activity]);

  const activate = useCallback(
    async (actual: Amounts) => {
      const next: PanicSnapshot = {
        since: lastEntryDate > today() ? today() : lastEntryDate,
        activatedAt: new Date().toISOString(),
        recorded: { card: balances.card, cash: balances.cash },
        actual,
      };
      await AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      setSnapshot(next);
    },
    [key, lastEntryDate, balances.card, balances.cash]
  );

  const deactivate = useCallback(
    async (logRemaining: boolean) => {
      if (logRemaining && report) {
        for (const pot of PANIC_POTS) {
          if (report.remaining[pot] <= 0) continue;
          const error = await saveEntry({
            type: 'expense',
            minor: report.remaining[pot],
            categoryId: null,
            pot,
            toPot: pot,
            note: NOTE,
            date: report.until,
          });
          if (error) return error;
        }
      }
      await AsyncStorage.removeItem(key).catch(() => {});
      setSnapshot(null);
      return null;
    },
    [key, report, saveEntry]
  );

  return (
    <PanicContext
      value={{ active: loaded && !!snapshot, report, lastEntryDate, activate, deactivate }}>
      {children}
    </PanicContext>
  );
}

export function usePanic() {
  const ctx = use(PanicContext);
  if (!ctx) throw new Error('usePanic must be used inside <PanicProvider>');
  return ctx;
}
