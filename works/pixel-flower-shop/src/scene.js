import * as THREE from 'three';
import { addSway } from './wind.js';

// 色票：從參考圖取的主要顏色
export const PALETTE = {
  sky: 0xe4e2dd,
  wall: 0xe6dfcf,
  wallDirty: 0xcfc6b2,
  brick: 0xa45a3e,
  tile: 0xa8553a,
  tileDark: 0x7a3a26,
  awning: 0x3f7a7a,
  awningDark: 0x2e5c5e,
  wood: 0x6b3f24,
  woodLight: 0x8a5a36,
  glass: 0x48626a,
  glassHi: 0x8fb0b4,
  stone: 0xbdb8aa,
  pavement: 0x9a8a76,
  curb: 0xb3ada0,
  asphalt: 0x7a7d80,
  roadLine: 0xd8d8d0,
  baseSide: 0x4e4a47,
  mailbox: 0xc23a2c,
  vending: 0x2f6b45,
  bin: 0x4f6a5c,
  cone: 0xe0603a,
  metal: 0x9aa0a2,
  acBody: 0xd9d6cc,
  terracotta: 0xb4643e,
  potGray: 0x8f8a80,
  trunk: 0x5a4030,
  leaf: [0x3f6a2c, 0x4f7a35, 0x6f9a44, 0x87ad52, 0x2f5524],
  maple: [0xb83a22, 0xd0482a, 0xe8693a, 0xf08a48, 0x9c2e1c],
  flowers: [0xffffff, 0xf4f0e0, 0xf6a6b8, 0xe85a7a, 0xf4d040, 0xf09a30, 0xd8322e, 0xb07ad8, 0xffffff, 0xf6c6d0],
};

// ---------- 可重現的亂數 ----------
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- Toon 材質（3 階） ----------
export const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([165, 215, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const matCache = new Map();
export function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
  return matCache.get(color);
}
function texMat(tex, color = 0xffffff) {
  return new THREE.MeshToonMaterial({ map: tex, color, gradientMap: gradient });
}

let root;
function add(mesh, parent = root) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
// 以「最小角 + 尺寸」放方塊，比較好對座標
function box(x0, y0, z0, w, h, d, color, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
  m.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return add(m, parent);
}
function cyl(x, y0, z, r, h, color, seg = 8, rTop = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg), mat(color));
  m.position.set(x, y0 + h / 2, z);
  return add(m);
}

// ---------- InstancedMesh 收集器 ----------
class Scatter {
  constructor(geo) { this.geo = geo; this.items = []; }
  add(x, y, z, sx, sy, sz, color, ry = 0) { this.items.push({ x, y, z, sx, sy, sz, color, ry }); }
  build() {
    const m = new THREE.InstancedMesh(this.geo, new THREE.MeshToonMaterial({ gradientMap: gradient }), this.items.length);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    this.items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.scale.set(it.sx, it.sy, it.sz);
      o.rotation.set(0, it.ry, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(it.color));
    });
    return add(m);
  }
}
const cubes = new Scatter(new THREE.BoxGeometry(1, 1, 1)); // 葉叢、花朵
const pots = new Scatter(new THREE.CylinderGeometry(0.5, 0.36, 1, 8)); // 花盆

// 一團葉子：在橢球裡撒小方塊
function foliage(cx, cy, cz, rx, ry, rz, n, colors, size) {
  // 沒指定大小的（大樹冠）用小方塊、數量加倍，顆粒比較細
  if (!size) { size = [0.28, 0.52]; n = Math.round(n * 2.2); }
  for (let i = 0; i < n; i++) {
    let x, y, z;
    do { x = rr(-1, 1); y = rr(-1, 1); z = rr(-1, 1); } while (x * x + y * y + z * z > 1);
    const s = rr(size[0], size[1]);
    // 上方亮、下方暗
    const shade = y > 0.3 ? colors.slice(1) : colors;
    cubes.add(cx + x * rx, cy + y * ry, cz + z * rz, s, s, s, pick(shade), rr(0, 0.6));
  }
}
// 一盆花：盆 + 葉 + 花點
function flowerPot(x, y, z, r = 0.32, h = 0.42, potColor) {
  pots.add(x, y + h / 2, z, r * 2, h, r * 2, potColor ?? (rand() < 0.7 ? PALETTE.terracotta : PALETTE.potGray));
  const top = y + h;
  const n = 5 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    const s = rr(0.18, 0.3);
    cubes.add(x + rr(-r, r), top + rr(0, 0.35), z + rr(-r, r), s, s, s, pick(PALETTE.leaf));
  }
  const fc = pick(PALETTE.flowers);
  const nf = 3 + Math.floor(rand() * 6);
  for (let i = 0; i < nf; i++) {
    const s = rr(0.14, 0.22);
    cubes.add(x + rr(-r, r), top + rr(0.25, 0.6), z + rr(-r, r), s, s, s, rand() < 0.8 ? fc : pick(PALETTE.flowers));
  }
}
// 一叢地植花（沒盆）
function flowerBush(x, y, z, r, n) {
  foliage(x, y + r * 0.5, z, r, r * 0.6, r, n, PALETTE.leaf, [0.25, 0.45]);
  const fc = pick(PALETTE.flowers);
  for (let i = 0; i < n * 0.6; i++) {
    const s = rr(0.14, 0.24);
    cubes.add(x + rr(-r, r), y + r * 0.6 + rr(0, r * 0.7), z + rr(-r, r), s, s, s, rand() < 0.7 ? fc : pick(PALETTE.flowers));
  }
}

