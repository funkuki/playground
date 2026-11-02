import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, POOL, BASE, WATER_Y, mat, gradient, paintify, strataTex, rng, cutPlanes } from './paint.js';

// 靜態場景：底座剖面、泳池、水、玻璃切面、扶手梯、陽傘、棕櫚、躺椅、水桶玩具

function add(parent, geo, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

// ---------- 材質 ----------
const deckMat = paintify(new THREE.MeshToonMaterial({ color: PAL.deck, gradientMap: gradient }), { stroke: 0.45, scale: 0.22 });
const sectionMat = new THREE.MeshToonMaterial({ color: 0xffffff, map: strataTex, gradientMap: gradient, side: THREE.DoubleSide });
const soilMat = new THREE.MeshToonMaterial({ color: 0xd8ab84, gradientMap: gradient, side: THREE.DoubleSide });
const tileMat = paintify(new THREE.MeshToonMaterial({ color: PAL.tile, gradientMap: gradient }), { stroke: 0.12, scale: 0.5, caustics: 0.22 });
const floorMat = paintify(new THREE.MeshToonMaterial({ color: PAL.floor, gradientMap: gradient }), { stroke: 0.1, scale: 0.4, caustics: 0.4 });
const stepMat = paintify(new THREE.MeshToonMaterial({ color: PAL.step, gradientMap: gradient }), { stroke: 0.06, scale: 0.4, caustics: 0.3 });
const plinthMat = new THREE.MeshToonMaterial({ color: PAL.plinth, gradientMap: gradient });
for (const m of [deckMat, sectionMat, soilMat, tileMat, floorMat, stepMat, plinthMat]) m.clippingPlanes = cutPlanes;

// 一塊土：上面是石板地面，外側是剖面，朝泳池那面貼磁磚
// faces: [px, nx, py, ny, pz, nz] 各面的材質
function block(parent, x0, x1, y0, y1, z0, z1, faces) {
  const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  return add(parent, geo, faces, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

export function buildScene(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const { x0, x1, z0, z1, floor } = POOL;
  const B = BASE;
  const S = sectionMat, D = deckMat, T = tileMat;

  // ---------- 底座：四塊土圍出泳池 ----------
  block(root, B.x0, B.x1, B.bottom, 0, B.z0, z0, [S, S, D, S, T, S]); // 後（上緣）
  block(root, B.x0, B.x1, B.bottom, 0, z1, B.z1, [S, S, D, S, S, T]); // 前（下緣）
  block(root, B.x0, x0, B.bottom, 0, z0, z1, [T, S, D, S, S, S]); // 左
  block(root, x1, B.x1, B.bottom, 0, z0, z1, [S, T, D, S, S, S]); // 右
  // 池底不接陰影：浮具投到兩公尺深的影子從上面看太搶戲
block(root, x0, x1, B.bottom, floor, z0, z1, [soilMat, soilMat, floorMat, soilMat, soilMat, soilMat]).receiveShadow = false; // 池底
  // 台座
  add(root, new RoundedBoxGeometry(B.x1 - B.x0 + 0.5, 0.36, B.z1 - B.z0 + 0.5, 3, 0.06), plinthMat, 0, B.bottom - 0.18, 0);

  // ---------- 左上角入水階梯：四階往 +x 變深 ----------
  const stepW = 0.48, stepD = 2.5;
  [-0.5, -0.92, -1.34, -1.76].forEach((top, i) => {
    const sx = x0 + i * stepW;
    // 越淺越亮，俯看時才分得出一階一階
    const sm = stepMat.clone();
    sm.color.lerp(new THREE.Color(PAL.floor), i * 0.22);
    sm.onBeforeCompile = stepMat.onBeforeCompile;
    sm.customProgramCacheKey = stepMat.customProgramCacheKey;
    sm.clippingPlanes = cutPlanes;
    block(root, sx, sx + stepW, floor, top, z0, z0 + stepD, [sm, sm, sm, sm, sm, sm]).receiveShadow = false;
  });

  // ---------- 水 ----------
  const W = x1 - x0, Dz = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const surfGeo = new THREE.PlaneGeometry(W, Dz, 160, 85);
  surfGeo.rotateX(-Math.PI / 2);
  const surfMat = paintify(
    new THREE.MeshToonMaterial({ color: PAL.water, gradientMap: gradient, transparent: true, opacity: 0.74, side: THREE.DoubleSide, depthWrite: false }),
    { stroke: 0.85, scale: 0.26, wave: true, band: true, flecks: true },
  );
  const surface = add(root, surfGeo, surfMat, cx, WATER_Y, cz, { cast: false });
  surface.renderOrder = 2;

  // 水體：從側面看是半透明的藍綠體積（頂面和底面不畫）
  const m = 0.012;
  const volMat = new THREE.MeshBasicMaterial({ color: 0x4fb3ae, transparent: true, opacity: 0.22, depthWrite: false });
  const hide = new THREE.MeshBasicMaterial({ visible: false });
  const vol = add(root, new THREE.BoxGeometry(W - 2 * m, WATER_Y - floor, Dz - 2 * m), [volMat, volMat, hide, hide, volMat, volMat], cx, (WATER_Y + floor) / 2, cz, { cast: false, receive: false });
  vol.renderOrder = 1;

  // ---------- 玻璃切面：四面池壁各一片，靠近鏡頭的那面才顯示 ----------
  const glass = [];
  const sides = [
    { n: new THREE.Vector3(1, 0, 0), pos: x1, len: Dz, c: cz },
    { n: new THREE.Vector3(-1, 0, 0), pos: -x0, len: Dz, c: cz },
    { n: new THREE.Vector3(0, 0, 1), pos: z1, len: W, c: cx },
    { n: new THREE.Vector3(0, 0, -1), pos: -z0, len: W, c: cx },
  ];
  for (const s of sides) {
    const g = new THREE.Group();
    const H = -floor;
    const paneMat = new THREE.MeshBasicMaterial({ color: 0xe8fbf8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x1f8a86, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(s.len, H), paneMat);
    pane.position.y = -H / 2;
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(s.len, 0.035), lineMat);
    wl.position.set(0, WATER_Y, 0.004);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(s.len, H)), edgeMat);
    edges.position.y = -H / 2;
    g.add(pane, wl, edges);
    // 平面預設朝 +z，轉到池壁外法線方向
    g.rotation.y = Math.atan2(s.n.x, s.n.z);
    g.position.copy(s.n).multiplyScalar(s.pos + 0.003);
    if (s.n.x) g.position.z = s.c; else g.position.x = s.c;
    g.renderOrder = 3;
    g.traverse((o) => (o.renderOrder = 3));
    root.add(g);
    // 剖面封口：切面還沒到池壁時，用地層剖面蓋住被切開的土塊
    const cap = new THREE.Group();
    const span = s.n.x ? B.z1 - B.z0 : B.x1 - B.x0;
    const earth = new THREE.Mesh(new THREE.PlaneGeometry(span, -B.bottom), sectionMat);
    earth.position.y = B.bottom / 2;
    const base = new THREE.Mesh(new THREE.PlaneGeometry(span + 0.5, 0.36), plinthMat);
    base.position.y = B.bottom - 0.18;
    cap.add(earth, base);
    cap.rotation.y = g.rotation.y;
    cap.visible = false;
    root.add(cap);
    glass.push({ ...s, group: g, cap, w: 0, target: 0, mats: [paneMat, lineMat, edgeMat], peak: [0.16, 0.85, 0.9] });
  }

  // 池畔道具：切面經過時整個藏起來，不留碎片
  const props = [];
  const prop = (x, z, build) => {
    const g = new THREE.Group();
    root.add(g);
    build(g);
    props.push({ obj: g, p: new THREE.Vector3(x, 0, z) });
  };
  ladder(root);
  prop(-8.3, 4.6, (g) => umbrella(g, -8.3, 4.6));
  prop(-9.5, -5.45, (g) => umbrella(g, -9.5, -5.45));
  prop(9.75, 5.3, (g) => palm(g, 9.75, 5.3, 1.1, [-0.1, 0.05], 23));
  prop(9.4, 0.85, lounger);
  prop(8.85, -0.5, toys);

  return { glass, props, surface };
}

// ---------- 右上角不鏽鋼扶手梯 ----------
function ladder(root) {
  const metal = mat(PAL.metal);
  const z = POOL.z0;
  for (const x of [5.82, 6.28]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0, z - 0.42),
      new THREE.Vector3(x, 0.42, z - 0.36),
      new THREE.Vector3(x, 0.6, z - 0.1),
      new THREE.Vector3(x, 0.4, z + 0.12),
      new THREE.Vector3(x, 0.0, z + 0.14),
      new THREE.Vector3(x, -1.4, z + 0.14),
    ]);
    add(root, new THREE.TubeGeometry(curve, 48, 0.035, 8), metal);
    add(root, new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), metal, x, 0.01, z - 0.42);
  }
  for (const y of [-0.5, -0.9, -1.3]) add(root, new THREE.BoxGeometry(0.46, 0.03, 0.12), metal, 6.05, y, z + 0.16);
}

