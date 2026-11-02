import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

// 色票：從參考圖（黃昏街角花店）取的主要顏色
export const PALETTE = {
  bg: 0x2c3b3e,
  bgLight: 0x3e5355,
  asphalt: 0x3b4548,
  baseSide: 0x1f2729,
  roadLine: 0xb9bdb4,
  sidewalk: 0x8f897a,
  curb: 0xa8a394,
  plaster: 0xd2cab4,
  plasterDirty: 0xb1a993,
  brick: 0x8e4a34,
  tile: 0x3c4954,
  awning: 0xc95e3c,
  awningDark: 0xa4462c,
  frameGreen: 0x2f5a50,
  wood: 0x6a4a30,
  woodLight: 0x9a6a40,
  iron: 0x262b2e,
  windowWarm: 0xffc477,
  mailbox: 0xc4302a,
  vending: 0xe8e8e2,
  acBody: 0xdcdad2,
  metal: 0x8e9496,
  pole: 0xa9a89e,
  lamp: 0xe6f3ff,
  bike: 0x8a4a30,
  terracotta: 0xb4643e,
  potTeal: 0x3f6f6a,
  potGray: 0x8f8a80,
  leaf: [0x2f4f26, 0x3f6230, 0x4f7536, 0x5f8a3e, 0x75a04a],
  vineOrange: [0xe8692e, 0xf08a3a, 0xd9502a, 0xf4a048],
  flowers: [0xd23a2c, 0xe8505a, 0xf28aa6, 0xf6c0cc, 0xe8e2d4, 0xf0ece0, 0xe8692e, 0xf4a040, 0xf4d24a, 0xb08ad8, 0x8fb4e8],
  outline: 0x161a1d,
};

// ---------- 可重現的亂數 ----------
let seed = 20261102;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- 賽璐璐材質：3 階 gradientMap ----------
export const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat);
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
  const c = new THREE.Color(color).multiplyScalar(k);
  return new THREE.MeshBasicMaterial({ color: c, map, fog: true });
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
function cyl(x, y0, z, r, h, m, seg = 12, rTop = r) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg), asMat(m));
  mesh.position.set(x, y0 + h / 2, z);
  return add(mesh);
}
// 兩點之間拉一根圓柱
const _up = new THREE.Vector3(0, 1, 0);
function rod(a, b, r, m, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), asMat(m));
  mesh.position.copy(A).add(B).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(_up, B.clone().sub(A).normalize());
  return add(mesh);
}

// ---------- InstancedMesh 收集器 ----------
class Scatter {
  constructor(geo, outline = 0.012) { this.geo = geo; this.items = []; this.outline = outline; }
  add(x, y, z, sx, sy, sz, color, rx = 0, ry = 0, rz = 0) { this.items.push({ x, y, z, sx, sy, sz, color, rx, ry, rz }); }
  build() {
    const m = new THREE.InstancedMesh(this.geo, new THREE.MeshToonMaterial({ gradientMap: gradient }), this.items.length);
    const o = new THREE.Object3D();
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
const blooms = new Scatter(new THREE.DodecahedronGeometry(1, 0), 0.01); // 花朵
const pots = new Scatter(new THREE.CylinderGeometry(0.5, 0.36, 1, 10), 0.02); // 花盆
const bars = new Scatter(new THREE.BoxGeometry(1, 1, 1), 0); // 欄杆鐵條（不描邊）

// 一團葉子：在橢球裡撒小多面體，上半部用亮色
function foliage(cx, cy, cz, rx, ry, rz, n, size = [0.18, 0.34], colors = PALETTE.leaf) {
  // 大團的葉叢用更細碎的葉片，輪廓比較像手繪樹叢
  if (n >= 100) { n = Math.round(n * 1.7); size = [size[0] * 0.75, size[1] * 0.75]; }
  for (let i = 0; i < n; i++) {
    let x, y, z;
    do { x = rr(-1, 1); y = rr(-1, 1); z = rr(-1, 1); } while (x * x + y * y + z * z > 1);
    const s = rr(size[0], size[1]);
    const shade = y > 0.25 ? colors.slice(2) : y > -0.3 ? colors.slice(1, 4) : colors.slice(0, 3);
    leaves.add(cx + x * rx, cy + y * ry, cz + z * rz, s, s * rr(0.7, 1), s, pick(shade), rr(0, 3), rr(0, 3), 0);
  }
}
// 在一團葉子表面點綴花
function sprinkle(cx, cy, cz, rx, ry, rz, n, colors, size = [0.07, 0.12]) {
  for (let i = 0; i < n; i++) {
    const t = rr(0, Math.PI * 2), p = Math.acos(rr(-0.2, 1));
    const x = Math.sin(p) * Math.cos(t), y = Math.cos(p), z = Math.sin(p) * Math.sin(t);
    const s = rr(size[0], size[1]);
    blooms.add(cx + x * rx, cy + y * ry, cz + Math.abs(z) * rz, s, s * 0.8, s, pick(colors), rr(0, 3), rr(0, 3), 0);
  }
}
// 一盆花
function flowerPot(x, y, z, r = 0.25, h = 0.36, opt = {}) {
  const potColor = opt.pot ?? (rand() < 0.65 ? PALETTE.terracotta : rand() < 0.5 ? PALETTE.potGray : PALETTE.potTeal);
  pots.add(x, y + h / 2, z, r * 2, h, r * 2, potColor);
  const top = y + h;
  const fr = r * (opt.spread ?? 1.25);
  const fh = opt.height ?? r * 1.1;
  foliage(x, top + fh * 0.6, z, fr, fh, fr, opt.leaves ?? 10, [r * 0.35, r * 0.6]);
  if (opt.colors !== null) {
    const cols = opt.colors ?? [pick(PALETTE.flowers), pick(PALETTE.flowers)];
    sprinkle(x, top + fh * 0.75, z, fr * 1.05, fh * 0.9, fr * 1.05, opt.blooms ?? 12, cols, [r * 0.25, r * 0.42]);
  }
}
// 木箱裝花
function crate(x0, y0, z0, w, h, d, colors, n = 30) {
  box(x0, y0, z0, w, h, d, PALETTE.woodLight);
  // 木條縫
  for (let i = 1; i < 3; i++) box(x0 - 0.005, y0 + (h * i) / 3 - 0.012, z0 - 0.005, w + 0.01, 0.024, d + 0.01, PALETTE.wood).userData.noOutline = true;
  const cx = x0 + w / 2, cz = z0 + d / 2, top = y0 + h;
  foliage(cx, top + 0.08, cz, w * 0.45, 0.14, d * 0.42, Math.round(w * d * 60), [0.07, 0.13]);
  sprinkle(cx, top + 0.12, cz, w * 0.46, 0.16, d * 0.44, n, colors, [0.06, 0.1]);
}

// ---------- 外形用的擠出幾何 ----------
// 在 xz 平面上的形狀，往上擠出 h（形狀座標 (x, z)）
function slab(points, h, mats, y0 = 0, curveSegments = 16) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], -points[0][1]);
  for (const p of points.slice(1)) {
    if (p.length === 2) shape.lineTo(p[0], -p[1]);
    else shape.quadraticCurveTo(p[0], -p[1], p[2], -p[3]);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mats);
  m.position.y = y0;
  return add(m);
}
// 三角山牆：形狀 (z, y)，沿 -x 擠出 len，xRight 是右端
function gableX(pts, len, xRight, m) {
  const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  g.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, asMat(m));
  mesh.position.x = xRight;
  return add(mesh);
}
function gableZ(pts, len, z0, m) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
  const mesh = new THREE.Mesh(g, asMat(m));
  mesh.position.z = z0;
  return add(mesh);
}