// ---------- CanvasTexture ----------
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// 陶瓦：直向瓦溝 + 橫向瓦列
function tileTex(repU, repV, rotate = false) {
  const t = canvasTex(16, 16, (g) => {
    g.fillStyle = hex(PALETTE.tile); g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#c66a46'; g.fillRect(2, 0, 4, 16); g.fillRect(10, 0, 4, 16);
    g.fillStyle = hex(PALETTE.tileDark); g.fillRect(7, 0, 2, 16); g.fillRect(15, 0, 1, 16);
    g.fillStyle = 'rgba(60,20,10,0.55)'; g.fillRect(0, 14, 16, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repU, repV);
  if (rotate) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
  return t;
}

function signTex() {
  return canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = hex(PALETTE.awningDark); g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8efe6';
    g.font = 'bold 20px sans-serif'; g.textBaseline = 'middle';
    g.fillText('花と緑', 14, h / 2 + 1);
    g.font = 'bold 18px monospace';
    g.fillText('HANA STORE', 140, h / 2 + 1);
    g.fillRect(100, 6, 2, 20);
  });
}
function chalkTex(white = false) {
  return canvasTex(32, 48, (g, w, h) => {
    g.fillStyle = white ? '#eceae2' : '#2f4a3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = white ? '#556070' : '#e9e8de';
    for (let y = 6; y < h - 4; y += 5) g.fillRect(4 + (y % 3), y, 14 + ((y * 7) % 11), 2);
    g.fillStyle = white ? '#d0505a' : '#f2b8c8'; g.fillRect(6, 3, 10, 2);
  });
}
function vendingTex() {
  return canvasTex(36, 72, (g, w, h) => {
    g.fillStyle = hex(PALETTE.vending); g.fillRect(0, 0, w, h);
    // 上方廣告
    g.fillStyle = '#e06a32'; g.fillRect(3, 3, 18, 12);
    g.fillStyle = '#f5d870'; g.fillRect(7, 6, 10, 6);
    // 飲料展示窗
    g.fillStyle = '#cfe0e0'; g.fillRect(22, 3, 12, 40);
    const cans = ['#d83a30', '#f0f0f0', '#3a7ad0', '#f2c030', '#2a9a5a', '#f08a3a'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      g.fillStyle = cans[(r * 3 + c) % cans.length];
      g.fillRect(23 + c * 4, 5 + r * 10, 3, 6);
    }
    g.fillStyle = '#e8e8e8';
    for (let y = 20; y < 44; y += 4) g.fillRect(4, y, 14, 1);
    g.fillStyle = '#1e3a2a'; g.fillRect(4, 56, 28, 8);
    g.fillStyle = '#9aa0a2'; g.fillRect(26, 46, 4, 6);
  });
}
function acTex() {
  return canvasTex(24, 16, (g) => {
    g.fillStyle = hex(PALETTE.acBody); g.fillRect(0, 0, 24, 16);
    g.fillStyle = '#5c5e5c'; g.beginPath(); g.arc(9, 8, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a8aaa4'; g.lineWidth = 1;
    for (let r = 2; r < 6; r += 2) { g.beginPath(); g.arc(9, 8, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#b8b4a8'; g.fillRect(17, 3, 5, 10);
  });
}

// ===================================================================
export function buildScene(scene) {
  root = new THREE.Group();
  scene.add(root);

  // 光：午後暖陽從左上斜射 + 冷色天光
  scene.add(new THREE.HemisphereLight(0xdde8f2, 0x9a8c7c, 1.6));
  const sun = new THREE.DirectionalLight(0xfff4e2, 2.2);
  sun.position.set(-16, 24, 14);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  buildBase();
  buildBuilding();
  buildShopFront();
  buildStreetProps();
  buildPlants();

  addSway(cubes.build()); // 葉叢、花朵隨風微微晃動
  pots.build();
}

// ---------- 底座與地面 ----------
function buildBase() {
  // 方形 diorama 底座（側面深色）
  box(-13, -2.2, -8, 26, 2.2, 18, PALETTE.baseSide);
  box(-13.05, -0.25, -8.05, 26.1, 0.25, 18.1, 0x5c5753); // 上緣一條線
  // 柏油
  box(-13, 0, -8, 26, 0.05, 18, PALETTE.asphalt);
  // 人行道 / 店前地坪
  box(-11, 0.05, -7, 21, 0.25, 11.2, PALETTE.pavement);
  // 右前轉角做成斜角
  const corner = box(9, 0.05, -2, 2.4, 0.25, 4.6, PALETTE.pavement);
  corner.rotation.y = -0.3;
  // 石邊緣（路緣石）
  box(-11, 0.05, 4.2, 20.5, 0.3, 0.45, PALETTE.curb);
  for (let x = -11; x < 9.5; x += 1.2) box(x, 0.36, 4.2, 0.06, 0.01, 0.45, 0x8f8a7e);
  // 地坪磚縫
  for (let x = -10.5; x < 9.5; x += 1.4) box(x, 0.3, 1.6, 0.05, 0.005, 2.6, 0x857664);
  // 左前草皮
  box(-11, 0.3, 3.3, 3.6, 0.08, 0.9, 0x5f8a3a);
  // 路面白線（虛線）
  for (let x = -12.5; x < 12.5; x += 2.4) box(x, 0.05, 7.6, 1.5, 0.02, 0.18, PALETTE.roadLine);
  box(-13, 0.05, 5.0, 26, 0.02, 0.12, PALETTE.roadLine);
  // 人孔蓋
  cyl(-4, 0.05, 6.3, 0.8, 0.03, 0x3a3c3e, 12);
  cyl(5.5, 0.05, 8.8, 0.8, 0.03, 0x3a3c3e, 12);
  // 落葉
  for (let i = 0; i < 40; i++) {
    cubes.add(rr(-12, 12), 0.08, rr(4.8, 9.8), 0.15, 0.03, 0.1, pick([...PALETTE.maple, 0xc89a40]));
  }
}

// ---------- 建築本體 ----------
const F = 1.5; // 一樓正面 z
const F2 = 0.6; // 二樓正面 z
function buildBuilding() {
  // 一樓
  box(-5, 0.3, -5, 10, 4.0, 6.5, PALETTE.wall);
  // 二樓（略內縮）
  box(-4.2, 4.3, -5, 8.8, 3.9, 5.6, PALETTE.wall);

  // 正面山牆三角形
  const hw = 4.4, rise = 2.5, cx = 0.2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0); shape.lineTo(hw, 0); shape.lineTo(0, rise); shape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(shape, { depth: 5.6, bevelEnabled: false });
  const gable = add(new THREE.Mesh(gableGeo, mat(PALETTE.wall)));
  gable.position.set(cx, 8.2, -5);

  // 主屋頂：兩片斜板 + 屋脊
  const over = 0.7;
  const slopeLen = Math.hypot(hw + over, rise + over * (rise / hw));
  const ang = Math.atan2(rise, hw);
  const depth = 5.6 + 0.9;
  for (const side of [-1, 1]) {
    const geo = new THREE.BoxGeometry(slopeLen, 0.35, depth);
    const m = add(new THREE.Mesh(geo, texMat(tileTex(depth / 0.55, slopeLen / 0.6, true))));
    m.rotation.z = -side * ang;
    m.position.set(cx + side * (hw + over) / 2 - side * 0.02, 8.2 + rise / 2 + 0.15 - over * (rise / hw) / 2, -5 + depth / 2 - 0.3);
  }
  box(cx - 0.3, 8.2 + rise, -5.3, 0.6, 0.35, depth, PALETTE.tileDark);
  // 鬼瓦
  box(cx - 0.35, 8.2 + rise - 0.1, F2 + 0.55, 0.7, 0.55, 0.3, PALETTE.tileDark);

  // 一樓瓦片屋簷（正面 + 兩側）
  const eaveDepth = 1.7;
  const eave = add(new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.3, eaveDepth), texMat(tileTex(10.8 / 0.55, eaveDepth / 0.6))));
  eave.rotation.x = 0.35;
  eave.position.set(0, 4.45, F + eaveDepth / 2 - 0.35);
  box(-5.4, 4.0, F + 0.95, 10.8, 0.18, 0.2, PALETTE.tileDark); // 瓦簷前緣
  box(-5.4, 3.75, F + 0.95, 10.8, 0.12, 0.12, PALETTE.wood); // 簷下木條
  for (const sx of [-1, 1]) {
    const side = add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 6.5), texMat(tileTex(1.4 / 0.6, 6.5 / 0.55, true))));
    side.rotation.z = sx * 0.4;
    side.position.set(sx * 5.25, 4.5, -1.75);
  }
  // 一樓屋頂平台（二樓前方那一條）
  box(-5, 4.3, F2, 10, 0.12, F - F2, 0x8c5a40);

  // 二樓木窗 + 小屋簷 + 花台
  const wx = -0.8, ww = 3.2;
  box(wx - 0.15, 5.35, F2, ww + 0.3, 2.0, 0.12, PALETTE.wood);
  box(wx, 5.5, F2 + 0.05, ww, 1.7, 0.1, PALETTE.glass);
  for (let i = 1; i < 4; i++) box(wx + (ww / 4) * i - 0.05, 5.5, F2 + 0.1, 0.1, 1.7, 0.08, PALETTE.wood);
  box(wx, 6.5, F2 + 0.1, ww, 0.08, 0.08, PALETTE.wood);
  box(wx - 0.4, 7.45, F2, ww + 0.8, 0.15, 0.7, PALETTE.woodLight); // 窗上小屋簷
  for (const dx of [0, ww]) {
    const br = box(wx + dx - 0.05, 7.1, F2 + 0.05, 0.1, 0.35, 0.5, PALETTE.wood);
    br.rotation.x = 0.6;
  }
  // 花台：鐵欄 + 盆
  box(wx - 0.2, 5.0, F2, ww + 0.4, 0.15, 0.75, PALETTE.wood);
  for (let x = wx - 0.15; x <= wx + ww + 0.2; x += 0.35) box(x, 5.15, F2 + 0.68, 0.05, 0.55, 0.05, 0x3a3230);
  box(wx - 0.2, 5.7, F2 + 0.66, ww + 0.4, 0.06, 0.08, 0x3a3230);
  for (let x = wx + 0.2; x < wx + ww; x += 0.55) flowerPot(x, 5.15, F2 + 0.38, 0.22, 0.3);
  foliage(wx + 1.4, 5.0, F2 + 0.7, 1.8, 0.6, 0.3, 40, PALETTE.leaf, [0.2, 0.4]); // 垂下的葉子
  // 窗內盆栽（大葉）
  foliage(wx + 2.5, 6.2, F2 + 0.15, 0.5, 0.6, 0.15, 14, PALETTE.leaf, [0.2, 0.4]);

  // 剝落的灰泥、露出磚
  const bricks = (x0, y0, cols, rows, z) => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (rand() < 0.2) continue;
      box(x0 + c * 0.42 + (r % 2) * 0.21, y0 + r * 0.22, z, 0.38, 0.18, 0.06, rand() < 0.5 ? PALETTE.brick : 0x8e4a34);
    }
  };
  bricks(-2.6, 4.8, 3, 4, F2);
  bricks(2.7, 4.75, 2, 2, F2);
  bricks(-4.8, 1.6, 2, 3, F);
  box(-3.8, 6.8, F2, 1.2, 0.5, 0.03, PALETTE.wallDirty);
  box(2.9, 7.2, F2, 0.8, 0.4, 0.03, PALETTE.wallDirty);
  box(-2.2, 8.4, F2, 1.6, 0.7, 0.03, PALETTE.wallDirty);
  box(4.6, 5.0, -2, 0.03, 1.4, 1.2, PALETTE.wallDirty);
  // 牆面髒污（屋簷下水痕）
  for (let x = -4; x < 4.5; x += 0.7) box(x, 7.6 + rand() * 0.3, F2, 0.18, 0.6 + rand() * 0.4, 0.02, PALETTE.wallDirty);

  // 冷氣室外機：左邊一台在一樓屋頂上，右邊一台掛在側牆
  const acT = acTex();
  const acMats = [mat(PALETTE.acBody), mat(PALETTE.acBody), mat(PALETTE.acBody), mat(PALETTE.acBody), texMat(acT), mat(PALETTE.acBody)];
  const ac1 = add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 0.7), acMats));
  ac1.position.set(-3.3, 5.2, F2 + 0.4);
  box(-4.3, 4.4, F2 + 0.05, 2.0, 0.2, 0.75, 0x6a6a64); // 架子
  const ac2 = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 1.8), [texMat(acT), mat(PALETTE.acBody), mat(PALETTE.acBody), mat(PALETTE.acBody), mat(PALETTE.acBody), mat(PALETTE.acBody)]));
  ac2.material[0].map.center.set(0.5, 0.5);
  ac2.position.set(4.6 + 0.4, 6.6, -1.2);
  box(4.6, 5.95, -2.1, 0.8, 0.08, 1.8, 0x6a6a64);

  // 電視天線
  cyl(-2.2, 9.5, -0.6, 0.06, 3.6, 0x6a5a4a, 5);
  box(-3.0, 12.4, -0.65, 1.6, 0.08, 0.08, 0x6a5a4a);
  for (let i = 0; i < 5; i++) box(-2.9 + i * 0.32, 11.6, -0.9, 0.05, 0.05, 0.6, 0x6a5a4a);
  box(-2.8, 11.6, -0.65, 1.3, 0.06, 0.06, 0x6a5a4a);

  // 壁燈
  box(-2.1, 6.9, F2, 0.15, 0.4, 0.15, 0x3a3230);
  const lamp = cyl(-2.03, 6.5, F2 + 0.45, 0.22, 0.3, 0x4a4440, 8, 0.08);
  lamp.rotation.x = 0.2;
  box(-2.08, 7.05, F2 + 0.1, 0.1, 0.1, 0.35, 0x3a3230);

  // 雨水管
  cyl(4.45, 0.3, F2 + 0.15, 0.09, 8.0, 0x8a5a3a, 6);
  cyl(-4.9, 0.3, F + 0.1, 0.09, 4.2, 0x8a5a3a, 6);
  box(-4.25, 8.0, F2 - 0.05, 8.8, 0.15, 0.2, 0x8a5a3a); // 簷溝

  // 背面：後門、小窗、晾衣竿
  box(1.5, 0.3, -5.15, 1.1, 2.4, 0.15, PALETTE.wood);
  box(-3.2, 1.6, -5.12, 1.6, 1.2, 0.12, PALETTE.wood);
  box(-3.05, 1.7, -5.18, 1.3, 1.0, 0.08, PALETTE.glass);
  box(-1.0, 5.6, -5.12, 1.8, 1.3, 0.12, PALETTE.wood);
  box(-0.85, 5.7, -5.18, 1.5, 1.1, 0.08, PALETTE.glass);
  box(-1.4, 7.1, -5.4, 2.6, 0.06, 0.06, PALETTE.metal);
  box(-4.4, 1.8, -5.35, 0.4, 0.3, 0.4, 0x6a6a64);
  bricks(0.5, 3.0, 3, 3, -5.06);

  // 電錶箱 / 配電盤（右側一樓）
  box(5.0, 2.2, -0.2, 0.15, 0.9, 0.7, 0xc8c4b8);
  box(5.0, 1.0, -1.8, 0.2, 1.2, 0.9, 0xa8a49a);
}

