// 首頁 hero：春男（Haruo，愚人牌造型）在圓角方塊小星球上散步。賽璐璐著色 + inverted hull 描邊，可以拖曳翻動星球
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const C = {
  grass: 0x8fb05a, grassDark: 0x6e9a3e, wall: 0xf3ead8, roof: 0xd0643a, roof2: 0x6b5c8e,
  door: 0x2e4a3e, wood: 0x7a4a2e, leaf: 0x5a8a36, leaf2: 0x7aa84a, pine: 0x3e7a5a,
  stone: 0xd8d0c0, ink: 0x2c2a26, glow: 0xffd28a, maple: 0xe07a3e, water: 0x8ccbe0,
  cap: 0xe0564a, // 春男
  fur: 0x7fa7dc, eye: 0x1e1c22,
};

function gradientMap() {
  const data = new Uint8Array([120, 195, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
const GRAD = gradientMap();
const mats = new Map();
const toon = (color) => {
  if (!mats.has(color)) mats.set(color, new THREE.MeshToonMaterial({ color, gradientMap: GRAD }));
  return mats.get(color);
};

// 描邊：BackSide 外殼沿法線外推，依粗細快取
const outlines = new Map();
function outlineMat(width = 0.035) {
  if (!outlines.has(width)) {
    outlines.set(width, new THREE.ShaderMaterial({
      uniforms: { width: { value: width }, color: { value: new THREE.Color(C.ink) } },
      vertexShader: `
        uniform float width;
        void main() {
          vec3 p = position + normalize(normal) * width;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }`,
      side: THREE.BackSide,
    }));
  }
  return outlines.get(width);
}

function part(geo, color, x, y, z, { outline = true, shadow = true, ow = 0.035 } = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? toon(color) : color);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (outline) m.add(new THREE.Mesh(geo, outlineMat(ow)));
  return m;
}

// 固定種子的亂數，讓每次擺設都一樣
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry(11);

// ---------- 星球上的小東西：原點在底部、+y 朝外 ----------
const OW = 0.022; // 小物件用細一點的描邊
const sm = (geo, color, x, y, z) => part(geo, color, x, y, z, { ow: OW });

function tree(s, leaf) {
  const t = new THREE.Group();
  t.add(sm(new THREE.CylinderGeometry(0.1 * s, 0.15 * s, 1.2 * s, 6), C.wood, 0, 0.6 * s, 0));
  const blob = new THREE.IcosahedronGeometry(0.62 * s, 0);
  [[0, 1.45, 0, 1], [0.35, 1.2, 0.2, 0.75], [-0.3, 1.25, -0.15, 0.8], [0.05, 1.85, -0.05, 0.7]].forEach(([bx, by, bz, k], i) => {
    const b = sm(blob, i % 2 ? leaf[1] : leaf[0], bx * s, by * s, bz * s);
    b.scale.setScalar(k);
    b.rotation.set(i, i * 2, 0);
    t.add(b);
  });
  return t;
}

function pine(s) {
  const t = new THREE.Group();
  t.add(sm(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.4 * s, 6), C.wood, 0, 0.2 * s, 0));
  [[0.42, 0.5, 0.35], [0.33, 0.45, 0.62], [0.22, 0.38, 0.86]].forEach(([r, h, y]) => {
    t.add(sm(new THREE.ConeGeometry(r * s, h * s, 7), C.pine, 0, y * s, 0));
  });
  return t;
}

function house(roofColor) {
  const g = new THREE.Group();
  g.add(sm(new RoundedBoxGeometry(0.5, 0.4, 0.44, 2, 0.04), C.wall, 0, 0.2, 0));
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, 0); shape.lineTo(0, 0.26); shape.lineTo(0.32, 0); shape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.52, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.26);
  g.add(sm(roofGeo, roofColor, 0, 0.39, 0));
  g.add(part(new THREE.BoxGeometry(0.13, 0.22, 0.03), C.door, -0.1, 0.11, 0.22, { outline: false }));
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.11, 0.03), new THREE.MeshBasicMaterial({ color: C.glow }));
  win.position.set(0.11, 0.22, 0.22);
  g.add(win);
  g.add(sm(new THREE.BoxGeometry(0.07, 0.14, 0.07), C.wood, 0.17, 0.55, -0.08)); // 煙囪
  return g;
}

