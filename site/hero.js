// 首頁 hero 的小島：賽璐璐著色 + inverted hull 描邊的迷你花店，可以拖曳旋轉
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const C = {
  dirt: 0xa8703e, grass: 0x8fb05a, grassDark: 0x6e9a3e, wall: 0xf3ead8, roof: 0xd0643a,
  awning: 0x3e7a6a, door: 0x2e4a3e, wood: 0x7a4a2e, leaf: 0x5a8a36, leaf2: 0x7aa84a,
  stone: 0xd8d0c0, ink: 0x2c2a26, glow: 0xffd28a, maple: 0xe07a3e,
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

// 描邊：BackSide 外殼沿法線外推
const outlineMat = new THREE.ShaderMaterial({
  uniforms: { width: { value: 0.035 }, color: { value: new THREE.Color(C.ink) } },
  vertexShader: `
    uniform float width;
    void main() {
      vec3 p = position + normalize(normal) * width;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }`,
  side: THREE.BackSide,
});

function part(geo, color, x, y, z, { outline = true, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? toon(color) : color);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (outline) m.add(new THREE.Mesh(geo, outlineMat));
  return m;
}

function buildIsland() {
  const g = new THREE.Group();

  // 底座：土層 + 草地
  g.add(part(new RoundedBoxGeometry(6, 1, 6, 3, 0.3), C.dirt, 0, -0.5, 0));
  g.add(part(new RoundedBoxGeometry(6.04, 0.3, 6.04, 3, 0.14), C.grass, 0, 0.02, 0));

  // 石板小路
  const stone = new THREE.CylinderGeometry(0.26, 0.28, 0.08, 7);
  [[0.2, 1.2], [0.55, 1.75], [0.25, 2.35], [0.65, 2.75]].forEach(([x, z], i) => {
    const s = part(stone, C.stone, x, 0.19, z, { outline: false });
    s.rotation.y = i;
    g.add(s);
  });

  // 小花店：牆、屋頂、門、窗、遮雨棚
  const shop = new THREE.Group();
  shop.position.set(-0.4, 0.17, -0.5);
  shop.add(part(new RoundedBoxGeometry(2.6, 1.9, 2.2, 2, 0.06), C.wall, 0, 0.95, 0));
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.55, 0); roofShape.lineTo(0, 1.05); roofShape.lineTo(1.55, 0); roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 2.5, bevelEnabled: false });
  roofGeo.translate(0, 0, -1.25);
  shop.add(part(roofGeo, C.roof, 0, 1.88, 0));
  shop.add(part(new THREE.BoxGeometry(0.62, 1.05, 0.08), C.door, -0.55, 0.53, 1.11));
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.06), new THREE.MeshBasicMaterial({ color: C.glow }));
  win.position.set(0.55, 0.9, 1.11);
  win.add(new THREE.Mesh(win.geometry, outlineMat));
  shop.add(win);
  const awning = part(new THREE.BoxGeometry(2.4, 0.07, 0.62), C.awning, 0, 1.52, 1.35);
  awning.rotation.x = 0.42;
  shop.add(awning);
  // 招牌
  const sign = part(new THREE.BoxGeometry(0.9, 0.3, 0.05), C.wood, 0.55, 1.95 - 0.2, 1.16);
  shop.add(sign);
  g.add(shop);

  // 樹：樹幹 + 幾顆二十面體樹冠
  const tree = (x, z, s, leaf) => {
    const t = new THREE.Group();
    t.position.set(x, 0.17, z);
    t.add(part(new THREE.CylinderGeometry(0.1 * s, 0.15 * s, 1.2 * s, 6), C.wood, 0, 0.6 * s, 0));
    const blob = new THREE.IcosahedronGeometry(0.62 * s, 0);
    [[0, 1.45, 0, 1], [0.35, 1.2, 0.2, 0.75], [-0.3, 1.25, -0.15, 0.8], [0.05, 1.85, -0.05, 0.7]].forEach(([bx, by, bz, k], i) => {
      const b = part(blob, i % 2 ? leaf[1] : leaf[0], bx * s, by * s, bz * s);
      b.scale.setScalar(k);
      b.rotation.set(i, i * 2, 0);
      t.add(b);
    });
    return t;
  };
  g.add(tree(1.85, -1.6, 1.15, [C.leaf, C.leaf2]));
  g.add(tree(-2.3, 1.7, 0.75, [C.maple, 0xf09a52]));

  // 花叢：一顆顆小球，用 InstancedMesh
  const flowerColors = [0xf2a0b4, 0xffe08a, 0xffffff, 0xc89ae0, 0xf27a5a];
  const fGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const bushGeo = new THREE.IcosahedronGeometry(0.34, 0);
  const rnd = mulberry(7);
  const bushes = [[-1.9, 0.75], [1.35, 0.85], [2.2, 0.2], [-1.5, -2.1], [2.3, 2.1], [1.4, 2.3]];
  const fl = new THREE.InstancedMesh(fGeo, new THREE.MeshToonMaterial({ gradientMap: GRAD }), bushes.length * 9);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  let n = 0;
  for (const [x, z] of bushes) {
    const b = part(bushGeo, rnd() > 0.5 ? C.leaf2 : C.grassDark, x, 0.42, z);
    b.scale.set(1.25, 0.85, 1.15);
    g.add(b);
    for (let k = 0; k < 9; k++) {
      const a = rnd() * Math.PI * 2, r = 0.2 + rnd() * 0.22;
      m4.makeTranslation(x + Math.cos(a) * r, 0.5 + rnd() * 0.22, z + Math.sin(a) * r);
      fl.setMatrixAt(n, m4);
      fl.setColorAt(n, col.setHex(flowerColors[(k + Math.floor(x * 3)) % flowerColors.length]));
      n++;
    }
  }
  fl.castShadow = true;
  g.add(fl);

  // 店門口的盆花
  const pot = new THREE.CylinderGeometry(0.17, 0.12, 0.26, 8);
  [[-1.35, 0.95], [0.75, 0.95], [1.05, 1.05]].forEach(([x, z], i) => {
    g.add(part(pot, 0xc0703e, x, 0.32, z));
    const top = part(new THREE.IcosahedronGeometry(0.2, 0), flowerColors[i], x, 0.55, z);
    g.add(top);
  });

  return g;
}

// 固定種子的亂數，讓每次花叢都一樣
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  camera.position.set(14, 11, 14);
  camera.lookAt(0, 0.7, 0);

  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xb8c8a0, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
  sun.position.set(-6, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const island = buildIsland();
  scene.add(island);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    const half = 4.6, a = w / h;
    Object.assign(camera, { left: -half * a, right: half * a, top: half, bottom: -half });
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // 拖曳水平旋轉；放開後慢慢回到自動旋轉
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rotY = -0.35, vel = 0, dragging = false, lastX = 0, idle = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    rotY += dx * 0.01; vel = dx * 0.01; idle = 0;
  });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    const t = clock.elapsedTime;
    if (!dragging) {
      vel *= 0.92;
      idle += dt;
      const auto = reduce ? 0 : 0.12 * Math.min(1, Math.max(0, idle - 1.5));
      rotY += vel + auto * dt;
    }
    island.rotation.y = rotY;
    island.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.08;
    renderer.render(scene, camera);
  });
}
