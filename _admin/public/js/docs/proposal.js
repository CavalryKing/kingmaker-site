// 02 Proposal: cover, where you are now (from the client's audit), what we'll build (package +
// add-ons from the catalogue), timeline, investment, optional The Court retainer, what happens next.

import { S, getDoc } from '../store.js';
import { addDays, firstName, html, longDate, modal, money, num, raw, round2, toast, today, toCents } from '../ui.js';
import { AREAS, score as auditScore } from './audit.js';
import { bandTall, bindFields, D, divider, F, M, pageShell, pickDiscount } from './common.js';

const PHASES = [
  ['sitdown', 'Sit-down', 'A relaxed 45-minute call about your services, your clients and what you want the business to do next.'],
  ['blueprint', 'Blueprint', 'Site map, wording and design direction, sent to you for a yes before anything is built.'],
  ['build', 'Build', 'We build and set everything up. You review it, with two rounds of changes included.'],
  ['handover', 'Hand-over', 'Logins, a walkthrough and your Hand-over Pack. Everything is yours once paid in full.'],
];

function pkgData(p, ctx) {
  return {
    pkg: p?.id || '', pkgName: p?.name || '', pkgTagline: p?.tagline || '', pkgPrice: p?.price || 0,
    instalments: !!p?.instalments,
    deliverables: [...(p?.deliverables || [])],
    timeline: PHASES.map(([k, name, what]) => ({ k, name, when: p?.timeline?.[k] || '', what })),
  };
}

export function blank(ctx) {
  const c = ctx.client;
  const date = today();
  const p = ctx.catalogue.packages.find(x => x.id === c?.data?.package) || ctx.catalogue.packages.find(x => x.id === 'knight');
  const disc = ctx.catalogue.discounts.find(d => d.id === c?.data?.discount);
  const r = ctx.catalogue.retainer || {};
  return {
    date, validUntil: addDays(date, Number(ctx.terms.validityDays) || 14),
    client: c?.name || '', biz: c?.business || '', url: c?.data?.website || '',
    by: `${ctx.company.founder || 'Sam Tshonda'}, ${ctx.company.founderTitle || 'Founder'} — KingMaker`,
    now: { auditNo: '', score: null, areas: [], summary: '' },
    ...pkgData(p, ctx),
    addons: [],
    discName: disc?.name || '', discPct: disc?.pct || 0,
    depositPct: Number(ctx.terms.depositPct) || 50,
    court: { on: true, name: r.name || 'The Court', price: r.price || 0, includes: [...(r.includes || [])] },
    steps: [
      'Reply “yes” on WhatsApp or email to accept this proposal.',
      `I send the service agreement and the ${Number(ctx.terms.depositPct) || 50}% deposit invoice.`,
      'Once the deposit is in, we book your Sit-down and the timeline starts.',
    ],
  };
}

export function money2(d) {
  const sub = round2(num(d.pkgPrice) + (d.addons || []).reduce((a, x) => a + num(x.price), 0));
  const pct = Math.min(100, Math.max(0, num(d.discPct)));
  const disc = round2(sub * pct / 100);
  const final = round2(sub - disc);
  const dep = round2(final * Math.min(100, Math.max(0, num(d.depositPct))) / 100);
  return { sub, pct, disc, final, dep, bal: round2(final - dep) };
}
export const totals = (d) => ({ amount_cents: toCents(money2(d).final) });
export const meta = (d) => ({ client: d.biz || d.client, title: d.pkgName ? `${d.pkgName} package` : '' });
export function onClient(data, ctx) {
  const c = ctx.client;
  data.client = c.name || ''; data.biz = c.business || ''; data.url = c.data?.website || data.url;
}

