// AT THE CLUB — video de presentación de marca (tipografía cinética 3D, blanco y negro).
// window.renderFrame(t) dibuja el cuadro del segundo t de forma determinista.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { textPlane, wordBand, letterGroup, imagePlane } from './text.js';

const TL = await (await fetch('/video/timeline.json')).json();
const fams = ['RocBlackObl', 'RocBlack', 'RocLightObl', 'RocMedObl', 'BioBold', 'BioIt', 'BioLight'];
await Promise.all(fams.map((f) => document.fonts.load(`100px ${f}`)));
await document.fonts.ready;

const W = TL.width, H = TL.height;
const WHITE = 0xf2f2f2;

// ---------- utilidades ----------
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
const easeOut = (k) => 1 - Math.pow(1 - clamp01(k), 3);
const easeInOut = (k) => { k = clamp01(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const easeOutBack = (k) => { k = clamp01(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise1 = (t) => Math.sin(t * 13.1) * 0.5 + Math.sin(t * 29.7 + 1.3) * 0.3 + Math.sin(t * 51.3 + 2.1) * 0.2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer / escena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 7, 26);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);

const lineMat = new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false, fog: false });

const groups = {};
const mkGroup = (id) => { const g = new THREE.Group(); groups[id] = g; scene.add(g); return g; };
const noFog = (o) => o.traverse((m) => { if (m.material) m.material.fog = false; });

// Bandas de palabra gigante (fondo cinético) — se orientan a cámara.
function bandStack(word, rows = 5, h = 0.9) {
  const g = new THREE.Group();
  for (let i = 0; i < rows; i++) {
    const outline = i % 2 === 0;
    const b = wordBand(word, outline
      ? { fill: null, stroke: '#f2f2f2', strokeWidth: 4, size: 220 }
      : { fill: '#f2f2f2', size: 220 }, h, 6);
    b.position.y = (i - (rows - 1) / 2) * h * 0.95;
    b.userData.dir = i % 2 ? 1 : -1;
    b.userData.speed = 0.35 + 0.15 * (i % 3);
    noFog(b);
    b.traverse((m) => { if (m.material) m.material.opacity = outline ? 0.32 : 0.1; });
    g.add(b);
  }
  return g;
}
function updateBands(g, t, speedMul = 1) {
  for (const b of g.children) {
    const w = b.userData.width / b.userData.reps;
    b.position.x = (((t * b.userData.speed * speedMul * b.userData.dir) % w) + w) % w - w / 2;
  }
}
// ================= INTRO =================
const gIntro = mkGroup('intro');
const pill = await imagePlane('/brand/logos/png/atc-pill-blanco.png', 0.62);
gIntro.add(pill);
const muevete = [];
for (let i = 0; i < 7; i++) {
  const p = textPlane(['MUÉ', 'VE', 'TE.'], i === 0
    ? { fill: '#f2f2f2', size: 320, lineHeight: 0.86 }
    : { fill: null, stroke: '#f2f2f2', strokeWidth: 4, size: 320, lineHeight: 0.86 }, 2.6);
  p.position.z = -i * 0.35;
  p.material.opacity = i === 0 ? 1 : 0.5 - i * 0.06;
  noFog(p);
  gIntro.add(p);
  muevete.push(p);
}
const scanLines = [];
for (let i = 0; i < 14; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.006), lineMat.clone());
  m.material.transparent = true;
  gIntro.add(m); scanLines.push(m);
}

