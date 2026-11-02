import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, gradient } from './scene.js';

// 會動的東西：門口的女學生、睡覺的三花貓、飛來飛去的麻雀
// 用球、膠囊、圓角方塊拼成圓潤造型；花紋畫在頂點顏色上，材質跟場景一樣是 Toon 3 階

const COLOR = {
  skin: 0xf2d0b8,
  blush: 0xeaa0a0,
  hair: 0x2b2226,
  shirt: 0xf3f1ea,
  navy: 0x2b3354,
  scarf: 0xc63a3e,
  sock: 0x2c2c3a,
  shoe: 0x2a2020,
  bag: 0x4a3020,
  catWhite: 0xf4f1ea,
  catOrange: 0xe08a3a,
  catBlack: 0x2a2624,
  catNose: 0xe89a9a,
  // 麻雀
  sBody: 0x8b6a4c,
  sBack: 0x5a4030,
  sBelly: 0xd9cdb4,
  sCap: 0x8a4e30,
  sCheek: 0xeee8dc,
  sDark: 0x2a2420,
  sWing: 0x7a5638,
  sWingBar: 0xc8b08a,
};

// ---------- 圓潤的基本形 ----------
const geoCache = new Map();
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
};
function addMesh(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
// 橢球：半徑 rx, ry, rz
function blob(parent, rx, ry, rz, color, x = 0, y = 0, z = 0) {
  const m = addMesh(parent, cached('sphere', () => new THREE.SphereGeometry(1, 20, 14)), mat(color), x, y, z);
  m.scale.set(rx, ry, rz);
  return m;
}
// 膠囊：直立，總長 = len + 2r
function capsule(parent, r, len, color, x = 0, y = 0, z = 0) {
  return addMesh(parent, cached(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 12)), mat(color), x, y, z);
}
function cone(parent, r, h, color, x = 0, y = 0, z = 0) {
  return addMesh(parent, cached(`cone${r}_${h}`, () => new THREE.ConeGeometry(r, h, 10)), mat(color), x, y, z);
}
function roundBox(parent, w, h, d, radius, color, x = 0, y = 0, z = 0) {
  return addMesh(parent, new RoundedBoxGeometry(w, h, d, 3, radius), mat(color), x, y, z);
}
// 頂點著色的橢球：paint(x, y, z) 拿單位球上的座標，回傳顏色
const vcMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient });
function paintedBlob(parent, rx, ry, rz, paint, x = 0, y = 0, z = 0, seg = [28, 20]) {
  const geo = new THREE.SphereGeometry(1, seg[0], seg[1]);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(paint(pos.getX(i), pos.getY(i), pos.getZ(i)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = addMesh(parent, geo, vcMat, x, y, z);
  m.scale.set(rx, ry, rz);
  return m;
}
const near = (x, y, z, cx, cy, cz, r) => (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 < r * r;

function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
const rr = (a, b) => a + (b - a) * Math.random();

// 貓的呼吸速率（弧度／秒）
export const CAT_BREATH_RATE = 2.1;

// ===================================================================
// 女學生（水手服），原點在腳底，正面朝 +z
function makeGirl() {
  const root = new THREE.Group();
  for (const sx of [-1, 1]) {
    blob(root, 0.075, 0.05, 0.13, COLOR.shoe, sx * 0.1, 0.05, 0.03);
    capsule(root, 0.06, 0.24, COLOR.sock, sx * 0.1, 0.24, 0);
    capsule(root, 0.052, 0.36, COLOR.skin, sx * 0.1, 0.6, 0);
  }
  // 百褶裙：上窄下寬，邊緣稍微做出摺痕
  const skirtGeo = new THREE.CylinderGeometry(0.2, 0.34, 0.4, 24, 1);
  const sp = skirtGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const a = Math.atan2(sp.getZ(i), sp.getX(i));
    const k = 1 + 0.04 * Math.sign(Math.sin(a * 12)) * (0.5 - sp.getY(i) / 0.4 + 0.5) * 0.5;
    sp.setX(i, sp.getX(i) * k);
    sp.setZ(i, sp.getZ(i) * k);
  }
  skirtGeo.computeVertexNormals();
  addMesh(root, skirtGeo, mat(COLOR.navy), 0, 0.92, 0);

  // 上半身：以腰為支點前傾
  const torso = pivot(root, 0, 1.1, 0);
  const body = capsule(torso, 0.19, 0.18, COLOR.shirt, 0, 0.26, 0);
  body.scale.z = 0.72;
  blob(torso, 0.24, 0.11, 0.05, COLOR.navy, 0, 0.42, -0.11); // 背後的水手領
  blob(torso, 0.225, 0.02, 0.052, COLOR.shirt, 0, 0.38, -0.112); // 領子白線
  for (const sx of [-1, 1]) {
    const v = capsule(torso, 0.03, 0.16, COLOR.navy, sx * 0.08, 0.4, 0.12); // 前面 V 領
    v.rotation.z = sx * 0.6;
  }
  // 紅色蝴蝶結
  blob(torso, 0.05, 0.035, 0.025, COLOR.scarf, -0.045, 0.31, 0.145);
  blob(torso, 0.05, 0.035, 0.025, COLOR.scarf, 0.045, 0.31, 0.145);
  blob(torso, 0.025, 0.025, 0.03, COLOR.scarf, 0, 0.31, 0.15);
  // 手臂往後，兩手在背後提書包
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = pivot(torso, sx * 0.24, 0.43, 0);
    blob(arm, 0.075, 0.075, 0.075, COLOR.shirt, 0, 0, 0); // 肩
    capsule(arm, 0.055, 0.2, COLOR.shirt, 0, -0.14, 0);
    capsule(arm, 0.045, 0.1, COLOR.skin, 0, -0.32, 0);
    blob(arm, 0.05, 0.055, 0.045, COLOR.skin, 0, -0.41, 0);
    arm.rotation.set(0.55, 0, -sx * 0.18);
    arms.push(arm);
  }
  roundBox(torso, 0.48, 0.32, 0.12, 0.04, COLOR.bag, 0, -0.2, -0.31);
  roundBox(torso, 0.16, 0.06, 0.13, 0.02, 0xb89a50, 0, -0.1, -0.31); // 書包扣
  capsule(torso, 0.05, 0.05, COLOR.skin, 0, 0.53, 0); // 脖子

  // 頭：以脖子為支點低頭、歪頭
  const head = pivot(torso, 0, 0.56, 0);
  blob(head, 0.165, 0.18, 0.16, COLOR.skin, 0, 0.18, 0.01);
  blob(head, 0.19, 0.19, 0.18, COLOR.hair, 0, 0.215, -0.035); // 後腦與頭頂
  blob(head, 0.17, 0.065, 0.08, COLOR.hair, 0, 0.31, 0.09); // 瀏海
  for (const sx of [-1, 1]) {
    blob(head, 0.05, 0.13, 0.07, COLOR.hair, sx * 0.15, 0.17, 0.04); // 鬢角
    const eye = capsule(head, 0.008, 0.035, COLOR.hair, sx * 0.065, 0.17, 0.162); // 往下看、瞇著的眼睛
    eye.rotation.z = Math.PI / 2;
    blob(head, 0.03, 0.014, 0.01, COLOR.blush, sx * 0.095, 0.12, 0.155);
  }
  const tail = pivot(head, 0, 0.33, -0.17); // 馬尾
  blob(tail, 0.04, 0.035, 0.035, COLOR.scarf, 0, 0, 0);
  const pony = capsule(tail, 0.055, 0.2, COLOR.hair, 0, -0.16, -0.04);
  pony.scale.x = 0.85;
  blob(tail, 0.035, 0.05, 0.035, COLOR.hair, 0, -0.31, -0.05);

  return { root, torso, head, tail, arms };
}

// 三花貓縮成一團睡覺，原點在肚子底，身體沿 x 軸
// 花紋（白底、橘斑、黑斑）畫在身體的頂點顏色上
function calicoBody(x, y, z) {
  if (y < -0.35) return COLOR.catWhite; // 肚子白
  if (near(x, y, z, -0.45, 0.65, 0.3, 0.62) || near(x, y, z, -0.8, 0.2, 0.55, 0.42)) return COLOR.catOrange;
  if (near(x, y, z, 0.35, 0.75, -0.45, 0.5) || near(x, y, z, 0.6, 0.3, -0.8, 0.32)) return COLOR.catBlack;
  if (near(x, y, z, -0.6, 0.4, -0.75, 0.35)) return COLOR.catOrange;
  return COLOR.catWhite;
}
function calicoHead(x, y, z) {
  if (x > 0.55 && y < 0.25) return COLOR.catWhite; // 口鼻周圍白
  if (y > 0.05 && z < -0.1) return COLOR.catOrange; // 左半頭頂橘
  if (y > 0.05 && z > 0.1) return COLOR.catBlack; // 右半頭頂黑
  return COLOR.catWhite;
}
function makeCat() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  paintedBlob(body, 0.3, 0.13, 0.19, calicoBody, 0, 0.12, 0);
  // 前腳收在臉下
  blob(root, 0.06, 0.035, 0.045, COLOR.catWhite, 0.3, 0.035, 0.06);
  blob(root, 0.06, 0.035, 0.045, COLOR.catWhite, 0.28, 0.035, 0.15);

  // 頭靠在前腳上：左半橘、右半黑的三花臉
  const head = pivot(root, 0.3, 0.12, 0.06);
  paintedBlob(head, 0.115, 0.095, 0.115, calicoHead, 0, 0, 0, [24, 16]);
  blob(head, 0.045, 0.035, 0.05, COLOR.catWhite, 0.09, -0.03, 0); // 口鼻
  const ears = [];
  for (const [sz, c] of [[-1, COLOR.catOrange], [1, COLOR.catBlack]]) {
    const ear = pivot(head, -0.02, 0.07, sz * 0.065);
    const e = cone(ear, 0.04, 0.07, c, 0, 0.03, 0);
    e.rotation.x = sz * 0.3;
    cone(ear, 0.022, 0.04, COLOR.catNose, 0.012, 0.025, 0).rotation.x = sz * 0.3;
    ears.push(ear);
  }
  for (const sz of [-1, 1]) {
    const eye = capsule(head, 0.006, 0.035, COLOR.catBlack, 0.1, 0.015, sz * 0.045); // 閉著的眼
    eye.rotation.x = Math.PI / 2;
  }
  blob(head, 0.012, 0.01, 0.014, COLOR.catNose, 0.13, -0.015, 0);

  // 尾巴從屁股繞到前面：一節一節膠囊，尖端橘色會慢慢擺
  const tailRoot = pivot(root, -0.28, 0.05, 0);
  const segs = [];
  let parent = tailRoot;
  for (let i = 0; i < 5; i++) {
    const seg = pivot(parent, i === 0 ? 0 : 0.1, 0, 0);
    const r = 0.036 - i * 0.003;
    const c = capsule(seg, r, 0.07, i === 4 ? COLOR.catOrange : i === 2 ? COLOR.catBlack : COLOR.catWhite, 0.05, 0, 0);
    c.rotation.z = Math.PI / 2;
    seg.rotation.y = i === 0 ? Math.PI * 0.55 : -0.42;
    segs.push(seg);
    parent = seg;
  }

  // 頭上冒 z
  const zTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 16;
    const g = cv.getContext('2d');
    // 先畫深色陰影再疊白字，淺色、深色背景上都看得到
    const drawZ = (dx, dy, color) => {
      g.fillStyle = color;
      g.fillRect(3 + dx, 3 + dy, 10, 2); g.fillRect(3 + dx, 11 + dy, 10, 2);
      for (let i = 0; i < 6; i++) g.fillRect(11 - i * 1.6 + dx, 5 + i + dy, 2, 1.4);
    };
    drawZ(1, 1, '#4a5470');
    drawZ(0, 0, '#ffffff');
    const t = new THREE.CanvasTexture(cv);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const zs = [0, 1, 2].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false }));
    root.add(s);
    return s;
  });

  return { root, body, head, ears, segs, zs };
}

