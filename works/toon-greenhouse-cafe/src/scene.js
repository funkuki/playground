import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

// 色票：從參考圖（森林裡的玻璃溫室咖啡廳）取的主要顏色
export const PALETTE = {
  bg: 0x1e2e1c,
  fog: 0x2a3d26,
  frame: 0x1f3a2e,
  brick: 0x8a4a32,
  deck: 0x9a6236,
  deckSide: 0x6e4224,
  counter: 0xa8703e,
  counterDark: 0x7a4a26,
  sofa: 0xb8693a,
  sofaDark: 0x9a5430,
  cushion: 0xece6da,
  throwGray: 0x9a9890,
  black: 0x1e2224,
  metal: 0x9aa0a0,
  copper: 0xc07a3a,
  white: 0xf0ece4,
  soil: 0x3a2a1c,
  potGray: 0x8a8a84,
  terracotta: 0xb4643e,
  potCream: 0xd8d0c0,
  bulb: 0xffd28a,
  leaf: [0x243c1c, 0x2e4a22, 0x3e5e28, 0x4f7a2e, 0x6a9238, 0x86a84a],
  leafLight: [0x5f8a30, 0x7aa040, 0x96b850],
  rose: [0xe8622e, 0xf07a3a, 0xd84e26, 0xf49050],
  red: [0xc8301e, 0xd8402a, 0xb02818, 0xe0502e],
  bouquet: [0xd8402a, 0xe8622e, 0xf07a3a, 0xc8301e],
  outline: 0x2c3a2a, // 描邊用深橄欖綠，不用純黑
};

// ---------- 可重現的亂數 ----------
let seed = 20261102;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- 賽璐璐材質：3 階 gradientMap ----------
export const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([125, 195, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
const matCache = new Map();
function toon(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
  return matCache.get(color);
}
function toonMap(map, color = 0xffffff) {
  return new THREE.MeshToonMaterial({ map, color, gradientMap: gradient });
}
// 自發光（不吃光照，數值 > 1 讓 bloom 抓得到）
function glow(color, k = 1, map = null) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), map, fog: true });
}

let root;
function add(mesh, parent = root) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const asMat = (m) => (typeof m === 'number' ? toon(m) : m);
// 以「最小角 + 尺寸」放方塊
function box(x0, y0, z0, w, h, d, m, parent) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(m) ? m : asMat(m));
  mesh.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return add(mesh, parent);
}
function cyl(x, y0, z, r, h, m, seg = 14, rTop = r) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg), asMat(m));
  mesh.position.set(x, y0 + h / 2, z);
  return add(mesh);
}
// 兩點之間拉一根桿子
const _up = new THREE.Vector3(0, 1, 0);
function rod(a, b, r, m, seg = 6) {
  const A = a.isVector3 ? a : new THREE.Vector3(...a), B = b.isVector3 ? b : new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), asMat(m));
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(_up, B.clone().sub(A).normalize());
  return add(mesh);
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
// 四點面片（玻璃、地毯）
function quad(o, U, V, mat) {
  const g = new THREE.BufferGeometry();
  const p = [o, o.clone().add(U), o.clone().add(U).add(V), o.clone().add(V)];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.userData.noOutline = true;
  root.add(m);
  return m;
}

// ---------- InstancedMesh 收集器 ----------
class Scatter {
  constructor(geo, outline = 0.012) { this.geo = geo; this.items = []; this.outline = outline; }
  // 旋轉順序 YXZ：先繞 x 傾倒、再繞 y 轉方向
  add(x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) { this.items.push({ x, y, z, sx, sy, sz, color, rx, ry, rz }); }
  build() {
    const m = new THREE.InstancedMesh(this.geo, new THREE.MeshToonMaterial({ gradientMap: gradient }), this.items.length);
    const o = new THREE.Object3D();
    o.rotation.order = 'YXZ';
    const c = new THREE.Color();
    this.items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.scale.set(it.sx, it.sy, it.sz);
      o.rotation.set(it.rx, it.ry, it.rz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(it.color));
    });
    m.userData.outline = this.outline;
    return add(m);
  }
}
const leaves = new Scatter(new THREE.IcosahedronGeometry(1, 0), 0.014); // 葉叢
const blooms = new Scatter(new THREE.DodecahedronGeometry(1, 0), 0.012); // 花朵
const fronds = new Scatter(new THREE.SphereGeometry(1, 6, 4), 0.012); // 長葉（蕨類、天堂鳥）
const pots = new Scatter(new THREE.CylinderGeometry(0.5, 0.38, 1, 12), 0.02); // 花盆
const stems = new Scatter(new THREE.CylinderGeometry(1, 1, 1, 4), 0); // 花莖（不描邊）
const frames = new Scatter(new THREE.BoxGeometry(1, 1, 1), 0.012); // 溫室鐵框

