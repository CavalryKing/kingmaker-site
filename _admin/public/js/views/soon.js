// "Coming soon" modules. Each is already in the navigation; when one is built it gets its own view
// file and route in app.js, and its entry moves from SOON to NAV.

import { decoRing, html } from '../ui.js';

const MODULES = {
  enquiries: {
    n: '06', title: 'Enquiries',
    lede: 'Website enquiries, stored here as well as emailed.',
    plan: [
      'The booking form on thekingmakerstudio.com also posts each enquiry to this admin (it keeps emailing you as it does now).',
      'Each enquiry lands in a list with its name, business, WhatsApp, package of interest and message.',
      'One tap turns an enquiry into a client at the Lead stage, with the enquiry logged in their activity.',
    ],
  },
  apparel: {
    n: '07', title: 'KingMaker Apparel orders',
    lede: 'Set up like the jnluxe.com order flow.',
    plan: [
      'Customers pay on the apparel site (PayFast), and the order is stored in D1.',
      'You get an email for every paid order.',
      'Orders move from To print → Packed → Shipped, with The Courier Guy booking and tracking, as on jnluxe.com.',
    ],
  },
  finance: {
    n: '08', title: 'Finance',
    lede: 'Income by month, and an export for your bookkeeping.',
    plan: [
      'Income by month from paid invoices, and later apparel orders.',
      'Outstanding invoices and retainer income at a glance.',
      'A CSV export per month or tax year for your bookkeeper.',
    ],
  },
};

export function render(view, [id]) {
  const m = MODULES[id];
  view.innerHTML = html`
    <div class="ph"><div><span class="ph__sec mono">§ ${m.n} — COMING SOON</span><h1>${m.title}</h1></div></div>
    <div class="soonbox">
      ${decoRing('deco', '#D4D4D4')}
      <span class="chip chip--plain">NOT BUILT YET</span>
      <h2>${m.lede}</h2>
      <p class="muted" style="margin:0;max-width:560px">This module has a place in the admin already, so it can be added without changing anything else. The plan:</p>
      <ul>${m.plan.map(x => html`<li>${x}</li>`)}</ul>
    </div>`.s;
}
