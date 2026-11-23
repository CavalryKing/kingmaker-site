# thekingmakerstudio.com

The KingMaker website. Plain HTML, CSS and JavaScript, with no build step.
Whatever is on the `main` branch is the live site (GitHub Pages).

## Structure

```
index.html            Home
packages/index.html   /packages/
work/index.html       /work/
book/index.html       /book/
404.html
assets/css/site.css   all styles
assets/js/site.js     config (WhatsApp, email, form key), PRICES, menu, booking form
assets/brand/         logo, icon, favicon and OG image (final, do not edit)
_design/              brief and approved draft (local only, git-ignored)
_tools/               optional helper scripts (not published)
```

## Preview locally

From this folder, run one of these, then open http://localhost:8000:

```
python -m http.server 8000
npx serve .
```

Paths are root-relative (`/assets/...`), so opening the HTML file directly
(file://) will not load styles. Use a local server.

## Common edits

- **Prices:** change `KM_PRICES` at the top of `assets/js/site.js`, then search the
  HTML for `data-price="<name>"` and update the number there too (that copy is what
  Google and no-JS visitors see).
- **Contact details:** `KM_CONFIG` at the top of `assets/js/site.js`.
- **Header / footer:** copied into every page. Edit them in `index.html`, then run
  `python _tools/sync_partials.py` to copy them to the other pages
  (`--check` just reports pages that are out of sync).
- **Logos:** every occurrence is marked `<!-- KM-LOGO -->`.

## Deploy

```
git add -A
git commit -m "describe the change"
git push
```

GitHub Pages republishes within a minute or two of each push to `main`.