// 一團葉子：在橢球裡撒小多面體，越上面顏色越亮
function foliage(cx, cy, cz, rx, ry, rz, n, size = [0.16, 0.3], colors = PALETTE.leaf) {
  for (let i = 0; i < n; i++) {
    let x, y, z;
    do { x = rr(-1, 1); y = rr(-1, 1); z = rr(-1, 1); } while (x * x + y * y + z * z > 1);
    const s = rr(size[0], size[1]);
    const k = Math.min(colors.length - 1, Math.max(0, Math.floor(((y + 1) / 2) * colors.length + rr(-1, 1))));
    leaves.add(cx + x * rx, cy + y * ry, cz + z * rz, s, s * rr(0.6, 1), s, colors[k], rr(0, 3), rr(0, 3), 0);
  }
}
// 在一團葉子表面點綴花
function sprinkle(cx, cy, cz, rx, ry, rz, n, colors, size = [0.07, 0.12]) {
  for (let i = 0; i < n; i++) {
    const t = rr(0, Math.PI * 2), p = Math.acos(rr(-0.3, 1));
    const s = rr(size[0], size[1]);
    blooms.add(cx + Math.sin(p) * Math.cos(t) * rx, cy + Math.cos(p) * ry, cz + Math.sin(p) * Math.sin(t) * rz, s, s * 0.85, s, pick(colors), rr(0, 3), rr(0, 3), 0);
  }
}
// 放射狀長葉：蕨類、盆栽
function rosette(x, y, z, n, len, wid, tilt, colors = PALETTE.leaf.slice(2)) {
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + rr(-0.3, 0.3);
    const t = -(tilt + rr(-0.25, 0.25)); // 正 rx 讓 +z 端往下
    const L = len * rr(0.75, 1.1);
    const dx = Math.sin(yaw) * Math.cos(t) * L * 0.5;
    const dz = Math.cos(yaw) * Math.cos(t) * L * 0.5;
    const dy = -Math.sin(t) * L * 0.5;
    fronds.add(x + dx, y + dy, z + dz, wid, wid * 0.18, L * 0.5, pick(colors), t, yaw, 0);
  }
}
function flowerPot(x, y, z, r, h, potColor, plant) {
  pots.add(x, y + h / 2, z, r * 2, h, r * 2, potColor ?? pick([PALETTE.terracotta, PALETTE.potGray, PALETTE.potCream]));
  plant?.(x, y + h, z);
}

// 在 xz 平面上的形狀，往上擠出 h（形狀座標 (x, z)）
function slab(points, h, mats, y0 = 0) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], -points[0][1]);
  for (const p of points.slice(1)) {
    if (p.length === 2) shape.lineTo(p[0], -p[1]);
    else shape.quadraticCurveTo(p[0], -p[1], p[2], -p[3]);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 16 });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mats);
  m.position.y = y0;
  return add(m);
}

// ---------- 溫室玻璃格：在 o + U + V 的平行四邊形裡排鐵框、鋪玻璃 ----------
let glassMat;
const FT = 0.07; // 鐵框粗細
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
function bar(A, B, t = FT) {
  const d = B.clone().sub(A);
  const len = d.length();
  _q.setFromUnitVectors(V3(0, 0, 1), d.normalize());
  _e.setFromQuaternion(_q, 'YXZ');
  const c = A.clone().add(B).multiplyScalar(0.5);
  frames.add(c.x, c.y, c.z, t, t, len + t, PALETTE.frame, _e.x, _e.y, _e.z);
}
function pane(o, U, V, cols, rows, glass = true) {
  if (glass) quad(o, U, V, glassMat);
  const at = (u, v) => o.clone().addScaledVector(U, u).addScaledVector(V, v);
  for (let c = 0; c <= cols; c++) bar(at(c / cols, 0), at(c / cols, 1), c % cols === 0 ? FT * 1.4 : FT);
  for (let r = 0; r <= rows; r++) bar(at(0, r / rows), at(1, r / rows), r % rows === 0 ? FT * 1.4 : FT);
}
// 三角山牆玻璃（底邊 A→B，頂點 C）
function gablePane(A, B, C, cols) {
  const g = new THREE.BufferGeometry().setFromPoints([A, B, C]);
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  const m = new THREE.Mesh(g, glassMat);
  m.userData.noOutline = true;
  root.add(m);
  bar(A, B, FT * 1.4); bar(A, C, FT * 1.4); bar(B, C, FT * 1.4);
  for (let i = 1; i < cols; i++) {
    const u = i / cols;
    const P = A.clone().lerp(B, u);
    const top = u < 0.5 ? A.clone().lerp(C, u * 2) : C.clone().lerp(B, (u - 0.5) * 2);
    bar(P, top);
  }
}

// ======================================================================
const DECK = 0.4; // 木平台頂面高度
const GH = { x0: -3, x1: 5, zb: -2.5, zf: 3, wall: 3.8, ridgeZ: 0.25, ridge: 5.7 };
const lightSpots = []; // 收集暖光位置，最後統一放 PointLight

export function buildScene(scene) {
  root = new THREE.Group();
  scene.add(root);
  glassMat = new THREE.MeshBasicMaterial({ map: TX.glassTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true });

  buildGround();
  buildBackBuilding();
  buildVestibule();
  buildGreenhouse();
  buildCafeBar();
  buildLounge();
  buildPlants();
  buildRoses();
  buildGarden();

  leaves.build();
  blooms.build();
  fronds.build();
  pots.build();
  stems.build();
  frames.build();

  const lights = buildLights(scene);
  buildSunShafts();
  addOutlines(root);
  return { root, lights };
}

// ---------- 底座：草地 + 石板小徑 + 木平台 ----------
function buildGround() {
  const P = PALETTE;
  const R = 1.4, X = 10, Z0 = -8, Z1 = 8.5;
  const grass = TX.grassTex();
  grass.repeat.set(0.25, 0.25);
  slab(
    [[-X + R, Z0], [X - R, Z0], [X, Z0, X, Z0 + R], [X, Z1 - R], [X, Z1, X - R, Z1], [-X + R, Z1], [-X, Z1, -X, Z1 - R], [-X, Z0 + R], [-X, Z0, -X + R, Z0]],
    1.0,
    [toonMap(grass), toon(P.soil)],
    -1.0,
  ).userData.outline = 0.05;

  // 石板小徑：從入口彎到左前方
  const cob = TX.cobbleTex();
  cob.repeat.set(0.45, 0.45);
  const cobMats = [toonMap(cob), toon(0x5a5a50)];
  slab([[-6.2, 2.0], [-3.1, 2.0], [-3.1, 4.6], [-3.6, 6.4, -5.2, 8.5], [-8.8, 8.5], [-7.0, 6.0, -6.2, 2.0]], 0.06, cobMats).userData.outline = 0;
  slab([[-3.1, 3.2], [-1.0, 3.2], [-1.0, 4.4], [-3.1, 4.6]], 0.06, cobMats).userData.outline = 0;

  // 木平台 + 前方兩階台階
  const plank = TX.plankTex();
  plank.repeat.set(0.45, 0.45);
  const deckTop = toonMap(plank);
  const side = toon(P.deckSide);
  const m = [side, side, deckTop, side, side, side];
  box(GH.x0, 0, GH.zb, GH.x1 - GH.x0, DECK, GH.zf - GH.zb, m).userData.outline = 0.03;
  box(-1.4, 0, GH.zf, 5.4, DECK * 0.66, 0.55, m).userData.outline = 0.025;
  box(-1.6, 0, GH.zf + 0.55, 5.8, DECK * 0.33, 0.55, m).userData.outline = 0.025;
}

