import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/donut-chart';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import type { Tables } from '@/lib/database.types';
import { formatMonth, monthRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { useFinance } from '@/providers/finance-provider';

type Row = Pick<Tables<'transactions'>, 'kind' | 'amount_cents' | 'category_id'>;
type Slice = { key: string; name: string; icon: string; color: string; value: number };

export default function InsightsScreen() {
  const theme = useTheme();
  const colorFor = useCategoryColor();
  const { mainAccountId, categories, balances, activity } = useFinance();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const { from, to } = monthRange(cursor.year, cursor.month);
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const fmt = (c: number) => formatMoney(c, balances.currency);

  useEffect(() => {
    if (!mainAccountId) return;
    let cancelled = false;
    supabase
      .from('transactions')
      .select('kind, amount_cents, category_id')
      .eq('account_id', mainAccountId)
      .gte('occurred_on', from)
      .lt('occurred_on', to)
      .then(({ data }) => {
        if (!cancelled) setRows(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // `activity` changes whenever an entry is added/edited, so the month refetches too.
  }, [mainAccountId, from, to, activity]);

  const stats = useMemo(() => {
    let income = 0;
    let spent = 0;
    let saved = 0;
    const byCategory = new Map<string | null, number>();
    for (const r of rows) {
      if (r.kind === 'income') income += r.amount_cents;
      else if (r.kind === 'transfer') saved -= r.amount_cents; // main -x means +x to savings
      else {
        spent -= r.amount_cents;
        byCategory.set(r.category_id, (byCategory.get(r.category_id) ?? 0) - r.amount_cents);
      }
    }

    const slices: Slice[] = [];
    let other = 0;
    for (const c of categories) {
      const value = byCategory.get(c.id) ?? 0;
      if (!value) continue;
      if (c.color_slot) slices.push({ key: c.id, name: c.name, icon: c.icon, color: colorFor(c.color_slot), value });
      else other += value;
    }
    slices.sort((a, b) => b.value - a.value);
    if (other) slices.push({ key: 'other', name: 'Other', icon: '•', color: theme.textMuted, value: other });
    const unsorted = byCategory.get(null) ?? 0;
    if (unsorted) slices.push({ key: 'unsorted', name: 'To sort', icon: '❔', color: theme.unsorted, value: unsorted });

    return { income, spent, saved, slices, unsorted };
  }, [rows, categories, colorFor, theme]);

  const sortedShare = stats.spent ? Math.round(((stats.spent - stats.unsorted) / stats.spent) * 100) : 100;
  const activeSlice = stats.slices.find((s) => s.key === active);

  return (
    <Screen>
      <View style={styles.monthRow}>
        <MonthArrow label="‹" onPress={() => setCursor(shift(cursor, -1))} />
        <ThemedText type="smallBold" style={styles.monthLabel}>
          {formatMonth(cursor.year, cursor.month)}
        </ThemedText>
        <MonthArrow label="›" disabled={isCurrentMonth} onPress={() => setCursor(shift(cursor, 1))} />
      </View>

      <View style={styles.tiles}>
        <StatTile label="In" value={`+${fmt(stats.income)}`} />
        <StatTile label="Spent" value={`−${fmt(stats.spent)}`} />
        <StatTile label="To savings" value={`${stats.saved >= 0 ? '+' : '−'}${fmt(Math.abs(stats.saved))}`} />
      </View>

      <Card style={styles.chartCard}>
        {stats.spent === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No payments this month.
          </ThemedText>
        ) : (
          <>
            <DonutChart
              slices={stats.slices.map((s) => ({ key: s.key, value: s.value, color: s.color }))}
              activeKey={active}
              centerLabel={activeSlice ? `${activeSlice.icon} ${activeSlice.name}` : 'Spent'}
              centerValue={fmt(activeSlice ? activeSlice.value : stats.spent)}
            />

            <View style={styles.legend}>
              {stats.slices.map((s) => (
                <LegendRow
                  key={s.key}
                  slice={s}
                  share={s.value / stats.spent}
                  amount={fmt(s.value)}
                  active={active === s.key}
                  onPress={() => setActive(active === s.key ? null : s.key)}
                />
              ))}
            </View>

            <View style={[styles.sortedBar, { backgroundColor: theme.backgroundElement }]}>
              <View
                style={[styles.sortedFill, { width: `${sortedShare}%`, backgroundColor: theme.income }]}
              />
            </View>
            <View style={styles.sortedRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {sortedShare}% of spending categorized
              </ThemedText>
              {stats.unsorted > 0 && (
                <Pressable onPress={() => router.navigate('/')} hitSlop={8}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    Sort now →
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </>
        )}
      </Card>
    </Screen>
  );
}

function shift({ year, month }: { year: number; month: number }, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function MonthArrow({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Previous month' : 'Next month'}
      style={[styles.arrow, { backgroundColor: theme.backgroundElement }, disabled && styles.disabled]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </Card>
  );
}

function LegendRow({
  slice,
  share,
  amount,
  active,
  onPress,
}: {
  slice: Slice;
  share: number;
  amount: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.legendRow, active && { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.legendTop}>
        <View style={[styles.swatch, { backgroundColor: slice.color }]} />
        <ThemedText type="small" style={styles.legendName} numberOfLines={1}>
          {slice.icon} {slice.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.pct}>
          {Math.round(share * 100)}%
        </ThemedText>
        <ThemedText type="smallBold" style={styles.legendAmount}>
          {amount}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.bar, { width: `${Math.max(share * 100, 1)}%`, backgroundColor: slice.color }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 17, textTransform: 'capitalize' },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, gap: Spacing.half, paddingVertical: Spacing.two },
  chartCard: { alignItems: 'center', gap: Spacing.four, paddingVertical: Spacing.four },
  empty: { paddingVertical: Spacing.five },
  legend: { alignSelf: 'stretch', gap: Spacing.one },
  legendRow: { gap: Spacing.one, padding: Spacing.two, borderRadius: Radius.small },
  legendTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1 },
  pct: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  legendAmount: { minWidth: 80, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  sortedBar: { alignSelf: 'stretch', height: 8, borderRadius: 4, overflow: 'hidden' },
  sortedFill: { height: 8, borderRadius: 4 },
  sortedRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.two,
  },
});
