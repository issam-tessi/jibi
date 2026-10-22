// On-device SQLite schema (one database file per person). Mirrors the old Supabase tables minus user_id.
// Bump SCHEMA_VERSION and append to MIGRATIONS to change it; never edit a shipped migration.

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";
const ID = "(lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))))";

const TX_SNAPSHOT = (r: 'NEW' | 'OLD') =>
  `json_object('id', ${r}.id, 'account_id', ${r}.account_id, 'category_id', ${r}.category_id, 'kind', ${r}.kind,
    'transfer_id', ${r}.transfer_id, 'amount_cents', ${r}.amount_cents, 'occurred_on', ${r}.occurred_on,
    'note', ${r}.note, 'created_at', ${r}.created_at)`;
const CAT_SNAPSHOT = (r: 'NEW' | 'OLD') =>
  `json_object('id', ${r}.id, 'name', ${r}.name, 'icon', ${r}.icon, 'color_slot', ${r}.color_slot, 'created_at', ${r}.created_at)`;

/** Action-history triggers: every change to transactions/categories is logged under the current group. */
function historyTriggers(table: 'transactions' | 'categories', snapshot: (r: 'NEW' | 'OLD') => string) {
  const group = "(SELECT v FROM meta WHERE k = 'group')";
  const live = "(SELECT v FROM meta WHERE k = 'replaying') = 0";
  // A fresh action makes older undone actions un-redoable (normal undo-stack behaviour).
  const prune = `DELETE FROM history WHERE undone = 1 AND group_id <> ${group};`;
  const log = (op: string, oldRow: string, newRow: string, id: string) =>
    `INSERT INTO history (group_id, op, table_name, row_id, old_row, new_row) VALUES (${group}, '${op}', '${table}', ${id}, ${oldRow}, ${newRow});`;
  return `
    CREATE TRIGGER ${table}_log_insert AFTER INSERT ON ${table} WHEN ${live} BEGIN
      ${prune} ${log('insert', 'NULL', snapshot('NEW'), 'NEW.id')}
    END;
    CREATE TRIGGER ${table}_log_update AFTER UPDATE ON ${table} WHEN ${live} BEGIN
      ${prune} ${log('update', snapshot('OLD'), snapshot('NEW'), 'NEW.id')}
    END;
    CREATE TRIGGER ${table}_log_delete AFTER DELETE ON ${table} WHEN ${live} BEGIN
      ${prune} ${log('delete', snapshot('OLD'), 'NULL', 'OLD.id')}
    END;`;
}

