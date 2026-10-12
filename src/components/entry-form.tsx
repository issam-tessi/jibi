import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Input, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, shiftDay, today } from '@/lib/dates';
import { amountPlaceholder, formatMoney, minorDigits, parseAmount } from '@/lib/money';
import { useFinance, type EntryDraft, type EntryType } from '@/providers/finance-provider';

const TYPES: { value: EntryType; label: string }[] = [
  { value: 'income', label: 'Add money' },
  { value: 'expense', label: 'Payment' },
  { value: 'transfer', label: 'Savings' },
];

type Props = {
  initial: EntryDraft;
  /** Editing keeps the entry's type fixed. */
  lockType?: boolean;
  submitLabel: string;
  onSubmit: (draft: EntryDraft) => Promise<string | null>;
  /** Extra controls under the save button (e.g. delete). */
  footer?: ReactNode;
};

/** Amount, type, category, date and note for an entry; shared by "new" and "edit". */
export function EntryForm({ initial, lockType, submitLabel, onSubmit, footer }: Props) {
  const theme = useTheme();
  const { categories, balances } = useFinance();
  const currency = balances.currency;

  const [type, setType] = useState(initial.type);
  const [amount, setAmount] = useState(initial.minor ? toInput(initial.minor, currency) : '');
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [toSavings, setToSavings] = useState(initial.toSavings);
  const [note, setNote] = useState(initial.note);
  const [date, setDate] = useState(initial.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tint = type === 'income' ? theme.income : type === 'expense' ? theme.expense : theme.savings;
  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';

  async function submit() {
    const minor = parseAmount(amount, currency);
    if (!minor) return setError(`Enter an amount, e.g. ${amountPlaceholder(currency).replace('0,', '12,')}`);
    if (!lockType && type === 'transfer' && !toSavings && minor > balances.savings)
      return setError(`You only have ${formatMoney(balances.savings, currency)} in savings.`);

    setSaving(true);
    setError(null);
    const err = await onSubmit({ type, minor, categoryId, toSavings, note, date });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <>
      {!lockType && <Segmented options={TYPES} value={type} onChange={setType} />}

      <View style={styles.amountRow}>
        <ThemedText style={[styles.sign, { color: tint }]}>{sign}</ThemedText>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={amountPlaceholder(currency)}
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          autoFocus={!initial.minor}
          style={[styles.amountInput, { color: theme.text }]}
          accessibilityLabel="Amount"
        />
        <ThemedText style={styles.currency} themeColor="textSecondary">
          DT
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
            In savings: {formatMoney(balances.savings, currency)}
          </ThemedText>
        </View>
      )}

      {type === 'expense' && (
        <View style={styles.block}>
          <ThemedText type="smallBold">Category</ThemedText>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} allowLater />
        </View>
      )}

      <DateStepper value={date} onChange={setDate} />

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
      <Button title={saving ? 'Saving…' : submitLabel} disabled={saving} onPress={submit} />
      {footer}
    </>
  );
}

function DateStepper({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const theme = useTheme();
  const isToday = value >= today();
  return (
    <View style={[styles.dateRow, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={() => onChange(shiftDay(value, -1))}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        style={styles.dateArrow}>
        <ThemedText type="smallBold">‹</ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={styles.dateLabel}>
        📅 {formatDay(value)}
      </ThemedText>
      <Pressable
        onPress={() => onChange(shiftDay(value, 1))}
        disabled={isToday}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Next day"
        style={[styles.dateArrow, isToday && styles.disabled]}>
        <ThemedText type="smallBold">›</ThemedText>
      </Pressable>
    </View>
  );
}

/** Minor units -> editable text, e.g. 12500 millimes -> "12,5". */
function toInput(minor: number, currency: string) {
  const digits = minorDigits(currency);
  const whole = Math.floor(minor / 10 ** digits);
  const fraction = String(minor % 10 ** digits).padStart(digits, '0').replace(/0+$/, '');
  return fraction ? `${whole},${fraction}` : String(whole);
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.one,
  },
  dateArrow: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  dateLabel: { flex: 1, textAlign: 'center' },
  disabled: { opacity: 0.3 },
});
