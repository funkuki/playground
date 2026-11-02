import * as THREE from 'three';
import { PAL, WATER_Y, waveH, mat, gradient } from './paint.js';

// 水裡的狗狗和浮具：用球、膠囊拼成，四肢在水下划動，跟著水面上下浮動
// 每隻的局部座標：+z 是頭的方向，+y 朝上，原點在水面

const geoCache = new Map();
const cached = (k, make) => {
  if (!geoCache.has(k)) geoCache.set(k, make());
  return geoCache.get(k);
};
const sphere = () => cached('s', () => new THREE.SphereGeometry(1, 22, 16));
const UP = new THREE.Vector3(0, 1, 0);

export function mesh(parent, geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 橢球
export function blob(parent, r, color, x = 0, y = 0, z = 0) {
  const m = mesh(parent, sphere(), mat(color));
  const [rx, ry, rz] = Array.isArray(r) ? r : [r, r, r];
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  return m;
}
// 從 a 到 b 的膠囊
export function limb(parent, a, b, r, color) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const len = A.distanceTo(Bv);
  const m = mesh(parent, cached(`c${r.toFixed(3)}_${len.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, len, 4, 12)), mat(color));
  m.position.copy(A).add(Bv).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, Bv.sub(A).normalize());
  return m;
}
export function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------- 黑色臘腸狗：只露出頭，身體斜斜沉在水裡狗爬式 ----------
function dachshund() {
  const root = new THREE.Group();
  const C = PAL.black, T = PAL.tan;
  const head = pivot(root, 0, 0.07, 0.02);
  blob(head, [0.13, 0.115, 0.14], C);
  blob(head, [0.075, 0.062, 0.13], C, 0, -0.012, 0.13);
  blob(head, 0.033, 0x161210, 0, 0.012, 0.255);
  blob(head, [0.068, 0.03, 0.1], T, 0, -0.062, 0.12);
  blob(head, [0.045, 0.014, 0.075], PAL.tongue, 0, -0.035, 0.175);
  for (const s of [-1, 1]) {
    blob(head, [0.024, 0.016, 0.02], T, s * 0.055, 0.095, 0.095);
    blob(head, [0.04, 0.035, 0.05], T, s * 0.06, -0.035, 0.1);
    blob(head, 0.018, 0x0c0a09, s * 0.062, 0.05, 0.11);
  }
  const ears = [-1, 1].map((s) => {
    const p = pivot(head, s * 0.1, 0.05, -0.01);
    blob(p, [0.035, 0.12, 0.08], C, 0, -0.09, 0);
    p.rotation.z = s * 0.55;
    return p;
  });
  const body = pivot(root, 0, -0.04, -0.06);
  body.rotation.x = -0.62;
  blob(body, [0.15, 0.15, 0.17], C, 0, -0.05, -0.06);
  blob(body, [0.09, 0.08, 0.06], T, 0, -0.09, 0.06);
  limb(body, [0, -0.06, -0.15], [0, -0.06, -0.75], 0.14, C);
  limb(body, [0, -0.02, -0.86], [0, 0.04, -1.12], 0.03, C);
  const legs = [[-1, -0.06], [1, -0.06], [-1, -0.7], [1, -0.7]].map(([s, z]) => {
    const p = pivot(body, s * 0.085, -0.15, z);
    limb(p, [0, 0, 0], [0, -0.17, 0.02], 0.045, C);
    blob(p, [0.05, 0.035, 0.06], T, 0, -0.21, 0.035);
    return p;
  });
  return { root, head, body, ears, legs, phase: [0, Math.PI, Math.PI, 0] };
}

// ---------- 香蕉浮板 + 趴著的柯基 ----------
function banana() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.13, -0.5),
    new THREE.Vector3(-0.05, 0.02, -0.24),
    new THREE.Vector3(-0.08, 0, 0.1),
    new THREE.Vector3(0.0, 0.03, 0.34),
    new THREE.Vector3(0.12, 0.16, 0.5),
  ]);
  const TS = 48, RS = 14;
  const geo = new THREE.TubeGeometry(curve, TS, 0.17, RS);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i <= TS; i++) {
    const u = i / TS;
    const c = curve.getPointAt(u);
    const k = 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), 0.6);
    for (let j = 0; j <= RS; j++) {
      const idx = i * (RS + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(k).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  mesh(g, geo, mat(PAL.banana));
  blob(g, 0.045, 0x6a4a22, 0.12, 0.16, 0.5);
  blob(g, 0.04, PAL.banana, 0.06, 0.13, -0.5);
  return g;
}
function corgiOnBanana() {
  const root = new THREE.Group();
  const float = banana();
  float.position.y = 0.04;
  float.scale.set(1.15, 1, 1.3);
  root.add(float);
  const O = PAL.corgi, W = PAL.white;
  const dog = pivot(root, -0.06, 0.3, 0.0);
  limb(dog, [0, 0, -0.2], [0, 0, 0.12], 0.13, O);
  blob(dog, [0.11, 0.08, 0.2], W, 0, -0.06, 0.0);
  blob(dog, [0.1, 0.11, 0.1], W, 0, -0.01, 0.2);
  blob(dog, 0.1, W, 0, 0.0, -0.3);
  const head = pivot(dog, 0, 0.13, 0.29);
  blob(head, [0.12, 0.105, 0.12], O);
  blob(head, [0.065, 0.055, 0.085], W, 0, -0.03, 0.1);
  blob(head, [0.028, 0.06, 0.06], W, 0, 0.06, 0.08);
  blob(head, 0.024, 0x1a1412, 0, -0.005, 0.19);
  for (const s of [-1, 1]) {
    blob(head, 0.017, 0x1a1412, s * 0.05, 0.03, 0.095);
    const ear = mesh(head, cached('ear', () => new THREE.ConeGeometry(0.052, 0.15, 10)), mat(O));
    ear.position.set(s * 0.07, 0.12, -0.02);
    ear.rotation.z = -s * 0.4;
    limb(dog, [s * 0.07, -0.08, 0.2], [s * 0.08, -0.1, 0.42], 0.04, O);
    blob(dog, [0.045, 0.035, 0.05], W, s * 0.08, -0.1, 0.45);
    limb(dog, [s * 0.09, -0.06, -0.18], [s * 0.17, -0.1, -0.36], 0.045, O);
    blob(dog, [0.045, 0.035, 0.05], W, s * 0.17, -0.1, -0.39);
  }
  return { root, head };
}

// ---------- 棕色狗：仰躺漂浮，四腳朝天慢慢划 ----------
function backFloater() {
  const root = new THREE.Group();
  const B = PAL.brown, L = PAL.brownLight;
  const body = pivot(root, 0, -0.04, 0);
  limb(body, [0, 0, -0.3], [0, 0, 0.25], 0.17, B);
  blob(body, [0.13, 0.07, 0.3], L, 0, 0.12, -0.02);
  // 仰躺時頭也是翻過來的：先繞鼻樑轉半圈，再往後仰，臉朝天空、鼻子朝前上方
  const head = pivot(body, 0, 0.04, 0.42);
  head.rotation.set(-1.25, 0, Math.PI);
  blob(head, [0.14, 0.12, 0.15], B);
  blob(head, [0.07, 0.06, 0.11], L, 0, 0.0, 0.13);
  blob(head, 0.028, 0x2a1e18, 0, 0.035, 0.23);
  for (const s of [-1, 1]) {
    blob(head, [0.045, 0.1, 0.075], PAL.brownDark, s * 0.13, 0.04, -0.03);
    blob(head, [0.024, 0.024, 0.016], 0x2a1e18, s * 0.058, 0.065, 0.1);
  }
  limb(body, [0, 0, -0.45], [0, -0.04, -0.78], 0.035, B);
  const legs = [[-1, 0.18], [1, 0.18], [-1, -0.24], [1, -0.24]].map(([s, z], i) => {
    const p = pivot(body, s * 0.1, 0.08, z);
    p.rotation.z = s * -0.45;
    const fz = i < 2 ? 0.07 : -0.07;
    limb(p, [0, 0, 0], [0, 0.19, fz], 0.045, B);
    blob(p, [0.05, 0.04, 0.055], L, 0, 0.22, fz * 1.2);
    return p;
  });
  return { root, body, head, legs };
}

// ---------- 黃色小鴨 ----------
function duck() {
  const root = new THREE.Group();
  const Y = 0xffd23a;
  blob(root, [0.13, 0.095, 0.17], Y, 0, 0.04, 0);
  for (const s of [-1, 1]) blob(root, [0.04, 0.06, 0.1], 0xf4c020, s * 0.11, 0.06, -0.01);
  const tail = blob(root, [0.06, 0.04, 0.06], Y, 0, 0.1, -0.15);
  tail.rotation.x = 0.6;
  blob(root, 0.085, Y, 0, 0.18, 0.08);
  blob(root, [0.052, 0.022, 0.05], 0xf27a1e, 0, 0.165, 0.17);
  for (const s of [-1, 1]) blob(root, 0.014, 0x1a1412, s * 0.045, 0.21, 0.135);
  return { root };
}

function ring(color) {
  const root = new THREE.Group();
  const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
  mesh(root, new THREE.TorusGeometry(0.23, 0.105, 16, 40).rotateX(Math.PI / 2), m).position.y = 0.03;
  return { root };
}

export function buildDogs(scene) {
  const things = [];
  const put = (o, x, z, yaw, extra = {}) => {
    o.kind = extra.kind;
    o.root.position.set(x, WATER_Y, z);
    if (o.kind !== 'ring' && o.kind !== 'duck') o.root.scale.setScalar(1.35);
    o.root.rotation.y = yaw;
    scene.add(o.root);
    things.push({ ...o, x, z, yaw, ...extra });
  };
  // 位置照參考圖換算（100px = 1 單位）
  put(ring(PAL.yellow), -4.4, -2.8, 0, { kind: 'ring', spin: 0.05 });
  put(ring(PAL.pink), 6.45, 1.0, 0, { kind: 'ring', spin: -0.04 });
  put(dachshund(), 1.35, -2.75, 0, { kind: 'swim', r: 0.7, w: 0.12, t0: 0 });
  put(dachshund(), -1.55, 0.85, 0, { kind: 'swim', r: 0.6, w: -0.1, t0: 1.7 });
  put(corgiOnBanana(), 3.4, -2.25, -1.85, { kind: 'raft' });
  put(backFloater(), 2.65, 1.95, 1.8, { kind: 'back' });
  // 小鴨們：在錨點附近慢慢繞小圈漂
  [[-5.6, 0.4, 0.6], [-3.1, 2.7, -2.2], [0.4, -1.1, 1.4], [4.9, -0.3, -0.8], [5.5, 2.9, 2.6], [-1.0, 3.0, -1.1], [6.9, -3.4, 0.3]].forEach(([x, z, yaw], i) =>
    put(duck(), x, z, yaw, { kind: 'duck', ph: i * 1.3 }),
  );

  for (const o of things) {
    if (o.kind === 'swim') {
      // 繞小圈游：t=0 時剛好在錨點、面朝 +z
      o.cx = o.x - Math.sign(o.w) * o.r;
      o.cz = o.z;
    }
  }

  return function update(t) {
    for (const o of things) {
      const R = o.root;
      let x = o.x, z = o.z;
      if (o.kind === 'swim') {
        const a = o.w * t + (o.w > 0 ? 0 : Math.PI);
        x = o.cx + o.r * Math.cos(a);
        z = o.cz + o.r * Math.sin(a);
        const dx = -Math.sin(a) * o.w, dz = Math.cos(a) * o.w;
        R.rotation.y = Math.atan2(dx, dz);
        const s = 5.2 * t + o.t0;
        o.legs.forEach((p, i) => (p.rotation.x = 0.35 + 0.95 * Math.sin(s + o.phase[i])));
        o.body.rotation.x = -0.62 + 0.05 * Math.sin(2 * s);
        o.ears.forEach((e, i) => (e.rotation.z = (i ? 1 : -1) * (0.55 + 0.08 * Math.sin(s + i))));
        R.position.y = WATER_Y + waveH(x, z, t) + 0.015 * Math.sin(2 * s);
      } else if (o.kind === 'ring') {
        x += 0.12 * Math.sin(0.21 * t + o.x);
        z += 0.1 * Math.cos(0.17 * t + o.z);
        R.rotation.y = o.spin * t;
        R.position.y = WATER_Y + waveH(x, z, t);
      } else if (o.kind === 'raft') {
        x += 0.1 * Math.sin(0.15 * t);
        R.rotation.y = o.yaw + 0.12 * Math.sin(0.11 * t);
        R.position.y = WATER_Y + waveH(x, z, t) - 0.03;
        o.head.rotation.y = 0.35 * Math.sin(0.5 * t);
      } else if (o.kind === 'duck') {
        x += 0.25 * Math.cos(0.09 * t + o.ph);
        z += 0.2 * Math.sin(0.11 * t + o.ph);
        R.rotation.y = o.yaw + 0.5 * Math.sin(0.07 * t + o.ph);
        R.position.y = WATER_Y + waveH(x, z, t) - 0.02;
      } else if (o.kind === 'back') {
        R.rotation.y = o.yaw + 0.25 * Math.sin(0.08 * t);
        R.position.y = WATER_Y + waveH(x, z, t) - 0.03;
        o.legs.forEach((p, i) => (p.rotation.x = 0.3 * Math.sin(1.6 * t + (i % 3 ? Math.PI : 0))));
        o.head.rotation.z = Math.PI + 0.1 * Math.sin(0.7 * t);
      }
      // 跟著水波傾斜
      const e = 0.3;
      R.rotation.x = Math.atan2(waveH(x, z + e, t) - waveH(x, z - e, t), 2 * e) * -0.8;
      R.rotation.z = Math.atan2(waveH(x + e, z, t) - waveH(x - e, z, t), 2 * e) * 0.8;
      R.position.x = x;
      R.position.z = z;
    }
  };
}
