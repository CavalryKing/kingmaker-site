# Image credits

All launch photos are from Pexels under the [Pexels License](https://www.pexels.com/license/): free for commercial use, attribution not required. Each one was cropped and converted to greyscale with `_tools/process_images.py`.

| File | Photographer | Source | Licence |
|---|---|---|---|
| `hero/photographer` | Dapo Abideen | https://www.pexels.com/photo/6969020/ | Pexels License |
| `trades/nail-tech` | RDNE Stock project | https://www.pexels.com/photo/7755212/ | Pexels License |
| `trades/photographer` | Lord Keli | https://www.pexels.com/photo/5049926/ | Pexels License |
| `trades/handyman` | Bidvine | https://www.pexels.com/photo/1249611/ | Pexels License |
| `trades/tutor` | Katerina Holmes | https://www.pexels.com/photo/5905480/ | Pexels License |
| `trades/barber` | Barik5ive | https://www.pexels.com/photo/5282408/ | Pexels License |
| `process/sit-down` | Unaizat Abdulgamidova | https://www.pexels.com/photo/12096080/ | Pexels License |
| `process/blueprint` | Monstera Production | https://www.pexels.com/photo/6237967/ | Pexels License |
| `process/build` | Bich Tran | https://www.pexels.com/photo/669996/ | Pexels License |
| `process/hand-over` | Monstera Production | https://www.pexels.com/photo/9429449/ | Pexels License |
| `cta/result` | Ketut Subiyanto | https://www.pexels.com/photo/4353623/ | Pexels License |

Supplied by KingMaker (all rights reserved, not for reuse):

| File | Notes |
|---|---|
| `packages/pawn`, `packages/knight`, `packages/king` | Chess set on black marble. Already black and white, so they skip the grading step. |
| `work/jnluxe-before`, `work/jnluxe-after` | Boards built from phone screenshots of the old vev.co page and the new jnluxe.com/book flow: three windows in matching positions on a dark grid. |
| `founder/sam` | Founder portrait. Cropped 1080 wide from x=6 so the face sits centre, rows 0–1300 kept, 50px of wall added above the head. No side extension. Skips the grading step. |

## Still to supply

These slots show hatched placeholders labelled with the file they need.

| Slot | File | Brief |
|---|---|---|
| LightVille case | `work/lightville-before.webp`, `work/lightville-after.webp` | Old LGSA logo/site, then the new LightVille Games site, 4:3 |

To add one: put the original in `_photos/`, add a line for it to `SLOTS` in `_tools/process_images.py` (set `colour=True` for "after" screenshots), run `py _tools/process_images.py`, then swap the placeholder in the HTML for a `<picture>` like the ones already on the homepage.
