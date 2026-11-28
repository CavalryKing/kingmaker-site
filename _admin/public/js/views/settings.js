// Settings: backups (export/import). Company, bank, terms and numbering are added with the Catalogue module.

import { get, post } from '../api.js';
import { load } from '../store.js';
import { $, ask, download, html, toast } from '../ui.js';

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

export async function render(view) {
  view.innerHTML = html`
    <div class="ph"><div><span class="ph__sec mono">§ 05 · SETTINGS</span><h1>Settings</h1></div></div>
    ${backupCard()}`.s;
  wireBackup(view);
}
