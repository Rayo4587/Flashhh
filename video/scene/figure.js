// Atleta estilizado (maniquí de cápsulas) + animaciones procedurales: correr, boxear, barre.
// Convención: la figura mira a +Z. Extremidades apuntan a -Y en reposo.
//   rotation.x negativa en hombro/cadera => la extremidad va hacia adelante.
//   rotation.x positiva en rodilla => la pierna se dobla hacia atrás; negativa en codo => antebrazo adelante.
import * as THREE from 'three';

const capsule = (r, len, mat) => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
  m.castShadow = true;
  return m;
};

const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => Math.min(1, Math.max(0, k));

export class Figure {
  constructor(mat, { gloves = false } = {}) {
    this.root = new THREE.Group();
    this.hips = new THREE.Group();
    this.root.add(this.hips);
    this.j = {};
    const j = this.j;

    const pelvis = capsule(0.12, 0.14, mat);
    pelvis.rotation.z = Math.PI / 2;
    this.hips.add(pelvis);

    j.spine = new THREE.Group(); this.hips.add(j.spine);
    const abs = capsule(0.115, 0.16, mat); abs.position.y = 0.16; j.spine.add(abs);
    j.chest = new THREE.Group(); j.chest.position.y = 0.26; j.spine.add(j.chest);
    const chest = capsule(0.155, 0.16, mat); chest.position.y = 0.1; chest.scale.set(1.15, 1, 0.8); j.chest.add(chest);
    j.neck = new THREE.Group(); j.neck.position.y = 0.3; j.chest.add(j.neck);
    const neck = capsule(0.045, 0.06, mat); neck.position.y = 0.03; j.neck.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 18), mat);
    head.position.y = 0.15; head.scale.set(0.92, 1.08, 1); head.castShadow = true;
    j.neck.add(head);
    // coleta: guiño femenino/atlético
    const pony = capsule(0.035, 0.14, mat); pony.position.set(0, 0.17, -0.12); pony.rotation.x = 0.7; j.neck.add(pony);
    this.chestAnchor = chest;

    for (const side of ['l', 'r']) {
      const s = side === 'l' ? 1 : -1;
      const sh = new THREE.Group(); sh.position.set(0.2 * s, 0.2, 0); j.chest.add(sh);
      const ua = capsule(0.048, 0.22, mat); ua.position.y = -0.14; sh.add(ua);
      const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
      const fa = capsule(0.042, 0.2, mat); fa.position.y = -0.13; el.add(fa);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(gloves ? 0.085 : 0.05, 16, 12), mat);
      hand.position.y = gloves ? -0.3 : -0.28; hand.castShadow = true; el.add(hand);
      j[side + 'Sh'] = sh; j[side + 'El'] = el; j[side + 'Hand'] = hand;

      const hp = new THREE.Group(); hp.position.set(0.095 * s, -0.04, 0); this.hips.add(hp);
      const th = capsule(0.072, 0.3, mat); th.position.y = -0.22; hp.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.45; hp.add(kn);
      const sn = capsule(0.056, 0.32, mat); sn.position.y = -0.22; kn.add(sn);
      const an = new THREE.Group(); an.position.y = -0.45; kn.add(an);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.055, 0.22), mat);
      ft.position.set(0, -0.025, 0.06); ft.castShadow = true; an.add(ft);
      j[side + 'Hip'] = hp; j[side + 'Knee'] = kn; j[side + 'Ank'] = an; j[side + 'Foot'] = ft;
    }
    this.hipsHeight = 0.98;
    this._v = new THREE.Vector3();
  }

  // pose: { hipsY, hips:[x,y,z], spine, chest, neck, lSh, lEl, rSh, rEl, lHip, lKnee, lAnk, rHip, rKnee, rAnk }
  setPose(p) {
    this.hips.position.set(p.hipsX || 0, p.hipsY ?? this.hipsHeight, p.hipsZ || 0);
    this.hips.rotation.set(...(p.hips || [0, 0, 0]));
    for (const k of ['spine', 'chest', 'neck', 'lSh', 'lEl', 'rSh', 'rEl', 'lHip', 'lKnee', 'lAnk', 'rHip', 'rKnee', 'rAnk']) {
      const r = p[k] || [0, 0, 0];
      this.j[k].rotation.set(r[0], r[1], r[2], 'YXZ');
    }
  }

  // Ajusta la altura para que el pie más bajo toque el suelo (y=0).
  plantFeet() {
    this.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    let minY = Infinity;
    for (const f of [this.j.lFoot, this.j.rFoot]) {
      for (const z of [-0.05, 0.17]) {
        const v = this._v.set(0, -0.055, z).applyMatrix4(f.matrixWorld).applyMatrix4(inv);
        minY = Math.min(minY, v.y);
      }
    }
    this.hips.position.y -= minY;
  }

  chestWorld(target) {
    this.chestAnchor.updateWorldMatrix(true, false);
    return target.setFromMatrixPosition(this.chestAnchor.matrixWorld);
  }
}

// ---------- animaciones (funciones puras del tiempo) ----------

