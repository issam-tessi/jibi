import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TransactionRow } from '@/components/transaction-row';
import { Button, Input } from '@/components/ui';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFinanceData } from '@/hooks/use-finance-data';
import type { CategoryKind } from '@/lib/database.types';
import { parseAmountToCents } from '@/lib/money';
import { supabase } from '@/lib/supabase';

export default function TransactionsScreen() {
  const { accounts, categories, transactions, error, refresh } = useFinanceData();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const account = accounts[0];
  const currency = account?.currency ?? 'EUR';
  const visibleCategories = categories.filter((c) => c.kind === kind);

  async function addTransaction() {
    const cents = parseAmountToCents(amount);
    if (!cents) return setFormError('Enter a positive amount, e.g. 12.50');
    if (!account) return setFormError('No account found.');

    setSaving(true);
    setFormError(null);
    const { error } = await supabase.from('transactions').insert({
      account_id: account.id,
      category_id: categoryId,
      amount_cents: kind === 'expense' ? -cents : cents,
      note: note.trim() || null,
    });
    setSaving(false);

    if (error) return setFormError(error.message);
    setAmount('');
    setNote('');
    refresh();
  }

  async function deleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) setFormError(error.message);
    refresh();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Transactions</ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.chips}>
              {(['expense', 'income'] as const).map((k) => (
                <Chip
                  key={k}
                  label={k === 'expense' ? 'Expense' : 'Income'}
                  selected={kind === k}
                  onPress={() => {
                    setKind(k);
                    setCategoryId(null);
                  }}
                />
              ))}
            </View>

            <Input
              placeholder={`Amount (${currency})`}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.chips}>
              {visibleCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                />
              ))}
            </View>

            <Input placeholder="Note (optional)" value={note} onChangeText={setNote} maxLength={280} />

            {formError && <ThemedText type="small">{formError}</ThemedText>}
            <Button title="Add" disabled={saving} onPress={addTransaction} />
          </ThemedView>

          {error && <ThemedText type="small">{error}</ThemedText>}

          <ThemedView type="backgroundElement" style={styles.card}>
            {transactions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing here yet.
              </ThemedText>
            ) : (
              transactions.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  currency={currency}
                  onDelete={() => deleteTransaction(t.id)}
                />
              ))
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected }}>
      <ThemedView type={selected ? 'backgroundSelected' : 'background'} style={styles.chip}>
        <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
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
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.three },
});