// ===================================================================
// 麻雀，原點在腳，正面朝 +z；羽色畫在頂點顏色上
function sparrowBody(x, y, z) {
  if (y < -0.15) return COLOR.sBelly;
  if (y > 0.3 && Math.sin(x * 9 + z * 5) > 0.55) return COLOR.sBack; // 背上的深色縱紋
  return COLOR.sBody;
}
function sparrowHead(x, y, z) {
  if (z > 0.45 && y < -0.35 && Math.abs(x) < 0.45) return COLOR.sDark; // 喉部黑斑
  if (Math.abs(x) > 0.7 && y < 0.1 && y > -0.35 && z > -0.25 && z < 0.25) return COLOR.sDark; // 臉頰黑點
  if (Math.abs(x) > 0.45 && y < 0.25) return COLOR.sCheek; // 白臉頰
  if (y > 0.2) return COLOR.sCap; // 栗色頭頂
  return COLOR.sCheek;
}
function sparrowWing(x, y, z) {
  if (z > 0.15 && z < 0.4) return COLOR.sWingBar; // 白色翼帶
  if (z < -0.4 || Math.sin(x * 14) > 0.6) return COLOR.sBack;
  return COLOR.sWing;
}
function makeSparrow() {
  const root = new THREE.Group();
  const s = pivot(root); // 實際縮放的那層
  s.scale.setScalar(0.75); // 約 15 公分，跟女學生（約 155 公分）的比例對上
  const body = paintedBlob(s, 0.095, 0.085, 0.14, sparrowBody, 0, 0.13, 0, [18, 12]);
  body.rotation.x = -0.2; // 胸口微微挺起
  const head = pivot(s, 0, 0.22, 0.11);
  paintedBlob(head, 0.075, 0.07, 0.075, sparrowHead, 0, 0, 0, [18, 12]);
  const beak = cone(head, 0.022, 0.05, 0x3a3430, 0, -0.012, 0.085);
  beak.rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) blob(head, 0.012, 0.014, 0.012, COLOR.sDark, sx * 0.058, 0.018, 0.04); // 眼
  const tail = pivot(s, 0, 0.15, -0.12);
  blob(tail, 0.04, 0.012, 0.09, COLOR.sBack, 0, 0, -0.07);
  tail.rotation.x = -0.35;
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = pivot(s, sx * 0.08, 0.18, 0);
    paintedBlob(w, 0.12, 0.014, 0.085, sparrowWing, sx * 0.11, 0, -0.02, [14, 8]);
    wings.push(w);
  }
  const legs = [];
  for (const sx of [-1, 1]) {
    legs.push(addMesh(s, cached('leg', () => new THREE.CylinderGeometry(0.008, 0.008, 0.07, 5)), mat(0x6a5040), sx * 0.035, 0.035, 0.02));
  }
  return { root, head, tail, wings, legs };
}

