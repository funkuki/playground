// 剪紙零件庫：平塗色塊、粗線、三層關節、有 seed 的亂數、切面植物
import * as THREE from 'three';

// 色票直接當最終顏色用，不做色彩空間轉換
THREE.ColorManagement.enabled = false;

export const C = {
  bg: 0x382f2f, ink: 0x1d1818,
  coat: 0x26282d, coatLit: 0x363940, hat: 0x1f1e22,
  skin: 0xd8c6a6, hairDark: 0x3a2a24,
  red: 0x9e2a26, redLit: 0xb8433b, redDark: 0x76201d,
  parch: 0xe6dcc6, parchDark: 0xc9bc9f,
  gold: 0xc4a24c, goldLit: 0xe0c46e,
  blue: 0x34507f, blueLit: 0x46669a,
  hair: 0xc8a050, hairShade: 0xa98538,
  fur: 0x8b807d, furLit: 0x9e938f, furDark: 0x6b615e,
  hare: 0x8a6e55, hareLit: 0x9c8064, hareDark: 0x6c5442,
  green: 0x4f6b4a, greenLit: 0x607d59,
  wood: 0x5a3c2e, woodLit: 0x70503c,
  violet: 0x6e5a86, violetLit: 0x86719e, violetDark: 0x4f405f,
  water: 0x2b393d, waterLit: 0x3b5156,
  grey: 0x55524f, greyLit: 0x6a6562,
  rock: 0x7f7170, ochre: 0x967e58, trouser: 0x6b5a40,
  greens: [0x3c4a30, 0x50695f, 0x5f7c5c, 0x445c4e, 0x6d8a62],
};

const matCache = new Map();
export function mat(c) {
  if (!matCache.has(c)) matCache.set(c, new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  return matCache.get(c);
}
export function shade(c, k) { return new THREE.Color(c).multiplyScalar(1 + k).getHex(); }

export function poly(parent, pts, c, z = 0) {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), mat(c));
  m.position.z = z;
  m.userData.pts = pts;
  parent.add(m);
  return m;
}

