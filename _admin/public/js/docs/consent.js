// 08 Testimonial & Case Study Consent: what the client allows KingMaker to show, the testimonial
// text, how to withdraw, and a signature block.

import { firstName, html, raw, today } from '../ui.js';
import { bandTall, bindFields, D, divider, F, pageShell, sigBlock, ticks, wireTicks } from './common.js';

const ALLOW = [
  ['quote', 'My testimonial (the words below)'], ['name', 'My first name'], ['business', 'My business name'],
  ['screenshots', 'Screenshots of my website and booking pages'], ['beforeAfter', 'Before-and-after comparisons'], ['results', 'Results figures (e.g. bookings, enquiries)'],
];
const WHERE = [['site', 'thekingmakerstudio.com'], ['social', 'KingMaker social media'], ['sales', 'Proposals and sales documents']];

export function blank(ctx) {
  const c = ctx.client;
  return {
    date: today(),
    client: c?.name || '', biz: c?.business || '',
    allow: Object.fromEntries(ALLOW.map(([k]) => [k, true])),
    where: Object.fromEntries(WHERE.map(([k]) => [k, true])),
    quote: '',
    results: '',
  };
}
export const totals = () => ({ amount_cents: 0 });
export const meta = (d) => ({ client: d.biz || d.client });
export function onClient(data, ctx) { data.client = ctx.client.name || ''; data.biz = ctx.client.business || ''; }

export function render(page, doc, ctx, onChange) {
  const d = doc.data;
  const co = ctx.company;
  page.innerHTML = pageShell(html`
    ${raw(bandTall('KM / CONSENT', 'Testimonial & Case Study Consent', html`Your permission for KingMaker to share ${F('biz', '[Business name]', '', 'span', 'color:#fff;font-weight:500')}’s story.`))}
    <div class="meta meta--3">
      <div><span class="lab mono muted">CLIENT</span>${F('client', 'Client name')}</div>
      <div><span class="lab mono muted">REFERENCE</span><div class="val">${doc.number}</div></div>
      <div><span class="lab mono muted">DATE</span><div class="val">${D('date')}</div></div>
    </div>
    <div class="body">
      <section class="sec">
        ${divider('§ 01 · WHAT YOU’RE HAPPY FOR US TO SHOW')}
        <p class="q" style="margin-bottom:2mm">Tick each one you agree to. Anything not ticked, we won’t use.</p>
        ${ticks('allow', ALLOW)}
        <span class="lab mono muted" style="display:block;margin:5mm 0 2mm">WHERE IT MAY APPEAR</span>
        ${ticks('where', WHERE, 2)}
      </section>
      <section class="sec">
        ${divider('§ 02 · YOUR TESTIMONIAL')}
        <div style="display:flex;gap:12px"><span style="font-size:48px;line-height:.8;font-weight:600;color:#C9A24A">“</span>
          ${F('quote', 'In your own words: what was it like working with KingMaker, and what changed for your business?', 'ans tall', 'div', 'flex:1;font-size:15px;line-height:1.6;min-height:40mm')}</div>
        <span class="lab mono muted" style="display:block;margin:4mm 0 2mm">RESULTS WE MAY QUOTE (IF TICKED ABOVE)</span>
        ${F('results', 'e.g. 3x more bookings in the first month; no-shows down to almost zero', 'ans')}
      </section>
      <section class="sec">
        ${divider('§ 03 · YOUR RIGHTS')}
        <p class="txt">We’ll only use what you’ve ticked, only in the places you’ve ticked, and we’ll show it to you before it goes live. You can withdraw this consent at any time by emailing ${co.email}. We’ll remove it from our website and social media within 14 days; printed or already-sent material can’t be recalled. We handle your personal information in line with the Protection of Personal Information Act (POPIA).</p>
      </section>
      <div style="margin-top:6mm;break-inside:avoid">
        ${divider('SIGNED')}
        <div class="sigs">
          ${sigBlock('CLIENT', F('client', 'Name', '', 'span'))}
          ${sigBlock('FOR KINGMAKER', html`${co.founder || ''}`)}
        </div>
      </div>
    </div>`.s, 'THANK YOU FOR LETTING US SHARE YOUR STORY', ctx);
  bindFields(page, d, onChange);
  wireTicks(page, d, onChange);
}

export function share(doc) {
  const d = doc.data;
  const hi = firstName(d.client) ? `Hi ${firstName(d.client)}` : 'Hi';
  return `${hi}, would you be happy for me to share your story? This consent form (${doc.number}) lets you choose exactly what I may show (your words, name, screenshots, before-and-afters, results) and where. Tick what you're comfortable with, sign, and send me a photo. You can change your mind any time.`;
}