// 麻雀可以停的地方：線段（屋脊、天線橫桿、瓦簷、販賣機頂）
const PERCHES = [
  { a: [0.2, 11.05, -4.8], b: [0.2, 11.05, 0.9], w: 3 }, // 屋脊
  { a: [-2.95, 12.48, -0.61], b: [-1.45, 12.48, -0.61], w: 3 }, // 天線上橫桿
  { a: [-2.75, 11.66, -0.62], b: [-1.55, 11.66, -0.62], w: 2 }, // 天線下橫桿
  { a: [-2.2, 13.1, -0.6], b: [-2.2, 13.1, -0.6], w: 1 }, // 天線頂
  { a: [1.0, 4.18, 2.55], b: [5.2, 4.18, 2.55], w: 1 }, // 一樓瓦簷前緣（右半，左邊有藤）
  { a: [6.2, 4.02, 0.6], b: [7.6, 4.02, 1.0], w: 1 }, // 販賣機頂
].map((p) => ({ a: new THREE.Vector3(...p.a), b: new THREE.Vector3(...p.b), w: p.w }));
const totalW = PERCHES.reduce((s, p) => s + p.w, 0);

const _v = new THREE.Vector3();
function bezier(out, p0, c, p1, t) {
  const u = 1 - t;
  return out.set(0, 0, 0).addScaledVector(p0, u * u).addScaledVector(c, 2 * u * t).addScaledVector(p1, t * t);
}
// 場景外隨機一點（圍著中心一圈）
function offscreen(angle) {
  const r = 26;
  return new THREE.Vector3(Math.sin(angle) * r, rr(8, 15), Math.cos(angle) * r - 1);
}