// ---------- 後方的紅磚建築 ----------
function buildBackBuilding() {
  const bt = TX.brickTex();
  bt.repeat.set(3, 3);
  const bm = toonMap(bt, 0x9a8a80); // 壓暗一點，退到背景
  box(-9.5, 0, -7.5, 7.0, 6.4, 5.5, bm).userData.outline = 0.04;
  box(-9.6, 6.4, -7.6, 7.2, 0.3, 5.7, 0x2e3430);
  box(-6.5, 6.7, -4.5, 1.6, 0.9, 1.1, 0x7a7e78); // 屋頂冷氣
  box(-8.8, 3.9, -1.95, 2.0, 1.3, 0.05, 0x26302a); // 二樓深色窗
  rod([-2.6, 0, -2.0], [-2.6, 6.4, -2.0], 0.08, 0x2e3a32, 8); // 雨水管
}

// ---------- 左側入口門廳（玻璃 + 鐵框、山牆朝前） ----------
function buildVestibule() {
  const P = PALETTE;
  const x0 = -6.4, x1 = GH.x0, zb = -2.0, zf = 2.0, wall = 3.7, ridge = 5.3;
  const xm = (x0 + x1) / 2;
  box(x0, 0, zb, x1 - x0, 0.25, zf - zb, 0x7a786c); // 石地板
  // 正面：左右玻璃格 + 中間門
  const doorW = 1.2, dx0 = xm - doorW / 2 - 0.3;
  pane(V3(x0, 0.25, zf), V3(dx0 - x0, 0, 0), V3(0, wall - 0.25, 0), 2, 4);
  pane(V3(dx0 + doorW, 0.25, zf), V3(x1 - dx0 - doorW, 0, 0), V3(0, wall - 0.25, 0), 2, 4);
  pane(V3(dx0, 0.25, zf + 0.04), V3(doorW, 0, 0), V3(0, 2.4, 0), 2, 3);
  pane(V3(dx0, 2.65, zf), V3(doorW, 0, 0), V3(0, wall - 2.65, 0), 2, 1);
  box(dx0 + doorW - 0.2, 1.2, zf + 0.06, 0.05, 0.4, 0.06, P.copper).userData.noOutline = true;
  gablePane(V3(x0, wall, zf), V3(x1, wall, zf), V3(xm, ridge, zf), 4);
  pane(V3(x0, 0.25, zb), V3(0, 0, zf - zb), V3(0, wall - 0.25, 0), 4, 4); // 左側玻璃牆
  // 屋頂：兩片深色金屬板
  const half = xm - x0;
  const L = Math.hypot(half + 0.3, ridge - wall), a = Math.atan2(ridge - wall, half);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, zf - zb + 0.5), toon(0x26362c));
    m.position.set(xm + s * half * 0.5, (wall + ridge) / 2 + 0.06, (zb + zf) / 2 + 0.1);
    m.rotation.z = -s * a;
    add(m).userData.outline = 0.025;
  }
  // 掛牌
  const sign = toonMap(TX.signTex());
  box(x0 + 0.25, 1.4, zf + 0.12, 0.85, 1.05, 0.04, [sign, sign, sign, sign, sign, sign]).userData.outline = 0.015;
  // 門廳裡的瓶罐層架
  for (let i = 0; i < 4; i++) {
    const y = 0.7 + i * 0.6;
    box(x0 + 0.15, y, zb + 0.15, 1.2, 0.05, 0.45, P.counter);
    for (let k = 0; k < 6; k++) cyl(x0 + 0.3 + k * 0.18, y + 0.05, zb + 0.35, 0.06, rr(0.16, 0.26), pick([0xc8b48a, 0xe8e0cc, 0x6a8a5a, 0x8a5a36, 0xd8d0bc]), 8);
  }
  box(x0 + 0.1, 0.25, zb + 0.1, 0.06, 2.8, 0.5, P.counterDark);
  box(x0 + 1.35, 0.25, zb + 0.1, 0.06, 2.8, 0.5, P.counterDark);
  // 入口旁的木箱和小盆栽
  box(-6.1, 0.0, 2.3, 0.7, 0.45, 0.5, P.counter);
  flowerPot(-5.75, 0.45, 2.55, 0.18, 0.25, P.potCream, (x, y, z) => rosette(x, y, z, 9, 0.5, 0.11, 0.5));
  flowerPot(-6.7, 0, 2.6, 0.25, 0.35, P.potGray, (x, y, z) => foliage(x, y + 0.25, z, 0.3, 0.3, 0.3, 30, [0.08, 0.14]));
}

