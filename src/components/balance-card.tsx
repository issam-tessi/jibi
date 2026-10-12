import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { POTS } from '@/lib/pots';
import { useFinance } from '@/providers/finance-provider';

/** Always-visible summary: spendable total (card + cash) and each pot. */
export function BalanceCard() {
  const theme = useTheme();
  const { balances, loading } = useFinance();
  const fmt = (minor: number) => (loading ? '—' : formatMoney(minor, balances.currency));
  const spendable = balances.card + balances.cash;

  return (
    <View style={[styles.card, { backgroundColor: theme.hero }]}>
      <View style={styles.totalRow}>
        <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
          Balance
        </ThemedText>
        <ThemedText
          style={[styles.amount, { color: theme.heroText }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`Balance ${fmt(spendable)}`}>
          {fmt(spendable)}
        </ThemedText>
      </View>
      <View style={styles.pots}>
        {POTS.map((p) => (
          <View
            key={p.value}
            style={[
              styles.pot,
              { backgroundColor: p.value === 'savings' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)' },
            ]}>
            <ThemedText type="small" style={{ color: theme.heroTextSecondary }} numberOfLines={1}>
              {p.icon} {p.label}
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={[styles.potAmount, { color: theme.heroText }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {fmt(balances[p.value])}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
    paddingHorizontal: Spacing.four - Spacing.one,
  },
  totalRow: { gap: Spacing.half },
  amount: { fontSize: 34, lineHeight: 40, fontWeight: 700, fontVariant: ['tabular-nums'] },
  pots: { flexDirection: 'row', gap: Spacing.two },
  pot: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Radius.medium,
  },
  potAmount: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
});
