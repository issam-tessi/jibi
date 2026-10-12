import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DayGroup } from '@/components/day-group';
import { EntryRow } from '@/components/entry-row';
import { MonthCalendar } from '@/components/month-calendar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionTitle, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Database } from '@/lib/database.types';
import { addDays, formatDay, formatMonth, formatWeek, monthRange, today, weekStart } from '@/lib/dates';
import { formatMoney, minorDigits } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { useFinance, type Entry } from '@/providers/finance-provider';

type EntryType = 'income' | 'expense' | 'transfer';
type HomeView = 'recent' | 'day' | 'week' | 'month';
type ViewRow = Database['public']['Views']['entries']['Row'];

export default function HomeScreen() {
  const { activity, unsorted, balances, error, loading, history, undo, redo, withCategories } = useFinance();
  const theme = useTheme();
  const [view, setView] = useState<HomeView>('recent');
  const [anchor, setAnchor] = useState(today()); // the day the Day/Week/Month views are centred on
  const [rangeRows, setRangeRows] = useState<ViewRow[]>([]);
  const fmt = (v: number) => formatMoney(v, balances.currency);
  const openEntry = (e: Entry) => router.push({ pathname: '/edit/[id]', params: { id: e.id } });

  // Date range for the selected view.
  const [y, m] = anchor.split('-').map(Number);
  const range =
    view === 'day'
      ? { from: anchor, to: addDays(anchor, 1) }
      : view === 'week'
        ? { from: weekStart(anchor), to: addDays(weekStart(anchor), 7) }
        : monthRange(y, m - 1);

  useEffect(() => {
    if (view === 'recent') return;
    let cancelled = false;
    supabase
      .from('entries')
      .select('*')
      .gte('occurred_on', range.from)
      .lt('occurred_on', range.to)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => !cancelled && setRangeRows(data ?? []));
    return () => {
      cancelled = true;
    };
  }, [view, range.from, range.to, activity]);

  const rangeEntries = withCategories(rangeRows);

  // Undo = newest action not yet undone; Redo = the undone action closest to it.
  const lastDone = history.find((a) => !a.undone);
  const undoneRun = history.slice(0, lastDone ? history.indexOf(lastDone) : history.length);
  const nextRedo = undoneRun[undoneRun.length - 1];

  function step(direction: -1 | 1) {
    if (view === 'day') setAnchor(addDays(anchor, direction));
    else if (view === 'week') setAnchor(addDays(anchor, 7 * direction));
    else setAnchor(monthRange(y, m - 1 + direction).from);
  }
  const atPresent = range.to > today();
  const navLabel =
    view === 'day' ? formatDay(anchor) : view === 'week' ? formatWeek(weekStart(anchor)) : formatMonth(y, m - 1);

  return (
    <Screen
      title="Home"
      accessory={
        <View style={styles.tools}>
          <ToolButton label="↶" hint="Undo" disabled={!lastDone} onPress={() => lastDone && undo(lastDone.groupId)} />
          <ToolButton label="↷" hint="Redo" disabled={!nextRedo} onPress={() => nextRedo && redo(nextRedo.groupId)} />
          <ToolButton label="🕘" hint="History" onPress={() => router.push('/history')} />
        </View>
      }>
      <View style={styles.actions}>
        <ActionButton type="income" icon="＋" label="Add" />
        <ActionButton type="expense" icon="−" label="Pay" />
        <ActionButton type="transfer" icon="⇄" label="Move" />
      </View>

      {error && <ThemedText type="small">{error}</ThemedText>}

      {unsorted.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            title={`To sort · ${unsorted.length}`}
            right={
              <ThemedText themeColor="textSecondary" style={styles.footnote}>
                {fmt(unsorted.reduce((s, e) => s - e.amount_cents, 0))}
              </ThemedText>
            }
          />
          <Card style={styles.list}>
            {unsorted.slice(0, 3).map((e, i, shown) => (
              <EntryRow key={e.id} entry={e} onPress={() => openEntry(e)} last={i === shown.length - 1} />
            ))}
          </Card>
          <ThemedText themeColor="textSecondary" style={[styles.footnote, styles.sectionFooter]}>
            {unsorted.length > 3 ? `${unsorted.length - 3} more to sort. ` : ''}Give payments a category so your
            insights stay accurate.
          </ThemedText>
        </View>
      )}

      <Segmented
        options={[
          { value: 'recent', label: 'Recent' },
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
        value={view}
        onChange={setView}
      />

      {view !== 'recent' && (
        <View style={styles.nav}>
          <NavArrow label="‹" onPress={() => step(-1)} />
          <ThemedText type="smallBold" style={styles.navLabel}>
            {navLabel}
          </ThemedText>
          <NavArrow label="›" disabled={atPresent} onPress={() => step(1)} />
          {anchor !== today() && (
            <Pressable onPress={() => setAnchor(today())} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Today
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {view === 'recent' &&
        (!loading && activity.length === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Nothing yet. Start with “Add money” to set your balance.
            </ThemedText>
          </Card>
        ) : (
          groupByDay(activity).map(([day, entries]) => (
            <DayGroup key={day} date={day} entries={entries} onOpen={openEntry} />
          ))
        ))}

      {view === 'day' &&
        (rangeEntries.length === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Nothing recorded on {formatDay(anchor)}.
            </ThemedText>
          </Card>
        ) : (
          <DayGroup key={anchor} date={anchor} entries={rangeEntries} onOpen={openEntry} startExpanded />
        ))}

      {view === 'week' && (
        <>
          <PeriodSummary entries={rangeEntries} fmt={fmt} />
          {groupByDay(rangeEntries).map(([day, entries]) => (
            <DayGroup key={day} date={day} entries={entries} onOpen={openEntry} />
          ))}
          {rangeEntries.length === 0 && (
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                Nothing recorded this week.
              </ThemedText>
            </Card>
          )}
        </>
      )}

      {view === 'month' && (
        <>
          <PeriodSummary entries={rangeEntries} fmt={fmt} />
          <Card>
            <MonthCalendar
              year={y}
              month={m - 1}
              spentByDay={spentByDay(rangeEntries)}
              formatCompact={(v) => String(Math.round(v / 10 ** minorDigits(balances.currency)))}
              onSelectDay={(iso) => {
                setAnchor(iso);
                setView('day');
              }}
            />
            <ThemedText type="small" themeColor="textMuted" style={styles.calendarHint}>
              Darker = more spent (in DT). Tap a day to see and edit its entries.
            </ThemedText>
          </Card>
        </>
      )}
    </Screen>
  );
}

function PeriodSummary({ entries, fmt }: { entries: Entry[]; fmt: (v: number) => string }) {
  const spent = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s - e.amount_cents, 0);
  const added = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount_cents, 0);
  return (
    <View style={styles.summary}>
      <Card style={styles.summaryTile}>
        <ThemedText type="small" themeColor="textSecondary">
          Added
        </ThemedText>
        <ThemedText type="smallBold">+{fmt(added)}</ThemedText>
      </Card>
      <Card style={styles.summaryTile}>
        <ThemedText type="small" themeColor="textSecondary">
          Spent
        </ThemedText>
        <ThemedText type="smallBold">−{fmt(spent)}</ThemedText>
      </Card>
      <Card style={styles.summaryTile}>
        <ThemedText type="small" themeColor="textSecondary">
          Entries
        </ThemedText>
        <ThemedText type="smallBold">{entries.length}</ThemedText>
      </Card>
    </View>
  );
}