function sceneIntro(lt) {
  camera.position.set(0.05 * noise1(lt * 0.3), 0, lerp(5.2, 4.3, easeInOut(lt / 3)));
  camera.lookAt(0, 0, 0);
  camera.rotation.z = lerp(0.02, -0.03, lt / 3);
  // latido + parpadeo del logo
  const flick = lt < 0.9 ? (hash(Math.floor(lt * 20)) > 0.35 ? 1 : 0.1) : 1;
  const beat = 1 + 0.06 * Math.exp(-((lt % 0.5) * 9));
  const out = smooth((lt - 1.15) / 0.2);
  pill.visible = lt < 1.4;
  pill.material.opacity = (lt < 0.15 ? 0 : flick) * (1 - out);
  pill.scale.setScalar(beat * (1 + out * 2.5));
  // MUÉVETE en túnel
  const k = easeOut((lt - 1.25) / 0.35);
  muevete.forEach((p, i) => {
    p.visible = lt > 1.25;
    p.scale.setScalar(lerp(3.2, 1, k) * (1 + 0.02 * i));
    p.position.z = -i * lerp(0.05, 0.42, easeOut((lt - 1.4) / 1.2));
    p.position.x = i * 0.015 * Math.sin(lt * 3);
  });
  scanLines.forEach((m, i) => {
    const y = ((hash(i) * 4 + lt * (0.4 + hash(i + 9))) % 4) - 2;
    m.position.set(0, y, 0.5 + hash(i + 3));
    m.material.opacity = 0.15 + 0.3 * hash(i + 5);
  });
}

// ================= TIPOGRAFÍA (sin personas) =================
// Ancho visible del cuadro a una distancia d de la cámara (formato vertical 9:16, fov 40).
const frameW = (d) => d * 2 * Math.tan(THREE.MathUtils.degToRad(20)) * (W / H);
const fitW = (m, w) => { m.scale.setScalar(w / m.geometry.parameters.width); return m; };
const word = (lines, opts, w) => { const m = fitW(textPlane(lines, { fill: '#f2f2f2', ...opts }, 1), w); noFog(m); return m; };

// Pista de atletismo en perspectiva (carriles + marcas que pasan).
function makeTrack(g, lanes = 6, spacing = 0.55) {
  const marks = [];
  for (let i = 0; i <= lanes; i++) {
    const x = (i - lanes / 2) * spacing;
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 200), lineMat);
    l.rotation.x = -Math.PI / 2; l.position.set(x, 0, -95); g.add(l);
  }
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lanes * spacing, 0.06), lineMat);
    m.rotation.x = -Math.PI / 2; g.add(m); marks.push(m);
  }
  return (travel) => marks.forEach((m, i) => { m.position.set(0, 0.001, ((i * 2.2 + travel) % 66) - 60); });
}

// ---- 1. NO POR LLEGAR PRIMERO ----
const gPrimero = mkGroup('primero');
const trackA = makeTrack(gPrimero);
const noPor = word(['NO POR LLEGAR'], { font: 'BioBold', size: 120, tracking: 10 }, 1.0);
const primero = word(['PRIMERO.'], { font: 'RocBlackObl', size: 300 }, 1.55);
const primeroGhost = word(['PRIMERO.'], { font: 'RocBlackObl', size: 300, fill: null, stroke: '#f2f2f2', strokeWidth: 5 }, 1.55);
const strike = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.045), lineMat);
[noPor, primero, primeroGhost, strike].forEach((m) => gPrimero.add(m));

function scenePrimero(lt) {
  const travel = lt * 7;
  trackA(travel);
  camera.position.set(0, 0.55 + 0.01 * Math.sin(lt * 9), 3.2 - lt * 0.35);
  camera.lookAt(0, 0.75, -4);
  const z = -1.2;
  const a = easeOut(lt / 0.35);
  noPor.position.set(0, 1.55 - 0.05 * (1 - a), z);
  noPor.material.opacity = a;
  const b = easeOutBack((lt - 0.5) / 0.4);
  primero.position.set(0, 1.12, z);
  fitW(primero, 1.55 * lerp(1.6, 1, b));
  primero.material.opacity = smooth((lt - 0.5) / 0.15);
  // tachado: "no se trata de llegar primero"
  const s = easeInOut((lt - 1.35) / 0.3);
  strike.visible = s > 0;
  strike.scale.x = 1.7 * s;
  strike.position.set(-0.85 + 0.85 * s, 1.13, z + 0.01);
  const fadeOut = smooth((lt - 1.6) / 0.4);
  primero.material.opacity *= 1 - fadeOut;
  primeroGhost.position.copy(primero.position);
  primeroGhost.scale.copy(primero.scale);
  primeroGhost.material.opacity = fadeOut * 0.8;
  noPor.material.opacity *= 1 - fadeOut * 0.6;
}