function rock(s) {
  const g = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(0.16 * s, 0);
  const a = sm(geo, C.stone, 0, 0.08 * s, 0);
  a.scale.set(1.3, 0.8, 1);
  const b = sm(geo, C.stone, 0.18 * s, 0.05 * s, 0.1 * s);
  b.scale.setScalar(0.55);
  g.add(a, b);
  return g;
}

const FLOWERS = [0xf2a0b4, 0xffe08a, 0xffffff, 0xc89ae0, 0xf27a5a];
function bush() {
  const g = new THREE.Group();
  const b = sm(new THREE.IcosahedronGeometry(0.2, 0), rnd() > 0.5 ? C.leaf2 : C.grassDark, 0, 0.13, 0);
  b.scale.set(1.25, 0.85, 1.15);
  g.add(b);
  const fGeo = new THREE.IcosahedronGeometry(0.055, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rnd(), r = 0.12 + rnd() * 0.1;
    g.add(part(fGeo, FLOWERS[k % FLOWERS.length], Math.cos(a) * r, 0.2 + rnd() * 0.1, Math.sin(a) * r, { outline: false }));
  }
  return g;
}

function mushrooms() {
  const g = new THREE.Group();
  [[0, 0, 1], [0.15, 0.08, 0.7], [-0.1, 0.12, 0.6]].forEach(([x, z, s]) => {
    g.add(sm(new THREE.CylinderGeometry(0.04 * s, 0.05 * s, 0.14 * s, 8), C.wall, x, 0.07 * s, z));
    const cap = sm(new THREE.SphereGeometry(0.11 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), C.cap, x, 0.13 * s, z);
    g.add(cap);
    const dot = new THREE.SphereGeometry(0.018 * s, 6, 4);
    [[0.05, 0.08, 0.04], [-0.05, 0.08, -0.03], [0, 0.1, -0.06]].forEach(([dx, dy, dz]) => {
      g.add(part(dot, C.wall, x + dx * s, 0.13 * s + dy * s * 0.9, z + dz * s, { outline: false, shadow: false }));
    });
  });
  return g;
}

function pond() {
  const g = new THREE.Group();
  const rim = part(new THREE.CylinderGeometry(0.34, 0.36, 0.04, 20), C.stone, 0, 0.01, 0, { ow: OW });
  rim.scale.z = 0.8;
  const water = part(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), C.water, 0, 0.025, 0, { outline: false, shadow: false });
  water.scale.z = 0.8;
  g.add(rim, water);
  return g;
}

// ---------- 小星球 ----------
const HALF = 1.6, RAD = 0.5, FLAT = HALF - RAD; // 半邊長、圓角半徑、平面區的半寬
const ARC = (Math.PI / 2) * RAD;
const SEG = 2 * FLAT + ARC; // 從一面中心走到下一面中心的距離

// 六個面：法線 n、面上的軸 u（v = n × u）
const FACES = [
  [[0, 1, 0], [1, 0, 0]], [[0, -1, 0], [1, 0, 0]], [[1, 0, 0], [0, 0, 1]],
  [[-1, 0, 0], [0, 0, 1]], [[0, 0, 1], [0, 1, 0]], [[0, 0, -1], [0, 1, 0]],
].map(([n, u]) => {
  const N = new THREE.Vector3(...n), U = new THREE.Vector3(...u);
  return { n: N, u: U, v: new THREE.Vector3().crossVectors(N, U) };
});

