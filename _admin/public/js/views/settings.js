// Settings: company details, bank (EFT), standard terms, numbering counters, backups.

import { get, post } from '../api.js';
import { S, load, saveCounters, saveSetting } from '../store.js';
import { $, $$, ask, autosize, download, html, num, toast } from '../ui.js';

const PREFIXES = [
  ['KM-A', 'Online Presence Audit'], ['KM-P', 'Proposal'], ['KM-Q', 'Quote'], ['KM-SA', 'Service Agreement'],
  ['KM-OQ', 'Onboarding Questionnaire'], ['KM-INV', 'Invoice'], ['KM-HO', 'Hand-over Pack'], ['KM-TC', 'Testimonial Consent'],
];

export function backupCard() {
  return html`
    <section class="card" id="backup">
      <div class="card__h"><h2>Backups</h2></div>
      <p class="muted" style="margin:0 0 12px">Export saves every client, document, price and setting to one JSON file. Import replaces everything in the admin with the contents of a file, all at once.</p>
      <div class="bar" style="margin:0">
        <button type="button" class="btn" id="exportBtn">Export everything (JSON)</button>
        <label class="btn btn--ghost" for="importFile">Import…</label>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
      </div>
    </section>`;
}

export function wireBackup(root) {
  $('#exportBtn', root).addEventListener('click', async () => {
    try {
      const data = await get('/export');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      download(`kingmaker-admin-${stamp}.json`, JSON.stringify(data, null, 2));
      toast('Export downloaded');
    } catch (e) { toast(e.message, { error: true }); }
  });
  $('#importFile', root).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); }
    catch { toast('That file is not valid JSON.', { error: true }); return; }
    const t = data?.tables || {};
    const n = (k) => (Array.isArray(t[k]) ? t[k].length : 0);
    const ok = await ask('Replace everything?',
      `This replaces all data in the admin with ${file.name}: ${n('clients')} clients, ${n('documents')} documents, ${n('activity')} activity entries and all settings. Export first if you want a copy of what's here now.`,
      { ok: 'Replace everything', danger: true });
    if (!ok) return;
    try {
      const res = await post('/import', data);
      await load();
      toast(`Imported ${res.counts.clients} clients and ${res.counts.documents} documents`);
      location.hash = '#/';
    } catch (err) { toast(err.message, { error: true, ms: 6000 }); }
  });
}

const input = (group, key, label, value, attrs = '') =>
  html`<label class="fl"><span>${label}</span><input class="in" data-g="${group}" data-k="${key}" value="${value ?? ''}" ${attrs}></label>`;

