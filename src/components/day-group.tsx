import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EntryRow } from '@/components/entry-row';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useFinance, type Entry } from '@/providers/finance-provider';

const PREVIEW = 3;

type Mode = 'preview' | 'all' | 'collapsed';

/**
 * One day of entries as an iOS grouped section. Shows the first 3 plus a summary cell for the rest;
 * tap the summary to see everything, tap the day header to fold it away.
 */
export function DayGroup({
  date,
  entries,
  onOpen,
  startExpanded = false,
}: {
  date: string;
  entries: Entry[];
  onOpen: (e: Entry) => void;
  startExpanded?: boolean;
}) {
  const theme = useTheme();
  const { balances } = useFinance();
  const [mode, setMode] = useState<Mode>(startExpanded ? 'all' : 'preview');
  const fmt = (v: number) => formatMoney(v, balances.currency);

  const spent = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s - e.amount_cents, 0);
  const added = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount_cents, 0);
  const visible = mode === 'all' ? entries : mode === 'preview' ? entries.slice(0, PREVIEW) : [];
  const rest = entries.slice(PREVIEW);
  const hasFooterCell = (mode === 'preview' && rest.length > 0) || (mode === 'all' && entries.length > PREVIEW);

  return (
    <View style={styles.day}>
      <Pressable
        onPress={() => setMode(mode === 'collapsed' ? 'preview' : 'collapsed')}
        accessibilityRole="button"
        accessibilityLabel={`${formatDay(date)}, ${entries.length} entries. ${mode === 'collapsed' ? 'Expand' : 'Collapse'}`}
        style={styles.header}>
        <ThemedText themeColor="textSecondary" style={styles.headerText}>
          {formatDay(date).toUpperCase()}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={[styles.headerText, styles.totals]}>
          {[added ? `+${fmt(added)}` : null, spent ? `−${fmt(spent)}` : null].filter(Boolean).join('   ')}
        </ThemedText>
        <ThemedText style={[styles.toggle, { color: theme.accent }]}>{mode === 'collapsed' ? 'Show' : 'Hide'}</ThemedText>
      </Pressable>

      {mode !== 'collapsed' && (
        <Card style={styles.list}>
          {visible.map((e, i) => (
            <EntryRow
              key={e.id}
              entry={e}
              onPress={() => onOpen(e)}
              last={i === visible.length - 1 && !hasFooterCell}
            />
          ))}

          {mode === 'preview' && rest.length > 0 && (
            <Pressable
              onPress={() => setMode('all')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cell, pressed && { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex} numberOfLines={1}>
                {rest.length} more · {summarize(rest, fmt)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.accent }}>
                Show All
              </ThemedText>
            </Pressable>
          )}

          {mode === 'all' && entries.length > PREVIEW && (
            <Pressable onPress={() => setMode('preview')} accessibilityRole="button" style={styles.cell}>
              <ThemedText type="small" style={[styles.flex, { color: theme.accent }]}>
                Show Less
              </ThemedText>
            </Pressable>
          )}
        </Card>
      )}

      {mode === 'collapsed' && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} hidden
        </ThemedText>
      )}
    </View>
  );
}

/** e.g. "3 payments −45 DT · 1 move" */
function summarize(entries: Entry[], fmt: (v: number) => string) {
  const payments = entries.filter((e) => e.kind === 'expense');
  const income = entries.filter((e) => e.kind === 'income');
  const moves = entries.filter((e) => e.kind === 'transfer');
  const parts = [];
  if (payments.length)
    parts.push(`${payments.length} payment${payments.length > 1 ? 's' : ''} −${fmt(payments.reduce((s, e) => s - e.amount_cents, 0))}`);
  if (income.length) parts.push(`${income.length} added +${fmt(income.reduce((s, e) => s + e.amount_cents, 0))}`);
  if (moves.length) parts.push(`${moves.length} move${moves.length > 1 ? 's' : ''}`);
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  day: { gap: 6 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, paddingHorizontal: Spacing.three },
  headerText: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  totals: { flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
  toggle: { fontSize: 13, lineHeight: 18 },
  list: { padding: 0 },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  footer: { paddingHorizontal: Spacing.three, fontSize: 13 },
});
