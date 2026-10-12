import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { useFinance } from '@/providers/finance-provider';

/** Always-visible summary of the main balance and savings. */
export function BalanceCard() {
  const theme = useTheme();
  const { balances, loading } = useFinance();
  const fmt = (cents: number) => (loading ? '—' : formatMoney(cents, balances.currency));

  return (
    <View style={[styles.card, { backgroundColor: theme.hero }]}>
      <View style={styles.main}>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
          Balance
        </ThemedText>
        <ThemedText
          style={[styles.amount, { color: theme.heroText }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`Balance ${fmt(balances.main)}`}>
          {fmt(balances.main)}
        </ThemedText>
      </View>
      <View style={[styles.savings, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
          🐷 Savings
        </ThemedText>
        <ThemedText
          type="smallBold"
          style={[styles.savingsAmount, { color: theme.heroText }]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {fmt(balances.savings)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.large,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  main: { flex: 1, gap: Spacing.half },
  amount: { fontSize: 34, lineHeight: 40, fontWeight: 700, fontVariant: ['tabular-nums'] },
  savings: {
    alignItems: 'flex-end',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    maxWidth: '45%',
  },
  savingsAmount: { fontSize: 18, lineHeight: 24 },
});
