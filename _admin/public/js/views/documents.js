// Documents: every sales-kit document, filterable by type and status.

import { newDocument } from '../docs/create.js';
import { statusLabel, TYPE_IDS, TYPES } from '../docs/registry.js';
import { S, client, clientName } from '../store.js';
import { $, html, modal, money, shortDate } from '../ui.js';

export async function render(view, _p, query) {
  let type = query.get('type') || 'all';
  let status = 'all';
  let q = '';

  view.innerHTML = html`
    <div class="ph"><div><span class="ph__sec mono">§ 03 — DOCUMENTS</span><h1>Documents</h1></div>
      <div class="ph__actions"><button class="btn" type="button" id="newDoc">+ New document</button></div></div>
    <div class="bar"><input class="in grow" type="search" id="q" placeholder="Search number or client…" aria-label="Search documents">
      <select class="in" id="status" aria-label="Status" style="width:auto">
        <option value="all">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option>
        <option value="accepted">Accepted / Signed</option><option value="paid">Paid</option><option value="void">Void</option>
      </select></div>
    <div class="bar"><div class="seg" id="types" role="group" aria-label="Type"></div></div>
    <div id="list"></div>`.s;

  function drawTypes() {
    $('#types', view).innerHTML = [['all', 'ALL'], ...TYPE_IDS.map(t => [t, TYPES[t].short.toUpperCase()])]
      .map(([k, l]) => html`<button type="button" data-type="${k}" aria-pressed="${type === k}">${l}</button>`.s).join('');
  }

  function drawList() {
    const needle = q.toLowerCase();
    const rows = S.documents
      .filter(d => type === 'all' || d.type === type)
      .filter(d => status === 'all' || d.status === status)
      .filter(d => !needle || [d.number, clientName(client(d.client_id)), d.meta?.client, d.meta?.title].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => (b.issued_on || '').localeCompare(a.issued_on || '') || b.number.localeCompare(a.number));
    $('#list', view).innerHTML = rows.length ? docTable(rows).s
      : html`<div class="tbl-wrap"><p class="empty">${S.documents.length ? 'No documents match.' : 'No documents yet.'}</p></div>`.s;
  }

  view.addEventListener('click', (e) => {
    const t = e.target.closest('[data-type]');
    if (t) { type = t.dataset.type; drawTypes(); drawList(); return; }
    const row = e.target.closest('tr[data-doc]');
    if (row) location.hash = `#/doc/${row.dataset.doc}`;
  });
  $('#q', view).addEventListener('input', (e) => { q = e.target.value; drawList(); });
  $('#status', view).addEventListener('change', (e) => { status = e.target.value; drawList(); });
  $('#newDoc', view).addEventListener('click', () => newDocModal(type === 'all' ? null : type));

  drawTypes();
  drawList();
  if (query.get('new')) newDocModal(query.get('new'));
}

export function docTable(rows, { dark = false } = {}) {
  return html`
    <div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>DOCUMENT</th><th>CLIENT</th><th class="hide-sm">DATE</th><th class="r hide-sm">AMOUNT</th><th class="r">STATUS</th></tr></thead>
      <tbody>${rows.map(d => html`
        <tr class="rowlink" data-doc="${d.id}">
          <td><span class="strong">${TYPES[d.type].short}</span><span class="sub num">${d.number}</span></td>
          <td>${clientName(client(d.client_id)) || d.meta?.client || '—'}</td>
          <td class="num hide-sm">${shortDate(d.issued_on)}</td>
          <td class="r num hide-sm">${['invoice', 'quote', 'proposal'].includes(d.type) ? money(d.amount_cents / 100) : (d.type === 'audit' && d.meta?.score != null ? `${d.meta.score}/100` : '')}</td>
          <td class="r"><span class="chip chip--${d.status}">${statusLabel(d.type, d.status)}</span></td>
        </tr>`)}</tbody>
    </table></div>`;
}

export function newDocModal(presetType = null) {
  modal(html`
    <h2>New document</h2>
    <form id="ndForm" class="form" style="margin-top:12px">
      <label class="fl"><span>Type</span><select class="in" name="type">${TYPE_IDS.map(t => html`<option value="${t}" ${t === presetType ? 'selected' : ''}>${TYPES[t].prefix} — ${TYPES[t].label}</option>`)}</select></label>
      <label class="fl"><span>Client</span><select class="in" name="client"><option value="">No client yet</option>${S.clients.map(c => html`<option value="${c.id}">${clientName(c)}</option>`)}</select></label>
      <p class="hint full" style="margin:0">Picking a client fills in their details. You can also start from the client's record.</p>
      <div class="modal__foot full"><button type="button" class="btn btn--ghost" data-close>Cancel</button><button class="btn" type="submit">Create</button></div>
    </form>`.s, (el, close) => {
    el.querySelector('#ndForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      e.target.querySelector('[type=submit]').disabled = true;
      try { close(); await newDocument(f.get('type'), f.get('client') || null); } catch { /* toast shown */ }
    });
  });
}
