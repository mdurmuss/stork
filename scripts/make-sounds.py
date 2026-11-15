"""Generates Stork's sound effects into assets/sounds/ (no recordings, so no licensing to track).

    python3 scripts/make-sounds.py

- clatter.wav: Leyleko's "lak lak", a burst of wooden beak clicks.
- chime.wav: soft two-note bell for the end of a focus or a break.
- wind.wav: looping wing whoosh while Leyleko flies during a break.
- night.wav: looping crickets and lapping water for night-time.
"""

import math
import os
import random
import struct
import wave

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
random.seed(7)


def write(name, samples, rate, peak):
    top = max(abs(s) for s in samples) or 1
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b''.join(struct.pack('<h', int(s / top * peak * 32767)) for s in samples))


def lowpass(samples, cutoff, rate):
    a = math.exp(-2 * math.pi * cutoff / rate)
    out, y = [], 0.0
    for x in samples:
        y = (1 - a) * x + a * y
        out.append(y)
    return out


def seamless(samples, fade):
    """Crossfades the extra tail into the head so the sound loops without a click."""
    body, tail = samples[:-fade], samples[-fade:]
    for i in range(fade):
        t = i / fade
        body[i] = body[i] * t + tail[i] * (1 - t)
    return body


def clatter():
    rate = 44100
    out = [0.0] * int(rate * 1.3)
    t = 0.04
    # Storks speed up, then slow down, as they clatter.
    for i in range(18):
        gap = 0.075 - 0.03 * math.sin(math.pi * i / 17)
        loud = 0.6 + 0.4 * math.sin(math.pi * i / 17)
        pitch = random.uniform(0.94, 1.06)
        start = int(t * rate)
        for n in range(int(0.03 * rate)):
            s = n / rate
            env = math.exp(-s / 0.006)
            v = (math.sin(2 * math.pi * 1150 * pitch * s) + 0.6 * math.sin(2 * math.pi * 2350 * pitch * s)) * env
            v += random.uniform(-1, 1) * math.exp(-s / 0.0015) * 0.8
            if start + n < len(out):
                out[start + n] += v * loud
        t += gap
    write('clatter.wav', out, rate, 0.8)


def chime():
    rate = 44100
    out = [0.0] * int(rate * 2.0)
    for offset, freq in ((0.0, 1318.5), (0.2, 1760.0)):
        start = int(offset * rate)
        for n in range(len(out) - start):
            s = n / rate
            attack = min(1, s / 0.004)
            v = math.sin(2 * math.pi * freq * s) * math.exp(-s / 0.55)
            v += 0.35 * math.sin(2 * math.pi * freq * 2.76 * s) * math.exp(-s / 0.18)
            out[start + n] += v * attack
    write('chime.wav', out, rate, 0.55)


def wind():
    rate, seconds, fade = 22050, 4.0, 11025
    n = int(rate * seconds) + fade
    noise = lowpass(lowpass([random.uniform(-1, 1) for _ in range(n)], 700, rate), 900, rate)
    # Seven wingbeats per loop, so the whoosh lines up with itself at the seam.
    beat = 7 / seconds
    out = [x * (0.35 + 0.65 * math.sin(math.pi * beat * i / rate) ** 4) for i, x in enumerate(noise)]
    write('wind.wav', seamless(out, fade), rate, 0.5)


def night():
    rate, seconds, fade = 22050, 6.0, 11025
    n = int(rate * seconds) + fade
    water = lowpass(lowpass([random.uniform(-1, 1) for _ in range(n)], 250, rate), 350, rate)
    peak = max(abs(x) for x in water)
    out = [x / peak * 0.25 * (0.6 + 0.4 * math.sin(2 * math.pi * i / (rate * 3))) for i, x in enumerate(water)]
    # Two crickets, each chirping in short trills at its own pitch and pace.
    for freq, period, first in ((4300, 0.6, 0.1), (4750, 0.75, 0.4)):
        t = first
        while t < seconds + fade / rate:
            for p in range(3):
                start = int((t + p * 0.035) * rate)
                for k in range(int(0.02 * rate)):
                    if start + k < n:
                        env = math.sin(math.pi * k / (0.02 * rate))
                        out[start + k] += 0.12 * env * math.sin(2 * math.pi * freq * k / rate)
            t += period * random.uniform(0.9, 1.1)
    write('night.wav', seamless(out, fade), rate, 0.5)


os.makedirs(OUT, exist_ok=True)
clatter()
chime()
wind()
night()
