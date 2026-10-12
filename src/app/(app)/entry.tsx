import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Input, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { today, yesterday } from '@/lib/dates';
import { formatCents, parseAmountToCents } from '@/lib/money';
import { useFinance } from '@/providers/finance-provider';

type EntryType = 'income' | 'expense' | 'transfer';

const TYPES: { value: EntryType; label: string }[] = [
  { value: 'income', label: 'Add money' },
  { value: 'expense', label: 'Payment' },
  { value: 'transfer', label: 'Savings' },
];

export default function NewEntryScreen() {
  const params = useLocalSearchParams<{ type?: EntryType }>();
  const theme = useTheme();
  const { categories, balances, addIncome, addPayment, moveMoney } = useFinance();

  const [type, setType] = useState<EntryType>(
    TYPES.some((t) => t.value === params.type) ? params.type! : 'expense'
  );
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [toSavings, setToSavings] = useState(true);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tint = type === 'income' ? theme.income : type === 'expense' ? theme.expense : theme.savings;
  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';

  async function save() {
    const cents = parseAmountToCents(amount);
    if (!cents) return setError('Enter an amount, e.g. 12.50');
    if (type === 'transfer' && !toSavings && cents > balances.savings)
      return setError(`You only have ${formatCents(balances.savings, balances.currency)} in savings.`);

    setSaving(true);
    setError(null);
    const err =
      type === 'income'
        ? await addIncome(cents, note, date)
        : type === 'expense'
          ? await addPayment(cents, categoryId, note, date)
          : await moveMoney(cents, toSavings, note);
    setSaving(false);

    if (err) setError(err);
    else router.back();
  }

  return (
    <Sheet title="New entry">
      <Segmented options={TYPES} value={type} onChange={setType} />

      <View style={styles.amountRow}>
        <ThemedText style={[styles.sign, { color: tint }]}>{sign}</ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          autoFocus
          style={[styles.amountInput, { color: theme.text }]}
          accessibilityLabel="Amount"
        />
        <ThemedText style={styles.currency} themeColor="textSecondary">
          {balances.currency}
        </ThemedText>
      </View>

      {type === 'transfer' && (
        <View style={styles.block}>
          <Segmented
            options={[
              { value: 'in', label: 'Balance → Savings' },
              { value: 'out', label: 'Savings → Balance' },
            ]}
            value={toSavings ? 'in' : 'out'}
            onChange={(v) => setToSavings(v === 'in')}
          />
          <ThemedText type="small" themeColor="textSecondary">
            In savings: {formatCents(balances.savings, balances.currency)}
          </ThemedText>
        </View>
      )}

      {type === 'expense' && (
        <View style={styles.block}>
          <ThemedText type="smallBold">Category</ThemedText>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} allowLater />
        </View>
      )}

      {type !== 'transfer' && (
        <View style={styles.dates}>
          <Chip label="Today" selected={date === today()} onPress={() => setDate(today())} />
          <Chip label="Yesterday" selected={date === yesterday()} onPress={() => setDate(yesterday())} />
        </View>
      )}

      <Input
        placeholder={type === 'expense' ? 'What was it? (optional)' : 'Note (optional)'}
        value={note}
        onChangeText={setNote}
        maxLength={280}
      />

      {error && (
        <ThemedText type="small" style={{ color: theme.expense }}>
          {error}
        </ThemedText>
      )}
      <Button title={saving ? 'Saving…' : 'Save'} disabled={saving} onPress={save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  sign: { fontSize: 40, lineHeight: 48, fontWeight: 700 },
  amountInput: {
    fontSize: 48,
    fontWeight: 700,
    minWidth: 120,
    maxWidth: 260,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  currency: { fontSize: 18 },
  block: { gap: Spacing.two },
  dates: { flexDirection: 'row', gap: Spacing.two },
});