// ---------- 左下角陽傘 ----------
function umbrella(root, x, z) {
  const H = 2.4;
  add(root, new THREE.CylinderGeometry(0.035, 0.035, H, 8), mat(0xe8e0d0), x, H / 2, z);
  add(root, new THREE.CylinderGeometry(0.3, 0.34, 0.12, 16), mat(0xbfb3a0), x, 0.06, z);
  const canopy = new THREE.ConeGeometry(1.45, 0.42, 8, 1, true);
  const cm = new THREE.MeshToonMaterial({ color: PAL.umbrella, gradientMap: gradient, flatShading: true, side: THREE.DoubleSide });
  add(root, canopy, cm, x, H + 0.22, z).rotation.y = 0.2;
  add(root, new THREE.SphereGeometry(0.07, 12, 8), mat(0x9a948a), x, H + 0.46, z);
}

// ---------- 棕櫚：彎曲樹幹 + 羽狀葉 ----------
function frondGeo(len, rnd) {
  const pos = [];
  const N = 22;
  const droop = 0.55 + rnd() * 0.3;
  const P = (s) => new THREE.Vector3(0, 0.5 * s * len - droop * s * s * len, s * len);
  for (let i = 0; i < N; i++) {
    const s = i / N, s2 = (i + 1) / N;
    const a = P(s), b = P(s2);
    const L = 0.55 * Math.sin(Math.PI * Math.min(1, s * 1.15 + 0.05)) * (0.8 + rnd() * 0.3);
    for (const side of [-1, 1]) {
      const tip = a.clone().add(new THREE.Vector3(side * L, -0.18 * L, 0.32 * L));
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function palm(root, x, z, H, lean, seed) {
  const rnd = rng(seed);
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, 0, z),
    new THREE.Vector3(x + lean[0] * 0.4, H * 0.5, z + lean[1] * 0.4),
    new THREE.Vector3(x + lean[0], H, z + lean[1]),
  ]);
  add(root, new THREE.TubeGeometry(trunk, 12, 0.13, 8), mat(PAL.trunk));
  const top = trunk.getPoint(1);
  const leafMats = [PAL.palm, PAL.palmLight].map((c) => new THREE.MeshToonMaterial({ color: c, gradientMap: gradient, side: THREE.DoubleSide }));
  const n = 15;
  for (let i = 0; i < n; i++) {
    const f = add(root, frondGeo(1.5 + rnd() * 0.7, rnd), leafMats[i % 2], top.x, top.y, top.z);
    f.rotation.order = 'YXZ';
    f.rotation.y = (i / n) * Math.PI * 2 + rnd() * 0.3;
    f.rotation.x = -0.1 + rnd() * 0.35;
  }
}

