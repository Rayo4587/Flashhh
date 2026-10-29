// AT THE CLUB — video de presentación de marca (motion graphics 3D).
// window.renderFrame(t) dibuja el cuadro del segundo t de forma determinista.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Figure, runPose, boxPose, barrePose } from './figure.js';
import { textPlane, wordBand, imagePlane } from './text.js';

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 7, 26);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 1.25);
key.position.set(3, 7, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 25 });
key.shadow.radius = 4;
scene.add(key);
const rimA = new THREE.DirectionalLight(0xffffff, 1.9); rimA.position.set(-5, 3, -5); scene.add(rimA);
const rimB = new THREE.DirectionalLight(0xffffff, 1.4); rimB.position.set(5, 2.5, -4); scene.add(rimB);

const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.42, metalness: 0.1, envMapIntensity: 0.5 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.72, metalness: 0.15, envMapIntensity: 0.15 });
const lineMat = new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false, fog: false });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const fRun = new Figure(bodyMat);
const fBox = new Figure(bodyMat, { gloves: true });
const fBarre = new Figure(bodyMat);
for (const f of [fRun, fBox, fBarre]) scene.add(f.root);

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
    b.traverse((m) => { if (m.material) m.material.opacity = outline ? 0.55 : 0.16; });
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
function faceCameraBehind(obj, target, dist) {
  const dir = target.clone().sub(camera.position).setY(0).normalize();
  obj.position.copy(target).addScaledVector(dir, dist);
  obj.position.y = target.y + 0.3;
  obj.lookAt(camera.position.x, obj.position.y, camera.position.z);
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
  floor.visible = false;
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

// ================= RUN =================
const gRun = mkGroup('run');
const dashes = [];
for (let lane = -2; lane <= 2; lane++) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 120), lineMat);
  line.rotation.x = -Math.PI / 2; line.position.set(lane * 1.2 + 0.6, 0.002, -30);
  gRun.add(line);
}
for (let i = 0; i < 24; i++) {
  const d = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.05), lineMat);
  d.rotation.x = -Math.PI / 2;
  gRun.add(d); dashes.push(d);
}
const streaks = [];
for (let i = 0; i < 70; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 1.2 + hash(i) * 2), lineMat);
  gRun.add(s); streaks.push(s);
}
const runBands = bandStack('RUN', 6, 1.0);
scene.add(runBands);

function sceneRun(lt, t, variant) {
  fRun.root.visible = true;
  fRun.root.position.set(0, 0, 0);
  fRun.root.rotation.y = 0;
  fRun.setPose(runPose(t));
  const speed = 9;
  dashes.forEach((d, i) => {
    const lane = (i % 4) * 1.2 - 1.8;
    d.position.set(lane + 0.6, 0.003, (((i * 3.3 + t * speed) % 40) + 40) % 40 - 30);
    d.rotation.z = Math.PI / 2;
  });
  streaks.forEach((s, i) => {
    s.position.set((hash(i) - 0.5) * 8, 0.1 + hash(i + 50) * 3.5, ((hash(i + 99) * 30 + t * speed * 2.2) % 30) - 22);
  });
  let target;
  if (variant === 0) { // travelling lateral bajo
    camera.position.set(3.4 - lt * 0.25, 0.6, 1.1 + lt * 0.2);
    target = V(0, 1.0, 0);
  } else if (variant === 1) { // frontal, contrapicado
    camera.position.set(0.6 * Math.sin(lt * 0.8), 0.35, lerp(3.4, 2.8, lt / 2));
    target = V(0, 1.15, 0);
  } else { // pies: "cada paso"
    camera.position.set(2.3 - lt * 0.25, 0.22, 1.3 - lt * 0.1);
    target = V(0, 0.55, 0);
  }
  camera.position.y += 0.025 * Math.abs(Math.sin(t * Math.PI * 2.9));
  camera.lookAt(target);
  faceCameraBehind(runBands, V(0, 1.2, 0), 6);
  updateBands(runBands, t, 2.2);
}

// ================= BOX =================
const gBox = mkGroup('box');
const ringFloor = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.28, 96), lineMat);
ringFloor.rotation.x = -Math.PI / 2; ringFloor.position.y = 0.003; gBox.add(ringFloor);
const ringFloor2 = new THREE.Mesh(new THREE.RingGeometry(1.9, 1.91, 96), lineMat);
ringFloor2.rotation.x = -Math.PI / 2; ringFloor2.position.y = 0.003; gBox.add(ringFloor2);
const shock = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.006, 8, 64),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, toneMapped: false }));
  gBox.add(m); shock.push(m);
}
const boxBands = bandStack('BOX', 6, 1.0);
scene.add(boxBands);
let boxImpact = 0;

// tiempos de golpe del combo (ver boxPose): pico ~0.09 s después del inicio
const punchTimes = [];
for (let bar = 0; bar < 40; bar += 2) for (const o of [0, 0.5, 1.0, 1.25, 1.5]) punchTimes.push(bar + o + 0.09);

