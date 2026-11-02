// 會動的小東西：雲、笠雲、水紋、天鵝船、跳出水面的魚、富士急行、湖畔的車、白鷺、櫻花瓣、散步的人、樹搖、黃昏的燈。
// 每一樣都是時間 t 的函數，週期都整除 LOOP，所以整段可以無縫循環；點擊等互動是帶時間戳的事件，也在 update(t) 裡算。
import * as THREE from 'three';
import { flat, mesh, box, rng, lerp, clamp01, ease, INK, setNight, setDusk, setLamps, setWave } from './memphis.js';
import { M, PAL } from './world.js';
import { person, walk } from './people.js';

const TAU = Math.PI * 2;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fr = (x) => x - Math.floor(x);
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = (x) => Math.pow(clamp01(x), 3);
// 出現和消失都用長出來／縮回去，不會突然跳出來
const fadeEnds = (f, k = 8) => ease(clamp01(Math.min(f, 1 - f) * k));
// 壓扁再彈回（STYLE.md §5、§8）：先蹲 0.18 秒，再帶點過衝地彈回來
export function squash(dt) {
  if (dt < 0 || dt > 1.6) return 1;
  if (dt < 0.18) return lerp(1, 0.84, ease(dt / 0.18));
  const u = dt - 0.18;
  return 1 - 0.16 * Math.cos(u * 13) * Math.exp(-u * 4.2);
}

const WARM = new THREE.Color('#FFD36E'), GLASS = new THREE.Color('#BFE4FF'), WHITE = new THREE.Color('#FFFFFF'), DOOR = new THREE.Color('#FFE38A');