// ======================================================================
export function buildScene(scene) {
  root = new THREE.Group();
  scene.add(root);

  buildBase();
  buildBuilding();
  buildShopfront();
  buildLeftSide();
  buildRightSide();
  buildFrontDisplay();
  buildGreenery();

  leaves.build();
  blooms.build();
  pots.build();
  bars.build().material = toon(PALETTE.iron);

  const lights = buildLights(scene);
  addOutlines(root);
  return { root, lights };
}

// ---------- 立體模型底座：柏油路 + 石板人行道 ----------
function buildBase() {
  const R = 1.6;
  const base = slab(
    [[-10 + R, -6.5], [10 - R, -6.5], [10, -6.5, 10, -6.5 + R], [10, 5.0 - R], [10, 5.0, 10 - R, 5.0], [-10 + R, 5.0], [-10, 5.0, -10, 5.0 - R], [-10, -6.5 + R], [-10, -6.5, -10 + R, -6.5]],
    0.9,
    [toon(PALETTE.asphalt), toon(PALETTE.baseSide)],
    -0.9,
  );
  base.userData.outline = 0.05;

  // 石板人行道，右前方是弧形轉角
  const stone = stoneTex();
  const walk = slab(
    [[-9.4, -4.5], [6.4, -4.5], [6.4, 0.4], [6.4, 2.9, 3.9, 2.9], [-9.4, 2.9]],
    0.18,
    [toonMap(stone), toon(PALETTE.curb)],
  );
  walk.userData.outline = 0.03;

  // 路面標線、人孔蓋
  for (let i = 0; i < 6; i++) box(-8.6 + i * 3.2, 0.001, 4.0, 1.8, 0.01, 0.12, PALETTE.roadLine).userData.noOutline = true;
  box(-9.6, 0.001, 3.25, 19.2, 0.01, 0.08, PALETTE.roadLine).userData.noOutline = true;
  cyl(7.6, 0, 3.9, 0.45, 0.02, 0x2a3134, 20).userData.noOutline = true;
}

function stoneTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#5f5b52';
  g.fillRect(0, 0, 256, 256);
  const cols = ['#8f897a', '#99927f', '#857f70', '#a29b88'];
  for (let y = 0; y < 256; y += 32) {
    const off = (y / 32) % 2 ? 0 : 24;
    for (let x = -48; x < 256; x += 48) {
      g.fillStyle = pick(cols);
      g.fillRect(x + off + 3, y + 3, 42, 26);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.5, 0.5);
  return t;
}

