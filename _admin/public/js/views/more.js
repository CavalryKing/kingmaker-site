// "More" (phones): the nav items that don't fit in the bottom bar.

import { NAV, SOON } from '../app.js';
import { html } from '../ui.js';

export function render(view) {
  const settings = NAV.find(n => n.id === 'settings');
  view.innerHTML = html`
    <div class="ph"><div><span class="ph__sec mono">MORE</span><h1>More</h1></div></div>
    <div class="card more" style="padding:4px 16px">
      <a href="${settings.href}">${settings.label}</a>
      ${SOON.map(n => html`<a href="${n.href}"><span>${n.label} <span class="chip chip--plain" style="margin-left:6px">SOON</span></span></a>`)}
    </div>`.s;
}
