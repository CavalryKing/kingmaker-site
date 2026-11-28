// Client record: details (autosaved), linked documents, new documents pre-filled from this client,
// and the dated activity log.

import { newDocument } from '../docs/create.js';
import { statusLabel, TYPE_IDS, TYPES } from '../docs/registry.js';
import {
  S, SOURCES, STAGES, activityFor, addActivity, catalogue, client, clientName, deleteActivity, deleteClient,
  docsFor, foundingLimit, foundingUsed, saveClient, stageLabel,
} from '../store.js';
import { $, $$, ask, autosize, debounce, html, money, num, rand, shortDate, toast, today } from '../ui.js';

const FIELDS = [
  ['name', 'Contact name', 'top'], ['business', 'Business', 'top'],
  ['whatsapp', 'WhatsApp', 'data', 'inputmode="tel"'], ['email', 'Email', 'data', 'type="email"'],
  ['website', 'Website', 'data'], ['location', 'Location', 'data'],
  ['instagram', 'Instagram', 'data'], ['facebook', 'Facebook', 'data'],
  ['tiktok', 'TikTok', 'data'], ['otherSocial', 'Other socials', 'data'],
];

export const waLink = (n) => {
  let d = String(n || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '27' + d.slice(1);
  return d ? `https://wa.me/${d}` : '';
};

export async function render(view, [id]) {
  let c = client(id);
  if (!c) { view.innerHTML = html`<div class="card">Client not found. <a href="#/clients">Back to clients</a></div>`.s; return; }
  let saving = Promise.resolve();
  let pending = false;

  const cat = catalogue();
  const sel = (name, opts, val) => html`<select class="in" data-k="${name}">${opts.map(([k, l]) => html`<option value="${k}" ${String(val ?? '') === k ? 'selected' : ''}>${l}</option>`)}</select>`;

  view.innerHTML = html`
    <div class="ph">
      <div><span class="ph__sec mono"><a href="#/clients" style="text-decoration:none">§ 02 — CLIENTS</a></span><h1 id="title">${clientName(c)}</h1></div>
      <div class="ph__actions"><span class="mono muted" id="saveState" style="align-self:center"></span>
        ${c.data?.whatsapp ? html`<a class="btn btn--ghost" href="${waLink(c.data.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        ${c.data?.email ? html`<a class="btn btn--ghost" href="mailto:${c.data.email}">Email</a>` : ''}
      </div>
    </div>
    <div class="rec">
      <div>
        <section class="card" id="details">
          <div class="card__h"><h2>Details</h2></div>
          <div class="form">
            ${FIELDS.map(([k, l, where, attrs]) => html`<label class="fl"><span>${l}</span><input class="in" data-k="${k}" ${attrs ? { __raw: true, s: attrs } : ''} value="${where === 'top' ? c[k] : (c.data?.[k] ?? '')}"></label>`)}
          </div>
        </section>
        <section class="card">
          <div class="card__h"><h2>Deal</h2></div>
          <div class="form form--3">
            <label class="fl"><span>Stage</span>${sel('stage', STAGES, c.stage)}</label>
            <label class="fl"><span>Source</span>${sel('source', [['', '—'], ...SOURCES], c.data?.source)}</label>
            <label class="fl"><span>Package</span>${sel('package', [['', '—'], ...cat.packages.map(p => [p.id, `${p.name} (${rand(p.price)})`])], c.data?.package)}</label>
            <label class="fl"><span>Value (R)</span><input class="in in--num" data-k="value" inputmode="decimal" value="${c.data?.value ?? ''}"></label>
            <label class="fl"><span>Discount applied</span>${sel('discount', [['', 'None'], ...cat.discounts.map(d => [d.id, `${d.name} (${d.pct}%)`])], c.data?.discount)}</label>
            <label class="fl"><span>Retainer (R / month)</span><input class="in in--num" data-k="retainerAmount" inputmode="decimal" value="${c.data?.retainerAmount ?? ''}" placeholder="${cat.retainer?.price ?? ''}"></label>
            <label class="chk"><input type="checkbox" data-k="founding" ${c.data?.founding ? 'checked' : ''}> Founding client</label>
            <label class="chk"><input type="checkbox" data-k="retainer" ${c.data?.retainer ? 'checked' : ''}> ${cat.retainer?.name || 'Retainer'} active</label>
          </div>
          <p class="hint" id="foundingHint"></p>
          <label class="fl" style="margin-top:12px"><span>Notes</span><textarea class="in" data-k="notes">${c.data?.notes ?? ''}</textarea></label>
        </section>
        <section class="card">
          <div class="card__h"><h2>Activity</h2></div>
          <form class="bar" id="actForm" style="margin-bottom:6px">
            <input class="in in--sm" type="date" id="actDate" value="${today()}" style="width:150px" aria-label="Date">
            <input class="in in--sm grow" id="actText" placeholder="What happened? e.g. Sent the audit on WhatsApp" aria-label="Activity">
            <button class="btn btn--sm" type="submit">Add</button>
          </form>
          <ul class="log" id="log"></ul>
        </section>
        <div style="margin-top:16px"><button type="button" class="btn btn--danger btn--sm" id="delClient">Delete client</button></div>
      </div>
      <div>
        <section class="card">
          <div class="card__h"><h2>Documents</h2></div>
          <div id="docs"></div>
          <div class="mono muted" style="margin:14px 0 8px">NEW DOCUMENT FOR THIS CLIENT</div>
          <div class="newdoc">${TYPE_IDS.map(t => html`<button type="button" data-new="${t}"><small>${TYPES[t].prefix}</small>${TYPES[t].short}</button>`)}</div>
        </section>
      </div>
    </div>`.s;
  autosize(view);

  function drawDocs() {
    const docs = docsFor(c.id).sort((a, b) => TYPES[a.type].n - TYPES[b.type].n || b.number.localeCompare(a.number));
    $('#docs', view).innerHTML = docs.length ? html`<div class="tbl-wrap"><table class="tbl"><tbody>${docs.map(d => html`
      <tr class="rowlink" data-doc="${d.id}"><td><span class="strong">${TYPES[d.type].short}</span><span class="sub num">${d.number}</span></td>
      <td class="r">${['invoice', 'quote', 'proposal'].includes(d.type) && d.amount_cents ? html`<span class="num">${money(d.amount_cents / 100)}</span><br>` : ''}<span class="chip chip--${d.status}">${statusLabel(d.type, d.status)}</span></td></tr>`)}</tbody></table></div>`.s
      : '<p class="muted" style="margin:0">No documents yet.</p>';
  }

  function drawLog() {
    const items = activityFor(c.id);
    $('#log', view).innerHTML = items.length ? items.map(a => html`<li><time datetime="${a.on_date}">${shortDate(a.on_date)}</time><span>${a.text}</span><button type="button" class="x" data-del-act="${a.id}" aria-label="Delete entry">×</button></li>`.s).join('')
      : '<li><span></span><span class="muted">Nothing logged yet.</span></li>';
  }

  function drawFounding() {
    const used = foundingUsed(), limit = foundingLimit();
    const over = used > limit;
    $('#foundingHint', view).innerHTML = html`Founding client spots: <b>${used}</b> of ${limit} used${over ? ' (over the limit!)' : ''}.`.s;
    $('#foundingHint', view).style.color = over ? 'var(--red)' : '';
  }

  function readForm() {
    const next = { ...c, data: { ...c.data } };
    $$('[data-k]', view).forEach(el => {
      const k = el.dataset.k;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (k === 'value' || k === 'retainerAmount') v = v === '' ? '' : num(v);
      if (k === 'name' || k === 'business' || k === 'stage') next[k] = typeof v === 'string' ? v.trim() : v;
      else next.data[k] = typeof v === 'string' && k !== 'notes' ? v.trim() : v;
    });
    return next;
  }

  const state = (t) => { const el = $('#saveState', view); if (el) el.textContent = t; };

  const save = debounce(() => {
    saving = saving.then(async () => {
      const next = readForm();
      const stageFrom = c.stage;
      try {
        state('SAVING…');
        c = await saveClient(next);
        pending = false;
        state('SAVED');
        $('#title', view).textContent = clientName(c);
        if (stageFrom !== c.stage) {
          await addActivity(c.id, `Stage: ${stageLabel(stageFrom)} → ${stageLabel(c.stage)}`, today());
          drawLog();
        }
      } catch (e) {
        if (e.status === 409) {
          state('');
          toast('This client was changed on another device. Reloading their latest details.', { error: true, ms: 5000 });
          Object.assign(S.clients.find(x => x.id === c.id) || {}, e.body.current);
          pending = false;
          render(view, [id]);
        } else { state('NOT SAVED'); toast(e.message, { error: true }); }
      }
    });
  }, 600);

  view.addEventListener('input', (e) => { if (e.target.closest('#details, .card') && e.target.dataset.k) { pending = true; state('EDITING'); save(); } });
  view.addEventListener('change', (e) => {
    if (!e.target.dataset.k) return;
    if (e.target.dataset.k === 'founding') {
      if (e.target.checked && foundingUsed() >= foundingLimit()) toast(`All ${foundingLimit()} founding client spots are used.`, { error: true });
      setTimeout(drawFounding, 700);
    }
    pending = true; save.flush();
  });

  $('#actForm', view).addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('#actText', view).value.trim();
    if (!text) return;
    try { await addActivity(c.id, text, $('#actDate', view).value || today()); $('#actText', view).value = ''; drawLog(); }
    catch (err) { toast(err.message, { error: true }); }
  });

  view.addEventListener('click', async (e) => {
    const n = e.target.closest('[data-new]');
    if (n) {
      if (pending) save.flush();
      await saving;
      n.disabled = true;
      try { await newDocument(n.dataset.new, c.id); } catch { n.disabled = false; }
      return;
    }
    const d = e.target.closest('[data-doc]');
    if (d) { location.hash = `#/doc/${d.dataset.doc}`; return; }
    const a = e.target.closest('[data-del-act]');
    if (a) { await deleteActivity(a.dataset.delAct); drawLog(); return; }
  });

  $('#delClient', view).addEventListener('click', async () => {
    const n = docsFor(c.id).length;
    if (!(await ask(`Delete ${clientName(c)}?`, `This deletes the client and their activity log.${n ? ` Their ${n} document${n > 1 ? 's stay' : ' stays'} in Documents without a client.` : ''}`, { ok: 'Delete client', danger: true }))) return;
    await deleteClient(c.id);
    toast('Client deleted');
    location.hash = '#/clients';
  });

  drawDocs(); drawLog(); drawFounding();
  return async () => { if (pending) save.flush(); await saving; };
}
