// Dashboard (ink): capacity ring, founding spots, pipeline by stage, money, quick actions, recent documents.

import { newClientModal } from './clients.js';
import { docTable, newDocModal } from './documents.js';
import { ACTIVE_STAGES, PIPELINE, S, catalogue, company, foundingLimit, foundingUsed } from '../store.js';
import { html, money, monthName, today } from '../ui.js';

/** Money figures from invoices. Drafts and voids never count. */
export function moneyStats(docs, clients, cat, now = today()) {
  const month = now.slice(0, 7), year = now.slice(0, 4);
  const inv = docs.filter(d => d.type === 'invoice' && (d.status === 'sent' || d.status === 'paid'));
  const sum = (arr, f) => arr.reduce((a, d) => a + (f(d) || 0), 0) / 100;
  const period = (p) => {
    const issued = inv.filter(d => (d.issued_on || '').startsWith(p));
    return {
      invoiced: sum(issued, d => d.amount_cents),
      paid: sum(inv.filter(d => d.status === 'paid' && (d.paid_on || '').startsWith(p)), d => d.paid_cents),
      outstanding: sum(issued.filter(d => d.status === 'sent'), d => d.amount_cents),
    };
  };
  const mrr = clients
    .filter(c => c.data?.retainer && c.stage !== 'lost')
    .reduce((a, c) => a + (c.data.retainerAmount === '' || c.data.retainerAmount == null ? Number(cat.retainer?.price) || 0 : Number(c.data.retainerAmount) || 0), 0);
  const retainers = clients.filter(c => c.data?.retainer && c.stage !== 'lost').length;
  const owedAll = sum(inv.filter(d => d.status === 'sent'), d => d.amount_cents);
  return { month: period(month), year: period(year), mrr, retainers, owedAll, monthLabel: monthName(Number(month.slice(5)) - 1), year4: year };
}

function ring(active, max) {
  const r = 50, C = 2 * Math.PI * r;
  const frac = max ? Math.min(1, active / max) : 0;
  return html`
    <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${active} of ${max} active client spots used">
      <circle class="base" cx="60" cy="60" r="58"/>
      <circle class="track" cx="60" cy="60" r="${r}"/>
      <circle class="arc" cx="60" cy="60" r="${r}" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>
      <circle cx="60" cy="2" r="3" fill="#C9A24A"/>
      <text x="60" y="62" text-anchor="middle" font-size="28" font-weight="600">${active}</text>
      <text x="60" y="80" text-anchor="middle" font-size="11" fill="#8A8A8A" font-family="Geist Mono, monospace">OF ${max}</text>
    </svg>`;
}

export async function render(view) {
  const max = Number(company().maxActiveClients) || 3;
  const active = S.clients.filter(c => ACTIVE_STAGES.includes(c.stage)).length;
  const fLimit = foundingLimit(), fLeft = Math.max(0, fLimit - foundingUsed());
  const m = moneyStats(S.documents, S.clients, catalogue());
  const recent = [...S.documents].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 10);
  const counts = Object.fromEntries(PIPELINE.map(([k]) => [k, S.clients.filter(c => c.stage === k).length]));

  view.innerHTML = html`
    <div class="dash">
      <div class="ph">
        <div><span class="ph__sec mono">§ 01 — DASHBOARD</span><h1>${greeting()}</h1></div>
        <div class="quick">
          <button class="btn btn--inv btn--sm" data-q="client">+ New client</button>
          <button class="btn btn--inv-ghost btn--sm" data-q="audit">New audit</button>
          <button class="btn btn--inv-ghost btn--sm" data-q="proposal">New proposal</button>
          <button class="btn btn--inv-ghost btn--sm" data-q="invoice">New invoice</button>
        </div>
      </div>

      <div class="tiles">
        <div class="tile tile--cap">
          ${ring(active, max)}
          <div><span class="tile__lab mono">CAPACITY</span><div class="tile__big" style="font-size:22px">Active clients ${active} <small>/ ${max}</small></div>
            <div class="tile__sub">Signed or building. ${active >= max ? 'You’re full: new work waits for a spot.' : `${max - active} spot${max - active === 1 ? '' : 's'} open.`}</div></div>
        </div>
        <div class="tile"><span class="tile__lab mono">FOUNDING CLIENT SPOTS LEFT</span><div class="tile__big">${fLeft} <small>of ${fLimit}</small></div><div class="tile__sub">Founding Client Discount, ${catalogue().discounts.find(d => d.id === 'founding')?.pct ?? 20}% off.</div></div>
        <div class="tile"><span class="tile__lab mono">ACTIVE RETAINERS (MRR)</span><div class="tile__big">${money(m.mrr, { cents: false })}</div><div class="tile__sub">${m.retainers} client${m.retainers === 1 ? '' : 's'} on ${catalogue().retainer?.name || 'the retainer'}.</div></div>
      </div>

      <div class="div"><span class="mono">§ 02 — PIPELINE</span><i></i><b></b></div>
      <div class="pipe">${PIPELINE.map(([k, l]) => html`<a href="#/clients?stage=${k}"><b>${counts[k]}</b><span class="mono">${l.toUpperCase()}</span></a>`)}</div>

      <div class="div"><span class="mono">§ 03 — MONEY</span><i></i><b></b></div>
      <div class="money">
        ${[['month', `THIS MONTH (${m.monthLabel.toUpperCase()})`], ['year', `THIS YEAR (${m.year4})`]].map(([k, l]) => html`
          <div class="tile"><table>
            <thead><tr><th>${l}</th><th class="r"></th></tr></thead>
            <tbody>
              <tr><td>Invoiced</td><td class="r">${money(m[k].invoiced)}</td></tr>
              <tr><td>Paid</td><td class="r">${money(m[k].paid)}</td></tr>
              <tr><td>Outstanding</td><td class="r" style="${m[k].outstanding > 0 ? 'color:#C9A24A' : ''}">${money(m[k].outstanding)}</td></tr>
            </tbody></table></div>`)}
      </div>
      <p class="mono" style="color:#8A8A8A;margin:8px 0 0">SENT AND PAID INVOICES ONLY. ${m.owedAll > 0 ? html`OWED TO YOU IN TOTAL: ${money(m.owedAll)}.` : ''}</p>

      <div class="div"><span class="mono">§ 04 — RECENT DOCUMENTS</span><i></i><b></b></div>
      <div id="recent">${recent.length ? docTable(recent) : html`<div class="tbl-wrap"><p class="empty">No documents yet.</p></div>`}</div>
    </div>`.s;

  view.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) { if (q.dataset.q === 'client') newClientModal(); else newDocModal(q.dataset.q); return; }
    const row = e.target.closest('tr[data-doc]');
    if (row) location.hash = `#/doc/${row.dataset.doc}`;
  });
}

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: 'numeric', hour12: false }).format(new Date()));
  const name = (company().founder || '').split(' ')[0];
  return `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${name ? `, ${name}` : ''}.`;
}
