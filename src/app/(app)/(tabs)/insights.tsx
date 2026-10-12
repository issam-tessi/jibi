import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BarChart, type Bar } from '@/components/bar-chart';
import { EntryRow } from '@/components/entry-row';
import { MoneyFlows } from '@/components/money-flows';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, Segmented } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import type { Database } from '@/lib/database.types';
import { formatDay, formatMonth, monthRange, toISODate, today } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { useFinance } from '@/providers/finance-provider';

type ViewRow = Database['public']['Views']['entries']['Row'];
type Mode = 'days' | 'months' | 'flows';
type Month = { year: number; month: number };
type Slice = { key: string; name: string; icon: string; color: string; value: number };

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function InsightsScreen() {
  const theme = useTheme();
  const colorFor = useCategoryColor();
  const { categories, balances, activity, withCategories } = useFinance();
  const fmt = (minor: number) => formatMoney(minor, balances.currency);

  const now = new Date();
  const thisMonth: Month = { year: now.getFullYear(), month: now.getMonth() };
  const [mode, setMode] = useState<Mode>('days');
  const [cursor, setCursor] = useState<Month>(thisMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [monthRows, setMonthRows] = useState<ViewRow[]>([]);
  const [yearRows, setYearRows] = useState<Pick<ViewRow, 'amount_cents' | 'occurred_on'>[]>([]);

  const { from, to } = monthRange(cursor.year, cursor.month);
  const yearFrom = monthRange(thisMonth.year, thisMonth.month - 11).from;
  const isCurrentMonth = cursor.year === thisMonth.year && cursor.month === thisMonth.month;

  // Refetch when the month changes or any entry is added/edited (activity changes).
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('entries')
      .select('*')
      .gte('occurred_on', from)
      .lt('occurred_on', to)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => !cancelled && setMonthRows(data ?? []));
    return () => {
      cancelled = true;
    };
  }, [from, to, activity]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('entries')
      .select('amount_cents, occurred_on')
      .eq('kind', 'expense')
      .gte('occurred_on', yearFrom)
      .then(({ data }) => !cancelled && setYearRows(data ?? []));
    return () => {
      cancelled = true;
    };
  }, [yearFrom, activity]);

  // ---- Month summary ------------------------------------------------------------
  const stats = useMemo(() => {
    let income = 0;
    let spent = 0;
    let saved = 0;
    const byPot = { card: 0, cash: 0 };
    const byCategory = new Map<string | null, number>();
    const byDay = new Map<string, number>();

    for (const r of monthRows) {
      const amount = Math.abs(r.amount_cents);
      if (r.kind === 'income') income += amount;
      else if (r.kind === 'transfer') {
        if (r.to_account_kind === 'savings') saved += amount;
        if (r.account_kind === 'savings') saved -= amount;
      } else {
        spent += amount;
        if (r.account_kind === 'card' || r.account_kind === 'cash') byPot[r.account_kind] += amount;
        byCategory.set(r.category_id, (byCategory.get(r.category_id) ?? 0) + amount);
        byDay.set(r.occurred_on, (byDay.get(r.occurred_on) ?? 0) + amount);
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

    return { income, spent, saved, byPot, slices, unsorted, byDay };
  }, [monthRows, categories, colorFor, theme]);

  // ---- Days chart ---------------------------------------------------------------
  const dayBars: Bar[] = useMemo(() => {
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const todayIso = today();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const iso = toISODate(new Date(cursor.year, cursor.month, i + 1));
      const day = i + 1;
      return {
        key: iso,
        value: stats.byDay.get(iso) ?? 0,
        label: day === 1 || day % 5 === 0 ? String(day) : undefined,
        disabled: iso > todayIso,
      };
    });
  }, [cursor, stats.byDay]);
  const daysElapsed = isCurrentMonth ? now.getDate() : dayBars.length;
  const dailyAverage = daysElapsed ? Math.round(stats.spent / daysElapsed) : 0;

  // ---- Months chart -------------------------------------------------------------
  const monthBars: Bar[] = (() => {
    const totals = new Map<string, number>();
    for (const r of yearRows) {
      const key = r.occurred_on.slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + Math.abs(r.amount_cents));
    }
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(thisMonth.year, thisMonth.month - 11 + i, 1);
      const key = toISODate(d).slice(0, 7);
      return { key, value: totals.get(key) ?? 0, label: MONTH_LETTERS[d.getMonth()] };
    });
  })();
  const monthsWithSpending = monthBars.filter((b) => b.value > 0);
  const monthlyAverage = monthsWithSpending.length
    ? Math.round(monthsWithSpending.reduce((s, b) => s + b.value, 0) / monthsWithSpending.length)
    : 0;
  const cursorKey = toISODate(new Date(cursor.year, cursor.month, 1)).slice(0, 7);

  // ---- Chart header: shows hovered/selected bar, else the period total ------------
  const focusKey = hovered ?? (mode === 'days' ? selectedDay : cursorKey);
  const header =
    mode === 'days'
      ? focusKey
        ? { label: formatDay(focusKey), value: stats.byDay.get(focusKey) ?? 0 }
        : { label: `Spent in ${formatMonth(cursor.year, cursor.month)}`, value: stats.spent }
      : (() => {
          const bar = monthBars.find((b) => b.key === focusKey);
          const [y, m] = (focusKey ?? cursorKey).split('-').map(Number);
          return { label: formatMonth(y, m - 1), value: bar?.value ?? 0 };
        })();

  const dayEntries = selectedDay ? withCategories(monthRows.filter((r) => r.occurred_on === selectedDay)) : [];
  const sortedShare = stats.spent ? Math.round(((stats.spent - stats.unsorted) / stats.spent) * 100) : 100;

  function goToMonth(next: Month) {
    setCursor(next);
    setSelectedDay(null);
  }

  return (
    <Screen title="Insights">
      <Segmented
        options={[
          { value: 'days', label: 'Days' },
          { value: 'months', label: 'Months' },
          { value: 'flows', label: 'Flows' },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setHovered(null);
        }}
      />

      {mode !== 'months' && (
        <View style={styles.monthRow}>
          <MonthArrow label="‹" onPress={() => goToMonth(shift(cursor, -1))} />
          <ThemedText type="smallBold" style={styles.monthLabel}>
            {formatMonth(cursor.year, cursor.month)}
          </ThemedText>
          <MonthArrow label="›" disabled={isCurrentMonth} onPress={() => goToMonth(shift(cursor, 1))} />
        </View>
      )}

      {mode === 'flows' ? (
        <MoneyFlows year={cursor.year} month={cursor.month} monthRows={monthRows} />
      ) : (
      <>
      <Card style={styles.chartCard}>
        <View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.capitalize}>
            {header.label}
          </ThemedText>
          <ThemedText style={styles.headline}>{fmt(header.value)}</ThemedText>
        </View>

        {mode === 'days' ? (
          <BarChart
            bars={dayBars}
            color={theme.accent}
            selectedKey={selectedDay}
            onSelect={setSelectedDay}
            onHover={setHovered}
            reference={{ value: dailyAverage, label: `avg ${fmt(dailyAverage)}/day` }}
            formatValue={fmt}
          />
        ) : (
          <BarChart
            bars={monthBars}
            color={theme.accent}
            selectedKey={cursorKey}
            onSelect={(key) => {
              if (!key) return;
              const [y, m] = key.split('-').map(Number);
              goToMonth({ year: y, month: m - 1 });
            }}
            onHover={setHovered}
            reference={{ value: monthlyAverage, label: `avg ${fmt(monthlyAverage)}/month` }}
            formatValue={fmt}
          />
        )}
        <ThemedText type="small" themeColor="textMuted">
          {mode === 'days' ? 'Tap a day to see what you spent.' : 'Tap a month to see its breakdown below.'}
        </ThemedText>
      </Card>

      {mode === 'days' && selectedDay && (
        <Card style={styles.list}>
          <ThemedText type="smallBold">{formatDay(selectedDay)}</ThemedText>
          {dayEntries.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nothing recorded this day.
            </ThemedText>
          ) : (
            dayEntries.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                onPress={() => router.push({ pathname: '/edit/[id]', params: { id: e.id } })}
              />
            ))
          )}
        </Card>
      )}

      {mode === 'months' && (
        <ThemedText type="smallBold" style={[styles.capitalize, styles.sectionLabel]}>
          {formatMonth(cursor.year, cursor.month)}
        </ThemedText>
      )}

      <View style={styles.tiles}>
        <StatTile label="In" value={`+${fmt(stats.income)}`} />
        <StatTile label="Spent" value={`−${fmt(stats.spent)}`} />
        <StatTile label="🐷 Saved" value={`${stats.saved < 0 ? '−' : '+'}${fmt(Math.abs(stats.saved))}`} />
      </View>

      {stats.spent > 0 && (
        <Card style={styles.breakdown}>
          <ThemedText type="smallBold">Paid with</ThemedText>
          <SplitBar
            parts={[
              { key: 'card', label: '💳 Card', value: stats.byPot.card, color: theme.accent },
              { key: 'cash', label: '💰 Cash', value: stats.byPot.cash, color: theme.income },
            ]}
            format={fmt}
          />

          <ThemedText type="smallBold" style={styles.breakdownTitle}>
            By category
          </ThemedText>
          {stats.slices.map((s) => (
            <CategoryBar key={s.key} slice={s} share={s.value / stats.spent} amount={fmt(s.value)} />
          ))}

          <View style={[styles.sortedBar, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.sortedFill, { width: `${sortedShare}%`, backgroundColor: theme.income }]} />
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
        </Card>
      )}
      </>
      )}
    </Screen>
  );
}

