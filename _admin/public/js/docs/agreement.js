// 04 Service Agreement. The clause wording is a plain-language DRAFT: the editor shows a warning
// (never printed) that it must be reviewed by an attorney before it's relied on.

import { firstName, html, money, raw, today } from '../ui.js';
import { bandTall, bindFields, D, divider, F, fullDeliverables, pageShell, sigBlock } from './common.js';

export const note = html`<div class="warn"><b>Draft legal wording.</b> These clauses are a plain-language starting point, not legal advice. Have a South African attorney review this agreement (and set it as your standard wording) before you rely on it. This note doesn't print.</div>`;

function priceFor(ctx) {
  const c = ctx.client, cat = ctx.catalogue;
  const p = cat.packages.find(x => x.id === c?.data?.package) || cat.packages.find(x => x.id === 'knight');
  const disc = cat.discounts.find(d => d.id === c?.data?.discount);
  const value = Number(c?.data?.value) || 0;
  const fee = value || Math.round(p.price * (1 - (disc?.pct || 0) / 100));
  return { p, fee };
}

export function clausesFor(ctx, { p, fee }) {
  const dep = Number(ctx.terms.depositPct) || 50;
  const r = ctx.catalogue.retainer || {};
  const weeks = p?.timeline?.handover ? `${p.timeline.handover.replace(/^Week\s*/i, '')} weeks` : 'the weeks set out in the proposal';
  return [
    { k: 'scope', h: 'Scope of work', t: `KingMaker will deliver the ${p?.name || ''} package, as listed below and in the proposal: ${fullDeliverables(p, ctx.catalogue).join('; ')}. Anything not listed is outside this agreement and will be quoted separately before any work is done.` },
    { k: 'revisions', h: 'Revisions', t: 'The fee includes two (2) rounds of revisions: changes you ask for after reviewing the work. Further rounds, or changes to work you have already approved, are quoted separately before they are done.' },
    { k: 'timeline', h: 'Timeline', t: `The work takes about ${weeks}, counted from the day KingMaker has both the deposit and your content. If content or feedback arrives late, the dates move by the same number of days.` },
    { k: 'client', h: 'Your responsibilities', t: 'You will supply all content (photos, services, prices, text and the logins KingMaker needs) within 7 days of the Sit-down, give feedback within 7 days of each review, and confirm that you have the right to use everything you supply.' },
    { k: 'payment', h: 'Fees and payment', t: `The total fee is ${money(fee)}. A ${dep}% deposit is due before work starts and the balance before hand-over. ${p?.instalments ? 'On the Knight and Crown packages, the balance may be paid in agreed monthly instalments; hand-over happens once the final instalment is paid. ' : ''}Payment is by EFT. If a payment is more than 7 days overdue, KingMaker may pause work until it is paid, and the timeline moves accordingly.` },
    { k: 'ownership', h: 'Ownership', t: 'Once the fee is paid in full, ownership of the website, design files, content and every account set up for you transfers to you, and KingMaker hands over all logins. Until then, the work belongs to KingMaker. KingMaker keeps the right to reuse its own tools, code and templates.' },
    { k: 'credit', h: 'Footer credit', t: 'Your website will carry a small “Built by KingMaker” credit in the footer, linking to thekingmakerstudio.com. Showing your project as a case study or using your testimonial needs your separate written consent.' },
    { k: 'retainer', h: `${r.name || 'The Court'} retainer (if taken)`, t: `If you take ${r.name || 'The Court'} (${money(r.price || 0, { cents: false })} per month), it is paid monthly in advance and starts after hand-over. Either party may end it with 30 days’ written notice. Third-party costs such as domain renewals, hosting and subscriptions are not included unless agreed in writing.` },
    { k: 'cancel', h: 'Cancellation', t: 'Either party may cancel this agreement by written notice (email or WhatsApp is fine). The deposit is not refundable once the Sit-down has taken place. If you cancel after the build has started, you pay for the work done up to that date, and KingMaker hands over that work once it is paid for.' },
    { k: 'popia', h: 'Personal information (POPIA)', t: 'Each party keeps the other’s personal information confidential and uses it only for this agreement, in line with the Protection of Personal Information Act 4 of 2013. KingMaker uses your logins only to do the work, stores them securely and hands them all back at hand-over. Where KingMaker sets up systems that collect your customers’ personal information, you are the responsible party and KingMaker acts as your operator.' },
    { k: 'general', h: 'General', t: 'This agreement, together with the proposal or quote it refers to, is the whole agreement between the parties. Changes are only valid in writing. South African law applies.' },
  ];
}