// ---------- 兩層老屋 ----------
function buildBuilding() {
  const P = PALETTE;
  const H = 6.0;
  // 左棟：屋脊沿 x；右棟：山牆朝正面
  const plasterL = toonMap(TX.plasterTex(384, 480, [[0.05, 0.38, 0.28, 0.14], [0.62, 0.05, 0.3, 0.1], [0.0, 0.8, 0.16, 0.18]]));
  const plasterR = toonMap(TX.plasterTex(352, 480, [[0.55, 0.55, 0.3, 0.12], [0.02, 0.86, 0.2, 0.12]]));
  const side = toon(P.plasterDirty);
  box(-4.6, 0, -4, 4.8, H, 4, [side, side, side, side, plasterL, side]);
  box(0.2, 0, -4, 4.4, H, 4.2, [side, side, side, side, plasterR, side]);

  // 右棟正面山牆，頂端露出紅磚
  const gableTex = TX.plasterTex(256, 128, [[0.3, 0.3, 0.4, 0.55]]);
  gableTex.repeat.set(1 / 4.4, 1 / 2.1);
  gableTex.offset.set(-0.2 / 4.4, -6 / 2.1);
  gableZ([[0.2, 6], [4.6, 6], [2.4, 8.1]], 4.2, -4, toonMap(gableTex));
  // 左棟兩端山牆
  gableX([[-4, 6], [0, 6], [-2, 7.25]], 4.8, 0.2, P.plasterDirty);

  // 樓層間的腰線
  box(-4.7, 3.0, -0.02, 4.9, 0.16, 0.3, P.plasterDirty);
  box(0.2, 3.0, 0.18, 4.5, 0.16, 0.3, P.plasterDirty);

  // ----- 屋頂：深灰藍日式瓦 -----
  const tiles = TX.tileTex();
  const tileMat = (rx, ry) => {
    const t = tiles.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return toonMap(t);
  };
  const roofEdge = toon(0x2a333b);
  // 左棟：前後兩片
  {
    const dz = 2.75, dy = 1.5, L = Math.hypot(dz, dy), a = Math.atan2(dy, dz);
    const mtop = tileMat(3, 2);
    const mk = (cz, cy, rx) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.16, L), [roofEdge, roofEdge, mtop, roofEdge, roofEdge, roofEdge]);
      m.position.set(-2.25, cy, cz);
      m.rotation.x = rx;
      add(m);
    };
    mk(-2 + dz / 2, 7.35 - dy / 2, a);
    mk(-2 - dz / 2, 7.35 - dy / 2, -a);
    rod([-4.95, 7.4, -2], [0.6, 7.4, -2], 0.13, 0x2a333b, 8); // 屋脊
  }
  // 右棟：山牆朝前，兩片沿 z
  {
    const dx = 2.75, dy = 2.5, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const mtop = tileMat(2, 3);
    const mk = (cx, rz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.16, 5.3), [roofEdge, roofEdge, mtop, roofEdge, roofEdge, roofEdge]);
      m.position.set(cx, 8.2 - dy / 2, -1.6);
      m.rotation.z = rz;
      add(m);
    };
    mk(2.4 + dx / 2, -a);
    mk(2.4 - dx / 2, a);
    rod([2.4, 8.25, -4.3], [2.4, 8.25, 1.05], 0.13, 0x2a333b, 8);
    // 山牆封簷板
    for (const s of [-1, 1]) {
      rod([2.4, 8.12, 1.0], [2.4 + s * dx, 8.12 - dy, 1.0], 0.07, P.wood, 6);
    }
  }
  // 屋頂邊的雨水槽、落水管
  rod([-4.95, 5.85, 0.65], [0.3, 5.85, 0.65], 0.07, 0x7a5a42, 8);
  rod([0.3, 5.85, 0.65], [0.3, 5.85, 0.12], 0.06, 0x7a5a42, 8);
  rod([0.3, 5.85, 0.12], [0.3, 0.1, 0.12], 0.06, 0x7a5a42, 8);

  // ----- 二樓窗戶 + 陽台 -----
  upperWindow(-3.4, 3.55, 2.3, 1.75, 0, 4, 3);
  upperWindow(1.45, 3.6, 1.9, 1.95, 0.2, 2, 3);

  // 冷氣室外機（左上，掛在牆角外）
  acUnit(-5.75, 3.55, -0.05, 1.3, 1.0, 0.62);
  rod([-4.45, 4.5, 0.1], [-4.2, 4.5, 0.1], 0.04, P.acBody);
  // 電表箱、小招牌
  box(-1.0, 4.65, 0, 0.4, 0.55, 0.14, 0x9a9c94);
  box(-0.55, 4.7, 0, 0.36, 0.48, 0.14, 0x5e6a64);
  rod([-0.8, 5.2, 0.07], [-0.8, 5.9, 0.07], 0.025, 0x333333);
  const signMat = toonMap(TX.smallSignTex());
  const sg = toon(0x2f6a4a);
  box(-1.05, 3.45, 0, 1.05, 0.8, 0.08, [sg, sg, sg, sg, signMat, sg]);
  // 牆上海報
  const poster = toonMap(posterTex());
  box(0.55, 4.25, 0.2, 0.55, 0.75, 0.03, [poster, poster, poster, poster, poster, poster]).userData.noOutline = true;

  // 右側直式燈箱招牌（從牆角伸出）
  rod([4.6, 6.2, 0.35], [5.0, 6.2, 0.35], 0.035, P.iron);
  rod([4.6, 3.9, 0.35], [5.0, 3.9, 0.35], 0.035, P.iron);
  const vsign = glow(0xffffff, 1.25, TX.verticalSignTex());
  const vframe = toon(0x5a3a22);
  const vs = box(4.95, 3.7, 0.25, 0.9, 2.7, 0.2, [vframe, vframe, vframe, vframe, vsign, vframe]);
  vs.userData.outline = 0.025;
}

