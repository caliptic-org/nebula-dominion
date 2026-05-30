#!/usr/bin/env python
"""Post-processing pass for the Comfy sweep output.

Runs two independent operations:

  tiles      -> center-crop 256×256 PNGs to 128×128 so edge content (any
               unwanted lighting drift) is discarded.  Each tile stays at
               its same path; the file is rewritten in place.

  buildings  -> neural background removal on each per-race / per-age
               render.  The _orig/<slug>-age<N>.png stays intact;
               the cleaned version is written to
               buildings/<race>/<slug>-age<N>.png so the BaseField overlay
               can drop them onto the iso scene with alpha intact.

Why rembg + BRIA RMBG-1.4 instead of a luma threshold:
  • Earlier revisions used a luma ≤ 18/255 threshold on the assumption
    that the prompt's "matte black backdrop" would render as near-zero
    RGB.  In practice dreamshaperXL_lightningDPMSDE produced dark cosmic
    gradients (deep blue, blackened crimson, navy) — luma sits in the
    25-55 band, threshold caught almost nothing, and the output PNG
    grew slightly because we just promoted RGB → RGBA with a fully
    opaque alpha channel.  The "background-removed" buildings were
    therefore the original renders with an extra alpha channel and the
    on-game /base scene picked up obvious dark squares around every
    building sprite.
  • rembg with BRIA RMBG-1.4 (`birefnet-general` weights) is a one-line
    swap, batch-friendly, and copes with the gradient backdrops without
    eating into the building silhouette.  ~177 MB ONNX downloaded once
    to ~/.u2net/ and cached.

Run:
  python scripts/post-process.py            # all
  python scripts/post-process.py tiles
  python scripts/post-process.py buildings
  python scripts/post-process.py buildings --model birefnet-general
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'apps' / 'web' / 'public' / 'assets'

# rembg model.  BiRefNet general is the best-quality default for arbitrary
# subjects (and what BRIA RMBG-1.4 ships under).  `isnet-general-use` is the
# fallback when the ~177 MB BiRefNet download is undesirable; substantially
# faster but a touch noisier on the dark-on-dark edges these renders have.
DEFAULT_REMBG_MODEL = 'birefnet-general'


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


def cutout_buildings(model_name: str, only: list[str] | None = None) -> int:
    """Run rembg on every _orig/<slug>-age<N>.png → parent dir.

    The rembg session is created once and reused so the ONNX model is
    only loaded into memory a single time — important when chewing
    through ~190 images in one run.

    `only` (optional): list of substrings to match against the
    `<race>/<slug>-ageN` path before processing.  Used for spot tests:

        python scripts/post-process.py buildings --only canavar/alfa_tahti-age1
    """
    # Import lazily so `tiles`-only invocations don't pay the
    # onnxruntime + scipy import cost.
    from rembg import new_session, remove  # type: ignore

    print(f'  loading rembg session: {model_name} (first run downloads ~177 MB)')
    session = new_session(model_name)

    count = 0
    build_dir = ASSETS / 'buildings'
    if not build_dir.exists():
        return 0
    for race_dir in sorted(d for d in build_dir.iterdir() if d.is_dir()):
        orig_dir = race_dir / '_orig'
        if not orig_dir.exists():
            continue
        for src in sorted(orig_dir.glob('*.png')):
            rel = f'{race_dir.name}/{src.stem}'
            if only and not any(needle in rel for needle in only):
                continue
            dst = race_dir / src.name
            try:
                img = Image.open(src).convert('RGBA')
            except Exception as e:
                print(f'  ! skip {src}: {e}')
                continue
            out = remove(img, session=session, alpha_matting=False)
            assert isinstance(out, Image.Image)
            out.save(dst, optimize=True)
            count += 1
            # File size delta gives a quick "did anything actually change"
            # signal — when bg gets cut out the transparent regions
            # compress heavily and the dst should land well below src.
            src_kb = src.stat().st_size // 1024
            dst_kb = dst.stat().st_size // 1024
            ratio = (dst_kb / src_kb * 100) if src_kb else 0
            # Plain ASCII arrow — Windows cp1254 console can't encode U+2192.
            print(f'  [ok] {dst.relative_to(ASSETS)}  {src_kb}KB -> {dst_kb}KB ({ratio:.0f}%)')
    return count


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('targets', nargs='*', choices=['tiles', 'buildings'],
                   help="Subset to run (default: all)")
    p.add_argument('--model', default=DEFAULT_REMBG_MODEL,
                   help=f'rembg model name (default: {DEFAULT_REMBG_MODEL})')
    p.add_argument('--only', nargs='*', default=None,
                   help='Only process building paths matching any of these substrings (e.g. canavar/alfa_tahti)')
    args = p.parse_args()

    targets = set(args.targets) or {'tiles', 'buildings'}

    if 'tiles' in targets:
        print('tiles -> Lanczos downsample 1024 -> 128')
        n = downscale_tiles()
        print(f'  {n} files processed\n')
    if 'buildings' in targets:
        print(f'buildings -> rembg bg-removal ({args.model})')
        n = cutout_buildings(args.model, only=args.only)
        print(f'  {n} files processed\n')


if __name__ == '__main__':
    main()