// ---------- 溫室本體：玻璃屋頂、右牆、前右牆；左前方剖開 ----------
function buildGreenhouse() {
  const { x0, x1, zb, zf, wall, ridgeZ, ridge } = GH;
  const y0 = DECK;
  const brickL = 1.7; // 後牆 x0..brickL 是紅磚，之後是玻璃
  const bt = TX.brickTex();
  bt.repeat.set(2.4, 2);
  box(x0, y0, zb - 0.25, brickL - x0, wall - y0 + 1.2, 0.25, toonMap(bt)).userData.outline = 0.03;
  pane(V3(brickL, y0, zb), V3(x1 - brickL, 0, 0), V3(0, wall - y0, 0), 4, 3); // 沙發後面的玻璃
  // 右牆 + 右山牆
  pane(V3(x1, y0, zb), V3(0, 0, zf - zb), V3(0, wall - y0, 0), 5, 3);
  gablePane(V3(x1, wall, zb), V3(x1, wall, zf), V3(x1, ridge, ridgeZ), 5);
  // 左牆（和門廳之間）
  pane(V3(x0, y0, -2.0), V3(0, 0, 4.0), V3(0, wall - y0, 0), 3, 3);
  // 前牆整面剖開，只留角柱
  const fx = 2.4;
  bar(V3(x0, y0, zf), V3(x0, wall, zf), FT * 2);
  // 屋頂：後坡全玻璃；前坡左段只剩桁架（剖面），右段玻璃
  pane(V3(x0, wall, zb), V3(x1 - x0, 0, 0), V3(0, ridge - wall, ridgeZ - zb), 8, 3);
  pane(V3(fx, wall, zf), V3(x1 - fx, 0, 0), V3(0, ridge - wall, ridgeZ - zf), 3, 3);
  for (let i = 0; i <= 4; i++) {
    const x = x0 + ((fx - x0) * i) / 4;
    bar(V3(x, wall, zf), V3(x, ridge, ridgeZ), FT * 1.2);
  }
  bar(V3(x0, ridge, ridgeZ), V3(x1, ridge, ridgeZ), FT * 2.2); // 屋脊
  bar(V3(x0, wall, zf), V3(x1, wall, zf), FT * 1.8); // 前簷
  bar(V3(x0, wall, zb), V3(x0, ridge, ridgeZ), FT * 1.8);
  bar(V3(x0, wall, zf), V3(x0, ridge, ridgeZ), FT * 1.8);
  bar(V3(x1, y0, zf), V3(x1, wall, zf), FT * 2); // 右前角柱
}

// ---------- 咖啡吧台 ----------
function buildCafeBar() {
  const P = PALETTE;
  const y0 = DECK, top = y0 + 1.0;
  const bx0 = -2.9, bx1 = 1.3, bz0 = -2.4, bz1 = -1.45;
  const wood = toon(P.counterDark);
  const shelf = toonMap(TX.bookshelfTex(5, 2));
  box(bx0, y0, bz0, bx1 - bx0, 0.95, bz1 - bz0, [wood, wood, wood, wood, shelf, wood]);
  box(bx0 - 0.05, y0 + 0.95, bz0, bx1 - bx0 + 0.1, 0.07, bz1 - bz0 + 0.12, P.counter); // 檯面

  // 檯面上的器材
  const T = top + 0.02;
  box(-2.55, T, -2.2, 0.28, 0.4, 0.3, P.black); // 磨豆機
  cyl(-2.41, T + 0.4, -2.05, 0.1, 0.22, 0x3a3e40, 10, 0.14);
  // 虹吸壺
  const glassBall = new THREE.MeshToonMaterial({ color: 0xd8e8e0, gradientMap: gradient, transparent: true, opacity: 0.55 });
  cyl(-1.8, T, -1.9, 0.15, 0.05, P.black, 10);
  rod([-1.8, T, -2.08], [-1.8, T + 0.75, -2.08], 0.02, P.metal);
  const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), glassBall);
  b1.position.set(-1.8, T + 0.2, -1.9);
  add(b1);
  const coffee = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x4a2a14));
  coffee.position.copy(b1.position);
  add(coffee).userData.noOutline = true;
  cyl(-1.8, T + 0.38, -1.9, 0.1, 0.3, glassBall, 10, 0.12);
  // 手沖壺、玻璃壺、杯子、罐子
  for (const [x, z, c] of [[-1.15, -1.75, P.metal], [-0.75, -2.0, P.copper], [-0.35, -1.7, P.metal]]) {
    cyl(x, T, z, 0.11, 0.2, c, 12, 0.08);
    rod([x + 0.08, T + 0.06, z], [x + 0.26, T + 0.24, z], 0.015, c, 4);
  }
  cyl(0.15, T, -1.85, 0.09, 0.26, glassBall, 10, 0.07);
  for (let i = 0; i < 4; i++) cyl(0.5 + i * 0.16, T, -1.65, 0.05, 0.08, P.white, 10);
  for (let i = 0; i < 5; i++) cyl(-0.6 + i * 0.19, T, -2.25, 0.07, rr(0.2, 0.32), pick([0xe8e0cc, 0xc8b48a, 0x6a8a5a]), 8);
  flowerPot(1.05, T, -2.1, 0.12, 0.16, P.potCream, (x, y, z) => foliage(x, y + 0.15, z, 0.18, 0.18, 0.18, 14, [0.05, 0.09]));

  // 後牆上的層板、瓶罐、海報、黑板
  const wy = y0 + 2.0;
  box(-2.9, wy, -2.5, 3.6, 0.06, 0.32, P.counter);
  box(-2.9, wy + 0.65, -2.5, 3.0, 0.06, 0.32, P.counter);
  for (let i = 0; i < 12; i++) cyl(-2.75 + i * 0.29, wy + 0.06, -2.34, 0.07, rr(0.18, 0.32), pick([0xe8e0cc, 0xc8b48a, 0x8a5a36, 0x6a8a9a, 0xd8d0bc]), 8);
  for (let i = 0; i < 8; i++) cyl(-2.7 + i * 0.36, wy + 0.71, -2.34, 0.08, rr(0.12, 0.2), pick([P.white, 0x5a6a62, P.copper]), 8);
  for (const [x, y, k] of [[-0.2, wy - 0.85, 0], [0.45, wy - 0.7, 1], [1.05, wy + 0.4, 0], [0.4, wy + 0.95, 1]]) {
    const pm = toonMap(TX.posterTex(k));
    box(x, y, -2.49, 0.45, 0.6, 0.02, [pm, pm, pm, pm, pm, pm]).userData.noOutline = true;
  }
  const menu = toonMap(TX.menuTex());
  const cw = toon(P.counter);
  box(-2.6, wy - 0.95, -2.49, 1.0, 0.75, 0.04, [cw, cw, cw, cw, menu, cw]);

  // 愛迪生燈泡：從屋頂垂下
  for (const [x, z] of [[-2.2, -0.9], [-1.0, -0.6], [-2.4, 1.2]]) {
    rod([x, GH.wall + 0.6, z], [x, y0 + 2.75, z], 0.012, P.black, 4).userData.noOutline = true;
    cyl(x, y0 + 2.68, z, 0.04, 0.08, P.copper, 8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glow(P.bulb, 2.0));
    bulb.scale.y = 1.3;
    bulb.position.set(x, y0 + 2.58, z);
    root.add(bulb);
    lightSpots.push({ pos: [x, y0 + 2.45, z + 0.2], color: 0xffb468, intensity: 1.8, distance: 4 });
  }

  for (const [x, z] of [[-1.95, -0.65], [-0.8, -0.5]]) stool(x, y0, z);
}