function posterTex() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 176;
  const g = c.getContext('2d');
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, 128, 176);
  g.fillStyle = '#d0703a'; g.beginPath(); g.arc(64, 64, 34, 0, 7); g.fill();
  g.fillStyle = '#3a5a3a'; g.fillRect(20, 118, 88, 10); g.fillRect(30, 138, 68, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const lightSpots = []; // 收集暖光位置，最後統一放 PointLight

function upperWindow(x0, y0, w, h, z, cols, rows) {
  const P = PALETTE;
  // 窗內暖光（自發光貼圖）
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glow(0xffffff, 1.4, TX.roomTex()));
  glass.position.set(x0 + w / 2, y0 + h / 2, z + 0.01);
  glass.userData.noOutline = true;
  root.add(glass);
  // 木窗框
  const t = 0.12;
  box(x0 - t, y0 - t, z, w + 2 * t, t, 0.14, P.wood);
  box(x0 - t, y0 + h, z, w + 2 * t, t, 0.14, P.wood);
  box(x0 - t, y0, z, t, h, 0.14, P.wood);
  box(x0 + w, y0, z, t, h, 0.14, P.wood);
  for (let c = 1; c < cols; c++) box(x0 + (w * c) / cols - 0.03, y0, z, 0.06, h, 0.08, P.wood);
  for (let r = 1; r < rows; r++) box(x0, y0 + (h * r) / rows - 0.03, z, w, 0.06, 0.08, P.wood);
  // 窗上的小磚拱
  const bt = toonMap(TX.brickTex(128, 32));
  box(x0 - 0.3, y0 + h + t, z, w + 0.6, 0.22, 0.1, [bt, bt, bt, bt, bt, bt]);
  // 鐵欄杆陽台
  const by = y0 - 0.32, bz = z + 0.75;
  box(x0 - 0.3, by, z, w + 0.6, 0.1, 0.78, P.iron);
  for (let x = x0 - 0.25; x <= x0 + w + 0.26; x += 0.13) bars.add(x, by + 0.42, bz - 0.03, 0.03, 0.74, 0.03, P.iron);
  for (let zz = z + 0.1; zz < bz; zz += 0.13) {
    bars.add(x0 - 0.27, by + 0.42, zz, 0.03, 0.74, 0.03, P.iron);
    bars.add(x0 + w + 0.27, by + 0.42, zz, 0.03, 0.74, 0.03, P.iron);
  }
  box(x0 - 0.3, by + 0.78, bz - 0.06, w + 0.6, 0.05, 0.06, P.iron).userData.noOutline = true;
  box(x0 - 0.3, by + 0.78, z, 0.05, 0.05, 0.75, P.iron).userData.noOutline = true;
  box(x0 + w + 0.25, by + 0.78, z, 0.05, 0.05, 0.75, P.iron).userData.noOutline = true;
  // 陽台盆栽
  const n = Math.round(w / 0.45);
  for (let i = 0; i < n; i++) {
    const px = x0 - 0.1 + ((w + 0.2) * (i + 0.5)) / n;
    flowerPot(px, by + 0.1, z + 0.45, rr(0.13, 0.2), 0.22, {
      colors: rand() < 0.5 ? null : [pick(PALETTE.flowers)],
      height: rr(0.15, 0.45),
      leaves: 14,
    });
  }
  lightSpots.push({ pos: [x0 + w / 2, y0 + h * 0.55, z + 0.9], color: 0xffb46a, intensity: 3.5, distance: 4.5 });
}

function acUnit(x0, y0, z0, w, h, d) {
  const P = PALETTE;
  box(x0, y0, z0, w, h, d, P.acBody);
  // 風扇格柵
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.36, h * 0.36, 0.04, 20), toon(0x4a4e50));
  fan.rotation.x = Math.PI / 2;
  fan.position.set(x0 + w * 0.38, y0 + h / 2, z0 + d + 0.01);
  add(fan);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.08, h * 0.08, 0.06, 10), toon(P.acBody));
  hub.rotation.x = Math.PI / 2;
  hub.position.copy(fan.position).z += 0.02;
  add(hub);
  for (let i = 0; i < 5; i++) bars.add(x0 + w * 0.82, y0 + 0.2 + i * (h - 0.4) / 4, z0 + d + 0.01, w * 0.22, 0.03, 0.02, 0x9a9890);
  // 支架
  box(x0 + 0.1, y0 - 0.08, z0 - 0.05, w - 0.2, 0.06, d + 0.05, 0x6a6e70);
}