export function buildLife(world, LOOP) {
  const { W, lake, roadZ, RAILZ, FUJI, HT } = world;
  const R = rng(51), rr = (a, b) => a + (b - a) * R();
  W.updateMatrixWorld(true);
  for (const tr of world.trees) tr.wp = tr.g.getWorldPosition(new THREE.Vector3());   // 小山上的樹位置是相對小山的
  const inLake = () => { // 湖裡隨機一點（離岸邊有點距離）
    for (;;) { const x = rr(lake.LX0 + 10, lake.LX1 - 10), h = lake.hwz(x); if (h > 5) return V3(x, 0, lake.zc(x) + rr(-0.6, 0.6) * h); }
  };
  const foam = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const ev = { pokes: new Map(), ripples: [], fish: [], bursts: [], dusk: null };

  // ---------- 水紋：白色小波浪往西漂 ----------
  const squigGeo = (() => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(V3((i - 4) * 0.3, 0, Math.sin(i * 1.5) * 0.16)); return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.08, 5); })();
  const SQ = Array.from({ length: 70 }, () => ({ ph: R(), off: rr(-0.8, 0.8), k: R() < 0.5 ? 1 : 2, rot: rr(-0.3, 0.3) }));
  const squigs = new THREE.InstancedMesh(squigGeo, foam, SQ.length); squigs.userData.noOutline = true; squigs.frustumCulled = false; W.add(squigs);

  // ---------- 漣漪圈（魚跳、點湖面）----------
  const ringGeo = new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2);
  const RINGS = Array.from({ length: 14 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthWrite: false }));
    m.userData.noOutline = true; m.visible = false; W.add(m); return m;
  });

  // ---------- 魚：一段時間就有一條跳出水面 ----------
  const fishMat = M(PAL.coral, { pat: 1, patCol: '#FFB3A6', patScale: 0.2, shadow: false });
  const FISH = Array.from({ length: 4 }, () => {
    const g = new THREE.Group(); W.add(g);
    mesh(new THREE.SphereGeometry(0.5, 14, 10).scale(1.5, 0.75, 0.6), fishMat, 0, 0, 0, g);
    mesh(new THREE.ConeGeometry(0.42, 0.7, 4).rotateZ(Math.PI / 2), fishMat, -0.95, 0, 0, g);
    g.visible = false; return g;
  });
  const JUMPS = Array.from({ length: 7 }, (_, k) => ({ T: (k + 0.3 + rr(-0.2, 0.2)) * LOOP / 7, p: inLake(), a: rr(0, TAU) }));

  // ---------- 天鵝船兩艘 + 一艘手划小船 ----------
  const swanMat = M('#FFFFFF', { pat: 1, patCol: '#EEF0FF', patScale: 0.3 });
  const swan = () => {
    const g = new THREE.Group(); W.add(g);
    mesh(new THREE.SphereGeometry(1, 18, 12).scale(1.8, 0.75, 1.15), swanMat, 0, 0.35, 0, g);
    const neck = new THREE.CatmullRomCurve3([V3(1.2, 0.6, 0), V3(1.75, 1.4, 0), V3(1.45, 2.3, 0), V3(1.75, 2.75, 0)]);
    mesh(new THREE.TubeGeometry(neck, 16, 0.24, 8), swanMat, 0, 0, 0, g);
    mesh(new THREE.SphereGeometry(0.36, 12, 8), swanMat, 1.85, 2.8, 0, g);
    mesh(new THREE.ConeGeometry(0.15, 0.55, 8).rotateZ(-Math.PI / 2), M(PAL.yellow), 2.35, 2.75, 0, g);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.8, 12, 8).scale(1.3, 0.55, 0.5), swanMat, -0.2, 0.95, s * 0.95, g);
    mesh(box(1.4, 0.2, 1.3), M(PAL.pink, { pat: 4, patCol: '#FFFFFF', patScale: 0.25 }), -0.3, 0.9, 0, g);
    return g;
  };
  const rowboat = (() => {
    const g = new THREE.Group(); W.add(g);
    mesh(new THREE.CylinderGeometry(0.9, 0.6, 4.2, 12, 1).rotateZ(Math.PI / 2).scale(1, 0.45, 0.75), M('#FF9C6B'), 0, 0.35, 0, g);
    const p = person(g, { col: PAL.cobalt, hat: PAL.yellow }); p.g.position.set(-0.4, 0.3, 0); p.g.scale.setScalar(0.75);
    const oars = [-1, 1].map((s) => { const o = new THREE.Group(); o.position.set(-0.2, 1.0, s * 0.55); g.add(o); mesh(box(0.12, 0.08, 2.2).translate(0, 0, s * 1.1), M('#A8705A'), 0, 0, 0, o); return o; });
    return { g, oars };
  })();
  const BOATS = [
    { g: swan(), c: V3(34, 0, 0), rx: 16, rz: 0.42, n: 1, ph: 0.1 },
    { g: swan(), c: V3(-58, 0, 0), rx: 13, rz: 0.36, n: -1, ph: 0.6 },
    { g: rowboat.g, c: V3(-2, 0, 0), rx: 20, rz: 0.4, n: -1, ph: 0.35, row: true },
  ];
  for (const b of BOATS) b.c.z = lake.zc(b.c.x);

  // ---------- 富士急行：從西邊進站、停一下、往東開走 ----------
  const train = new THREE.Group(); W.add(train);
  {
    const body = M('#FFF4DD', { pat: 6, patCol: '#F6E6C8', patScale: 0.6 });
    const band = M(PAL.coral), roof = M(PAL.plum), glass = flat('#BFE4FF', { lit: true });
    for (const [x, front] of [[0, true], [-9.6, false]]) {
      mesh(box(9, 2.5, 2.6), body, x, 0.55, 0, train);
      mesh(box(9.05, 0.45, 2.65), band, x, 1.0, 0, train);
      mesh(box(8.2, 0.75, 2.66), glass, x, 2.0, 0, train);
      mesh(box(9, 0.25, 2.4), roof, x, 3.05, 0, train);
      for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 10).rotateX(Math.PI / 2), M(INK), x + s * 3, 0.5, 1.25, train);
      if (front) { const n = mesh(box(1.2, 2.2, 2.5), M(PAL.coral), 5, 0.55, 0, train); n.rotation.z = -0.25; }
    }
  }

  // ---------- 湖畔道路上的車 ----------
  const CARS = [PAL.coral, PAL.yellow, '#5EDFB0', PAL.cobalt, '#B9A0FF'].map((col, i) => {
    const g = new THREE.Group(); W.add(g);
    const b = new THREE.Group(); g.add(b);
    mesh(box(3.6, 1.0, 1.8), M(col), 0, 0.35, 0, b);
    mesh(box(2.0, 0.8, 1.6), M('#FFFFFF'), -0.2, 1.35, 0, b);
    mesh(box(2.05, 0.5, 1.65), flat('#BFE4FF', { lit: true }), -0.2, 1.5, 0, b);
    for (const sx of [-1.1, 1.1]) for (const sz of [-0.85, 0.85]) mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12).rotateX(Math.PI / 2), M(INK), sx, 0.38, sz, g);
    const dir = i % 2 ? -1 : 1;
    return { g, b, dir, lane: dir * 0.95, ph: i / 5 + rr(-0.05, 0.05) };
  });

  // ---------- 白鷺：五隻排成斜線，在湖和田上空繞一大圈 ----------
  const birdMat = M('#FFFFFF', { pat: 1, patCol: '#EEF0FF', patScale: 0.25 });
  const BIRDS = Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Group(); W.add(g);
    mesh(new THREE.SphereGeometry(0.5, 12, 8).scale(1.6, 0.6, 0.6), birdMat, 0, 0, 0, g);
    mesh(new THREE.SphereGeometry(0.25, 10, 8), birdMat, 0.95, 0.25, 0, g);
    mesh(new THREE.ConeGeometry(0.08, 0.5, 6).rotateZ(-Math.PI / 2), M(PAL.yellow), 1.4, 0.22, 0, g);
    const wings = [-1, 1].map((s) => { const w = new THREE.Group(); g.add(w); mesh(box(0.8, 0.08, 1.7).translate(0, 0, s * 0.85), birdMat, 0, 0.1, 0, w); return { w, s }; });
    return { g, wings, i, ph: rr(0, TAU) };
  });

  // ---------- 櫻花瓣：從湖畔的櫻花樹飄下來 ----------
  const sakura = world.trees.filter((t) => t.sakura);
  const petalGeo = new THREE.CircleGeometry(0.22, 6).scale(1, 0.6, 1);
  const PETAL_N = 120, BURST_N = 60;
  const petalMats = [new THREE.MeshBasicMaterial({ color: '#FF9EC8', side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide })];
  const petals = petalMats.map((m) => { const im = new THREE.InstancedMesh(petalGeo, m, (PETAL_N + BURST_N) / 2); im.userData.noOutline = true; im.frustumCulled = false; W.add(im); return im; });
  const PET = Array.from({ length: PETAL_N }, (_, i) => ({ t: sakura[i % sakura.length], n: [4, 5, 8][i % 3], ph: R(), ox: rr(-1.5, 1.5), oz: rr(-1.5, 1.5), sp: rr(0, TAU) }));

  // ---------- 湖畔散步的人 ----------
  const WALK = [PAL.coral, '#14B8A0', '#B9A0FF', PAL.yellow, PAL.pink, PAL.cobalt].map((col, i) => ({
    p: person(W, { col, hat: i % 2 ? PAL.yellow : undefined }), x0: -80 + i * 27 + rr(-4, 4), dir: i % 2 ? 1 : -1, ph: R(),
  }));

  // ---------- 一格 ----------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  const pagodaPos = world.pagoda.g.getWorldPosition(new THREE.Vector3());

  function update(t) {
    const L = t / LOOP;
    const poke = (o) => (ev.pokes.has(o) ? t - ev.pokes.get(o) : 99);

    // 雲：從西往東飄過去，兩端長出來／縮回去
    for (const c of world.clouds) {
      const f = fr(L + c.userData.ph), k = fadeEnds(f, 6);
      c.position.set(-190 + 380 * f, c.userData.y + Math.sin(f * TAU * 2) * 0.8, c.userData.z);
      c.scale.setScalar(Math.max(0.001, c.userData.s * k));
    }
    // 富士山被點：蹲一下彈回來，笠雲跟著鼓起來
    const sf = squash(poke(world.fuji));
    world.fuji.scale.set(1 + (1 - sf) * 0.35, sf, 1 + (1 - sf) * 0.35);
    const cap = world.capCloud, cd = poke(world.fuji) - 0.25;
    const puff = cd > 0 && cd < 3 ? 0.45 * Math.sin(Math.min(cd * 2.6, Math.PI / 2)) * Math.exp(-cd * 1.2) : 0;
    cap.position.y = (HT + 5.5) * sf;
    cap.rotation.y = L * TAU;
    cap.scale.set(1 + 0.04 * Math.sin(L * TAU * 4) + puff, 1 + 0.06 * Math.sin(L * TAU * 4 + 1) + puff * 0.6, 1 + 0.04 * Math.sin(L * TAU * 4) + puff);

    // 房子、五重塔被點：蹲一下彈回來
    for (const h of world.houses) { const s = squash(poke(h)); h.g.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); }
    { const p = world.pagoda, s = squash(poke(p)); p.g.scale.set(1 + (1 - s) * 0.5, s, 1 + (1 - s) * 0.5); }

    // 樹：各自的相位慢慢搖；被點的那棵抖一下
    for (const tr of world.trees) {
      const d = poke(tr), shake = d < 2 ? 0.22 * Math.sin(d * 22) * Math.exp(-d * 3.5) : 0;
      tr.c.rotation.z = 0.035 * Math.sin(L * TAU * 5 + tr.ph) + shake;
      tr.c.rotation.x = 0.025 * Math.cos(L * TAU * 4 + tr.ph * 1.3);
    }

    // 水紋
    SQ.forEach((q, i) => {
      const x = lerp(lake.LX1, lake.LX0, fr(q.ph + L * q.k)), h = lake.hwz(x);
      const s = clamp01((h - 1.5) / 3) * (0.75 + 0.25 * Math.sin(L * TAU * 6 + i));
      _m.compose(_p.set(x, 0.13, lake.zc(x) + q.off * h * 0.78), _q.setFromEuler(_e.set(0, q.rot, 0)), _s.set(s, 1, s));
      squigs.setMatrixAt(i, _m);
    });
    squigs.instanceMatrix.needsUpdate = true;

    // 魚跳：固定排程 + 點湖面時多跳一條；落水處有漣漪
    const jumps = JUMPS.map((j) => ({ ...j, d: fr((t - j.T) / LOOP) * LOOP })).concat(ev.fish.map((j) => ({ ...j, d: t - j.t0 })));
    let fi = 0;
    for (const f of FISH) f.visible = false;
    const ripples = [];
    for (const j of jumps) {
      if (j.d < 0 || j.d > 3) continue;
      ripples.push({ x: j.p.x, z: j.p.z, d: j.d });
      const ex = j.p.x + Math.cos(j.a) * 3.2, ez = j.p.z + Math.sin(j.a) * 3.2;
      ripples.push({ x: ex, z: ez, d: j.d - 1.0 });
      if (j.d < 1.0 && fi < FISH.length) {
        const f = FISH[fi++], u = j.d / 1.0;
        f.visible = true;
        f.position.set(lerp(j.p.x, ex, u), 0.1 + 2.6 * 4 * u * (1 - u), lerp(j.p.z, ez, u));
        f.rotation.set(0, -j.a, (1 - 2 * u) * 1.1);
        f.scale.setScalar(Math.sin(Math.PI * u) * 0.4 + 0.6);
      }
    }
    for (const r of ev.ripples) ripples.push({ x: r.x, z: r.z, d: t - r.t0 }, { x: r.x, z: r.z, d: t - r.t0 - 0.3 });
    let ri = 0;
    for (const r of ripples) {
      if (r.d < 0 || r.d > 1.8 || ri >= RINGS.length) continue;
      const m = RINGS[ri++], u = r.d / 1.8;
      m.visible = true; m.position.set(r.x, 0.14, r.z); m.scale.setScalar(0.4 + 3.6 * easeOut(u)); m.material.opacity = 1 - u;
    }
    for (; ri < RINGS.length; ri++) RINGS[ri].visible = false;
    ev.ripples = ev.ripples.filter((r) => t - r.t0 < 3); ev.fish = ev.fish.filter((j) => t - j.t0 < 4);

    // 船：沿著湖裡的橢圓慢慢繞，上下晃
    for (const b of BOATS) {
      const a = (L * b.n + b.ph) * TAU, x = b.c.x + Math.cos(a) * b.rx, z = b.c.z + Math.sin(a) * lake.hwz(x) * b.rz * 2.1;
      const nx = b.c.x + Math.cos(a + 0.01 * b.n) * b.rx, nz = b.c.z + Math.sin(a + 0.01 * b.n) * lake.hwz(nx) * b.rz * 2.1;
      b.g.position.set(x, 0.08 + 0.06 * Math.sin(L * TAU * 10 + b.ph * 7), z);
      b.g.rotation.set(0.04 * Math.sin(L * TAU * 8 + b.ph), -Math.atan2(nz - z, nx - x), 0.03 * Math.sin(L * TAU * 10));
      if (b.row) for (const o of rowboat.oars) o.rotation.y = 0.5 * Math.sin(L * TAU * 16);
    }

    // 電車：進站減速、停 6 秒、出站加速（車頭會微微點一下頭）
    {
      const xAt = (u) => (u < 12 ? lerp(-200, 6, easeOut(u / 12)) : u < 18 ? 6 : u < 30 ? lerp(6, 220, easeIn((u - 18) / 12)) : 220);
      const u = fr(L) * LOOP, x = xAt(u);
      const acc = xAt(u + 0.1) - 2 * x + xAt(Math.max(0, u - 0.1));
      train.position.set(x, 0.2, RAILZ);
      train.rotation.z = THREE.MathUtils.clamp(-acc * 0.6, -0.025, 0.025);
      train.visible = x > -195 && x < 215;
    }

    // 車：沿著彎彎的湖畔路跑，跟著路面轉向
    for (const c of CARS) {
      const f = fr(c.ph + c.dir * L * 2), x = lerp(-210, 210, f), z = roadZ(x) + c.lane;
      const dz = roadZ(x + 1) - roadZ(x);
      c.g.position.set(x, 0.05, z);
      c.g.rotation.y = -Math.atan2(c.dir * dz, c.dir);
      c.b.position.y = 0.04 * Math.sin(L * TAU * 40 + c.ph * 9);
      c.b.rotation.z = 0.012 * Math.sin(L * TAU * 23 + c.ph * 5);
    }

    // 白鷺：繞一大圈，翅膀拍動
    for (const b of BIRDS) {
      const a = L * TAU + 0.6, cx = -10, cz = 6, rx = 105, rz = 58;
      const back = b.i * 2.6, side = (b.i % 2 ? 1 : -1) * Math.ceil(b.i / 2) * 2.2;
      const x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz;
      const tx = -Math.sin(a) * rx, tz = Math.cos(a) * rz, tl = Math.hypot(tx, tz), hx = tx / tl, hz = tz / tl;
      b.g.position.set(x - hx * back - hz * side, 24 + Math.sin(L * TAU * 3 + b.i) * 1.2, z - hz * back + hx * side);
      b.g.rotation.set(0, -Math.atan2(hz, hx), 0.2);
      const flap = Math.sin(L * TAU * 60 + b.ph);
      for (const w of b.wings) w.w.rotation.x = w.s * flap * 0.55;
    }

    // 花瓣：從樹冠飄落，邊落邊往東飄；點樹或五重塔會噴出一陣
    let pi = [0, 0];
    const putPetal = (k, x, y, z, rot, s) => {
      const im = petals[k % 2]; _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rot, rot * 1.7, rot * 0.6)), _s.set(s, s, s));
      im.setMatrixAt(pi[k % 2]++, _m);
    };
    PET.forEach((p, i) => {
      const f = fr(L * p.n + p.ph), tr = p.t, sc = tr.g.scale.x;
      const y0 = tr.wp.y + 4.2 * sc, y = lerp(y0, tr.wp.y > 1 ? tr.wp.y * 0.7 : 0.12, f);
      const x = tr.wp.x + p.ox + f * 7 + Math.sin(f * TAU * 2 + p.sp) * 0.9, z = tr.wp.z + p.oz + Math.cos(f * TAU * 1.5 + p.sp) * 0.7;
      putPetal(i, x, y, z, f * 9 + p.sp, fadeEnds(f, 10));
    });
    let bi = 0;
    for (const b of ev.bursts) {
      const d = t - b.t0;
      for (let k = 0; k < 30 && bi < BURST_N; k++, bi++) {
        const a = k * 2.4, sp = 3 + (k % 5), u = clamp01(d / 3.2);
        const x = b.x + Math.cos(a) * sp * easeOut(u) + u * 4, z = b.z + Math.sin(a) * sp * easeOut(u);
        const y = Math.max(0.12, b.y + 3 * Math.sin(Math.min(u * 3, 1) * Math.PI / 2) - u * u * (b.y + 3));
        putPetal(bi, x, y, z, d * 5 + k, d > 3.2 ? 0.0001 : 1 - easeIn((d - 2.4) / 0.8));
      }
    }
    for (; bi < BURST_N; bi++) putPetal(bi, 0, -10, 0, 0, 0.0001);
    for (const im of petals) im.instanceMatrix.needsUpdate = true;
    ev.bursts = ev.bursts.filter((b) => t - b.t0 < 3.4);

    // 散步的人：沿著路邊走，兩端縮回去再從另一頭長出來
    for (const w of WALK) {
      const f = fr(w.ph + L), x = w.x0 + w.dir * (f - 0.5) * 40, z = roadZ(x) + 3.1;
      walk(w.p, x, z, w.dir > 0 ? 0 : Math.PI, f * 40 * 2.4);
      w.p.g.scale.setScalar(Math.max(0.001, fadeEnds(f, 10)));
    }

    // 黃昏：富士山先蹲一下，光環從山腳擴散，掃到哪裡燈就亮到哪裡
    let night = 0, ring = -1, on = false;
    if (ev.dusk) {
      const d = t - ev.dusk.t0 - 0.45;
      on = ev.dusk.on;
      night = 0.56 * (on ? ease(d / 2.2) : 1 - ease(d / 1.6));
      ring = Math.max(0, d) * 65;
    }
    setNight(night); setDusk(0.78);   // 黃昏偏橘粉（STYLE.md §3），不是整片變灰
    setWave(on ? ring : 1e5, FUJI.x, FUJI.z);
    const lamps = [];
    const litAt = (p) => (on ? Math.hypot(p.x - FUJI.x, p.z - FUJI.z) < ring : ev.dusk && !on && night > 0.02 && Math.hypot(p.x - FUJI.x, p.z - FUJI.z) > ring);
    for (const h of world.houses) {
      const lit = litAt(h.p) || h.manual;
      if (h.glass) { h.glass.uniforms.uEmit.value = lit ? 1 : 0; h.glass.uniforms.uCol.value.copy(lit ? WARM : GLASS); }
      if (h.lamp) { h.lamp.uniforms.uEmit.value = lit ? 1 : 0; h.lamp.uniforms.uCol.value.copy(lit ? WARM : DOOR); }
      if (lit) lamps.push([h.lampAt.x, 2.4, h.lampAt.z, 2.6]);
    }
    for (const l of world.lamps) {
      const lit = litAt(l.p);
      l.head.uniforms.uEmit.value = lit ? 1 : 0; l.head.uniforms.uCol.value.copy(lit ? WARM : WHITE);
      if (lit) lamps.push([l.p.x, 3.5, l.p.z, 3.4]);
    }
    setLamps(lamps);
  }

  // 互動：被點到的東西
  function poke(kind, ref, point, t) {
    if (kind === 'fuji') ev.pokes.set(world.fuji, t);
    else if (kind === 'house') { ev.pokes.set(ref, t); ref.manual = !ref.manual; }
    else if (kind === 'pagoda') { ev.pokes.set(ref, t); ev.bursts.push({ x: pagodaPos.x, y: pagodaPos.y + 8, z: pagodaPos.z, t0: t + 0.2 }); }
    else if (kind === 'tree') { ev.pokes.set(ref, t); if (ref.sakura) ev.bursts.push({ x: ref.wp.x, y: ref.wp.y + 4, z: ref.wp.z, t0: t }); }
    else if (kind === 'water') {
      ev.ripples.push({ x: point.x, z: point.z, t0: t });
      ev.fish.push({ t0: t + 0.35, p: V3(point.x, 0, point.z), a: R() * TAU });
    }
  }
  function toggleDusk(t) {
    const on = !(ev.dusk && ev.dusk.on);
    ev.dusk = { on, t0: t };
    ev.pokes.set(world.fuji, t);
    return on;
  }
  return { update, poke, toggleDusk };
}
