import * as THREE from 'three';
import { POOL, WATER_Y, waveH } from './paint.js';
import { blob, limb, pivot } from './dogs.js';

// 大白熊犬：站在左邊池畔 → 跳進水裡濺起水花 → 游一圈 → 從左上角的階梯走上岸 → 甩水 → 走回原位，一直循環
// 局部座標 +z 是頭的方向，原點在腳底

const WHITE = 0xf7f2ea;
const CREAM = 0xe9dcc4;

function pyrenees() {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0.62, 0);
  blob(body, [0.27, 0.26, 0.47], WHITE);
  blob(body, [0.25, 0.24, 0.22], WHITE, 0, 0.02, -0.33);
  blob(body, [0.25, 0.27, 0.22], WHITE, 0, 0.04, 0.32);
  blob(body, [0.21, 0.22, 0.2], WHITE, 0, 0.2, 0.44);
  const head = pivot(body, 0, 0.3, 0.56);
  blob(head, [0.16, 0.15, 0.17], WHITE);
  blob(head, [0.085, 0.075, 0.12], WHITE, 0, -0.05, 0.15);
  blob(head, 0.035, 0x1e1a18, 0, -0.02, 0.27);
  blob(head, [0.04, 0.012, 0.06], 0xe8707e, 0, -0.105, 0.18);
  const ears = [-1, 1].map((s) => {
    blob(head, 0.022, 0x1e1a18, s * 0.065, 0.04, 0.13);
    const e = pivot(head, s * 0.13, 0.05, -0.01);
    blob(e, [0.04, 0.11, 0.08], CREAM, 0, -0.08, 0);
    e.rotation.z = s * 0.25;
    return e;
  });
  const legs = [[-1, 0.3], [1, 0.3], [-1, -0.3], [1, -0.3]].map(([s, z]) => {
    const p = pivot(body, s * 0.135, -0.12, z);
    blob(p, [0.11, 0.15, 0.13], WHITE, 0, -0.08, 0);
    limb(p, [0, 0, 0], [0, -0.42, 0], 0.075, WHITE);
    blob(p, [0.08, 0.05, 0.1], WHITE, 0, -0.47, 0.03);
    return p;
  });
  // 蓬鬆的捲尾巴
  const tail = pivot(body, 0, 0.08, -0.5);
  tail.rotation.order = 'YXZ'; // 先往後倒、再繞身體的垂直軸左右擺
  blob(tail, [0.11, 0.1, 0.15], WHITE, 0, 0.05, -0.1);
  blob(tail, [0.12, 0.12, 0.13], WHITE, 0, 0.17, -0.2);
  blob(tail, [0.1, 0.1, 0.1], WHITE, 0, 0.28, -0.17);
  blob(tail, [0.07, 0.07, 0.07], CREAM, 0, 0.34, -0.1);
  return { root, body, head, ears, legs, tail };
}

// ---------- 水花：飛濺的水滴 + 擴散的漣漪 ----------
function makeSplash(scene) {
  const dropGeo = new THREE.SphereGeometry(1, 8, 6);
  const drops = Array.from({ length: 80 }, () => {
    const m = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }));
    m.visible = false;
    m.renderOrder = 4;
    scene.add(m);
    return { m, v: new THREE.Vector3(), alive: false };
  });
  const ringGeo = new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 14 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf4fffc, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    m.renderOrder = 4;
    scene.add(m);
    return { m, age: 0, life: 1, r0: 0.3, grow: 1, peak: 0.6, alive: false };
  });
  let nextRing = 0;
  function ripple(x, z, { r0 = 0.25, grow = 1.1, life = 1.4, peak = 0.55 } = {}) {
    const r = rings[nextRing++ % rings.length];
    Object.assign(r, { age: 0, life, r0, grow, peak, alive: true });
    r.m.position.set(x, WATER_Y, z);
    r.m.visible = true;
  }
  function burst(x, z) {
    for (const d of drops) {
      const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.8;
      d.v.set(Math.cos(a) * sp, 2.0 + Math.random() * 3.0, Math.sin(a) * sp);
      d.m.position.set(x + Math.cos(a) * 0.3, WATER_Y + 0.05, z + Math.sin(a) * 0.3);
      d.m.scale.setScalar(0.035 + Math.random() * 0.055);
      d.alive = d.m.visible = true;
    }
    ripple(x, z, { r0: 0.4, grow: 1.6, life: 1.8, peak: 0.8 });
    setTimeout(() => ripple(x, z, { r0: 0.3, grow: 1.2, life: 1.6, peak: 0.6 }), 250);
  }
  function update(dt, t) {
    for (const d of drops) {
      if (!d.alive) continue;
      d.v.y -= 7 * dt;
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < WATER_Y + waveH(d.m.position.x, d.m.position.z, t)) {
        d.alive = d.m.visible = false;
        if (Math.random() < 0.15) ripple(d.m.position.x, d.m.position.z, { r0: 0.04, grow: 0.35, life: 0.7, peak: 0.45 });
      }
    }
    for (const r of rings) {
      if (!r.alive) continue;
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) { r.alive = r.m.visible = false; continue; }
      r.m.scale.setScalar(r.r0 + r.grow * Math.sqrt(k));
      r.m.material.opacity = r.peak * (1 - k);
      r.m.position.y = WATER_Y + waveH(r.m.position.x, r.m.position.z, t) + 0.012;
    }
  }
  return { burst, ripple, update };
}

