// 01 Online Presence Audit: exactly the prototype (reference/KingMaker_Online_Presence_Audit.html).
// 5 areas x 5 Yes/Partly/No checks, a 1–5 score each, overall /100 gauge, top 3 fixes, next step.

import { firstName, html, modal, raw, today } from '../ui.js';
import { bandTall, bindFields, D, F, pageShell } from './common.js';

export const AREAS = [
  { id: '01', title: 'Website', q: 'Is the business findable, trustworthy and easy to act on?', checks: [
    'Has its own website on its own domain', 'Loads fast and works properly on a phone', 'Services and prices are clear',
    'Contact or booking is one tap away', 'Looks current and matches the brand'] },
  { id: '02', title: 'Google Business Profile', q: 'Can people find it on Google Search and Maps?', checks: [
    'Profile exists and is claimed', 'Correct hours, area, phone and website', 'Recent photos of the work',
    'Reviews, and replies to reviews', 'Services or products listed'] },
  { id: '03', title: 'Social media', q: 'Do the socials build trust and send people somewhere?', checks: [
    'Active in the last 2 weeks', 'Consistent name, logo and bio across platforms', 'Bio links to booking or the website',
    'Shows real work (before/afters, results)', 'Enquiries in DMs get answered quickly'] },
  { id: '04', title: 'Bookings & payments', q: 'How does a stranger become a paying client?', checks: [
    'Clients can book without back-and-forth', 'Deposits or prepayment protect against no-shows', 'Reminders go out automatically',
    'Clear cancellation / reschedule policy', 'Easy ways to pay (EFT, card, link)'] },
  { id: '05', title: 'Brand', q: 'Does it look like one business everywhere?', checks: [
    'A clear logo that works small and large', 'Consistent colours and fonts', 'Professional photos of the work',
    'The same message everywhere (what, who, where)', 'Looks as good as the work actually is'] },
];

/** Overall /100 (same formula as the prototype: total points out of 25). null when nothing is scored. */
export function score(data) {
  const s = AREAS.map(a => Number(data.scores?.[a.id]) || 0);
  return s.some(Boolean) ? Math.round(s.reduce((x, y) => x + y, 0) / (AREAS.length * 5) * 100) : null;
}

export function blank(ctx) {
  const c = ctx.client;
  return {
    date: today(),
    client: c?.name || '',
    biz: c?.business || '',
    url: c?.data?.website || c?.data?.instagram || '',
    by: `${ctx.company.founder || 'Sam Tshonda'}, ${ctx.company.founderTitle || 'Founder'} — KingMaker`,
    summary: '',
    scores: {}, checks: {}, notes: {},
    fixes: [{ t: '', d: '' }, { t: '', d: '' }, { t: '', d: '' }],
    recommend: 'knight',
    nextText: "Let's book 20 minutes to walk through it, no obligation.",
  };
}

export const totals = () => ({ amount_cents: 0 });
export const meta = (data) => ({ client: data.biz || data.client, score: score(data) });
export function onClient(data, ctx) {
  const c = ctx.client;
  data.client = c.name || ''; data.biz = c.business || '';
  data.url = c.data?.website || c.data?.instagram || data.url;
}

