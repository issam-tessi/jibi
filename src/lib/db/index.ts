// On-device SQLite data layer with a small, Supabase-shaped query API (`db.from(...).select()...`),
// so screens read the same as before. One database file per profile; see ./schema.ts.

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Database } from '@/lib/database.types';
import { BOOLEAN_COLUMNS, JSON_COLUMNS, MIGRATIONS, SCHEMA_VERSION, SEED } from '@/lib/db/schema';

type Public = Database['public'];
type TableName = keyof Public['Tables'] | keyof Public['Views'];
type RowOf<T extends TableName> = T extends keyof Public['Tables']
  ? Public['Tables'][T]['Row']
  : T extends keyof Public['Views']
    ? Public['Views'][T]['Row']
    : never;
type Primitive = string | number | boolean | null;
type DbError = { message: string };
export type DbResult<T> = { data: T | null; error: DbError | null };

let current: SQLiteDatabase | null = null;

/** Opens (creating and migrating if needed) the database for a profile and makes it the active one. */
export async function openProfileDatabase(username: string) {
  const database = await openDatabaseAsync(`jibi-${username}.db`);
  await database.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  for (let v = version; v < SCHEMA_VERSION; v++) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(MIGRATIONS[v]);
      if (v === 0) await database.execAsync(SEED);
      await database.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  current = database;
  return database;
}

export function closeProfileDatabase() {
  current?.closeAsync().catch(() => {});
  current = null;
}

function active() {
  if (!current) throw new Error('No profile database is open.');
  return current;
}

// Writes run one at a time: each is its own SQLite transaction and its own undo/redo group.
let queue: Promise<unknown> = Promise.resolve();
function write<T>(task: (database: SQLiteDatabase) => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const database = active();
    let result!: T;
    await database.withTransactionAsync(async () => {
      await database.runAsync("UPDATE meta SET v = v + 1 WHERE k = 'group'");
      result = await task(database);
    });
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

const toError = (e: unknown): DbError => ({ message: e instanceof Error ? e.message : String(e) });

function decode(table: string, row: Record<string, unknown>) {
  for (const c of JSON_COLUMNS[table] ?? []) if (typeof row[c] === 'string') row[c] = JSON.parse(row[c] as string);
  for (const c of BOOLEAN_COLUMNS[table] ?? []) if (c in row) row[c] = !!row[c];
  return row;
}

const encode = (v: unknown): Primitive => (typeof v === 'boolean' ? (v ? 1 : 0) : (v as Primitive) ?? null);
const ident = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`Bad identifier: ${name}`);
  return `"${name}"`;
};

/** Parses "*, sets:workout_sets(*)" / "kind, account:accounts(kind)" into base columns and embeds. */
function parseColumns(columns: string) {
  const embeds: { alias: string; table: string; columns: string }[] = [];
  const base: string[] = [];
  for (const part of columns.split(/,(?![^(]*\))/).map((p) => p.trim()).filter(Boolean)) {
    const m = part.match(/^(\w+):(\w+)\(([^)]*)\)$/);
    if (m) embeds.push({ alias: m[1], table: m[2], columns: m[3] || '*' });
    else base.push(part === '*' ? '*' : ident(part));
  }
  return { base: base.length ? base : ['*'], embeds };
}

const singular = (t: string) => t.replace(/s$/, '');

type Filter = { sql: string; params: Primitive[] };

class Query<T extends TableName, R> implements PromiseLike<DbResult<R>> {
  private filters: Filter[] = [];
  private orders: string[] = [];
  private max: number | null = null;
  private one = false;
  private returning: string | null = null;

  constructor(
    private table: T,
    private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
    private payload: Record<string, unknown>[] = [],
    private columns = '*',
    private conflict: string[] = []
  ) {}

