// Document editor: black toolbar (client, status, save state, Print / PDF, share text, duplicate,
// type actions) above the white A4 page, which is exactly what prints.

import { makeCtx } from '../docs/create.js';
import { loadType, statusLabel, TYPES } from '../docs/registry.js';
import { waLink } from './client.js';
import { S, addActivity, client, clientName, createDoc, deleteDoc, getDoc, saveDoc } from '../store.js';
import { $, ask, clone, copyText, debounce, html, modal, money, num, toast, today, toCents } from '../ui.js';

export async function render(view, [id]) {
  view.innerHTML = '<div class="docwrap"><p class="mono muted" style="padding:24px">Loading…</p></div>';
  let doc;
  try { doc = await getDoc(id); }
  catch (e) { view.innerHTML = html`<div class="card">${e.message} <a href="#/documents">Back to documents</a></div>`.s; return; }
  const T = TYPES[doc.type];
  const mod = await loadType(doc.type);
  let ctx = makeCtx(doc.client_id);
  let saving = Promise.resolve();
  let dirty = false;
  let menuOpen = false;

  const clientOpts = () => [['', 'No client'], ...S.clients.map(c => [c.id, clientName(c)])];

  function frame() {
    view.innerHTML = html`
      <div class="docwrap">
        <div class="doctools">
          <div class="doctools__id"><a href="${doc.client_id ? `#/clients/${doc.client_id}` : '#/documents'}">← ${doc.client_id ? clientName(client(doc.client_id)).toUpperCase() : 'DOCUMENTS'}</a><b>${T.label} ${doc.number}</b></div>
          <select id="dClient" aria-label="Client">${clientOpts().map(([k, l]) => html`<option value="${k}" ${k === (doc.client_id || '') ? 'selected' : ''}>${l}</option>`)}</select>
          <select id="dStatus" aria-label="Status">${T.statuses.map(s => html`<option value="${s}" ${s === doc.status ? 'selected' : ''}>${statusLabel(doc.type, s)}</option>`)}</select>
          <span class="state" id="dState">SAVED</span>
          <span id="dActions"></span>
          <button type="button" class="btn btn--inv" id="dPrint">Print / PDF</button>
          <button type="button" class="btn btn--inv-ghost" id="dShare">Copy share text</button>
          <div class="docmenu">
            <button type="button" class="btn btn--inv-ghost" id="dMore" aria-haspopup="true" aria-expanded="false">More</button>
            <div class="docmenu__list" id="dMenu" hidden></div>
          </div>
        </div>
        ${mod.note ? html`<div class="docnote noprint">${mod.note}</div>` : ''}
        <main class="page" id="page"></main>
      </div>`.s;
    $('#dClient', view).addEventListener('change', onClientChange);
    $('#dStatus', view).addEventListener('change', onStatusChange);
    $('#dPrint', view).addEventListener('click', print);
    $('#dShare', view).addEventListener('click', share);
    $('#dMore', view).addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener('click', closeMenu);
    drawActions();
    drawPage();
  }

  function drawPage() {
    ctx = makeCtx(doc.client_id);
    mod.render($('#page', view), doc, ctx, changed);
  }

  // ---------- Saving ----------
  const state = (t, err = false) => { const el = $('#dState', view); if (el) { el.textContent = t; el.classList.toggle('is-err', err); } };

  function payload() {
    const data = doc.data;
    data._meta = { ...(mod.meta ? mod.meta(data, ctx) : {}) };
    const dateKey = mod.dateKey || 'date';
    const issued = /^\d{4}-\d{2}-\d{2}$/.test(data[dateKey] || '') ? data[dateKey] : doc.issued_on;
    return {
      client_id: doc.client_id, status: doc.status, issued_on: issued,
      amount_cents: mod.totals ? mod.totals(data).amount_cents : doc.amount_cents,
      paid_cents: doc.paid_cents, paid_on: doc.paid_on, data, version: doc.version,
    };
  }

  const save = debounce(() => {
    saving = saving.then(async () => {
      state('SAVING…');
      try {
        const saved = await saveDoc({ id: doc.id, ...payload() });
        doc.version = saved.version; doc.amount_cents = saved.amount_cents; doc.issued_on = saved.issued_on;
        dirty = false;
        state('SAVED');
      } catch (e) {
        if (e.status === 409) {
          toast('This document was changed on another device. Loading the latest version.', { error: true, ms: 5000 });
          doc = e.body.current; dirty = false; frame();
        } else { state('NOT SAVED', true); toast(e.message, { error: true }); }
      }
    });
  }, 700);

  function changed() { dirty = true; state('EDITING'); save(); }
  async function flush() { if (dirty) save.flush(); await saving; }

  // ---------- Toolbar ----------
  async function onClientChange(e) {
    doc.client_id = e.target.value || null;
    ctx = makeCtx(doc.client_id);
    if (mod.onClient && ctx.client && (await ask('Fill in the client details?', `Copy ${clientName(ctx.client)}'s name and details onto this ${T.short.toLowerCase()}?`, { ok: 'Fill in' }))) {
      mod.onClient(doc.data, ctx);
      drawPage();
    }
    changed();
    const back = view.querySelector('.doctools__id a');
    back.href = doc.client_id ? `#/clients/${doc.client_id}` : '#/documents';
    back.textContent = '← ' + (doc.client_id ? clientName(client(doc.client_id)).toUpperCase() : 'DOCUMENTS');
  }

  function onStatusChange(e) {
    const s = e.target.value;
    if (s === 'paid' && doc.type === 'invoice') { e.target.value = doc.status; markPaid(); return; }
    if (doc.status === 'paid' && s !== 'paid') { doc.paid_on = null; doc.paid_cents = 0; }
    doc.status = s;
    if (s === 'sent' && doc.client_id) addActivity(doc.client_id, `${T.short} ${doc.number} sent`, today()).catch(() => {});
    changed();
    drawPage();
  }

  function markPaid() {
    const due = mod.totals ? mod.totals(doc.data).amount_cents / 100 : 0;
    modal(html`
      <h2>Mark ${doc.number} as paid</h2>
      <form id="paidForm" class="form" style="margin-top:12px">
        <label class="fl"><span>Date paid</span><input class="in" type="date" name="on" value="${today()}" required></label>
        <label class="fl"><span>Amount received (R)</span><input class="in in--num" name="amt" inputmode="decimal" value="${due.toFixed(2)}"></label>
        <div class="modal__foot full"><button type="button" class="btn btn--ghost" data-close>Cancel</button><button class="btn" type="submit">Mark as paid</button></div>
      </form>`.s, (el, close) => {
      el.querySelector('#paidForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        doc.status = 'paid';
        doc.paid_on = f.get('on');
        doc.paid_cents = toCents(num(f.get('amt')));
        close();
        changed();
        await flush();
        if (doc.client_id) addActivity(doc.client_id, `Invoice ${doc.number} paid: ${money(doc.paid_cents / 100)}`, doc.paid_on).catch(() => {});
        frame();
        toast(`${doc.number} marked as paid`);
      });
    });
  }

  function drawActions() {
    const acts = [
      ...(doc.type === 'invoice' && doc.status !== 'paid' && doc.status !== 'void' ? [{ label: 'Mark as paid', run: markPaid }] : []),
      ...(mod.actions ? mod.actions(doc, ctx, { flush, rerender: drawPage, changed }) : []),
    ];
    $('#dActions', view).innerHTML = acts.map((a, i) => html`<button type="button" class="btn btn--inv-ghost" data-act="${i}">${a.label}</button>`.s).join('');
    $('#dActions', view).querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => acts[+b.dataset.act].run()));
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    const m = $('#dMenu', view);
    $('#dMore', view).setAttribute('aria-expanded', menuOpen);
    m.hidden = !menuOpen;
    if (!menuOpen) return;
    const wa = ctx.client?.data?.whatsapp ? waLink(ctx.client.data.whatsapp) : '';
    m.innerHTML = html`
      ${wa ? html`<button type="button" data-m="wa">Open WhatsApp with share text</button>` : ''}
      <button type="button" data-m="dup">Duplicate</button>
      <button type="button" data-m="del" class="danger">Delete…</button>`.s;
    m.querySelector('[data-m="dup"]').addEventListener('click', duplicate);
    m.querySelector('[data-m="del"]').addEventListener('click', remove);
    m.querySelector('[data-m="wa"]')?.addEventListener('click', () => {
      window.open(`${wa}?text=${encodeURIComponent(mod.share(doc, ctx))}`, '_blank', 'noopener');
    });
  }
  function closeMenu() { if (menuOpen) { menuOpen = false; const m = $('#dMenu', view); if (m) m.hidden = true; } }

  async function print() {
    await flush();
    document.activeElement?.blur?.();
    const prev = document.title;
    const who = ctx.client ? ' ' + clientName(ctx.client) : '';
    document.title = `${doc.number}${who} - KingMaker ${T.label}`.replace(/[\\/:*?"<>|]/g, '');
    window.print();
    setTimeout(() => { document.title = prev; }, 500);
  }

  async function share() {
    const text = mod.share ? mod.share(doc, ctx) : `Hi, here's ${T.label} ${doc.number} from KingMaker.`;
    if (await copyText(text)) toast('Copied. Paste it into WhatsApp with the PDF.');
    else modal(html`<h2>Share text</h2><textarea class="in" rows="6" style="margin-top:10px">${text}</textarea><div class="modal__foot"><button class="btn" data-close>Done</button></div>`.s);
  }

  async function duplicate() {
    closeMenu();
    await flush();
    const data = clone(doc.data);
    delete data._meta;
    const dateKey = mod.dateKey || 'date';
    if (dateKey in data) data[dateKey] = today();
    try {
      const copy = await createDoc({ type: doc.type, client_id: doc.client_id, status: 'draft', issued_on: today(), data,
        amount_cents: mod.totals ? mod.totals(data).amount_cents : 0 });
      toast(`Duplicated as ${copy.number}`);
      location.hash = `#/doc/${copy.id}`;
    } catch (e) { toast(e.message, { error: true }); }
  }

  async function remove() {
    closeMenu();
    const msg = doc.status === 'draft'
      ? `Delete ${doc.number}? This can't be undone.`
      : `${doc.number} is ${statusLabel(doc.type, doc.status).toLowerCase()}. Deleting it leaves a gap in your numbering; setting the status to Void keeps the record. Delete anyway?`;
    if (!(await ask('Delete document?', msg, { ok: 'Delete', danger: true }))) return;
    save.cancel();
    await deleteDoc(doc.id);
    toast(`${doc.number} deleted`);
    location.hash = doc.client_id ? `#/clients/${doc.client_id}` : '#/documents';
  }

  frame();
  return async () => { document.removeEventListener('click', closeMenu); await flush(); };
}
