// Clients: the tracker list.

import { S, STAGES, catalogue, clientName, createClient, stageLabel } from '../store.js';
import { $, html, modal, rand, shortDate, toast } from '../ui.js';

export async function render(view, _p, query) {
  let stage = query.get('stage') || 'all';
  let q = '';

  view.innerHTML = html`
    <div class="ph"><div><span class="ph__sec mono">§ 02 — CLIENTS</span><h1>Clients</h1></div>
      <div class="ph__actions"><button class="btn" type="button" id="newClient">+ New client</button></div></div>
    <div class="bar">
      <input class="in grow" type="search" id="q" placeholder="Search name, business, email…" aria-label="Search clients">
    </div>
    <div class="bar"><div class="seg" id="stages" role="group" aria-label="Stage"></div></div>
    <div id="list"></div>`.s;

  function drawStages() {
    const count = (k) => S.clients.filter(c => k === 'all' || c.stage === k).length;
    $('#stages', view).innerHTML = [['all', 'All'], ...STAGES]
      .map(([k, l]) => html`<button type="button" data-stage="${k}" aria-pressed="${stage === k}">${l.toUpperCase()} ${count(k)}</button>`.s).join('');
  }

  function drawList() {
    const pkgName = (id) => catalogue().packages.find(p => p.id === id)?.name || '';
    const needle = q.toLowerCase();
    const rows = S.clients
      .filter(c => stage === 'all' || c.stage === stage)
      .filter(c => !needle || [c.name, c.business, c.data?.email, c.data?.website, c.data?.whatsapp].join(' ').toLowerCase().includes(needle));
    $('#list', view).innerHTML = rows.length ? html`
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>CLIENT</th><th>STAGE</th><th class="hide-sm">PACKAGE</th><th class="r hide-sm">VALUE</th><th class="hide-sm">SOURCE</th><th class="r hide-sm">UPDATED</th></tr></thead>
        <tbody>${rows.map(c => html`
          <tr class="rowlink" data-id="${c.id}">
            <td><span class="strong">${clientName(c)}</span><span class="sub">${c.business ? c.name : (c.data?.email || '')}${c.data?.founding ? ', founding client' : ''}</span></td>
            <td><span class="chip chip--stage ${['signed', 'building'].includes(c.stage) ? 'chip--sent' : ''}">${stageLabel(c.stage)}</span></td>
            <td class="hide-sm">${pkgName(c.data?.package) || '—'}</td>
            <td class="r num hide-sm">${c.data?.value ? rand(c.data.value) : '—'}</td>
            <td class="hide-sm">${c.data?.source ? c.data.source[0].toUpperCase() + c.data.source.slice(1) : '—'}</td>
            <td class="r num hide-sm">${shortDate(c.updated_at)}</td>
          </tr>`)}</tbody>
      </table></div>` .s : html`<div class="tbl-wrap"><p class="empty">${S.clients.length ? 'No clients match.' : 'No clients yet. Add your first one.'}</p></div>`.s;
  }

  view.addEventListener('click', (e) => {
    const s = e.target.closest('[data-stage]');
    if (s) { stage = s.dataset.stage; drawStages(); drawList(); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) location.hash = `#/clients/${row.dataset.id}`;
  });
  $('#q', view).addEventListener('input', (e) => { q = e.target.value; drawList(); });
  $('#newClient', view).addEventListener('click', () => newClientModal());

  drawStages();
  drawList();
  if (query.get('new')) newClientModal();
}

export function newClientModal() {
  modal(html`
    <h2>New client</h2>
    <form id="ncForm" class="form" style="margin-top:12px">
      <label class="fl"><span>Contact name</span><input class="in" name="name" autofocus required></label>
      <label class="fl"><span>Business</span><input class="in" name="business"></label>
      <label class="fl"><span>WhatsApp</span><input class="in" name="whatsapp" inputmode="tel" placeholder="082 123 4567"></label>
      <label class="fl"><span>Email</span><input class="in" name="email" type="email"></label>
      <div class="modal__foot full"><button type="button" class="btn btn--ghost" data-close>Cancel</button><button class="btn" type="submit">Create client</button></div>
    </form>`.s, (el, close) => {
    el.querySelector('#ncForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        const c = await createClient({ name: f.name.trim(), business: f.business.trim(), stage: 'lead',
          data: { whatsapp: f.whatsapp.trim(), email: f.email.trim(), source: 'referral' } });
        close();
        location.hash = `#/clients/${c.id}`;
      } catch (err) { toast(err.message, { error: true }); }
    });
  });
}
