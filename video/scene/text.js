// Texturas de texto en canvas para tipografía cinética en 3D.
import * as THREE from 'three';

export function textTexture(lines, {
  font = 'RocBlackObl', size = 300, fill = '#f2f2f2', stroke = null, strokeWidth = 6,
  lineHeight = 0.92, padding = 40, align = 'center', tracking = 0,
} = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${size}px ${font}`;
  const widths = lines.map((l) => ctx.measureText(l).width + tracking * l.length);
  const w = Math.ceil(Math.max(...widths) + padding * 2);
  const h = Math.ceil(lines.length * size * lineHeight + padding * 2 + size * 0.15);
  c.width = w; c.height = h;
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.letterSpacing = `${tracking}px`;
  lines.forEach((l, i) => {
    const x = align === 'center' ? (w - widths[i]) / 2 : padding;
    const y = padding + i * size * lineHeight;
    const st = Array.isArray(stroke) ? stroke[i] : stroke;
    const fl = Array.isArray(fill) ? fill[i] : fill;
    if (fl) { ctx.fillStyle = fl; ctx.fillText(l, x, y); }
    if (st) { ctx.lineWidth = strokeWidth; ctx.strokeStyle = st; ctx.strokeText(l, x, y); }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / h, w, h };
}

export function textPlane(lines, opts = {}, height = 1) {
  const { tex, aspect } = textTexture(lines, opts);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
  mesh.userData.aspect = aspect;
  return mesh;
}

// Fila de palabra repetida (estilo Nike) que se desplaza horizontalmente.
export function wordBand(word, opts = {}, height = 1, reps = 8) {
  const line = Array(reps).fill(word).join('  ');
  const group = new THREE.Group();
  const a = textPlane([line], { padding: 10, ...opts }, height);
  group.add(a);
  group.userData.width = height * a.userData.aspect;
  group.userData.reps = reps;
  return group;
}

export async function imagePlane(url, height = 1) {
  const tex = await new THREE.TextureLoader().loadAsync(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const aspect = tex.image.width / tex.image.height;
  return new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), mat);
}
