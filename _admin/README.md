# KingMaker Admin (admin.thekingmakerstudio.com)

The private back-office: clients, the 8 sales-kit documents, the catalogue and the numbers.
It lives in `_admin/` of the public site's repo. GitHub Pages never publishes folders that start
with `_`, so none of this appears on thekingmakerstudio.com. It runs as its own Cloudflare Worker,
`kingmaker-admin`, deployed by Workers Builds on every push to `main`.

**This repo is public.** The code is fine to be seen (security comes from Cloudflare Access and the
password, not from hiding code). Client records, bank details and the JN Luxe invoice are **not** in the
repo: they live in D1, and the first-run copy is in `seed/seed.private.json` (git-ignored).

## How it fits together

| | |
|---|---|
| Front end | `public/`: plain HTML, CSS and ES modules, no build step. Hash routes (`#/clients`, `#/doc/<id>`…). |
| API | `src/worker/`: one Worker. `/api/*` runs the Worker; everything else is a static file. |
| Data | D1 database `kingmaker-admin`. Schema in `migrations/`. Every device sees the same data. |
| Locks | 1. Cloudflare Access (only your email). 2. The admin password (signed cookie, 30 days), same code as the jnluxe.com admin. The Worker also checks the Access token itself when `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set. |
| Never indexed | `robots.txt` disallows everything; `X-Robots-Tag: noindex` and a `noindex` meta on every response; workers.dev and preview URLs are off; nothing on the public site links here. |

```
public/js/app.js          shell, navigation, router (add future modules to NAV / SOON here)
public/js/store.js        in-memory copy of D1, loaded from /api/state
public/js/views/          dashboard, clients, client, documents, doc (editor), catalogue, settings, soon, more
public/js/docs/           one file per document type + common.js (A4 page parts) + registry.js
public/css/doc.css        the A4 page and its print rules (black footer repeats on every printed page)
src/worker/               index (router), auth, access, api, backup (export/import), publish (prices)
tools/seed.mjs            loads seed/seed.private.json (or any export file) into D1
tests/                    unit tests, and screens.mjs (screenshots at 390/1440 px + A4 PDFs)
reference/                the two approved prototypes (local only, git-ignored)
```

## Local development

```
cd _admin
npm install
copy .dev.vars.example .dev.vars     # then set ADMIN_PASSWORD (12+ characters)
npm run db:migrate:local
npm run seed:local                   # JN Luxe, LightVille Games, KM-INV-0001, bank details
npm run dev                          # http://127.0.0.1:8790
npm test                             # unit tests
node tests/screens.mjs               # screenshots (needs npm run dev); PDF=1 also prints every document
```

## Prices: one source

The **Catalogue** page is the source of truth. **Publish prices to the site** makes one commit to
`main` that updates `KM_PRICES` in `assets/js/site.js` and the `data-price` numbers in the HTML (what
Google and no-JS visitors see). GitHub Pages republishes in a minute or two. The Catalogue page also
reads the live site and shows any difference. Don't edit `KM_PRICES` by hand any more: change prices here.

Needs the `GITHUB_TOKEN` secret: a fine-grained personal access token with access to
**CavalryKing/kingmaker-site only** and **Contents: Read and write**, nothing else.

## Backups

Settings → **Export everything (JSON)** downloads every table. **Import** checks the file, then
replaces everything in one transaction. An export can also be loaded from the command line:
`node tools/seed.mjs --remote path/to/export.json --force`.

## Secrets (never committed)

```
npx wrangler secret put ADMIN_PASSWORD    # 12+ characters; changing it logs out every device
npx wrangler secret put GITHUB_TOKEN      # for Publish prices
```

## Adding a module later (e.g. Apparel orders)

1. Add a migration in `migrations/` for its tables.
2. Add its routes in `src/worker/` and call them from `index.ts`.
3. Add `public/js/views/<module>.js`, a route in `ROUTES` in `app.js`, and move its entry from `SOON` to `NAV`.
