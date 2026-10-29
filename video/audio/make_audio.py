"""Música (120 BPM, sintetizada), efectos de sonido y mezcla con la locución.

Uso: python3 audio/make_audio.py   (desde video/, después de voice/tts.py)
Salida: build/mix_raw.wav (48 kHz estéreo, sin normalizar; build.sh aplica loudnorm)
"""
import json
import os

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
TL = json.load(open(os.path.join(ROOT, "timeline.json"), encoding="utf-8"))
SR = 48000
DUR = TL["duration"]
N = int(SR * DUR)
BEAT = 60 / TL["bpm"]
rng = np.random.default_rng(7)


def T(sec):
    return int(round(sec * SR))


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def place(buf, x, at, gain=1.0):
    i = T(at)
    if i >= len(buf):
        return
    x = x[: len(buf) - i]
    buf[i: i + len(x)] += x * gain


def lp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def declick(x, a=0.004, r=0.012):
    """Rampa de entrada/salida para evitar clics en notas que empiezan o terminan de golpe."""
    x = x.copy()
    na, nr = min(T(a), len(x)), min(T(r), len(x))
    x[:na] *= np.linspace(0, 1, na)
    x[len(x) - nr:] *= np.linspace(1, 0, nr)
    return x


def sweep(x, freqs, width=(0.6, 1.6)):
    """Filtro pasabanda que barre las frecuencias dadas, con fundido cruzado entre bloques."""
    n = len(x)
    centers = np.linspace(0, n, len(freqs))
    out = np.zeros(n)
    wsum = np.zeros(n)
    idx = np.arange(n)
    step = n / (len(freqs) - 1)
    for c, f in zip(centers, freqs):
        w = np.clip(1 - np.abs(idx - c) / step, 0, 1)
        out += bp(x, f * width[0], min(f * width[1], SR / 2 - 100)) * w
        wsum += w
    return out / np.maximum(wsum, 1e-6)


# ---------- instrumentos ----------
def kick(dur=0.45, f0=150, f1=42):
    n = T(dur)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(n, 0.16)
    click = hp(rng.standard_normal(n), 2500) * env_exp(n, 0.004) * 0.35
    return np.tanh((body + click) * 1.6)


def clap(dur=0.3):
    n = T(dur)
    x = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for d in (0, 0.011, 0.022):
        e[T(d):] += env_exp(n - T(d), 0.05 if d == 0.022 else 0.006)
    return x * e * 0.6


def hat(dur=0.06, open_=False):
    n = T(0.25 if open_ else dur)
    return hp(rng.standard_normal(n), 7000) * env_exp(n, 0.08 if open_ else 0.012) * 0.35


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq * (1 + detune)) % 1) - 1


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def impact(dur=2.2):
    n = T(dur)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (30 + 60 * np.exp(-t * 6)) * t) * env_exp(n, 0.5)
    crack = lp(rng.standard_normal(n), 6000) * env_exp(n, 0.06) * 0.5
    tail = lp(rng.standard_normal(n), 900) * env_exp(n, 0.7) * 0.25
    return np.tanh((boom + crack + tail) * 1.4) * 0.9


def whoosh(dur=0.5, rev=False):
    n = T(dur)
    k = np.linspace(0, 1, 12)
    out = sweep(rng.standard_normal(n), 400 + 5000 * (k if not rev else 1 - k))
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * shape * 0.5


def riser(dur=2.5):
    n = T(dur)
    k = np.linspace(0, 1, n)
    out = sweep(rng.standard_normal(n), 300 + 7000 * np.linspace(0, 1, 16) ** 2, (0.7, 1.5))
    tone = np.sin(2 * np.pi * np.cumsum(200 + 600 * k ** 2) / SR) * 0.15
    return (out * 0.5 + tone) * k ** 2


