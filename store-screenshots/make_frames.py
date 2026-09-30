"""Frames raw simulator screenshots into App Store images (1320x2868, the 6.9" iPhone size).

Run:  PYTHONPATH=<dir with Pillow> python3 store-screenshots/make_frames.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).parent
RAW, OUT = ROOT / "raw", ROOT / "app-store"
FONTS = ROOT.parent / "node_modules/@expo-google-fonts"
W, H = 1320, 2868

# App palette (src/lib/simulTheme.ts)
CREAM, ACCENT, ACCENT_DEEP, INK, INK_SOFT = "#FAF6EE", "#6BB290", "#4F9B6E", "#262019", "#5C544A"

HEAD = FONTS / "lora/700Bold/Lora_700Bold.ttf"
SUB = FONTS / "nunito/600SemiBold/Nunito_600SemiBold.ttf"

# file, headline, subtitle, background style, options
#   sheet: the capture is an iOS sheet, so the dimmed screen above it is repainted as page background
#   bleed: a larger device that runs off the bottom edge (for screens with empty space at the bottom)
SLIDES = [
    ("01-home.png", "Build habits, together", "Your shared routine, at a glance.", "green", {}),
    ("02-add-weekly.png", "A routine that fits your week", "Exact days, or a few times a week.", "cream", {"sheet": True}),
    ("03-add-shared-proof.png", "Proof it happened", "Attach a photo. Your partner confirms it.", "green", {"sheet": True}),
    ("04-achievements.png", "Celebrate every win", "Earn badges as you keep showing up.", "cream", {}),
    ("05-stats.png", "Watch your streaks grow", "Clear stats show what's working.", "green", {"sheet": True, "bleed": True}),
]


def repaint_dimmed_top(im, rows=310):
    """The dimmed grey above a sheet becomes the page cream. Multiplying keeps anti-aliased text edges intact."""
    im = im.convert("RGB")
    px = im.load()
    for y in range(rows):
        for x in range(im.width):
            r, g, b = px[x, y]
            if 90 <= r <= 240 and abs(r - g) < 16 and abs(g - b) < 26:
                px[x, y] = (min(255, round(r * 250 / 200)), min(255, round(g * 246 / 196)), min(255, round(b * 238 / 187)))
    d = ImageDraw.Draw(im)
    d.rectangle((500, 190, 706, 262), fill=(250, 246, 238))  # sheet grabber
    return im


def gradient(top, bottom):
    img = Image.new("RGB", (W, H), top)
    px = ImageDraw.Draw(img)
    t, b = [tuple(int(c[i : i + 2], 16) for i in (1, 3, 5)) for c in (top, bottom)]
    for y in range(H):
        k = y / (H - 1)
        px.line([(0, y), (W, y)], fill=tuple(round(t[i] + (b[i] - t[i]) * k) for i in range(3)))
    return img


def wrap(draw, text, font, max_w):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            line = trial
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def wrap_balanced(draw, text, font, max_w):
    """Same number of lines as `wrap`, but as even as possible (no lone last word)."""
    n = len(wrap(draw, text, font, max_w))
    lo, hi = 200, max_w
    while lo < hi:
        mid = (lo + hi) // 2
        if len(wrap(draw, text, font, mid)) <= n:
            hi = mid
        else:
            lo = mid + 1
    return wrap(draw, text, font, lo)


def phone(shot, width):
    """Screenshot with rounded screen corners inside a dark bezel, with a soft shadow."""
    scale = width / shot.width
    shot = shot.convert("RGB").resize((width, round(shot.height * scale)), Image.LANCZOS)
    radius, bezel = round(width * 0.137), 18
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *shot.size), radius, fill=255)
    fw, fh = shot.width + 2 * bezel, shot.height + 2 * bezel
    body = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    d = ImageDraw.Draw(body)
    d.rounded_rectangle((0, 0, fw - 1, fh - 1), radius + bezel, fill="#141210")
    d.rounded_rectangle((3, 3, fw - 4, fh - 4), radius + bezel - 3, outline="#3A342D", width=3)
    body.paste(shot, (bezel, bezel), mask)
    pad = 120
    shadow = Image.new("RGBA", (fw + 2 * pad, fh + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((pad, pad + 30, pad + fw, pad + fh + 30), radius + bezel, fill=(20, 40, 30, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    shadow.alpha_composite(body, (pad, pad))
    return shadow, pad


def build(file, head, sub, style, opts):
    green = style == "green"
    canvas = gradient(ACCENT_DEEP, ACCENT) if green else gradient(CREAM, "#E3F1E8")
    d = ImageDraw.Draw(canvas)
    fg, fg2 = ("#FFFFFF", "#F1FAF5") if green else (INK, INK_SOFT)

    hf, sf = ImageFont.truetype(str(HEAD), 116), ImageFont.truetype(str(SUB), 50)
    y = 150
    for line in wrap_balanced(d, head, hf, W - 200):
        d.text((W / 2, y), line, font=hf, fill=fg, anchor="ma")
        y += 136
    y += 18
    for line in wrap(d, sub, sf, W - 260):
        d.text((W / 2, y), line, font=sf, fill=fg2, anchor="ma")
        y += 68

    # Whole device visible, sitting on the bottom margin; the headline block sits above it.
    shot = Image.open(RAW / file)
    if opts.get("sheet"):
        shot = repaint_dimmed_top(shot)
    if opts.get("bleed"):
        dev, pad = phone(shot, 1260)
        top = y + 70
    else:
        dev, pad = phone(shot, 1000)
        top = H - (dev.height - 2 * pad) - 70
    assert top > y + 30, f"{file}: headline overlaps the device ({top} <= {y})"
    canvas.paste(dev, ((W - dev.width) // 2, top - pad), dev)
    if opts.get("bleed"):
        # Fade the empty lower part of the screen into the background.
        fade_h = 520
        bottom = canvas.getpixel((5, H - 1))
        fade = Image.new("RGBA", (W, fade_h), bottom + (0,))
        px = fade.load()
        for yy in range(fade_h):
            a = round(255 * (yy / (fade_h - 1)) ** 1.6)
            for xx in range(W):
                px[xx, yy] = bottom + (a,)
        canvas.paste(fade, (0, H - fade_h), fade)
    return canvas  # RGB: the App Store rejects alpha channels


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for i, (file, head, sub, style, opts) in enumerate(SLIDES, 1):
        out = OUT / f"{i:02d}-{Path(file).stem.split('-', 1)[1]}.png"
        build(file, head, sub, style, opts).save(out)
        print("wrote", out.relative_to(ROOT.parent))
