// node --test tests/unit.test.mjs   (Node 22.6+ strips the TypeScript types itself)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applyPrices, parseSitePrices, pricesFromCatalogue } from '../src/worker/publish.ts';
import { DEFAULT_SETTINGS } from '../src/worker/defaults.ts';
import { validate } from '../src/worker/backup.ts';

const site = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('catalogue defaults match the live site prices exactly', () => {
  const cat = pricesFromCatalogue(DEFAULT_SETTINGS.catalogue);
  assert.deepEqual(cat, parseSitePrices(site('assets/js/site.js')));
});

test('publishing the same prices changes nothing', () => {
  const prices = parseSitePrices(site('assets/js/site.js'));
  for (const f of ['assets/js/site.js', 'packages/index.html', 'index.html']) {
    assert.equal(applyPrices(f, site(f), prices), site(f), f);
  }
});

test('a new price lands in KM_PRICES and every data-price fallback, nothing else', () => {
  const prices = { ...parseSitePrices(site('assets/js/site.js')), knight: 4250, court: 450 };
  const js = applyPrices('assets/js/site.js', site('assets/js/site.js'), prices);
  assert.equal(parseSitePrices(js).knight, 4250);
  assert.equal(parseSitePrices(js).court, 450);
  assert.equal(js.split('\n').length, site('assets/js/site.js').split('\n').length);
  const html = applyPrices('packages/index.html', site('packages/index.html'), prices);
  assert.equal((html.match(/data-price="knight">R4,250</g) || []).length, 2); // card + comparison table
  assert.equal((html.match(/data-price="knight">R4,250<\/td>/g) || []).length, 1);
  assert.match(html, /data-price="court">R450</);
  assert.doesNotMatch(html, /data-price="knight">R3,900/);
  assert.match(html, /data-price="squire">R1,900</);
});

test('import validation rejects bad files', () => {
  assert.match(validate({}), /not a KingMaker/);
  const ok = { format: 'kingmaker-admin-export', version: 1, tables: { settings: [], counters: [], clients: [], activity: [], documents: [] } };
  assert.equal(validate(ok), null);
  assert.match(validate({ ...ok, tables: { ...ok.tables, documents: [{ type: 'invoice', number: 'A', client_id: 'nope' }] } }), /not in the file/);
  assert.match(validate({ ...ok, tables: { ...ok.tables, documents: [{ type: 'x', number: 'A' }] } }), /unknown type/);
});

test('dashboard money: drafts/voids ignored, paid by paid date, outstanding = sent', async () => {
  const { moneyStats } = await import('../public/js/views/dashboard.js');
  const docs = [
    { type: 'invoice', status: 'paid', issued_on: '2026-11-27', amount_cents: 0, paid_cents: 0, paid_on: '2026-11-27' },
    { type: 'invoice', status: 'paid', issued_on: '2026-10-30', amount_cents: 400000, paid_cents: 400000, paid_on: '2026-11-02' },
    { type: 'invoice', status: 'sent', issued_on: '2026-11-10', amount_cents: 195000, paid_cents: 0 },
    { type: 'invoice', status: 'draft', issued_on: '2026-11-11', amount_cents: 999900, paid_cents: 0 },
    { type: 'invoice', status: 'void', issued_on: '2026-11-12', amount_cents: 888800, paid_cents: 0 },
    { type: 'quote', status: 'sent', issued_on: '2026-11-12', amount_cents: 777700, paid_cents: 0 },
  ];
  const clients = [
    { stage: 'building', data: { retainer: true, retainerAmount: '' } },
    { stage: 'done', data: { retainer: true, retainerAmount: 0 } },
    { stage: 'lost', data: { retainer: true, retainerAmount: 500 } },
  ];
  const m = moneyStats(docs, clients, { retainer: { price: 399 } }, '2026-11-28');
  assert.deepEqual(m.month, { invoiced: 1950, paid: 4000, outstanding: 1950 });
  assert.deepEqual(m.year, { invoiced: 5950, paid: 4000, outstanding: 1950 });
  assert.equal(m.mrr, 399);
  assert.equal(m.retainers, 2);
  assert.equal(m.monthLabel, 'November');
});