function sceneBox(lt, t, variant) {
  fBox.root.visible = true;
  fBox.root.position.set(0, 0, 0);
  fBox.root.rotation.y = -0.55;
  const p = boxPose(t);
  fBox.setPose(p);
  fBox.plantFeet();
  // ondas de impacto
  const past = punchTimes.filter((pt) => pt <= t).slice(-3);
  boxImpact = 0;
  shock.forEach((m, i) => {
    const pt = past[past.length - 1 - i];
    if (pt === undefined) { m.visible = false; return; }
    const age = t - pt;
    m.visible = age < 0.35;
    const hand = Math.round((pt - 0.09) % 2 * 4) / 4;
    const isCross = hand === 0.5 || hand === 1.5;
    const h = isCross ? fBox.j.rHand : fBox.j.lHand;
    h.updateWorldMatrix(true, false);
    m.position.setFromMatrixPosition(h.matrixWorld);
    m.lookAt(camera.position);
    m.scale.setScalar(1 + age * 9);
    m.material.opacity = (1 - age / 0.35) * 0.9;
    if (i === 0) boxImpact = Math.max(0, 1 - age / 0.12);
  });
  let target;
  if (variant === 0) {
    camera.position.set(1.0, 1.45, 2.5 - lt * 0.2);
    target = V(0, 1.3, 0);
  } else {
    camera.position.set(0.5 + lt * 0.2, 0.42, 2.1);
    target = V(-0.1, 1.2, 0);
  }
  camera.position.x += boxImpact * 0.03 * noise1(t * 7);
  camera.position.y += boxImpact * 0.03 * noise1(t * 9 + 3);
  camera.lookAt(target);
  faceCameraBehind(boxBands, V(0, 1.2, 0), 5.5);
  updateBands(boxBands, t, 1.2);
}

// ================= BARRE =================
const gBarre = mkGroup('barre');
fBarre.setPose(barrePose(0));
fBarre.plantFeet();
fBarre.root.updateMatrixWorld(true);
const handPos = V().setFromMatrixPosition(fBarre.j.lHand.matrixWorld);
const barY = handPos.y - 0.02, barX = handPos.x + 0.02;
const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 4, 16), bodyMat);
bar.rotation.x = Math.PI / 2; bar.position.set(barX, barY, 0); bar.castShadow = true; gBarre.add(bar);
for (const z of [-1.6, 1.6]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, barY, 12), bodyMat);
  post.position.set(barX + 0.12, barY / 2, z); gBarre.add(post);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 8), bodyMat);
  arm.rotation.z = Math.PI / 2; arm.position.set(barX + 0.06, barY, z); gBarre.add(arm);
}
const spot = new THREE.SpotLight(0xffffff, 22, 12, 0.45, 0.6, 1.6);
spot.position.set(0, 6, 0.5); spot.target.position.set(0, 0, 0);
gBarre.add(spot); gBarre.add(spot.target);
const barreBands = bandStack('BARRE', 6, 0.9);
scene.add(barreBands);

function sceneBarre(lt, t, variant) {
  fBarre.root.visible = true;
  fBarre.root.position.set(0, 0, 0);
  fBarre.root.rotation.y = 0;
  fBarre.setPose(barrePose(t - 13 + 0.6));
  fBarre.plantFeet();
  const ang = variant === 0 ? lerp(-1.75, -1.35, lt / 3.5) : lerp(-0.6, -0.9, lt);
  const r = variant === 0 ? 3.7 : 3.1;
  camera.position.set(r * Math.sin(ang), variant === 0 ? 1.25 : 0.7, r * Math.cos(ang));
  camera.lookAt(0, variant === 0 ? 1.0 : 1.1, 0);
  faceCameraBehind(barreBands, V(0, 1.1, 0), 5.5);
  updateBands(barreBands, t, 0.6);
}

