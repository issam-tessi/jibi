import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowDiagram, type FlowLink, type FlowNode } from '@/components/flow-diagram';
import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionTitle } from '@/components/ui';
import { CategoryPalette, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import type { AccountKind, Database } from '@/lib/database.types';
import { formatDay, monthRange, toISODate, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { POTS, potIcon, potLabel, transferIcon, transferTitle } from '@/lib/pots';
import { supabase } from '@/lib/supabase';
import { useFinance } from '@/providers/finance-provider';

type ViewRow = Database['public']['Views']['entries']['Row'];
type Leg = { kind: ViewRow['kind']; amount_cents: number; occurred_on: string; account: { kind: AccountKind } | null };
type Ledger = { start: number; added: number; movedIn: number; movedOut: number; spent: number; end: number };

/** "Where did the money go" for one month: balance over time, per-pot ledger, and moves between pots. */
export function MoneyFlows({ year, month, monthRows }: { year: number; month: number; monthRows: ViewRow[] }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const palette = CategoryPalette[scheme === 'dark' ? 'dark' : 'light'];
  const { balances, activity, categories } = useFinance();
  const colorFor = useCategoryColor();
  const fmt = (v: number) => formatMoney(v, balances.currency);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const { from, to } = monthRange(year, month);

  // Every transaction leg up to the end of the month: needed for opening balances and daily running totals.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('transactions')
      .select('kind, amount_cents, occurred_on, account:accounts(kind)')
      .lt('occurred_on', to)
      .then(({ data }) => !cancelled && setLegs((data as Leg[] | null) ?? []));
    return () => {
      cancelled = true;
    };
  }, [to, activity]);

  const flow = useMemo(() => {
    const ledger = Object.fromEntries(
      POTS.map((p) => [p.value, { start: 0, added: 0, movedIn: 0, movedOut: 0, spent: 0, end: 0 }])
    ) as Record<AccountKind, Ledger>;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = Math.min(daysInMonth, from.slice(0, 7) === today().slice(0, 7) ? new Date().getDate() : daysInMonth);
    const dailyDelta = Array.from({ length: lastDay }, () => ({ spendable: 0, savings: 0 }));

    for (const leg of legs) {
      const pot = leg.account?.kind;
      if (!pot) continue;
      const v = leg.amount_cents;
      const l = ledger[pot];
      if (leg.occurred_on < from) {
        l.start += v;
        continue;
      }
      if (leg.kind === 'income') l.added += v;
      else if (leg.kind === 'expense') l.spent -= v;
      else if (v > 0) l.movedIn += v;
      else l.movedOut -= v;

      const dayIndex = Number(leg.occurred_on.slice(8, 10)) - 1;
      if (dayIndex < lastDay) {
        if (pot === 'savings') dailyDelta[dayIndex].savings += v;
        else dailyDelta[dayIndex].spendable += v;
      }
    }
    for (const p of POTS) {
      const l = ledger[p.value];
      l.end = l.start + l.added + l.movedIn - l.movedOut - l.spent;
    }

    // Running end-of-day totals.
    let spendable = ledger.card.start + ledger.cash.start;
    let savings = ledger.savings.start;
    const spendableSeries: number[] = [];
    const savingsSeries: number[] = [];
    for (const d of dailyDelta) {
      spendable += d.spendable;
      savings += d.savings;
      spendableSeries.push(spendable);
      savingsSeries.push(savings);
    }

    // Moves grouped by direction (from monthRows: one row per transfer).
    const moves = new Map<string, { from: AccountKind; to: AccountKind; count: number; total: number }>();
    for (const r of monthRows) {
      if (r.kind !== 'transfer' || !r.to_account_kind) continue;
      const key = `${r.account_kind}>${r.to_account_kind}`;
      const m = moves.get(key) ?? { from: r.account_kind, to: r.to_account_kind, count: 0, total: 0 };
      m.count += 1;
      m.total += Math.abs(r.amount_cents);
      moves.set(key, m);
    }

    return {
      ledger,
      spendableSeries,
      savingsSeries,
      moves: [...moves.values()].sort((a, b) => b.total - a.total),
      lastDay,
    };
  }, [legs, monthRows, from, year, month]);

  const xLabels = flow.spendableSeries.map((_, i) => (i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : null));
  const selectedDate = selected != null ? toISODate(new Date(year, month, selected + 1)) : null;
  const headerIndex = selected ?? flow.spendableSeries.length - 1;

  const diagram = useMemo(() => {
    const catKey = (id: string | null) => {
      if (!id) return 'cat:unsorted';
      return topCategoryIds.has(id) ? `cat:${id}` : 'cat:other';
    };
    // Top 5 categories by spend keep their own node; the rest fold into "Other".
    const spendByCat = new Map<string | null, number>();
    for (const r of monthRows)
      if (r.kind === 'expense') spendByCat.set(r.category_id, (spendByCat.get(r.category_id) ?? 0) + Math.abs(r.amount_cents));
    const topCategoryIds = new Set(
      [...spendByCat.entries()]
        .filter(([id]) => id)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id as string)
    );

    const nodes: FlowNode[] = [
      { key: 'in', label: '💵 In', color: theme.textSecondary, column: 0 },
      { key: 'card', label: '💳 Card', color: palette[0], column: 1 },
      { key: 'cash', label: '💰 Cash', color: theme.income, column: 2 },
      { key: 'savings', label: '🐷 Savings', color: palette[2], column: 3 },
      ...categories
        .filter((c) => topCategoryIds.has(c.id))
        .map((c) => ({ key: `cat:${c.id}`, label: `${c.icon} ${c.name}`, color: colorFor(c.color_slot), column: 3 })),
      { key: 'cat:other', label: '• Other', color: theme.textMuted, column: 3 },
      { key: 'cat:unsorted', label: '❔ To sort', color: theme.unsorted, column: 3 },
    ];

    const sums = new Map<string, number>();
    const add = (from: string, to: string, v: number) => sums.set(`${from}|${to}`, (sums.get(`${from}|${to}`) ?? 0) + v);
    for (const r of monthRows) {
      const v = Math.abs(r.amount_cents);
      if (r.kind === 'income') add('in', r.account_kind, v);
      else if (r.kind === 'expense') add(r.account_kind, catKey(r.category_id), v);
      else if (r.to_account_kind === 'savings') add(r.account_kind, 'savings', v);
      else if (r.account_kind === 'card' && r.to_account_kind === 'cash') add('card', 'cash', v);
      else if (r.account_kind === 'cash' && r.to_account_kind === 'card') add('card', 'cash', -v); // net withdrawals
    }
    const links: FlowLink[] = [...sums.entries()].map(([k, value]) => {
      const [from, to] = k.split('|');
      return { from, to, value };
    });
    return { nodes, links, hasFlow: links.some((l) => l.value > 0) };
  }, [monthRows, categories, colorFor, palette, theme]);

  const cash = flow.ledger.cash;
  const withdrawn = flow.moves.filter((m) => m.from === 'card' && m.to === 'cash').reduce((s, m) => s + m.total, 0);

  return (
    <>
      <Card style={styles.card}>
        <View>
          <ThemedText type="smallBold">Where your money flowed</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Money in → 💳 Card → 💰 Cash → what you spent it on
          </ThemedText>
        </View>
        {diagram.hasFlow ? (
          <FlowDiagram nodes={diagram.nodes} links={diagram.links} formatValue={fmt} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Nothing moved this month yet.
          </ThemedText>
        )}
      </Card>

      <Card style={styles.card}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedDate ? `End of ${formatDay(selectedDate)}` : 'Balance over the month'}
          </ThemedText>
          <View style={styles.headerValues}>
            <ThemedText style={styles.headline}>{fmt(flow.spendableSeries[headerIndex] ?? 0)}</ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary">
              🐷 {fmt(flow.savingsSeries[headerIndex] ?? 0)}
            </ThemedText>
          </View>
        </View>
        {flow.spendableSeries.length > 0 ? (
          <LineChart
            series={[
              { key: 'spendable', label: '💳+💰 Balance', color: palette[0], values: flow.spendableSeries },
              { key: 'savings', label: '🐷 Savings', color: palette[2], values: flow.savingsSeries },
            ]}
            xLabels={xLabels}
            selectedIndex={selected}
            onSelect={setSelected}
            formatValue={fmt}
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No days to show yet.
          </ThemedText>
        )}
      </Card>

      <SectionTitle title="Each pot this month" />
      <Card style={styles.card}>
        {POTS.map((p, i) => (
          <PotLedger key={p.value} pot={p.value} ledger={flow.ledger[p.value]} fmt={fmt} first={i === 0} />
        ))}
      </Card>

      <SectionTitle title="Money moved" />
      <Card style={styles.card}>
        {flow.moves.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No moves between Card, Cash and Savings this month.
          </ThemedText>
        ) : (
          flow.moves.map((m) => (
            <View key={`${m.from}>${m.to}`} style={styles.moveRow}>
              <View style={[styles.moveIcon, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.moveIconText}>{transferIcon(m.from, m.to)}</ThemedText>
              </View>
              <View style={styles.moveInfo}>
                <ThemedText type="smallBold">{transferTitle(m.from, m.to)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {potIcon(m.from)} {potLabel(m.from)} → {potIcon(m.to)} {potLabel(m.to)} · {m.count}×
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={styles.num}>
                {fmt(m.total)}
              </ThemedText>
            </View>
          ))
        )}
        {(withdrawn > 0 || cash.spent > 0) && (
          <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">
              💰 You took {fmt(withdrawn)} in cash and spent {fmt(cash.spent)} of it
              {cash.end > 0 ? ` — ${fmt(cash.end)} still in your pocket.` : '.'}
            </ThemedText>
          </View>
        )}
      </Card>
    </>
  );
}

