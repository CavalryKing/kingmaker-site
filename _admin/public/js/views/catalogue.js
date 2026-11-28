// Catalogue: packages, add-ons, The Court retainer, named discounts, and Publish prices.

import { get, post } from '../api.js';
import { S, catalogue, foundingUsed, saveSetting } from '../store.js';
import { $, $$, ask, autosize, clone, esc, html, num, rand, raw, toast } from '../ui.js';

const lines = (t) => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item';
const PHASES = [['sitdown', 'Sit-down'], ['blueprint', 'Blueprint'], ['build', 'Build'], ['handover', 'Hand-over']];

export async function render(view) {
  let cat = clone(catalogue());
  let dirty = false;

  const siteTag = (k) => (k ? html`<span class="chip chip--plain" title="Shown on the public site as data-price=&quot;${k}&quot;">SITE: ${k}</span>` : html`<span class="chip chip--plain">ADMIN ONLY</span>`);

  function draw() {
    view.innerHTML = html`
      <div class="ph">
        <div><span class="ph__sec mono">§ 04 — CATALOGUE</span><h1>Catalogue</h1></div>
        <div class="ph__actions"><span class="mono muted" id="dirty" style="align-self:center" ${dirty ? '' : 'hidden'}>UNSAVED CHANGES</span><button class="btn" id="saveCat" type="button">Save catalogue</button></div>
      </div>

      <section class="card" id="publish"><div class="card__h"><h2>Prices on the public site</h2></div><p class="muted" style="margin:0">Checking the live site…</p></section>

      <div class="div"><span class="mono">§ 01 — PACKAGES</span><i></i><b></b></div>
      ${cat.packages.map((p, i) => html`
        <div class="cat-item" data-pkg="${i}">
          <div class="cat-row">
            <label class="fl"><span>Name</span><input class="in" data-f="name" value="${p.name}"></label>
            <label class="fl"><span>Price (R)</span><input class="in in--num" data-f="price" inputmode="numeric" value="${p.price}"></label>
            <div style="align-self:end;padding-bottom:6px">${siteTag(p.siteKey)}</div>
          </div>
          <div class="form" style="margin-top:10px">
            <label class="fl"><span>Tagline</span><input class="in" data-f="tagline" value="${p.tagline}"></label>
            <label class="chk" style="align-self:end;padding-bottom:8px"><input type="checkbox" data-f="instalments" ${p.instalments ? 'checked' : ''}> Instalments allowed</label>
            <label class="fl full list-edit"><span>Deliverables (one per line)</span><textarea class="in" data-f="deliverables">${(p.deliverables || []).join('\n')}</textarea></label>
          </div>
          <div class="form form--3" style="margin-top:10px;grid-template-columns:repeat(4,minmax(0,1fr))">
            ${PHASES.map(([k, l]) => html`<label class="fl"><span>${l}</span><input class="in in--sm" data-t="${k}" value="${p.timeline?.[k] || ''}"></label>`)}
          </div>
        </div>`)}

      <div class="div"><span class="mono">§ 02 — ADD-ONS</span><i></i><b></b></div>
      ${cat.addons.map((a, i) => html`
        <div class="cat-item" data-addon="${i}">
          <div class="cat-row">
            <label class="fl"><span>Name</span><input class="in" data-f="name" value="${a.name}"></label>
            <label class="fl"><span>Price (R)</span><input class="in in--num" data-f="price" inputmode="numeric" value="${a.price}"></label>
            <div style="align-self:end;display:flex;gap:6px;align-items:center;padding-bottom:4px">${siteTag(a.siteKey)}${a.siteKey ? '' : raw(`<button type="button" class="x" data-rm-addon="${i}" aria-label="Remove ${esc(a.name)}">×</button>`)}</div>
          </div>
          <label class="fl" style="margin-top:8px"><span>Description</span><input class="in" data-f="desc" value="${a.desc || ''}"></label>
          <label class="chk" style="margin-top:8px"><input type="checkbox" data-f="from" ${a.from ? 'checked' : ''}> Shown as “from” price</label>
        </div>`)}
      <button type="button" class="btn btn--ghost btn--sm" id="addAddon" style="margin-top:10px">+ Add-on</button>
      <p class="hint">New add-ons are admin-only (for quotes and invoices). Only the four add-ons with a SITE tag appear on the public site.</p>

      <div class="div"><span class="mono">§ 03 — RETAINER</span><i></i><b></b></div>
      <div class="cat-item" id="retainer">
        <div class="cat-row">
          <label class="fl"><span>Name</span><input class="in" data-f="name" value="${cat.retainer.name}"></label>
          <label class="fl"><span>Price per month (R)</span><input class="in in--num" data-f="price" inputmode="numeric" value="${cat.retainer.price}"></label>
          <div style="align-self:end;padding-bottom:6px">${siteTag(cat.retainer.siteKey)}</div>
        </div>
        <label class="fl list-edit"><span>What's included (one per line)</span><textarea class="in" data-f="includes">${(cat.retainer.includes || []).join('\n')}</textarea></label>
      </div>

      <div class="div"><span class="mono">§ 04 — NAMED DISCOUNTS</span><i></i><b></b></div>
      ${cat.discounts.map((d, i) => html`
        <div class="cat-item" data-disc="${i}">
          <div class="cat-row cat-row--disc">
            <label class="fl"><span>Name</span><input class="in" data-f="name" value="${d.name}"></label>
            <label class="fl"><span>Percent</span><input class="in in--num" data-f="pct" inputmode="decimal" value="${d.pct}"></label>
            <label class="fl"><span>Limit (0 = none)</span><input class="in in--num" data-f="limit" inputmode="numeric" value="${d.limit || 0}"></label>
            <div style="align-self:end;padding-bottom:4px">${['founding', 'royal'].includes(d.id) ? '' : raw(`<button type="button" class="x" data-rm-disc="${i}" aria-label="Remove ${esc(d.name)}">×</button>`)}</div>
          </div>
          <label class="fl" style="margin-top:8px"><span>Note</span><input class="in" data-f="note" value="${d.note || ''}"></label>
          ${d.id === 'founding' ? html`<p class="hint">Used by <b>${foundingUsed()}</b> of ${d.limit || 3} clients (tick “Founding client” on a client record).</p>` : ''}
        </div>`)}
      <button type="button" class="btn btn--ghost btn--sm" id="addDisc" style="margin-top:10px">+ Discount</button>
    `.s;
    wire();
    autosize(view);
    loadPublish();
  }

  /** Read the form back into cat. */
  function collect() {
    $$('[data-pkg]', view).forEach(el => {
      const p = cat.packages[+el.dataset.pkg];
      p.name = $('[data-f=name]', el).value.trim();
      p.price = Math.round(num($('[data-f=price]', el).value));
      p.tagline = $('[data-f=tagline]', el).value.trim();
      p.instalments = $('[data-f=instalments]', el).checked;
      p.deliverables = lines($('[data-f=deliverables]', el).value);
      p.timeline = Object.fromEntries(PHASES.map(([k]) => [k, $(`[data-t=${k}]`, el).value.trim()]));
    });
    $$('[data-addon]', view).forEach(el => {
      const a = cat.addons[+el.dataset.addon];
      a.name = $('[data-f=name]', el).value.trim();
      a.price = Math.round(num($('[data-f=price]', el).value));
      a.desc = $('[data-f=desc]', el).value.trim();
      a.from = $('[data-f=from]', el).checked;
    });
    const r = $('#retainer', view);
    cat.retainer.name = $('[data-f=name]', r).value.trim();
    cat.retainer.price = Math.round(num($('[data-f=price]', r).value));
    cat.retainer.includes = lines($('[data-f=includes]', r).value);
    $$('[data-disc]', view).forEach(el => {
      const d = cat.discounts[+el.dataset.disc];
      d.name = $('[data-f=name]', el).value.trim();
      d.pct = Math.min(100, Math.max(0, num($('[data-f=pct]', el).value)));
      d.limit = Math.max(0, Math.round(num($('[data-f=limit]', el).value)));
      d.note = $('[data-f=note]', el).value.trim();
    });
  }

  function markDirty() { dirty = true; const d = $('#dirty', view); if (d) d.hidden = false; }

  function wire() {
    view.addEventListener('input', markDirty);
    $('#saveCat', view).addEventListener('click', save);
    $('#addAddon', view).addEventListener('click', () => {
      collect();
      cat.addons.push({ id: 'a-' + Date.now().toString(36), siteKey: '', name: 'New add-on', price: 0, from: false, desc: '' });
      dirty = true; draw();
    });
    $('#addDisc', view).addEventListener('click', () => {
      collect();
      cat.discounts.push({ id: 'd-' + Date.now().toString(36), name: 'New discount', pct: 10, limit: 0, note: '' });
      dirty = true; draw();
    });
    $$('[data-rm-addon]', view).forEach(b => b.addEventListener('click', () => { collect(); cat.addons.splice(+b.dataset.rmAddon, 1); dirty = true; draw(); }));
    $$('[data-rm-disc]', view).forEach(b => b.addEventListener('click', () => { collect(); cat.discounts.splice(+b.dataset.rmDisc, 1); dirty = true; draw(); }));
  }

  async function save() {
    collect();
    if (cat.addons.some(a => !a.name) || cat.packages.some(p => !p.name)) { toast('Every item needs a name.', { error: true }); return; }
    cat.addons.forEach(a => { if (!a.id) a.id = slug(a.name); });
    try {
      await saveSetting('catalogue', cat);
      dirty = false;
      toast('Catalogue saved');
      draw();
    } catch (e) { toast(e.message, { error: true }); }
  }

  async function loadPublish() {
    const box = $('#publish', view);
    let st;
    try { st = await get('/publish/status'); }
    catch (e) { box.querySelector('p').textContent = e.message; return; }
    if (!box.isConnected) return;
    const last = st.last ? html`<p class="hint">Last published ${new Date(st.last.at).toLocaleString('en-ZA')} (commit <span class="mono">${st.last.sha.slice(0, 7)}</span>).</p>` : '';
    box.innerHTML = html`
      <div class="card__h"><h2>Prices on the public site</h2>
        <button type="button" class="btn ${st.diff.length ? '' : 'btn--ghost'}" id="pubBtn" ${st.configured ? '' : 'disabled'}>Publish prices to the site</button></div>
      ${st.error ? html`<p class="warn">${st.error}</p>` : st.diff.length
        ? html`<p style="margin:0 0 8px">The live site differs from the saved catalogue:</p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>KEY</th><th class="r">ON THE SITE</th><th class="r">IN THE CATALOGUE</th></tr></thead>
          <tbody>${st.diff.map(d => html`<tr><td class="num">${d.key}</td><td class="r num">${d.site == null ? '—' : rand(d.site)}</td><td class="r num strong">${rand(d.admin)}</td></tr>`)}</tbody></table></div>`
        : html`<p class="muted" style="margin:0">The live site shows exactly the catalogue's prices.</p>`}
      ${st.configured ? '' : html`<p class="warn" style="margin-top:10px">Publishing isn't set up yet. Add the <b>GITHUB_TOKEN</b> secret to the Worker (steps in _admin/README.md).</p>`}
      <p class="hint">Publishing makes one commit to the site repo (site.js and the price fallbacks in the HTML). GitHub Pages shows it within a minute or two. Save the catalogue first.</p>
      ${last}`.s;
    $('#pubBtn', box)?.addEventListener('click', async () => {
      if (dirty) { toast('Save the catalogue first.', { error: true }); return; }
      if (!(await ask('Publish prices?', 'This commits the catalogue prices to the public site on GitHub. It goes live in a minute or two.', { ok: 'Publish' }))) return;
      try {
        const r = await post('/publish');
        toast(r.changed ? 'Published. The site updates in a minute or two.' : 'Nothing to change: the site already matches.');
        loadPublish();
      } catch (e) { toast(e.message, { error: true, ms: 7000 }); }
    });
  }

  draw();
  return () => {
    if (dirty && confirm('Save your catalogue changes before leaving? (Cancel discards them.)')) {
      collect(); return saveSetting('catalogue', cat).then(() => toast('Catalogue saved')).catch(e => toast(e.message, { error: true }));
    }
  };
}