// ---------- 右側白色躺椅 ----------
function lounger(root) {
  const g = new THREE.Group();
  g.position.set(9.4, 0, 0.85);
  root.add(g);
  const frame = mat(PAL.chairFrame), cush = mat(PAL.chair);
  for (const [lx, lz] of [[-0.8, -0.45], [-0.8, 0.45], [0.75, -0.45], [0.75, 0.45]]) add(g, new THREE.BoxGeometry(0.06, 0.24, 0.06), frame, lx, 0.12, lz);
  add(g, new RoundedBoxGeometry(1.75, 0.08, 1.02, 2, 0.03), frame, 0, 0.26, 0);
  add(g, new RoundedBoxGeometry(1.15, 0.12, 0.96, 3, 0.05), cush, -0.3, 0.36, 0);
  const back = add(g, new RoundedBoxGeometry(0.8, 0.12, 0.96, 3, 0.05), cush, 0.55, 0.55, 0);
  back.rotation.z = 0.6;
}

// ---------- 水桶和玩具 ----------
function bucket(root, x, z, color, r = 0.15, h = 0.26) {
  add(root, new THREE.CylinderGeometry(r, r * 0.82, h, 18), mat(color), x, h / 2, z);
  const inner = new THREE.Color(color).multiplyScalar(0.7);
  add(root, new THREE.CircleGeometry(r * 0.9, 18).rotateX(-Math.PI / 2), mat(inner.getHex()), x, h + 0.002, z);
}
function toys(root) {
  bucket(root, 8.68, -0.66, PAL.bucketBlue);
  bucket(root, 8.95, -0.82, PAL.bucketYellow, 0.13, 0.24);
  add(root, new RoundedBoxGeometry(0.11, 0.11, 0.11, 2, 0.02), mat(PAL.toyOrange), 8.98, 0.055, -0.46).rotation.y = 0.5;
  // 噴水瓶
  const b = new THREE.Group();
  b.position.set(8.82, 0, -0.08);
  b.rotation.set(0, 0.4, Math.PI / 2);
  root.add(b);
  add(b, new THREE.CapsuleGeometry(0.075, 0.14, 4, 12), mat(PAL.toyRed), 0.08, 0, 0);
  add(b, new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), mat(0xf6f0e6), 0.08, 0.15, 0);
  add(root, new THREE.SphereGeometry(0.03, 8, 6), mat(PAL.toyRed), 9.05, 0.03, 0.1);
}