class Sparrow {
  constructor(scene, flock) {
    this.m = makeSparrow();
    this.flock = flock;
    scene.add(this.m.root);
    this.m.root.visible = false;
    this.state = 'idle';
    this.p0 = new THREE.Vector3();
    this.c = new THREE.Vector3();
    this.p1 = new THREE.Vector3();
    this.perch = null;
    this.flapSeed = Math.random() * 10;
  }
  // 從 from 飛到 to；land = 到了要停下
  fly(from, to, land) {
    this.p0.copy(from);
    this.p1.copy(to);
    const dist = from.distanceTo(to);
    this.c.lerpVectors(from, to, 0.5);
    this.c.y = Math.max(from.y, to.y) + rr(1.5, 3.5);
    this.dur = dist / rr(5.5, 7.5);
    this.t = 0;
    this.land = land;
    this.state = 'fly';
    this.m.root.visible = true;
    this.m.legs.forEach((l) => (l.visible = false));
  }
  spawn(delay = 0) {
    const a = Math.random() * Math.PI * 2;
    const from = offscreen(a);
    this.delay = delay;
    const spot = Math.random() < 0.7 ? this.flock.freeSpot() : null;
    if (spot) {
      this.perch = spot;
      this.fly(from, spot.pos, true);
    } else {
      this.perch = null;
      this.fly(from, offscreen(a + Math.PI + rr(-0.9, 0.9)), false);
    }
  }
  leave() {
    if (Math.random() < 0.5) this.flock.sound?.chirp(this.m.root.position);
    this.perch = null;
    const to = offscreen(Math.random() * Math.PI * 2);
    this.fly(this.m.root.position.clone(), to, false);
    this.c.y = this.p0.y + rr(1, 2.5);
  }
  update(dt, time) {
    const { root, wings, head, tail, legs } = this.m;
    if (this.state === 'idle') return;
    if (this.delay > 0) { this.delay -= dt; root.visible = false; return; }
    root.visible = true;

    if (this.state === 'fly') {
      this.t = Math.min(1, this.t + dt / this.dur);
      const t = this.land ? 1 - (1 - this.t) ** 2 : this.t; // 要降落的話後段減速
      bezier(root.position, this.p0, this.c, this.p1, t);
      // 麻雀是一上一下跳躍式飛行
      root.position.y += Math.sin(t * Math.PI * 6 + this.flapSeed) * 0.25 * Math.sin(t * Math.PI);
      bezier(_v, this.p0, this.c, this.p1, Math.min(1, t + 0.02)).sub(root.position);
      if (_v.lengthSq() > 1e-6) root.rotation.y = Math.atan2(_v.x, _v.z);
      root.rotation.x = 0;
      // 拍翅 0.6 拍、收翅滑行 0.4 拍；快降落時一直拍
      const phase = (time * 2.4 + this.flapSeed) % 1;
      const flapping = phase < 0.6 || (this.land && this.t > 0.8);
      const ang = flapping ? Math.sin(time * 42 + this.flapSeed) * 0.95 : -1.1;
      wings[0].rotation.z = -ang;
      wings[1].rotation.z = ang;
      wings.forEach((w) => w.scale.set(1, 1, 1));
      head.rotation.x = 0;
      // 飛行中偶爾叫一聲
      if (Math.random() < dt * 0.25) this.flock.sound?.chirp(root.position);
      if (this.t >= 1) {
        if (this.land) {
          this.state = 'perch';
          this.stay = rr(4, 11);
          this.nextAct = rr(0.4, 1.2);
          this.hop = 0;
          legs.forEach((l) => (l.visible = true));
          root.position.copy(this.p1);
        } else {
          this.state = 'idle';
          root.visible = false;
        }
      }
      return;
    }

    // ---- 停著：收翅、偶爾跳一下、啄一下、轉頭 ----
    // 收翅：縮短、往下貼在身體兩側
    wings[0].rotation.z = 1.25;
    wings[1].rotation.z = -1.25;
    wings.forEach((w) => w.scale.set(0.5, 1, 1));
    tail.rotation.x = -0.35 + Math.sin(time * 3 + this.flapSeed) * 0.08;
    this.stay -= dt;
    this.nextAct -= dt;
    if (this.hop > 0) {
      this.hop = Math.max(0, this.hop - dt * 4);
      const k = 1 - this.hop;
      root.position.lerpVectors(this.hopFrom, this.perch.pos, k);
      root.position.y += Math.sin(k * Math.PI) * 0.18;
    }
    if (this.nextAct <= 0 && this.hop === 0) {
      this.nextAct = rr(0.4, 1.4);
      const r = Math.random();
      if (r < 0.25 && this.perch.seg.a.distanceTo(this.perch.seg.b) > 0.1) {
        // 沿著停的線段跳一小步
        const seg = this.perch.seg;
        this.perch.u = THREE.MathUtils.clamp(this.perch.u + rr(-0.12, 0.12), 0, 1);
        this.hopFrom = root.position.clone();
        this.perch.pos.lerpVectors(seg.a, seg.b, this.perch.u);
        this.hop = 1;
      } else if (r < 0.45) {
        root.rotation.y += rr(-1.6, 1.6);
      } else if (r < 0.75) {
        // 抬頭叫幾聲
        this.sing = 0.5;
        this.flock.sound?.chirp(root.position);
      } else {
        this.peck = 0.35;
      }
    }
    this.peck = Math.max(0, (this.peck ?? 0) - dt);
    this.sing = Math.max(0, (this.sing ?? 0) - dt);
    head.rotation.x = this.peck > 0 ? 0.9 * Math.sin((this.peck / 0.35) * Math.PI)
      : this.sing > 0 ? -0.35 + Math.sin(this.sing * 50) * 0.08 // 叫的時候抬頭、喉嚨微微抖
      : Math.sin(time * 1.7 + this.flapSeed) * 0.1;
    head.rotation.y = Math.sin(time * 0.9 + this.flapSeed * 3) * 0.5;
    if (this.stay <= 0) this.leave();
  }
}

