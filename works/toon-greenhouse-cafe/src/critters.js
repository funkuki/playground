import * as THREE from 'three';
import { gradient, addOutlines } from './scene.js';

// 動態：花叢間的蝴蝶，和一隻追蝴蝶、發呆、回溫室地毯睡覺的灰色虎斑貓

const rr = (a, b) => a + (b - a) * Math.random();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const toon = (color, opts = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts });
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
function angleTo(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---------- 地面高度：木平台與兩階台階 ----------
function groundY(x, z) {
  if (x > -3 && x < 5 && z > -2.5 && z < 3) return 0.4;
  if (x > -1.4 && x < 4 && z >= 3 && z < 3.55) return 0.264;
  if (x > -1.6 && x < 4.2 && z >= 3.55 && z < 4.1) return 0.132;
  return 0;
}

// ======================================================================
// 蝴蝶
// ======================================================================
const ZONES = [
  { x: [5.6, 9.2], z: [2.5, 8.0], y: [0.9, 1.8], w: 3 }, // 右下紅花叢
  { x: [-7.5, 4.5], z: [4.8, 8.0], y: [0.5, 1.6], w: 3 }, // 前方草叢
  { x: [6.0, 9.0], z: [-1.0, 2.0], y: [1.2, 2.6], w: 2 }, // 右側灌木、瓶子草
  { x: [-3.0, 5.0], z: [2.9, 3.8], y: [3.6, 5.0], w: 1 }, // 屋簷玫瑰
  { x: [-9.0, -6.8], z: [-1.0, 7.0], y: [0.6, 1.8], w: 1 }, // 左側龜背芋
];
const zoneBag = ZONES.flatMap((z) => Array(z.w).fill(z));
const BF_COLORS = [
  [0xf4a020, 0xe8622e], // 橘斑
  [0xf6d84a, 0xf4ecb0], // 黃
  [0x5a9ae8, 0x9ac4f4], // 藍
  [0xf0ece4, 0xd8d4cc], // 白
  [0xf08ab0, 0xf6c0d4], // 粉
  [0xa070d8, 0xc8a8ec], // 紫
  [0x7ad0c8, 0xc0ece4], // 青
];

function wingGeometry(fore) {
  // 在 xy 平面畫右翅，再轉成水平（形狀的 -y 朝前 +z）
  const s = new THREE.Shape();
  if (fore) {
    s.moveTo(0, 0);
    s.bezierCurveTo(0.03, -0.09, 0.12, -0.11, 0.13, -0.06);
    s.bezierCurveTo(0.12, 0.0, 0.05, 0.01, 0, 0.01);
  } else {
    s.moveTo(0, 0.0);
    s.bezierCurveTo(0.06, 0.0, 0.1, 0.04, 0.08, 0.08);
    s.bezierCurveTo(0.05, 0.11, 0.01, 0.06, 0, 0.03);
  }
  const g = new THREE.ShapeGeometry(s, 8);
  g.rotateX(-Math.PI / 2);
  return g;
}
const FORE = wingGeometry(true);
const HIND = wingGeometry(false);
const FORE_EDGE = new THREE.EdgesGeometry(FORE);
const HIND_EDGE = new THREE.EdgesGeometry(HIND);
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2c2a26 });
const bodyGeo = new THREE.CapsuleGeometry(0.012, 0.07, 3, 6).rotateX(Math.PI / 2);
const bodyMat = toon(0x2c2a26);