function stool(x, y0, z) {
  const P = PALETTE;
  const h = 0.78;
  cyl(x, y0 + h, z, 0.22, 0.07, P.counter, 16).userData.outline = 0.015;
  cyl(x, y0 + h - 0.12, z, 0.05, 0.12, P.black, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rod([x + Math.cos(a) * 0.1, y0 + h - 0.1, z + Math.sin(a) * 0.1], [x + Math.cos(a) * 0.27, y0, z + Math.sin(a) * 0.27], 0.018, P.black, 5);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.015, 4, 20), toon(P.black));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y0 + 0.3, z);
  add(ring).userData.noOutline = true;
}

// ---------- 沙發區：皮沙發、茶几、地毯、吊燈 ----------
function buildLounge() {
  const P = PALETTE;
  const y0 = DECK;
  const rug = new THREE.MeshToonMaterial({ map: TX.rugTex(), gradientMap: gradient });
  quad(V3(-0.1, y0 + 0.012, 2.5), V3(4.0, 0, 0), V3(0, 0, -3.0), rug).receiveShadow = true;

  // 皮沙發（面向前方）
  const sx0 = 1.75, sx1 = 4.75, sz0 = -2.35, sz1 = -1.2;
  box(sx0, y0, sz0, sx1 - sx0, 0.42, sz1 - sz0, P.sofaDark);
  const w = (sx1 - sx0 - 0.5) / 3;
  for (let i = 0; i < 3; i++) {
    box(sx0 + 0.25 + i * w + 0.01, y0 + 0.42, sz0 + 0.3, w - 0.02, 0.18, sz1 - sz0 - 0.3, P.sofa).userData.outline = 0.015;
    box(sx0 + 0.25 + i * w + 0.01, y0 + 0.42, sz0, w - 0.02, 0.75, 0.32, P.sofa).rotation.x = -0.12;
  }
  box(sx0, y0, sz0, 0.26, 0.85, sz1 - sz0, P.sofa); // 扶手
  box(sx1 - 0.26, y0, sz0, 0.26, 0.85, sz1 - sz0, P.sofa);
  for (const [x, rz] of [[2.35, 0.15], [3.05, -0.1], [3.85, 0.2]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.18), toon(P.cushion));
    c.position.set(x, y0 + 0.9, sz0 + 0.42);
    c.rotation.set(-0.25, 0, rz);
    add(c).userData.outline = 0.015;
  }
  const th = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 1.0), toon(P.throwGray)); // 毯子
  th.position.set(4.3, y0 + 0.66, sz0 + 0.65);
  th.rotation.set(0.1, 0.25, -0.35);
  add(th).userData.outline = 0.012;

  // 茶几
  const tx0 = 1.3, tx1 = 3.2, tz0 = 0.1, tz1 = 1.05, ty = y0 + 0.5;
  box(tx0, ty - 0.07, tz0, tx1 - tx0, 0.07, tz1 - tz0, P.counter);
  box(tx0 + 0.1, y0 + 0.12, tz0 + 0.1, tx1 - tx0 - 0.2, 0.04, tz1 - tz0 - 0.2, P.counterDark);
  for (const [x, z] of [[tx0 + 0.12, tz0 + 0.1], [tx1 - 0.12, tz0 + 0.1], [tx0 + 0.12, tz1 - 0.1], [tx1 - 0.12, tz1 - 0.1]]) {
    rod([x, ty - 0.07, z], [x + (x < 2 ? -0.06 : 0.06), y0, z + (z < 0.5 ? -0.05 : 0.05)], 0.035, P.counterDark, 6);
  }
  for (const [x, z] of [[2.35, 0.45], [2.7, 0.7]]) {
    cyl(x, ty, z, 0.13, 0.015, P.white, 14);
    cyl(x, ty + 0.015, z, 0.065, 0.11, P.white, 12);
    cyl(x, ty + 0.12, z, 0.055, 0.005, 0x4a2a14, 10).userData.noOutline = true;
  }
  box(2.85, ty, 0.25, 0.32, 0.04, 0.24, 0x6a8a9a);
  cyl(1.95, ty, 0.85, 0.16, 0.02, P.white, 14);
  // 花瓶 + 花束（紅橘玫瑰 + 藍色飛燕草）
  const vase = new THREE.MeshToonMaterial({ color: 0xc8dcd4, gradientMap: gradient, transparent: true, opacity: 0.6 });
  cyl(1.75, ty, 0.5, 0.1, 0.32, vase, 12, 0.12);
  foliage(1.75, ty + 0.55, 0.5, 0.3, 0.22, 0.28, 30, [0.05, 0.09]);
  sprinkle(1.75, ty + 0.56, 0.5, 0.32, 0.22, 0.3, 28, P.bouquet, [0.07, 0.11]);
  for (let i = 0; i < 4; i++) {
    const bx = 1.6 + rr(0, 0.3), bz = 0.4 + rr(0, 0.2);
    for (let k = 0; k < 6; k++) blooms.add(bx + k * 0.01, ty + 0.65 + k * 0.07, bz, 0.04, 0.04, 0.04, pick([0x5a6ad0, 0x7a8ae0, 0x4a5ac0]));
  }

  // 黑色工業風吊燈
  const lx = 1.6, lz = 0.6, ly = GH.wall + 0.1;
  rod([lx, GH.ridge, GH.ridgeZ], [lx, ly + 0.3, lz], 0.015, P.black, 4).userData.noOutline = true;
  cyl(lx, ly + 0.15, lz, 0.06, 0.18, P.black, 10);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.55, 0.42, 20, 1, true),
    new THREE.MeshToonMaterial({ color: P.black, gradientMap: gradient, side: THREE.DoubleSide }),
  );
  shade.position.set(lx, ly - 0.06, lz);
  add(shade).userData.outline = 0.02;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), glow(P.bulb, 2.2));
  bulb.position.set(lx, ly - 0.22, lz);
  root.add(bulb);
}