// ---- 2. ...SINO POR TODO LO QUE DESPIERTAS EN EL CAMINO (pila acumulada) ----
const gStack = mkGroup('despiertas');
const STACK = ['FUERZA.', 'CALMA.', 'ENERGÍA.', 'DISCIPLINA.', 'RITMO.', 'CONFIANZA.', 'COMUNIDAD.'];
const stackWords = STACK.map((w) => { const m = word([w], { font: 'RocBlackObl', size: 260 }, 1); gStack.add(m); return m; });
const stackStep = 0.42;
function sceneDespiertas(lt) {
  camera.position.set(0.04 * Math.sin(lt * 0.6), 0, lerp(4.4, 4.0, easeInOut(lt / 3.75)));
  camera.lookAt(0, 0, 0);
  const n = STACK.length;
  // cada palabra entra abajo en grande; las anteriores suben, se achican y se apagan
  let y = -0.55;
  for (let i = n - 1; i >= 0; i--) {
    const m = stackWords[i];
    const tIn = 0.15 + i * stackStep;
    const shown = lt >= tIn;
    m.visible = shown;
    if (!shown) continue;
    let level = 0;
    for (let j = i + 1; j < n; j++) level += easeOut((lt - (0.15 + j * stackStep)) / 0.25);
    const w = 1.45 * Math.pow(0.74, level);
    const pop = easeOutBack((lt - tIn) / 0.3);
    fitW(m, w * lerp(1.25, 1, pop));
    const h = m.geometry.parameters.height * m.scale.y;
    m.position.set(0, y + h / 2, 0);
    y += h * 0.78;
    m.material.opacity = smooth((lt - tIn) / 0.12) * lerp(1, 0.28, clamp01(level / 2));
  }
  gStack.position.y = -y / 2 + 0.25;
}

// ---- 3. CADA GOLPE ----
const gGolpe = mkGroup('golpe');
const golpeBands = bandStack('BOX', 9, 0.42);
gGolpe.add(golpeBands);
const golpe = letterGroup('GOLPE.', { font: 'RocBlackObl', size: 300, fill: '#f2f2f2' }, 0.62);
noFog(golpe); gGolpe.add(golpe);
const shock = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.615, 128),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, toneMapped: false, fog: false }));
  gGolpe.add(m); shock.push(m);
}
let impact = 0;
// golpes del combo (mismos tiempos que los efectos de sonido)
const punchTimes = [];
for (let bar = 8; bar < 12; bar += 2) for (const o of [0, 0.5, 1.0, 1.25, 1.5]) punchTimes.push(bar + o + 0.09);
function sceneGolpe(lt, t) {
  const past = punchTimes.filter((p) => p <= t);
  const last = past[past.length - 1] ?? -10;
  const age = t - last;
  impact = Math.max(0, 1 - age / 0.14);
  camera.position.set(impact * 0.04 * noise1(t * 11), impact * 0.04 * noise1(t * 7 + 2), 3.6 - lt * 0.15);
  camera.lookAt(0, 0, 0);
  golpeBands.position.set(0, 0, -1.6);
  golpeBands.scale.setScalar(1);
  updateBands(golpeBands, t, 0.9 + impact * 2);
  golpeBands.children.forEach((b, i) => b.traverse((m) => { if (m.material) m.material.opacity = (i % 2 ? 0.1 : 0.32) + impact * 0.25; }));
  const enter = easeOutBack(lt / 0.25);
  golpe.children.forEach((l, i) => {
    const jolt = impact * (hash(i + past.length * 7) - 0.5) * 0.08;
    l.position.set(l.userData.x0 * lerp(1.6, 1, enter) + jolt, jolt * 0.6, 0);
    l.rotation.z = jolt * 1.5;
    l.material.opacity = smooth(lt / 0.12);
  });
  const sc = 1 + impact * 0.12;
  golpe.scale.setScalar(sc * (frameW(3.6) * 0.86) / golpe.userData.width);
  shock.forEach((m, i) => {
    const p = past[past.length - 1 - i];
    if (p === undefined) { m.visible = false; return; }
    const a = t - p;
    m.visible = a < 0.45;
    m.position.set(0, 0, 0.05);
    m.scale.setScalar(0.6 + a * 6);
    m.material.opacity = Math.max(0, 1 - a / 0.45) * 0.8;
  });
}

