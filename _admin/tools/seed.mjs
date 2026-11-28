// Load the private seed (seed/seed.private.json, git-ignored) into D1.
//   npm run seed:local    -> the local dev database
//   npm run seed:remote   -> production (once, on first run)
// The seed file is in the same format as Settings > Export, so a backup can be loaded the same way:
//   node tools/seed.mjs --remote path/to/kingmaker-admin-export.json
// It refuses to run on a database that already has clients, unless you add --force.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const where = args.includes('--remote') ? '--remote' : '--local';
const force = args.includes('--force');
const file = args.find(a => !a.startsWith('--')) || join(root, 'seed', 'seed.private.json');

const data = JSON.parse(readFileSync(file, 'utf8'));
if (data.format !== 'kingmaker-admin-export') throw new Error(`${file} is not an export-format file`);

const wrangler = (...a) => execFileSync('npx', ['wrangler', ...a], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });

if (!force) {
  const out = wrangler('d1', 'execute', 'kingmaker-admin', where, '--json', '--command', 'SELECT COUNT(*) AS n FROM clients');
  const n = JSON.parse(out)[0].results[0].n;
  if (n > 0) { console.error(`The ${where.slice(2)} database already has ${n} clients. Add --force to replace everything.`); process.exit(1); }
}

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') v = JSON.stringify(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};
const order = ['settings', 'counters', 'clients', 'activity', 'documents'];
const sql = [...order].reverse().map(t => `DELETE FROM ${t};`);
for (const t of order) {
  for (const row of data.tables[t] || []) {
    const cols = Object.keys(row);
    sql.push(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(c => q(row[c])).join(', ')});`);
  }
}
const out = join(root, '.wrangler', 'seed.sql');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, sql.join('\n'));
console.log(wrangler('d1', 'execute', 'kingmaker-admin', where, '--file', out, '--yes'));
console.log(`Seeded ${where.slice(2)} from ${file}`);
