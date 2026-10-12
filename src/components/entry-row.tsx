import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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

export function EntryRow({ entry, onPress }: { entry: Entry; onPress?: () => void }) {
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
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.bubble, { backgroundColor: present.color + '26', borderColor: present.color }]}>
        <ThemedText style={styles.icon}>{present.icon}</ThemedText>
      </View>
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {present.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {present.where}
          {entry.note ? ` · ${entry.note}` : ''}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={[styles.amount, { color: amountColor }]}>
        {sign}
        {formatMoney(amount, balances.currency)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.6 },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18, lineHeight: 22 },
  info: { flex: 1 },
  amount: { fontVariant: ['tabular-nums'] },
});