export async function render(view) {
  const c = S.settings.company || {}, b = S.settings.bank || {}, t = S.settings.terms || {};
  view.innerHTML = html`
    <div class="ph"><div><span class="ph__sec mono">§ 05 — SETTINGS</span><h1>Settings</h1></div>
      <div class="ph__actions"><button class="btn" type="button" id="saveAll">Save settings</button></div></div>

    <section class="card">
      <div class="card__h"><h2>Company</h2></div>
      <div class="form">
        ${input('company', 'legalName', 'Legal name', c.legalName)}
        ${input('company', 'tradingAs', 'Trading as', c.tradingAs)}
        ${input('company', 'regNo', 'Registration no.', c.regNo)}
        ${input('company', 'address', 'Registered address', c.address)}
        ${input('company', 'email', 'Email', c.email, 'type="email"')}
        ${input('company', 'website', 'Website', c.website)}
        ${input('company', 'whatsapp', 'WhatsApp (digits, e.g. 27821234567)', c.whatsapp, 'inputmode="numeric"')}
        ${input('company', 'maxActiveClients', 'Max active clients', c.maxActiveClients, 'inputmode="numeric"')}
        ${input('company', 'founder', 'Your name (signs documents)', c.founder)}
        ${input('company', 'founderTitle', 'Your title', c.founderTitle)}
      </div>
    </section>

    <section class="card">
      <div class="card__h"><h2>Bank details (EFT)</h2></div>
      <div class="form">
        ${input('bank', 'bank', 'Bank', b.bank)}
        ${input('bank', 'accountName', 'Account name', b.accountName)}
        ${input('bank', 'accountNo', 'Account no.', b.accountNo, 'inputmode="numeric"')}
        ${input('bank', 'branchCode', 'Branch code', b.branchCode, 'inputmode="numeric"')}
        ${input('bank', 'reference', 'Payment reference', b.reference)}
      </div>
      <p class="hint">New invoices copy these details in. Invoices you've already made keep the details they were made with.</p>
    </section>

    <section class="card">
      <div class="card__h"><h2>Standard terms</h2></div>
      <div class="form">
        <label class="fl full"><span>Payment terms (printed on invoices and quotes)</span><textarea class="in" data-g="terms" data-k="payment">${t.payment || ''}</textarea></label>
        ${input('terms', 'validityDays', 'Quotes and proposals valid for (days)', t.validityDays, 'inputmode="numeric"')}
        ${input('terms', 'depositPct', 'Deposit (%)', t.depositPct, 'inputmode="numeric"')}
      </div>
    </section>

    <section class="card">
      <div class="card__h"><h2>Numbering</h2></div>
      <p class="muted" style="margin:0 0 12px">The number the next new document of each type gets. If a number is already taken, the admin skips to the next free one.</p>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>DOCUMENT</th><th>PREFIX</th><th class="r">NEXT NUMBER</th><th class="r hide-sm">NEXT DOCUMENT</th></tr></thead>
        <tbody>${PREFIXES.map(([p, l]) => html`<tr>
          <td>${l}</td><td class="num">${p}</td>
          <td class="r"><input class="in in--sm in--num" style="width:90px" data-counter="${p}" value="${S.counters[p] || 1}" inputmode="numeric"></td>
          <td class="r num hide-sm" data-preview="${p}">${p}-${String(S.counters[p] || 1).padStart(4, '0')}</td></tr>`)}</tbody>
      </table></div>
    </section>

    ${backupCard()}

    <section class="card">
      <div class="card__h"><h2>Security</h2></div>
      <p class="muted" style="margin:0">Access is locked twice: Cloudflare Access (only your email) and the admin password. To change the password, run <span class="mono">npx wrangler secret put ADMIN_PASSWORD</span> in _admin/. That logs out every device.</p>
    </section>`.s;

  $$('[data-counter]', view).forEach(el => el.addEventListener('input', () => {
    $(`[data-preview="${el.dataset.counter}"]`, view).textContent = `${el.dataset.counter}-${String(Math.max(1, Math.round(num(el.value)))).padStart(4, '0')}`;
  }));

  $('#saveAll', view).addEventListener('click', async () => {
    const groups = { company: { ...S.settings.company }, bank: { ...S.settings.bank }, terms: { ...S.settings.terms } };
    $$('[data-g]', view).forEach(el => { groups[el.dataset.g][el.dataset.k] = el.value.trim(); });
    groups.company.maxActiveClients = Math.max(1, Math.round(num(groups.company.maxActiveClients)) || 3);
    groups.company.whatsapp = groups.company.whatsapp.replace(/\D/g, '');
    groups.terms.validityDays = Math.max(1, Math.round(num(groups.terms.validityDays)) || 14);
    groups.terms.depositPct = Math.min(100, Math.max(0, num(groups.terms.depositPct)));
    const counters = Object.fromEntries($$('[data-counter]', view).map(el => [el.dataset.counter, Math.max(1, Math.round(num(el.value)) || 1)]));
    try {
      await Promise.all([
        saveSetting('company', groups.company), saveSetting('bank', groups.bank), saveSetting('terms', groups.terms),
        saveCounters(counters),
      ]);
      toast('Settings saved');
    } catch (e) { toast(e.message, { error: true }); }
  });

  wireBackup(view);
  autosize(view);
}