// ---- 4. CADA PASO ----
const gPaso = mkGroup('paso');
const trackB = makeTrack(gPaso, 8, 0.5);
const paso = letterGroup('PASO.', { font: 'RocBlackObl', size: 300, fill: '#f2f2f2' }, 0.7);
noFog(paso); gPaso.add(paso);
function scenePaso(lt, t) {
  trackB(lt * 9);
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 0.03; // un paso por beat
  camera.position.set(0.02 * Math.sin(t * Math.PI), 0.42 + bob, 2.4);
  camera.lookAt(0, 0.45, -3);
  paso.position.set(0, 0.62, -0.6);
  paso.scale.setScalar((frameW(3.0) * 0.82) / paso.userData.width);
  paso.children.forEach((l, i) => {
    const tIn = 0.08 + i * 0.3;   // cada letra "pisa" en su tiempo
    const k = easeOut((lt - tIn) / 0.18);
    l.visible = lt >= tIn;
    l.position.set(l.userData.x0, lerp(0.45, 0, k) + 0.03 * Math.exp(-(((lt - tIn - 0.18) * 14) ** 2)), lerp(-1.2, 0, k));
    l.material.opacity = k;
  });
}

// ---- 5. CADA RESPIRACIÓN ----
const gResp = mkGroup('respira');
const respira = letterGroup('RESPIRA.', { font: 'RocLightObl', size: 300, fill: '#f2f2f2' }, 0.5);
noFog(respira); gResp.add(respira);
const barreLine = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.008), lineMat);
gResp.add(barreLine);
const respSub = word(['BARRE · YOGA · PILATES'], { font: 'BioBold', size: 110, tracking: 14 }, 0.95);
gResp.add(respSub);
const motes = [];
for (let i = 0; i < 60; i++) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.004 + hash(i) * 0.006, 8),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, toneMapped: false, fog: false }));
  gResp.add(m); motes.push(m);
}
function sceneRespira(lt) {
  camera.position.set(0, 0, 3.6 - lt * 0.08);
  camera.lookAt(0, 0, 0);
  // inhalar (expande) / exhalar (recoge), ciclo de 3.5 s
  const breath = Math.sin(clamp01(lt / 3.3) * Math.PI);
  const spread = 1 + 0.35 * breath;
  respira.scale.setScalar((frameW(3.6) * 0.7) / respira.userData.width);
  respira.children.forEach((l, i) => {
    const a = smooth((lt - 0.1 - i * 0.06) / 0.4);
    l.position.set(l.userData.x0 * spread, 0.12 + 0.03 * breath, 0);
    l.material.opacity = a;
  });
  const lk = easeInOut((lt - 0.4) / 1.4);
  barreLine.scale.x = Math.max(0.001, 1.25 * lk);
  barreLine.position.set(-0.625 + 0.625 * lk, -0.12, 0);
  const sk = easeOut((lt - 1.2) / 0.6);
  respSub.position.set(0, -0.27 - 0.03 * (1 - sk), 0);
  respSub.material.opacity = sk * 0.85;
  motes.forEach((m, i) => {
    m.position.set((hash(i) - 0.5) * 2.2, ((hash(i + 7) * 3 + lt * (0.04 + hash(i + 3) * 0.05)) % 3) - 1.5, -0.5 - hash(i + 11));
    m.material.opacity = 0.15 + 0.35 * hash(i + 5);
  });
}