class Flock {
  constructor(scene, sound, n = 9) {
    this.sound = sound;
    this.birds = Array.from({ length: n }, () => new Sparrow(scene, this));
    this.timer = 1;
  }
  // 挑一個沒被佔的停靠點
  freeSpot() {
    for (let tries = 0; tries < 6; tries++) {
      let k = Math.random() * totalW;
      const seg = PERCHES.find((p) => (k -= p.w) < 0) ?? PERCHES[0];
      const u = Math.random();
      const pos = new THREE.Vector3().lerpVectors(seg.a, seg.b, u);
      const busy = this.birds.some((b) => b.perch && b.perch.pos.distanceTo(pos) < 0.45);
      if (!busy) return { seg, u, pos };
    }
    return null;
  }
  update(dt, time) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = rr(2.5, 6);
      // 一次飛來 1～3 隻
      const free = this.birds.filter((b) => b.state === 'idle');
      const n = Math.min(free.length, 1 + Math.floor(Math.random() * 3));
      for (let i = 0; i < n; i++) free[i].spawn(i * rr(0.15, 0.5));
    }
    for (const b of this.birds) b.update(dt, time);
  }
}

// ===================================================================
export function createLife(scene, sound) {
  const girl = makeGirl();
  girl.root.position.set(-0.5, 0.3, 3.4);
  scene.add(girl.root);

  const cat = makeCat();
  cat.root.position.set(0.3, 0.58, 2.6);
  cat.root.rotation.y = 0.25;
  cat.root.scale.setScalar(1.35);
  scene.add(cat.root);

  // 女學生面向貓
  const d = new THREE.Vector3().subVectors(cat.root.position, girl.root.position);
  girl.root.rotation.y = Math.atan2(d.x, d.z);

  const flock = new Flock(scene, sound);
  if (import.meta.env.DEV) {
    window.__flock = flock; // 開發時方便在 console 檢查
    // ?perchtest：每個停靠點的兩端各擺一隻，檢查位置
    if (new URLSearchParams(location.search).has('perchtest')) {
      flock.timer = Infinity;
      const spots = PERCHES.flatMap((seg) => [0, 1].map((u) => ({ seg, u, pos: new THREE.Vector3().lerpVectors(seg.a, seg.b, u) })));
      flock.birds.push(...spots.slice(flock.birds.length).map(() => new Sparrow(scene, flock)));
      spots.forEach((spot, i) => {
        const b = flock.birds[i];
        b.perch = spot;
        b.fly(spot.pos, spot.pos, true);
        b.t = 1;
        b.dur = 1;
      });
    }
  }
  let earTimer = 2;

  return {
    update(dt, time) {
      // ---- 女學生：彎腰看貓，偶爾再湊近一點、歪頭 ----
      const peek = Math.max(0, Math.sin(time * 0.45)) ** 2;
      girl.torso.rotation.x = 0.3 + peek * 0.25 + Math.sin(time * 1.6) * 0.015;
      girl.head.rotation.x = 0.4 + peek * 0.15;
      girl.head.rotation.z = Math.sin(time * 0.6) * 0.14;
      girl.tail.rotation.x = 0.1 - girl.torso.rotation.x * 0.6 + Math.sin(time * 1.3) * 0.08;
      girl.tail.rotation.z = Math.sin(time * 0.9) * 0.1;

      // ---- 貓：呼吸、尾巴尖慢慢擺、耳朵偶爾抖一下 ----
      const breath = Math.sin(time * CAT_BREATH_RATE);
      cat.body.scale.set(1, 1 + breath * 0.06, 1 + breath * 0.03);
      cat.head.position.y = 0.12 + breath * 0.006;
      cat.segs[3].rotation.y = -0.42 + Math.sin(time * 0.8) * 0.25;
      cat.segs[4].rotation.y = -0.42 + Math.sin(time * 0.8 - 0.6) * 0.35;
      earTimer -= dt;
      const twitch = earTimer < 0 && earTimer > -0.25 ? Math.sin(-earTimer * 60) * 0.4 : 0;
      cat.ears[0].rotation.x = twitch;
      if (earTimer < -0.25) earTimer = rr(3, 8);
      // 三個 z 輪流往上飄、變大、淡出
      cat.zs.forEach((s, i) => {
        const k = (time * 0.35 + i / 3) % 1;
        s.position.set(0.35 + k * 0.35, 0.35 + k * 0.9, 0.06 - k * 0.2);
        s.scale.setScalar(0.12 + k * 0.16);
        s.material.opacity = Math.sin(k * Math.PI);
      });

      flock.update(dt, time);
    },
  };
}
