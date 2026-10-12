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
 * One day of entries. Shows the first 3 plus a one-line summary of the rest;
 * tap the summary to see everything, tap the header to fold the day away.
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

  return (
    <View style={styles.day}>
      <Pressable
        onPress={() => setMode(mode === 'collapsed' ? 'preview' : 'collapsed')}
        accessibilityRole="button"
        accessibilityLabel={`${formatDay(date)}, ${entries.length} entries. ${mode === 'collapsed' ? 'Expand' : 'Collapse'}`}
        style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.chevron}>
          {mode === 'collapsed' ? '▸' : '▾'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.dayLabel}>
          {formatDay(date)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.totals}>
          {[added ? `+${fmt(added)}` : null, spent ? `−${fmt(spent)}` : null, `${entries.length}×`]
            .filter(Boolean)
            .join('  ')}
        </ThemedText>
      </Pressable>

      {mode !== 'collapsed' && (
        <Card style={styles.list}>
          {visible.map((e) => (
            <EntryRow key={e.id} entry={e} onPress={() => onOpen(e)} />
          ))}

          {mode === 'preview' && rest.length > 0 && (
            <Pressable
              onPress={() => setMode('all')}
              accessibilityRole="button"
              style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.summaryText} numberOfLines={1}>
                ＋{rest.length} more · {summarize(rest, fmt)}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Show
              </ThemedText>
            </Pressable>
          )}

          {mode === 'all' && entries.length > PREVIEW && (
            <Pressable onPress={() => setMode('preview')} accessibilityRole="button" style={styles.less}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Show less
              </ThemedText>
            </Pressable>
          )}
        </Card>
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
  day: { gap: Spacing.one },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.one, paddingVertical: Spacing.one },
  chevron: { width: 12 },
  dayLabel: { flex: 1 },
  totals: { fontVariant: ['tabular-nums'] },
  list: { paddingVertical: Spacing.two, gap: Spacing.one },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    marginTop: Spacing.one,
  },
  summaryText: { flex: 1 },
  less: { alignItems: 'center', paddingVertical: Spacing.two },
});