/** Copy the summary and scores of the client's latest audit into the proposal. */
async function pullAudit(data, clientId) {
  const audits = S.documents.filter(d => d.type === 'audit' && d.client_id === clientId && d.status !== 'void')
    .sort((a, b) => (b.issued_on || '').localeCompare(a.issued_on || '') || b.number.localeCompare(a.number));
  if (!audits.length) return false;
  const a = await getDoc(audits[0].id);
  data.now = {
    auditNo: a.number, score: auditScore(a.data),
    areas: AREAS.map(x => ({ title: x.title, s: Number(a.data.scores?.[x.id]) || 0 })),
    summary: a.data.summary || data.now?.summary || '',
  };
  return true;
}

export function render(page, doc, ctx, onChange) {
  const d = doc.data;
  d.addons ||= []; d.deliverables ||= []; d.steps ||= []; d.now ||= { areas: [] };
  const days = Number(ctx.terms.validityDays) || 14;

  const C = 2 * Math.PI * 58;
  const nowBlock = () => d.now?.auditNo ? html`
    <div class="summary" style="border-bottom:0;padding-top:2mm">
      <div class="gauge">
        <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true">
          <circle cx="75" cy="75" r="68" fill="none" stroke="#BDBDBD" stroke-dasharray="3 5"/>
          <circle cx="75" cy="75" r="58" fill="none" stroke="#EFEFEF" stroke-width="8"/>
          <circle cx="75" cy="75" r="58" fill="none" stroke="#0A0A0A" stroke-width="8" stroke-dasharray="${(C * (d.now.score || 0) / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 75 75)"/>
          <circle cx="75" cy="7" r="4" fill="#C9A24A"/>
        </svg>
        <div class="num"><span class="big">${d.now.score ?? '–'}</span><span class="mono muted">/ 100</span></div>
      </div>
      <div>
        <div class="mono muted" style="margin-bottom:8px">FROM AUDIT ${d.now.auditNo}</div>
        <div class="abars">${(d.now.areas || []).map(a => html`<div class="abar"><span>${a.title}</span><div class="track"><div class="fill" style="width:${a.s * 20}%"></div></div><span class="mono">${a.s ? a.s * 20 : '–'}</span></div>`)}</div>
        <div class="field-label mono muted" style="margin-top:12px">THE SHORT VERSION</div>
        ${F('now.summary', 'Where the business is today, in two or three sentences.', 'notes')}
      </div>
    </div>` : html`
    ${F('now.summary', 'Where the business is today, in two or three sentences. (Tip: make an Online Presence Audit first and pull it in.)', 'notes')}`;

  page.innerHTML = pageShell(html`
    ${raw(bandTall('KM / PROPOSAL', 'Proposal', html`What we'll build for ${F('biz', '[Business name]', '', 'span', 'color:#fff;font-weight:500')}, how long it takes and what it costs.`))}
    <div class="meta">
      <div><span class="lab mono muted">PREPARED FOR</span>${F('client', 'Client name')}</div>
      <div><span class="lab mono muted">BUSINESS</span>${F('biz', 'Business name')}</div>
      <div><span class="lab mono muted">DATE</span><div class="val">${D('date')}</div></div>
      <div><span class="lab mono muted">REFERENCE</span><div class="val">${doc.number}</div></div>
      <div><span class="lab mono muted">PREPARED BY</span>${F('by', 'Your name')}</div>
      <div><span class="lab mono muted">VALID UNTIL</span><div class="val">${D('validUntil')}</div></div>
    </div>
    <div class="body">
      <section class="sec">
        ${divider('§ 01 · WHERE YOU ARE NOW')}
        <div data-now>${nowBlock()}</div>
        <div class="adds noprint"><button type="button" class="add" data-pull>${d.now?.auditNo ? 'Refresh from the latest audit' : 'Pull in the client’s audit'}</button></div>
      </section>

      <section class="sec">
        ${divider('§ 02 · WHAT WE’LL BUILD')}
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <h2 class="h"><span class="pickable" data-pick-pkg tabindex="0" role="button" title="Change package">${d.pkgName || 'Choose a package'}</span> package</h2>
          <span class="mono muted">${F('pkgTagline', 'Tagline', '', 'span')}</span>
        </div>
        <div class="cks" style="margin-top:3mm" data-deliv></div>
        <div class="adds noprint"><button type="button" class="add" data-add-deliv>+ Deliverable</button></div>
        <div data-addons-wrap></div>
      </section>

      <section class="sec">
        ${divider('§ 03 · TIMELINE')}
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;position:relative" class="tl">
          ${(d.timeline || []).map((t, i) => html`
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:10px;height:10px;border-radius:50%;background:${i === 3 ? '#C9A24A' : '#0A0A0A'};flex:none"></span><i style="flex:1;border-top:1px dashed #CFCFCF"></i></div>
              <div class="mono muted">0${i + 1} — ${t.name.toUpperCase()}</div>
              ${F(`timeline.${i}.when`, 'Week 1', '', 'div', 'font-weight:600;font-size:15px;margin:4px 0')}
              ${F(`timeline.${i}.what`, 'What happens', 'txt', 'div', 'font-size:12.5px;color:#444')}
            </div>`)}
        </div>
        <p class="q" style="margin-top:3mm">The clock starts once the deposit is paid and your content (photos, services and prices) is in.</p>
      </section>

      <section class="sec">
        ${divider('§ 04 · INVESTMENT')}
        <div class="totals" style="margin-top:0">
          <div class="sum" style="width:100%;max-width:120mm">
            <div class="r"><span>${d.pkgName} package</span><span>${M('pkgPrice')}</span></div>
            <div data-inv-addons></div>
            <div class="r" style="font-weight:600"><span>Normal price</span><span data-m="sub"></span></div>
            <div class="r disc" data-disc-row><span>${F('discName', 'Discount name', 'inline', 'span')} (${F('discPct', '0', 'inline', 'span')}%)<button type="button" class="discpick noprint" data-pick-disc>CHOOSE</button></span><span data-m="disc"></span></div>
            <div class="due"><span class="mono" style="color:#BDBDBD">YOUR PRICE</span><b data-m="final"></b></div>
            <div class="r" style="margin-top:6px"><span>${F('depositPct', '50', 'inline', 'span')}% deposit to start</span><b data-m="dep"></b></div>
            <div class="r sub-mut"><span>Balance before hand-over</span><span data-m="bal"></span></div>
          </div>
          <div class="q" style="max-width:62mm;font-size:12.5px;line-height:1.6">
            <span class="lab mono muted" style="display:block;margin-bottom:6px">GOOD TO KNOW</span>
            Paid by EFT. Work pauses if a payment is more than 7 days overdue. Everything is yours once paid in full.
            <span data-inst>${d.instalments ? ' Instalments are available on this package: ask me how.' : ''}</span>
          </div>
        </div>
      </section>

      <section class="sec" data-court-sec>
        ${divider('§ 05 · THE COURT (OPTIONAL)')}
        <label class="chk noprint" style="display:inline-flex;align-items:center;gap:8px;font-size:13px;margin-bottom:3mm;cursor:pointer"><input type="checkbox" data-court-on ${d.court?.on ? 'checked' : ''}> Include The Court in this proposal</label>
        <div data-court-body>
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
            <h2 class="h">${d.court?.name || 'The Court'}: keep it running</h2>
            <b style="font-size:18px">${money(num(d.court?.price), { cents: false })} <span class="muted" style="font-size:13px;font-weight:400">/ month</span></b>
          </div>
          <div class="cks" style="margin-top:3mm">${(d.court?.includes || []).map(x => html`<div class="ck on"><span class="box"></span><span>${x}</span></div>`)}</div>
          <p class="q" style="margin-top:3mm">Starts after hand-over. Paid monthly in advance. Cancel any time with 30 days’ notice.</p>
        </div>
      </section>

      <section class="next">
        <svg viewBox="0 0 200 200" aria-hidden="true" style="position:absolute;right:-40px;bottom:-60px;width:200px;height:200px"><circle cx="100" cy="100" r="90" fill="none" stroke="#333" stroke-dasharray="4 6"/></svg>
        <span class="mono" style="color:#9A9A9A;position:relative" data-next-label>§ 06 · WHAT HAPPENS NEXT</span>
        <h3 style="position:relative">Ready when you are.</h3>
        ${[0, 1, 2].map(i => html`<div style="display:flex;gap:10px;position:relative;margin-top:6px"><span class="mono" style="color:#C9A24A;padding-top:3px">0${i + 1}</span>${F(`steps.${i}`, 'Step', '', 'div', 'flex:1')}</div>`)}
        <div class="cta"><span>${ctx.company.website}</span><span>${ctx.company.email}</span><span>This proposal is valid for ${days} days.</span></div>
      </section>
    </div>`.s, `THIS PROPOSAL IS VALID FOR ${days} DAYS`, ctx);

  // ---- deliverables (one editable line each)
  function drawDeliv() {
    const box = page.querySelector('[data-deliv]');
    box.innerHTML = d.deliverables.map((x, i) => html`<div class="ck on" style="cursor:default"><span class="box"></span>${F(`deliverables.${i}`, 'Deliverable', '', 'span', 'flex:1')}<button type="button" class="rm noprint" data-rm-deliv="${i}" aria-label="Remove">×</button></div>`.s).join('');
    bindFields(box, d, onChange);
    box.querySelectorAll('[data-rm-deliv]').forEach(b => b.addEventListener('click', () => { d.deliverables.splice(+b.dataset.rmDeliv, 1); drawDeliv(); onChange(); }));
  }

  // ---- add-ons
  function drawAddons() {
    const wrap = page.querySelector('[data-addons-wrap]');
    wrap.innerHTML = html`
      ${d.addons.length ? html`<div class="mono muted" style="margin:5mm 0 2mm">ADD-ONS</div>` : ''}
      ${d.addons.map((a, i) => html`<div class="row" style="align-items:flex-start"><div style="flex:1">${F(`addons.${i}.name`, 'Add-on', '', 'div', 'font-weight:600')}${F(`addons.${i}.desc`, 'Details', 'q')}</div><button type="button" class="rm noprint" data-rm-addon="${i}" aria-label="Remove">×</button></div>`)}
      <div class="adds noprint"><button type="button" class="add" data-add-addon>+ Add-on from catalogue</button></div>`.s;
    bindFields(wrap, d, () => { drawInvAddons(); onChange(); });
    wrap.querySelectorAll('[data-rm-addon]').forEach(b => b.addEventListener('click', () => { d.addons.splice(+b.dataset.rmAddon, 1); drawAddons(); drawInvAddons(); refresh(); onChange(); }));
    wrap.querySelector('[data-add-addon]').addEventListener('click', () => modal(html`
      <h2>Add an add-on</h2><div class="pick">${ctx.catalogue.addons.map(a => html`<button type="button" data-a="${a.id}"><span><b>${a.name}</b><small>${a.desc || ''}</small></span><span class="num">${money(a.price)}</span></button>`)}</div>
      <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Close</button></div>`.s,
    (el, close) => el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
      const a = ctx.catalogue.addons.find(x => x.id === b.dataset.a);
      d.addons.push({ id: a.id, name: a.name, desc: a.desc || '', price: a.price });
      close(); drawAddons(); drawInvAddons(); refresh(); onChange();
    }))));
  }
  function drawInvAddons() {
    const box = page.querySelector('[data-inv-addons]');
    box.innerHTML = d.addons.map((a, i) => html`<div class="r"><span>${a.name || 'Add-on'}</span><span>${M(`addons.${i}.price`)}</span></div>`.s).join('');
    bindFields(box, d, (k) => { d.addons.forEach(a => { a.price = num(a.price); }); refresh(); onChange(k); });
  }

  function refresh() {
    const m = money2(d);
    const set = (k, v) => { page.querySelector(`[data-m="${k}"]`).textContent = v; };
    set('sub', money(m.sub)); set('disc', '–' + money(m.disc)); set('final', money(m.final)); set('dep', money(m.dep)); set('bal', money(m.bal));
    page.querySelector('[data-disc-row]').classList.toggle('is-empty', !(m.pct > 0 || String(d.discName || '').trim()));
  }
  function drawCourt() {
    const on = !!d.court?.on;
    const sec = page.querySelector('[data-court-sec]');
    sec.classList.toggle('noprint', !on);
    page.querySelector('[data-court-body]').style.opacity = on ? '' : '.35';
    page.querySelector('[data-next-label]').textContent = `§ 0${on ? 6 : 5} · WHAT HAPPENS NEXT`;
  }

  // Static fields (dynamic lists are bound when drawn). Fields that appear twice stay in sync.
  bindFields(page, d, (k) => {
    if (k === 'pkgPrice') d.pkgPrice = num(d.pkgPrice);
    if (k === 'date' && d.date) { d.validUntil = addDays(d.date, days); page.querySelector('[data-date="validUntil"]').textContent = longDate(d.validUntil); }
    if (['pkgPrice', 'discPct', 'discName', 'depositPct'].includes(k)) refresh();
    onChange();
  });

  drawDeliv(); drawAddons(); drawInvAddons(); refresh(); drawCourt();

  page.querySelector('[data-add-deliv]').addEventListener('click', () => { d.deliverables.push(''); drawDeliv(); onChange(); page.querySelector(`[data-k="deliverables.${d.deliverables.length - 1}"]`)?.focus(); });
  page.querySelector('[data-court-on]').addEventListener('change', (e) => { d.court.on = e.target.checked; drawCourt(); onChange(); });
  page.querySelector('[data-pick-disc]').addEventListener('click', () => pickDiscount(ctx, d, () => {
    page.querySelector('[data-k="discName"]').textContent = d.discName;
    page.querySelector('[data-k="discPct"]').textContent = d.discPct;
    refresh(); onChange();
  }));
  const pickPkg = () => modal(html`
    <h2>Package</h2><p class="muted" style="margin:4px 0 0">Replaces the deliverables, timeline and price with the catalogue's.</p>
    <div class="pick">${ctx.catalogue.packages.map(p => html`<button type="button" data-p="${p.id}"><span><b>${p.name}</b><small>${p.tagline}</small></span><span class="num">${money(p.price)}</span></button>`)}</div>
    <div class="modal__foot"><button type="button" class="btn btn--ghost" data-close>Close</button></div>`.s,
  (el, close) => el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
    Object.assign(d, pkgData(ctx.catalogue.packages.find(p => p.id === b.dataset.p), ctx));
    close(); onChange(); render(page, doc, ctx, onChange);
  })));
  const pk = page.querySelector('[data-pick-pkg]');
  pk.addEventListener('click', pickPkg);
  pk.addEventListener('keydown', (e) => { if (e.key === 'Enter') pickPkg(); });
  page.querySelector('[data-pull]').addEventListener('click', async () => {
    if (!doc.client_id) { toast('Choose a client for this proposal first.', { error: true }); return; }
    try {
      if (await pullAudit(d, doc.client_id)) { onChange(); render(page, doc, ctx, onChange); toast(`Pulled in audit ${d.now.auditNo}`); }
      else toast('This client has no audit yet.', { error: true });
    } catch (e) { toast(e.message, { error: true }); }
  });
}

export async function prepare(data, ctx) {
  // Called once when a proposal is created: pull the client's latest audit if there is one.
  if (ctx.client) { try { await pullAudit(data, ctx.client.id); } catch { /* no audit */ } }
  return data;
}

export function share(doc) {
  const d = doc.data, m = money2(d);
  const hi = firstName(d.client) ? `Hi ${firstName(d.client)}` : 'Hi';
  return `${hi}, here's my proposal for ${d.biz || 'your business'}: the ${d.pkgName} package${d.addons?.length ? ` with ${d.addons.length} add-on${d.addons.length > 1 ? 's' : ''}` : ''}, ${money(m.final)} in total${m.pct ? ` (with the ${d.discName})` : ''}. It covers what we'll build, the timeline and what happens next, and it's valid until ${longDate(d.validUntil)}. Any questions, just reply here.`;
}
