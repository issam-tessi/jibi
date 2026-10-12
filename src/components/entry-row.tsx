import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { potIcon, potLabel, transferIcon, transferTitle } from '@/lib/pots';
import { useFinance, type Entry } from '@/providers/finance-provider';

/** How an entry is presented: icon, title, which pot(s) it touched, and its accent color. */
export function useEntryPresentation() {
  const theme = useTheme();
  const categoryColor = useCategoryColor();

  return (entry: Entry) => {
    const from = entry.account_kind;
    if (entry.kind === 'income')
      return { icon: '➕', title: 'Money added', where: `to ${potIcon(from)} ${potLabel(from)}`, color: theme.income };
    if (entry.kind === 'transfer') {
      const to = entry.to_account_kind;
      return {
        icon: transferIcon(from, to),
        title: transferTitle(from, to),
        where: `${potIcon(from)} ${potLabel(from)} → ${potIcon(to)} ${potLabel(to)}`,
        color: theme.savings,
      };
    }
    const where = `${potIcon(from)} ${potLabel(from)}`;
    if (!entry.category) return { icon: '❔', title: 'Payment · to sort', where, color: theme.unsorted };
    return {
      icon: entry.category.icon,
      title: entry.category.name,
      where,
      color: categoryColor(entry.category.color_slot),
    };
  };
}

export function EntryRow({ entry, onPress, last }: { entry: Entry; onPress?: () => void; last?: boolean }) {
  const theme = useTheme();
  const { balances } = useFinance();
  const present = useEntryPresentation()(entry);
  const amount = Math.abs(entry.amount_cents);
  const sign = entry.kind === 'income' ? '+' : entry.kind === 'expense' ? '−' : '';
  const amountColor = entry.kind === 'income' ? theme.income : entry.kind === 'transfer' ? theme.textSecondary : theme.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.icon, { backgroundColor: present.color }]}>
        <ThemedText style={styles.iconText}>{present.icon}</ThemedText>
      </View>
      <View style={[styles.body, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={styles.info}>
          <ThemedText numberOfLines={1}>{present.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.detail} numberOfLines={1}>
            {present.where}
            {entry.note ? ` · ${entry.note}` : ''}
          </ThemedText>
        </View>
        <ThemedText style={[styles.amount, { color: amountColor }]}>
          {sign}
          {formatMoney(amount, balances.currency)}
        </ThemedText>
        {onPress && (
          <ThemedText themeColor="textMuted" style={styles.chevron}>
            ›
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

// iOS list cell: 30pt rounded-square icon, 17pt title, 13pt detail, inset hairline divider.
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, gap: 14 },
  icon: { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 16, lineHeight: 20 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingRight: 14, minHeight: 58 },
  info: { flex: 1 },
  detail: { fontSize: 13, lineHeight: 18 },
  amount: { fontVariant: ['tabular-nums'] },
  chevron: { fontSize: 20, lineHeight: 22, marginLeft: 2 },
});
