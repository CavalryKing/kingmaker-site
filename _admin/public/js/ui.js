// Small helpers shared by every view.

/** Escape for HTML text and attribute values. */
export const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Tagged template that escapes interpolations; wrap trusted HTML in raw(). */
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      if (v == null || v === false) out += '';
      else if (Array.isArray(v)) out += v.map(x => (x && x.__raw ? x.s : esc(x))).join('');
      else out += v && v.__raw ? v.s : esc(v);
    }
  });
  return { __raw: true, s: out, toString() { return out; } };
}
export const raw = (s) => ({ __raw: true, s: String(s ?? ''), toString() { return this.s; } });

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- Money ----------
/** R1,234.00 (negative shown with an en dash, like the prototypes). */
export function money(n, { cents = true } = {}) {
  const v = Number(n) || 0;
  const neg = v < 0;
  const s = Math.abs(v).toFixed(cents ? 2 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '–' : '') + 'R' + s;
}
/** R1,900 (no cents) for catalogue prices. */
export const rand = (n) => money(n, { cents: false });
export const num = (t) => { const v = parseFloat(String(t ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(v) ? v : 0; };
export const toCents = (r) => Math.round((Number(r) || 0) * 100);
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ---------- Dates ----------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Today as YYYY-MM-DD in South African time. */
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
}
/** 2026-11-27 -> 27 November 2026 */
export function longDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
/** 2026-11-27 -> 27 Nov 2026 */
export function shortDate(iso) {
  const s = longDate(iso);
  return s ? s.replace(/ (\w{3})\w* /, ' $1 ') : '';
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const monthName = (i) => MONTHS[i];

// ---------- Misc ----------
export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  d.cancel = () => clearTimeout(t);
  return d;
}
export const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
export const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';

let toastT;
export function toast(msg, { error = false, ms = 2600 } = {}) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('is-err', error);
  el.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('is-on'), ms);
}

/** Open a modal. `body` is an html`` string. Returns {el, close}. onOpen(el, close) wires it. */
export function modal(body, onOpen) {
  const wrap = document.createElement('div');
  wrap.className = 'modal';
  wrap.innerHTML = `<div class="modal__box" role="dialog" aria-modal="true">${body}</div>`;
  const prev = document.activeElement;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(wrap);
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  onOpen?.(wrap, close);
  (wrap.querySelector('[autofocus]') || wrap.querySelector('input, select, textarea, button'))?.focus();
  return { el: wrap, close };
}

/** Promise-based confirm in our own style. */
export function ask(title, text, { ok = 'OK', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal(html`<h2>${title}</h2><p class="muted" style="margin:6px 0 0">${text}</p>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Cancel</button>
      <button type="button" class="btn ${danger ? 'btn--danger' : ''}" data-ok>${ok}</button></div>`.s,
    (el, close) => {
      el.querySelector('[data-ok]').addEventListener('click', () => { done = true; close(); resolve(true); });
    });
    const obs = new MutationObserver(() => { if (!m.el.isConnected) { obs.disconnect(); if (!done) resolve(false); } });
    obs.observe(document.body, { childList: true });
  });
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

export function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Construction-line decoration used on several screens.
export const decoRing = (cls = 'deco', stroke = '#3A3A3A') => raw(`<svg class="${cls}" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" fill="none" stroke="${stroke}" stroke-dasharray="4 6"/><circle cx="150" cy="150" r="90" fill="none" stroke="${stroke}" opacity=".6"/><line x1="0" y1="150" x2="300" y2="150" stroke="${stroke}" opacity=".5"/><line x1="150" y1="0" x2="150" y2="300" stroke="${stroke}" opacity=".5"/><circle cx="150" cy="10" r="5" fill="#C9A24A"/></svg>`);