class Butterfly {
  constructor(scene) {
    const [c1, c2] = pick(BF_COLORS);
    const fm = toon(c1, { side: THREE.DoubleSide });
    const hm = toon(c2, { side: THREE.DoubleSide });
    this.root = new THREE.Group();
    this.root.add(new THREE.Mesh(bodyGeo, bodyMat));
    this.wings = [];
    for (const side of [1, -1]) {
      const w = new THREE.Group();
      for (const [geo, edge, m] of [[FORE, FORE_EDGE, fm], [HIND, HIND_EDGE, hm]]) {
        const mesh = new THREE.Mesh(geo, m);
        mesh.castShadow = true;
        w.add(mesh, new THREE.LineSegments(edge, edgeMat));
      }
      w.scale.x = side; // 左翅用鏡像
      this.root.add(w);
      this.wings.push(w);
    }
    this.root.scale.setScalar(rr(1.1, 1.45));
    scene.add(this.root);

    const z = pick(zoneBag);
    this.pos = new THREE.Vector3(rr(...z.x), rr(...z.y), rr(...z.z));
    this.vel = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.newTarget();
    this.flapSpeed = rr(14, 20);
    this.phase = rr(0, 10);
    this.perch = 0; // > 0 時停在花上
    this.flee = 0;
    this.heading = 0;
  }
  newTarget(zone) {
    // 大多在同一區附近遊蕩，偶爾換區
    const z = zone ?? (Math.random() < 0.25 || !this.zone ? pick(zoneBag) : this.zone);
    this.zone = z;
    this.target.set(rr(...z.x), rr(...z.y), rr(...z.z));
  }
  update(dt, t, cat) {
    const p = this.pos;
    // 貓靠近就往上逃
    const dx = p.x - cat.position.x, dz = p.z - cat.position.z;
    const near = Math.hypot(dx, dz);
    if (this.flee <= 0 && near < 1.1 && p.y < 1.8) {
      this.flee = rr(1.2, 2.0);
      this.perch = 0;
      const k = 1.8 / Math.max(near, 0.1);
      this.target.set(p.x + dx * k + rr(-0.5, 0.5), p.y + rr(1.0, 1.6), p.z + dz * k + rr(-0.5, 0.5));
    }
    this.flee -= dt;

    if (this.perch > 0) {
      this.perch -= dt;
      // 停著：翅膀慢慢開合
      const a = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + this.phase));
      this.wings[0].rotation.z = a;
      this.wings[1].rotation.z = -a;
      this.root.position.copy(p);
      if (this.perch <= 0) this.newTarget();
      return;
    }

    const toT = this.target.clone().sub(p);
    const d = toT.length();
    if (d < 0.15) {
      if (this.flee <= 0 && Math.random() < 0.4) this.perch = rr(1.5, 4.0);
      else this.newTarget();
    }
    const speed = this.flee > 0 ? 1.8 : 0.75;
    const desired = toT.normalize().multiplyScalar(speed);
    // 蝴蝶飛得歪歪扭扭：加一點擺動
    desired.x += Math.sin(t * 2.3 + this.phase) * 0.5;
    desired.z += Math.cos(t * 1.9 + this.phase * 1.3) * 0.5;
    desired.y += Math.sin(t * 3.1 + this.phase) * 0.3;
    this.vel.lerp(desired, 1 - Math.exp(-3 * dt));
    p.addScaledVector(this.vel, dt);
    p.y = Math.max(p.y, groundY(p.x, p.z) + 0.25);

    const hv = Math.hypot(this.vel.x, this.vel.z);
    if (hv > 0.05) this.heading += angleTo(this.heading, Math.atan2(this.vel.x, this.vel.z)) * Math.min(1, dt * 6);
    this.root.position.set(p.x, p.y + Math.sin(t * this.flapSpeed * 0.5 + this.phase) * 0.03, p.z);
    this.root.rotation.y = this.heading;
    // 拍翅：0.1（幾乎攤平）～ 1.3（合起）
    const f = Math.abs(Math.sin(t * this.flapSpeed + this.phase));
    const a = 0.1 + 1.2 * f;
    this.wings[0].rotation.z = a;
    this.wings[1].rotation.z = -a;
  }
}