const V1 = `
  CREATE TABLE meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL);
  INSERT INTO meta (k, v) VALUES ('group', 0), ('replaying', 0);

  CREATE TABLE accounts (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    currency TEXT NOT NULL DEFAULT 'TND',
    kind TEXT NOT NULL UNIQUE CHECK (kind IN ('card', 'cash', 'savings')),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE categories (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    icon TEXT NOT NULL DEFAULT '🏷️',
    color_slot INTEGER CHECK (color_slot BETWEEN 1 AND 8),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE UNIQUE INDEX categories_name_idx ON categories (lower(name));

  -- Signed integer minor units (millimes for TND): positive = money in, negative = money out.
  CREATE TABLE transactions (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories (id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    transfer_id TEXT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
    occurred_on TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    note TEXT CHECK (length(note) <= 280),
    created_at TEXT NOT NULL DEFAULT ${NOW},
    CHECK (
      (kind = 'income' AND amount_cents > 0 AND category_id IS NULL AND transfer_id IS NULL)
      OR (kind = 'expense' AND amount_cents < 0 AND transfer_id IS NULL)
      OR (kind = 'transfer' AND category_id IS NULL AND transfer_id IS NOT NULL)
    )
  );
  CREATE INDEX transactions_date_idx ON transactions (occurred_on DESC);
  CREATE INDEX transactions_transfer_idx ON transactions (transfer_id);
  CREATE INDEX transactions_category_idx ON transactions (category_id);

  CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    at TEXT NOT NULL DEFAULT ${NOW},
    op TEXT NOT NULL CHECK (op IN ('insert', 'update', 'delete')),
    table_name TEXT NOT NULL CHECK (table_name IN ('transactions', 'categories')),
    row_id TEXT NOT NULL,
    old_row TEXT,
    new_row TEXT,
    undone INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX history_group_idx ON history (group_id DESC);
  ${historyTriggers('transactions', TX_SNAPSHOT)}
  ${historyTriggers('categories', CAT_SNAPSHOT)}

  CREATE VIEW account_balances AS
    SELECT a.id, a.kind, a.name, a.currency, coalesce(sum(t.amount_cents), 0) AS balance_cents
    FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id;

  -- One row per logical entry; transfers appear once (their outgoing leg) with from/to pots.
  CREATE VIEW entries AS
    SELECT t.id, t.kind, t.amount_cents, t.category_id, t.transfer_id, t.note, t.occurred_on, t.created_at,
      a.kind AS account_kind, ta.kind AS to_account_kind
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN transactions t2 ON t2.transfer_id = t.transfer_id AND t2.id <> t.id
    LEFT JOIN accounts ta ON ta.id = t2.account_id
    WHERE t.kind <> 'transfer' OR t.amount_cents < 0;

  CREATE TABLE cig_packs (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    transaction_id TEXT REFERENCES transactions (id) ON DELETE CASCADE,
    brand TEXT NOT NULL CHECK (length(brand) BETWEEN 1 AND 40),
    packs INTEGER NOT NULL DEFAULT 1 CHECK (packs BETWEEN 1 AND 50),
    cigarettes INTEGER NOT NULL DEFAULT 20 CHECK (cigarettes BETWEEN 1 AND 1000),
    price_cents INTEGER CHECK (price_cents > 0),
    place TEXT CHECK (length(place) <= 80),
    bought_on TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE cig_smokes (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    brand TEXT NOT NULL CHECK (length(brand) BETWEEN 1 AND 40),
    note TEXT CHECK (length(note) <= 280),
    smoked_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX cig_smokes_at_idx ON cig_smokes (smoked_at DESC);
  CREATE VIEW cig_stock AS
    SELECT brand, sum(bought) AS bought, sum(smoked) AS smoked, sum(bought) - sum(smoked) AS left_count
    FROM (SELECT brand, cigarettes AS bought, 0 AS smoked FROM cig_packs UNION ALL SELECT brand, 0, 1 FROM cig_smokes)
    GROUP BY brand;

  CREATE TABLE gym_visits (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    visited_at TEXT NOT NULL DEFAULT ${NOW},
    workout TEXT CHECK (length(workout) <= 40),
    note TEXT CHECK (length(note) <= 280),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX gym_visits_at_idx ON gym_visits (visited_at DESC);

  CREATE TABLE prayer_logs (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    day TEXT NOT NULL,
    prayer TEXT NOT NULL CHECK (prayer IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
    status TEXT NOT NULL CHECK (status IN ('jamaah', 'ontime', 'late', 'missed')),
    logged_at TEXT NOT NULL DEFAULT ${NOW},
    UNIQUE (day, prayer)
  );

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    performed_at TEXT NOT NULL DEFAULT ${NOW},
    name TEXT CHECK (length(name) <= 40),
    note TEXT CHECK (length(note) <= 280),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY DEFAULT ${ID},
    workout_id TEXT NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
    exercise TEXT NOT NULL CHECK (length(exercise) BETWEEN 1 AND 60),
    position INTEGER NOT NULL DEFAULT 0,
    weight_kg REAL CHECK (weight_kg >= 0),
    reps INTEGER NOT NULL CHECK (reps BETWEEN 1 AND 1000)
  );
  CREATE INDEX workout_sets_workout_idx ON workout_sets (workout_id, position);
`;

export const MIGRATIONS = [V1];
export const SCHEMA_VERSION = MIGRATIONS.length;

/** Starting point for a brand-new profile (same as the old Supabase sign-up trigger). */
export const SEED = `
  INSERT INTO accounts (name, kind) VALUES ('Card', 'card'), ('Cash', 'cash'), ('Savings', 'savings');
  INSERT INTO categories (name, icon, color_slot) VALUES
    ('Housing', '🏠', 1), ('Groceries', '🛒', 2), ('Transport', '🚌', 3), ('Eating out', '🍔', 4),
    ('Health', '💊', 5), ('Leisure', '🎮', 6), ('Other', '📦', 7);
`;

/** Columns stored as JSON text / 0-1 integers, converted when read. */
export const JSON_COLUMNS: Record<string, string[]> = { history: ['old_row', 'new_row'] };
export const BOOLEAN_COLUMNS: Record<string, string[]> = { history: ['undone'] };
