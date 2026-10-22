import { router, useLocalSearchParams } from 'expo-router';

import { EntryForm } from '@/components/entry-form';
import { Sheet } from '@/components/sheet';
import { today } from '@/lib/dates';
import { useFinance, type EntryType } from '@/providers/finance-provider';

const TYPES: EntryType[] = ['income', 'expense', 'transfer'];

export default function NewEntryScreen() {
  const params = useLocalSearchParams<{ type?: EntryType; category?: string; date?: string }>();
  const { saveEntry } = useFinance();
  const type = params.type && TYPES.includes(params.type) ? params.type : 'expense';
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date <= today() ? params.date : today();

  return (
    <Sheet title="New entry">
      <EntryForm
        initial={{ type, minor: 0, categoryId: params.category ?? null, pot: 'card', toPot: 'savings', note: '', date }}
        submitLabel="Save"
        onSubmit={async (draft) => {
          const err = await saveEntry(draft);
          if (!err) router.back();
          return err;
        }}
      />
    </Sheet>
  );
}
