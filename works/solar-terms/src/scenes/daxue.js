// 大雪・苗栗大湖：草莓開園。山坡一層一層的田，高高的畦上是綠葉和紅草莓，有幾段搭著白色遮雨棚；
// 提籃子的人在壟間慢慢走，蜜蜂在花上飛。路口一顆大草莓是地標，最上層是一座客家伙房，後面的山有霧飄過，楓香轉紅了。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, tree, sway, house, walker, car, driveAlong, clouds, bursts, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr } = rand(1207);
  const clickables = [];
  const ev = { berry: -9, house: -9, beds: new Map() };
  const hearts = bursts(W, ['#FF5A5F', '#FF7EB3', '#FFFFFF']);

  // ---------- 梯田：一層比一層高，正面是擋土牆 ----------
  const STEP = 2.4, TER = [[10, 22], [-1, 10], [-12, -1], [-23, -12], [-44, -23]];
  const top = (k) => (k + 1) * STEP - 1.8;
  const b = new Batch();
  const wall = M('#E6DDF5', { pat: 5, patCol: '#D3C8EC', patScale: 0.9 }), soil = dots('#FFD8B8', 0.7, '#F5C29A');
  TER.forEach(([z0, z1], k) => {
    b.add(box(104, top(k), z1 - z0), wall, 0, 0, (z0 + z1) / 2);
    b.add(box(104, 0.12, z1 - z0 - 0.4), k === 4 ? dots('#A5EBAA', 2, '#86DE93') : soil, 0, top(k), (z0 + z1) / 2 - 0.2);
  });
  b.build(W, { cast: true });

  // ---------- 草莓畦：淡紫的塑膠布、一排排綠葉、葉子邊的紅草莓 ----------
  const beds = [];
  const leaf = dots('#2FCB7A', 0.35, '#5EDFB0'), berry = M('#FF3B4A', { pat: 1, patCol: '#FFD234', patScale: 0.12 }), flower = M('#FFFFFF');
  TER.slice(0, 4).forEach(([z0, z1], k) => {
    const g = new THREE.Group(); g.position.y = top(k); W.add(g);
    const bb = new Batch();
    for (let r = 0; r < 3; r++) {
      const z = z0 + 2.2 + r * 3.4;
      bb.add(box(92, 0.7, 1.7), stripes('#C9B8FF', 0.4, '#B9A0FF', 4), 0, 0, z);
      for (let x = -44; x <= 44; x += 1.6) {
        bb.add(new THREE.SphereGeometry(0.55, 9, 6).scale(1, 0.7, 1), leaf, x + rr(-0.2, 0.2), 1.0, z);
        for (const sd of [-1, 1]) if (R() < 0.85) bb.add(new THREE.SphereGeometry(0.32, 8, 6).scale(1, 1.25, 1), berry, x + rr(-0.4, 0.4), 0.6, z + sd * 1.0);
        if (R() < 0.18) bb.add(new THREE.SphereGeometry(0.14, 6, 4), flower, x, 1.42, z + rr(-0.3, 0.3));
      }
    }
    bb.build(g);
    tag(g, 'bed', k, clickables);
    beds.push(g);
  });
  // 遮雨棚：半圓的白色棚子，蓋住一部分的畦
  const sh = new Batch(), film = M('#F4F8FF', { pat: 4, patCol: '#E3ECFF', patScale: 1.2 });
  for (const [k, x0, x1] of [[1, -46, -8], [3, 6, 46], [0, 20, 46]]) {
    const [z0, z1] = TER[k], len = x1 - x0;
    sh.add(new THREE.CylinderGeometry((z1 - z0) / 2 - 0.3, (z1 - z0) / 2 - 0.3, len, 20, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 1), film, (x0 + x1) / 2, top(k), (z0 + z1) / 2);
    for (let x = x0; x <= x1; x += 4) sh.add(new THREE.TorusGeometry((z1 - z0) / 2 - 0.25, 0.09, 6, 20, Math.PI).rotateY(Math.PI / 2).scale(1, 0.55, 1), M('#FFFFFF'), x, top(k), (z0 + z1) / 2);
  }
  sh.build(W, { cast: true });

  // ---------- 最上層的客家伙房：正身 + 兩邊的橫屋 ----------
  const hk = new THREE.Group(); hk.position.set(-6, top(4), -36); W.add(hk);
  const roofRed = ['#FF7A59', '#FFD8C9'];
  house(hk, 0, -2, { w: 12, d: 6, i: 5, wall: '#FFFFFF', roof: roofRed, two: false });
  house(hk, -8.5, 4, { w: 8, d: 5, i: 5, wall: '#FFF4DD', roof: roofRed, two: false, rot: Math.PI / 2 });
  house(hk, 8.5, 4, { w: 8, d: 5, i: 5, wall: '#FFF4DD', roof: roofRed, two: false, rot: -Math.PI / 2 });
  const yard = new Batch(); yard.add(box(12, 0.08, 8), dots('#FFE6BD', 0.6), 0, 0, 5); yard.build(hk, { cast: false });
  tag(hk, 'house', null, clickables);
  const trees = [];
  for (const [x, z, kind, cs, s] of [[-26, -34, 'round', CROWN.maple, 1.5], [14, -38, 'cloud', CROWN.maple, 1.4], [24, -30, 'cone', CROWN.pine, 1.3], [-36, -28, 'egg', CROWN.gold, 1.3], [36, -36, 'round', CROWN.green, 1.5], [-44, -40, 'column', CROWN.maple, 1.4]]) trees.push(tree(W, R, x, z, kind, cs, s, top(4)));
  for (const [x, z, kind, cs] of [[-56, 6, 'round', CROWN.maple], [-58, -14, 'cloud', CROWN.green], [56, -6, 'egg', CROWN.gold], [58, 14, 'round', CROWN.green], [-54, 26, 'cone', CROWN.pine], [44, 28, 'round', CROWN.maple]]) trees.push(tree(W, R, x, z, kind, cs, 1.6));

  // ---------- 後面的山和飄過的霧 ----------
  const mb = new Batch();
  ridge(mb, [[-80, -80, 40, 40, 6], [-30, -86, 44, 48, 5], [25, -82, 40, 44, 6], [80, -86, 44, 40, 5]], dots('#14B8A0', 1.6, '#3FD1B7'));
  ridge(mb, [[-60, -100, 46, 58, 5], [10, -106, 50, 64, 6], [70, -104, 46, 54, 5]], stripes('#7584FF', 2.2, '#8E9BFF', 2));
  mb.build(W);
  const fog = Array.from({ length: 4 }, (_, i) => {
    const m = mesh(new THREE.CapsuleGeometry(3, 30, 6, 16).rotateZ(Math.PI / 2).scale(1, 0.45, 0.7), M('#FFFFFF', { lit: true, shadow: false }), 0, 0, 0, W);
    m.castShadow = false; m.receiveShadow = false; noEdge(m); return { m, y: 14 + i * 5, z: -66 - i * 6, ph: i * 0.27 };
  });
  const drift = clouds(W, R, [[-30, 23, 4, 1.12], [40, 35, 6, 1.28]], LOOP);

  // ---------- 路口的大草莓 ----------
  const big = new THREE.Group(); big.position.set(-20, 0, 24.5); W.add(big);
  const bigBody = new THREE.Group(); big.add(bigBody);
  mesh(new THREE.SphereGeometry(3, 28, 20).scale(1, 1.15, 1).translate(0, 3.6, 0), M('#FF3B4A', { pat: 1, patCol: '#FFD234', patScale: 0.7 }), 0, 0, 0, bigBody);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(new THREE.ConeGeometry(0.8, 2.4, 6).rotateX(Math.PI / 2 - 0.5).rotateY(-a), dots('#2FCB7A', 0.3), Math.sin(a) * 1.3, 6.9, Math.cos(a) * 1.3, bigBody); }
  mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 8), M('#2FCB7A'), 0, 7.6, 0, bigBody);
  mesh(new THREE.CylinderGeometry(2.6, 3.0, 0.8, 24).translate(0, 0.4, 0), stripes('#FFFFFF', 0.4, '#EDE6F7'), 0, 0, 0, big);
  tag(big, 'berry', null, clickables);

  // ---------- 前面的路、小貨車 ----------
  const rd = new Batch(); rd.add(box(200, 0.2, 5), dots('#FFF1D6', 1.2, '#FFE2AE'), 0, 0, 31); rd.build(W, { cast: false });
  const truck = car(W, PAL.teal, 1.05);
  const crates = new Batch(); for (let i = 0; i < 3; i++) crates.add(box(0.7, 0.5, 0.9), M(PAL.coral), 0.9 - i * 0.7, 1.7, 0); crates.build(truck);
  const roadC = new THREE.CatmullRomCurve3([V3(-100, 0.2, 32.2), V3(100, 0.2, 32.2)]);

  // ---------- 採草莓的人：在壟和壟之間走走停停，提著小籃子 ----------
  const pickers = [[0, 0, PAL.cobalt, PAL.yellow], [0, 1, PAL.pink, null], [1, 1, PAL.yellow, PAL.coral], [2, 0, PAL.teal, null], [2, 1, PAL.coral, PAL.yellow], [3, 0, PAL.lilac, PAL.cobalt]].map(([k, aisle, col, hat], i) => {
    const p = walker(W, { col, hat });
    mesh(box(0.6, 0.45, 0.45), stripes(PAL.coral, 0.15, '#FFFFFF', 4), 0, -0.55, 0, p.arms[1]);
    return { p, k, z: TER[k][0] + 3.9 + aisle * 3.4, ph: R(), x0: rr(-40, 30) };
  });
  // 蜜蜂：在畦上繞著飛
  const bees = Array.from({ length: 10 }, (_, i) => {
    const g = new THREE.Group(); W.add(g);
    mesh(new THREE.SphereGeometry(0.22, 10, 8).scale(1.4, 1, 1), M(PAL.yellow, { pat: 4, patCol: '#25214A', patScale: 0.12, shadow: false }), 0, 0, 0, g);
    const k = i % 4; return { g, k, x: rr(-42, 42), z: TER[k][0] + 2.2 + (i % 3) * 3.4, ph: R() * TAU };
  });

  return {
    bg: '#A5EBAA', clickables,
    view: { target: [-2, 4, 2], span: 42, el: 30, az: 14, swing: 7, shadowR: 90 },
    update(t) {
      drift(t, 110, -2);
      fog.forEach((f, i) => f.m.position.set((fr(t / (LOOP * 2) + f.ph) - 0.5) * 220, f.y, f.z));
      for (const tr of trees) sway(tr, t, 1.2);
      // 大草莓：點了蹲下再彈起來，噴一陣紅色紙花
      const sq = squash(t - ev.berry); bigBody.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      bigBody.rotation.y = Math.sin(t * 0.6) * 0.15;
      hk.scale.set(1, squash(t - ev.house), 1);
      beds.forEach((g, k) => { const T = ev.beds.get(k) ?? -9; g.scale.y = squash(t - T); });
      const tu = fr(t / LOOP + 0.15);
      driveAlong(truck, roadC, 0.08 + 0.84 * (tu + 0.05 * Math.sin(tu * TAU)), t, 0);
      truck.scale.setScalar(1.05 * fadeEnds(tu, 12));
      // 採草莓的人：走一段、停下來蹲、再走
      for (const q of pickers) {
        const u = fr(t / LOOP * 0.8 + q.ph), seg = u * 4, i = Math.floor(seg), f = seg - i, moving = f < 0.55;
        const xs = [q.x0, q.x0 + 6, q.x0 + 2, q.x0 + 9, q.x0];
        const x = lerp(xs[i], xs[i + 1], ease(clamp01(f / 0.55)));
        const dir = Math.sign(xs[i + 1] - xs[i]) || 1;
        q.p.g.position.set(x, top(q.k) + 0.15, q.z);
        q.p.g.rotation.y = dir > 0 ? 0 : Math.PI;
        const ph = t * 7;
        if (moving) { q.p.legs[0].rotation.z = Math.sin(ph) * 0.45; q.p.legs[1].rotation.z = -Math.sin(ph) * 0.45; q.p.arms[0].rotation.z = -Math.sin(ph) * 0.35; q.p.body.rotation.z = 0; q.p.g.position.y += Math.abs(Math.sin(ph)) * 0.06; }
        else { const c = Math.sin(Math.PI * clamp01((f - 0.55) / 0.45)); q.p.body.rotation.z = -0.5 * c; q.p.g.position.y -= 0.35 * c; q.p.arms[0].rotation.z = -1.1 * c; q.p.legs[0].rotation.z = 0.5 * c; q.p.legs[1].rotation.z = 0.5 * c; }
      }
      for (const bz of bees) {
        const a = t * 1.6 + bz.ph;
        bz.g.position.set(bz.x + Math.cos(a) * 1.6 + Math.sin(t * 0.4 + bz.ph) * 5, top(bz.k) + 1.9 + Math.sin(a * 3) * 0.25, bz.z + Math.sin(a) * 1.0);
        bz.g.rotation.y = -a - Math.PI / 2;
      }
      hearts.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'berry') { ev.berry = t; hearts.add(V3(-20, 7, 24.5), t, R, 1.3); }
      if (kind === 'house') ev.house = t;
      if (kind === 'bed') { ev.beds.set(ref, t); hearts.add(V3(p.x, p.y + 1, p.z), t, R, 0.6); }
    },
  };
}