// ---- 6. NOS CONECTA (muro de disciplinas) ----
const gConecta = mkGroup('conecta');
const wall = new THREE.Group(); gConecta.add(wall);
const WALL = ['RUN', 'BOX', 'BARRE', 'YOGA', 'PILATES'];
for (let r = 0; r < 13; r++) {
  const w = WALL[r % WALL.length];
  const b = wordBand(w, r % 2 ? { fill: '#f2f2f2', size: 200 } : { fill: null, stroke: '#f2f2f2', strokeWidth: 4, size: 200 }, 0.3, 8);
  b.position.y = (r - 6) * 0.29;
  b.userData.dir = r % 2 ? 1 : -1;
  b.userData.speed = 0.25 + 0.1 * (r % 3);
  b.userData.row = r;
  noFog(b);
  wall.add(b);
}
const conecta = word(['NOS', 'CONECTA.'], { font: 'RocBlackObl', size: 300, lineHeight: 0.88 }, 1.3);
gConecta.add(conecta);
const conectaBg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, fog: false }));
gConecta.add(conectaBg);
function sceneConecta(lt, t) {
  const k = easeInOut((lt - 1.9) / 1.1);
  camera.position.set(0, lerp(0, -0.2, k), lerp(3.4, 7.5, k));
  camera.lookAt(0, 0, 0);
  wall.rotation.set(lerp(0, -0.5, k), lerp(0, 0.35, k), lerp(0, -0.12, k));
  updateBands(wall, t, 1 + 2 * k);
  // las filas se van iluminando hasta que todo el muro brilla: todas las disciplinas, una comunidad
  wall.children.forEach((b) => {
    const r = b.userData.row;
    const on = smooth((lt - 0.15 - Math.abs(r - 6) * 0.07) / 0.2);
    b.traverse((m) => { if (m.material) m.material.opacity = lerp(0.12, r % 2 ? 0.55 : 0.8, on) * (1 - 0.5 * k); });
  });
  const c = easeOutBack((lt - 0.5) / 0.4);
  conecta.visible = lt > 0.5;
  conecta.position.set(0, 0, 0.3);
  fitW(conecta, 1.3 * lerp(1.3, 1, c));
  conecta.material.opacity = smooth((lt - 0.5) / 0.15) * (1 - smooth((lt - 2.3) / 0.4));
  conectaBg.position.set(0, 0, 0.25);
  conectaBg.scale.set(1.5, 0.75, 1);
  conectaBg.material.opacity = 0.75 * conecta.material.opacity;
}

// ================= GLOBE =================
const gGlobe = mkGroup('globe');
const globe = new THREE.Group(); gGlobe.add(globe);
const GR = 1.45;
const occ = new THREE.Mesh(new THREE.SphereGeometry(GR * 0.985, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.82 }));
globe.add(occ);
const globeLines = [];
for (const lat of [-60, -30, 0, 30, 60]) {
  const r = GR * Math.cos(lat * Math.PI / 180);
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 6, 128), lineMat);
  m.rotation.x = Math.PI / 2; m.position.y = GR * Math.sin(lat * Math.PI / 180);
  globe.add(m); globeLines.push(m);
}
for (let lon = 0; lon < 180; lon += 30) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(GR, 0.009, 6, 128), lineMat);
  m.rotation.y = lon * Math.PI / 180; globe.add(m); globeLines.push(m);
}
const ll = (lat, lon, r = GR) => {
  const la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
  return V(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
};
const cityObjs = TL.cities.map((c, i) => {
  const pos = ll(c.lat, c.lon, GR * 1.003);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(c.hub ? 0.035 : 0.026, 16, 12), lineMat);
  dot.position.copy(pos); globe.add(dot);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.058, 48),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  ring.position.copy(pos); ring.lookAt(pos.clone().multiplyScalar(2)); globe.add(ring);
  const label = textPlane([c.name], { font: 'BioBold', size: 90, fill: '#f2f2f2', padding: 12 }, 0.16);
  noFog(label); gGlobe.add(label);
  return { ...c, pos, dot, ring, label, i };
});
const hub = cityObjs.find((c) => c.hub);
const arcs = cityObjs.filter((c) => !c.hub).map((c, i) => {
  const pts = [];
  const d = hub.pos.angleTo(c.pos);
  for (let k = 0; k <= 64; k++) {
    const u = k / 64;
    const p = hub.pos.clone().normalize().lerp(c.pos.clone().normalize(), u).normalize();
    p.multiplyScalar(GR * (1 + Math.sin(Math.PI * u) * (0.04 + d * 0.35)));
    pts.push(p);
  }
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.008, 6, false);
  const m = new THREE.Mesh(geo, lineMat); globe.add(m);
  return { mesh: m, count: geo.index.count, delay: 0.5 + i * 0.45, city: c };
});
const centerLon = -40, centerLat = 18;

