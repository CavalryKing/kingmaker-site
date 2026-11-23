"""Copy the header and footer from index.html into every other page.

The header/footer are written out in full in each page (no JS injection), so they
work without JavaScript and for search engines. Edit them in index.html, then run:

    python _tools/sync_partials.py          # update all pages
    python _tools/sync_partials.py --check  # report pages that are out of sync

Optional helper, not a build step: the site works whether or not you run it.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOCKS = {
    'HEADER': re.compile(r'<!-- ===== HEADER.*?<!-- ===== /HEADER ===== -->', re.S),
    'FOOTER': re.compile(r'<!-- ===== FOOTER.*?<!-- ===== /FOOTER ===== -->', re.S),
}

src = (ROOT / 'index.html').read_text(encoding='utf-8')
parts = {k: rx.search(src).group(0) for k, rx in BLOCKS.items()}
check = '--check' in sys.argv
bad = 0
for page in sorted(ROOT.rglob('*.html')):
    rel = page.relative_to(ROOT).as_posix()
    if rel == 'index.html' or rel.startswith(('_', '.')):
        continue
    text = page.read_text(encoding='utf-8')
    new = text
    for k, rx in BLOCKS.items():
        new = new.replace(f'<!--@{k}-->', parts[k])
        new = rx.sub(lambda m, k=k: parts[k], new)
    if new != text:
        bad += 1
        print(('OUT OF SYNC: ' if check else 'updated: ') + rel)
        if not check:
            page.write_text(new, encoding='utf-8', newline='\n')
print('all pages in sync' if not bad else f'{bad} page(s) ' + ('need syncing' if check else 'updated'))
sys.exit(1 if (check and bad) else 0)
