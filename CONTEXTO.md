# Contexto — AT THE CLUB (ATC Wellness)

## La marca
- **Nombre:** AT THE CLUB / ATC Wellness. Web: wellnessattheclub.com. Instagram: @wellnessattheclub. Correo: hola@wellnessattheclub.com.
- **Qué es:** comunidad de bienestar ("Wellness Global Community"), activa desde 2025. Lema: "One Ecosystem, One Community".
- **Disciplinas:** barre, yoga, boxing, pilates y Social Run. Muchas clases son al aire libre (Parques del Río en Medellín, Parque del Ingenio en Cali), con brunch o smoothie después. La comunidad se organiza por grupos de WhatsApp.
- **Ciudades:** Medellín (base), Cali, Barranquilla y Bogotá en Colombia; Valencia en España.
- **Cliente ideal:** personas de 20 a 35 años interesadas en bienestar, movimiento y conexión.
- **Identidad visual:** solo blanco y negro, sin color de acento (decisión de la dueña).
  - Logos: píldora "ATC." (el principal), globo "ATC" y bandera "ATC". Hay versiones PNG transparentes en `brand/logos/png/`.
  - Tipografías: Rocinante Titling (variable, de Light a Black, con oblicua) para titulares y Bio Sans Italic (ExtraLight, Italic y Bold) para textos. Están en `brand/fonts/`.
- **Referentes visuales:** Nike, Adidas, Alo Yoga y Action Black. La referencia que más gustó es un anuncio de Nike solo tipográfico: "MAÑANA… HOY. AHORA. YA.", pista de atletismo y "JUST DO IT".

## Video de presentación de marca (en curso)
- **Formato:** Reel vertical de 1080×1920, 30 fps y 30 s, en tipografía cinética 3D en blanco y negro, **sin personas**. Las siluetas 3D se descartaron porque parecían muñecos.
- **Voz:** femenina, en español con seseo (acento latino). Se generó con Kokoro TTS, voz `ef_dora`.
- **Guion:** "Muévete. No por llegar primero… sino por todo lo que despiertas en el camino. Cada golpe. Cada paso. Cada respiración. Nos conecta. Cinco ciudades. Una sola comunidad. Esto es At The Club."
- **Escenas:**
  1. 0–3 s: logo y MUÉVETE.
  2. 3–5,25 s: NO POR LLEGAR / PRIMERO. tachado sobre una pista de atletismo.
  3. 5,25–9 s: pila de palabras (FUERZA, CALMA, ENERGÍA, DISCIPLINA, RITMO, CONFIANZA, COMUNIDAD).
  4. 9–11 s: GOLPE. con impactos sobre un muro de "BOX".
  5. 11–13 s: PASO. letra por letra sobre la pista.
  6. 13–16,5 s: RESPIRA. que respira, sobre una línea de barre.
  7. 16,5–19,5 s: NOS CONECTA. sobre un muro de RUN, BOX, BARRE, YOGA y PILATES.
  8. 19,5–25 s: globo con las 5 ciudades conectadas.
  9. 25–30 s: logo, "AT THE CLUB", "ONE ECOSYSTEM. ONE COMMUNITY.", disciplinas, web y ciudades.
- **Audio:** música a 120 BPM sintetizada, golpes y pasos sincronizados con la imagen, whooshes en los cortes. Los efectos van ~8 dB por debajo de la voz y el master a -14 LUFS.
- **Reglas aplicadas:** el texto respeta la zona segura de Reels (x 140–940, y 230–1530).
- **Código:** repo `Rayo4587/Flashhh`, rama `claude/epic-mayer-k38ruo`, carpeta `video/`. Se arma con `./build.sh` y deja el resultado en `out/ATC_brand_video.mp4`. Ver `video/README.md`.

## EDIT IA PRO / MOTION PRO (pendiente de instalar)
- Es un paquete comprado: el Chip Editor (skill `editor-video`), las skills de HyperFrames y la biblioteca MOTION PRO (145 escenas, transiciones, efectos, sonidos y música).
- Solo funciona en **Mac o Windows**; no se puede instalar en una sesión en la nube con Linux.
- Debe quedar en `~/EDIT-IA-PRO` y se instala con `uv run --no-project python instalar.py`, siguiendo el `INSTALAR.md`.
- La Mac de la dueña ("MacBook-Air-de-Admin") ya tiene Remote Control activo con la carpeta `EDIT-IA-PRO`. La sesión en la nube no pudo usarla porque la carpeta no es un repositorio Git.
- **Siguiente paso:** instalar EDIT IA PRO desde una sesión de Claude Code que corra en la propia Mac.

## Preferencias de trabajo
- Español latinoamericano, explicaciones simples y sin comandos para la dueña.
- Prefiere un resultado profesional "nivel Nike", minimalista y tipográfico, a efectos llamativos.
