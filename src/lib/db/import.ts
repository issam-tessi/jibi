import { db } from '@/lib/db';
import { cloud } from '@/lib/supabase';

// Copy order respects foreign keys. user_id is dropped: each local database belongs to one person.
const TABLES = ['accounts', 'categories', 'transactions', 'cig_packs', 'cig_smokes', 'gym_visits', 'prayer_logs', 'workouts', 'workout_sets'] as const;
const PAGE = 1000;

/** Replaces the open profile database's contents with everything the signed-in cloud user has. */
export async function importFromCloud() {
  if (!cloud) throw new Error('Cloud import is not configured.');
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const table of TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data: page, error } = await cloud.from(table).select('*').order('id').range(from, from + PAGE - 1);
      if (error) throw new Error(`Couldn't download ${table}: ${error.message}`);
      rows.push(...(page as Record<string, unknown>[]).map(({ user_id: _, ...r }) => r));
      if (!page || page.length < PAGE) break;
    }
    data[table] = rows;
  }

  // Start from an empty database (drops the default accounts/categories of a fresh profile).
  await db.exec(`
    UPDATE meta SET v = 1 WHERE k = 'replaying';
    DELETE FROM workout_sets; DELETE FROM workouts; DELETE FROM prayer_logs; DELETE FROM gym_visits;
    DELETE FROM cig_smokes; DELETE FROM cig_packs; DELETE FROM transactions; DELETE FROM categories;
    DELETE FROM accounts; DELETE FROM history;
    UPDATE meta SET v = 0 WHERE k = 'replaying';
  `);
  for (const table of TABLES) await db.importRows(table, data[table]);
  return Object.fromEntries(TABLES.map((t) => [t, data[t].length]));
}
