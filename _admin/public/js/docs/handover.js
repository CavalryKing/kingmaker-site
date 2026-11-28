// 07 Hand-over Pack: what was delivered, every login and where it lives (passwords are never
// stored or printed: the column always says "Shared separately"), how to update things, support,
// and an invitation to The Court.

import { firstName, html, money, raw, today } from '../ui.js';
import { bandTall, bindFields, D, divider, F, fullDeliverables, pageShell } from './common.js';

const LOGIN_ROWS = [
  ['Domain', 'Registrar, e.g. Cloudflare'], ['Website hosting', 'e.g. Cloudflare / GitHub'], ['Business email', ''],
  ['Google account & Business Profile', 'business.google.com'], ['Booking system', ''], ['Payments', 'e.g. PayFast dashboard'],
  ['Instagram', ''], ['Facebook', ''],
];

export function blank(ctx) {
  const c = ctx.client;
  const p = ctx.catalogue.packages.find(x => x.id === c?.data?.package);
  return {
    date: today(),
    client: c?.name || '', biz: c?.business || '', site: c?.data?.website || '',
    delivered: p ? fullDeliverables(p, ctx.catalogue) : [''],
    logins: LOGIN_ROWS.map(([service, where]) => ({ service, where, user: '' })),
    updatePrices: 'Prices and services live in one place on your website, so you change them once and every page updates. Send me the new prices on WhatsApp and I’ll update them within two working days, or follow the steps we walked through together.',
    bookings: 'Clients book online and pay a deposit to confirm. You get an email for every booking, and clients get a reminder the day before. Deposits are paid into your own account through your payment provider.',
    support: `If something isn’t working, WhatsApp or email me and I’ll get back to you within one working day.`,
  };
}
export const totals = () => ({ amount_cents: 0 });
export const meta = (d) => ({ client: d.biz || d.client });
export function onClient(data, ctx) {
  const c = ctx.client;
  data.client = c.name || ''; data.biz = c.business || ''; data.site = c.data?.website || data.site;
}

export function render(page, doc, ctx, onChange) {
  const d = doc.data;
  d.delivered ||= []; d.logins ||= [];
  const r = ctx.catalogue.retainer || {};
  const co = ctx.company;
  page.innerHTML = pageShell(html`
    ${raw(bandTall('KM / HAND-OVER', 'Hand-over Pack', html`Everything about ${F('biz', '[Business name]', '', 'span', 'color:#fff;font-weight:500')}’s new set-up, in one place. Keep it safe.`))}
    <div class="meta meta--3">
      <div><span class="lab mono muted">PREPARED FOR</span>${F('client', 'Client name')}</div>
      <div><span class="lab mono muted">WEBSITE</span>${F('site', 'yourbusiness.co.za')}</div>
      <div><span class="lab mono muted">HANDED OVER</span><div class="val">${D('date')}</div></div>
    </div>
    <div class="body">
      <section class="sec">
        ${divider('§ 01 · WHAT WE DELIVERED')}
        <div class="cks" data-deliv></div>
        <div class="adds noprint"><button type="button" class="add" data-add-deliv>+ Item</button></div>
      </section>
      <section class="sec">
        ${divider('§ 02 · YOUR LOGINS AND WHERE THEY LIVE')}
        <p class="q" style="margin-bottom:3mm">Every account is in your name. Passwords are never written down here: they’ve been shared with you separately. Change them whenever you like.</p>
        <table class="items logins">
          <thead><tr><th>SERVICE</th><th>WHERE IT LIVES</th><th>USERNAME / EMAIL</th><th>PASSWORD</th><th class="noprint"></th></tr></thead>
          <tbody data-logins></tbody>
        </table>
        <div class="adds noprint"><button type="button" class="add" data-add-login>+ Login</button></div>
      </section>
      <section class="sec">
        ${divider('§ 03 · UPDATING PRICES AND SERVICES')}
        ${F('updatePrices', 'How to update prices and services', 'txt')}
      </section>
      <section class="sec">
        ${divider('§ 04 · HOW BOOKINGS AND PAYMENTS WORK')}
        ${F('bookings', 'How bookings and payments work', 'txt')}
      </section>
      <section class="sec">
        ${divider('§ 05 · SUPPORT')}
        ${F('support', 'Support', 'txt')}
        <p class="txt" style="margin-top:2mm"><b>${co.founder}</b><br>Email: ${co.email}<br>WhatsApp: ${co.whatsapp ? '+' + co.whatsapp : ''}</p>
      </section>
      <section class="next">
        <svg viewBox="0 0 200 200" aria-hidden="true" style="position:absolute;right:-40px;bottom:-60px;width:200px;height:200px"><circle cx="100" cy="100" r="90" fill="none" stroke="#333" stroke-dasharray="4 6"/></svg>
        <span class="mono" style="color:#9A9A9A;position:relative">§ 06 · JOIN THE COURT</span>
        <h3 style="position:relative">Keep it running without thinking about it.</h3>
        <p>${r.name || 'The Court'} is our monthly retainer: ${(r.includes || []).map(x => x.split(':')[0].toLowerCase()).join(', ')}. It's ${money(r.price || 0, { cents: false })} a month, paid in advance, and you can cancel any time with 30 days’ notice.</p>
        <div class="cta"><span>Reply “Court” on WhatsApp to join</span><span>${co.website}</span></div>
      </section>
    </div>`.s, 'KEEP THIS DOCUMENT SAFE', ctx);

  function drawDeliv() {
    const box = page.querySelector('[data-deliv]');
    box.innerHTML = d.delivered.map((x, i) => html`<div class="ck on" style="cursor:default"><span class="box"></span>${F(`delivered.${i}`, 'Delivered item', '', 'span', 'flex:1')}<button type="button" class="rm noprint" data-rm="${i}" aria-label="Remove">×</button></div>`.s).join('');
    bindFields(box, d, onChange);
    box.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { d.delivered.splice(+b.dataset.rm, 1); drawDeliv(); onChange(); }));
  }
  function drawLogins() {
    const tb = page.querySelector('[data-logins]');
    tb.innerHTML = d.logins.map((l, i) => html`<tr>
      <td>${F(`logins.${i}.service`, 'Service', 'd')}</td>
      <td>${F(`logins.${i}.where`, 'URL / app')}</td>
      <td>${F(`logins.${i}.user`, 'Username or email')}</td>
      <td class="muted" style="font-size:12.5px;white-space:nowrap">Shared separately</td>
      <td class="x noprint"><button type="button" class="rm" data-rm-login="${i}" aria-label="Remove">×</button></td></tr>`.s).join('');
    bindFields(tb, d, onChange);
    tb.querySelectorAll('[data-rm-login]').forEach(b => b.addEventListener('click', () => { d.logins.splice(+b.dataset.rmLogin, 1); drawLogins(); onChange(); }));
  }

  bindFields(page, d, onChange);
  drawDeliv(); drawLogins();
  page.querySelector('[data-add-deliv]').addEventListener('click', () => { d.delivered.push(''); drawDeliv(); onChange(); });
  page.querySelector('[data-add-login]').addEventListener('click', () => { d.logins.push({ service: '', where: '', user: '' }); drawLogins(); onChange(); });
}

export function share(doc) {
  const d = doc.data;
  const hi = firstName(d.client) ? `Hi ${firstName(d.client)}` : 'Hi';
  return `${hi}, it's hand-over day! Here's your Hand-over Pack (${doc.number}): everything we built, where every login lives and how to update your prices. Passwords are coming separately, not in this PDF. Keep it somewhere safe, and thank you for building with us.`;
}
