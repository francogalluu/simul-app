"""Synthesizes the promo's sound effects (no third-party samples, so no licensing).

Run:  python3 scripts/make_sfx.py      -> writes public/sfx/*.wav (44.1 kHz mono)
"""
import math
import os
import random
import struct
import wave

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
random.seed(7)


def write(name, samples, gain=0.9):
    peak = max(1e-9, max(abs(s) for s in samples))
    data = b"".join(struct.pack("<h", int(max(-1, min(1, s / peak * gain)) * 32767)) for s in samples)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def onepole_lp(x, cutoff):
    a = math.exp(-2 * math.pi * cutoff / SR)
    y, out = 0.0, []
    for s in x:
        y = (1 - a) * s + a * y
        out.append(y)
    return out


def hp(x, cutoff):
    lp = onepole_lp(x, cutoff)
    return [a - b for a, b in zip(x, lp)]


def rustle(dur=0.38):
    """Paper being pressed down: band-limited noise with crackly grain bursts."""
    n = int(SR * dur)
    noise = [random.uniform(-1, 1) for _ in range(n)]
    band = onepole_lp(hp(noise, 1800), 7000)
    out = []
    grain = 0.0
    for i, s in enumerate(band):
        t = i / SR
        if random.random() < 0.004:
            grain = random.uniform(0.5, 1.0)
        grain *= 0.9965
        env = min(1, t / 0.015) * math.exp(-t * 7.5)
        out.append(s * env * (0.35 + grain))
    return out


def pop(dur=0.14, f0=950, f1=320):
    n = int(SR * dur)
    out, ph = [], 0.0
    for i in range(n):
        t = i / SR
        f = f1 + (f0 - f1) * math.exp(-t * 38)
        ph += 2 * math.pi * f / SR
        env = min(1, t / 0.002) * math.exp(-t * 30)
        out.append(math.sin(ph) * env)
    return out


def bell(freq, dur, decay):
    n = int(SR * dur)
    partials = [(1, 1.0), (2.0, 0.35), (3.01, 0.12), (4.2, 0.05)]
    out = []
    for i in range(n):
        t = i / SR
        env = min(1, t / 0.004) * math.exp(-t * decay)
        out.append(env * sum(a * math.sin(2 * math.pi * freq * m * t) for m, a in partials))
    return out


def check():
    """Soft two-note 'ding' (E6 -> A6) for the approval."""
    a = bell(1318.5, 0.9, 6.0)
    b = bell(1760.0, 0.9, 5.0)
    off = int(SR * 0.09)
    out = [0.0] * (len(b) + off)
    for i, s in enumerate(a):
        out[i] += s * 0.8
    for i, s in enumerate(b):
        out[i + off] += s
    return out


def whoosh(dur=0.55):
    n = int(SR * dur)
    noise = [random.uniform(-1, 1) for _ in range(n)]
    out, y = [], 0.0
    for i, s in enumerate(noise):
        t = i / dur / SR
        cutoff = 400 + 3800 * math.sin(math.pi * t)
        a = math.exp(-2 * math.pi * cutoff / SR)
        y = (1 - a) * s + a * y
        out.append(y * math.sin(math.pi * t) ** 1.5)
    return out


def tap(dur=0.06):
    n = int(SR * dur)
    noise = [random.uniform(-1, 1) for _ in range(n)]
    body = pop(dur, 420, 180)
    lp = onepole_lp(noise, 2500)
    return [(0.6 * b + 0.4 * c) * math.exp(-i / SR * 70) for i, (b, c) in enumerate(zip(body, lp))]


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    # Entrance pops now use "Clean Minimal Pop" (Pixabay); only the tap and the approval ding are synthesized.
    write("check.wav", check(), 0.8)
    write("tap.wav", tap(), 0.8)
    print("wrote", sorted(os.listdir(OUT)))