function sceneGlobe(lt, t, fade = 1) {
  const spin = easeOut(lt / 3.2);
  globe.rotation.y = -centerLon * Math.PI / 180 + lerp(-2.1, 0, spin) + 0.03 * lt;
  globe.rotation.x = centerLat * Math.PI / 180;
  const appear = easeOutBack((lt) / 0.8);
  globe.scale.setScalar(appear);
  globe.updateMatrixWorld(true);
  arcs.forEach((a) => {
    const k = easeInOut((lt - a.delay) / 0.9);
    a.mesh.geometry.setDrawRange(0, Math.floor(a.count * k / 6) * 6);
    a.mesh.visible = k > 0;
  });
  camera.position.set(0.2 * Math.sin(lt * 0.4), 0.15, lerp(10.5, 8.6, easeInOut(lt / 5.5)));
  camera.lookAt(0, 0, 0);
  cityObjs.forEach((c) => {
    const arc = arcs.find((a) => a.city === c);
    const shown = c.hub ? smooth((lt - 0.3) / 0.3) : smooth((lt - (arc.delay + 0.8)) / 0.25);
    const wp = c.pos.clone().applyMatrix4(globe.matrixWorld);
    const facing = wp.clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
    c.label.visible = shown > 0.01 && facing;
    // etiqueta a un lado del punto (las tres ciudades andinas están muy juntas)
    const [side, dy] = { MEDELLÍN: [-1, 0.06], CALI: [-1, -0.16], BARRANQUILLA: [-1, 0.24], BOGOTÁ: [1, -0.05], VALENCIA: [1, 0.06] }[c.name];
    const halfW = 0.16 * c.label.userData.aspect / 2;
    c.label.position.copy(wp).add(V(side * (halfW + 0.07), dy, 0.15));
    c.label.quaternion.copy(camera.quaternion);
    c.label.material.opacity = shown * fade;
    c.label.scale.setScalar(0.8 + 0.2 * easeOutBack((shown)));
    const age = (lt + c.i * 0.3) % 1.2;
    c.ring.scale.setScalar(1 + age * 2.5);
    c.ring.material.opacity = (1 - age / 1.2) * shown * fade;
  });
  occ.material.opacity = 0.82 * fade;
}