// ---------- 室內外的盆栽 ----------
function buildPlants() {
  const P = PALETTE;
  const y0 = DECK;
  // 吧台和沙發之間的大型室內樹
  flowerPot(1.45, y0, -1.95, 0.32, 0.5, P.potCream, (x, y, z) => {
    rod([x, y, z], [x - 0.1, y + 1.6, z + 0.1], 0.04, 0x5a4030);
    foliage(x - 0.1, y + 2.0, z + 0.2, 0.9, 0.8, 0.7, 150, [0.1, 0.2], P.leaf.slice(2));
  });
  flowerPot(4.6, y0, -0.8, 0.25, 0.4, P.potGray, (x, y, z) => rosette(x, y + 0.1, z, 10, 0.9, 0.14, 0.9));
  flowerPot(3.9, y0 + 0.86, -2.35, 0.13, 0.18, P.potCream, (x, y, z) => foliage(x, y + 0.15, z, 0.18, 0.2, 0.18, 14, [0.05, 0.09]));
  // 右前方的天堂鳥：長柄 + 大葉
  flowerPot(4.2, y0, 2.2, 0.3, 0.45, P.potGray, (x, y, z) => {
    for (let i = 0; i < 8; i++) {
      const yaw = (i / 8) * Math.PI * 2 + rr(-0.2, 0.2);
      const r = rr(0.25, 0.5), h = rr(0.9, 1.5);
      const tx = x + Math.sin(yaw) * r, tz = z + Math.cos(yaw) * r, ty = y + h;
      stems.add((x + tx) / 2, (y + ty) / 2, (z + tz) / 2, 0.02, h, 0.02, 0x4a6a2a, Math.atan2(r, h) * Math.cos(yaw), 0, -Math.atan2(r, h) * Math.sin(yaw));
      fronds.add(tx, ty + 0.2, tz, 0.17, 0.035, 0.45, pick(P.leafLight), -1.2, yaw, 0);
    }
  });
  // 平台左前方：大蕨類 + 小盆栽群
  flowerPot(-2.3, y0, 2.3, 0.32, 0.4, P.potGray, (x, y, z) => rosette(x, y + 0.1, z, 16, 1.4, 0.16, 0.25));
  flowerPot(-1.5, y0, 2.65, 0.2, 0.3, P.terracotta, (x, y, z) => rosette(x, y + 0.05, z, 10, 0.6, 0.1, 0.4));
  flowerPot(-0.8, y0 * 0.66, 3.25, 0.18, 0.28, P.potCream, (x, y, z) => foliage(x, y + 0.2, z, 0.25, 0.25, 0.25, 22, [0.06, 0.11]));
  flowerPot(-2.4, 0, 3.4, 0.24, 0.35, P.potGray, (x, y, z) => rosette(x, y + 0.05, z, 12, 0.8, 0.12, 0.35));
  flowerPot(-3.4, 0, 3.0, 0.22, 0.3, P.terracotta, (x, y, z) => foliage(x, y + 0.25, z, 0.3, 0.3, 0.3, 26, [0.06, 0.12]));
  flowerPot(3.9, DECK * 0.33, 4.0, 0.22, 0.32, P.potGray, (x, y, z) => rosette(x, y + 0.05, z, 12, 0.8, 0.13, 0.6));
  // 溫室裡沿右牆的植物（隔著玻璃）
  foliage(4.6, y0 + 0.6, 1.0, 0.3, 0.6, 0.6, 50, [0.08, 0.16], P.leaf.slice(2));
  sprinkle(4.6, y0 + 0.7, 1.0, 0.3, 0.6, 0.6, 12, [0xf6c0cc, 0xf0ece4]);
}

