// Screenshots of the main screens at 390 px (phone) and 1440 px (laptop), plus A4 PDFs of documents.
// Needs `npm run dev` running (local D1, .dev.vars password).
//   node tests/screens.mjs                      all screens
//   node tests/screens.mjs "#/catalogue" ...    only these routes
//   PDF=1 node tests/screens.mjs                also print every document to tests/out/pdf/
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8790';
const PW = (readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').match(/ADMIN_PASSWORD=(.*)/) || [])[1]?.trim();
const OUT = new URL('./out/', import.meta.url);
mkdirSync(new URL('pdf/', OUT), { recursive: true });

const routes = process.argv.slice(2).length ? process.argv.slice(2)
  : ['#/', '#/clients', '#/documents', '#/catalogue', '#/settings', '#/soon/apparel', '#/more'];
const name = (r) => r.replace(/^#\/?/, '').replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '') || 'dashboard';

const browser = await chromium.launch();
const errors = [];
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${w}px ${page.url()}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`${w}px console: ${m.text()}`); });
  await page.goto(BASE + '/');
  await page.waitForSelector('#loginForm, .top');
  if (await page.$('#loginForm')) {
    await page.fill('#pw', PW);
    await page.click('#loginForm button');
    await page.waitForSelector('.top');
  }
  for (const r of routes) {
    await page.goto(BASE + '/' + r);
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(`${w}px ${r}: page scrolls sideways by ${overflow}px`);
    await page.screenshot({ path: new URL(`${name(r)}-${w}.png`, OUT).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  }
  if (process.env.PDF && w === 1440) {
    const docs = await page.evaluate(() => fetch('/api/state').then(r => r.json()).then(s => s.documents.map(d => [d.id, d.number])));
    for (const [id, number] of docs) {
      await page.goto(`${BASE}/#/doc/${id}`);
      await page.waitForSelector('.page');
      await page.waitForTimeout(500);
      await page.emulateMedia({ media: 'print' });
      const file = new URL(`pdf/${number}.pdf`, OUT).pathname.replace(/^\/(\w:)/, '$1');
      await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
      await page.screenshot({ path: file.replace(/\.pdf$/, '-print.png'), fullPage: true });
      await page.emulateMedia({ media: 'screen' });
    }
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? 'PROBLEMS:\n' + errors.join('\n') : 'No console errors or sideways scroll.');
