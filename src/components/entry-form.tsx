import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { CigPurchaseFields, type CigPurchase } from '@/components/cig-purchase';
import { ThemedText } from '@/components/themed-text';
import { Button, Input, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BRANDS, isCigaretteCategory } from '@/lib/cigarettes';
import { formatDay, shiftDay, today } from '@/lib/dates';
import { amountPlaceholder, formatMoney, minorDigits, parseAmount } from '@/lib/money';
import { POTS } from '@/lib/pots';
import { useCigarettes } from '@/providers/cigarette-provider';
import { useFinance, type EntryDraft, type EntryType, type Pot } from '@/providers/finance-provider';
import { MASKED, usePrivacy } from '@/providers/privacy-provider';

const TYPES: { value: EntryType; label: string }[] = [
  { value: 'income', label: 'Add money' },
  { value: 'expense', label: 'Payment' },
  { value: 'transfer', label: 'Move' },
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
  const { locked } = usePrivacy();
  const currency = balances.currency;

  const [type, setType] = useState(initial.type);
  const [amount, setAmount] = useState(initial.minor ? toInput(initial.minor, currency) : '');
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [pot, setPot] = useState(initial.pot);
  const [toPot, setToPot] = useState(initial.toPot);
  const [note, setNote] = useState(initial.note);
  const [date, setDate] = useState(initial.date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buying cigarettes: record which packs, so the Packs tab can count them.
  const { packs } = useCigarettes();
  const [cigs, setCigs] = useState<CigPurchase>({ brand: packs[0]?.brand ?? BRANDS[0].id, packs: 1, place: packs[0]?.place ?? '' });
  const [suggested, setSuggested] = useState<string | null>(null);
  const buyingCigs = !lockType && type === 'expense' && isCigaretteCategory(categories.find((c) => c.id === categoryId));
  function suggestAmount(minor: number) {
    // Only overwrite an empty amount or one we filled in ourselves.
    if (amount && amount !== suggested) return;
    const text = toInput(minor, currency);
    setAmount(text);
    setSuggested(text);
  }

  const tint = type === 'income' ? theme.income : type === 'expense' ? theme.expense : theme.savings;
  const sign = type === 'income' ? '+' : type === 'expense' ? '−' : '';

  async function submit() {
    const minor = parseAmount(amount, currency);
    if (!minor) return setError(`Enter an amount, e.g. ${amountPlaceholder(currency).replace('0,', '12,')}`);
    if (type === 'transfer' && pot === toPot) return setError('Pick two different places.');
    if (!lockType && type === 'transfer' && minor > balances[pot])
      return setError(locked ? 'Not enough money there.' : `You only have ${formatMoney(balances[pot], currency)} there.`);

    setSaving(true);
    setError(null);
    const err = await onSubmit({ type, minor, categoryId, pot, toPot, note, date, cigarettes: buyingCigs ? cigs : undefined });
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

      {type === 'transfer' ? (
        <>
          <PotPicker label="From" value={pot} onChange={setPot} />
          <PotPicker label="To" value={toPot} onChange={setToPot} disabled={pot} />
        </>
      ) : (
        <PotPicker
          label={type === 'income' ? 'Added to' : 'Paid with'}
          value={pot}
          onChange={setPot}
          only={['card', 'cash']}
        />
      )}

      {type === 'expense' && (
        <View style={styles.block}>
          <ThemedText type="smallBold">Category</ThemedText>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} allowLater />
        </View>
      )}

      {buyingCigs && (
        <CigPurchaseFields value={cigs} onChange={setCigs} currency={currency} onSuggestAmount={suggestAmount} />
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

/** Row of pot buttons (💳 Card / 💰 Cash / 🐷 Savings), each showing its balance. */
function PotPicker({
  label,
  value,
  onChange,
  only,
  disabled,
}: {
  label: string;
  value: Pot;
  onChange: (pot: Pot) => void;
  only?: Pot[];
  disabled?: Pot;
}) {
  const theme = useTheme();
  const { balances } = useFinance();
  const { locked } = usePrivacy();
  const pots = POTS.filter((p) => !only || only.includes(p.value));
  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.pots}>
        {pots.map((p) => {
          const selected = value === p.value;
          const off = disabled === p.value;
          const fg = selected ? theme.background : theme.text;
          return (
            <Pressable
              key={p.value}
              disabled={off}
              onPress={() => onChange(p.value)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: off }}
              style={[
                styles.pot,
                { backgroundColor: selected ? theme.text : theme.backgroundElement, opacity: off ? 0.35 : 1 },
              ]}>
              <ThemedText style={styles.potIcon}>{p.icon}</ThemedText>
              <ThemedText type="smallBold" style={{ color: fg }}>
                {p.label}
              </ThemedText>
              <ThemedText type="small" style={{ color: fg, opacity: 0.75 }} numberOfLines={1}>
                {locked ? `${MASKED} DT` : formatMoney(balances[p.value], balances.currency)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  pots: { flexDirection: 'row', gap: Spacing.two },
  pot: { flex: 1, alignItems: 'center', gap: Spacing.half, paddingVertical: Spacing.two, borderRadius: 16 },
  potIcon: { fontSize: 22, lineHeight: 28 },
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