// ======================================================================
// 灰色虎斑貓（英國短毛貓造型：圓頭、胖臉頰、小圓耳、短腿、粗短尾、銅色圓眼）
// ======================================================================
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const COAT = '#a2a4a4', STRIPE = '#55585b', BELLY = '#d6d7d4';
// 身體：經典虎斑（側腹的牛眼紋 + 背上三條縱紋 + 肩頸環紋）
// 球體轉成沿 z 軸後：u 繞身體一圈（0.5 在背上）、v 是前後
function tabbyTex() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = COAT;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = STRIPE;
    g.lineCap = 'round';
    // 背上三條縱紋
    g.lineWidth = 9;
    for (const dx of [-22, 0, 22]) {
      g.beginPath();
      g.moveTo(w * 0.5 + dx, h * 0.12);
      g.bezierCurveTo(w * 0.5 + dx * 1.2, h * 0.4, w * 0.5 + dx * 0.9, h * 0.7, w * 0.5 + dx, h * 0.92);
      g.stroke();
    }
    // 側腹牛眼紋：一圈實心 + 外圈環
    for (const u of [0.25, 0.75]) {
      g.fillStyle = STRIPE;
      g.beginPath();
      g.ellipse(w * u, h * 0.6, 16, 26, 0, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 10;
      g.beginPath();
      g.ellipse(w * u, h * 0.6, 34, 52, 0, 0, Math.PI * 2);
      g.stroke();
    }
    // 肩頸的環紋
    g.lineWidth = 8;
    for (const v of [0.14, 0.26]) {
      g.beginPath();
      g.moveTo(w * 0.12, h * v);
      g.quadraticCurveTo(w * 0.5, h * (v + 0.05), w * 0.88, h * v);
      g.stroke();
    }
    // 肚子顏色淺（u 0 / 1 在肚子）
    g.fillStyle = BELLY;
    g.fillRect(0, 0, w * 0.1, h);
    g.fillRect(w * 0.9, 0, w * 0.1, h);
  });
}
// 腿、尾巴：一圈圈的環紋
function ringTex(n) {
  return canvasTexture(64, 128, (g, w, h) => {
    g.fillStyle = COAT;
    g.fillRect(0, 0, w, h);
    g.fillStyle = STRIPE;
    for (let i = 0; i < n; i++) g.fillRect(0, ((i + 0.3) * h) / n, w, h / n / 2.4);
  });
}
// 臉：額頭 M 字紋、眼角的眼線
function faceTex() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = COAT;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = STRIPE;
    g.lineWidth = 5;
    g.lineCap = 'round';
    // 球體正面 +z 在 u = 0.25
    const cx = w * 0.25;
    g.beginPath();
    g.moveTo(cx - 22, h * 0.38);
    g.lineTo(cx - 12, h * 0.2);
    g.lineTo(cx, h * 0.34);
    g.lineTo(cx + 12, h * 0.2);
    g.lineTo(cx + 22, h * 0.38);
    g.stroke();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + s * 30, h * 0.5);
      g.lineTo(cx + s * 52, h * 0.46);
      g.stroke();
    }
  });
}

const DARK = 0x55585b, LIGHT = 0xdcdcd8;

class Cat {
  constructor(scene) {
    const tabby = toon(0xffffff, { map: tabbyTex() });
    const legMat = toon(0xffffff, { map: ringTex(4) });
    const face = toon(0xffffff, { map: faceTex() });
    const coat = toon(0xa2a4a4), light = toon(LIGHT);
    const M = (geo, mat, x = 0, y = 0, z = 0, parent) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.userData.outline = 0.008;
      parent.add(m);
      return m;
    };

    this.root = new THREE.Group(); // 腳底中心，面向 +z
    this.root.scale.setScalar(1.5);
    // 軀幹以臀部為支點，坐下時往上仰
    this.torso = new THREE.Group();
    this.root.add(this.torso);
    // 英短：圓滾滾的短身體、寬胸
    const bodyGeo = new THREE.SphereGeometry(1, 20, 14).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
    this.body = M(bodyGeo, tabby, 0, 0.05, 0.12, this.torso);
    this.bodyScale = new THREE.Vector3(0.15, 0.135, 0.2);
    this.body.scale.copy(this.bodyScale);
    M(new THREE.SphereGeometry(0.1, 14, 10), coat, 0, 0.04, 0.22, this.torso).scale.set(1.15, 1.1, 0.9); // 寬胸
    M(new THREE.SphereGeometry(0.06, 12, 8), light, 0, 0.0, 0.3, this.torso).scale.set(1.1, 1.2, 0.6); // 胸前淺毛

