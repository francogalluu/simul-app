"""Editorial promo assets: face crops of the two avatars, and the app captures with the photos
placed exactly over the initial circles (the app shows a member's photo in place of the initial
when they have one; the demo captures were taken without photos).

Run:  python3 scripts/make_editorial_assets.py [en|es ...]     (default: en)
  -> public/avatars/thomas-face.jpg, emily-face.jpg
  -> public/screens/editorial/<lang>-home.png, <lang>-proof.png
Needs Pillow.
"""
import os
import sys
from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
SS = 4  # mask supersampling

# Tighter square crops of the 512x512 avatars: face only (keeps the logos on Thomas's T-shirt out of the circle).
FACE_BOX = {"thomas": (51, 5, 461, 415), "emily": (46, 30, 466, 450)}

# Avatar discs in the 1206x2622 captures: (person, cx, cy, radius, front disc that overlaps it or None).
# Same geometry in English and Spanish. The front disc of a pair has a ring in the background colour.
RING = 6
HOME = [
    ("thomas", 171, 540, 45, (225, 540, 45)),
    ("emily", 225, 540, 45, None),
    ("thomas", 108, 1155, 28, (144, 1155, 28)),
    ("emily", 144, 1155, 28, None),
    ("thomas", 108, 1480, 33, None),
    ("thomas", 441, 1672, 21, None),
    ("thomas", 435, 1865, 21, None),
    ("emily", 108, 2007, 33, None),
    ("emily", 441, 2199, 21, None),
]
# Proof scene: the signed-in person is Emily, so the pair is Emily (behind) & Thomas (front), under the sheet's dimming.
PROOF = [
    ("emily", 171, 540, 45, (225, 540, 45)),
    ("thomas", 225, 540, 45, None),
]
SOURCES = {
    "en": {"home": "screens/home.png", "proof": "screens/proof-review.png"},
    "es": {"home": "screens/es-01-home.png", "proof": "screens/es-06-proof-review.png"},
}


def faces():
    out = {}
    for who, box in FACE_BOX.items():
        im = Image.open(os.path.join(ROOT, "avatars", f"{who}.jpg")).convert("RGB").crop(box)
        im.save(os.path.join(ROOT, "avatars", f"{who}-face.jpg"), quality=93)
        out[who] = im
    return out


def disc(size, cx, cy, r):
    m = Image.new("L", (size[0] * SS, size[1] * SS), 0)
    ImageDraw.Draw(m).ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=255)
    return m.resize(size, Image.LANCZOS)


def place(shot, discs, face, dim=1.0):
    for who, cx, cy, r, front in discs:
        pad = r + 2
        box = (cx - pad, cy - pad, cx + pad, cy + pad)
        size = (pad * 2, pad * 2)
        mask = disc(size, pad, pad, r + 0.4)
        if front:
            fx, fy, fr = front
            cut = disc(size, fx - box[0], fy - box[1], fr + RING)
            mask = ImageChops.subtract(mask, cut)
        photo = Image.new("RGB", size)
        photo.paste(face[who].resize((r * 2 + 2, r * 2 + 2), Image.LANCZOS), (pad - r - 1, pad - r - 1))
        if dim < 1:
            photo = photo.point(lambda v: int(v * dim))
        shot.paste(photo, box, mask)
    return shot


if __name__ == "__main__":
    face = faces()
    os.makedirs(os.path.join(ROOT, "screens", "editorial"), exist_ok=True)
    for lang in sys.argv[1:] or ["en"]:
        src = SOURCES[lang]
        home = place(Image.open(os.path.join(ROOT, src["home"])).convert("RGB"), HOME, face)
        home.save(os.path.join(ROOT, "screens", "editorial", f"{lang}-home.png"))
        proof = Image.open(os.path.join(ROOT, src["proof"])).convert("RGB")
        # the sheet dims the Home behind it: measure the dimming from the page background (#FAF6EE -> ?)
        dim = proof.getpixel((20, 400))[0] / 0xFA
        place(proof, PROOF, face, dim).save(os.path.join(ROOT, "screens", "editorial", f"{lang}-proof.png"))
        print("wrote", lang, "dim", round(dim, 3))
