import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCategoryColor, useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { useFinance, type Entry } from '@/providers/finance-provider';

/** How an entry is presented: icon, title, and the color of its icon bubble. */
export function useEntryPresentation() {
  const theme = useTheme();
  const categoryColor = useCategoryColor();

  return (entry: Entry) => {
    if (entry.kind === 'income') return { icon: '💰', title: 'Money added', color: theme.income };
    if (entry.kind === 'transfer') {
      const toSavings = entry.amount_cents < 0;
      return {
        icon: '🐷',
        title: toSavings ? 'Moved to savings' : 'Taken from savings',
        color: theme.savings,
      };
    }
    if (!entry.category) return { icon: '❔', title: 'Payment · to sort', color: theme.unsorted };
    return {
      icon: entry.category.icon,
      title: entry.category.name,
      color: categoryColor(entry.category.color_slot),
    };
  };
}

export function EntryRow({ entry, onPress }: { entry: Entry; onPress?: () => void }) {
  const theme = useTheme();
  const { balances } = useFinance();
  const present = useEntryPresentation()(entry);
  const positive = entry.amount_cents > 0;
  const amountColor = entry.kind === 'transfer' ? theme.textSecondary : positive ? theme.income : theme.text;

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
        {entry.note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {entry.note}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="smallBold" style={[styles.amount, { color: amountColor }]}>
        {positive ? '+' : '−'}
        {formatMoney(Math.abs(entry.amount_cents), balances.currency)}
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
