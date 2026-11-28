// Settings > Export everything / Import.
// The export is plain JSON of every table. Import checks the whole file first, then replaces
// everything in one D1 batch (a single transaction: it all applies or none of it does).

import { DOC_TYPES, STAGES } from './api.ts';
import { bad, json, now } from './util.ts';

const FORMAT = 'kingmaker-admin-export';
const TABLES = {
  settings: ['key', 'value', 'updated_at'],
  counters: ['prefix', 'next'],
  clients: ['id', 'name', 'business', 'stage', 'data', 'version', 'created_at', 'updated_at'],
  activity: ['id', 'client_id', 'on_date', 'text', 'created_at'],
  documents: ['id', 'type', 'number', 'client_id', 'status', 'issued_on', 'amount_cents', 'paid_cents', 'paid_on', 'data', 'version', 'created_at', 'updated_at'],
} as const;
type Table = keyof typeof TABLES;
// Delete children first, insert parents first.
const INSERT_ORDER: Table[] = ['settings', 'counters', 'clients', 'activity', 'documents'];

export async function exportAll(env: Env): Promise<Response> {
  const res = await env.DB.batch(INSERT_ORDER.map(t => env.DB.prepare(`SELECT ${TABLES[t].join(', ')} FROM ${t}`)));
  const tables = Object.fromEntries(INSERT_ORDER.map((t, i) => [t, res[i].results]));
  const stamp = now().slice(0, 16).replace(/[-:T]/g, '');
  return json(
    { format: FORMAT, version: 1, exported_at: now(), tables },
    { headers: { 'Content-Disposition': `attachment; filename="kingmaker-admin-${stamp}.json"` } },
  );
}

/** Returns an error message, or null when the file is fine to import. */
export function validate(file: any): string | null {
  if (!file || file.format !== FORMAT || file.version !== 1) return 'This is not a KingMaker Admin export file.';
  const t = file.tables;
  if (!t || typeof t !== 'object') return 'The file has no tables.';
  for (const name of INSERT_ORDER) {
    if (!Array.isArray(t[name])) return `The file is missing the ${name} table.`;
    for (const row of t[name]) if (!row || typeof row !== 'object') return `A row in ${name} is not valid.`;
  }
  const ids = new Set(t.clients.map((c: any) => c.id));
  for (const c of t.clients) {
    if (typeof c.id !== 'string' || !STAGES.includes(c.stage)) return `Client "${c.name ?? c.id}" has a bad id or stage.`;
  }
  for (const a of t.activity) if (!ids.has(a.client_id)) return 'An activity entry belongs to a client that is not in the file.';
  const numbers = new Set<string>();
  for (const d of t.documents) {
    if (!(d.type in DOC_TYPES)) return `Document ${d.number} has an unknown type.`;
    if (typeof d.number !== 'string' || numbers.has(d.number)) return `Document number ${d.number} is missing or repeated.`;
    numbers.add(d.number);
    if (d.client_id && !ids.has(d.client_id)) return `Document ${d.number} belongs to a client that is not in the file.`;
  }
  return null;
}

export async function importAll(request: Request, env: Env): Promise<Response> {
  const file = await request.json().catch(() => null);
  const err = validate(file);
  if (err) return bad(err);
  const stmts = [...INSERT_ORDER].reverse().map(t => env.DB.prepare(`DELETE FROM ${t}`));
  for (const t of INSERT_ORDER) {
    const cols = TABLES[t];
    for (const row of file.tables[t]) {
      stmts.push(env.DB.prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
        .bind(...cols.map(c => {
          const v = row[c];
          if (v === undefined) return null;
          return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
        })));
    }
  }
  await env.DB.batch(stmts);
  const counts = Object.fromEntries(INSERT_ORDER.map(t => [t, file.tables[t].length]));
  console.log(JSON.stringify({ evt: 'admin_import', counts }));
  return json({ ok: true, counts });
}