export function blank(ctx) {
  const c = ctx.client;
  const pf = priceFor(ctx);
  return {
    date: today(),
    client: c?.name || '', biz: c?.business || '', clientAddress: c?.data?.location || '', clientEmail: c?.data?.email || '',
    ref: '',
    retainerOn: !!c?.data?.retainer,
    clauses: clausesFor(ctx, pf),
  };
}

export const totals = () => ({ amount_cents: 0 });
export const meta = (d) => ({ client: d.biz || d.client });
export function onClient(data, ctx) {
  const c = ctx.client;
  data.client = c.name || ''; data.biz = c.business || ''; data.clientAddress = c.data?.location || ''; data.clientEmail = c.data?.email || '';
}

export function render(page, doc, ctx, onChange) {
  const d = doc.data;
  const co = ctx.company;
  let n = 0;
  page.innerHTML = pageShell(html`
    ${raw(bandTall('KM / SERVICE AGREEMENT', 'Service Agreement', html`Between ${co.legalName} t/a ${co.tradingAs} and ${F('biz', '[Business name]', '', 'span', 'color:#fff;font-weight:500')}.`))}
    <div class="parties"><span class="cross tl">+</span><span class="cross br">+</span>
      <div>
        <span class="lab mono muted">KINGMAKER (“WE”)</span>
        <div class="name">${co.legalName} t/a ${co.tradingAs}</div>
        <div class="ln">Reg. No. ${co.regNo}<br>${co.address}<br>${co.email}</div>
      </div>
      <div>
        <span class="lab mono muted">THE CLIENT (“YOU”)</span>
        ${F('client', 'Client name', 'name')}
        ${F('biz', 'Business', 'ln')}
        ${F('clientAddress', 'Address', 'ln')}
        ${F('clientEmail', 'Email', 'ln')}
      </div>
    </div>
    <div class="body">
      <div class="meta meta--3" style="padding:4mm 0;border:0">
        <div><span class="lab mono muted">AGREEMENT NO.</span><div class="val">${doc.number}</div></div>
        <div><span class="lab mono muted">DATE</span><div class="val">${D('date')}</div></div>
        <div><span class="lab mono muted">PROPOSAL / QUOTE REF.</span>${F('ref', 'e.g. KM-P-0001')}</div>
      </div>
      <label class="chk noprint" style="display:inline-flex;gap:8px;font-size:13px;margin:2mm 0;cursor:pointer;align-items:center"><input type="checkbox" data-ret ${d.retainerOn ? 'checked' : ''}> Include the retainer clause</label>
      <button type="button" class="add noprint" data-reset style="margin-left:8px">Reset clauses from the catalogue</button>
      ${d.clauses.map((c, i) => {
        const hide = c.k === 'retainer' && !d.retainerOn;
        if (!hide) n++;
        return html`<section class="sec ${hide ? 'noprint' : ''}" data-clause="${c.k}" style="padding:3.5mm 0;${hide ? 'opacity:.35' : ''}">
          <div style="display:flex;gap:10px;align-items:baseline"><span class="mono muted">${hide ? '—' : String(n).padStart(2, '0')}</span>${F(`clauses.${i}.h`, 'Heading', '', 'div', 'font-weight:600;font-size:15px')}</div>
          ${F(`clauses.${i}.t`, 'Clause text', 'txt', 'div', 'margin-top:4px;padding-left:24px')}
        </section>`;
      })}
      <div style="margin-top:6mm;break-inside:avoid">
        ${divider('SIGNED')}
        <p class="q" style="margin-bottom:4mm">By signing, both parties agree to the terms above.</p>
        <div class="sigs">
          ${sigBlock('FOR KINGMAKER', html`${co.founder || ''}`)}
          ${sigBlock('FOR THE CLIENT', F('client', 'Name', '', 'span'))}
        </div>
      </div>
    </div>`.s, 'CLIENT INITIALS ________', ctx);

  bindFields(page, d, onChange);
  page.querySelector('[data-ret]').addEventListener('change', (e) => { d.retainerOn = e.target.checked; onChange(); render(page, doc, ctx, onChange); });
  page.querySelector('[data-reset]').addEventListener('click', () => {
    if (!confirm('Replace every clause with the standard wording for this client’s package? Your edits to the clauses will be lost.')) return;
    d.clauses = clausesFor(ctx, priceFor(ctx));
    onChange(); render(page, doc, ctx, onChange);
  });
}

export function share(doc) {
  const d = doc.data;
  const hi = firstName(d.client) ? `Hi ${firstName(d.client)}` : 'Hi';
  return `${hi}, here's our service agreement (${doc.number}). It sets out what we'll build, the timeline, payments and who owns what. Please read it, sign the last page and send me a photo or scan. Any questions, just ask.`;
}
