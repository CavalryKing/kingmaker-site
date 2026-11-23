"""Crop, convert and export site photos.

Usage:
    py _tools/process_images.py <source-dir>

<source-dir> holds the original photos named as in SLOTS below (e.g. hero-photographer.jpg).
For each slot this writes, under assets/img/<section>/:
    <name>-<w>.webp  and  <name>-<w>.jpg   for every width in the slot

Photos are converted to high-contrast greyscale unless the slot sets colour=True
(client screenshots stay in colour on purpose). To swap in your own photo, drop it
into the source dir with the same file name and run this again.
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"

# section, name, source file, aspect (w/h), focus x, focus y, widths, colour
SLOTS = [
    ("hero",    "photographer", "hero-photographer.jpg", 5 / 4,  .50, .30, (800, 1200, 1600, 2000), False),
    ("trades",  "nail-tech",    "nail-tech.jpg",         1 / 1.3, .45, .50, (400, 800, 1200), False),
    ("trades",  "photographer", "photographer.jpg",      2.2,    .50, .42, (400, 800, 1600), False),
    ("trades",  "handyman",     "handyman.jpg",          2.4,    .50, .30, (400, 800, 1200), False),
    ("trades",  "tutor",        "tutor.jpg",             4 / 3,  .50, .50, (400, 800), False),
    ("trades",  "barber",       "barber.jpg",            4 / 3,  .50, .40, (400, 800), False),
    ("process", "sit-down",     "sit-down.jpg",          1,      .50, .55, (400, 800), False),
    ("process", "blueprint",    "blueprint.jpg",         1,      .55, .60, (400, 800), False),
    ("process", "build",        "build.jpg",             1,      .40, .45, (400, 800), False),
    ("process", "hand-over",    "hand-over.jpg",         1,      .40, .35, (400, 800), False),
    ("work",    "lightville-shot", "lightville-shot.webp", 16 / 9, .5, .5, (800, 1200, 1600), True),
    ("work",    "jnluxe-shot",     "jnluxe-shot.webp",     16 / 9, .5, .5, (800, 1200, 1600), True),
    ("cta",     "result",       "result.jpg",            1,      .50, .30, (480, 960), False),
    ("packages", "pawn",        "pawn.jpg",              16 / 9, .50, .50, (480, 800, 1280), True),    # already B&W; grading blows out the light
    ("packages", "knight",      "knight.jpg",            16 / 9, .50, .50, (480, 800, 1280), True),    # already B&W; grading blows out the light
    ("packages", "king",        "king.jpg",              16 / 9, .50, .50, (480, 800, 1280), True),    # already B&W; grading blows out the light
    ("founder", "sam",          "sam.jpg",               4 / 5,  .50, .00, (440, 880), True),   # already B&W; grading blows out the wall
    ("work",    "jnluxe-before",   "jnluxe-before.jpg",    4 / 3, .5, .5, (800, 1200, 1600), True),   # board: 3 phone windows, CSS greys it
    ("work",    "jnluxe-after",    "jnluxe-after.jpg",     4 / 3, .5, .5, (800, 1200, 1600), True),
]

def grade(im: Image.Image) -> Image.Image:
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g, cutoff=1)
    return ImageEnhance.Contrast(g).enhance(1.15)

def main(src_dir: Path) -> None:
    for section, name, src, ratio, fx, fy, widths, colour in SLOTS:
        f = src_dir / src
        if not f.exists():
            print(f"skip  {section}/{name}  (no {src})")
            continue
        im = Image.open(f)
        im = ImageOps.exif_transpose(im).convert("RGB")
        im = im if colour else grade(im)
        w0 = min(im.width, int(im.height * ratio))
        h0 = int(w0 / ratio)
        im = ImageOps.fit(im, (w0, h0), centering=(fx, fy))
        d = OUT / section
        d.mkdir(parents=True, exist_ok=True)
        for w in widths:
            if w > w0:
                print(f"note  {section}/{name}: source only {w0}px wide, {w}w upscaled")
            r = im.resize((w, round(w / ratio)), Image.LANCZOS)
            r.save(d / f"{name}-{w}.webp", "WEBP", quality=72, method=6)
            r.save(d / f"{name}-{w}.jpg", "JPEG", quality=78, optimize=True, progressive=True)
        print(f"ok    {section}/{name}  {', '.join(map(str, widths))}  ({w}x{round(w / ratio)})")

if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_photos")