def punch_sfx():
    n = T(0.25)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (90 * np.exp(-t * 20) + 50) * t) * env_exp(n, 0.05)
    snap = bp(rng.standard_normal(n), 1500, 6000) * env_exp(n, 0.012)
    return np.tanh((thump + snap * 0.8) * 2) * 0.6


def heartbeat():
    return kick(0.3, 90, 38) * 0.8


# ---------- composición ----------
music = np.zeros(N)
drums = np.zeros(N)
sfx = np.zeros(N)
side = np.ones(N)  # sidechain por bombo


def add_kick(at, g=1.0):
    place(drums, kick(), at, g)
    i = T(at)
    ln = T(0.28)
    if i < N:
        side[i: i + ln] = np.minimum(side[i: i + ln], 1 - 0.75 * np.exp(-np.arange(min(ln, N - i)) / (0.07 * SR)))


# Intro: latido + dron
for b in (0.0, 1.0, 2.0):
    place(drums, heartbeat(), b + 0.05, 0.9)
    place(drums, heartbeat(), b + 0.32, 0.6)
drone_n = T(3.2)
drone = sum(saw(note(m), drone_n, d) for m, d in ((33, 0), (45, 0.003), (52, -0.004)))
drone = declick(lp(drone, 500) * np.linspace(0, 1, drone_n) ** 1.5 * 0.18, r=0.3)
place(music, drone, 0)
place(sfx, riser(1.6), 1.4, 0.7)

# Sección principal 3 – 16.5 y globo 19.5 – 25
prog = [45, 41, 48, 43]  # La, Fa, Do, Sol (bajo)
chords = {45: (57, 60, 64), 41: (53, 57, 60), 48: (55, 60, 64), 43: (55, 59, 62)}