    // 頭：大圓頭、胖臉頰、小圓耳分得很開
    this.head = new THREE.Group();
    this.head.position.set(0, 0.11, 0.31);
    this.torso.add(this.head);
    M(new THREE.SphereGeometry(0.105, 20, 14), face, 0, 0.04, 0.03, this.head).scale.set(1.18, 1.0, 0.98);
    for (const s of [-1, 1]) {
      M(new THREE.SphereGeometry(0.062, 12, 10), coat, s * 0.06, 0.005, 0.06, this.head).scale.set(1, 0.9, 0.9); // 臉頰
      M(new THREE.SphereGeometry(0.028, 10, 8), light, s * 0.022, 0.0, 0.122, this.head).scale.set(1, 0.85, 0.8); // 鬍鬚墊
      const ear = M(new THREE.ConeGeometry(0.034, 0.05, 6), coat, s * 0.078, 0.125, 0.0, this.head);
      ear.rotation.set(-0.1, 0, s * -0.6);
      M(new THREE.ConeGeometry(0.02, 0.03, 6), toon(0xc8a8a4), s * 0.074, 0.122, 0.012, this.head).rotation.set(-0.1, 0, s * -0.6); // 耳內
    }
    M(new THREE.SphereGeometry(0.016, 8, 6), light, 0, -0.03, 0.115, this.head); // 下巴
    M(new THREE.SphereGeometry(0.011, 6, 4), toon(0xb87a7a), 0, 0.025, 0.142, this.head).userData.noOutline = true; // 鼻頭
    // 銅色圓眼 + 黑瞳孔
    this.eyes = [-1, 1].map((s) => {
      const e = new THREE.Group();
      e.position.set(s * 0.045, 0.055, 0.115);
      this.head.add(e);
      M(new THREE.SphereGeometry(0.021, 12, 8), toon(0xd8892a), 0, 0, 0, e).userData.outline = 0.004;
      M(new THREE.SphereGeometry(0.012, 8, 6), toon(0x1a1a1a), 0, 0, 0.012, e).userData.noOutline = true;
      return e;
    });