const waPretty = (d) => { d = String(d || '').replace(/\D/g, ''); return d.startsWith('27') && d.length === 11 ? `+27 ${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : d; };

export function render(page, doc, ctx, onChange) {
  const data = doc.data;
  data.scores ||= {}; data.checks ||= {}; data.notes ||= {};
  const pkgName = () => ctx.catalogue.packages.find(p => p.id === data.recommend)?.name || '[Package]';

  page.innerHTML = pageShell(html`
    ${raw(bandTall('KM / AUDIT · ONLINE PRESENCE', 'Online Presence Audit',
      html`A plain-language review of how ${F('biz', '[Business name]', '', 'span', 'color:#fff;font-weight:500')} shows up online, and what to fix first.`))}
    <div class="meta">
      <div><span class="lab mono muted">PREPARED FOR</span>${F('client', 'Client name')}</div>
      <div><span class="lab mono muted">BUSINESS</span>${F('biz', 'Business name')}</div>
      <div><span class="lab mono muted">WEBSITE / MAIN LINK</span>${F('url', 'e.g. example.com or @handle')}</div>
      <div><span class="lab mono muted">DATE</span><div class="val">${D('date')}</div></div>
      <div><span class="lab mono muted">PREPARED BY</span>${F('by', 'Your name')}</div>
      <div><span class="lab mono muted">REFERENCE</span><div class="val">${doc.number}</div></div>
    </div>
    <div class="body">
      <div class="summary">
        <div class="gauge">
          <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true">
            <circle cx="75" cy="75" r="68" fill="none" stroke="#BDBDBD" stroke-dasharray="3 5"/>
            <circle cx="75" cy="75" r="58" fill="none" stroke="#EFEFEF" stroke-width="8"/>
            <circle data-arc cx="75" cy="75" r="58" fill="none" stroke="#0A0A0A" stroke-width="8" stroke-dasharray="0 400" transform="rotate(-90 75 75)"/>
            <circle cx="75" cy="7" r="4" fill="#C9A24A"/>
          </svg>
          <div class="num"><span class="big" data-total>–</span><span class="mono muted">/ 100</span></div>
        </div>
        <div>
          <div class="mono muted" style="margin-bottom:8px">OVERALL SCORE · BY AREA</div>
          <div class="abars" data-bars></div>
          <div class="field-label mono muted" style="margin-top:12px">THE SHORT VERSION</div>
          ${F('summary', "Two or three sentences: what's working, what's costing them clients, the biggest opportunity.", 'notes')}
        </div>
      </div>
      ${AREAS.map(a => html`
        <section class="sec" data-sec="${a.id}">
          <div class="sec-head">
            <div><span class="mono muted">§ ${a.id}</span><h2 class="h">${a.title}</h2><p class="q">${a.q}</p></div>
            <div class="score" aria-label="${a.title} score out of 5">
              <span class="mono muted">SCORE</span>
              <div class="dots">${[1, 2, 3, 4, 5].map(n => html`<button type="button" class="dot" data-s="${n}" aria-label="${n} out of 5"></button>`)}</div>
              <span class="mono sval">–/5</span>
            </div>
          </div>
          <div class="rows">${a.checks.map((c, i) => html`
            <div class="row"><span class="item">${c}</span>
              <div class="yn" role="group" aria-label="${c}" data-check="${i}">
                <button type="button" class="opt" data-v="y">Yes</button><button type="button" class="opt" data-v="p">Partly</button><button type="button" class="opt" data-v="n">No</button>
              </div></div>`)}</div>
          <div class="field-label mono muted">WHAT I FOUND</div>
          ${F(`notes.${a.id}`, 'Observations, with specifics: links, screenshots referenced, numbers…', 'notes')}
        </section>`)}
      <section class="fixes">
        <span class="mono muted">§ 06</span>
        <h2>Top 3 fixes, in order</h2>
        <p class="q" style="margin-bottom:6px">If nothing else changes, do these first.</p>
        ${[0, 1, 2].map(i => html`<div class="fix"><span class="n">0${i + 1}</span><div>${F(`fixes.${i}.t`, `Fix ${i + 1} — what to change`, 't')}${F(`fixes.${i}.d`, 'Why it matters and what it will change for the business.', 'd')}</div></div>`)}
      </section>
      <section class="next">
        <svg viewBox="0 0 200 200" aria-hidden="true" style="position:absolute;right:-40px;bottom:-60px;width:200px;height:200px"><circle cx="100" cy="100" r="90" fill="none" stroke="#333" stroke-dasharray="4 6"/></svg>
        <span class="mono" style="color:#9A9A9A;position:relative">§ 07 · NEXT STEP</span>
        <h3 style="position:relative">Want this fixed for you?</h3>
        <p>KingMaker builds the brand, website, bookings and back-office for service businesses. Based on this audit, I'd recommend the <b class="pickable" data-pick-pkg tabindex="0" role="button" title="Choose a package">${pkgName()}</b> package.</p>
        ${F('nextText', 'What happens next', '', 'p')}
        <div class="cta"><span>${ctx.company.website}</span><span>${ctx.company.email}</span><span>${waPretty(ctx.company.whatsapp)}</span></div>
      </section>
    </div>`.s, 'CONFIDENTIAL · PREPARED FOR THE CLIENT ONLY', ctx);

  const secs = [...page.querySelectorAll('.sec')];
  function draw() {
    let bars = '';
    secs.forEach(sec => {
      const id = sec.dataset.sec, s = Number(data.scores[id]) || 0, title = sec.querySelector('h2').textContent;
      sec.querySelectorAll('.dot').forEach(d => { const v = +d.dataset.s; d.classList.toggle('on', v <= s); d.classList.toggle('last', v === s); d.setAttribute('aria-pressed', v <= s); });
      sec.querySelector('.sval').textContent = (s || '–') + '/5';
      sec.querySelectorAll('[data-check]').forEach(g => {
        const v = data.checks[id]?.[+g.dataset.check];
        g.querySelectorAll('.opt').forEach(o => { const on = o.dataset.v === v; o.classList.toggle('sel', on); o.setAttribute('aria-pressed', on); });
      });
      bars += html`<div class="abar"><span>${title}</span><div class="track"><div class="fill" style="width:${s * 20}%"></div></div><span class="mono">${s ? s * 20 : '–'}</span></div>`.s;
    });
    page.querySelector('[data-bars]').innerHTML = bars;
    const pct = score(data);
    page.querySelector('[data-total]').textContent = pct == null ? '–' : pct;
    const C = 2 * Math.PI * 58;
    page.querySelector('[data-arc]').setAttribute('stroke-dasharray', `${(C * (pct || 0) / 100).toFixed(1)} ${C.toFixed(1)}`);
  }

  secs.forEach(sec => {
    const id = sec.dataset.sec;
    sec.querySelector('.dots').addEventListener('click', (e) => {
      const d = e.target.closest('.dot'); if (!d) return;
      const v = +d.dataset.s;
      data.scores[id] = data.scores[id] === v ? 0 : v;
      draw(); onChange();
    });
    sec.querySelectorAll('[data-check]').forEach(g => g.addEventListener('click', (e) => {
      const o = e.target.closest('.opt'); if (!o) return;
      const arr = data.checks[id] ||= [null, null, null, null, null];
      const i = +g.dataset.check;
      arr[i] = arr[i] === o.dataset.v ? null : o.dataset.v;
      draw(); onChange();
    }));
  });

  const pick = page.querySelector('[data-pick-pkg]');
  const openPick = () => modal(html`
    <h2>Recommend a package</h2>
    <div class="pick">${ctx.catalogue.packages.map(p => html`<button type="button" data-p="${p.id}"><span><b>${p.name}</b><small>${p.tagline}</small></span><span class="num">R${p.price.toLocaleString('en-ZA').replace(/\s/g, ',')}</span></button>`)}</div>
    <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Close</button></div>`.s,
  (el, close) => el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
    data.recommend = b.dataset.p; pick.textContent = pkgName(); close(); onChange();
  })));
  pick.addEventListener('click', openPick);
  pick.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPick(); });

  bindFields(page, data, onChange);
  draw();
}

export function share(doc) {
  const d = doc.data, s = score(d);
  const hi = firstName(d.client) ? `Hi ${firstName(d.client)}` : 'Hi';
  return `${hi}, here's the Online Presence Audit I put together for ${d.biz || 'your business'}${s != null ? `. It scores ${s}/100 overall` : ''}, with the top 3 fixes I'd make first on the last page. Happy to walk you through it in 20 minutes, no obligation. Just reply here.`;
}