// ---------- 一樓店面 ----------
function buildShopfront() {
  const P = PALETTE;
  const interior = glow(0xffffff, 1.1, TX.interiorTex());
  const green = P.frameGreen;

  // 左店窗（左雨棚下）
  storeWindow(-2.85, 0.45, 2.8, 2.15, 0, 3, interior);
  // 右店窗 + 門 + 右窗
  storeWindow(0.95, 0.45, 1.0, 2.15, 0.2, 1, interior);
  storeWindow(3.25, 0.45, 1.25, 2.15, 0.2, 2, interior);
  // 門
  const door = glow(0xffffff, 1.1, TX.doorTex());
  const dg = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.3), door);
  dg.position.set(2.6, 1.6, 0.235);
  dg.userData.noOutline = true;
  root.add(dg);
  box(2.1, 0.2, 0.2, 1.0, 0.08, 0.06, green);
  box(2.1, 0.2, 0.2, 0.09, 2.35, 0.06, green);
  box(3.01, 0.2, 0.2, 0.09, 2.35, 0.06, green);
  box(2.1, 2.55, 0.2, 1.0, 0.12, 0.06, green);
  box(2.19, 0.28, 0.2, 0.82, 0.67, 0.05, green); // 門下半木板
  box(2.88, 1.15, 0.24, 0.06, 0.2, 0.06, 0xc8a050); // 門把
  // 門口台階
  box(1.95, 0, 0.2, 1.3, 0.28, 0.6, 0x9a9484);
  box(2.05, 0, 0.8, 1.1, 0.2, 0.35, 0x8e887a);

  // 店面下方的綠色踢腳板
  box(-2.95, 0, -0.02, 3.0, 0.45, 0.12, green);
  box(0.85, 0, 0.18, 1.2, 0.45, 0.12, green);
  box(3.15, 0, 0.18, 1.45, 0.45, 0.12, green);
  // 左店面左邊露出的紅磚牆
  const bt = toonMap(TX.brickTex());
  box(-4.6, 0.0, -0.01, 1.6, 2.9, 0.06, [bt, bt, bt, bt, bt, bt]);

  // 紅色郵筒（掛牆）
  box(0.28, 1.35, 0.2, 0.55, 0.7, 0.36, P.mailbox);
  box(0.33, 1.88, 0.56, 0.45, 0.04, 0.02, 0x3a1410).userData.noOutline = true;
  box(0.24, 2.05, 0.18, 0.63, 0.06, 0.42, 0x9a2420);

  // ----- 遮雨棚 -----
  // 左：圓弧棚（四分之一圓柱壓扁）
  const ag = new THREE.CylinderGeometry(1.35, 1.35, 3.3, 14, 1, false, 0, Math.PI / 2);
  ag.rotateZ(Math.PI / 2);
  ag.scale(1, 0.55, 1);
  const aw = new THREE.Mesh(ag, toon(P.awning));
  aw.position.set(-1.25, 2.38, 0);
  add(aw).userData.outline = 0.03;
  const leftText = toonMap(TX.awningTex('生花・観葉植物'));
  const ad = toon(P.awningDark);
  box(-2.9, 2.08, 1.25, 3.3, 0.3, 0.08, [ad, ad, ad, ad, leftText, ad]);
  // 右：斜面棚 + 前緣店名
  {
    const L = 1.55, a = Math.atan2(0.5, 1.45);
    const m = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.08, L), toon(P.awning));
    m.position.set(2.6, 3.0 - 0.25, 0.2 + 0.72);
    m.rotation.x = a;
    add(m).userData.outline = 0.03;
    const text = toonMap(TX.awningTex('FLOWER & GREEN  花緑屋'));
    box(0.48, 2.12, 1.62, 4.25, 0.42, 0.08, [ad, ad, ad, ad, text, ad]);
    // 兩側三角布
    for (const x of [0.48, 4.69]) {
      const tri = new THREE.Shape([new THREE.Vector2(0.2, 3.02), new THREE.Vector2(1.66, 2.54), new THREE.Vector2(1.66, 2.12)]);
      const g = new THREE.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false });
      g.rotateY(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, toon(P.awningDark));
      mesh.position.x = x + (x > 1 ? 0.04 : 0.0);
      add(mesh);
    }
  }
  // 雨棚下的壁燈
  for (const [x, z] of [[0.55, 0.2], [1.95, 0.2], [4.25, 0.2]]) {
    rod([x, 2.85, z], [x, 2.85, z + 0.35], 0.025, P.iron);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 12, 1, true), toon(P.iron));
    shade.position.set(x, 2.72, z + 0.38);
    add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glow(0xffd090, 2));
    bulb.position.set(x, 2.64, z + 0.38);
    bulb.userData.noOutline = true;
    root.add(bulb);
  }
  lightSpots.push({ pos: [-1.3, 1.5, 1.6], color: 0xffa860, intensity: 3.5, distance: 4.5 });
  lightSpots.push({ pos: [2.6, 1.6, 1.7], color: 0xffa860, intensity: 3.5, distance: 4.5 });
  lightSpots.push({ pos: [4.6, 2.3, 0.9], color: 0xffb070, intensity: 2, distance: 3 });
}

function storeWindow(x0, y0, w, h, z, cols, interior) {
  const g = PALETTE.frameGreen;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), interior);
  glass.position.set(x0 + w / 2, y0 + h / 2, z + 0.02);
  glass.userData.noOutline = true;
  root.add(glass);
  const t = 0.1;
  box(x0 - t, y0 - t, z, w + 2 * t, t, 0.12, g);
  box(x0 - t, y0 + h, z, w + 2 * t, t, 0.12, g);
  box(x0 - t, y0, z, t, h, 0.12, g);
  box(x0 + w, y0, z, t, h, 0.12, g);
  for (let c = 1; c < cols; c++) box(x0 + (w * c) / cols - 0.04, y0, z, 0.08, h, 0.1, g);
  // 上方氣窗分隔
  box(x0, y0 + h * 0.78, z, w, 0.07, 0.1, g);
  for (let c = 1; c < cols * 3; c++) box(x0 + (w * c) / (cols * 3) - 0.02, y0 + h * 0.78, z, 0.04, h * 0.22, 0.08, g).userData.noOutline = true;
  // 店內吊掛的乾燥花束
  for (let i = 0; i < cols; i++) {
    const cx = x0 + (w * (i + 0.5)) / cols;
    foliage(cx, y0 + h * 0.62, z - 0.12, 0.14, 0.22, 0.06, 8, [0.05, 0.09], [0x8a7a3a, 0x9a8a4a, 0xb09a54, 0xc8b070]);
  }
}