// ---------- 爬藤玫瑰 ----------
function buildRoses() {
  const P = PALETTE;
  const { x0, x1, zf, wall, ridgeZ, ridge } = GH;
  // 沿著鐵框爬的玫瑰藤
  const along = (A, B, n, thick, roseRate) => {
    for (let i = 0; i < n; i++) {
      const p = A.clone().lerp(B, rand());
      const s = rr(0.12, 0.22);
      leaves.add(p.x + rr(-thick, thick), p.y + rr(-thick * 0.6, thick), p.z + rr(-thick, thick), s, s * 0.7, s, pick(P.leaf.slice(1, 5)), rr(0, 3), rr(0, 3), 0);
      if (rand() < roseRate) {
        const r = rr(0.09, 0.14);
        blooms.add(p.x + rr(-thick, thick), p.y + rr(0, thick * 1.1), p.z + rr(-thick, thick), r, r * 0.85, r, pick(P.rose), rr(0, 3), rr(0, 3), 0);
      }
    }
  };
  along(V3(x0, wall, zf), V3(x0, ridge, ridgeZ), 260, 0.35, 0.22); // 左山牆框
  along(V3(x0, ridge, ridgeZ), V3(1.0, ridge, ridgeZ), 220, 0.35, 0.2); // 屋脊左段
  along(V3(x0, wall, zf), V3(-0.6, wall, zf), 140, 0.3, 0.15); // 前簷左段
  along(V3(-0.6, wall + 0.6, 2.0), V3(1.0, ridge - 0.2, 0.6), 160, 0.4, 0.2); // 桁架上
  along(V3(x1 + 0.1, wall, zf), V3(x1, ridge, ridgeZ), 220, 0.32, 0.22); // 右山牆框
  along(V3(x1 - 0.9, wall + 0.2, zf), V3(x1, wall, zf), 70, 0.3, 0.2);
  along(V3(-6.4, 3.7, 2.0), V3(-4.7, 5.3, 2.0), 120, 0.3, 0.12); // 門廳山牆
  along(V3(-4.7, 5.3, 2.0), V3(-4.0, 4.9, -1.5), 120, 0.4, 0.08);
  // 從簷口垂下的藤
  const hang = (x, z, ytop, len) => {
    for (let t = 0; t < len; t += 0.09) {
      const s = rr(0.08, 0.14);
      leaves.add(x + Math.sin(t * 4) * 0.08 + rr(-0.06, 0.06), ytop - t, z + rr(-0.06, 0.06), s, s, s * 0.6, pick(P.leaf.slice(2)), rr(0, 3), rr(0, 3), 0);
    }
  };
  for (let i = 0; i < 6; i++) hang(rr(x0, 0.2), zf + rr(0, 0.15), wall, rr(0.4, 1.3));
  for (let i = 0; i < 4; i++) hang(x1 + rr(0.02, 0.15), zf - rr(0, 0.1), wall, rr(1.5, 3.4)); // 右前角柱整條藤
  for (let i = 0; i < 3; i++) hang(x1 - rr(0, 0.6), zf + rr(0, 0.12), wall, rr(0.4, 1.0));
  for (let i = 0; i < 6; i++) hang(-6.4 + rr(0, 0.15), 2.0, 3.7, rr(0.6, 2.4));
}

// ---------- 花園：灌木、紅花、瓶子草、樹 ----------
function buildGarden() {
  const P = PALETTE;
  // 右下的紅花叢：細莖 + 紅色花苞
  for (let i = 0; i < 420; i++) {
    let x, z;
    do { x = rr(5.0, 9.6); z = rr(2.0, 8.2); } while ((x - 9.5) ** 2 / 25 + (z - 8.2) ** 2 / 40 > 1);
    const h = rr(0.5, 1.3);
    stems.add(x, h / 2, z, 0.015, h, 0.015, 0x3e5e28);
    const s = rr(0.05, 0.085);
    blooms.add(x, h, z, s, s * 1.4, s, pick(P.red), rr(0, 3), rr(0, 3), 0);
    if (rand() < 0.5) fronds.add(x + 0.08, h * 0.35, z, 0.06, 0.02, 0.25, pick(P.leaf.slice(2)), -0.8, rr(0, 6), 0);
  }
  foliage(7.4, 0.4, 5.6, 2.2, 0.5, 2.4, 260, [0.14, 0.26]);
  // 瓶子草：細長莖頂端帶刺球
  for (let i = 0; i < 12; i++) {
    const x = rr(5.3, 6.6), z = rr(-0.2, 2.2), h = rr(1.2, 2.3);
    stems.add(x, h / 2, z, 0.025, h, 0.025, 0x6a8a3a);
    blooms.add(x, h, z, 0.12, 0.2, 0.12, pick([0x9ab850, 0xa8c060, 0x86a84a]), 0, rr(0, 3), 0);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      fronds.add(x + Math.sin(a) * 0.14, h + 0.1, z + Math.cos(a) * 0.14, 0.02, 0.02, 0.09, 0xc8a050, -0.8, a, 0);
    }
  }
  foliage(6.2, 0.5, 0.9, 1.0, 0.6, 1.4, 120, [0.12, 0.22]);
  // 右側灌木牆、白色小花
  foliage(7.8, 1.6, -1.6, 2.0, 1.8, 1.8, 320, [0.18, 0.32]);
  foliage(8.6, 1.0, 2.2, 1.2, 1.1, 1.3, 160, [0.16, 0.28]);
  sprinkle(7.6, 1.8, -1.0, 1.9, 1.6, 1.8, 50, [0xf0ece4, 0xffffff, 0xe8e0f0], [0.05, 0.08]);
  // 左側：龜背芋（長柄 + 大圓葉）
  for (const [x, z, n] of [[-7.6, 1.2, 9], [-8.6, 4.0, 8], [-6.8, -1.9, 7]]) {
    for (let i = 0; i < n; i++) {
      const yaw = rr(0, Math.PI * 2), r = rr(0.4, 0.9), h = rr(0.6, 1.5);
      const tx = x + Math.sin(yaw) * r, tz = z + Math.cos(yaw) * r;
      const lean = Math.atan2(r, h);
      stems.add((x + tx) / 2, h / 2, (z + tz) / 2, 0.025, Math.hypot(r, h), 0.025, 0x4a6a2a, lean * Math.cos(yaw), 0, -lean * Math.sin(yaw));
      fronds.add(tx + Math.sin(yaw) * 0.3, h, tz + Math.cos(yaw) * 0.3, 0.42, 0.06, 0.42, pick(P.leaf.slice(1, 4)), rr(0.2, 0.6), yaw, 0);
    }
  }
  foliage(-9.0, 1.6, -0.5, 1.2, 1.6, 1.6, 220, [0.18, 0.32]);
  foliage(-8.6, 0.6, 6.8, 1.4, 0.7, 1.4, 140, [0.14, 0.26]);
  foliage(-4.4, 0.4, 6.8, 1.2, 0.4, 1.2, 90, [0.12, 0.22]);
  for (let i = 0; i < 14; i++) rosette(rr(-9.4, -4), 0.05, rr(3, 8.2), 9, rr(0.6, 1.0), 0.12, 0.25);
  // 前景的蕨類與草叢
  for (let i = 0; i < 9; i++) rosette(rr(-1, 5.5), 0.05, rr(5.2, 8.2), 12, rr(0.7, 1.2), 0.14, 0.3);
  foliage(1.6, 0.35, 7.4, 2.6, 0.4, 1.0, 160, [0.12, 0.22]);
  foliage(-0.6, 0.25, 5.4, 0.8, 0.3, 0.6, 50, [0.1, 0.18]);
  // 背後的大樹
  foliage(7.2, 6.5, -5.2, 2.8, 3.2, 2.4, 700, [0.24, 0.4]);
  foliage(1.8, 6.8, -5.6, 3.4, 2.2, 1.8, 700, [0.24, 0.4]);
  foliage(-4.8, 8.0, -5.4, 3.0, 1.6, 2.2, 500, [0.24, 0.4]);
  cyl(1.8, 0, -5.8, 0.3, 4.8, 0x4a3626, 10);
  cyl(7.6, 0, -5.6, 0.35, 4.5, 0x4a3626, 10);
  // 磚樓上的常春藤
  foliage(-6.2, 7.8, -2.4, 2.2, 0.8, 0.8, 200, [0.12, 0.24]);
  for (let i = 0; i < 160; i++) {
    const s = rr(0.12, 0.22);
    leaves.add(rr(-9.4, -6.6), rr(2.0, 8.0), -1.95 + rr(0, 0.12), s, s, s * 0.5, pick(P.leaf), rr(0, 3), rr(0, 3), 0);
  }
}