    // 腿：粗短，支點在肩/髖，圓柱往下長
    this.legLen = 0.15;
    const legGeo = new THREE.CylinderGeometry(0.037, 0.034, this.legLen, 10).translate(0, -this.legLen / 2, 0);
    const pawGeo = new THREE.SphereGeometry(0.04, 10, 8);
    const leg = (x, y, z) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      this.torso.add(g);
      M(legGeo, legMat, 0, 0, 0, g);
      M(pawGeo, light, 0, -this.legLen, 0.012, g).scale.set(1, 0.65, 1.2);
      return g;
    };
    this.legs = {
      fl: leg(-0.07, 0, 0.26), fr: leg(0.07, 0, 0.26),
      hl: leg(-0.08, 0.01, 0.0), hr: leg(0.08, 0.01, 0.0),
    };
    // 後腿大腿
    for (const k of ['hl', 'hr']) M(new THREE.SphereGeometry(0.07, 12, 8), tabby, 0, -0.02, 0.0, this.legs[k]).scale.set(0.85, 1.1, 1.15);

    // 尾巴：粗短、尾端圓鈍，深淺相間
    this.tail = [];
    let parent = new THREE.Group();
    parent.position.set(0, 0.06, -0.07);
    this.torso.add(parent);
    const segLen = 0.055;
    for (let i = 0; i < 6; i++) {
      const r = 0.032 - i * 0.0012;
      const g = new THREE.Group();
      if (i > 0) g.position.y = segLen;
      parent.add(g);
      M(new THREE.CylinderGeometry(r - 0.001, r, segLen + 0.004, 10).translate(0, segLen / 2, 0), toon(i % 2 ? DARK : 0xa2a4a4), 0, 0, 0, g);
      if (i === 5) M(new THREE.SphereGeometry(r - 0.001, 10, 8), toon(DARK), 0, segLen, 0, g); // 圓鈍的尾端
      this.tail.push(g);
      parent = g;
    }

    addOutlines(this.root);
    this.root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) o.castShadow = true; });
    scene.add(this.root);

    // 狀態
    this.pos = new THREE.Vector3(-1.5, 0, 6.2);
    this.heading = Math.PI * 0.8;
    this.y = 0;
    this.jump = 0;
    this.phase = 0;
    this.speed = 0;
    this.pose = { sit: 0, lie: 0 };
    this.look = { yaw: 0, pitch: 0 };
    this.cycles = 0;
    this.enter('chase');
  }

  enter(state) {
    this.state = state;
    this.timer = 0;
    if (state === 'chase') { this.duration = rr(5, 9); this.prey = null; }
    if (state === 'sit') this.duration = rr(3, 6);
    if (state === 'goSleep') {
      // 從前院繞到台階前，再走上平台到地毯
      this.path = [];
      if (this.region() === 'right') this.path.push(new THREE.Vector3(5.8, 0, 4.5));
      this.path.push(new THREE.Vector3(2.4, 0, 4.8), new THREE.Vector3(2.4, 0, 3.2), new THREE.Vector3(2.65, 0, 1.75));
    }
    if (state === 'sleep') this.duration = rr(18, 30);
    if (state === 'wake') this.duration = 1.6;
    if (state === 'leave') this.path = [new THREE.Vector3(2.4, 0, 3.2), new THREE.Vector3(2.4, 0, 5.0)];
  }

  region(p = this.pos) {
    return p.x > 5.4 && p.z < 4.4 ? 'right' : 'front';
  }
  // 追逐範圍：前院與右側花叢（避開溫室）
  clampYard(v) {
    if (v.x > 5.6 && v.z < 4.6) {
      v.x = Math.min(v.x, 9.2);
      v.z = Math.max(v.z, -0.8);
    } else {
      v.z = THREE.MathUtils.clamp(v.z, 4.6, 8.0);
      v.x = THREE.MathUtils.clamp(v.x, -8.8, 9.2);
    }
    return v;
  }

  // 往目標走，回傳剩下的距離
  moveTo(target, speed, dt) {
    let goal = target;
    // 前院和右側之間要繞過溫室右前角
    if (this.state === 'chase' && this.region() !== this.region(target)) goal = new THREE.Vector3(5.8, 0, 4.5);
    const dx = goal.x - this.pos.x, dz = goal.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.02) {
      this.heading += angleTo(this.heading, Math.atan2(dx, dz)) * Math.min(1, dt * 6);
      // 轉向沒對準時放慢
      const align = Math.max(0.2, Math.cos(angleTo(this.heading, Math.atan2(dx, dz))));
      const step = Math.min(d, speed * align * dt);
      this.pos.x += Math.sin(this.heading) * step;
      this.pos.z += Math.cos(this.heading) * step;
      this.speed = damp(this.speed, speed * align, 8, dt);
    } else this.speed = damp(this.speed, 0, 8, dt);
    return goal === target ? d : d + 1;
  }

  followPath(speed, dt) {
    if (!this.path.length) return true;
    if (this.moveTo(this.path[0], speed, dt) < 0.08) this.path.shift();
    return this.path.length === 0;
  }

  update(dt, t, butterflies) {
    this.timer += dt;
    const P = this.pose;
    let sitT = 0, lieT = 0;
    let lookAt = null;

    switch (this.state) {
      case 'chase': {
        // 找一隻低空、在院子裡的蝴蝶追
        if (!this.prey || this.prey.pos.y > 2.4 || Math.random() < dt * 0.15) {
          const cands = butterflies.filter((b) => b.pos.y < 2.2 && b.pos.z > -1);
          cands.sort((a, b) => a.pos.distanceTo(this.pos) - b.pos.distanceTo(this.pos));
          this.prey = cands[Math.floor(Math.random() * Math.min(3, cands.length))] ?? null;
        }
        if (this.prey) {
          const tgt = this.clampYard(this.prey.pos.clone());
          const d = this.moveTo(tgt, d0(this) > 2.5 ? 1.7 : 1.0, dt);
          lookAt = this.prey.pos;
          // 追到附近、蝴蝶又飛得低 → 撲一下
          if (d < 0.45 && this.jump <= 0 && this.prey.pos.y < 1.6) {
            this.jump = 0.6;
            if (Math.random() < 0.5) { this.enter('sit'); break; }
          }
        } else this.speed = damp(this.speed, 0, 6, dt);
        if (this.timer > this.duration) this.enter('sit');
        break;
      }
      case 'sit': {
        sitT = 1;
        this.speed = damp(this.speed, 0, 10, dt);
        // 坐著發呆：眼睛跟著最近的蝴蝶
        const b = nearest(butterflies, this.pos);
        if (b && b.pos.distanceTo(this.pos) < 4) lookAt = b.pos;
        if (this.timer > this.duration) {
          this.cycles++;
          if (this.cycles >= 3 && Math.random() < 0.6) { this.cycles = 0; this.enter('goSleep'); }
          else this.enter('chase');
        }
        break;
      }
      case 'goSleep':
        if (this.followPath(0.75, dt)) this.enter('sleep');
        break;
      case 'sleep':
        lieT = 1;
        this.speed = damp(this.speed, 0, 10, dt);
        // 睡前先轉半圈找姿勢
        if (this.timer < 1.2) this.heading += dt * 2.2;
        if (this.timer > this.duration) this.enter('wake');
        break;
      case 'wake':
        // 伸懶腰：前腳往前、屁股翹高
        lieT = this.timer < 0.5 ? 1 - this.timer * 2 : 0;
        if (this.timer > this.duration) this.enter('leave');
        break;
      case 'leave':
        if (this.followPath(0.9, dt)) this.enter('chase');
        break;
    }

    // 高度：地面 + 撲跳
    this.y = damp(this.y, groundY(this.pos.x, this.pos.z), 14, dt);
    let hop = 0;
    if (this.jump > 0) {
      this.jump -= dt;
      const k = 1 - this.jump / 0.6;
      hop = Math.sin(Math.PI * Math.min(1, k)) * 0.45;
    }
    this.root.position.set(this.pos.x, this.y + hop, this.pos.z);
    this.root.rotation.y = this.heading;

    P.sit = damp(P.sit, sitT, 4, dt);
    P.lie = damp(P.lie, lieT, 3, dt);
    this.animate(dt, t, hop, lookAt);
  }

  animate(dt, t, hop, lookAt) {
    const { sit, lie } = this.pose;
    const stand = 1 - Math.max(sit, lie);
    const moving = Math.min(1, this.speed / 1.0);
    this.phase += dt * (4 + this.speed * 7);
    const sw = Math.sin(this.phase) * (0.25 + 0.35 * moving) * moving * stand;
    const stretch = this.state === 'wake' ? Math.sin(Math.min(1, this.timer / this.duration) * Math.PI) : 0;

    // 軀幹
    const hipY = 0.155 * stand + 0.1 * sit + 0.06 * lie + Math.abs(Math.sin(this.phase)) * 0.012 * moving;
    this.torso.position.set(0, hipY + 0.02 * stretch, -0.14);
    this.torso.rotation.x = -0.62 * sit + (hop > 0 ? -0.35 * Math.sign(this.jump - 0.3) : 0) + 0.25 * stretch;
    const breathe = 1 + Math.sin(t * 2.4) * 0.03 * lie;
    this.body.scale.set(this.bodyScale.x * breathe * (1 + 0.12 * lie), this.bodyScale.y * breathe, this.bodyScale.z);

    // 腿
    const L = this.legs;
    const frontSit = 0.62, frontLie = -1.45, hindSit = -1.35, hindLie = -1.3;
    L.fl.rotation.x = sw + frontSit * sit + frontLie * lie - 0.9 * stretch;
    L.fr.rotation.x = -sw + frontSit * sit + frontLie * lie - 0.9 * stretch;
    L.hl.rotation.x = -sw + hindSit * sit + hindLie * lie;
    L.hr.rotation.x = sw + hindSit * sit + hindLie * lie;
    const frontScale = 1 + 0.75 * sit; // 坐下時前腳要撐到地面
    L.fl.scale.y = L.fr.scale.y = frontScale;
    for (const k of ['fl', 'fr']) L[k].position.y = 0.02 * lie;

    // 頭：看著蝴蝶，睡覺時低下來
    let yaw = 0, pitch = 0;
    if (lookAt) {
      const wp = this.head.getWorldPosition(new THREE.Vector3());
      const dx = lookAt.x - wp.x, dz = lookAt.z - wp.z, dy = lookAt.y - wp.y;
      yaw = THREE.MathUtils.clamp(angleTo(this.heading, Math.atan2(dx, dz)), -1.0, 1.0);
      pitch = THREE.MathUtils.clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.8, 0.4);
    }
    this.look.yaw = damp(this.look.yaw, yaw * (1 - lie), 5, dt);
    this.look.pitch = damp(this.look.pitch, pitch * (1 - lie), 5, dt);
    this.head.rotation.set(this.look.pitch + 0.62 * sit + 0.6 * lie - 0.3 * stretch, this.look.yaw + 0.7 * lie, 0.35 * lie);
    this.head.position.set(0.03 * lie, 0.11 - 0.08 * lie, 0.31 - 0.02 * lie);
    // 眨眼；睡覺閉眼
    const blink = (t % 3.7) < 0.12 ? 0.15 : 1;
    for (const e of this.eyes) e.scale.y = lie > 0.5 ? 0.1 : blink;

    // 尾巴：走路時翹起擺動，坐著繞到前腳，睡覺時捲在身邊
    this.tail.forEach((seg, i) => {
      const k = i / (this.tail.length - 1);
      const wag = Math.sin(t * (2 + moving * 3) - i * 0.6) * (0.12 + 0.1 * moving);
      const up = i === 0 ? -0.9 : 0.16 - 0.06 * k; // 站姿：先往後上，再微微上彎
      const sitBend = i === 0 ? -2.45 : 0.3; // 坐著時尾巴垂到地上再往後彎
      const lieBend = i === 0 ? -1.55 : 0.0;
      seg.rotation.x = up * stand + sitBend * sit + lieBend * lie;
      seg.rotation.z = wag * stand + (0.2 * sit + 0.42 * lie) * (i > 0 ? 1 : 0);
    });
  }
}