// ---------- 左側：販賣機 + 腳踏車 ----------
function buildLeftSide() {
  const P = PALETTE;
  // 販賣機
  const vx = -6.15, vz = 0.05;
  const body = toon(P.vending);
  const front = glow(0xffffff, 1.22, TX.vendingTex());
  box(vx, 0.18, vz, 1.3, 2.05, 0.85, [body, body, body, body, front, body]).userData.outline = 0.03;
  box(vx - 0.03, 2.2, vz - 0.02, 1.36, 0.1, 0.9, 0xc9c9c2);
  // 旁邊的直條廣告看板
  const adMat = glow(0xffffff, 1.0, TX.adStripTex());
  const adSide = toon(0xd8d4c8);
  box(-4.82, 0.18, vz, 0.42, 1.95, 0.5, [adSide, adSide, adSide, adSide, adMat, adSide]);
  // 販賣機上方的小冷氣
  acUnit(-4.5, 2.35, -0.05, 0.95, 0.68, 0.45);
  lightSpots.push({ pos: [-5.5, 1.5, 2.4], color: 0xe4f2ff, intensity: 3, distance: 3.5 });

  // 腳踏車（車頭朝右）
  const bz = 1.95, y = 0.18;
  const wr = 0.4;
  const wheel = (x) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(wr, 0.04, 6, 24), toon(0x1c1e20));
    t.position.set(x, y + wr, bz);
    add(t);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      rod([x - Math.cos(a) * wr, y + wr - Math.sin(a) * wr, bz], [x + Math.cos(a) * wr, y + wr + Math.sin(a) * wr, bz], 0.008, 0x8a8a8a, 3).userData.noOutline = true;
    }
  };
  const xb = -8.1, xf = -6.75;
  wheel(xb);
  wheel(xf);
  const c = P.bike;
  const crank = [-7.45, y + 0.42, bz], seatTop = [-7.68, y + 1.02, bz], head = [-6.95, y + 1.0, bz];
  rod([xb, y + wr, bz], crank, 0.03, c);
  rod([xb, y + wr, bz], seatTop, 0.03, c);
  rod(crank, seatTop, 0.035, c);
  rod(crank, [-6.97, y + 0.88, bz], 0.035, c); // 下管（淑女車低跨）
  rod(head, [xf, y + wr, bz], 0.03, c);
  rod(head, [-6.98, y + 1.22, bz], 0.03, c);
  rod([-6.98, y + 1.22, bz - 0.3], [-6.98, y + 1.22, bz + 0.3], 0.025, 0x2a2a2a);
  box(-7.85, y + 1.04, bz - 0.1, 0.32, 0.08, 0.2, 0x3a2a22); // 座墊
  // 前菜籃
  box(-6.95, y + 0.95, bz - 0.22, 0.45, 0.32, 0.44, 0x3a3e40);
  box(-6.92, y + 1.27, bz - 0.19, 0.39, 0.02, 0.38, 0x5a5e60).userData.noOutline = true;
  // 擋泥板
  const fender = new THREE.Mesh(new THREE.TorusGeometry(wr + 0.06, 0.03, 4, 16, Math.PI * 0.9), toon(0xb8b8b0));
  fender.position.set(xb, y + wr, bz);
  fender.rotation.z = Math.PI * 0.08;
  add(fender);
  // 籃子裡的花
  foliage(-6.73, y + 1.33, bz, 0.2, 0.12, 0.18, 10, [0.06, 0.1]);
  sprinkle(-6.73, y + 1.35, bz, 0.2, 0.12, 0.18, 10, [0xf4f0e4, 0xf28aa6, 0xe8505a]);

  // 磚砌花台
  const bt = toonMap(TX.brickTex());
  box(-9.2, 0.18, -1.2, 2.3, 0.55, 1.2, [bt, bt, toon(0x4a3a2c), bt, bt, bt]);
}

// ---------- 右側：電線桿 + 路燈 ----------
function buildRightSide() {
  const P = PALETTE;
  const px = 6.6, pz = 1.6;
  cyl(px, 0, pz, 0.24, 11.5, P.pole, 16, 0.2);
  // 腳釘、銘板、色帶
  for (let i = 0; i < 6; i++) box(px - 0.04, 3 + i * 0.8, pz + (i % 2 ? 0.2 : -0.28), 0.08, 0.04, 0.1, P.metal).userData.noOutline = true;
  box(px - 0.18, 2.4, pz + 0.2, 0.36, 0.6, 0.03, 0xe8e0c8).userData.noOutline = true;
  for (const y of [1.0, 1.2]) cyl(px, y, pz, 0.245, 0.08, y === 1.0 ? 0xe8c040 : 0x2a2a2a, 16).userData.noOutline = true;
  // 變壓器
  cyl(px - 0.55, 9.0, pz, 0.32, 0.9, 0x8a9294, 12);
  rod([px - 0.25, 9.7, pz], [px, 9.7, pz], 0.05, P.metal);
  // 橫擔
  box(px - 1.0, 10.4, pz - 0.06, 2.0, 0.12, 0.12, P.metal);
  // 路燈臂與燈頭（往右彎）
  rod([px + 0.2, 8.2, pz], [px + 0.9, 8.65, pz], 0.05, P.metal);
  rod([px + 0.9, 8.65, pz], [px + 1.3, 8.6, pz], 0.05, P.metal);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x6e787c));
  head.scale.set(1.25, 0.45, 0.8);
  head.position.set(px + 1.45, 8.55, pz);
  add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), glow(P.lamp, 4));
  lens.rotation.x = Math.PI / 2;
  lens.scale.set(1.2, 0.75, 1);
  lens.position.set(px + 1.45, 8.54, pz);
  lens.userData.noOutline = true;
  root.add(lens);

  // 電線：下垂的細管
  const wire = (a, b, sag) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const M = A.clone().lerp(B, 0.5);
    M.y -= sag;
    const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 24, 0.025, 4);
    const m = new THREE.Mesh(g, glow(0x15191c, 1));
    m.userData.noOutline = true;
    root.add(m);
  };
  wire([px - 0.9, 10.45, pz], [4.6, 6.4, 0.0], 0.4);
  wire([px + 0.9, 10.45, pz], [12, 11.5, 1.2], 0.6);
  wire([px - 0.9, 10.45, pz], [-12, 10.8, -3], 1.3);
  wire([px + 0.9, 10.45, pz], [-12, 11.2, -3], 1.1);
  wire([px, 9.4, pz], [13, 9.0, 3], 0.5);

  // 牆角爬藤沿電線
  return { lampPos: new THREE.Vector3(px + 1.45, 8.45, pz) };
}

