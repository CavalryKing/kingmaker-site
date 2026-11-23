/* ==========================================================================
   KingMaker — site.js
   ========================================================================== */

/* ---------- 1. CONFIG — your contact details ----------
   Replace the [PLACEHOLDERS] before going live.
   whatsapp: international format, digits only, no + or spaces (e.g. 27821234567).
   web3formsKey: the access key Web3Forms emails you (see README).            */
const KM_CONFIG = {
  whatsapp: '27794210966',
  email: 'hello@thekingmakerstudio.com',
  web3formsKey: '596c3cac-bb00-4173-a614-9b5a9e9a93f7',
  replyHours: '12'
};

/* ---------- 2. PRICES — change prices here ----------
   Prices also appear in the static HTML (for Google and no-JS visitors).
   Every price in the HTML sits in an element with data-price="<key>", and this
   script overwrites it on load, so THIS object is what visitors see.
   When you change a price here, also search the HTML for data-price="<key>"
   and update the number there so search results match.
   Pages that show prices: /packages/index.html only (the homepage deliberately shows none)                */
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

  /* Reduced motion: also pause SVG (SMIL) animations, which CSS can't stop */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('svg').forEach((s) => s.pauseAnimations && s.pauseAnimations());
  }

  /* Page-specific modules */
  if (document.getElementById('booking')) kmBooking();
});

/* ---------- Booking form (/book) ----------
   Sends to Web3Forms with fetch and shows the confirmation in place.
   Without JS the form still posts to Web3Forms, which redirects back to /book/#sent. */
function kmBooking() {
  const panel = document.getElementById('booking');
  const form = document.getElementById('booking-form');
  if (!form) return;
  const btn = document.getElementById('submit-btn');
  const note = document.getElementById('meet-note');
  const err = document.getElementById('form-error');
  const sent = document.getElementById('sent');
  const date = document.getElementById('f-date');
  const key = form.querySelector('[name="access_key"]');
  if (KM_CONFIG.web3formsKey && !/^\[.*\]$/.test(KM_CONFIG.web3formsKey)) key.value = KM_CONFIG.web3formsKey;

  // Pre-select the package from ?package=squire|knight|crown
  const want = new URLSearchParams(location.search).get('package');
  if (want) {
    const r = [...form.elements.package].find((i) => i.value.toLowerCase() === want.toLowerCase());
    if (r) r.checked = true;
  }

  // No dates in the past
  const today = new Date();
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  date.min = iso(today);

  const val = (n) => {
    const el = form.elements[n];
    return (el && (el.value || '').trim()) || '';
  };

  const meetingPhrase = { 'Phone call': 'a phone call', 'Online meeting': 'an online meeting', 'In person': 'an in-person meeting' };

  const label = () => {
    const pkg = val('package');
    let t = 'Request ' + meetingPhrase[val('meeting')];
    if (pkg && pkg !== 'Not sure yet') t += ' about ' + pkg;
    return t;
  };

  const update = () => {
    btn.textContent = label();
    const m = form.querySelector('[name="meeting"]:checked');
    note.textContent = m ? m.dataset.note : '';
  };
  form.addEventListener('change', update);
  update();

  const niceDate = (v) => {
    if (!v) return 'Any day';
    const d = new Date(v + 'T12:00:00');
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const summaryRows = () => [
    ['Package', val('package')],
    ['Meeting', val('meeting')],
    ['When', niceDate(val('preferred_date')) + ', ' + val('time_window').toLowerCase()],
    ['Name', val('name')],
    ['Business', val('business')],
    ['What I do', val('what_you_do')],
    ['WhatsApp', val('whatsapp')],
    ['Email', val('email')],
    ['Message', val('message')]
  ].filter((r) => r[1]);

  const waText = () =>
    'Hi KingMaker, I’d like to book ' + meetingPhrase[val('meeting')] + '.\n\n' +
    summaryRows().map(([k, v]) => k + ': ' + v).join('\n');

  const waLink = () => 'https://wa.me/' + KM_CONFIG.whatsapp + '?text=' + encodeURIComponent(waText());
  const mailLink = () => 'mailto:' + KM_CONFIG.email + '?subject=' + encodeURIComponent('Booking request') + '&body=' + encodeURIComponent(waText());

  const showError = (html) => { err.innerHTML = html; err.classList.add('is-on'); err.focus && err.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('is-on');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const rows = summaryRows();
    form.elements.subject.value = 'Booking request: ' + val('meeting') + ', ' + val('package') + ' (' + val('name') + ')';
    const data = Object.fromEntries(new FormData(form));
    data.preferred_date = niceDate(val('preferred_date'));
    if (val('email')) data.replyto = val('email');
    delete data.redirect;

    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.success === false) throw new Error(out.message || 'Request failed');

      const dl = document.getElementById('sent-summary');
      dl.innerHTML = '';
      rows.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k.toUpperCase();
        const dd = document.createElement('dd'); dd.textContent = v;
        dl.append(dt, dd);
      });
      dl.hidden = false;
      document.getElementById('sent-wa-link').href = waLink();
      document.getElementById('sent-wa').hidden = false;
      panel.classList.add('is-sent');
      sent.classList.add('is-on');
      sent.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } catch (ex) {
      showError('Sorry, that didn’t go through. You can <a href="' + waLink() + '" target="_blank" rel="noopener">send it on WhatsApp</a> or <a href="' + mailLink() + '">email it to us</a> instead. Your details are already filled in.');
    } finally {
      btn.disabled = false;
      update();
    }
  });
}
