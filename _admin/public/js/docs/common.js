// Building blocks shared by every document page: logo, bands, footer, editable fields,
// line items with totals, the catalogue picker and signature blocks.

import { esc, html, longDate, modal, money, num, raw, round2 } from '../ui.js';

// ---------- Brand marks (copied from the prototypes) ----------
const ICON_PATH = 'M115.89 0.00 L22.20 122.73 L22.20 72.24 L36.60 87.99 L50.10 70.29 L0.00 20.29 L0.00 185.79 L22.20 185.79 L22.20 158.29 L115.13 38.37 L146.80 89.89 L162.60 74.99 Z M231.00 20.09 L117.20 134.19 L131.50 150.49 L209.00 72.57 L209.00 151.33 L184.20 111.29 L169.10 126.39 L205.80 185.79 L231.00 185.79 Z M76.80 103.39 L63.80 120.69 L117.00 185.79 L147.70 185.79 Z M87.50 164.59 L66.20 185.79 L104.96 185.79 Z';
let clipN = 0;
export function logo() {
  const id = 'kmcap' + (++clipN);
  const s = (d, x) => `<path clip-path="url(#${id})" d="${d}" transform="translate(${x} 0)" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linejoin="miter" stroke-miterlimit="10" stroke-linecap="butt"/>`;
  return raw(`<svg class="logo" viewBox="-8.00 -17.00 571.52 85.00" role="img" aria-label="KingMaker"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><rect x="-50" y="0" width="2000" height="60"/></clipPath></defs>`
    + s('M0 0 V60 M0 38 L25.47 -6 M11 19 L38.51 66', '4.50') + s('M0 0 V60', '61.00') + s('M0 60 V0 L35 60 V0', '84.00')
    + s('M49.5 13.6 A25.5 25.5 0 1 0 55.5 30 H32', '137.50')
    + `<g transform="translate(211.50 -12) scale(0.38753)"><path d="${ICON_PATH}" fill="#FFFFFF"/><circle cx="115.89" cy="0.00" r="7" fill="#C9A24A"/></g>`
    + s('M-3.46 66 L34.6 0 L72.76 66 M11.5 40 H57.7', '316.02') + s('M0 0 V60 M0 38 L25.47 -6 M11 19 L38.51 66', '406.52')
    + s('M38 4.5 H0 V55.5 H38 M0 30 H30', '463.02') + s('M0 60 V4.5 H22 A12.75 12.75 0 0 1 22 30 H0 M18 30 L38.4 66', '519.52') + '</svg>');
}
export const icon = () => raw(`<svg viewBox="-4.00 -9.00 239.00 198.79" aria-hidden="true"><path d="${ICON_PATH}" fill="#FFFFFF"/><circle cx="115.89" cy="0.00" r="7" fill="#C9A24A"/></svg>`);

export const decoSmall = () => raw('<svg class="deco" viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="130" fill="none" stroke="#3A3A3A" stroke-dasharray="4 6"/><circle cx="140" cy="140" r="80" fill="none" stroke="#262626"/><line x1="0" y1="140" x2="280" y2="140" stroke="#222"/><line x1="140" y1="0" x2="140" y2="280" stroke="#222"/><circle cx="60" cy="200" r="34" fill="none" stroke="#2E2E2E"/><circle cx="140" cy="10" r="4" fill="#C9A24A"/></svg>');
export const decoTall = () => raw('<svg class="deco" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" fill="none" stroke="#3A3A3A" stroke-dasharray="4 6"/><circle cx="150" cy="150" r="90" fill="none" stroke="#2A2A2A"/><line x1="0" y1="150" x2="300" y2="150" stroke="#222"/><line x1="150" y1="0" x2="150" y2="300" stroke="#222"/><circle cx="150" cy="10" r="5" fill="#C9A24A"/></svg>');

// ---------- Fields ----------
/** Editable text bound to a data path. opts: ph, cls, tag, style. */
export function F(path, ph = '', cls = '', tag = 'div', style = '') {
  return raw(`<${tag} class="field ${cls}" contenteditable="plaintext-only" spellcheck="true" data-k="${esc(path)}" data-ph="${esc(ph)}"${style ? ` style="${esc(style)}"` : ''}></${tag}>`);
}
/** Editable money amount (R1,234.00), stored as a number. */
export function M(path, cls = '') {
  return raw(`<span class="field inline ${cls}" contenteditable="plaintext-only" inputmode="decimal" data-money data-k="${esc(path)}" data-ph="R0.00"></span>`);
}
/** A date shown long-form; click opens the date picker. */
export function D(path, ph = 'Pick a date', cls = '') {
  return raw(`<span class="field datef ${cls}" tabindex="0" role="button" data-date="${esc(path)}" data-ph="${esc(ph)}"></span>`);
}

