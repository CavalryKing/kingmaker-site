// 03 Quote: line items from the catalogue, discount, total, the 50% deposit, valid for 14 days.
// "Convert to invoice" makes the deposit invoice.

import { createDoc, addActivity } from '../store.js';
import { addDays, firstName, html, money, raw, toast, today, toCents, longDate } from '../ui.js';
import {
  bandKV, bindFields, clientLine, computeTotals, D, divider, F, fromBlock, itemsTable, pageShell, pickDiscount, sumBox, updateSum, wireItems,
} from './common.js';
import { blank as blankInvoice, totals as invoiceTotals } from './invoice.js';

export function blank(ctx) {
  const c = ctx.client;
  const date = today();
  const pkg = ctx.catalogue.packages.find(p => p.id === c?.data?.package);
  const items = pkg ? [{ d: `${pkg.name} package — ${String(pkg.tagline || '').replace(/\.$/, '')}`, s: (pkg.deliverables || []).join(', '), q: 1, u: pkg.price, ref: `package:${pkg.id}` }] : [{ d: '', s: '', q: 1, u: 0 }];
  const disc = ctx.catalogue.discounts.find(d => d.id === c?.data?.discount);
  return {
    date,
    validUntil: addDays(date, Number(ctx.terms.validityDays) || 14),
    billName: c?.name || '', billBiz: c?.business || '', billLine: clientLine(c),
    project: c?.business ? `${c.business} — ` : '',
    items,
    discName: disc?.name || '', discPct: disc?.pct || 0,
    depositPct: Number(ctx.terms.depositPct) || 50,
    notes: '',
    terms: ctx.terms.payment || '',
    nextStep: 'Reply “yes” on WhatsApp or email to accept. I’ll send the deposit invoice, and we book your Sit-down as soon as it’s paid.',
  };
}

/** The quote's own totals ignore depositPct for the black box (it shows the full total). */
const quoteTotals = (d) => computeTotals({ ...d, depositPct: 0 });
export const totals = (data) => ({ amount_cents: toCents(quoteTotals(data).total) });
export const meta = (data) => ({ client: data.billBiz || data.billName, title: data.project });
export function onClient(data, ctx) {
  const c = ctx.client;
  data.billName = c.name || ''; data.billBiz = c.business || ''; data.billLine = clientLine(c);
}