// ---------- 一樓店面 ----------
function buildShopFront() {
  const z = F;
  const frame = PALETTE.wood;
  // 展示窗（左、右）
  const win = (x0, w) => {
    box(x0 - 0.15, 0.9, z, w + 0.3, 2.65, 0.15, frame);
    box(x0, 1.05, z + 0.05, w, 2.35, 0.12, PALETTE.glass);
    for (let i = 1; i < 3; i++) box(x0 + (w / 3) * i - 0.05, 1.05, z + 0.15, 0.1, 2.35, 0.05, frame);
    box(x0, 2.45, z + 0.15, w, 0.1, 0.05, frame);
    // 窗內反光與商品色塊
    box(x0 + 0.2, 2.6, z + 0.17, 0.6, 0.6, 0.01, PALETTE.glassHi);
    for (let i = 0; i < 6; i++) box(x0 + rr(0.1, w - 0.4), rr(1.2, 2.2), z + 0.17, 0.25, 0.3, 0.01, pick([0xe8e0c8, 0xf0b8c0, 0x7a9a5a, 0xd8d0b8]));
    box(x0 - 0.2, 0.3, z, w + 0.4, 0.6, 0.3, 0x8a7a6a); // 窗台下石台
  };
  win(-4.4, 2.8);
  win(1.6, 2.4);
  // 雙開木門
  box(-1.45, 0.85, z, 2.9, 2.75, 0.18, frame);
  for (const dx of [-1.3, 0.05]) {
    box(dx, 0.95, z + 0.05, 1.25, 2.5, 0.16, PALETTE.woodLight);
    box(dx + 0.15, 2.0, z + 0.15, 0.95, 1.3, 0.05, PALETTE.glass);
    box(dx + 0.15, 1.1, z + 0.15, 0.95, 0.7, 0.05, PALETTE.wood);
  }
  box(-0.12, 1.9, z + 0.22, 0.08, 0.4, 0.06, 0xd8b860);
  box(0.04, 1.9, z + 0.22, 0.08, 0.4, 0.06, 0xd8b860);
  // 門上貼紙 / 告示
  box(-1.0, 2.3, z + 0.21, 0.35, 0.45, 0.01, 0xf2f0e8);
  box(0.5, 2.5, z + 0.21, 0.3, 0.35, 0.01, 0xf2f0e8);
  box(0.9, 1.3, z + 0.21, 0.25, 0.3, 0.01, 0xd8503a);
  // 石階兩階
  box(-1.8, 0.3, z, 3.6, 0.28, 1.4, PALETTE.stone);
  box(-1.6, 0.58, z, 3.2, 0.27, 0.75, 0xc9c4b6);

  // 遮雨棚：斜板 + 前緣招牌
  const aw = 8.2, ax = -4.6;
  const aDepth = 1.4, aTilt = 0.3;
  const awning = box(ax, 0, 0, aw, 0.08, aDepth, PALETTE.awning);
  awning.rotation.x = aTilt;
  awning.position.set(ax + aw / 2, 3.52, z + aDepth / 2 - 0.05);
  const signMat = texMat(signTex());
  const front = add(new THREE.Mesh(new THREE.BoxGeometry(aw, 0.5, 0.06), [mat(PALETTE.awningDark), mat(PALETTE.awningDark), mat(PALETTE.awningDark), mat(PALETTE.awningDark), signMat, mat(PALETTE.awningDark)]));
  front.position.set(ax + aw / 2, 3.12, z + aDepth * Math.cos(aTilt) - 0.05);
  // 棚架支桿
  for (const x of [ax + 0.1, ax + aw - 0.1]) {
    const arm = box(x, 3.25, z, 0.06, 0.06, aDepth, 0x3a3a3a);
    arm.rotation.x = aTilt;
  }
  // 吊燈（棚下右邊）
  box(3.9, 3.2, z + 0.1, 0.25, 0.25, 0.3, 0x3a3230);

  // 紅色郵筒（右窗旁）
  box(4.2, 1.9, z, 0.75, 0.9, 0.45, PALETTE.mailbox);
  box(4.2, 2.8, z - 0.02, 0.8, 0.1, 0.52, 0x9a2a20);
  box(4.35, 2.45, z + 0.46, 0.45, 0.06, 0.01, 0x2a2020);
  box(4.35, 2.1, z + 0.46, 0.45, 0.2, 0.01, 0xf2f0e8);

  // 吊掛的花籃（右窗前）
  box(2.75, 2.55, z + 0.7, 0.03, 0.9, 0.03, 0x2a2a2a);
  const basket = add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x8a6a40)));
  basket.position.set(2.77, 2.6, z + 0.72);
  foliage(2.77, 2.55, z + 0.72, 0.6, 0.35, 0.5, 22, PALETTE.leaf, [0.15, 0.3]);
  for (let i = 0; i < 18; i++) cubes.add(2.77 + rr(-0.6, 0.6), 2.5 + rr(-0.5, 0.35), z + 0.72 + rr(-0.45, 0.45), 0.18, 0.18, 0.18, pick([0xf09a30, 0xf4d040, 0xe85a7a, 0xffffff]));
  // 左窗乾燥花束
  for (let i = 0; i < 3; i++) {
    const x = -3.8 + i * 0.6;
    box(x, 3.0, z + 0.25, 0.03, 0.3, 0.03, 0x2a2a2a);
    for (let k = 0; k < 6; k++) cubes.add(x + rr(-0.15, 0.15), 2.7 + rr(-0.3, 0.1), z + 0.25 + rr(-0.1, 0.1), 0.13, 0.13, 0.13, pick([0xc87a88, 0xd8a050, 0xa8b878, 0xe0c0c8]));
  }
}

