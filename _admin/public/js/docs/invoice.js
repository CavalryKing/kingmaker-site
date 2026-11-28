// 06 Invoice: exactly the prototype (reference/KingMaker_Invoice.html), now saved to D1.
// Optional deposit mode (made by Quote > Convert to invoice): the black box shows the deposit due.

import { bankText } from '../store.js';
import { firstName, html, money, raw, toCents, today } from '../ui.js';
import {
  bandKV, clientLine, computeTotals, D, divider, F, fromBlock, itemsTable, pageShell, pickDiscount, sumBox, updateSum, wireItems, bindFields,
} from './common.js';

export function blank(ctx, extra = {}) {
  const c = ctx.client;
  return {
    date: today(),
    due: 'On receipt',
    billName: c?.name || '',
    billBiz: c?.business || '',
    billLine: clientLine(c),
    project: c?.business ? `${c.business} — ` : '',
    items: [{ d: '', s: '', q: 1, u: 0 }],
    discName: '', discPct: 0,
    depositPct: 0,
    notes: '',
    terms: ctx.terms.payment || '',
    bank: bankText(),
    ...extra,
  };
}

export function totals(data) {
  return { amount_cents: toCents(computeTotals(data).due) };
}

export function meta(data) {
  return { client: data.billBiz || data.billName, title: data.project };
}

export function render(page, doc, ctx, onChange) {
  const data = doc.data;
  page.innerHTML = pageShell(html`
    ${raw(bandKV('Invoice', [
      ['INVOICE NO.', html`<span>${doc.number}</span>`],
      ['ISSUE DATE', D('date')],
      ['DUE', F('due', 'On receipt', '', 'span')],
    ]))}
    <div class="parties"><span class="cross tl">+</span><span class="cross br">+</span>
      <div>${fromBlock(ctx)}</div>
      <div>
        <span class="lab mono muted">BILL TO</span>
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
          <svg viewBox="0 0 160 110" width="130" height="90" aria-hidden="true"><defs><pattern id="hatchInv" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#E2E2E2" stroke-width="1"/></pattern></defs><line x1="0" y1="96" x2="160" y2="96" stroke="#E6E6E6"/><line x1="80" y1="0" x2="80" y2="110" stroke="#E6E6E6"/><circle cx="80" cy="60" r="36" fill="url(#hatchInv)" stroke="#D9D9D9"/><circle cx="80" cy="60" r="50" fill="none" stroke="#CFCFCF" stroke-dasharray="3 5"/><circle cx="80" cy="10" r="3.5" fill="#C9A24A"/><text x="88" y="106" font-family="Geist Mono, monospace" font-size="8" fill="#A0A0A0" letter-spacing=".5">KM / INV</text></svg>
          ${doc.status === 'paid' ? html`<div><span class="stamp">PAID${doc.paid_on ? ` ${doc.paid_on.split('-').reverse().join('/')}` : ''}</span></div>` : ''}
        </div>
        ${raw(sumBox())}
      </div>
      ${divider('§ 02 · DETAILS', 'margin-top:4mm')}
      <div class="terms">
        <div><span class="lab mono muted">NOTES</span>${F('notes', 'Notes for the client')}</div>
        <div><span class="lab mono muted">PAYMENT TERMS</span>${F('terms', 'Payment terms')}</div>
        <div><span class="lab mono muted">PAY BY EFT</span>${F('bank', 'Bank details', 'pre')}</div>
      </div>
    </div>`.s, 'THANK YOU FOR BUILDING WITH US', ctx);

  const refresh = () => updateSum(page, data);
  bindFields(page, data, (k) => { if (k === 'discPct' || k === 'discName') refresh(); onChange(); });
  wireItems(page, data, ctx, onChange, refresh);
  page.querySelector('[data-pick-disc]').addEventListener('click', () => pickDiscount(ctx, data, () => {
    page.querySelector('[data-k="discName"]').textContent = data.discName;
    page.querySelector('[data-k="discPct"]').textContent = data.discPct;
    refresh(); onChange();
  }));
  refresh();
}

export function share(doc, ctx) {
  const d = doc.data, t = computeTotals(d);
  const hi = firstName(d.billName) ? `Hi ${firstName(d.billName)}` : 'Hi';
  const what = d.project ? ` for ${d.project.replace(/\s+—\s*$/, '')}` : '';
  if (t.due <= 0) return `${hi}, here's invoice ${doc.number} from KingMaker${what}, for your records. Nothing is due on this one. Thank you for building with us!`;
  const dep = t.depPct ? ` (the ${t.depPct}% deposit that books your build in)` : '';
  return `${hi}, here's invoice ${doc.number} from KingMaker${what}. Amount due: ${money(t.due)}${dep}, ${d.due && !/receipt/i.test(d.due) ? `by ${d.due}` : 'on receipt'}. Please pay by EFT (details on the PDF) and use ${doc.number} as the reference. Thank you!`;
}

export function onClient(data, ctx) {
  const c = ctx.client;
  data.billName = c.name || '';
  data.billBiz = c.business || '';
  data.billLine = clientLine(c);
}
