// /api/* data routes (all behind auth; see index.ts).

import { DEFAULT_SETTINGS } from './defaults.ts';
import { bad, body, isDate, json, now, str, toInt, uid } from './util.ts';

export const DOC_TYPES: Record<string, string> = {
  audit: 'KM-A', proposal: 'KM-P', quote: 'KM-Q', agreement: 'KM-SA',
  onboarding: 'KM-OQ', invoice: 'KM-INV', handover: 'KM-HO', consent: 'KM-TC',
};
export const STAGES = ['lead', 'audit', 'meeting', 'proposal', 'signed', 'building', 'done', 'lost'];
const STATUSES = ['draft', 'sent', 'accepted', 'paid', 'void'];
const MAX_DATA = 300_000; // bytes of JSON per record

const parse = (s: unknown) => { try { return JSON.parse(String(s ?? '{}')); } catch { return {}; } };
const dataJson = (v: unknown) => {
  const s = JSON.stringify(v && typeof v === 'object' ? v : {});
  return s.length <= MAX_DATA ? s : null;
};

/** Insert any default settings keys that don't exist yet (first run, or after adding a new key). */
export async function ensureDefaults(env: Env): Promise<void> {
  const have = new Set((await env.DB.prepare('SELECT key FROM settings').all<{ key: string }>()).results.map(r => r.key));
  const missing = Object.entries(DEFAULT_SETTINGS).filter(([k]) => !have.has(k));
  if (!missing.length) return;
  await env.DB.batch(missing.map(([k, v]) =>
    env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').bind(k, JSON.stringify(v))));
}

const clientOut = (r: any) => ({ ...r, data: parse(r.data) });
const docSummary = (r: any) => {
  const d = parse(r.data);
  return {
    id: r.id, type: r.type, number: r.number, client_id: r.client_id, status: r.status,
    issued_on: r.issued_on, amount_cents: r.amount_cents, paid_cents: r.paid_cents, paid_on: r.paid_on,
    version: r.version, created_at: r.created_at, updated_at: r.updated_at,
    // small extras the dashboard and lists use without loading every document
    meta: d && typeof d === 'object' ? (d._meta ?? {}) : {},
  };
};

/** Everything the app needs on load. A one-person business is a few hundred rows at most. */
async function state(env: Env): Promise<Response> {
  await ensureDefaults(env);
  const [settings, counters, clients, activity, docs] = await env.DB.batch([
    env.DB.prepare('SELECT key, value FROM settings'),
    env.DB.prepare('SELECT prefix, next FROM counters'),
    env.DB.prepare('SELECT * FROM clients ORDER BY updated_at DESC'),
    env.DB.prepare('SELECT * FROM activity ORDER BY on_date DESC, created_at DESC'),
    env.DB.prepare('SELECT * FROM documents ORDER BY updated_at DESC'),
  ]);
  return json({
    settings: Object.fromEntries((settings.results as any[]).map(r => [r.key, parse(r.value)])),
    counters: Object.fromEntries((counters.results as any[]).map(r => [r.prefix, r.next])),
    clients: (clients.results as any[]).map(clientOut),
    activity: activity.results,
    documents: (docs.results as any[]).map(docSummary),
  });
}

// ---------- Clients ----------

function clientFields(b: Record<string, unknown>) {
  const stage = STAGES.includes(String(b.stage)) ? String(b.stage) : 'lead';
  return { name: str(b.name, 200), business: str(b.business, 200), stage, data: dataJson(b.data) };
}

async function createClient(request: Request, env: Env) {
  const b = await body(request);
  if (!b) return bad('Expected JSON');
  const f = clientFields(b);
  if (!f.data) return bad('Too much data');
  const id = uid();
  await env.DB.prepare('INSERT INTO clients (id, name, business, stage, data) VALUES (?, ?, ?, ?, ?)')
    .bind(id, f.name, f.business, f.stage, f.data).run();
  return json(clientOut(await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first()));
}

async function updateClient(id: string, request: Request, env: Env) {
  const b = await body(request);
  if (!b) return bad('Expected JSON');
  const f = clientFields(b);
  if (!f.data) return bad('Too much data');
  const res = await env.DB.prepare(
    `UPDATE clients SET name = ?, business = ?, stage = ?, data = ?, version = version + 1, updated_at = ?
     WHERE id = ? AND version = ?`).bind(f.name, f.business, f.stage, f.data, now(), id, toInt(b.version)).run();
  const row = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  if (!row) return bad('Client not found', 404);
  if (!res.meta.changes) return json({ error: 'conflict', current: clientOut(row) }, { status: 409 });
  return json(clientOut(row));
}

async function deleteClient(id: string, env: Env) {
  await env.DB.batch([
    env.DB.prepare('UPDATE documents SET client_id = NULL WHERE client_id = ?').bind(id),
    env.DB.prepare('DELETE FROM activity WHERE client_id = ?').bind(id),
    env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

async function addActivity(clientId: string, request: Request, env: Env) {
  const b = await body(request);
  const text = str(b?.text, 2000).trim();
  if (!text) return bad('Write something first');
  const on = isDate(b?.on_date) ? b!.on_date as string : now().slice(0, 10);
  const id = uid();
  const res = await env.DB.prepare('INSERT INTO activity (id, client_id, on_date, text) SELECT ?, id, ?, ? FROM clients WHERE id = ?')
    .bind(id, on, text, clientId).run();
  if (!res.meta.changes) return bad('Client not found', 404);
  return json(await env.DB.prepare('SELECT * FROM activity WHERE id = ?').bind(id).first());
}

// ---------- Documents ----------

/** Take the next number for a prefix, skipping any already used (e.g. after editing the counter). */
async function nextNumber(env: Env, prefix: string): Promise<string> {
  for (let i = 0; i < 200; i++) {
    const row = await env.DB.prepare('UPDATE counters SET next = next + 1 WHERE prefix = ? RETURNING next - 1 AS n')
      .bind(prefix).first<{ n: number }>();
    const n = row?.n ?? 1;
    if (!row) await env.DB.prepare('INSERT OR IGNORE INTO counters (prefix, next) VALUES (?, 2)').bind(prefix).run();
    const number = `${prefix}-${String(n).padStart(4, '0')}`;
    const taken = await env.DB.prepare('SELECT 1 FROM documents WHERE number = ?').bind(number).first();
    if (!taken) return number;
  }
  throw new Error('No free number for ' + prefix);
}

function docFields(b: Record<string, unknown>) {
  return {
    client_id: typeof b.client_id === 'string' && b.client_id ? b.client_id : null,
    status: STATUSES.includes(String(b.status)) ? String(b.status) : 'draft',
    issued_on: isDate(b.issued_on) ? b.issued_on : null,
    amount_cents: toInt(b.amount_cents),
    paid_cents: toInt(b.paid_cents),
    paid_on: isDate(b.paid_on) ? b.paid_on : null,
    data: dataJson(b.data),
  };
}

const docOut = (r: any) => ({ ...docSummary(r), data: parse(r.data) });

async function createDocument(request: Request, env: Env) {
  const b = await body(request);
  if (!b) return bad('Expected JSON');
  const type = String(b.type);
  const prefix = DOC_TYPES[type];
  if (!prefix) return bad('Unknown document type');
  const f = docFields(b);
  if (!f.data) return bad('Too much data');
  if (f.client_id && !(await env.DB.prepare('SELECT 1 FROM clients WHERE id = ?').bind(f.client_id).first())) f.client_id = null;
  const id = uid();
  const number = await nextNumber(env, prefix);
  // The number also lives inside data so the page can show it; keep them in step.
  const data = JSON.parse(f.data);
  data.no = number;
  await env.DB.prepare(
    `INSERT INTO documents (id, type, number, client_id, status, issued_on, amount_cents, paid_cents, paid_on, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, type, number, f.client_id, f.status, f.issued_on ?? now().slice(0, 10), f.amount_cents, f.paid_cents, f.paid_on, JSON.stringify(data)).run();
  return json(docOut(await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first()));
}

async function getDocument(id: string, env: Env) {
  const row = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
  return row ? json(docOut(row)) : bad('Document not found', 404);
}

async function updateDocument(id: string, request: Request, env: Env) {
  const b = await body(request);
  if (!b) return bad('Expected JSON');
  const f = docFields(b);
  if (!f.data) return bad('Too much data');
  const res = await env.DB.prepare(
    `UPDATE documents SET client_id = ?, status = ?, issued_on = ?, amount_cents = ?, paid_cents = ?, paid_on = ?, data = ?,
       version = version + 1, updated_at = ?
     WHERE id = ? AND version = ?`)
    .bind(f.client_id, f.status, f.issued_on, f.amount_cents, f.paid_cents, f.paid_on, f.data, now(), id, toInt(b.version)).run();
  const row = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first();
  if (!row) return bad('Document not found', 404);
  if (!res.meta.changes) return json({ error: 'conflict', current: docOut(row) }, { status: 409 });
  return json(docOut(row));
}

async function deleteDocument(id: string, env: Env) {
  await env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// ---------- Settings & counters ----------

async function putSetting(key: string, request: Request, env: Env) {
  if (!(key in DEFAULT_SETTINGS) || key === 'publish') return bad('Unknown setting');
  const b = await body<{ value: unknown }>(request);
  if (!b || b.value === undefined) return bad('Expected {value}');
  const v = JSON.stringify(b.value);
  if (v.length > MAX_DATA) return bad('Too much data');
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).bind(key, v, now()).run();
  return json({ ok: true });
}

async function putCounters(request: Request, env: Env) {
  const b = await body<Record<string, unknown>>(request);
  if (!b) return bad('Expected JSON');
  const known = new Set(Object.values(DOC_TYPES));
  const stmts = Object.entries(b)
    .filter(([p, n]) => known.has(p) && toInt(n) >= 1)
    .map(([p, n]) => env.DB.prepare('INSERT INTO counters (prefix, next) VALUES (?, ?) ON CONFLICT(prefix) DO UPDATE SET next = excluded.next').bind(p, toInt(n)));
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
}

// ---------- Router ----------

const ID = '([0-9a-f-]{36})';

export async function handleApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  const p = url.pathname, m = request.method;
  let r: RegExpMatchArray | null;

  if (p === '/api/state' && m === 'GET') return state(env);

  if (p === '/api/clients' && m === 'POST') return createClient(request, env);
  if ((r = p.match(new RegExp(`^/api/clients/${ID}$`)))) {
    if (m === 'PUT') return updateClient(r[1], request, env);
    if (m === 'DELETE') return deleteClient(r[1], env);
  }
  if ((r = p.match(new RegExp(`^/api/clients/${ID}/activity$`))) && m === 'POST') return addActivity(r[1], request, env);
  if ((r = p.match(new RegExp(`^/api/activity/${ID}$`))) && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM activity WHERE id = ?').bind(r[1]).run();
    return json({ ok: true });
  }

  if (p === '/api/documents' && m === 'POST') return createDocument(request, env);
  if ((r = p.match(new RegExp(`^/api/documents/${ID}$`)))) {
    if (m === 'GET') return getDocument(r[1], env);
    if (m === 'PUT') return updateDocument(r[1], request, env);
    if (m === 'DELETE') return deleteDocument(r[1], env);
  }

  if ((r = p.match(/^\/api\/settings\/([a-z]+)$/)) && m === 'PUT') return putSetting(r[1], request, env);
  if (p === '/api/counters' && m === 'PUT') return putCounters(request, env);

  return null;
}
