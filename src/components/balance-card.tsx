import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import { POTS } from '@/lib/pots';
import { useFinance } from '@/providers/finance-provider';

/** Apple Wallet-style card: spendable total up top, the three pots along the bottom. */
export function BalanceCard() {
  const { balances, loading } = useFinance();
  const fmt = (minor: number) => (loading ? '—' : formatMoney(minor, balances.currency));
  const spendable = balances.card + balances.cash;

  return (
    <View style={styles.card}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="wallet" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#2b2d42" />
            <Stop offset="0.55" stopColor="#1d1e2c" />
            <Stop offset="1" stopColor="#0d0e14" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#wallet)" />
      </Svg>

      <View style={styles.top}>
        <ThemedText style={styles.caption}>BALANCE</ThemedText>
        <ThemedText style={styles.amount} numberOfLines={1} adjustsFontSizeToFit accessibilityLabel={`Balance ${fmt(spendable)}`}>
          {fmt(spendable)}
        </ThemedText>
      </View>

      <View style={styles.pots}>
        {POTS.map((p, i) => (
          <View key={p.value} style={[styles.pot, i > 0 && styles.potDivider]}>
            <ThemedText style={styles.potLabel} numberOfLines={1}>
              {p.icon} {p.label}
            </ThemedText>
            <ThemedText style={styles.potAmount} numberOfLines={1} adjustsFontSizeToFit>
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
    borderRadius: Radius.card,
    overflow: 'hidden',
    paddingHorizontal: Spacing.four - 4,
    paddingTop: Spacing.three + 2,
    paddingBottom: Spacing.three,
    gap: Spacing.three + 2,
  },
  top: { gap: 2 },
  caption: { color: 'rgba(235,235,245,0.6)', fontSize: 12, lineHeight: 16, fontWeight: 600, letterSpacing: 0.6 },
  amount: {
    color: '#ffffff',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: 700,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  pots: { flexDirection: 'row' },
  pot: { flex: 1, gap: 2, paddingRight: Spacing.two },
  potDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.25)', paddingLeft: Spacing.three },
  potLabel: { color: 'rgba(235,235,245,0.6)', fontSize: 13, lineHeight: 18 },
  potAmount: { color: '#ffffff', fontSize: 16, lineHeight: 21, fontWeight: 600, fontVariant: ['tabular-nums'] },
});
