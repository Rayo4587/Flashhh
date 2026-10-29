# AT THE CLUB — video de presentación de marca

Reel vertical (1080×1920, 30 fps, 30 s) en motion graphics 3D, en blanco y negro, con referencias de
Nike, Adidas, Alo Yoga y Action Black. Todo se genera con código: escenas, voz, música y montaje.

```bash
./build.sh            # resultado: out/ATC_brand_video.mp4
```

## Estructura

| Parte | Archivo | Qué hace |
|---|---|---|
| Línea de tiempo | `timeline.json` | Escenas, tiempos de la voz, subtítulos y ciudades. Lo leen la escena y el audio. |
| Escena 3D | `scene/main.js` | Three.js: intro, montaje, boxeo, carrera, barre, conexión, globo y logo. |
| Atleta | `scene/figure.js` | Maniquí 3D con animaciones procedurales (correr, combo de boxeo, barre). |
| Tipografía 3D | `scene/text.js` | Texto cinético en canvas (Rocinante y Bio Sans de la marca). |
| Render | `render.js` | Renderiza cuadro a cuadro en Chromium headless y codifica con ffmpeg. |
| Voz | `voice/tts.py`, `voice/script.json` | Locución femenina en español (Kokoro-82M, voz `ef_dora`, con seseo). |
| Audio | `audio/make_audio.py` | Música a 120 BPM sintetizada, efectos (golpes, whooshes, impactos) y mezcla con ducking. |

## Guion

> Muévete. No por llegar primero… sino por todo lo que despiertas en el camino.
> Cada golpe. Cada paso. Cada respiración. Nos conecta.
> Cinco ciudades. Una sola comunidad. Esto es At The Club.

## Cambios rápidos

- **Texto de la voz:** edita `voice/script.json` y sus tiempos en `timeline.json` (`vo` y `captions`).
- **Revisar cuadros sueltos:** `node render.js --stills 1.5,9.5,26` genera JPG en `build/stills/`.
- **Renderizar un tramo:** `node render.js --from 9 --to 11`.
- **Rehacer solo el audio:** `SKIP_RENDER=1 ./build.sh`.