// ---------- 路線和時間軸 ----------
const V = (x, z) => new THREE.Vector3(x, 0, z);
const A = V(-9.0, 0.6); // 池畔起跳點（面向 +x）
const B = V(-6.9, 0.6); // 落水點
const C = V(-6.0, -3.4); // 游到階梯前
const D = V(-8.75, -3.4); // 上岸的地方
const swimPath = new THREE.CatmullRomCurve3([B, V(-5.2, 2.3), V(-3.6, 1.6), V(-2.7, -0.6), V(-3.0, -2.6), V(-3.9, -3.9), V(-5.1, -3.9), C]);
const T = { jump: 2.5, land: 3.3, swim: 4.0, climb: 16.0, shake: 19.5, walk: 20.7, turn: 23.7, end: 24.3 };
const SWIM_Y = WATER_Y - 0.85; // 游泳時腳底的高度：背貼著水面，頭露出來

// 階梯的高度（平滑過渡），超出階梯就是水裡
const STEP_TOPS = [-0.5, -0.92, -1.34, -1.76];
function groundY(x) {
  const w = 0.48;
  if (x > POOL.x0 + 4 * w) return -9;
  let y = STEP_TOPS[3];
  for (let i = 3; i >= 0; i--) {
    const edge = POOL.x0 + i * w; // 這一階的左緣，再往左就是上一階（或池畔）
    const up = (i === 0 ? 0 : STEP_TOPS[i - 1]) - STEP_TOPS[i];
    y += up * THREE.MathUtils.smoothstep(-x, -edge - 0.18, -edge + 0.18);
  }
  return y;
}
const ease = (u) => u * u * (3 - 2 * u);
const lerpAngle = (a, b, u) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * u;