function shift({ year, month }: Month, delta: number): Month {
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

/** Two-part horizontal bar with labels and amounts underneath. */
function SplitBar({
  parts,
  format,
}: {
  parts: { key: string; label: string; value: number; color: string }[];
  format: (v: number) => string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <View style={styles.split}>
      <View style={styles.splitTrack}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <View key={p.key} style={{ flex: p.value / total, backgroundColor: p.color, height: 10, borderRadius: 4 }} />
          ))}
      </View>
      <View style={styles.splitLegend}>
        {parts.map((p) => (
          <View key={p.key} style={styles.splitItem}>
            <View style={[styles.swatch, { backgroundColor: p.color }]} />
            <ThemedText type="small">
              {p.label} · {format(p.value)} ({Math.round((p.value / total) * 100)}%)
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function CategoryBar({ slice, share, amount }: { slice: Slice; share: number; amount: string }) {
  const theme = useTheme();
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryTop}>
        <ThemedText type="small" style={styles.categoryName} numberOfLines={1}>
          {slice.icon} {slice.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.pct}>
          {Math.round(share * 100)}%
        </ThemedText>
        <ThemedText type="smallBold" style={styles.categoryAmount}>
          {amount}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.bar, { width: `${Math.max(share * 100, 1)}%`, backgroundColor: slice.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  capitalize: { textTransform: 'capitalize' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  monthLabel: { flex: 1, textAlign: 'center', fontSize: 17, textTransform: 'capitalize' },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  chartCard: { gap: Spacing.three },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: 700, fontVariant: ['tabular-nums'] },
  list: { paddingVertical: Spacing.three, gap: Spacing.one },
  sectionLabel: { paddingHorizontal: Spacing.one, fontSize: 17 },
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, gap: Spacing.half, paddingVertical: Spacing.two },
  breakdown: { gap: Spacing.two },
  breakdownTitle: { marginTop: Spacing.two },
  split: { gap: Spacing.two },
  splitTrack: { flexDirection: 'row', gap: 2 },
  splitLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  splitItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  categoryRow: { gap: Spacing.one, paddingVertical: Spacing.one },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  categoryName: { flex: 1 },
  pct: { width: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  categoryAmount: { minWidth: 80, textAlign: 'right', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  sortedBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: Spacing.two },
  sortedFill: { height: 8, borderRadius: Radius.small },
  sortedRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