// ---------- 街角道具 ----------
function buildStreetProps() {
  const g = 0.3; // 地坪高
  // 販賣機
  const vt = vendingTex();
  const vmx = 6.0, vmz = 0.3;
  const vm = add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.6, 1.1), [mat(PALETTE.vending), mat(PALETTE.vending), mat(0x26583a), mat(PALETTE.vending), texMat(vt), mat(PALETTE.vending)]));
  vm.position.set(vmx + 0.9, g + 1.8, vmz + 0.55);
  box(vmx - 0.05, g + 3.6, vmz - 0.05, 1.9, 0.12, 1.2, 0x26583a);
  // 垃圾桶（回收箱）
  cyl(8.4, g, 1.9, 0.42, 1.2, PALETTE.bin, 10);
  cyl(8.4, g + 1.2, 1.9, 0.46, 0.12, 0x3f584c, 10);
  box(8.25, g + 0.9, 2.31, 0.3, 0.12, 0.02, 0x2a3a32);
  // 三角錐
  cyl(7.2, g, 3.5, 0.3, 1.1, PALETTE.cone, 8, 0.05);
  cyl(7.2, g + 0.5, 3.5, 0.2, 0.18, 0xf2f2ea, 8, 0.17);
  box(6.85, g, 3.15, 0.7, 0.08, 0.7, 0x3a3a3a);

  // 腳踏車（沿 x 方向停放）
  const bike = new THREE.Group();
  bike.position.set(10.2, g, 2.6);
  bike.rotation.y = -0.55;
  root.add(bike);
  const wheelGeo = new THREE.TorusGeometry(0.62, 0.06, 4, 16);
  for (const x of [-0.95, 0.95]) {
    const w = new THREE.Mesh(wheelGeo, mat(0x1e1e1e));
    w.position.set(x, 0.65, 0);
    add(w, bike);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6), mat(PALETTE.metal));
    hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.65, 0);
    add(hub, bike);
  }
  const bar = (x1, y1, x2, y2, c = 0x2a3a3a) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.07), mat(c));
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    m.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    add(m, bike);
  };
  bar(-0.95, 0.65, -0.1, 0.65); bar(-0.1, 0.65, 0.75, 1.25); bar(-0.35, 1.3, 0.75, 1.25);
  bar(-0.1, 0.65, -0.35, 1.3); bar(-0.95, 0.65, -0.35, 1.3); bar(0.95, 0.65, 0.75, 1.25);
  bar(0.75, 1.25, 0.7, 1.5);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.2), mat(0x3a2a20));
  seat.position.set(-0.38, 1.38, 0); add(seat, bike);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), mat(PALETTE.metal));
  hb.position.set(0.7, 1.52, 0); add(hb, bike);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.35), mat(PALETTE.metal));
  bk.position.set(1.0, 1.35, 0); add(bk, bike);

  // 黑板立牌（A 字架）
  const aBoard = (x, z, white, ry) => {
    const grp = new THREE.Group();
    grp.position.set(x, g, z);
    grp.rotation.y = ry;
    root.add(grp);
    const t = chalkTex(white);
    const face = [mat(PALETTE.wood), mat(PALETTE.wood), mat(PALETTE.wood), mat(PALETTE.wood), texMat(t), mat(PALETTE.wood)];
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.08), face);
    front.position.set(0, 0.72, 0.2); front.rotation.x = -0.25; add(front, grp);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.08), mat(PALETTE.wood));
    back.position.set(0, 0.72, -0.2); back.rotation.x = 0.25; add(back, grp);
  };
  aBoard(-3.1, 3.4, false, 0.15);
  aBoard(3.6, 3.65, true, -0.1);

  // 小木凳
  box(-2.0, g + 0.7, 2.7, 0.7, 0.1, 0.6, PALETTE.woodLight);
  for (const [dx, dz] of [[0, 0], [0.6, 0], [0, 0.5], [0.6, 0.5]]) box(-2.0 + dx, g, 2.7 + dz, 0.08, 0.7, 0.08, PALETTE.wood);
  flowerPot(-1.65, g + 0.8, 3.0, 0.25, 0.3);
}