function d0(cat) {
  return cat.prey ? Math.hypot(cat.prey.pos.x - cat.pos.x, cat.prey.pos.z - cat.pos.z) : 0;
}
function nearest(list, p) {
  let best = null, bd = Infinity;
  for (const b of list) {
    const d = b.pos.distanceTo(p);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

// ======================================================================
export function initCritters(scene) {
  const butterflies = Array.from({ length: 14 }, () => new Butterfly(scene));
  const cat = new Cat(scene);
  const update = (dt, t) => {
    dt = Math.min(dt, 0.05);
    for (const b of butterflies) b.update(dt, t, cat.root);
    cat.update(dt, t, butterflies);
  };
  if (import.meta.env.DEV) window.__critters = { cat, butterflies, update }; // 開發時方便在 console 檢查
  // 開發用：?cat=sit 或 ?cat=sleep 把貓固定在某個姿勢，方便截圖檢查
  const force = import.meta.env.DEV && new URLSearchParams(location.search).get('cat');
  if (force === 'sit') { cat.pos.set(1.0, 0, 4.9); cat.heading = 0.6; cat.enter('sit'); cat.duration = 1e9; }
  if (force === 'sleep') { cat.pos.set(2.65, 0, 1.75); cat.y = 0.4; cat.enter('sleep'); cat.duration = 1e9; }
  return update;
}
