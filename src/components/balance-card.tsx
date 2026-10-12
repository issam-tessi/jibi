import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
          <ThemedText type="small" style={{ color: theme.heroTextSecondary }}>
            Balance
          </ThemedText>
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
            accessibilityLabel={locked ? 'Unlock with Face ID' : 'Hide balances'}
            style={styles.lockButton}>
            <ThemedText style={styles.lockIcon}>{locked ? '🔒' : '🔓'}</ThemedText>
          </Pressable>
        )}
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

      {locked && (
        <ThemedText type="small" style={[styles.hint, { color: theme.heroTextSecondary }]}>
          {failed
            ? 'Face ID didn’t work — tap to try again, or sign out and back in with your password to reset the lock'
            : 'Tap to unlock with Face ID'}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
    paddingHorizontal: Spacing.four - Spacing.one,
  },
  flex: { flex: 1, gap: Spacing.half },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amount: { fontSize: 34, lineHeight: 40, fontWeight: 700, fontVariant: ['tabular-nums'] },
  masked: { letterSpacing: 2 },
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lockIcon: { fontSize: 18, lineHeight: 22 },
  pots: { flexDirection: 'row', gap: Spacing.two },
  pot: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Radius.medium,
  },
  potAmount: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  hint: { textAlign: 'center', marginTop: -Spacing.one },
});