export function getPath(o, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}
export function setPath(o, path, v) {
  const ks = path.split('.');
  let cur = o;
  ks.slice(0, -1).forEach((k, i) => { if (cur[k] == null) cur[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; cur = cur[k]; });
  cur[ks[ks.length - 1]] = v;
}

/** Read text from a contenteditable without the trailing newline browsers add. */
export const textOf = (el) => el.innerText.replace(/\n$/, '');

/** Fill and wire every [data-k] and [data-date] inside root. onChange(path) after each edit. */
export function bindFields(root, data, onChange) {
  root.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    const v = getPath(data, k);
    const isMoney = 'money' in el.dataset;   // shown as R1,234.00, stored as a number
    el.textContent = isMoney ? money(num(v)) : (v == null ? '' : String(v));
    if (isMoney) el.addEventListener('blur', () => { el.textContent = money(num(getPath(data, k))); });
    el.addEventListener('input', () => {
      setPath(data, k, isMoney ? num(textOf(el)) : textOf(el));
      if (!el.textContent) el.innerHTML = ''; // so :empty placeholders come back
      // Keep other elements bound to the same path in step (e.g. the business name in two places).
      root.querySelectorAll(`[data-k="${CSS.escape(k)}"]`).forEach(o => { if (o !== el) o.textContent = getPath(data, k) ?? ''; });
      onChange(k);
    });
  });
  root.querySelectorAll('[data-date]').forEach(el => {
    const k = el.dataset.date;
    const show = () => { el.textContent = longDate(getPath(data, k)) || ''; };
    show();
    const open = () => {
      const inp = document.createElement('input');
      inp.type = 'date';
      inp.value = getPath(data, k) || '';
      inp.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:50%;top:40%';
      document.body.appendChild(inp);
      inp.addEventListener('change', () => { if (inp.value) { setPath(data, k, inp.value); show(); onChange(k); } });
      inp.addEventListener('blur', () => setTimeout(() => inp.remove(), 300));
      try { inp.showPicker(); } catch { inp.focus(); inp.click(); }
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ---------- Layout pieces ----------
/** The page skeleton. The tfoot spacer keeps text clear of the footer on every printed page. */
export function pageShell(inner, footRight, ctx) {
  const c = ctx.company;
  const left = `${c.legalName || ''} T/A ${c.tradingAs || 'KingMaker'} · REG. NO. ${c.regNo || ''}`.toUpperCase();
  return html`
    <table class="pt"><thead><tr><td><div class="head-space"></div></td></tr></thead><tbody><tr><td>${raw(inner)}</td></tr></tbody><tfoot><tr><td><div class="foot-space"></div></td></tr></tfoot></table>
    <footer class="foot">${icon()}<span>${left}</span><span>${footRight}</span></footer>`.s;
}

/** Black band with logo + title on the left and a key/value list on the right (invoice style). */
export function bandKV(title, rows) {
  return html`
    <header class="band">
      ${decoSmall()}
      <div style="position:relative">${logo()}<h1>${title}</h1></div>
      <div class="right"><div class="kv">${rows.map(([k, v]) => html`<span class="k">${k}</span>${v}`)}</div></div>
    </header>`.s;
}

/** Tall band (audit style): logo, kicker, title, subtitle. */
export function bandTall(kicker, title, sub) {
  return html`
    <header class="band band--tall">
      ${decoTall()}
      ${logo()}
      <div class="mono kicker">${kicker}</div>
      <h1 style="position:relative">${title}</h1>
      ${sub ? html`<p class="sub">${sub}</p>` : ''}
    </header>`.s;
}

export const divider = (label, style = '') => html`<div class="div"${style ? raw(` style="${esc(style)}"`) : ''}><span class="mono muted">${label}</span><i></i><b></b></div>`;

export function fromBlock(ctx) {
  const c = ctx.company;
  return html`
    <span class="lab mono muted">FROM</span>
    <div class="name">${c.legalName} t/a ${c.tradingAs}</div>
    <div class="ln">Reg. No. ${c.regNo}<br>${c.address}<br>${c.email} · ${c.website}</div>`;
}

// ---------- Money / line items ----------
export const lineTotal = (it) => round2(num(it.q) * num(it.u));

/** sub, discount, total (after discount), deposit (if depositPct), due. */
export function computeTotals(d) {
  const sub = round2((d.items || []).reduce((a, it) => a + lineTotal(it), 0));
  const pct = Math.min(100, Math.max(0, num(d.discPct)));
  const disc = round2(sub * pct / 100);
  const total = round2(sub - disc);
  const depPct = Math.min(100, Math.max(0, num(d.depositPct)));
  const deposit = depPct ? round2(total * depPct / 100) : 0;
  return { sub, pct, disc, total, depPct, deposit, due: depPct ? deposit : total };
}

const plainMoney = (n) => money(n).slice(1); // no "R": the column header says (R)

export function itemsTable() {
  return html`
    <table class="items">
      <thead><tr><th>DESCRIPTION</th><th class="r">QTY</th><th class="r">UNIT (R)</th><th class="r">AMOUNT (R)</th><th class="noprint"></th></tr></thead>
      <tbody data-items></tbody>
    </table>
    <div class="adds noprint"><button type="button" class="add" data-add-line>+ Add line</button><button type="button" class="add" data-add-cat>+ From catalogue</button></div>`.s;
}

/** Draw + wire line items. data.items is edited in place; onChange() after edits. */
export function wireItems(page, data, ctx, onChange, afterTotals) {
  const tb = page.querySelector('[data-items]');
  function rows() {
    tb.innerHTML = '';
    if (!data.items?.length) data.items = [{ d: '', s: '', q: 1, u: 0 }];
    data.items.forEach((it, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><div class="d field" contenteditable="plaintext-only" data-ph="Item"></div><div class="s field" contenteditable="plaintext-only" data-ph="Details (optional)"></div></td>'
        + '<td class="r q field" contenteditable="plaintext-only" inputmode="decimal"></td><td class="r u field" contenteditable="plaintext-only" inputmode="decimal"></td><td class="r t"></td>'
        + '<td class="x noprint"><button type="button" class="rm" aria-label="Remove line">×</button></td>';
      const [d, s, q, u, t] = ['.d', '.s', '.q', '.u', '.t'].map(c => tr.querySelector(c));
      d.textContent = it.d || ''; s.textContent = it.s || ''; q.textContent = it.q; u.textContent = plainMoney(num(it.u));
      t.textContent = plainMoney(lineTotal(it));
      const upd = () => {
        it.d = textOf(d); it.s = textOf(s); it.q = num(textOf(q)); it.u = num(textOf(u));
        t.textContent = plainMoney(lineTotal(it));
        [d, s].forEach(el => { if (!el.textContent) el.innerHTML = ''; });
        afterTotals(); onChange('items');
      };
      [d, s, q, u].forEach(el => el.addEventListener('input', upd));
      u.addEventListener('blur', () => { u.textContent = plainMoney(num(it.u)); });
      tr.querySelector('.rm').addEventListener('click', () => { data.items.splice(i, 1); rows(); afterTotals(); onChange('items'); });
      tb.appendChild(tr);
    });
  }
  page.querySelector('[data-add-line]').addEventListener('click', () => { data.items.push({ d: '', s: '', q: 1, u: 0 }); rows(); afterTotals(); onChange('items'); tb.lastElementChild.querySelector('.d').focus(); });
  page.querySelector('[data-add-cat]').addEventListener('click', () => pickCatalogue(ctx, (item) => {
    // Replace a single empty starter line rather than adding below it.
    if (data.items.length === 1 && !data.items[0].d && !num(data.items[0].u)) data.items = [];
    data.items.push(item); rows(); afterTotals(); onChange('items');
  }));
  rows();
  return rows;
}

/** Catalogue entries as invoice/quote lines. */
export function catalogueLine(kind, entry, ctx) {
  if (kind === 'package') {
    const tag = String(entry.tagline || '').replace(/\.$/, '');
    return { d: `${entry.name} package — ${tag}`, s: (entry.deliverables || []).join(', '), q: 1, u: entry.price, ref: `package:${entry.id}` };
  }
  if (kind === 'addon') return { d: `Add-on — ${entry.name}`, s: entry.desc || '', q: 1, u: entry.price, ref: `addon:${entry.id}` };
  const r = ctx.catalogue.retainer;
  return { d: `${r.name} — monthly retainer`, s: 'Updates, content refreshes, monthly numbers report, priority support', q: 1, u: r.price, ref: 'retainer' };
}

export function pickCatalogue(ctx, onPick) {
  const cat = ctx.catalogue;
  const btn = (kind, e, label, sub, price) => html`<button type="button" data-kind="${kind}" data-id="${e.id}"><span><b>${label}</b><small>${sub}</small></span><span class="num">${price}</span></button>`;
  modal(html`
    <h2>Add from catalogue</h2>
    <p class="muted" style="margin:4px 0 0">The line stays editable after you add it.</p>
    <div class="pick">
      ${cat.packages.map(p => btn('package', p, `${p.name} package`, p.tagline, money(p.price)))}
      ${cat.addons.map(a => btn('addon', a, a.name, 'Add-on', money(a.price)))}
      ${cat.retainer ? btn('retainer', cat.retainer, cat.retainer.name, 'Monthly retainer (set qty to months)', money(cat.retainer.price) + ' /mo') : ''}
    </div>
    <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Close</button></div>`.s,
  (el, close) => el.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.kind;
    const entry = k === 'package' ? cat.packages.find(p => p.id === b.dataset.id) : k === 'addon' ? cat.addons.find(a => a.id === b.dataset.id) : cat.retainer;
    onPick(catalogueLine(k, entry, ctx));
    close();
  })));
}