  eq(column: string, value: Primitive) {
    this.filters.push({ sql: `${ident(column)} = ?`, params: [encode(value)] });
    return this;
  }
  is(column: string, value: null) {
    this.filters.push({ sql: `${ident(column)} IS ${value === null ? 'NULL' : 'NOT NULL'}`, params: [] });
    return this;
  }
  gte(column: string, value: Primitive) {
    this.filters.push({ sql: `${ident(column)} >= ?`, params: [encode(value)] });
    return this;
  }
  lt(column: string, value: Primitive) {
    this.filters.push({ sql: `${ident(column)} < ?`, params: [encode(value)] });
    return this;
  }
  order(column: string, opts: { ascending?: boolean } = {}) {
    this.orders.push(`${ident(column)} ${opts.ascending === false ? 'DESC' : 'ASC'}`);
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  /** After insert/update/upsert: return the written rows. */
  select(columns = '*') {
    this.returning = columns;
    return this as unknown as Query<T, RowOf<T>[]>;
  }
  single() {
    this.one = true;
    return this as unknown as Query<T, RowOf<T>>;
  }

  private where() {
    if (!this.filters.length) return { sql: '', params: [] as Primitive[] };
    return { sql: ` WHERE ${this.filters.map((f) => f.sql).join(' AND ')}`, params: this.filters.flatMap((f) => f.params) };
  }

  private async run(): Promise<unknown> {
    const table = ident(this.table);
    const where = this.where();

    if (this.mode === 'select') {
      const { base, embeds } = parseColumns(this.columns);
      let sql = `SELECT ${base.join(', ')} FROM ${table}${where.sql}`;
      if (this.orders.length) sql += ` ORDER BY ${this.orders.join(', ')}`;
      if (this.max !== null) sql += ` LIMIT ${Math.floor(this.max)}`;
      const rows = (await active().getAllAsync<Record<string, unknown>>(sql, where.params)).map((r) => decode(this.table, r));
      for (const e of embeds) await embed(this.table, rows, e);
      return this.one ? (rows[0] ?? null) : rows;
    }

    return write(async (database) => {
      const returning = this.returning ? ' RETURNING *' : '';
      const out: Record<string, unknown>[] = [];
      if (this.mode === 'insert' || this.mode === 'upsert') {
        for (const row of this.payload) {
          const cols = Object.keys(row);
          let sql = `INSERT INTO ${table} (${cols.map(ident).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
          if (this.mode === 'upsert') {
            const target = this.conflict.length ? this.conflict : ['id'];
            const set = cols.filter((c) => !target.includes(c)).map((c) => `${ident(c)} = excluded.${ident(c)}`);
            sql += ` ON CONFLICT (${target.map(ident).join(', ')}) DO ${set.length ? `UPDATE SET ${set.join(', ')}` : 'NOTHING'}`;
          }
          out.push(...(await database.getAllAsync<Record<string, unknown>>(sql + returning, cols.map((c) => encode(row[c])))));
        }
      } else if (this.mode === 'update') {
        const row = this.payload[0];
        const cols = Object.keys(row);
        const sql = `UPDATE ${table} SET ${cols.map((c) => `${ident(c)} = ?`).join(', ')}${where.sql}${returning}`;
        out.push(...(await database.getAllAsync<Record<string, unknown>>(sql, [...cols.map((c) => encode(row[c])), ...where.params])));
      } else {
        await database.runAsync(`DELETE FROM ${table}${where.sql}`, where.params);
      }
      const rows = out.map((r) => decode(this.table, r));
      if (!this.returning) return null;
      return this.one ? (rows[0] ?? null) : rows;
    });
  }

  then<A = DbResult<R>, B = never>(
    onfulfilled?: ((value: DbResult<R>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null
  ): PromiseLike<A | B> {
    return this.run()
      .then((data) => ({ data: data as R, error: null }), (e) => ({ data: null, error: toError(e) }))
      .then(onfulfilled, onrejected);
  }
}

/** Attaches a related table: to-one when the row has `<table>_id`, else to-many via `<base>_id` on the child. */
async function embed(baseTable: string, rows: Record<string, unknown>[], e: { alias: string; table: string; columns: string }) {
  if (!rows.length) return;
  const fk = `${singular(e.table)}_id`;
  const cols = e.columns === '*' ? '*' : e.columns.split(',').map((c) => ident(c.trim())).join(', ');
  if (fk in rows[0]) {
    const ids = [...new Set(rows.map((r) => r[fk]).filter((v) => v != null))] as Primitive[];
    const related = ids.length
      ? await active().getAllAsync<Record<string, unknown>>(`SELECT id AS __id, ${cols} FROM ${ident(e.table)} WHERE id IN (${ids.map(() => '?').join(', ')})`, ids)
      : [];
    const byId = new Map(related.map(({ __id, ...r }) => [__id, decode(e.table, r)]));
    for (const r of rows) r[e.alias] = byId.get(r[fk]) ?? null;
  } else {
    const back = `${singular(baseTable)}_id`;
    const ids = rows.map((r) => r.id as Primitive);
    const related = await active().getAllAsync<Record<string, unknown>>(
      `SELECT ${cols === '*' ? '*' : `${ident(back)}, ${cols}`} FROM ${ident(e.table)} WHERE ${ident(back)} IN (${ids.map(() => '?').join(', ')})`,
      ids
    );
    for (const r of rows) r[e.alias] = related.filter((x) => x[back] === r.id).map((x) => decode(e.table, x));
  }
}

// RPCs (formerly Postgres functions) -------------------------------------------------------------

async function potId(database: SQLiteDatabase, pot: string) {
  const row = await database.getFirstAsync<{ id: string }>('SELECT id FROM accounts WHERE kind = ?', [pot]);
  if (!row) throw new Error('Unknown pot');
  return row.id;
}

type Snapshot = Record<string, Primitive>;
const SNAPSHOT_COLUMNS = {
  transactions: ['id', 'account_id', 'category_id', 'kind', 'transfer_id', 'amount_cents', 'occurred_on', 'note', 'created_at'],
  categories: ['id', 'name', 'icon', 'color_slot', 'created_at'],
} as const;

/** Writes one snapshot back (insert or overwrite). */
async function put(database: SQLiteDatabase, table: 'transactions' | 'categories', snap: Snapshot) {
  const cols = SNAPSHOT_COLUMNS[table];
  const set = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`);
  await database.runAsync(
    `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT (id) DO UPDATE SET ${set.join(', ')}`,
    cols.map((c) => snap[c] ?? null)
  );
}

type HistoryRow = { id: number; op: string; table_name: 'transactions' | 'categories'; row_id: string; old_row: string | null; new_row: string | null };

const RPCS = {
  move_money: async (a: { amount: number; from_pot: string; to_pot: string; note?: string | null; occurred_on?: string }) =>
    write(async (database) => {
      if (!(a.amount > 0)) throw new Error('Amount must be positive');
      const from = await potId(database, a.from_pot);
      const to = await potId(database, a.to_pot);
      if (from === to) throw new Error('Pick two different pots');
      const tid = (await database.getFirstAsync<{ id: string }>("SELECT lower(hex(randomblob(16))) AS id"))!.id;
      const sql = `INSERT INTO transactions (account_id, kind, amount_cents, transfer_id, note, occurred_on)
        VALUES (?, 'transfer', ?, ?, ?, coalesce(?, date('now', 'localtime')))`;
      const day = a.occurred_on ?? null;
      await database.runAsync(sql, [from, -a.amount, tid, a.note ?? null, day]);
      await database.runAsync(sql, [to, a.amount, tid, a.note ?? null, day]);
      return tid;
    }),

  update_transfer: async (a: { transfer: string; amount: number; from_pot: string; to_pot: string; note?: string | null; occurred_on?: string }) =>
    write(async (database) => {
      if (!(a.amount > 0)) throw new Error('Amount must be positive');
      const from = await potId(database, a.from_pot);
      const to = await potId(database, a.to_pot);
      if (from === to) throw new Error('Pick two different pots');
      // The outgoing leg is the negative one; update it last so both legs stay distinguishable.
      const inn = await database.runAsync(
        'UPDATE transactions SET account_id = ?, amount_cents = ?, note = ?, occurred_on = coalesce(?, occurred_on) WHERE transfer_id = ? AND amount_cents > 0',
        [to, a.amount, a.note ?? null, a.occurred_on ?? null, a.transfer]
      );
      const out = await database.runAsync(
        'UPDATE transactions SET account_id = ?, amount_cents = ?, note = ?, occurred_on = coalesce(?, occurred_on) WHERE transfer_id = ? AND amount_cents < 0',
        [from, -a.amount, a.note ?? null, a.occurred_on ?? null, a.transfer]
      );
      if (inn.changes !== 1 || out.changes !== 1) throw new Error('Transfer not found');
      return null;
    }),

  /** Deletes a category; its payments go back to "To sort" in the same undoable action. */
  delete_category: async (a: { id: string }) =>
    write(async (database) => {
      await database.runAsync('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [a.id]);
      await database.runAsync('DELETE FROM categories WHERE id = ?', [a.id]);
      return null;
    }),

  /** Undo (redo = false) or redo (redo = true) one action group. */
  replay_history: async (a: { group_id: number; redo: boolean }) =>
    write(async (database) => {
      const rows = await database.getAllAsync<HistoryRow>('SELECT * FROM history WHERE group_id = ? ORDER BY id', [a.group_id]);
      const pending = await database.getFirstAsync<{ n: number }>(
        'SELECT count(*) AS n FROM history WHERE group_id = ? AND undone = ?',
        [a.group_id, a.redo ? 1 : 0]
      );
      if (!rows.length || !pending?.n) throw new Error(`Nothing to ${a.redo ? 'redo' : 'undo'}`);

      const snap = (r: HistoryRow) => JSON.parse((a.redo ? r.new_row : r.old_row) ?? 'null') as Snapshot;
      await database.runAsync("UPDATE meta SET v = 1 WHERE k = 'replaying'");
      try {
        // 1) Rows that must exist again: categories first, since transactions reference them.
        const restore = rows.filter((r) => r.op === (a.redo ? 'insert' : 'delete'))
          .sort((x, y) => Number(x.table_name === 'transactions') - Number(y.table_name === 'transactions') || x.id - y.id);
        for (const r of restore) await put(database, r.table_name, snap(r));
        // 2) Updates go back to their before (undo) or after (redo) state.
        const updates = rows.filter((r) => r.op === 'update').sort((x, y) => (a.redo ? x.id - y.id : y.id - x.id));
        for (const r of updates) await put(database, r.table_name, snap(r));
        // 3) Rows that must disappear: transactions first.
        const remove = rows.filter((r) => r.op === (a.redo ? 'delete' : 'insert'))
          .sort((x, y) => Number(x.table_name === 'categories') - Number(y.table_name === 'categories') || y.id - x.id);
        for (const r of remove) await database.runAsync(`DELETE FROM ${r.table_name} WHERE id = ?`, [r.row_id]);
      } finally {
        await database.runAsync("UPDATE meta SET v = 0 WHERE k = 'replaying'");
      }
      await database.runAsync('UPDATE history SET undone = ? WHERE group_id = ?', [a.redo ? 0 : 1, a.group_id]);
      return null;
    }),
};

type Rpcs = typeof RPCS;

export const db = {
  from<T extends TableName>(table: T) {
    return {
      select: (columns = '*') => new Query<T, RowOf<T>[]>(table, 'select', [], columns),
      insert: (rows: Record<string, unknown> | Record<string, unknown>[]) =>
        new Query<T, null>(table, 'insert', Array.isArray(rows) ? rows : [rows]),
      upsert: (row: Record<string, unknown>, opts: { onConflict?: string } = {}) =>
        new Query<T, null>(table, 'upsert', [row], '*', (opts.onConflict ?? '').split(',').map((c) => c.trim()).filter((c) => c && c !== 'user_id')),
      update: (fields: Record<string, unknown>) => new Query<T, null>(table, 'update', [fields]),
      delete: () => new Query<T, null>(table, 'delete'),
    };
  },
  async rpc<K extends keyof Rpcs>(name: K, args: Parameters<Rpcs[K]>[0]): Promise<DbResult<Awaited<ReturnType<Rpcs[K]>>>> {
    try {
      return { data: await (RPCS[name] as any)(args), error: null };
    } catch (e) {
      return { data: null, error: toError(e) };
    }
  },
  /** Raw access for bulk work (import); runs outside the undo history. */
  async importRows(table: string, rows: Record<string, unknown>[]) {
    const database = active();
    await database.withTransactionAsync(async () => {
      await database.runAsync("UPDATE meta SET v = 1 WHERE k = 'replaying'");
      for (const row of rows) {
        const cols = Object.keys(row);
        await database.runAsync(
          `INSERT OR REPLACE INTO ${ident(table)} (${cols.map(ident).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => encode(row[c]))
        );
      }
      await database.runAsync("UPDATE meta SET v = 0 WHERE k = 'replaying'");
    });
  },
  async exec(sql: string) {
    await active().execAsync(sql);
  },
};