def groove(start, end, half_time=False, hats16=False, chord_gain=0.12):
    t = start
    beat_i = 0
    while t < end - 1e-6:
        bar_beat = beat_i % 4
        if not half_time or bar_beat in (0,):
            add_kick(t)
        if (bar_beat in (1, 3) and not half_time) or (half_time and bar_beat == 2):
            place(drums, clap(), t, 0.8)
        place(drums, hat(), t + BEAT / 2, 0.5)
        if hats16:
            place(drums, hat(), t + BEAT / 4, 0.25)
            place(drums, hat(), t + 3 * BEAT / 4, 0.25)
        if bar_beat == 3 and beat_i % 8 == 7:
            place(drums, hat(open_=True), t + BEAT / 2, 0.4)
        # bajo en corcheas
        root = prog[(beat_i // 4) % 4]
        for k in range(2):
            n = T(BEAT / 2 * 0.9)
            b = (saw(note(root - 12), n) * 0.6 + np.sin(2 * np.pi * note(root - 12) * np.arange(n) / SR))
            b = declick(lp(b, 220 if not half_time else 140) * env_exp(n, 0.18))
            place(music, b, t + k * BEAT / 2, 0.42)
        # acordes (stabs) en el contratiempo
        if bar_beat in (0, 2):
            n = T(BEAT * 0.45)
            c = sum(saw(note(m), n, d) for m in chords[root] for d in (-0.004, 0.004))
            c = declick(lp(c, 2400 if not half_time else 900) * env_exp(n, 0.12))
            place(music, c, t + BEAT * 0.5, chord_gain)
        t += BEAT
        beat_i += 1


groove(3.0, 13.0, hats16=False)
groove(9.0, 11.0, hats16=True, chord_gain=0.0)  # capa extra de hats en el boxeo
groove(13.0, 16.5, half_time=True, chord_gain=0.09)
# respiración (barre)
for at in (13.4, 15.0):
    n = T(1.2)
    br = bp(rng.standard_normal(n), 300, 2500) * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.25
    place(sfx, br, at)
# conexión: latido a medio tiempo + dron para no dejar huecos
for k in range(6):
    add_kick(16.5 + k * BEAT, 0.8)
    place(drums, heartbeat(), 16.5 + k * BEAT + 0.27, 0.45)
cn = T(3.2)
conn = sum(saw(note(m), cn, d) for m, d in ((33, 0), (45, 0.004), (57, -0.004), (64, 0.003)))
conn = declick(lp(conn, 700) * np.minimum(1, np.linspace(0, 4, cn)) * 0.12, r=0.3)
place(music, conn, 16.4)
# construcción hacia el globo
place(sfx, riser(3.0), 16.5, 0.8)
for i in range(12):
    at = 18.0 + i * (1.5 / 12)
    place(drums, clap(0.15), at, 0.25 + 0.5 * i / 12)
# pad amplio en el globo
pad_n = T(5.8)
pad = sum(saw(note(m), pad_n, d) for m in (57, 64, 69, 72) for d in (-0.006, 0.0, 0.006))
pad = declick(lp(pad, 1600) * np.minimum(1, np.linspace(0, 3, pad_n)) * 0.05, r=0.4)
place(music, pad, 19.5)
groove(19.5, 25.0, chord_gain=0.07)
# cierre: impacto + acorde final
pad_n = T(5.0)
fin = sum(saw(note(m), pad_n, d) for m in (45, 57, 64, 69) for d in (-0.005, 0.005))
fin = declick(lp(fin, 1200) * env_exp(pad_n, 2.2) * 0.07, a=0.01)
place(music, fin, 25.0)
place(sfx, impact(), 25.0, 1.0)
place(sfx, impact(1.5), 3.0, 0.7)
place(sfx, impact(1.2), 19.5, 0.6)

# whooshes en cortes
cuts = sorted(set([s["start"] for s in TL["scenes"]][1:] + [3 + i for i in range(1, len(TL["montage"]))]))
for c in cuts:
    place(sfx, whoosh(0.45), c - 0.3, 0.55)

# golpes en las secciones de boxeo (mismos tiempos que la animación)
box_windows = [(4, 5), (7, 8), (9, 11)]
for bar in range(0, 40, 2):
    for o in (0, 0.5, 1.0, 1.25, 1.5):
        pt = bar + o + 0.09
        if any(a <= pt < b for a, b in box_windows):
            place(sfx, punch_sfx(), pt, 0.8)

# ---------- locución ----------
voice = np.zeros(N)
lines = json.load(open(os.path.join(BUILD, "voice", "lines.json"), encoding="utf-8"))
for cue in TL["vo"]:
    v, sr = sf.read(lines[cue["line"]]["file"])
    v = signal.resample_poly(v, SR, sr)
    place(voice, v, cue["at"], 1.0)
# EQ de voz: quita graves, brillo suave
voice = hp(voice, 90)
voice = voice + 0.25 * hp(voice, 4000)
voice /= np.max(np.abs(voice)) + 1e-9
# envolvente de la voz para ducking de la música
venv = np.abs(signal.hilbert(voice)) if N < 3_000_000 else np.abs(voice)
venv = lp(venv, 6)
venv = np.clip(venv / (venv.max() + 1e-9) * 3, 0, 1)

music_bus = (music * side + drums) * (1 - 0.45 * venv)
music_bus /= np.max(np.abs(music_bus)) + 1e-9
sfx /= np.max(np.abs(sfx)) + 1e-9

# estéreo: pequeña diferencia L/R en la música para darle amplitud
delay = T(0.012)
mL = music_bus
mR = np.concatenate([np.zeros(delay), music_bus[:-delay]]) * 0.95 + music_bus * 0.05
mix_L = 0.55 * mL + 0.45 * sfx + 0.95 * voice
mix_R = 0.55 * mR + 0.45 * sfx + 0.95 * voice
mix = np.stack([mix_L, mix_R], axis=1)
# fundido final
fade = np.ones(N)
fade[T(29.0):] = np.linspace(1, 0, N - T(29.0)) ** 2
mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
sf.write(os.path.join(BUILD, "mix_raw.wav"), mix.astype(np.float32), SR)
print("ok", os.path.join(BUILD, "mix_raw.wav"))