// 擺設避開每一面的十字中線，那是春男走的路
const LAYOUT = [
  [[0.8, -0.78, () => house(C.roof)], [-0.8, 0.78, () => tree(0.42, [C.leaf, C.leaf2])], [0.78, 0.8, bush]],
  [[-0.78, -0.8, () => pine(1)], [0.75, -0.72, () => rock(1)], [0.8, 0.78, mushrooms], [-0.78, 0.8, bush]],
  [[0.8, 0.8, () => tree(0.4, [C.maple, 0xf09a52])], [-0.72, -0.72, pond], [0.78, -0.8, () => rock(0.8)]],
  [[-0.8, 0.8, () => house(C.roof2)], [0.8, -0.8, () => pine(0.9)], [0.75, 0.78, bush]],
  [[0.8, -0.8, () => tree(0.4, [C.leaf2, C.leaf])], [-0.78, -0.75, bush], [-0.78, 0.8, mushrooms]],
  [[0.78, 0.78, () => pine(1.05)], [-0.8, -0.78, () => rock(1.1)], [0.8, -0.78, bush], [-0.72, 0.72, pond]],
];

const Y = new THREE.Vector3(0, 1, 0);
function placeOnFace(obj, f, a, b, lift = 0) {
  obj.position.copy(f.n).multiplyScalar(HALF + lift).addScaledVector(f.u, a).addScaledVector(f.v, b);
  obj.quaternion.setFromUnitVectors(Y, f.n);
  obj.rotateY(rnd() * Math.PI * 2);
  return obj;
}

function buildPlanet() {
  const g = new THREE.Group();
  g.add(part(new RoundedBoxGeometry(HALF * 2, HALF * 2, HALF * 2, 6, RAD), C.grass, 0, 0, 0));

  const tuftGeo = new THREE.ConeGeometry(0.035, 0.12, 4);
  const dotGeo = new THREE.IcosahedronGeometry(0.045, 0);
  FACES.forEach((f, i) => {
    const used = LAYOUT[i].map(([a, b, make]) => {
      g.add(placeOnFace(make(), f, a, b));
      return [a, b];
    });
    // 草叢和小花點綴：同樣離中線遠一點，也不疊在擺設上
    for (let k = 0; k < 14; k++) {
      const a = (rnd() > 0.5 ? 1 : -1) * (0.3 + rnd() * 0.78);
      const b = (rnd() > 0.5 ? 1 : -1) * (0.3 + rnd() * 0.78);
      if (used.some(([ua, ub]) => Math.hypot(a - ua, b - ub) < 0.42)) continue;
      const flower = k % 3 === 0;
      const m = new THREE.Mesh(flower ? dotGeo : tuftGeo, toon(flower ? FLOWERS[k % FLOWERS.length] : C.grassDark));
      g.add(placeOnFace(m, f, a, b, flower ? 0.03 : 0.05));
    }
  });
  return g;
}

