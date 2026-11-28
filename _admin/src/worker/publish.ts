// Publish prices: the admin catalogue is the single source of prices. "Publish prices" writes them
// into the public site's repo in ONE commit on main, which GitHub Pages then republishes:
//   assets/js/site.js     the KM_PRICES object (what visitors see)
//   packages/index.html   the data-price="<key>" fallback numbers (what Google and no-JS visitors see)
// Needs the GITHUB_TOKEN secret: a fine-grained token for CavalryKing/kingmaker-site only,
// with "Contents: Read and write". Nothing else.

import { bad, json, now } from './util.ts';

const FILES = ['assets/js/site.js', 'packages/index.html', 'index.html'];
const SITE_URL = 'https://thekingmakerstudio.com';

type Prices = Record<string, number>;

const kmRand = (n: number) => 'R' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** siteKey -> price, from the catalogue setting. */
export function pricesFromCatalogue(cat: any): Prices {
  const out: Prices = {};
  for (const p of [...(cat?.packages ?? []), ...(cat?.addons ?? []), cat?.retainer].filter(Boolean)) {
    if (p.siteKey && Number.isFinite(Number(p.price))) out[p.siteKey] = Math.round(Number(p.price));
  }
  return out;
}

/** Read KM_PRICES out of site.js. */
export function parseSitePrices(js: string): Prices | null {
  const block = js.match(/const KM_PRICES\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return null;
  const out: Prices = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) out[m[1]] = Number(m[2]);
  return out;
}

/** Apply prices to a file's text. Only keys already in the file are touched. */
export function applyPrices(path: string, text: string, prices: Prices): string {
  if (path.endsWith('.js')) {
    return text.replace(/const KM_PRICES\s*=\s*\{[\s\S]*?\};/, (block) =>
      block.replace(/(\b(\w+)\s*:\s*)(\d+)/g, (all, pre, key) => (key in prices ? pre + prices[key] : all)));
  }
  return text.replace(/(data-price="(\w+)"[^>]*>)R[\d,]+(?=<)/g, (all, pre, key) => (key in prices ? pre + kmRand(prices[key]) : all));
}

// ---------- GitHub ----------

const b64decode = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

async function gh(env: Env, path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.github.com/repos/${env.SITE_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${(env.GITHUB_TOKEN ?? '').trim()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'kingmaker-admin',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(body as any).message ?? 'request failed'}`);
  return body;
}

async function getCatalogue(env: Env) {
  const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'catalogue'`).first<{ value: string }>();
  return row ? JSON.parse(row.value) : null;
}

/** Compare the live site's prices with the catalogue (reads the public site, no token needed). */
async function status(env: Env): Promise<Response> {
  const prices = pricesFromCatalogue(await getCatalogue(env));
  let site: Prices | null = null, error = '';
  try {
    const res = await fetch(`${SITE_URL}/assets/js/site.js?t=${Date.now()}`, { cf: { cacheTtl: 0 } } as RequestInit);
    site = res.ok ? parseSitePrices(await res.text()) : null;
    if (!site) error = `Could not read prices from the live site (${res.status}).`;
  } catch (e) { error = 'Could not reach the live site.'; }
  const diff = site ? Object.keys(prices).filter(k => site![k] !== prices[k]).map(k => ({ key: k, site: site![k] ?? null, admin: prices[k] })) : [];
  const last = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'publish'`).first<{ value: string }>();
  return json({ configured: !!env.GITHUB_TOKEN, prices, site, diff, error, last: last ? JSON.parse(last.value) : null });
}

async function publish(env: Env): Promise<Response> {
  if (!env.GITHUB_TOKEN) return bad('Publishing is not set up yet: add the GITHUB_TOKEN secret (see _admin/README.md).', 503);
  const prices = pricesFromCatalogue(await getCatalogue(env));
  if (!Object.keys(prices).length) return bad('The catalogue has no prices to publish.');

  const branch = env.SITE_BRANCH || 'main';
  const ref = await gh(env, `/git/ref/heads/${branch}`);
  const headSha: string = ref.object.sha;
  const head = await gh(env, `/git/commits/${headSha}`);

  const changes: { path: string; content: string }[] = [];
  for (const path of FILES) {
    const file = await gh(env, `/contents/${path}?ref=${headSha}`).catch(() => null);
    if (!file?.content) continue;
    const before = b64decode(file.content);
    const after = applyPrices(path, before, prices);
    if (after !== before) changes.push({ path, content: after });
  }
  if (!changes.length) return json({ ok: true, changed: false });

  const tree = await gh(env, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: head.tree.sha, tree: changes.map(c => ({ path: c.path, mode: '100644', type: 'blob', content: c.content })) }),
  });
  const list = Object.entries(prices).map(([k, v]) => `${k} ${kmRand(v)}`).join(', ');
  const commit = await gh(env, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: `Update prices from KingMaker Admin\n\n${list}`, tree: tree.sha, parents: [headSha] }),
  });
  // Not a force update: if main moved since we read it, GitHub refuses and nothing is lost.
  await gh(env, `/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });

  const record = { sha: commit.sha, at: now(), files: changes.map(c => c.path), prices };
  await env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES ('publish', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).bind(JSON.stringify(record)).run();
  console.log(JSON.stringify({ evt: 'prices_published', sha: commit.sha, files: record.files }));
  return json({ ok: true, changed: true, ...record });
}

export async function handlePublish(request: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === '/api/publish/status' && request.method === 'GET') return status(env);
  if (url.pathname === '/api/publish' && request.method === 'POST') {
    try { return await publish(env); }
    catch (e) {
      console.error(JSON.stringify({ evt: 'prices_publish_failed', error: String(e) }));
      return bad(String((e as Error).message || e), 502);
    }
  }
  return json({ error: 'not_found' }, { status: 404 });
}