// ---------- 植物 ----------
function buildPlants() {
  const g = 0.3;
  // 左側大樹
  const t1 = cyl(-8.6, g, -2.5, 0.4, 6.5, PALETTE.trunk, 6, 0.25);
  t1.rotation.z = -0.12;
  const br = cyl(-7.6, 3.8, -2.2, 0.15, 3, PALETTE.trunk, 5, 0.1);
  br.rotation.z = -0.8;
  foliage(-9.0, 7.0, -2.6, 2.8, 2.2, 2.4, 600, PALETTE.leaf);
  foliage(-7.0, 5.4, -1.0, 1.9, 1.4, 1.6, 300, PALETTE.leaf);
  foliage(-9.8, 3.8, 0.4, 1.6, 1.4, 1.4, 200, PALETTE.leaf);
  foliage(-7.5, 1.6, 1.8, 2.4, 1.4, 1.5, 160, PALETTE.leaf, [0.4, 0.8]); // 下方灌木
  // 後方右側綠樹（從屋頂後面露出）
  // 樹幹離開背牆，短而粗，分岔成三支往上撐住樹冠
  const bx = 6.6, bz = -6.0;
  cyl(bx, g, bz, 0.42, 4.6, PALETTE.trunk, 6, 0.3);
  for (const [rz, rx, len] of [[0.45, 0.15, 3.2], [-0.35, -0.2, 3.4], [0.05, 0.4, 2.8]]) {
    const b = cyl(bx, 4.4, bz, 0.2, len, PALETTE.trunk, 5, 0.1);
    // 以底部為支點傾斜：中心 = 分岔點 + 轉過的半段長度
    b.rotation.set(rx, 0, rz);
    b.position.set(bx, 4.4, bz).add(new THREE.Vector3(0, len / 2, 0).applyEuler(b.rotation));
  }
  // 樹冠：幾團大小不一、往下垂到二樓高度，蓋住枝幹
  foliage(bx - 1.0, 9.4, bz - 0.2, 2.6, 1.8, 1.8, 330, PALETTE.leaf);
  foliage(bx + 1.0, 8.4, bz + 0.4, 2.0, 1.6, 1.6, 220, PALETTE.leaf);
  foliage(bx - 2.6, 7.6, bz - 0.4, 1.5, 1.3, 1.3, 130, PALETTE.leaf);
  foliage(bx + 0.2, 6.6, bz + 0.2, 1.8, 1.0, 1.4, 120, PALETTE.leaf);
  // 樹下灌木，接住地面
  foliage(bx, 0.9, bz, 1.2, 0.7, 0.9, 70, PALETTE.leaf, [0.3, 0.55]);

  // 右側紅葉楓
  const mx = 9.2, mz = -1.6;
  const tr = cyl(mx, g, mz, 0.3, 5.4, PALETTE.trunk, 6, 0.18);
  tr.rotation.z = 0.08;
  for (const [rz, ry, len] of [[0.7, 0, 2.6], [-0.6, 0.5, 2.4], [0.3, 2.2, 2.2], [-0.9, -1.2, 2.0]]) {
    const b = cyl(mx, 4.0, mz, 0.08, len, PALETTE.trunk, 5, 0.05);
    b.rotation.set(0, ry, rz);
  }
  // 楓樹冠：幾層扁平的葉片，往兩側攤開
  foliage(mx - 0.2, 7.6, mz, 2.6, 0.9, 2.2, 320, PALETTE.maple);
  foliage(mx - 0.6, 6.6, mz + 0.3, 3.6, 0.8, 2.6, 380, PALETTE.maple);
  foliage(mx - 2.6, 5.7, mz + 0.6, 1.6, 0.6, 1.5, 120, PALETTE.maple);
  foliage(mx + 1.8, 5.8, mz + 0.4, 1.4, 0.6, 1.4, 100, PALETTE.maple);
  foliage(mx, 8.4, mz - 0.3, 1.5, 0.6, 1.3, 90, PALETTE.maple);

  // 牆上爬藤：左上角沿屋頂與牆面垂下
  for (let i = 0; i < 260; i++) {
    const t = rand();
    const x = -4.4 + t * 3.2;
    const yTop = 8.2 + (1 - Math.abs(x - 0.2) / 4.4) * 2.5;
    const y = yTop - rr(0, 1) ** 2 * 3.2;
    const s = rr(0.2, 0.42);
    cubes.add(x, y, F2 + rr(0.0, 0.25), s, s, s * 0.6, pick(PALETTE.leaf));
  }
  // 屋簷上的藤與盆
  for (let i = 0; i < 110; i++) {
    const x = rr(-5.3, 0.5);
    const s = rr(0.2, 0.45);
    cubes.add(x, 4.6 + rr(-0.6, 0.3), F + rr(-0.4, 1.0), s, s, s, pick(PALETTE.leaf));
  }
  for (let x = -1.2; x < 4.2; x += 0.6) flowerPot(x, 4.45, F2 + 0.45, 0.2, 0.28);
  // 右前角爬藤
  foliage(5.1, 3.0, 1.2, 0.35, 2.4, 0.4, 70, PALETTE.leaf, [0.2, 0.4]);
  foliage(4.8, 6.0, 0.7, 0.3, 1.6, 0.3, 40, PALETTE.leaf, [0.2, 0.4]);
  // 牆左一樓爬藤
  foliage(-5.1, 2.6, 0.6, 0.35, 2.0, 0.9, 90, PALETTE.leaf, [0.2, 0.45]);

  // ---- 門前：花架與大量盆花 ----
  // 左花架（兩層）
  const shelf = (x0, z0, w, d, levels) => {
    for (let l = 0; l < levels; l++) {
      const y = g + 0.45 + l * 0.65;
      const zz = z0 - l * 0.35;
      box(x0, y, zz, w, 0.08, d, PALETTE.woodLight);
      for (let x = x0 + 0.3; x < x0 + w - 0.1; x += 0.5) flowerPot(x, y + 0.08, zz + d / 2 + rr(-0.1, 0.1), 0.2, 0.28);
    }
    for (const dx of [0, w - 0.08]) box(x0 + dx, g, z0, 0.08, 0.45 + (levels - 1) * 0.65, 0.08, PALETTE.wood);
  };
  shelf(-4.6, 2.0, 2.6, 0.6, 3);
  shelf(1.9, 2.0, 2.0, 0.6, 2);
  // 右側花台桌
  box(4.5, g + 0.75, 2.4, 1.2, 0.08, 0.8, PALETTE.woodLight);
  for (const [dx, dz] of [[0, 0], [1.1, 0], [0, 0.7], [1.1, 0.7]]) box(4.5 + dx, g, 2.4 + dz, 0.08, 0.75, 0.08, PALETTE.wood);
  flowerPot(4.8, g + 0.83, 2.8, 0.25, 0.35);
  flowerPot(5.4, g + 0.83, 2.8, 0.25, 0.35);

  // 地上的盆花：避開門前石階
  for (let i = 0; i < 70; i++) {
    const x = rr(-10.5, 6.5);
    const z = rr(2.0, 4.0);
    if (x > -2.0 && x < 2.0) continue;
    if (x > -3.6 && x < -2.6 && z > 3.0) continue; // 黑板
    if (x > 3.1 && x < 4.1 && z > 3.2) continue;
    flowerPot(x, g, z, rr(0.22, 0.42), rr(0.3, 0.6));
  }
  // 地植花叢
  for (let i = 0; i < 14; i++) flowerBush(rr(-10.5, -5.5), g, rr(1.5, 3.8), rr(0.4, 0.7), 22);
  for (let i = 0; i < 8; i++) flowerBush(rr(4.5, 8.6), g, rr(1.6, 3.8), rr(0.35, 0.6), 18);
  // 販賣機旁的竹葉 / 草叢
  foliage(9.4, 1.4, 0.0, 0.9, 1.2, 0.8, 70, PALETTE.leaf, [0.25, 0.5]);
  // 大型觀葉盆栽（門右）
  flowerPot(2.3, g, 3.5, 0.45, 0.6, PALETTE.potGray);
  foliage(2.3, g + 1.3, 3.5, 0.6, 0.7, 0.6, 30, PALETTE.leaf, [0.25, 0.4]);
}