// ---------- 春男：藍色的貓，愚人牌造型。原點在腳底，+y 朝上、+z 朝前 ----------
function buildHaruo() {
  const root = new THREE.Group();
  const body = new THREE.Group(); // 走路起伏
  root.add(body);
  const ow = 0.014;
  const P = (geo, color, x, y, z) => part(geo, color, x, y, z, { ow });

  // 腳：轉軸在髖關節
  const legGeo = new THREE.CapsuleGeometry(0.062, 0.07, 4, 10);
  legGeo.translate(0, -0.1, 0);
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.075, 0.2, 0);
    pivot.add(P(legGeo, C.fur, 0, 0, 0));
    root.add(pivot);
    return pivot;
  });

  // 身體和大頭
  const torso = P(new THREE.CapsuleGeometry(0.15, 0.1, 6, 14), C.fur, 0, 0.33, 0);
  torso.scale.z = 0.9;
  body.add(torso);
  const head = new THREE.Group();
  head.position.y = 0.72;
  body.add(head);
  const skull = P(new THREE.SphereGeometry(0.3, 24, 18), C.fur, 0, 0, 0);
  skull.scale.set(1.1, 0.92, 1);
  head.add(skull);
  const earGeo = new THREE.ConeGeometry(0.095, 0.17, 12);
  [-1, 1].forEach((side) => {
    const ear = P(earGeo, C.fur, side * 0.19, 0.23, 0);
    ear.rotation.z = -side * 0.45;
    head.add(ear);
  });
  const eyeGeo = new THREE.SphereGeometry(0.032, 10, 8);
  [-1, 1].forEach((side) => {
    head.add(part(eyeGeo, C.eye, side * 0.12, -0.01, 0.272, { outline: false, shadow: false }));
  });
  head.add(part(new THREE.SphereGeometry(0.014, 8, 6), C.eye, 0, -0.065, 0.288, { outline: false, shadow: false }));

  // 手：轉軸在肩膀
  const armGeo = new THREE.CapsuleGeometry(0.05, 0.09, 4, 10);
  armGeo.translate(0, -0.09, 0);
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.47, 0);
    pivot.rotation.z = side * 0.35;
    const arm = new THREE.Group(); // 前後擺
    arm.add(P(armGeo, C.fur, 0, 0, 0));
    pivot.add(arm);
    body.add(pivot);
    return arm;
  });

  // 愚人造型：一手拿小白花，一手扛著木棍，棍尾吊著橘色點點包袱
  arms[0].parent.rotation.x = -1.6; // 扛棍子的手舉在胸前
  const flower = new THREE.Group();
  flower.position.set(0, -0.16, 0.03);
  flower.rotation.x = 0.5;
  flower.add(part(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), C.leaf, 0, 0.15, 0, { outline: false }));
  const leafGeo = new THREE.SphereGeometry(0.035, 8, 6);
  const leaf = part(leafGeo, C.leaf2, 0.03, 0.12, 0, { outline: false });
  leaf.scale.set(1.4, 0.5, 0.8);
  leaf.rotation.z = 0.5;
  flower.add(leaf);
  const petal = new THREE.SphereGeometry(0.035, 8, 6);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    flower.add(part(petal, 0xfff6ee, Math.cos(a) * 0.04, 0.31, Math.sin(a) * 0.04, { ow }));
  }
  flower.add(part(new THREE.SphereGeometry(0.025, 8, 6), C.glow, 0, 0.33, 0, { outline: false }));
  arms[1].add(flower);

  const pack = new THREE.Group(); // 棍子和包袱，掛在身體上跟著起伏
  const a0 = new THREE.Vector3(-0.2, 0.44, 0.22), a1 = new THREE.Vector3(-0.24, 0.98, -0.36);
  const stickGeo = new THREE.CylinderGeometry(0.014, 0.014, a0.distanceTo(a1), 6);
  const stick = part(stickGeo, C.wood, 0, 0, 0, { ow });
  stick.position.copy(a0).add(a1).multiplyScalar(0.5);
  stick.quaternion.setFromUnitVectors(Y, a1.clone().sub(a0).normalize());
  pack.add(stick);
  const bundle = new THREE.Group();
  bundle.position.copy(a1);
  const sack = part(new THREE.SphereGeometry(0.12, 16, 12), 0xd9784a, 0, -0.1, 0, { ow });
  sack.scale.set(1, 1.1, 0.9);
  bundle.add(sack);
  bundle.add(part(new THREE.ConeGeometry(0.05, 0.08, 8), 0xd9784a, 0, 0.0, 0, { ow }));
  const dotGeo = new THREE.SphereGeometry(0.016, 6, 4);
  for (let k = 0; k < 9; k++) {
    const th = rnd() * Math.PI * 2, ph = 0.9 + rnd() * 1.4;
    const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    bundle.add(part(dotGeo, 0xfff3e6, d.x * 0.12, -0.1 + d.y * 0.132, d.z * 0.108, { outline: false, shadow: false }));
  }
  pack.add(bundle);
  body.add(pack);

  root.scale.setScalar(1.05);
  return { root, body, head, legs, arms, bundle };
}

