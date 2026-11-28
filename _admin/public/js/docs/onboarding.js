// 05 Client Onboarding Questionnaire. Fill it in on the call, or print it blank-lined for the client.

import { firstName, html, raw, today } from '../ui.js';
import { bandTall, bindFields, D, divider, pageShell, QA, ticks, wireTicks } from './common.js';

const LOGINS = [
  ['domain', 'Domain (where the web address is registered)'], ['google', 'Google account / Business Profile'],
  ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'],
  ['booking', 'Booking system (if any)'], ['payments', 'Payment provider (PayFast, Yoco, etc.)'], ['email', 'Business email'],
];
const CONTENT = [
  ['logo', 'Logo files (any format you have)'], ['photosWork', '10+ photos of your work'], ['photosYou', 'Photos of you / your space'],
  ['priceList', 'Price list'], ['services', 'Short description of each service'], ['reviews', 'Reviews or testimonials'],
  ['beforeAfter', 'Before & after photos'], ['policies', 'Booking / cancellation policy'],
];
const CONTACT = [['whatsapp', 'WhatsApp'], ['email', 'Email'], ['call', 'Phone call'], ['voice', 'Voice notes are fine']];

export function blank(ctx) {
  const c = ctx.client;
  return {
    date: today(),
    a: {
      biz: c?.business || '', owner: c?.name || '', whatsapp: c?.data?.whatsapp || '', email: c?.data?.email || '',
      area: c?.data?.location || '', socials: [c?.data?.instagram, c?.data?.facebook, c?.data?.tiktok].filter(Boolean).join(', '),
    },
    logins: {}, content: {}, contact: {},
  };
}
export const totals = () => ({ amount_cents: 0 });
export const meta = (d) => ({ client: d.a?.biz || d.a?.owner });
export function onClient(data, ctx) {
  const c = ctx.client;
  Object.assign(data.a, { biz: c.business || '', owner: c.name || '', whatsapp: c.data?.whatsapp || '', email: c.data?.email || '', area: c.data?.location || data.a.area });
}

export function render(page, doc, ctx, onChange) {
  const d = doc.data;
  d.a ||= {};
  page.innerHTML = pageShell(html`
    ${raw(bandTall('KM / ONBOARDING', 'Getting to know your business', 'Everything we need to build it properly. Fill in what you can; we’ll go through the rest together at the Sit-down.'))}
    <div class="meta meta--3">
      <div><span class="lab mono muted">REFERENCE</span><div class="val">${doc.number}</div></div>
      <div><span class="lab mono muted">DATE</span><div class="val">${D('date')}</div></div>
      <div><span class="lab mono muted">RETURN TO</span><div class="val">${ctx.company.email}</div></div>
    </div>
    <div class="body">
      <section class="sec">
        ${divider('§ 01 · YOUR BUSINESS')}
        <div class="cks" style="gap:0 24px">
          ${QA('a.biz', 'BUSINESS NAME (AS CLIENTS KNOW IT)')}${QA('a.legal', 'REGISTERED NAME (IF DIFFERENT)')}
          ${QA('a.owner', 'YOUR NAME')}${QA('a.whatsapp', 'WHATSAPP NUMBER')}
          ${QA('a.email', 'EMAIL')}${QA('a.area', 'AREA YOU SERVE')}
          ${QA('a.address', 'ADDRESS (IF CLIENTS COME TO YOU)')}${QA('a.hours', 'BUSINESS HOURS')}
        </div>
        ${QA('a.socials', 'SOCIAL MEDIA HANDLES')}
      </section>
      <section class="sec">
        ${divider('§ 02 · SERVICES AND PRICES')}
        ${QA('a.services', 'EACH SERVICE, ITS PRICE AND HOW LONG IT TAKES', true)}
        ${QA('a.popular', 'YOUR MOST POPULAR SERVICE, AND THE ONE YOU WANT TO SELL MORE OF', true)}
      </section>
      <section class="sec">
        ${divider('§ 03 · YOUR CLIENTS')}
        ${QA('a.who', 'WHO ARE YOUR BEST CLIENTS? (AGE, AREA, WHAT THEY CARE ABOUT)', true)}
        ${QA('a.why', 'WHY DO THEY CHOOSE YOU OVER SOMEONE ELSE?', true)}
        ${QA('a.find', 'HOW DO NEW CLIENTS FIND YOU TODAY?')}
      </section>
      <section class="sec">
        ${divider('§ 04 · YOUR BRAND')}
        ${QA('a.words', 'THREE WORDS THAT SHOULD DESCRIBE YOUR BRAND')}
        <div class="cks" style="gap:0 24px">${QA('a.likes', 'COLOURS AND STYLES YOU LIKE', true)}${QA('a.dislikes', 'COLOURS AND STYLES YOU DON’T LIKE', true)}</div>
        ${QA('a.sites', 'WEBSITES OR ACCOUNTS YOU LIKE THE LOOK OF (LINKS)', true)}
      </section>
      <section class="sec">
        ${divider('§ 05 · LOGINS WE’LL NEED')}
        <p class="q" style="margin-bottom:2mm">Tick the ones you have access to. <b>Don’t write passwords here</b>: we’ll set up a safe way to share them.</p>
        ${ticks('logins', LOGINS)}
        ${QA('a.loginNotes', 'NOTES (E.G. WHO SET UP THE DOMAIN, WHICH EMAIL IS ON GOOGLE)', true)}
      </section>
      <section class="sec">
        ${divider('§ 06 · PHOTOS AND CONTENT CHECKLIST')}
        <p class="q" style="margin-bottom:2mm">Send these within 7 days of the Sit-down so the timeline can start.</p>
        ${ticks('content', CONTENT)}
      </section>
      <section class="sec">
        ${divider('§ 07 · STAYING IN TOUCH')}
        <span class="lab mono muted" style="display:block;margin:2mm 0">HOW YOU PREFER TO BE CONTACTED</span>
        ${ticks('contact', CONTACT)}
        ${QA('a.times', 'BEST DAYS AND TIMES TO REACH YOU')}
        ${QA('a.other', 'ANYTHING ELSE WE SHOULD KNOW?', true)}
      </section>
    </div>`.s, 'THANK YOU. WE’LL TAKE IT FROM HERE', ctx);
  bindFields(page, d, onChange);
  wireTicks(page, d, onChange);
}

export function share(doc) {
  const d = doc.data;
  const hi = firstName(d.a?.owner) ? `Hi ${firstName(d.a.owner)}` : 'Hi';
  return `${hi}, welcome to KingMaker! Here's the onboarding questionnaire (${doc.number}). Fill in what you can and send it back with your photos and logo within 7 days of our Sit-down, then the build clock starts. Please don't send passwords on the form; we'll share those safely.`;
}