// ---------- 燈光 ----------
function buildLights(scene) {
  const hemi = new THREE.HemisphereLight(0xdce8c8, 0x4a5638, 1.7); // 綠色調環境光，提亮暗部
  scene.add(hemi);
  // 右上方的暖色陽光，投影
  const sun = new THREE.DirectionalLight(0xffe6c0, 2.0);
  sun.position.set(14, 16, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  // 左前方的冷色補光，讓背光面不會全黑
  const fill = new THREE.DirectionalLight(0xc8d8d0, 0.8);
  fill.position.set(-10, 8, 12);
  scene.add(fill);

  for (const s of lightSpots) {
    const l = new THREE.PointLight(s.color, s.intensity, s.distance, 1.4);
    l.position.set(...s.pos);
    scene.add(l);
  }
  // 吊燈往下照茶几
  const pend = new THREE.SpotLight(0xffc070, 8, 6, THREE.MathUtils.degToRad(40), 0.6, 1.2);
  pend.position.set(1.6, GH.wall - 0.2, 0.6);
  pend.target.position.set(1.8, 0, 0.7);
  scene.add(pend, pend.target);
  return { hemi, sun, fill, pend };
}

// 陽光光束：幾片加法混色的半透明長條，從右上斜射下來
function buildSunShafts() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const dir = V3(-14, -16, -4).normalize();
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rr(0.5, 1.4), 26), mat);
    m.position.copy(V3(rr(2, 12), 12, rr(-6, 4))).addScaledVector(dir, 10);
    m.quaternion.setFromUnitVectors(_up, dir.clone().negate());
    m.rotateY(rr(0, Math.PI));
    m.userData.noOutline = true;
    m.renderOrder = 10;
    root.add(m);
  }
}

// ---------- inverted hull 描邊 ----------
const hullCache = new Map();
function hullGeometry(geo) {
  if (hullCache.has(geo.uuid)) return hullCache.get(geo.uuid);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', geo.getAttribute('position').clone());
  if (geo.index) g.setIndex(geo.index.clone());
  // 合併同位置頂點後重算法線 → 角落法線平均，外殼不會裂開
  g = mergeVertices(g, 1e-3);
  g.computeVertexNormals();
  hullCache.set(geo.uuid, g);
  return g;
}

export const outlineUniforms = {
  color: { value: new THREE.Color(PALETTE.outline) },
  scale: { value: 1 },
};
const outlineMats = new Map();
function outlineMaterial(thickness) {
  if (outlineMats.has(thickness)) return outlineMats.get(thickness);
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { thickness: { value: thickness } }]),
    vertexShader: /* glsl */ `
      uniform float thickness;
      uniform float scale;
      #include <fog_pars_vertex>
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 wp = modelMatrix * p;
        vec3 wn = normalize(mat3(modelMatrix) * n);
        wp.xyz += wn * thickness * scale;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    side: THREE.BackSide,
    fog: true,
  });
  // 顏色與整體粗細共用
  m.uniforms.color = outlineUniforms.color;
  m.uniforms.scale = outlineUniforms.scale;
  outlineMats.set(thickness, m);
  return m;
}

export const outlineMeshes = [];
export function addOutlines(group) {
  const targets = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.noOutline || o.userData.isOutline) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m.isMeshBasicMaterial || m.isShaderMaterial || m.transparent) return;
    targets.push(o);
  });
  for (const o of targets) {
    const t = o.userData.outline ?? 0.02;
    if (!t) continue;
    let hull;
    if (o.isInstancedMesh) {
      hull = new THREE.InstancedMesh(hullGeometry(o.geometry), outlineMaterial(t), o.count);
      hull.instanceMatrix = o.instanceMatrix;
    } else {
      hull = new THREE.Mesh(hullGeometry(o.geometry), outlineMaterial(t));
    }
    hull.frustumCulled = false;
    hull.userData.isOutline = true;
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.raycast = () => {};
    o.add(hull);
    outlineMeshes.push(hull);
  }
}