function PotLedger({
  pot,
  ledger,
  fmt,
  first,
}: {
  pot: AccountKind;
  ledger: Ledger;
  fmt: (v: number) => string;
  first: boolean;
}) {
  const theme = useTheme();
  const lines = [
    { label: 'Added', value: ledger.added, sign: '+' },
    { label: 'Moved in', value: ledger.movedIn, sign: '+' },
    { label: 'Moved out', value: ledger.movedOut, sign: '−' },
    { label: 'Spent', value: ledger.spent, sign: '−' },
  ].filter((l) => l.value !== 0);
  const change = ledger.end - ledger.start;

  return (
    <View style={[styles.pot, !first && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.potHeader}>
        <ThemedText type="smallBold" style={styles.potName}>
          {potIcon(pot)} {potLabel(pot)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.num}>
          {fmt(ledger.start)} → <ThemedText type="smallBold">{fmt(ledger.end)}</ThemedText>
        </ThemedText>
      </View>
      {lines.length === 0 ? (
        <ThemedText type="small" themeColor="textMuted">
          No activity
        </ThemedText>
      ) : (
        <View style={styles.potLines}>
          {lines.map((l) => (
            <View key={l.label} style={styles.potLine}>
              <ThemedText type="small" themeColor="textSecondary">
                {l.label}
              </ThemedText>
              <ThemedText type="small" style={styles.num}>
                {l.sign}
                {fmt(l.value)}
              </ThemedText>
            </View>
          ))}
          <View style={styles.potLine}>
            <ThemedText type="small" themeColor="textSecondary">
              Change
            </ThemedText>
            <ThemedText type="smallBold" style={[styles.num, { color: change >= 0 ? theme.income : theme.expense }]}>
              {change >= 0 ? '▲ +' : '▼ −'}
              {fmt(Math.abs(change))}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  headerValues: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: 700, fontVariant: ['tabular-nums'] },
  num: { fontVariant: ['tabular-nums'] },
  pot: { gap: Spacing.two, paddingTop: Spacing.two },
  potHeader: { flexDirection: 'row', alignItems: 'center' },
  potName: { flex: 1 },
  potLines: { gap: Spacing.half, paddingLeft: Spacing.four },
  potLine: { flexDirection: 'row', justifyContent: 'space-between' },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  moveIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  moveIconText: { fontSize: 18, lineHeight: 22 },
  moveInfo: { flex: 1 },
  note: { borderRadius: 12, padding: Spacing.three },
});
