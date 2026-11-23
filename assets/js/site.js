/* ==========================================================================
   KingMaker — site.js
   ========================================================================== */

/* ---------- 1. CONFIG — your contact details ----------
   Replace the [PLACEHOLDERS] before going live.
   whatsapp: international format, digits only, no + or spaces (e.g. 27821234567).
   web3formsKey: the access key Web3Forms emails you (see README).            */
const KM_CONFIG = {
  whatsapp: '[MY_NUMBER]',
  email: '[MY_EMAIL]',
  web3formsKey: '[WEB3FORMS_KEY]',
  replyHours: '[X]'
};

/* ---------- 2. PRICES — change prices here ----------
   Prices also appear in the static HTML (for Google and no-JS visitors).
   Every price in the HTML sits in an element with data-price="<key>", and this
   script overwrites it on load, so THIS object is what visitors see.
   When you change a price here, also search the HTML for data-price="<key>"
   and update the number there so search results match.
   Pages that show prices: /index.html, /packages/index.html                */
const KM_PRICES = {
  squire: 1900,
  knight: 3900,
  crown: 8500,
  court: 399,          // per month
  addonPage: 250,
  addonLogo: 950,
  addonShop: 1500,
  addonDomain: 290
};

/* ---------- Helpers ---------- */
const kmRand = (n) => 'R' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

document.addEventListener('DOMContentLoaded', () => {
  /* Prices */
  document.querySelectorAll('[data-price]').forEach((el) => {
    const v = KM_PRICES[el.dataset.price];
    if (typeof v === 'number') el.textContent = kmRand(v);
  });

  /* Config text (e.g. reply hours) */
  document.querySelectorAll('[data-config]').forEach((el) => {
    const v = KM_CONFIG[el.dataset.config];
    if (v && !/^\[.*\]$/.test(v)) el.textContent = v;
  });

  /* Current page in the header nav (keeps the header markup identical on every page) */
  const path = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.site-nav a, .site-footer nav a').forEach((a) => {
    if (a.getAttribute('href') === path && path !== '/') a.setAttribute('aria-current', 'page');
  });

  /* Mobile menu */
  const btn = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');
  if (btn && nav) {
    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      btn.querySelector('.menu-btn__label').textContent = open ? 'Close menu' : 'Menu';
    };
    btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) setOpen(false);
    });
    matchMedia('(min-width: 761px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
  }

  /* Scroll reveal fallback — only when CSS scroll-driven animations are unsupported */
  const supportsView = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  const els = document.querySelectorAll('.reveal, .grow');
  if (!supportsView && els.length) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add('is-in'));
    }
  }

  /* Page-specific modules */
  if (document.getElementById('booking')) kmBooking();
});

/* Booking form — filled in when /book is built */
function kmBooking() {}
