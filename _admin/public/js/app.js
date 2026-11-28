// App shell: login gate, top bar, side/bottom navigation, hash router.

import { get, post, setUnauthorizedHandler } from './api.js';
import { load } from './store.js';
import { $, esc, html, raw, toast } from './ui.js';

const I = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5" stroke-dasharray="2.5 2.5"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" class="acc"/><circle cx="12" cy="12" r="2"/></svg>',
  clients: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c1.8.8 3 2.6 3.5 5.2"/><circle cx="20" cy="4" r="1.2" class="acc" fill="currentColor" stroke="none"/></svg>',
  docs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14.5 2.5V7H19M9 12h7M9 15.5h7M9 19h4"/><circle cx="9" cy="7" r="1.2" class="acc" fill="currentColor" stroke="none"/></svg>',
  cat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 12.5 12 4h8v8l-8.5 8.5z"/><circle cx="16" cy="8" r="1.6" class="acc"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></svg>',
  enq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5.5h18v12H8l-5 3.5z"/><path d="M7 10h10M7 13.5h6"/></svg>',
  apparel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8.5 3.5 3 6.5l2 4 2-1V20.5h10V9.5l2 1 2-4-5.5-3c-.5 1.6-1.8 2.5-3.5 2.5s-3-.9-3.5-2.5z"/></svg>',
  finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 20.5h17"/><path d="M6 17v-5M10.5 17V8M15 17v-7M19.5 17V5"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6" class="acc"/></svg>',
};

// Future modules plug in here: add an entry, and a view in js/views/.
export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: I.dash, href: '#/' },
  { id: 'clients', label: 'Clients', icon: I.clients, href: '#/clients' },
  { id: 'documents', label: 'Documents', icon: I.docs, href: '#/documents' },
  { id: 'catalogue', label: 'Catalogue', icon: I.cat, href: '#/catalogue' },
  { id: 'settings', label: 'Settings', icon: I.settings, href: '#/settings' },
];
export const SOON = [
  { id: 'enquiries', label: 'Enquiries', icon: I.enq, href: '#/soon/enquiries' },
  { id: 'apparel', label: 'Apparel orders', icon: I.apparel, href: '#/soon/apparel' },
  { id: 'finance', label: 'Finance', icon: I.finance, href: '#/soon/finance' },
];
const BOTTOM = [NAV[0], NAV[1], NAV[2], NAV[3], { id: 'more', label: 'More', icon: I.more, href: '#/more' }];

const ROUTES = [
  [/^\/?$/, 'dashboard', () => import('./views/dashboard.js')],
  [/^\/clients$/, 'clients', () => import('./views/clients.js')],
  [/^\/clients\/([0-9a-f-]{36})$/, 'clients', () => import('./views/client.js')],
  [/^\/documents$/, 'documents', () => import('./views/documents.js')],
  [/^\/doc\/([0-9a-f-]{36})$/, 'documents', () => import('./views/doc.js')],
  [/^\/catalogue$/, 'catalogue', () => import('./views/catalogue.js')],
  [/^\/settings$/, 'settings', () => import('./views/settings.js')],
  [/^\/soon\/(enquiries|apparel|finance)$/, (m) => m[1], () => import('./views/soon.js')],
  [/^\/more$/, 'more', () => import('./views/more.js')],
];

let cleanup = null;
let navToken = 0;