export function runPose(t, cadence = 1.45) {
  const ph = t * cadence * Math.PI * 2;
  const s = Math.sin(ph), c = Math.cos(ph);
  const kneeL = 0.25 + 1.55 * Math.pow(Math.max(0, c), 1.4);
  const kneeR = 0.25 + 1.55 * Math.pow(Math.max(0, -c), 1.4);
  return {
    hipsY: 0.93 + 0.06 * Math.abs(Math.cos(ph)),
    hips: [0.05, 0.12 * s, 0],
    spine: [0.2, -0.18 * s, 0],
    chest: [0.05, -0.1 * s, 0],
    neck: [-0.2, 0.12 * s, 0],
    lHip: [-0.95 * s - 0.2, 0, 0],
    rHip: [0.95 * s - 0.2, 0, 0],
    lKnee: [kneeL, 0, 0],
    rKnee: [kneeR, 0, 0],
    lAnk: [-0.25 + 0.35 * Math.max(0, s), 0, 0],
    rAnk: [-0.25 + 0.35 * Math.max(0, -s), 0, 0],
    lSh: [0.85 * s, 0, 0.12],
    rSh: [-0.85 * s, 0, -0.12],
    lEl: [-1.55 + 0.25 * s, 0, 0],
    rEl: [-1.55 - 0.25 * s, 0, 0],
  };
}

// Curva de un golpe: 0 -> 1 rápido, sostener, volver.
function punchCurve(t, t0) {
  const d = t - t0;
  if (d < 0 || d > 0.42) return 0;
  if (d < 0.09) return smooth(d / 0.09);
  if (d < 0.15) return 1;
  return 1 - smooth((d - 0.15) / 0.27);
}

// Combinación jab-cross-jab-hook al ritmo (beat = 0.5 s).
export function boxPose(t, beatOffset = 0) {
  const tt = t + beatOffset;
  const bar = Math.floor(tt / 2) * 2;
  const jab = Math.max(punchCurve(tt, bar), punchCurve(tt, bar + 1.0), punchCurve(tt, bar + 1.25));
  const cross = Math.max(punchCurve(tt, bar + 0.5), punchCurve(tt, bar + 1.5));
  const bounce = Math.abs(Math.sin(tt * Math.PI * 2)) * 0.03;
  const twist = 0.55 * cross - 0.25 * jab;
  return {
    hipsY: 0.9 - bounce,
    hips: [0, 0.45 + twist * 0.6, 0],
    spine: [0.12, twist * 0.5, 0],
    chest: [0.05, twist * 0.4, 0],
    neck: [-0.1, -0.5 - twist * 0.8, 0],
    lHip: [-0.35, -0.25, 0.12],
    rHip: [0.3, -0.25, -0.12],
    lKnee: [0.4, 0, 0],
    rKnee: [0.45, 0, 0],
    lAnk: [-0.05, 0, 0],
    rAnk: [-0.15, 0, 0],
    lSh: [lerp(-0.75, -1.58, jab), 0, lerp(0.35, 0.05, jab)],
    lEl: [lerp(-2.0, -0.05, jab), 0, 0],
    rSh: [lerp(-0.6, -1.6, cross), 0, lerp(-0.4, -0.05, cross)],
    rEl: [lerp(-2.15, -0.05, cross), 0, 0],
    _jab: jab, _cross: cross,
  };
}

// Barre: plié -> port de bras -> arabesque -> relevé (ciclo de 4 s), mano izquierda en la barra.
export function barrePose(t) {
  const c = (t % 4) / 4;
  const plie = Math.sin(clamp01(c / 0.4) * Math.PI);           // 0..0.4
  const arab = Math.sin(clamp01((c - 0.4) / 0.4) * Math.PI);   // 0.4..0.8
  const rel = Math.sin(clamp01((c - 0.78) / 0.22) * Math.PI);  // 0.78..1
  const arm = Math.max(plie, arab);
  return {
    hipsY: 0.98,
    hips: [0, 0, 0],
    spine: [0.35 * arab - 0.05 * plie, 0, 0],
    chest: [0.15 * arab - 0.08 * plie, 0, -0.05 * arm],
    neck: [-0.35 * arab - 0.1 * plie, 0, 0],
    lHip: [-0.55 * plie, 0.65, 0.05 + 0.22 * plie],
    rHip: [-0.55 * plie + 1.25 * arab, -0.65 * (1 - arab), -0.05 - 0.22 * plie],
    lKnee: [1.05 * plie, 0, 0],
    rKnee: [1.05 * plie + 0.05 * arab, 0, 0],
    lAnk: [-0.45 * plie + 0.75 * rel, 0, 0],
    rAnk: [-0.45 * plie + 0.75 * rel + 0.6 * arab, 0, 0],
    lSh: [-1.1, 0, 0.55],
    lEl: [-0.5, 0, 0],
    rSh: [lerp(-0.25, -2.9, arm), 0, lerp(-0.45, -0.25, arm)],
    rEl: [lerp(-0.35, -0.25, arm), 0, 0],
  };
}

export function blendPose(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) {
    const va = a[key], vb = b[key] ?? va;
    out[key] = Array.isArray(va) ? va.map((x, i) => lerp(x, vb[i], k)) : (typeof va === 'number' ? lerp(va, vb, k) : va);
  }
  return out;
}
