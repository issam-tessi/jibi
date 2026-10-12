// Applies pending supabase/migrations/*.sql to the remote project over HTTPS (Supabase Management API).
// Works on networks that block Postgres ports (5432/6543), where `supabase db push` hangs.
//
// Usage:
//   npm run db:migrate                         apply pending migrations
//   npm run db:migrate -- --status             list applied / pending
//   npm run db:migrate -- --mark-applied <v>   record version(s) as applied without running them
//
// Needs SUPABASE_ACCESS_TOKEN (create at https://supabase.com/dashboard/account/tokens) in .env.local,
// and EXPO_PUBLIC_SUPABASE_URL in .env. Applied versions are tracked in supabase_migrations.schema_migrations,
// the same table the Supabase CLI uses.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(import.meta.dirname, '..', 'supabase', 'migrations');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.EXPO_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

if (!token) fail('Missing SUPABASE_ACCESS_TOKEN. Add it to .env.local (see header of this script).');
if (!projectRef) fail('Could not read the project ref from EXPO_PUBLIC_SUPABASE_URL in .env.');

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body}`);
  return JSON.parse(body);
}

const literal = (s) => `'${s.replaceAll("'", "''")}'`;

async function main() {
  const args = process.argv.slice(2);

  await query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key, statements text[], name text
    );`);

  const applied = new Set(
    (await query('select version from supabase_migrations.schema_migrations')).map((r) => r.version)
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const migrations = files.map((f) => ({ file: f, version: f.split('_')[0], name: f.replace(/^\d+_|\.sql$/g, '') }));

  if (args[0] === '--status') {
    for (const m of migrations) console.log(`${applied.has(m.version) ? 'applied' : 'PENDING'}  ${m.file}`);
    return;
  }

  if (args[0] === '--mark-applied') {
    const versions = args.slice(1);
    if (!versions.length) fail('Pass one or more versions, e.g. --mark-applied 20261012000000');
    for (const v of versions) {
      const m = migrations.find((x) => x.version === v);
      if (!m) fail(`No migration file with version ${v}`);
      await query(
        `insert into supabase_migrations.schema_migrations (version, name) values (${literal(v)}, ${literal(m.name)})
         on conflict do nothing`
      );
      console.log(`marked applied  ${m.file}`);
    }
    return;
  }

  const pending = migrations.filter((m) => !applied.has(m.version));
  if (!pending.length) return console.log('Database is up to date.');

  for (const m of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, m.file), 'utf8');
    process.stdout.write(`applying  ${m.file} ... `);
    // One transaction per migration: either all of it lands (and is recorded) or none of it does.
    await query(`begin;
${sql}
;
insert into supabase_migrations.schema_migrations (version, name) values (${literal(m.version)}, ${literal(m.name)});
commit;`);
    console.log('done');
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main().catch((err) => fail(err.message));
