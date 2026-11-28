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