export function buildPyrenees(scene, sound = null) {
  const dog = pyrenees();
  dog.root.scale.setScalar(1.15);
  scene.add(dog.root);
  const fx = makeSplash(scene);
  let lastT = null, lastP = null, nextRipple = 0;
  const tmp = new THREE.Vector3();

  return function update(t) {
    const dt = lastT === null ? 0 : Math.min(Math.max(t - lastT, 0), 0.05);
    lastT = t;
    const p = t % T.end;
    const R = dog.root;
    let x = A.x, z = A.z, y = 0, yaw = Math.PI / 2, pitch = 0, roll = 0, crouch = 0;
    let walk = 0, swim = 0, jump = 0; // 腳的動作權重

    if (p < T.jump) {
      crouch = 0.12 * ease(THREE.MathUtils.clamp((p - (T.jump - 0.5)) / 0.5, 0, 1));
    } else if (p < T.land) {
      const u = (p - T.jump) / (T.land - T.jump);
      x = THREE.MathUtils.lerp(A.x, B.x, u);
      z = THREE.MathUtils.lerp(A.z, B.z, u);
      y = THREE.MathUtils.lerp(0, SWIM_Y - 0.3, u) + 1.4 * 4 * u * (1 - u);
      pitch = THREE.MathUtils.lerp(-0.5, 0.75, u);
      jump = 1;
    } else if (p < T.swim) {
      const u = (p - T.land) / (T.swim - T.land);
      x = B.x; z = B.z;
      const tg = swimPath.getTangentAt(0);
      yaw = lerpAngle(Math.PI / 2, Math.atan2(tg.x, tg.z), ease(u));
      y = SWIM_Y - 0.3 * (1 - u) * (1 - u) + waveH(x, z, t) * u;
      pitch = THREE.MathUtils.lerp(0.75, -0.3, ease(u));
      swim = u; jump = 1 - u;
    } else if (p < T.climb) {
      const u = (p - T.swim) / (T.climb - T.swim);
      swimPath.getPointAt(u, tmp);
      x = tmp.x; z = tmp.z;
      const tg = swimPath.getTangentAt(u);
      yaw = Math.atan2(tg.x, tg.z);
      y = SWIM_Y + waveH(x, z, t);
      pitch = -0.3;
      swim = 1;
    } else if (p < T.shake) {
      const u = (p - T.climb) / (T.shake - T.climb);
      x = THREE.MathUtils.lerp(C.x, D.x, ease(u) * 0.3 + u * 0.7);
      z = C.z;
      yaw = -Math.PI / 2;
      const sy = SWIM_Y + waveH(x, z, t), gy = groundY(x);
      y = Math.max(sy, gy);
      walk = THREE.MathUtils.clamp((gy - sy) / 0.25 + 0.5, 0, 1);
      swim = 1 - walk;
      pitch = -0.3 * swim - 0.2 * walk * (gy < -0.05 ? 1 : 0);
    } else if (p < T.walk) {
      // 上岸甩水：身體快速左右扭
      const u = (p - T.shake) / (T.walk - T.shake);
      x = D.x; z = D.z; yaw = -Math.PI / 2;
      roll = 0.38 * Math.sin(u * Math.PI * 14) * Math.sin(u * Math.PI);
    } else if (p < T.turn) {
      const u = (p - T.walk) / (T.turn - T.walk);
      yaw = lerpAngle(-Math.PI / 2, 0, ease(THREE.MathUtils.clamp(u / 0.25, 0, 1)));
      const m = ease(THREE.MathUtils.clamp((u - 0.1) / 0.9, 0, 1));
      x = THREE.MathUtils.lerp(D.x, A.x, m);
      z = THREE.MathUtils.lerp(D.z, A.z, m);
      walk = 1;
    } else {
      const u = (p - T.turn) / (T.end - T.turn);
      yaw = lerpAngle(0, Math.PI / 2, ease(u));
      walk = 0.6;
    }

    R.position.set(x, y, z);
    R.rotation.set(0, yaw, 0);
    dog.body.rotation.set(pitch, 0, roll);
    dog.body.position.y = 0.62 - crouch;
    dog.head.rotation.x = -pitch * 0.6 + (swim > 0.5 ? -0.15 : 0);
    dog.head.rotation.z = -roll * 0.6;

    // 腳：走路、狗爬式、跳躍伸展三種姿勢按權重混合
    const ws = 7 * t, ss = 5.5 * t;
    const ph = [0, Math.PI, Math.PI, 0];
    dog.legs.forEach((leg, i) => {
      const front = i < 2;
      const a = walk * 0.45 * Math.sin(ws + ph[i]) + swim * (0.35 + 0.95 * Math.sin(ss + ph[i])) + jump * (front ? -1.1 : 0.9);
      leg.rotation.x = a + (front ? 0 : crouch * 2);
    });
    // 岸上快快搖；游泳時尾巴放平浮在水面，左右大幅度慢慢擺
    const sw = THREE.MathUtils.clamp(swim, 0, 1);
    dog.tail.rotation.y = THREE.MathUtils.lerp(0.45 * Math.sin(t * 9), 0.6 * Math.sin(t * 1.7), sw);
    dog.tail.rotation.x = 0.9 * sw;
    dog.ears.forEach((e, i) => (e.rotation.z = (i ? 1 : -1) * (0.25 + (jump > 0.5 ? 0.9 : 0) + roll * 1.5)));

    // 事件：落水濺水花、上岸甩水；游泳時頭前面一直冒出小漣漪和划水聲
    if (lastP !== null) {
      const wrapped = p < lastP;
      const crossed = (k) => (!wrapped && lastP < k && p >= k) || (wrapped && p >= k);
      if (crossed(T.land)) { fx.burst(B.x, B.z); sound?.splash(B.x); }
      if (crossed(T.shake)) sound?.shake(x, T.walk - T.shake);
    }
    if (swim > 0.5 && t >= nextRipple) {
      const hx = x + Math.sin(yaw) * 0.55, hz = z + Math.cos(yaw) * 0.55;
      fx.ripple(hx, hz, { r0: 0.18, grow: 0.7, life: 1.3, peak: 0.45 });
      sound?.paddle(x);
      nextRipple = t + 0.45;
    }
    lastP = p;
    fx.update(dt, t);
  };
}