/** Named-discount picker; sets discName + discPct. */
export function pickDiscount(ctx, data, after) {
  modal(html`
    <h2>Discount</h2>
    <div class="pick">
      <button type="button" data-disc=""><span><b>No discount</b></span><span class="num">0%</span></button>
      ${ctx.catalogue.discounts.map(d => html`<button type="button" data-disc="${d.id}"><span><b>${d.name}</b><small>${d.note || ''}</small></span><span class="num">${d.pct}%</span></button>`)}
    </div>
    <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Close</button></div>`.s,
  (el, close) => el.querySelectorAll('[data-disc]').forEach(b => b.addEventListener('click', () => {
    const d = ctx.catalogue.discounts.find(x => x.id === b.dataset.disc);
    data.discName = d ? d.name : '';
    data.discPct = d ? d.pct : 0;
    close(); after();
  })));
}

/** Subtotal / discount / (deposit) / amount due box. Call update() to refresh numbers. */
export function sumBox(dueLabel = 'AMOUNT DUE') {
  return html`
    <div class="sum">
      <div class="r"><span>Subtotal</span><span data-sum="sub">R0.00</span></div>
      <div class="r disc" data-disc-row><span>${F('discName', 'Discount name', 'inline', 'span')} (${F('discPct', '0', 'inline', 'span')}%)<button type="button" class="discpick noprint" data-pick-disc>CHOOSE</button></span><span data-sum="disc">–R0.00</span></div>
      <div class="r" data-total-row hidden><span>Total</span><span data-sum="total">R0.00</span></div>
      <div class="r sub-mut" data-bal-row hidden><span data-sum="balLabel">Balance on hand-over</span><span data-sum="bal">R0.00</span></div>
      <div class="due"><span class="mono" style="color:#BDBDBD" data-sum="dueLabel">${dueLabel}</span><b data-sum="due">R0.00</b></div>
    </div>`.s;
}