// ================= CONNECT =================
const gConnect = mkGroup('connect');
const links = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), lineMat);
  gConnect.add(m); links.push(m);
}
const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16), lineMat);
gConnect.add(core);
const pulses = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 128),
    new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; gConnect.add(m); pulses.push(m);
}
const tmpA = V(), tmpB = V(), tmpC = V();
function sceneConnect(lt, t) {
  const R = 1.55;
  const figs = [[fRun, runPose(t)], [fBox, boxPose(t)], [fBarre, barrePose(t)]];
  const chests = [];
  figs.forEach(([f, pose], i) => {
    f.root.visible = true;
    const a = Math.PI / 2 + i * (Math.PI * 2 / 3);
    f.root.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
    f.root.rotation.y = -a + Math.PI / 2 + Math.PI;
    f.setPose(pose);
    if (f !== fRun) f.plantFeet();
    chests.push(f.chestWorld(V()));
  });
  const grow = easeOut((lt - 0.4) / 0.6);
  links.forEach((m, i) => {
    const a = chests[i], b = chests[(i + 1) % 3];
    tmpA.copy(a); tmpB.lerpVectors(a, b, grow);
    m.position.lerpVectors(tmpA, tmpB, 0.5);
    m.scale.set(1, Math.max(0.001, tmpA.distanceTo(tmpB)), 1);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), tmpC.subVectors(tmpB, tmpA).normalize());
    m.visible = grow > 0.01;
  });
  const cy = chests.reduce((s, c) => s + c.y, 0) / 3;
  core.position.set(0, cy, 0);
  core.scale.setScalar((0.6 + 0.6 * Math.exp(-((lt % 0.5) * 8))) * smooth((lt - 0.9) / 0.3) + 0.001);
  pulses.forEach((m, i) => {
    const age = ((lt - 0.9) + i * 0.5) % 2;
    m.visible = lt > 0.9;
    m.scale.setScalar(0.3 + age * 2.2);
    m.material.opacity = Math.max(0, 1 - age / 2) * 0.6;
  });
  const k = easeInOut(lt / 3);
  const ang = lerp(0.3, 1.6, k);
  const r = lerp(7.5, 5.0, k), h = lerp(2.0, 9.5, easeInOut((lt - 1.0) / 2.0));
  camera.position.set(Math.sin(ang) * r, h, Math.cos(ang) * r);
  camera.lookAt(0, lerp(1.0, 0.3, k), 0);
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
  floor.visible = false;
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
// Escala un plano de texto a un ancho dado (el formato vertical manda).
const fitW = (m, w) => { m.scale.setScalar(w / m.geometry.parameters.width); return m; };
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
  floor.visible = false;
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
const cuts = [];
TL.scenes.forEach((s) => cuts.push(s.start));
for (let i = 0; i < TL.montage.length; i++) cuts.push(3 + i);

function hideAll() {
  for (const g of Object.values(groups)) g.visible = false;
  for (const f of [fRun, fBox, fBarre]) f.root.visible = false;
  for (const b of [runBands, boxBands, barreBands]) b.visible = false;
  floor.visible = true;
  camera.rotation.z = 0;
}

window.renderFrame = (t) => {
  hideAll();
  const si = TL.scenes.findIndex((s) => t >= s.start && t < s.end);
  const s = TL.scenes[si < 0 ? TL.scenes.length - 1 : si];
  const lt = t - s.start;
  let damp = 0, disc = 'MOVE', cityIdx = 0;
  const show = (id) => { groups[id].visible = true; };

  if (s.id === 'intro') { show('intro'); sceneIntro(lt); }
  else if (s.id === 'montage') {
    const ci = Math.min(TL.montage.length - 1, Math.floor(lt));
    const kind = TL.montage[ci];
    const sub = lt - ci;
    cityIdx = ci;
    if (kind === 'run') { show('run'); runBands.visible = true; sceneRun(sub, t, ci === 0 ? 0 : 1); disc = 'SOCIAL RUN'; damp = 0.45; }
    if (kind === 'box') { show('box'); boxBands.visible = true; sceneBox(sub, t, ci === 1 ? 0 : 1); disc = 'BOXING'; damp = 0.4; }
    if (kind === 'barre') { show('barre'); barreBands.visible = true; sceneBarre(sub, t, ci === 2 ? 0 : 1); disc = 'BARRE'; damp = 0.35; }
  }
  else if (s.id === 'box') { show('box'); boxBands.visible = true; sceneBox(lt, t, 0); disc = 'BOXING'; damp = 0.4; cityIdx = 1; }
  else if (s.id === 'run') { show('run'); runBands.visible = true; sceneRun(lt, t, 2); disc = 'SOCIAL RUN'; damp = 0.45; cityIdx = 2; }
  else if (s.id === 'barre') { show('barre'); barreBands.visible = true; sceneBarre(lt, t, 0); disc = 'BARRE'; damp = 0.35; cityIdx = 3; }
  else if (s.id === 'connect') { show('connect'); sceneConnect(lt, t); disc = 'CONNECTION'; damp = 0.25; cityIdx = 4; }
  else if (s.id === 'globe') { show('globe'); sceneGlobe(lt, t); disc = 'COMMUNITY'; cityIdx = Math.floor(lt / 1.1); }
  else if (s.id === 'logo') { show('logo'); sceneLogo(lt); disc = 'ATC'; cityIdx = 0; }

  // cortes: flash + aberración cromática, y reinicio de estelas
  const lastCut = Math.max(...cuts.filter((c) => c <= t));
  const sinceCut = t - lastCut;
  const flashK = lastCut > 0 ? Math.max(0, 1 - sinceCut / 0.1) * 0.55 : 0;
  finalPass.uniforms.flash.value = flashK + (s.id === 'logo' ? Math.max(0, 1 - Math.abs(lt - 0.9) / 0.08) * 0.5 : 0);
  finalPass.uniforms.chroma.value = Math.max(0, 1 - sinceCut / 0.3) + boxImpact * 0.5 * (s.id === 'box' || s.id === 'montage' ? 1 : 0);
  finalPass.uniforms.time.value = t;
  finalPass.uniforms.fade.value = Math.min(smooth(t / 0.25), 1 - smooth((t - 29.5) / 0.5));
  after.uniforms.damp.value = sinceCut < 1 / 30 ? 0 : damp;
  updateHud(t, si < 0 ? 7 : si, disc, cityIdx);
  composer.render();
  return true;
};
window.ready = true;