// ================= LOGO =================
const gLogo = mkGroup('logo');
const logoStack = new THREE.Group(); gLogo.add(logoStack);
const pillTex = pill.material.map;
for (let i = 0; i < 16; i++) {
  const m = new THREE.Mesh(pill.geometry, new THREE.MeshBasicMaterial({
    map: pillTex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    color: new THREE.Color().setScalar(i === 0 ? 1 : 0.35 - i * 0.015),
  }));
  m.position.z = -i * 0.006;
  m.renderOrder = 100 - i;
  logoStack.add(m);
}
const brandName = fitW(textPlane(['AT THE CLUB'], { font: 'RocBlackObl', size: 220, fill: '#f2f2f2' }, 1), 1.0);
const tagline = fitW(textPlane(['ONE ECOSYSTEM.', 'ONE COMMUNITY.'], { font: 'RocMedObl', size: 140, fill: '#f2f2f2', lineHeight: 1.0 }, 1), 0.62);
const discRow = fitW(textPlane(['BARRE · YOGA · BOXING', 'PILATES · SOCIAL RUN'], { font: 'BioBold', size: 90, fill: '#f2f2f2', lineHeight: 1.25, tracking: 4 }, 1), 0.6);
const web = fitW(textPlane(['WELLNESSATTHECLUB.COM'], { font: 'BioBold', size: 90, fill: '#f2f2f2', tracking: 8 }, 1), 0.62);
const citiesRow = fitW(textPlane(['MEDELLÍN · CALI · BARRANQUILLA', 'BOGOTÁ · VALENCIA'], { font: 'BioIt', size: 80, fill: '#bdbdbd', lineHeight: 1.3, tracking: 4 }, 1), 0.6);
[brandName, tagline, web, citiesRow, discRow].forEach((m) => { noFog(m); gLogo.add(m); });
noFog(logoStack);
const logoGlobe = await imagePlane('/brand/logos/png/atc-globo-blanco.png', 1);
fitW(logoGlobe, 2.6);
logoGlobe.position.set(0, 0.35, -2.5); logoGlobe.material.opacity = 0.0; noFog(logoGlobe);
gLogo.add(logoGlobe);

function sceneLogo(lt) {
  const k = easeOutBack(lt / 0.9);
  logoStack.position.set(0, lerp(-0.4, 0.62, easeOut(lt / 0.9)), lerp(-5, 0, easeOut(lt / 0.9)));
  logoStack.rotation.set(lerp(0.9, 0, k) + 0.05 * Math.sin(lt * 1.3), lerp(-1.4, 0, k) + 0.12 * Math.sin(lt * 0.9 + 0.5), 0);
  logoStack.scale.setScalar(lerp(0.4, 0.72, easeOut(lt / 0.9)));
  const out = 1 - smooth((lt - 4.5) / 0.45);
  const show = (m, at, y, dy = 0.06) => {
    const a = easeOut((lt - at) / 0.45);
    m.visible = lt > at;
    m.position.set(0, y - dy * (1 - a), 0.1);
    m.material.opacity = a * out;
  };
  show(brandName, 0.9, 0.12);
  show(tagline, 1.35, -0.16);
  show(discRow, 1.75, -0.44);
  show(web, 2.15, -0.68);
  show(citiesRow, 2.5, -0.86);
  logoStack.children.forEach((m) => { m.material.opacity = out; });
  logoGlobe.material.opacity = 0.14 * smooth((lt - 0.8) / 1) * out;
  logoGlobe.rotation.z = -0.1 + lt * 0.01;
  camera.position.set(0.05 * Math.sin(lt * 0.7), 0.0, lerp(3.4, 3.15, lt / 5));
  camera.lookAt(0, -0.05, 0);
}