// ---------- 門前的盆花與木箱 ----------
function buildFrontDisplay() {
  const P = PALETTE;
  const fl = P.flowers;
  // 左側木層架
  box(-3.5, 0.18, 0.15, 1.9, 0.08, 0.7, P.wood);
  box(-3.5, 0.62, 0.15, 1.9, 0.08, 0.7, P.wood);
  for (const x of [-3.48, -1.68]) box(x, 0.18, 0.15, 0.06, 0.55, 0.7, P.wood);
  crate(-3.4, 0.7, 0.2, 0.8, 0.32, 0.55, [0xf0ece0, 0xe8e2d4, 0xf6c0cc], 26);
  crate(-2.5, 0.7, 0.2, 0.75, 0.32, 0.55, [0xf28aa6, 0xe8505a], 24);
  crate(-3.4, 0.26, 0.25, 0.8, 0.3, 0.55, [0xf4a040, 0xe8692e], 20);
  crate(-2.5, 0.26, 0.25, 0.75, 0.3, 0.55, [0xf4f0e4], 18);

  // 大陶盆（藍綠釉）
  flowerPot(-1.15, 0.18, 1.3, 0.38, 0.6, { pot: P.potTeal, height: 0.5, spread: 1.3, leaves: 30, blooms: 6, colors: [0xf4f0e4] });
  // 黑板立牌
  chalkboard(0.6, 0.18, 2.0);
  // 前排木箱紅花
  crate(-0.2, 0.18, 1.85, 1.1, 0.35, 0.65, [0xd23a2c, 0xe8505a, 0xd9402a], 46);
  crate(0.9, 0.18, 1.6, 0.85, 0.3, 0.55, [0xf28aa6, 0xf6c0cc, 0xf4f0e4], 30);
  // 盆花群
  const spots = [
    [-2.3, 1.3], [-2.75, 1.75], [-1.9, 2.05], [-3.4, 1.4], [-3.0, 2.2], [-0.45, 1.25], [0.3, 1.1],
    [1.3, 0.75], [1.6, 1.2], [1.95, 2.35], [3.45, 1.2], [3.9, 1.7], [3.35, 2.15], [4.35, 2.2], [4.8, 1.05], [5.25, 1.5], [4.95, 2.15], [5.6, 0.6], [-4.2, 1.55], [-3.9, 2.4],
  ];
  for (const [x, z] of spots) {
    const r = rr(0.18, 0.3);
    flowerPot(x, 0.18, z, r, r * rr(1.1, 1.5), {
      colors: rand() < 0.15 ? null : [pick(fl), pick(fl)],
      height: rr(0.2, 0.45),
      leaves: 16,
      blooms: 14,
    });
  }
  // 右側三層花架
  for (let i = 0; i < 3; i++) {
    const y = 0.18 + i * 0.45, z = 0.3 + (2 - i) * 0.2;
    box(3.3, y + 0.38, z, 1.3, 0.06, 0.32, P.wood);
    for (let k = 0; k < 3; k++) flowerPot(3.5 + k * 0.45, y + 0.44, z + 0.16, 0.15, 0.2, { height: 0.2, leaves: 8, blooms: 8 });
  }
  for (const x of [3.3, 4.55]) box(x, 0.18, 0.3, 0.05, 1.4, 0.75, P.wood);
  // 門口兩側的大株：繡球（藍）、萬壽菊（橘）
  flowerPot(1.6, 0.28, 0.5, 0.26, 0.34, { pot: P.potGray, height: 0.35, leaves: 18, blooms: 26, colors: [0x8fb4e8, 0xa8c4f0, 0xf4f0e4] });
  flowerPot(4.9, 0.18, 2.6, 0.34, 0.45, { height: 0.42, leaves: 22, blooms: 40, colors: [0xe8692e, 0xf4a040, 0xd9502a] });
  flowerPot(3.6, 0.18, 2.65, 0.3, 0.4, { height: 0.35, leaves: 20, blooms: 30, colors: [0xf4f0e4, 0xf0ece0] });
  // 長形花槽（右前）
  box(5.0, 0.18, -0.1, 1.4, 0.4, 0.55, P.potTeal);
  foliage(5.7, 0.75, 0.17, 0.7, 0.25, 0.25, 40, [0.08, 0.15]);
  sprinkle(5.7, 0.8, 0.17, 0.7, 0.25, 0.25, 20, [0xf4f0e4, 0xf4d24a]);
}

function chalkboard(x, y, z) {
  const P = PALETTE;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const face = toonMap(TX.chalkTex());
  const wood = toon(P.wood);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.05), [wood, wood, wood, wood, face, wood]);
  b.position.set(0, 0.55, 0.1);
  b.rotation.x = -0.18;
  add(b, g);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.05), wood);
  back.position.set(0, 0.55, -0.1);
  back.rotation.x = 0.18;
  add(back, g);
  root.add(g);
}

