import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { Button } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFinanceData } from '@/hooks/use-finance-data';
import { formatCents } from '@/lib/money';
import { supabase } from '@/lib/supabase';

export default function OverviewScreen() {
  const { accounts, transactions, error } = useFinanceData();
  const currency = accounts[0]?.currency ?? 'EUR';

  const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonth = transactions.filter((t) => t.occurred_on.startsWith(monthPrefix));
  const income = thisMonth.filter((t) => t.amount_cents > 0).reduce((s, t) => s + t.amount_cents, 0);
  const expenses = thisMonth.filter((t) => t.amount_cents < 0).reduce((s, t) => s + t.amount_cents, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">This month</ThemedText>
          {error && <ThemedText type="small">{error}</ThemedText>}

          <View style={styles.stats}>
            <Stat label="Income" value={formatCents(income, currency)} />
            <Stat label="Spent" value={formatCents(-expenses, currency)} />
            <Stat label="Net" value={formatCents(income + expenses, currency)} />
          </View>

          <ThemedText type="smallBold">Recent</ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            {transactions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No transactions yet. Add one from the Transactions tab.
              </ThemedText>
            ) : (
              transactions
                .slice(0, 5)
                .map((t) => <TransactionRow key={t.id} transaction={t} currency={currency} />)
            )}
          </ThemedView>

          {Platform.OS !== 'web' && (
            <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingTop: Platform.OS === 'web' ? Spacing.six + Spacing.four : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three },
});