export function updateSum(page, data, dueLabel = 'AMOUNT DUE') {
  const t = computeTotals(data);
  const set = (k, v) => { const el = page.querySelector(`[data-sum="${k}"]`); if (el) el.textContent = v; };
  set('sub', money(t.sub));
  set('disc', '–' + money(t.disc));
  set('total', money(t.total));
  set('due', money(t.due));
  const showDisc = t.pct > 0 || String(data.discName || '').trim();
  // No discount: the row stays on screen (so one can be chosen) but doesn't print.
  page.querySelector('[data-disc-row]').classList.toggle('is-empty', !showDisc);
  const dep = t.depPct > 0;
  page.querySelector('[data-total-row]').hidden = !dep;
  page.querySelector('[data-bal-row]').hidden = !dep;
  set('bal', money(round2(t.total - t.deposit)));
  set('balLabel', `Balance (${round2(100 - t.depPct)}%) on hand-over`);
  set('dueLabel', dep ? `${t.depPct}% DEPOSIT DUE` : dueLabel);
  return t;
}

/** Signature block for one party. */
export function sigBlock(label, nameHtml) {
  return html`
    <div class="sig">
      <span class="lab mono muted">${label}</span>
      <div class="line"></div>
      <div class="cap"><div>${nameHtml}<small>NAME</small></div><div>&nbsp;<small>DATE</small></div></div>
    </div>`;
}

export const clientLine = (c) => [c?.data?.website, c?.data?.location].filter(Boolean).join(' · ');