// ---------- 風：衣服下擺輕輕飄 ----------
// 時間由 main.js 每格寫入（跟著一拍二），同一格永遠是同一個樣子
export const WIND = { value: 0 };
const windCache = new Map();
function windMat(c) {
  if (!windCache.has(c)) {
    const m = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = WIND;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aWind;\nuniform float uWind;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          // 同一個角色的所有布料共用相位（由角色位置決定），疊在上面的亮面才會跟著底色一起動
          float ph = modelMatrix[3].x * 1.37 + modelMatrix[3].y * 0.61;
          float gust = 0.6 + 0.4 * sin(uWind * 0.83 + ph);
          transformed.x += aWind * gust * (0.3 + 0.55 * sin(uWind * 2.6 + position.y * 3.2 + ph) + 0.25 * sin(uWind * 4.7 + position.x * 6.0 + ph * 1.7));
          transformed.y += aWind * 0.3 * sin(uWind * 3.9 + position.x * 8.0 + ph);`);
    };
    m.customProgramCacheKey = () => 'wind';
    windCache.set(c, m);
  }
  return windCache.get(c);
}

// 把 poly 做的布料換成會飄的版本：top 以上不動，往 bottom（下擺）越來越飄，最大幅度 amp
export function windy(meshes, top, bottom, amp = 0.06) {
  for (const m of meshes) {
    const src = m.userData.pts;
    if (!src) continue;
    // 邊切細一點，下擺才會有波浪
    const pts = [];
    src.forEach((a, i) => {
      const b = src[(i + 1) % src.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.08));
      for (let k = 0; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    });
    const shape = new THREE.Shape();
    pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position, w = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const k = Math.min(1, Math.max(0, (top - pos.getY(i)) / (top - bottom)));
      w[i] = amp * k ** 1.6;
    }
    geo.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
    m.geometry.dispose();
    m.geometry = geo;
    m.material = windMat(m.material.color.getHex());
  }
  return meshes;
}

export function stroke(parent, pts, w, c, z = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(x2 - x1, y2 - y1) + w * 0.6, w), mat(c));
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    m.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    g.add(m);
  }
  parent.add(g);
  return g;
}

export function disc(parent, x, y, r, c, z = 0, seg = 20) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat(c));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// 愛心；upsideDown 時上下顛倒，當黑桃用
export function heart(parent, x, y, s, c, z = 0, upsideDown = false) {
  const p = [], k = upsideDown ? -1 : 1;
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    p.push([x + s * 0.06 * 16 * Math.sin(t) ** 3, y + k * s * 0.06 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
  }
  return poly(parent, p, c, z);
}

// 關節：pos（位置）> idle（待機循環）> act（劇情動作）。兩層各自補間，不會搶同一個屬性
export function joint(parent, x = 0, y = 0, z = 0) {
  const pos = new THREE.Group();
  pos.position.set(x, y, z);
  parent.add(pos);
  const idle = new THREE.Group();
  pos.add(idle);
  const act = new THREE.Group();
  idle.add(act);
  return { pos, idle, act };
}

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// 文字貼片：用 canvas 畫字，回傳一張以底邊中心為原點的平面
export function textPlane(parent, text, { font = 'UnifrakturMaguntia', px = 96, color = '#e6dcc6', height = 0.5, z = 0 } = {}) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `${px}px "${font}"`;
  const w = Math.ceil(ctx.measureText(text).width + px * 0.4);
  cv.width = w;
  cv.height = Math.ceil(px * 1.4);
  ctx.font = `${px}px "${font}"`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, px * 0.2, cv.height / 2);
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry((height * cv.width) / cv.height, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  m.position.z = z;
  parent.add(m);
  return m;
}

// ---------- 切面植物 ----------
function plantItem(parent, x, rot, z) {
  const pos = new THREE.Group();
  pos.position.set(x, 0, z);
  pos.rotation.z = rot;
  parent.add(pos);
  const grow = new THREE.Group();
  pos.add(grow);
  const sway = new THREE.Group();
  grow.add(sway);
  return { grow, sway };
}
function leaf(parent, x, h, w, c, rot, z) {
  const it = plantItem(parent, x, rot, z), g = it.sway, v = shade(c, -0.4);
  poly(g, [[0, 0], [w * 0.5, h * 0.3], [w * 0.42, h * 0.78], [0, h], [-w * 0.42, h * 0.78], [-w * 0.5, h * 0.3]], c);
  poly(g, [[0, 0], [w * 0.5, h * 0.3], [w * 0.42, h * 0.78], [0, h]], shade(c, 0.14), 0.0005);
  stroke(g, [[0, 0.04], [0, h * 0.9]], 0.022, v, 0.001);
  stroke(g, [[0, h * 0.32], [w * 0.36, h * 0.6]], 0.018, v, 0.001);
  stroke(g, [[0, h * 0.32], [-w * 0.36, h * 0.6]], 0.018, v, 0.001);
  return it;
}
function dome(parent, x, rw, rh, z) {
  const it = plantItem(parent, x, 0, z), g = it.sway, p = [];
  for (let i = 0; i <= 10; i++) { const a = (Math.PI * i) / 10; p.push([Math.cos(a) * rw, Math.sin(a) * rh]); }
  poly(g, p, C.ochre);
  poly(g, p.slice(5).concat([[0, 0]]), shade(C.ochre, 0.12), 0.0005);
  for (let i = 1; i < 6; i++) { const a = (Math.PI * i) / 6; stroke(g, [[0, 0], [Math.cos(a) * rw * 0.9, Math.sin(a) * rh * 0.9]], 0.02, shade(C.ochre, -0.3), 0.001); }
  return it;
}
function rock(parent, x, s, z) {
  const it = plantItem(parent, x, 0, z), g = it.sway;
  g.scale.setScalar(s);
  poly(g, [[-0.35, 0], [0.4, 0], [0.3, 0.24], [0.05, 0.36], [-0.26, 0.27]], C.rock);
  poly(g, [[-0.26, 0.27], [0.05, 0.36], [0.3, 0.24], [0.02, 0.2]], shade(C.rock, 0.15), 0.0005);
  return it;
}

export function clump(parent, x, seed, size = 1, z = 0) {
  const r = rng(seed), root = new THREE.Group();
  root.position.set(x, 0, z);
  parent.add(root);
  const items = [];
  const n = 3 + Math.floor(r() * 4);
  if (r() < 0.45) items.push(dome(root, (r() - 0.5) * 0.8 * size, (0.35 + r() * 0.3) * size, (0.25 + r() * 0.15) * size, -0.01));
  for (let i = 0; i < n; i++) {
    const tall = r() < 0.4;
    const h = (tall ? 1.0 + r() * 0.7 : 0.45 + r() * 0.4) * size;
    const w = (tall ? 0.28 + r() * 0.1 : 0.4 + r() * 0.25) * size;
    items.push(leaf(root, (i - (n - 1) / 2) * 0.28 * size + (r() - 0.5) * 0.15, h, w, C.greens[Math.floor(r() * C.greens.length)], (r() - 0.5) * 0.5, i * 0.002 * (r() < 0.5 ? 1 : -1)));
  }
  if (r() < 0.4) items.push(rock(root, (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.3) * size, 0.7 * size, 0.02));
  return items;
}

export function ground(parent, w = 15, z = -0.5) {
  return stroke(parent, [[-w / 2, 0], [w / 2, 0]], 0.03, C.ink, z);
}
