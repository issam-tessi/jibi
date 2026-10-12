import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View, Alert } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { useEntryPresentation } from '@/components/entry-row';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import { useFinance } from '@/providers/finance-provider';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { activity, unsorted, categories, balances, categorize, deleteEntry } = useFinance();
  const entry = activity.find((e) => e.id === id) ?? unsorted.find((e) => e.id === id);
  const present = useEntryPresentation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entry) {
    return (
      <Sheet title="Entry">
        <ThemedText themeColor="textSecondary">This entry no longer exists.</ThemedText>
      </Sheet>
    );
  }

  const p = present(entry);

  async function pick(categoryId: string | null) {
    setBusy(true);
    const err = await categorize(entry!.id, categoryId);
    setBusy(false);
    if (err) setError(err);
    else router.back();
  }

  async function remove() {
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Delete this entry?')
        : await new Promise<boolean>((resolve) =>
            Alert.alert('Delete this entry?', 'Your balance will be updated.', [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    setBusy(true);
    const err = await deleteEntry(entry!);
    setBusy(false);
    if (err) setError(err);
    else router.back();
  }

  return (
    <Sheet title={entry.kind === 'expense' && !entry.category ? 'Sort payment' : 'Entry'}>
      <View style={styles.summary}>
        <ThemedText style={styles.icon}>{p.icon}</ThemedText>
        <ThemedText style={styles.amount}>
          {entry.amount_cents > 0 ? '+' : '−'}
          {formatCents(Math.abs(entry.amount_cents), balances.currency)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDay(entry.occurred_on)}
          {entry.note ? ` · ${entry.note}` : ''}
        </ThemedText>
      </View>

      {entry.kind === 'expense' && (
        <View style={styles.block}>
          <ThemedText type="smallBold">What was it for?</ThemedText>
          <CategoryPicker
            categories={categories}
            value={entry.category_id}
            onChange={(c) => !busy && pick(c)}
          />
        </View>
      )}

      {error && (
        <ThemedText type="small" style={{ color: theme.expense }}>
          {error}
        </ThemedText>
      )}
      <Button title="Delete entry" variant="danger" disabled={busy} onPress={remove} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  icon: { fontSize: 40, lineHeight: 48 },
  amount: { fontSize: 36, lineHeight: 44, fontWeight: 700, fontVariant: ['tabular-nums'] },
  block: { gap: Spacing.two },
});
