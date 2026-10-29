#!/usr/bin/env bash
# Genera el video de marca de AT THE CLUB de punta a punta.
#   ./build.sh            -> out/ATC_brand_video.mp4 (1080x1920, 30 fps, ~30 s)
#   SKIP_RENDER=1 ./build.sh   -> rehace solo voz + audio y vuelve a montar
set -euo pipefail
cd "$(dirname "$0")"

echo "== dependencias"
npm install --silent
python3 -m pip install -q kokoro-onnx soundfile scipy fonttools

echo "== tipografías (instancias estáticas de Rocinante)"
python3 scene/make_fonts.py

echo "== locución (Kokoro, voz ef_dora)"
python3 voice/tts.py

echo "== música + efectos + mezcla"
python3 audio/make_audio.py
ffmpeg -v error -y -i build/mix_raw.wav -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 build/mix.wav

if [[ -z "${SKIP_RENDER:-}" ]]; then
  echo "== render 3D (Chromium headless, ~15 min)"
  node render.js
fi

echo "== montaje final"
mkdir -p out
ffmpeg -v error -y -i build/video_silent.mp4 -i build/mix.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/ATC_brand_video.mp4
echo "listo: out/ATC_brand_video.mp4"
