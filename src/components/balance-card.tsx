import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EyeIcon } from '@/components/eye-icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/lib/money';
import { POTS } from '@/lib/pots';
import { useFinance } from '@/providers/finance-provider';
import { MASKED, usePrivacy } from '@/providers/privacy-provider';

/** Always-visible summary: spendable total (card + cash) and each pot. Hidden behind Face ID when locked. */
export function BalanceCard() {
  const theme = useTheme();
  const { balances, loading } = useFinance();
  const { enabled, locked, unlock, lock } = usePrivacy();
  const [failed, setFailed] = useState(false);
  const fmt = (minor: number) =>
    locked ? `${MASKED} DT` : loading ? '—' : formatMoney(minor, balances.currency);
  const spendable = balances.card + balances.cash;

  async function tryUnlock() {
    setFailed(false);
    if (!(await unlock())) setFailed(true);
  }

  return (
    <Pressable
      onPress={locked ? tryUnlock : undefined}
      disabled={!locked}
      accessibilityRole={locked ? 'button' : undefined}
      accessibilityLabel={locked ? 'Balances hidden. Unlock with Face ID' : undefined}
      style={[styles.card, { backgroundColor: theme.hero }]}>
      <View style={styles.totalRow}>
        <View style={styles.flex}>
          <ThemedText style={[styles.label, { color: theme.heroTextSecondary }]}>Balance</ThemedText>
          <ThemedText
            style={[styles.amount, { color: theme.heroText }, locked && styles.masked]}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={locked ? 'Balance hidden' : `Balance ${fmt(spendable)}`}>
            {fmt(spendable)}
          </ThemedText>
        </View>
        {enabled && (
          <Pressable
            onPress={locked ? tryUnlock : lock}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={locked ? 'Show balances with Face ID' : 'Hide balances'}
            style={styles.lockButton}>
            <EyeIcon closed={locked} color={theme.heroText} size={18} />
          </Pressable>
        )}
      </View>

      <View style={styles.pots}>
        {POTS.map((p) => (
          <View
            key={p.value}
            accessible
            accessibilityLabel={`${p.label}: ${locked ? 'hidden' : fmt(balances[p.value])}`}
            style={[
              styles.pot,
              { backgroundColor: p.value === 'savings' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)' },
            ]}>
            <ThemedText style={styles.potIcon}>{p.icon}</ThemedText>
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

      {locked && (
        <ThemedText style={[styles.hint, { color: theme.heroTextSecondary }]}>
          {failed
            ? 'Face ID didn’t work — tap to try again, or sign out and back in with your password to reset the lock'
            : 'Tap to show with Face ID'}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderRadius: Radius.large,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  flex: { flex: 1 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
  amount: { fontSize: 26, lineHeight: 32, fontWeight: 700, fontVariant: ['tabular-nums'] },
  masked: { letterSpacing: 2 },
  lockButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pots: { flexDirection: 'row', gap: Spacing.two - Spacing.half },
  pot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  potIcon: { fontSize: 13, lineHeight: 18 },
  potAmount: { flex: 1, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
