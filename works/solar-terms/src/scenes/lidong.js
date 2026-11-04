// 立冬・台東池上：二期稻收割。金黃、割完、翻過土、冒出綠芽的田一格一格；收割機一條一條割過去，白鷺跟在後面。
// 伯朗大道上有人騎腳踏車，路邊一棵大茄苳樹；遠處是中央山脈，東邊的小村子路口有一攤薑母鴨在冒煙。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, ribbon, tree, sway, house, cyclist, ride, car, driveAlong, bird, flap, clouds, steam, bursts, squiggles, ridge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(1107);
  const clickables = [];
  const ev = { tree: -9, combine: -9, stall: -9, bike: [-9, -9, -9] };
  const leaves = bursts(W, ['#3CBE7E', '#9BE15D', '#FFD234']);

  // ---------- 田 ----------
  const MAT = {
    gold: M('#FFD234', { pat: 4, patCol: '#F5B21C', patScale: 0.9 }),
    cut: M('#F6CF9A', { pat: 6, patCol: '#E7AF72', patScale: 0.8 }),
    plow: M('#EE9C7C', { pat: 2, patCol: '#DE8362', patScale: 1.1 }),
    sprout: M('#9BE15D', { pat: 1, patCol: '#7FCC45', patScale: 0.7 }),
    straw: M('#FFE08A'),
  };
  const COLS = [-58, -43, -28, -13, 6, 21, 36, 51], ROWS = [-36, -25, -14.5, -2.5, 8.5, 19.5, 30.5, 46, 57];
  const HX = 21, HZ = 8.5;                       // 正在收割的那一塊
  const b = new Batch();
  let k = 0;
  for (const x of COLS) for (const z of ROWS) {
    k++;
    if (x >= 36 && z <= -14) continue;            // 東北角是村子
    if (x === 36 && z === 46) continue;           // 路口的攤子
    if (x === HX && z === HZ) continue;
    const r = fr(Math.sin(k * 91.7) * 4375.5);
    const kind = r < 0.42 ? 'gold' : r < 0.72 ? 'cut' : r < 0.86 ? 'plow' : 'sprout';
    slab(b, MAT[kind], x, z, 14, 10, kind === 'gold' ? 0.9 : 0.3, 0, 0.5);
    if (kind === 'cut') for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      if (R() < 0.35) continue;
      b.add(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8), MAT.straw, x - 5 + i * 3.3 + rr(-0.3, 0.3), 0.7, z - 3.2 + j * 3.2 + rr(-0.3, 0.3));
      b.add(new THREE.ConeGeometry(0.42, 0.5, 8), MAT.straw, x - 5 + i * 3.3, 1.35, z - 3.2 + j * 3.2);
    }
  }
  // 收割中的田：底下是割完的稻梗，上面 8 條還站著的稻子
  slab(b, MAT.cut, HX, HZ, 14, 10, 0.3, 0, 0.5);
  b.build(W, { cast: false });
  const NS = 8, SW = 14 / NS, Z0 = HZ - 5, Z1 = HZ + 5;
  const strips = Array.from({ length: NS }, (_, i) => {
    const m = mesh(box(SW - 0.05, 0.9, 1).translate(0, 0, 0.5), MAT.gold, HX - 7 + SW * (i + 0.5), 0, Z0, W);
    m.scale.z = 10; m.receiveShadow = true;
    return m;
  });

  // ---------- 路：伯朗大道（南北）、田南邊的產業道路（東西）、圳溝 ----------
  const road = dots('#FFF1D6', 1.1, '#FFE2AE');
  const rb = new Batch();
  rb.add(box(4.2, 0.35, 96), road, -3.5, 0, -8);
  rb.add(box(150, 0.35, 3.8), road, 0, 0, 38);
  rb.add(box(150, 0.12, 1.7), dots('#5CC8FF', 0.8, '#8ED8F7'), 0, 0.02, -8.5);
  rb.add(box(5, 0.5, 2.6), M('#FFFFFF'), -3.5, 0.2, -8.5);             // 圳溝上的小橋
  rb.add(box(5, 0.3, 0.3), M(PAL.coral), -3.5, 0.7, -9.7); rb.add(box(5, 0.3, 0.3), M(PAL.coral), -3.5, 0.7, -7.3);
  rb.build(W, { cast: false });
  const flow = squiggles(W, R, 26, () => V3(rr(-70, 70), 0.05, -8.5 + rr(-0.3, 0.3)), [1, 0], 3, LOOP);

  // ---------- 遠山：中央山脈（後排藍紫條紋）、前排青綠的山腳 ----------
  const mb = new Batch();
  ridge(mb, [[-110, -95, 38, 44, 6], [-70, -100, 34, 52, 5], [-30, -104, 40, 58, 6], [15, -100, 36, 50, 5], [55, -104, 42, 60, 6], [100, -98, 36, 46, 5]], stripes('#7584FF', 2.4, '#8E9BFF', 2));
  ridge(mb, [[-95, -74, 26, 24, 7], [-55, -78, 30, 28, 6], [-12, -76, 24, 22, 7], [28, -79, 30, 30, 6], [70, -76, 26, 24, 7], [108, -78, 24, 20, 6]], dots('#2FCB7A', 1.4, '#1FA862'));
  mb.build(W);
  const tb = new Batch();
  for (let i = 0; i < 60; i++) { const x = rr(-110, 110), z = rr(-62, -50); tb.add(new THREE.SphereGeometry(rr(2, 3.6), 10, 8).scale(1, 0.8, 1), CROWN.green.main, x, 1.2, z); }
  tb.build(W);
  const drift = clouds(W, R, [[-60, 23, 7, 1.28], [20, 33, 9, 1.52], [70, 34, 11, 1.12], [-20, 33, 8, 1.2], [40, 34, 10, 0.96]], LOOP);

  // ---------- 茄苳樹 ----------
  const bigTree = tree(W, R, -11, -13, 'cloud', CROWN.green, 2.5);
  tag(bigTree.g, 'tree', bigTree, clickables);
  const roadTrees = [];
  for (const z of [26, 14]) roadTrees.push(tree(W, R, -8.4, z, 'egg', CROWN.lime, 1.1));

  // ---------- 東北角的小村子 ----------
  const homes = [[42, -34, 0], [54, -32, 1], [44, -21, 2], [57, -19, 3]].map(([x, z, i]) => house(W, x, z, { i: i + 1, w: 7, d: 5.5 }));
  const vt = [];
  for (const [x, z, kind, cs] of [[36, -28, 'round', CROWN.teal], [49, -27, 'column', CROWN.green], [63, -26, 'cone', CROWN.pine], [37, -16, 'egg', CROWN.lime], [64, -12, 'round', CROWN.green]]) vt.push(tree(W, R, x, z, kind, cs, 1.15));

  // ---------- 路口的薑母鴨攤：條紋遮雨棚、大鍋、紅燈籠 ----------
  const stall = new THREE.Group(); stall.position.set(30, 0, 44); W.add(stall);
  const sb = new Batch();
  sb.add(box(6, 1.0, 2.4), stripes('#FFFFFF', 0.4, '#EDE6F7'), 0, 0, 0);
  for (const x of [-2.9, 2.9]) for (const z of [-1.3, 1.3]) sb.add(box(0.2, 3.6, 0.2), M(PAL.plum), x, 0, z);
  sb.add(new THREE.BoxGeometry(6.8, 0.25, 3.6), M(PAL.coral, { pat: 4, patCol: '#FFFFFF', patScale: 0.5 }), 0, 3.75, 0.2, 0.18, 0, 0);
  sb.add(new THREE.CylinderGeometry(0.85, 0.7, 0.8, 16).translate(0, 0.4, 0), M('#4A4468'), -1.3, 1.0, 0);
  sb.add(new THREE.CylinderGeometry(0.75, 0.75, 0.25, 16).translate(0, 0.125, 0), M(PAL.peach), 1.4, 1.0, 0.2);
  sb.add(new THREE.SphereGeometry(0.42, 12, 10).scale(1, 1.25, 1), M(PAL.coral), 2.3, 3.0, 1.3);
  sb.add(box(1.8, 1.1, 0.12), M(PAL.yellow), -1.2, 3.9, 1.85);
  for (let i = 0; i < 4; i++) sb.add(new THREE.CylinderGeometry(0.35, 0.3, 0.5, 10).translate(0, 0.25, 0), M(['#FF7EB3', '#5CC8FF', '#5EDFB0', '#FFD234'][i]), -2.4 + i * 1.6, 0, 2.6);
  sb.build(stall);
  tag(stall, 'stall', null, clickables);
  const smoke = steam(W, R, [[28.7, 2.0, 44, 1]], 6, 2.6);

  // ---------- 收割機 ----------
  const combine = new THREE.Group(); W.add(combine);
  const cb = new Batch();
  for (const x of [-1.05, 1.05]) cb.add(box(0.6, 0.7, 3.4), M('#25214A'), x, 0, 0);
  cb.add(box(2.4, 1.5, 3.2), stripes(PAL.coral, 0.4, '#E8464C'), 0, 0.6, 0);
  cb.add(box(1.4, 1.4, 1.3), M('#FFFFFF'), -0.4, 2.1, -0.7);
  cb.add(box(1.45, 0.75, 1.35), M('#BFE4FF', { lit: true }), -0.4, 2.45, -0.7);
  cb.add(box(1.0, 1.2, 1.4), stripes(PAL.yellow, 0.3, '#F5B21C'), 0.65, 2.1, 0.8);
  cb.add(box(2.8, 0.5, 0.9), M(PAL.plum), 0, 0.25, -2.0);
  cb.add(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 6).translate(0, 0.7, 0), M('#FFFFFF'), 1.0, 2.1, 1.2);
  cb.build(combine);
  const reel = new THREE.Group(); reel.position.set(0, 0.9, -2.3); combine.add(reel);
  mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.7, 6).rotateZ(Math.PI / 2), M(PAL.yellow), 0, 0, 0, reel);
  tag(combine, 'combine', null, clickables);
  const egrets = Array.from({ length: 4 }, () => bird(W, '#FFFFFF', 1.1));
  // 收割機的時間表：8 條，一條 2.6 秒，來回割；割完開出去，稻子在下一輪前長回來
  const TS = 2.6, TH = NS * TS;
  function combineAt(lt) {
    const u = fr(lt / LOOP) * LOOP;
    if (u < TH) {
      const i = Math.floor(u / TS), f = ease((u - i * TS) / TS), up = i % 2 === 0;
      return { x: HX - 7 + SW * (i + 0.5), z: up ? lerp(Z1 + 2, Z0 - 2, f) : lerp(Z0 - 2, Z1 + 2, f), rot: up ? 0 : Math.PI, strip: i, up, working: true, back: 0 };
    }
    // 最後一條往南割完：沿著田的南邊往西開回第一條的起點，轉彎要順
    const f = ease((u - TH) / (LOOP - TH)), turnIn = ease(clamp01(f / 0.12)), turnOut = ease(clamp01((f - 0.86) / 0.14));
    return {
      x: lerp(HX + 7 - SW / 2, HX - 7 + SW / 2, ease(clamp01((f - 0.06) / 0.84))), z: lerp(lerp(Z1 + 2, Z1 + 3.2, turnIn), Z1 + 2, turnOut),
      rot: lerp(lerp(Math.PI, Math.PI / 2, turnIn), 0, turnOut), strip: NS, working: false, back: f,
    };
  }

  // ---------- 腳踏車、小貨車、飛過的白鷺 ----------
  const bikes = [[PAL.cobalt, PAL.yellow, 0], [PAL.pink, null, 0.37], [PAL.teal, PAL.coral, 0.7]].map(([col, hat, ph]) => ({ c: cyclist(W, { col, hat, bike: [PAL.coral, PAL.cobalt, PAL.yellow][Math.floor(ph * 3)] }), ph }));
  for (const bk of bikes) tag(bk.c.g, 'bike', bk, clickables);
  const truck = car(W, PAL.cobalt, 1.1);
  const southRoad = new THREE.CatmullRomCurve3([V3(-90, 0.35, 38.8), V3(90, 0.35, 38.8)]);
  const flock = Array.from({ length: 5 }, (_, i) => ({ b: bird(W, '#FFFFFF', 1.0), i }));

  return {
    bg: '#B8F0AE', clickables,
    view: { target: [4, 0, 5], span: 50, el: 31, az: 8, swing: 7, shadowR: 100 },
    update(t) {
      drift(t, 110, 4);
      flow(t);
      // 收割機和稻子
      const c = combineAt(t);
      combine.position.set(c.x, 0.05 + Math.sin(t * 14) * 0.03, c.z);
      combine.rotation.y = c.rot;
      const sq = squash(t - ev.combine); combine.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      reel.rotation.x = c.working ? -t * 5 : -t * 1.2;
      strips.forEach((st, i) => {
        let z0 = Z0, len = 10;
        if (c.working) {
          if (i < c.strip) len = 0;
          else if (i === c.strip) {
            if (c.up) len = clamp01((c.z - Z0) / 10) * 10;            // 往北割：剩下北邊那段
            else { z0 = Math.min(Z1, Math.max(Z0, c.z)); len = Z1 - z0; }
          }
        } else len = 10 * ease(clamp01((c.back - 0.3 - i * 0.06) / 0.2));   // 下一輪前一條一條長回來
        st.position.z = z0; st.scale.z = Math.max(0.001, len); st.visible = len > 0.02;
      });
      // 白鷺跟在收割機後面，偶爾跳起來
      const dx = -Math.sin(c.rot), dz = -Math.cos(c.rot);
      egrets.forEach((e, i) => {
        const lag = 3.2 + i * 1.5, side = (i % 2 ? 1 : -1) * (0.5 + i * 0.35);
        const ph = t * 1.4 + i * 1.7, hop = Math.max(0, Math.sin(ph * 2)) * (i === 2 ? 1.6 : 0.2);
        e.g.position.set(c.x - dx * lag - dz * side, 0.65 + hop, c.z - dz * lag + dx * side);
        e.g.rotation.y = Math.atan2(-dz, dx);
        flap(e, ph * 6, hop > 0.4 ? 0.9 : 0.12);
      });
      // 腳踏車沿著伯朗大道來回
      bikes.forEach((bk, i) => {
        const u = fr(t / LOOP + bk.ph), dir = u < 0.5 ? 1 : -1, f = u < 0.5 ? u * 2 : (u - 0.5) * 2;
        const z = dir > 0 ? lerp(40, -50, ease(f)) : lerp(-50, 40, ease(f));
        const x = -3.5 + (dir > 0 ? -0.9 : 0.9);
        const hop = Math.max(0, Math.sin(Math.PI * clamp01((t - ev.bike[i]) / 0.5))) * 0.8;
        ride(bk.c, x, z, dir > 0 ? -Math.PI / 2 : Math.PI / 2, t * 9 + i);
        bk.c.g.position.y = 0.35 + hop;
        bk.c.g.scale.setScalar(fadeEnds(f, 14));
      });
      // 小貨車：慢慢開、在攤子前減速
      const tu = fr(t / LOOP + 0.2);
      driveAlong(truck, southRoad, 0.05 + 0.9 * (tu + 0.06 * Math.sin(tu * TAU)), t);
      truck.scale.setScalar(1.1 * fadeEnds(tu, 12));
      // 一群白鷺從山那邊飛過
      flock.forEach((f) => {
        const u = fr(t / LOOP + 0.55), x = lerp(-90, 90, u) - f.i * 3.5, z = -30 + f.i * 2.6 - u * 20, y = 18 + Math.sin(u * 6 + f.i) * 1.5;
        f.b.g.position.set(x, y, z); f.b.g.rotation.y = 0.22; flap(f.b, t * 7 + f.i);
        f.b.g.visible = u > 0.02 && u < 0.98;
      });
      // 樹
      const kick = Math.exp(-Math.max(0, t - ev.tree) * 2.2) * Math.sin((t - ev.tree) * 14) * 0.12 * (t > ev.tree ? 1 : 0);
      sway(bigTree, t, 1, kick);
      bigTree.g.scale.setScalar(2.5 * squash(t - ev.tree));
      for (const tr of [...roadTrees, ...vt]) sway(tr, t);
      stall.scale.setScalar(squash(t - ev.stall));
      smoke(t, Math.exp(-Math.max(0, t - ev.stall) * 1.5) * (t > ev.stall ? 1.4 : 0));
      leaves.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tree') { ev.tree = t; leaves.add(V3(-11, 9, -13), t, R, 1.3); }
      if (kind === 'combine') ev.combine = t;
      if (kind === 'stall') ev.stall = t;
      if (kind === 'bike') ev.bike[bikes.indexOf(ref)] = t;
    },
  };
}