function shell() {
  const link = (n, cls = '') => html`<li><a href="${n.href}" data-nav="${n.id}" class="${cls}">${raw(n.icon)}<span>${n.label}</span>${cls === 'is-soon' ? raw('<span class="soon">SOON</span>') : ''}</a></li>`;
  $('#app').className = '';
  $('#app').innerHTML = html`
    <header class="top">
      <a class="top__brand" href="#/"><img src="/assets/brand/km-icon-black.svg" alt="" width="22" height="22"><span>Admin</span></a>
      <span class="top__spacer"></span>
      <button type="button" class="top__btn" id="logoutBtn">Log out</button>
    </header>
    <nav class="side" aria-label="Main">
      <ul class="nav">${NAV.map(n => link(n))}</ul>
      <div class="nav__lab mono">COMING SOON</div>
      <ul class="nav">${SOON.map(n => link(n, 'is-soon'))}</ul>
    </nav>
    <main class="main"><div class="view" id="view"></div></main>
    <nav class="bnav" aria-label="Main">${BOTTOM.map(n => html`<a href="${n.href}" data-nav="${n.id}">${raw(n.icon)}<span>${n.label}</span></a>`)}</nav>`.s;
  $('#logoutBtn').addEventListener('click', async () => {
    await post('/logout').catch(() => {});
    showLogin();
  });
}

async function route() {
  const token = ++navToken;
  const path = decodeURIComponent(location.hash.replace(/^#/, '').split('?')[0]) || '/';
  const query = new URLSearchParams(location.hash.split('?')[1] || '');
  let hit = null, m = null;
  for (const r of ROUTES) { m = path.match(r[0]); if (m) { hit = r; break; } }
  if (!hit) { location.hash = '#/'; return; }
  const navId = typeof hit[1] === 'function' ? hit[1](m) : hit[1];

  if (cleanup) { try { await cleanup(); } catch { /* ignore */ } cleanup = null; }
  const mod = await hit[2]();
  if (token !== navToken) return;

  document.body.dataset.view = navId;
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = a.dataset.nav === navId || (navId !== 'more' && a.dataset.nav === 'more' && ['settings', 'enquiries', 'apparel', 'finance'].includes(navId));
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  // A fresh element per route, so listeners from the previous view never linger.
  const old = $('#view');
  const view = document.createElement('div');
  view.className = 'view';
  view.id = 'view';
  old.replaceWith(view);
  window.scrollTo(0, 0);
  try {
    cleanup = (await mod.render(view, m.slice(1), query)) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = html`<div class="card"><b>Something went wrong.</b><p class="muted">${e.message || e}</p></div>`.s;
  }
}

function showLogin(msg = '') {
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  document.body.dataset.view = 'login';
  $('#app').className = '';
  $('#app').innerHTML = html`
    <div class="login">
      <svg class="login__deco" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" fill="none" stroke="#2E2E2E" stroke-dasharray="4 6"/><circle cx="150" cy="150" r="90" fill="none" stroke="#1F1F1F"/><line x1="0" y1="150" x2="300" y2="150" stroke="#1A1A1A"/><line x1="150" y1="0" x2="150" y2="300" stroke="#1A1A1A"/><circle cx="150" cy="10" r="4" fill="#C9A24A"/></svg>
      <form class="login__box" id="loginForm">
        <img src="/assets/brand/kingmaker-logo-white.svg" alt="KingMaker">
        <span class="mono" style="color:#8A8A8A">§ 00 — ADMIN</span>
        <h1>Welcome back.</h1>
        <p>Enter your admin password.</p>
        <label class="sr" for="pw">Password</label>
        <input class="in" id="pw" type="password" autocomplete="current-password" required autofocus>
        <button class="btn btn--inv" type="submit">Open the admin</button>
        <div class="login__err" id="loginErr">${msg}</div>
      </form>
    </div>`.s;
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    $('#loginErr').textContent = '';
    try {
      await post('/login', { password: $('#pw').value });
      await start();
    } catch (err) {
      $('#loginErr').textContent = err.message;
      btn.disabled = false;
      $('#pw').select();
    }
  });
}

async function start() {
  await load();
  shell();
  await route();
}

setUnauthorizedHandler(() => showLogin('Your session ended. Log in again.'));
window.addEventListener('hashchange', route);

(async () => {
  try {
    const s = await get('/session');
    if (s.authed) await start(); else showLogin();
  } catch (e) {
    $('#app').innerHTML = `<p class="boot__msg mono">${esc(e.message)}</p>`;
    toast(e.message, { error: true });
  }
})();
