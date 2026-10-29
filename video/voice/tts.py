"""Genera la locución (voz femenina en español, Kokoro ef_dora) línea por línea.

Uso: python3 voice/tts.py   (desde video/)
Salida: build/voice/NN.wav + build/voice/lines.json con duraciones.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx.tokenizer import Tokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "build", "voice")
MODEL = os.path.join(ROOT, "build", "kokoro-fp32.onnx")
# Pesos de Kokoro-82M publicados en npm en 19 partes (paquetes a/b/c)
SHARDS = [(os.path.join(ROOT, "node_modules", f"kokoro-fp32{pkg}-shards"), parts)
          for pkg, parts in (("a", range(0, 7)), ("b", range(7, 14)), ("c", range(14, 19)))]
SR = 24000

# Guion. "ipa" permite forzar la pronunciación (p. ej. el nombre de marca en inglés).
LINES = json.load(open(os.path.join(HERE, "script.json"), encoding="utf-8"))


def ensure_model():
    if os.path.exists(MODEL):
        return
    os.makedirs(os.path.dirname(MODEL), exist_ok=True)
    with open(MODEL, "wb") as out:
        for folder, parts in SHARDS:
            for i in parts:
                with open(os.path.join(folder, f"kokoro-fp32.part{i}.bin"), "rb") as f:
                    out.write(f.read())


def main():
    ensure_model()
    os.makedirs(OUT, exist_ok=True)
    sess = ort.InferenceSession(MODEL)
    tok = Tokenizer()
    voice = np.load(os.path.join(ROOT, "models", "voices.npz"))["ef_dora"]
    meta = []
    for i, line in enumerate(LINES):
        # seseo: acento latinoamericano (la marca nace en Colombia)
        phon = line.get("ipa") or tok.phonemize(line["text"], "es").replace("θ", "s")
        ids = tok.tokenize(phon)
        style = voice[len(ids)].astype(np.float32)
        wav = sess.run(None, {
            "input_ids": np.array([[0, *ids, 0]], dtype=np.int64),
            "style": style,
            "speed": np.array([line.get("speed", 0.92)], dtype=np.float32),
        })[0][0].astype(np.float32)
        # recorta silencios de los extremos
        idx = np.where(np.abs(wav) > 0.01)[0]
        wav = wav[max(idx[0] - 240, 0): idx[-1] + 2400]
        path = os.path.join(OUT, f"{i:02d}.wav")
        sf.write(path, wav, SR)
        meta.append({"text": line["text"], "phonemes": phon, "file": path, "dur": len(wav) / SR})
        print(f"{i:02d} {len(wav)/SR:5.2f}s  {line['text']}  [{phon}]", file=sys.stderr)
    json.dump(meta, open(os.path.join(OUT, "lines.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
