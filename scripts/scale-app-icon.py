"""
Scale the foreground (non-white) of assets/icon.png to fill ~target_frac of a square canvas.
Run from repo root: py -3 scripts/scale-app-icon.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
ICON = REPO / "assets" / "icon.png"
OUT_SIZE = 1024
# Logo bbox max side as fraction of canvas (iOS-friendly margin for squircle)
TARGET_FRAC = 0.82
WHITE_THRESH = 248  # treat near-white as background (anti-alias)


def main() -> None:
    if not ICON.is_file():
        print(f"Missing {ICON}", file=sys.stderr)
        sys.exit(1)

    im = Image.open(ICON).convert("RGBA")
    w, h = im.size
    px = im.load()
    assert px is not None

    min_x, min_y = w, h
    max_x, max_y = -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 30:
                continue
            if r >= WHITE_THRESH and g >= WHITE_THRESH and b >= WHITE_THRESH:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    if max_x < 0:
        print("No non-white pixels found.", file=sys.stderr)
        sys.exit(1)

    crop = im.crop((min_x, min_y, max_x + 1, max_y + 1))
    cw, ch = crop.size
    side = max(cw, ch)
    scale = (OUT_SIZE * TARGET_FRAC) / side
    new_w = max(1, int(round(cw * scale)))
    new_h = max(1, int(round(ch * scale)))
    resized = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (255, 255, 255, 255))
    ox = (OUT_SIZE - new_w) // 2
    oy = (OUT_SIZE - new_h) // 2
    out.paste(resized, (ox, oy), resized)

    out_rgb = Image.new("RGB", out.size, (255, 255, 255))
    out_rgb.paste(out, mask=out.split()[3])
    out_rgb.save(ICON, format="PNG", optimize=True)

    print(
        f"Updated {ICON} ({w}x{h} -> {OUT_SIZE}x{OUT_SIZE}), "
        f"bbox crop {cw}x{ch}, scale {scale:.3f}, placed {new_w}x{new_h} at ({ox},{oy})"
    )


if __name__ == "__main__":
    main()