// ---------- 走路路線：沿著面的十字中線，從一面中心翻過邊到下一面中心 ----------
// n：目前這面的法線，t：前進方向（另一面的法線）；s：已走距離
function pathAt(s, n, t, pos, nor, head) {
  if (s < FLAT) {
    pos.copy(n).multiplyScalar(HALF).addScaledVector(t, s);
    nor.copy(n); head.copy(t);
  } else if (s < FLAT + ARC) {
    const phi = (s - FLAT) / RAD;
    nor.copy(n).multiplyScalar(Math.cos(phi)).addScaledVector(t, Math.sin(phi));
    head.copy(n).multiplyScalar(-Math.sin(phi)).addScaledVector(t, Math.cos(phi));
    pos.copy(n).addScaledVector(t, 1).multiplyScalar(FLAT).addScaledVector(nor, RAD);
  } else {
    const s2 = s - FLAT - ARC;
    pos.copy(t).multiplyScalar(HALF).addScaledVector(n, FLAT - s2);
    nor.copy(t); head.copy(n).negate();
  }
}

export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  camera.position.set(0, 5.5, 13.5);
  camera.lookAt(0, 0.2, 0);

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xb8c8a0, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
  sun.position.set(-5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 1, far: 30 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // 地上淡淡的影子：放射漸層貼圖
  const sc = document.createElement('canvas');
  sc.width = sc.height = 128;
  const ctx = sc.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(60,50,30,0.22)');
  grd.addColorStop(1, 'rgba(60,50,30,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -3.1;
  scene.add(shadow);

  const pivot = new THREE.Group(); // 上下漂浮
  const planet = buildPlanet();
  pivot.add(planet);
  scene.add(pivot);
  const haruo = buildHaruo();
  planet.add(haruo.root);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    const half = 3.7, a = w / h;
    Object.assign(camera, { left: -half * a, right: half * a, top: half, bottom: -half });
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 春男的狀態：在哪一面、往哪走、走到哪
  const walk = {
    n: new THREE.Vector3(0, 1, 0), t: new THREE.Vector3(0, 0, 1), s: 0.3,
    mode: reduce ? 'still' : 'walk', timer: 0, from: new THREE.Vector3(), to: new THREE.Vector3(),
  };
  const pos = new THREE.Vector3(), nor = new THREE.Vector3(), head = new THREE.Vector3();
  const SPEED = 0.42;
  let phase = 0, jump = 0;

  function nextLeg() {
    // 到了下一面的中心：直走、左轉或右轉，偶爾停下來看看
    const face = walk.t.clone(), ahead = walk.n.clone().negate();
    const side = new THREE.Vector3().crossVectors(face, ahead);
    const r = rnd();
    walk.n.copy(face);
    walk.s = 0;
    walk.from.copy(ahead);
    walk.to.copy(r < 0.5 ? ahead : r < 0.75 ? side : side.negate());
    walk.mode = rnd() < 0.2 ? 'pause' : 'turn';
    walk.timer = 0;
  }

  // 讓星球慢慢轉到「春男在上方、往右走」的角度
  const upW = new THREE.Vector3(0, 1, 0.12).normalize();
  const dirW = new THREE.Vector3(1, 0, 0.95).normalize();
  dirW.addScaledVector(upW, -dirW.dot(upW)).normalize();
  const worldBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(upW, dirW), upW, dirW);
  const qWorld = new THREE.Quaternion().setFromRotationMatrix(worldBasis);
  const m4 = new THREE.Matrix4(), qT = new THREE.Quaternion();
  const upL = new THREE.Vector3(), dirL = new THREE.Vector3(), sideL = new THREE.Vector3();
  function followTarget() {
    upL.copy(pos).normalize().add(nor).normalize();
    dirL.copy(head).addScaledVector(upL, -head.dot(upL)).normalize();
    sideL.crossVectors(upL, dirL);
    qT.setFromRotationMatrix(m4.makeBasis(sideL, upL, dirL)).invert().premultiply(qWorld);
    return qT;
  }

  function placeHaruo(dt) {
    let amp = 0;
    if (walk.mode === 'walk') {
      walk.s += SPEED * dt;
      phase += SPEED * dt * (Math.PI * 2 / 0.42);
      amp = 1;
      if (walk.s >= SEG) nextLeg();
    } else if (walk.mode === 'turn' || walk.mode === 'pause') {
      walk.timer += dt;
      const dur = walk.mode === 'turn' ? 0.6 : 1.6;
      if (walk.mode === 'turn') { phase += dt * 9; amp = 0.5; }
      if (walk.timer >= dur) {
        if (walk.mode === 'pause') { walk.mode = 'turn'; walk.timer = 0; }
        else { walk.t.copy(walk.to); walk.mode = 'walk'; }
      }
    }
    pathAt(walk.s, walk.n, walk.mode === 'walk' || walk.mode === 'still' ? walk.t : walk.from, pos, nor, head);
    if (walk.mode === 'turn') {
      // 原地轉向：在 from 和 to 之間轉
      const k = THREE.MathUtils.smoothstep(walk.timer / 0.6, 0, 1);
      const ang = walk.from.angleTo(walk.to) * k;
      const axis = new THREE.Vector3().crossVectors(walk.from, walk.to);
      if (axis.lengthSq() > 1e-6) head.copy(walk.from).applyAxisAngle(axis.normalize(), ang);
      else head.copy(walk.from);
    }

    // 點一下春男會跳
    let hop = 0;
    if (jump > 0) {
      jump = Math.max(0, jump - dt);
      const k = 1 - jump / 0.55;
      hop = Math.sin(k * Math.PI) * 0.35;
    }
    const h = haruo.root;
    h.position.copy(pos).addScaledVector(nor, hop);
    h.quaternion.setFromRotationMatrix(m4.makeBasis(sideL.crossVectors(nor, head), nor, head));

    // 擺手、擺腳、身體起伏
    const sw = Math.sin(phase) * amp;
    haruo.legs[0].rotation.x = sw * 0.7;
    haruo.legs[1].rotation.x = -sw * 0.7;
    haruo.arms[0].rotation.x = -sw * 0.1;
    haruo.arms[1].rotation.x = sw * 0.65;
    haruo.body.position.y = (1 - Math.cos(phase * 2)) * 0.022 * amp;
    haruo.body.rotation.z = sw * 0.06;
    haruo.head.rotation.z = -sw * 0.05;
    haruo.bundle.rotation.x = -Math.abs(sw) * 0.25 - (hop > 0 ? 0.4 : 0);
    haruo.bundle.rotation.z = sw * 0.15;
  }

  // ---------- 拖曳翻動 ----------
  // 滑鼠：任意方向拖。觸控：canvas 是 pan-y，垂直滑動照常捲頁；水平起手才翻，之後上下左右都能轉
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, idle = 99;
  const vel = new THREE.Vector2();
  const qd = new THREE.Quaternion();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  function spin(rx, ry) {
    planet.quaternion.premultiply(qd.setFromAxisAngle(AY, ry));
    planet.quaternion.premultiply(qd.setFromAxisAngle(AX, rx));
  }
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY;
    vel.set(0, 0);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vel.set(dy * 0.008, dx * 0.008);
    spin(vel.x, vel.y);
    idle = 0;
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
      vel.set(0, 0);
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(haruo.root, true).length && jump === 0) jump = 0.55;
    }
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; vel.set(0, 0); });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  // 一開始就讓春男在正上方
  placeHaruo(0);
  planet.quaternion.copy(followTarget());

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    const t = clock.elapsedTime;
    placeHaruo(dt);
    if (!dragging) {
      idle += dt;
      vel.multiplyScalar(Math.pow(0.92, dt * 60));
      if (vel.lengthSq() > 1e-7) spin(vel.x, vel.y);
      // 放開一陣子後，慢慢轉回去跟著春男
      const follow = reduce ? 0 : THREE.MathUtils.clamp((idle - 2.2) / 1.5, 0, 1);
      if (follow > 0) planet.quaternion.slerp(followTarget(), 1 - Math.exp(-1.4 * follow * dt));
    }
    const bob = reduce ? 0 : Math.sin(t * 1.1) * 0.08;
    pivot.position.y = bob - 0.35;
    shadow.scale.setScalar(1 - bob * 0.6);
    renderer.render(scene, camera);
  });
}
