#!/usr/bin/env python
"""Post-processing pass for the Comfy sweep output.

Runs two independent operations:

  tiles      -> center-crop 256×256 PNGs to 128×128 so edge content (any
               unwanted lighting drift) is discarded.  Each tile stays at
               its same path; the file is rewritten in place.

  buildings  -> cut out the solid-black backdrop that the sweep prompt
               asked for, leaving the subject on transparent alpha.  The
               _orig/<slug>-age<N>.png stays intact (original render);
               the cleaned version is written to buildings/<race>/<slug>-age<N>.png
               so the BaseField overlay can use it directly.

Why threshold-cutout instead of a neural model:
  • rembg / BRIA RMBG would be more accurate but require either a pip
    install (~1 GB onnx model download) or a ComfyUI custom node.  The
    Lightning XL prompt explicitly asks for a matte-black backdrop, so
    a luminance threshold catches it cleanly.
  • The threshold is conservative (luma < 18/255) so genuinely dark
    building details (e.g. obsidian / chitin) survive.

Run:
  python scripts/post-process.py            # all
  python scripts/post-process.py tiles
  python scripts/post-process.py buildings
"""

from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'apps' / 'web' / 'public' / 'assets'

# Luma threshold for "this is the matte-black backdrop".  Pixels at or
# below this value get alpha=0; everything brighter keeps full alpha.
# 0.07 ≈ 18/255 — leaves room for shadow tones inside the subject while
# still catching all the prompt-induced black backdrop.
BLACK_LUMA = 18


def downscale_tiles() -> int:
    """Lanczos-downsample every tile PNG to 128x128.

    The Comfy sweep renders tiles at SDXL native 1024x1024 because the
    model produces incoherent noise / random subjects at small sizes
    (too far from its 1024 training resolution).  Downsample with Lanczos
    here so the final 128 px in-game tile keeps all the high-frequency
    detail the model invested in the full-resolution render — much sharper
    and more coherent than asking the model to draw at 128 directly.
    """
    count = 0
    tile_dir = ASSETS / 'tiles'
    if not tile_dir.exists():
        return 0
    for png in tile_dir.rglob('*.png'):
        try:
            img = Image.open(png).convert('RGBA')
        except Exception as e:
            print(f'  ! skip {png}: {e}')
            continue
        if img.size == (128, 128):
            continue  # already downsampled
        img.resize((128, 128), Image.LANCZOS).save(png, optimize=True)
        count += 1
        print(f'  [ok] downsampled {png.relative_to(ASSETS)}')
    return count


def cutout_buildings() -> int:
    """Threshold-cutout matte-black backdrop from each building render."""
    count = 0
    build_dir = ASSETS / 'buildings'
    if not build_dir.exists():
        return 0
    for race_dir in sorted(d for d in build_dir.iterdir() if d.is_dir()):
        orig_dir = race_dir / '_orig'
        if not orig_dir.exists():
            continue
        for src in sorted(orig_dir.glob('*.png')):
            dst = race_dir / src.name
            try:
                img = Image.open(src).convert('RGBA')
            except Exception as e:
                print(f'  ! skip {src}: {e}')
                continue
            pixels = img.load()
            w, h   = img.size
            for y in range(h):
                for x in range(w):
                    r, g, b, _ = pixels[x, y]
                    # ITU-R BT.601 luma — matches human perception well
                    # enough for "is this near-black".
                    luma = (299 * r + 587 * g + 114 * b) // 1000
                    if luma <= BLACK_LUMA:
                        pixels[x, y] = (r, g, b, 0)
            img.save(dst, optimize=True)
            count += 1
            print(f'  [ok] cutout {dst.relative_to(ASSETS)}')
    return count


def main() -> None:
    args = set(sys.argv[1:]) or {'tiles', 'buildings'}
    if 'tiles' in args:
        print('tiles -> Lanczos downsample 1024 -> 128')
        n = downscale_tiles()
        print(f'  {n} files processed\n')
    if 'buildings' in args:
        print('buildings -> matte-black backdrop cutout')
        n = cutout_buildings()
        print(f'  {n} files processed\n')


if __name__ == '__main__':
    main()
