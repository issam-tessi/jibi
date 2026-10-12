import { router, useLocalSearchParams } from 'expo-router';

import { EntryForm } from '@/components/entry-form';
import { Sheet } from '@/components/sheet';
import { today } from '@/lib/dates';
import { useFinance, type EntryType } from '@/providers/finance-provider';

const TYPES: EntryType[] = ['income', 'expense', 'transfer'];

export default function NewEntryScreen() {
  const params = useLocalSearchParams<{ type?: EntryType; category?: string }>();
  const { saveEntry } = useFinance();
  const type = params.type && TYPES.includes(params.type) ? params.type : 'expense';

  return (
    <Sheet title="New entry">
      <EntryForm
        initial={{ type, minor: 0, categoryId: params.category ?? null, pot: 'card', toPot: 'savings', note: '', date: today() }}
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
