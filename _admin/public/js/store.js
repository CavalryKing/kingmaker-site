// In-memory copy of the D1 data, loaded once from /api/state and kept in step with every save.
// D1 is the only real store: nothing here is written to localStorage.

import { del, get, post, put } from './api.js';

export const S = {
  settings: {}, counters: {}, clients: [], activity: [], documents: [],
};

export const STAGES = [
  ['lead', 'Lead'], ['audit', 'Audit'], ['meeting', 'Meeting'], ['proposal', 'Proposal'],
  ['signed', 'Signed'], ['building', 'Building'], ['done', 'Done'], ['lost', 'Lost'],
];
export const PIPELINE = STAGES.filter(([k]) => k !== 'lost');
export const ACTIVE_STAGES = ['signed', 'building'];
export const stageLabel = (k) => (STAGES.find(s => s[0] === k) || [k, k])[1];
export const SOURCES = [['referral', 'Referral'], ['website', 'Website'], ['outreach', 'Outreach'], ['other', 'Other']];

export async function load() {
  const s = await get('/state');
  Object.assign(S, s);
  return S;
}

// ---------- Clients ----------
export const client = (id) => S.clients.find(c => c.id === id) || null;
export const clientName = (c) => (c ? (c.business || c.name || 'Untitled client') : '');

export async function createClient(fields) {
  const c = await post('/clients', fields);
  S.clients.unshift(c);
  return c;
}
export async function saveClient(c) {
  const saved = await put(`/clients/${c.id}`, c);
  S.clients = S.clients.map(x => (x.id === saved.id ? saved : x));
  return saved;
}
export async function deleteClient(id) {
  await del(`/clients/${id}`);
  S.clients = S.clients.filter(c => c.id !== id);
  S.activity = S.activity.filter(a => a.client_id !== id);
  S.documents.forEach(d => { if (d.client_id === id) d.client_id = null; });
}
export const activityFor = (id) => S.activity.filter(a => a.client_id === id);
export async function addActivity(clientId, text, on_date) {
  const a = await post(`/clients/${clientId}/activity`, { text, on_date });
  S.activity.unshift(a);
  S.activity.sort((x, y) => (y.on_date + y.created_at).localeCompare(x.on_date + x.created_at));
  return a;
}
export async function deleteActivity(id) {
  await del(`/activity/${id}`);
  S.activity = S.activity.filter(a => a.id !== id);
}

// ---------- Documents ----------
const summary = (d) => { const { data, ...rest } = d; return { ...rest, meta: data?._meta ?? rest.meta ?? {} }; };
export const docsFor = (clientId) => S.documents.filter(d => d.client_id === clientId);
export const getDoc = (id) => get(`/documents/${id}`);

export async function createDoc(fields) {
  const d = await post('/documents', fields);
  S.documents.unshift(summary(d));
  const prefix = d.number.replace(/-\d+$/, '');
  S.counters[prefix] = Math.max(S.counters[prefix] || 1, Number(d.number.match(/(\d+)$/)[1]) + 1);
  return d;
}
export async function saveDoc(d) {
  const saved = await put(`/documents/${d.id}`, d);
  S.documents = [summary(saved), ...S.documents.filter(x => x.id !== saved.id)];
  return saved;
}
export async function deleteDoc(id) {
  await del(`/documents/${id}`);
  S.documents = S.documents.filter(d => d.id !== id);
}

// ---------- Settings ----------
export async function saveSetting(key, value) {
  await put(`/settings/${key}`, { value });
  S.settings[key] = value;
}
export async function saveCounters(map) {
  await put('/counters', map);
  Object.assign(S.counters, map);
}

export const company = () => S.settings.company || {};
export const catalogue = () => S.settings.catalogue || { packages: [], addons: [], retainer: null, discounts: [] };
export const pkg = (id) => catalogue().packages.find(p => p.id === id) || null;
export const discount = (id) => catalogue().discounts.find(d => d.id === id) || null;

/** Clients flagged as founding clients (the 20% Founding Client Discount is limited to 3). */
export const foundingUsed = () => S.clients.filter(c => c.data?.founding).length;
export const foundingLimit = () => discount('founding')?.limit || 3;

/** Multi-line EFT block for invoices. */
export function bankText() {
  const b = S.settings.bank || {};
  return [
    b.bank && `Bank: ${b.bank}`,
    b.accountName && `Account name: ${b.accountName}`,
    b.accountNo && `Account no.: ${b.accountNo}`,
    b.branchCode && `Branch code: ${b.branchCode}`,
    b.reference && `Reference: ${b.reference}`,
  ].filter(Boolean).join('\n');
}
