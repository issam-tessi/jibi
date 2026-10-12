import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { EntryForm } from '@/components/entry-form';
import { useEntryPresentation } from '@/components/entry-row';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useFinance, type Entry } from '@/providers/finance-provider';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activity, unsorted } = useFinance();
  const entry = activity.find((e) => e.id === id) ?? unsorted.find((e) => e.id === id);

  if (!entry) {
    return (
      <Sheet title="Entry">
        <ThemedText themeColor="textSecondary">This entry no longer exists.</ThemedText>
      </Sheet>
    );
  }

  // Unsorted payments open in a quick "pick a category" view; everything else opens the full editor.
  return entry.kind === 'expense' && !entry.category ? <QuickSort entry={entry} /> : <FullEdit entry={entry} />;
}

function QuickSort({ entry }: { entry: Entry }) {
  const { categories, balances, categorize } = useFinance();
  const present = useEntryPresentation()(entry);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) return <FullEdit entry={entry} />;

  return (
    <Sheet title="Sort payment">
      <View style={styles.summary}>
        <ThemedText style={styles.icon}>{present.icon}</ThemedText>
        <ThemedText style={styles.amount}>−{formatMoney(-entry.amount_cents, balances.currency)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDay(entry.occurred_on)}
          {entry.note ? ` · ${entry.note}` : ''}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">What was it for?</ThemedText>
      <CategoryPicker
        categories={categories}
        value={null}
        onChange={async (categoryId) => {
          const err = await categorize(entry.id, categoryId);
          if (err) setError(err);
          else router.back();
        }}
      />
      {error && <ThemedText type="small">{error}</ThemedText>}
      <Button title="Edit amount, date or note" variant="secondary" onPress={() => setEditing(true)} />
    </Sheet>
  );
}

function FullEdit({ entry }: { entry: Entry }) {
  const { saveEntry, deleteEntry } = useFinance();
  const title = entry.kind === 'income' ? 'Edit money added' : entry.kind === 'expense' ? 'Edit payment' : 'Edit savings move';

  async function remove() {
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Delete this entry? Your balance will be updated.')
        : await new Promise<boolean>((resolve) =>
            Alert.alert('Delete this entry?', 'Your balance will be updated.', [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ])
          );
    if (!confirmed) return;
    const err = await deleteEntry(entry);
    if (err) Alert.alert('Could not delete', err);
    else router.back();
  }

  return (
    <Sheet title={title}>
      <EntryForm
        lockType
        initial={{
          type: entry.kind,
          minor: Math.abs(entry.amount_cents),
          categoryId: entry.category_id,
          // Activity shows the main-account leg: negative there means money went into savings.
          toSavings: entry.amount_cents < 0,
          note: entry.note ?? '',
          date: entry.occurred_on,
        }}
        submitLabel="Save changes"
        onSubmit={async (draft) => {
          const err = await saveEntry(draft, entry);
          if (!err) router.back();
          return err;
        }}
        footer={<Button title="Delete entry" variant="danger" onPress={remove} />}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  icon: { fontSize: 40, lineHeight: 48 },
  amount: { fontSize: 36, lineHeight: 44, fontWeight: 700, fontVariant: ['tabular-nums'] },
});