// ---------- 綠意：藤蔓、屋頂植物、花藤、灌木 ----------
function buildGreenery() {
  const P = PALETTE;
  // 二樓正面垂下的橘紅花藤：上寬下窄的簾幕
  for (let i = 0; i < 1500; i++) {
    const v = Math.pow(rand(), 0.8); // 0 頂端 → 1 底部
    const y = 5.6 - v * 3.3;
    const half = 1.9 - v * 1.0 + Math.sin(y * 3) * 0.15;
    const x = 0.05 + rr(-half, half) * (rand() < 0.3 ? 1.15 : 1);
    const z = (x > 0.2 ? 0.2 : 0) + rr(0.05, 0.55) * (1 - v * 0.3);
    if (rand() < 0.45) {
      const s = rr(0.08, 0.15);
      leaves.add(x, y, z, s, s, s * 0.6, pick(P.leaf.slice(0, 4)), rr(0, 3), rr(0, 3), 0);
    } else {
      const s = rr(0.05, 0.1);
      blooms.add(x, y, z + 0.08, s, s, s, pick(P.vineOrange), rr(0, 3), rr(0, 3), 0);
    }
  }
  // 垂到雨棚上的長串
  for (let k = 0; k < 14; k++) {
    let x = rr(-1.8, 2.0), y = 3.6, z = rr(0.3, 0.9);
    const len = rr(0.6, 1.4);
    for (let t = 0; t < len; t += 0.07) {
      blooms.add(x + rr(-0.05, 0.05), y - t, z + t * 0.4, 0.07, 0.07, 0.07, pick(P.vineOrange), rr(0, 3), 0, 0);
      if (rand() < 0.4) leaves.add(x + rr(-0.08, 0.08), y - t, z + t * 0.4, 0.08, 0.08, 0.05, pick(P.leaf), rr(0, 3), 0, 0);
    }
  }

  // 牆面爬藤：以「沿牆面貼片」撒葉
  const wallVine = (x0, x1, y0, y1, z, n, s = [0.1, 0.2]) => {
    for (let i = 0; i < n; i++) {
      const sz = rr(s[0], s[1]);
      leaves.add(rr(x0, x1), rr(y0, y1), z + rr(0.02, 0.18), sz, sz, sz * 0.5, pick(P.leaf), rr(0, 3), rr(0, 3), 0);
    }
  };
  wallVine(3.8, 4.75, 0.5, 6.4, 0.2, 260); // 右棟右緣
  wallVine(4.1, 4.75, 6.0, 7.4, 0.7, 60);
  wallVine(-4.65, -3.9, 2.9, 6.1, 0, 160); // 左棟左緣
  wallVine(-0.4, 0.4, 5.0, 6.0, 0.15, 40);
  // 右棟右側牆面（側面）
  for (let i = 0; i < 260; i++) {
    const sz = rr(0.12, 0.22);
    leaves.add(4.62 + rr(0, 0.2), rr(0.3, 6.5), rr(-3.8, 0.2), sz * 0.5, sz, sz, pick(P.leaf), rr(0, 3), rr(0, 3), 0);
  }

  // 屋頂上的植物
  foliage(-3.6, 6.9, -0.4, 1.0, 0.45, 0.8, 120);
  foliage(-1.6, 7.15, -1.2, 1.2, 0.5, 0.9, 140);
  foliage(-4.4, 6.3, 0.3, 0.6, 0.6, 0.5, 70);
  foliage(0.1, 6.9, -0.6, 0.6, 0.4, 0.6, 60);
  foliage(4.4, 6.8, 0.6, 0.6, 1.0, 0.6, 110); // 右棟屋簷右角
  foliage(3.3, 7.6, 0.2, 0.7, 0.35, 0.5, 60);
  foliage(1.0, 7.4, -0.5, 0.6, 0.35, 0.6, 50);
  foliage(-1.2, 3.25, 0.4, 1.4, 0.3, 0.35, 70); // 腰線上的盆栽帶
  foliage(2.6, 3.3, 0.6, 1.8, 0.28, 0.35, 80);
  sprinkle(-1.2, 3.35, 0.45, 1.4, 0.3, 0.35, 30, P.vineOrange);

  // 左側大灌木與樹
  foliage(-7.6, 2.0, -0.5, 1.8, 2.0, 1.4, 420, [0.2, 0.38]);
  foliage(-6.6, 3.8, -1.6, 1.8, 1.6, 1.4, 320, [0.22, 0.4]);
  foliage(-8.8, 1.1, 0.8, 0.9, 0.8, 0.8, 120, [0.16, 0.3]);
  sprinkle(-8.8, 1.2, 0.9, 0.9, 0.8, 0.8, 26, [0xf28aa6, 0xd23a2c, 0xf4f0e4]);
  foliage(-5.2, 0.55, 1.2, 0.5, 0.4, 0.45, 50);
  // 右側灌木叢與樹
  foliage(7.4, 2.0, -0.6, 2.0, 2.0, 1.6, 480, [0.2, 0.38]);
  foliage(5.8, 4.2, -1.8, 1.7, 2.4, 1.4, 380, [0.22, 0.4]);
  foliage(5.9, 1.0, 0.9, 0.9, 0.9, 0.8, 140, [0.15, 0.3]);
  foliage(8.4, 0.9, 1.2, 1.0, 0.9, 1.0, 140, [0.16, 0.32]);
  sprinkle(5.9, 1.1, 0.9, 0.9, 0.9, 0.8, 30, [0xf4f0e4, 0xffffff, 0xf28aa6]);
  // 建築後方的樹，讓輪廓有層次
  foliage(-2.6, 7.2, -4.8, 2.0, 1.0, 1.0, 160, [0.22, 0.36]);
  foliage(4.2, 7.4, -4.8, 1.6, 1.0, 1.0, 120, [0.22, 0.36]);
}

// ---------- 燈光 ----------
function buildLights(scene) {
  // 冷色環境光：天空偏藍綠、地面偏暗棕
  const hemi = new THREE.HemisphereLight(0x8fb0b8, 0x2a2622, 1.35);
  scene.add(hemi);
  // 黃昏的主光：左前上方偏暖白，投影
  const key = new THREE.DirectionalLight(0xffe6c8, 1.5);
  key.position.set(-10, 16, 14);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -12; sc.right = 12; sc.top = 13; sc.bottom = -6; sc.near = 1; sc.far = 50;
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  // 背側冷光勾邊
  const rim = new THREE.DirectionalLight(0x6f9aa8, 0.9);
  rim.position.set(12, 8, -10);
  scene.add(rim);

  // 暖色點光（窗、店面、販賣機）
  for (const s of lightSpots) {
    const l = new THREE.PointLight(s.color, s.intensity, s.distance, 1.4);
    l.position.set(...s.pos);
    scene.add(l);
  }
  // 直式招牌的暖光
  const sign = new THREE.PointLight(0xffc880, 5, 4, 1.4);
  sign.position.set(5.4, 5.0, 1.2);
  scene.add(sign);

  // 路燈：冷白 SpotLight 往下照
  const spot = new THREE.SpotLight(0xdcecff, 28, 16, THREE.MathUtils.degToRad(30), 0.5, 1.2);
  spot.position.set(8.05, 8.4, 1.6);
  spot.target.position.set(5.6, 0, 3.4);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.001;
  scene.add(spot, spot.target);
  return { hemi, key, rim, spot };
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
function addOutlines(group) {
  const targets = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.noOutline || o.userData.isOutline) return;
    if (o.material.isMeshBasicMaterial || o.material.isShaderMaterial) return;
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