export function render(page, doc, ctx, onChange) {
  const data = doc.data;
  const days = Number(ctx.terms.validityDays) || 14;
  page.innerHTML = pageShell(html`
    ${raw(bandKV('Quote', [
      ['QUOTE NO.', html`<span>${doc.number}</span>`],
      ['DATE', D('date')],
      ['VALID UNTIL', D('validUntil')],
    ]))}
    <div class="parties"><span class="cross tl">+</span><span class="cross br">+</span>
      <div>${fromBlock(ctx)}</div>
      <div>
        <span class="lab mono muted">PREPARED FOR</span>
        ${F('billName', 'Client name', 'name')}
        ${F('billBiz', 'Business', 'ln')}
        ${F('billLine', 'Address / website / contact', 'ln')}
      </div>
    </div>
    <div class="body">
      ${divider('§ 01 · PROJECT')}
      ${F('project', 'Project name', 'project', 'p')}
      ${raw(itemsTable())}
      <div class="totals">
        <div class="tnote">
          <svg viewBox="0 0 160 110" width="130" height="90" aria-hidden="true"><defs><pattern id="hatchQ" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#E2E2E2" stroke-width="1"/></pattern></defs><line x1="0" y1="96" x2="160" y2="96" stroke="#E6E6E6"/><line x1="80" y1="0" x2="80" y2="110" stroke="#E6E6E6"/><circle cx="80" cy="60" r="36" fill="url(#hatchQ)" stroke="#D9D9D9"/><circle cx="80" cy="60" r="50" fill="none" stroke="#CFCFCF" stroke-dasharray="3 5"/><circle cx="80" cy="10" r="3.5" fill="#C9A24A"/><text x="88" y="106" font-family="Geist Mono, monospace" font-size="8" fill="#A0A0A0" letter-spacing=".5">KM / QUOTE</text></svg>
        </div>
        <div>
          ${raw(sumBox('TOTAL'))}
          <div class="sum" style="margin-top:8px">
            <div class="r"><span>${F('depositPct', '50', 'inline', 'span')}% deposit to start</span><b data-q="dep">R0.00</b></div>
            <div class="r sub-mut"><span>Balance before hand-over</span><span data-q="bal">R0.00</span></div>
          </div>
        </div>
      </div>
      ${divider('§ 02 · DETAILS', 'margin-top:4mm')}
      <div class="terms">
        <div><span class="lab mono muted">NOTES</span>${F('notes', 'Anything specific to this quote')}</div>
        <div><span class="lab mono muted">PAYMENT TERMS</span>${F('terms', 'Payment terms')}</div>
        <div><span class="lab mono muted">TO ACCEPT</span>${F('nextStep', 'How to accept')}</div>
      </div>
    </div>`.s, `VALID FOR ${days} DAYS FROM THE QUOTE DATE`, ctx);

  const refresh = () => {
    const t = updateSum(page, { ...data, depositPct: 0 }, 'TOTAL');
    const pct = Math.min(100, Math.max(0, Number(data.depositPct) || 0));
    const dep = Math.round(t.total * pct) / 100;
    page.querySelector('[data-q="dep"]').textContent = money(dep);
    page.querySelector('[data-q="bal"]').textContent = money(t.total - dep);
  };
  bindFields(page, data, (k) => {
    if (k === 'date' && data.date) { data.validUntil = addDays(data.date, days); page.querySelector('[data-date="validUntil"]').textContent = longDate(data.validUntil); }
    if (['discPct', 'discName', 'depositPct'].includes(k)) refresh();
    onChange();
  });
  wireItems(page, data, ctx, onChange, refresh);
  page.querySelector('[data-pick-disc]').addEventListener('click', () => pickDiscount(ctx, data, () => {
    page.querySelector('[data-k="discName"]').textContent = data.discName;
    page.querySelector('[data-k="discPct"]').textContent = data.discPct;
    refresh(); onChange();
  }));
  refresh();
}

export function actions(doc, ctx, { flush, changed }) {
  return [{
    label: 'Convert to invoice',
    run: async () => {
      await flush();
      const q = doc.data;
      const data = blankInvoice(ctx, {
        billName: q.billName, billBiz: q.billBiz, billLine: q.billLine, project: q.project,
        items: JSON.parse(JSON.stringify(q.items || [])),
        discName: q.discName, discPct: q.discPct,
        depositPct: Number(q.depositPct) || Number(ctx.terms.depositPct) || 50,
        notes: `Deposit invoice for quote ${doc.number}. The balance is due before hand-over.`,
        terms: q.terms || ctx.terms.payment,
        fromQuote: doc.number,
      });
      try {
        const inv = await createDoc({ type: 'invoice', client_id: doc.client_id, status: 'draft', issued_on: today(), data, ...invoiceTotals(data) });
        if (doc.status === 'draft' || doc.status === 'sent') { doc.status = 'accepted'; changed(); await flush(); }
        if (doc.client_id) addActivity(doc.client_id, `Quote ${doc.number} accepted; deposit invoice ${inv.number} created`, today()).catch(() => {});
        toast(`Deposit invoice ${inv.number} created`);
        location.hash = `#/doc/${inv.id}`;
      } catch (e) { toast(e.message, { error: true }); }
    },
  }];
}

export function share(doc) {
  const d = doc.data, t = quoteTotals(d);
  const hi = firstName(d.billName) ? `Hi ${firstName(d.billName)}` : 'Hi';
  const dep = Math.round(t.total * (Number(d.depositPct) || 0)) / 100;
  return `${hi}, here's quote ${doc.number} from KingMaker${d.project ? ` for ${d.project.replace(/\s+—\s*$/, '')}` : ''}: ${money(t.total)} in total, with a ${d.depositPct}% deposit of ${money(dep)} to start. It's valid until ${longDate(d.validUntil)}. Just reply “yes” to accept and I'll send the deposit invoice.`;
}