/** Apple Cash-style round action: tinted circle with the glyph, label underneath. */
function ActionButton({ type, icon, label }: { type: EntryType; icon: string; label: string }) {
  const theme = useTheme();
  const tint = type === 'income' ? theme.income : type === 'expense' ? theme.expense : theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/entry', params: { type } })}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>
        <ThemedText style={styles.actionIconText}>{icon}</ThemedText>
      </View>
      <ThemedText type="small" style={styles.actionLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Round toolbar icon button next to the large title. */
function ToolButton({
  label,
  hint,
  onPress,
  disabled,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      style={({ pressed }) => [
        styles.tool,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <ThemedText style={[styles.toolText, { color: theme.accent }]}>{label}</ThemedText>
    </Pressable>
  );
}

function NavArrow({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Previous' : 'Next'}
      style={[styles.arrow, { backgroundColor: theme.backgroundElement }, disabled && styles.disabled]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function groupByDay(entries: Entry[]) {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) groups.set(e.occurred_on, [...(groups.get(e.occurred_on) ?? []), e]);
  return [...groups.entries()];
}

function spentByDay(entries: Entry[]) {
  const map = new Map<string, number>();
  for (const e of entries)
    if (e.kind === 'expense') map.set(e.occurred_on, (map.get(e.occurred_on) ?? 0) - e.amount_cents);
  return map;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: Spacing.two },
  footnote: { fontSize: 13, lineHeight: 18 },
  sectionFooter: { paddingHorizontal: Spacing.three, marginTop: -2 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: Spacing.one },
  action: { alignItems: 'center', gap: 6, minWidth: 72 },
  actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actionIconText: { color: '#ffffff', fontSize: 26, lineHeight: 30, fontWeight: 500 },
  actionLabel: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.3 },
  list: { padding: 0 },
  tools: { flexDirection: 'row', gap: Spacing.two },
  tool: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  navLabel: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 600, textTransform: 'capitalize' },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', gap: Spacing.two },
  summaryTile: { flex: 1, gap: Spacing.half, paddingVertical: Spacing.two + 2 },
  calendarHint: { marginTop: Spacing.two, textAlign: 'center', fontSize: 13 },
});