// ---------- postproducción ----------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const after = new AfterimagePass(0.0);
composer.addPass(after);
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.22, 0.45, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finalPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, chroma: { value: 0 }, flash: { value: 0 }, fade: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, chroma, flash, fade; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*7.31) * 43758.5453); }
    void main(){
      vec2 d = (vUv - 0.5);
      float ca = 0.0025 + chroma * 0.018;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + d * ca).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - d * ca).b;
      float vig = smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.8)));
      c *= mix(0.55, 1.0, vig);
      c = (c - 0.5) * 1.08 + 0.5;               // contraste
      c += (rnd(vUv * 1000.0) - 0.5) * 0.07;     // grano
      c = mix(c, vec3(1.0), flash);
      gl_FragColor = vec4(c * fade, 1.0);
    }`,
});
composer.addPass(finalPass);

// ---------- HUD + subtítulos ----------
const $ = (id) => document.getElementById(id);
const fmt = (c) => `${Math.abs(c.lat).toFixed(2).padStart(5, '0')}°${c.lat >= 0 ? 'N' : 'S'} ${Math.abs(c.lon).toFixed(2).padStart(5, '0')}°${c.lon >= 0 ? 'E' : 'W'}`;
let lastCap = null;
function updateHud(t, sceneIdx, disc, cityIdx) {
  const c = TL.cities[cityIdx % TL.cities.length];
  $('city').textContent = c.name;
  $('coords').textContent = fmt(c);
  $('idx').textContent = String(sceneIdx + 1).padStart(3, '0');
  $('disc').textContent = disc;
  const hudOn = t > 0.3 ? 1 : 0;
  for (const id of ['tl', 'tr', 'bl', 'br']) $(id).style.opacity = hudOn * (t > 29.4 ? 0 : 0.9);
  const cap = TL.captions.find((cp) => t >= cp.at && t < cp.end);
  const capEl = $('cap');
  if (!cap) { capEl.innerHTML = ''; lastCap = null; return; }
  if (lastCap !== cap) {
    capEl.innerHTML = cap.text.split(' ').map((w) => `<span>${w}</span>`).join(' ');
    lastCap = cap;
  }
  [...capEl.children].forEach((s, i) => {
    const a = easeOut((t - cap.at - i * 0.07) / 0.18);
    const outK = smooth((t - (cap.end - 0.2)) / 0.2);
    s.style.opacity = a * (1 - outK);
    s.style.transform = `translateY(${(1 - a) * 26}px)`;
  });
}

// ---------- secuenciador ----------
const cuts = TL.scenes.map((sc) => sc.start);
// id de escena -> [función, disciplina en el HUD, ciudad en el HUD, estela de movimiento]
const SCENES = {
  intro: [(lt) => sceneIntro(lt), 'MOVE', 0, 0],
  primero: [(lt) => scenePrimero(lt), 'SOCIAL RUN', 2, 0.3],
  despiertas: [(lt) => sceneDespiertas(lt), 'WELLNESS', 1, 0],
  golpe: [(lt, t) => sceneGolpe(lt, t), 'BOXING', 1, 0.35],
  paso: [(lt, t) => scenePaso(lt, t), 'SOCIAL RUN', 3, 0.3],
  respira: [(lt) => sceneRespira(lt), 'BARRE', 4, 0],
  conecta: [(lt, t) => sceneConecta(lt, t), 'COMMUNITY', 0, 0.25],
  globe: [(lt, t) => sceneGlobe(lt, t), 'COMMUNITY', null, 0],
  logo: [(lt) => sceneLogo(lt), 'ATC', 0, 0],
};

window.renderFrame = (t) => {
  for (const g of Object.values(groups)) g.visible = false;
  camera.rotation.z = 0;
  impact = 0;
  const si = TL.scenes.findIndex((sc) => t >= sc.start && t < sc.end);
  const s = TL.scenes[si < 0 ? TL.scenes.length - 1 : si];
  const lt = t - s.start;
  const [fn, disc, city, damp] = SCENES[s.id];
  groups[s.id].visible = true;
  fn(lt, t);
  const cityIdx = city ?? Math.floor(lt / 1.1);

  // cortes: flash + aberración cromática, y reinicio de estelas
  const lastCut = Math.max(...cuts.filter((c) => c <= t));
  const sinceCut = t - lastCut;
  const flashK = lastCut > 0 ? Math.max(0, 1 - sinceCut / 0.08) * 0.22 : 0;
  finalPass.uniforms.flash.value = flashK + (s.id === 'logo' ? Math.max(0, 1 - Math.abs(lt - 0.9) / 0.08) * 0.5 : 0);
  finalPass.uniforms.chroma.value = 0.6 * Math.max(0, 1 - sinceCut / 0.25) + impact * 0.6;
  finalPass.uniforms.time.value = t;
  finalPass.uniforms.fade.value = Math.min(smooth(t / 0.25), 1 - smooth((t - 29.5) / 0.5));
  after.uniforms.damp.value = sinceCut < 1 / 30 ? 0 : damp;
  updateHud(t, si < 0 ? 7 : si, disc, cityIdx);
  composer.render();
  return true;
};
window.ready = true;
