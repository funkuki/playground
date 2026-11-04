// 白露・台南麻豆：文旦熟了。一排排圓圓的文旦樹掛滿綠中帶黃的果子，果農站在梯子上剪，
// 有人用扁擔挑著兩籃文旦走到路邊的集貨棚，小貨車一車車載走。清晨的草上有露水在閃，燕子成群往南飛。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, house, walker, walk, car, driveAlong, bird, flap, bursts, clouds, ridge, CROWN, PAL, rand, squash, pop, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

const POMELO = '#DCE08C';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(907);
  const clickables = [];
  const ev = { trees: new Map(), stall: -9, drop: [] };
  const leaves = bursts(W, [POMELO, '#A8D8B9', '#FFFFFF']);

  // ---------- 地面、園子裡的草、路 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#C9E2B0', 2, '#B6D59A'), 0, 0, 0, W); gnd.castShadow = false;
  const base = new Batch();
  slab(base, dots('#B6D58A', 0.8, '#A1C473'), -6, -6, 66, 40, 0.12);          // 果園
  base.add(box(200, 0.1, 5), dots('#EDE6F7', 1, '#DCD4EE'), 0, 0, 20);        // 路
  base.add(box(3.4, 0.14, 40), dots('#F3E3CF', 0.6, '#E6D2B6'), 30, 0, -6);  // 園子邊的小路
  base.build(W, { cast: false });
  const hills = new Batch();
  ridge(hills, [[-70, -70, 40, 14, 7], [0, -80, 46, 18, 6], [70, -70, 40, 12, 7]], stripes('#BBBCDE', 2.2, '#C9C3E3', 2));
  hills.build(W);

  // ---------- 文旦樹：圓圓的樹冠，表面掛著一顆顆文旦 ----------
  const FRUIT = dots(POMELO, 0.12, '#CDD47A');
  const orchard = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) {
    const x = -34 + c * 8 + (r % 2) * 2, z = -22 + r * 8;
    const tr = tree(W, R, x, z, 'round', CROWN.green, rr(0.95, 1.1));
    const fb = new Batch(), fruits = [];
    for (let k = 0; k < 9; k++) {
      const a = R() * TAU, v = rr(-0.75, 0.15), rad = 1.85;
      const p = V3(Math.cos(a) * Math.cos(v) * rad, 1.5 + Math.sin(v) * rad * 0.92, Math.sin(a) * Math.cos(v) * rad);
      fb.add(new THREE.SphereGeometry(0.4, 10, 8).scale(1, 1.15, 1), FRUIT, p.x, p.y, p.z);
      fruits.push(p);
    }
    fb.build(tr.c);
    tag(tr.g, 'tree', orchard.length, clickables);
    orchard.push({ tr, fruits });
  }

  // ---------- 梯子上的果農：伸手剪文旦，放進樹下的竹籃 ----------
  const BASKET = M('#E6C68A', { pat: 5, patCol: '#C9A46A', patScale: 0.2 });
  const basket = (parent, x, y, z, s = 1) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
    const b = new Batch();
    b.add(new THREE.CylinderGeometry(0.55, 0.42, 0.6, 14).translate(0, 0.3, 0), BASKET);
    for (let k = 0; k < 4; k++) b.add(new THREE.SphereGeometry(0.24, 10, 8), FRUIT, Math.cos(k * 1.6) * 0.22, 0.62, Math.sin(k * 1.6) * 0.22);
    b.build(g); return g;
  };
  const pickers = [9, 20, 27].map((k, i) => {
    const { tr } = orchard[k], x = tr.p.x + 2.3, z = tr.p.z + 0.6;
    const lad = new Batch();
    for (const sd of [-0.4, 0.4]) lad.add(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6).translate(0, 1.6, 0), M('#E6C68A'), x + 0.5, 0, z + sd, 0, 0, 0.22);
    for (let s = 0; s < 4; s++) lad.add(box(0.08, 0.06, 0.8), M('#E6C68A'), x + 0.42 - s * 0.17, 0.5 + s * 0.65, z);
    lad.build(W);
    const p = walker(W, { col: [PAL.pink, PAL.sky, PAL.yellow][i], hat: '#F8D97A' }); p.g.position.set(x - 0.15, 2.0, z); p.g.rotation.y = Math.PI;
    basket(W, x + 1.4, 0, z + 1.2);
    return { p, ph: i * 1.7 };
  });

  // ---------- 挑扁擔的人：從園子走到集貨棚 ----------
  const pole = (p) => {
    const g = new THREE.Group(); g.position.y = 1.55; p.g.add(g);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6).rotateZ(Math.PI / 2), M('#E6C68A'), 0, 0, 0, g);   // 扁擔前後各一籃
    const hangs = [-1.15, 1.15].map((dx) => { const h = new THREE.Group(); h.position.x = dx; g.add(h); mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4).translate(0, -0.45, 0), M(PAL.plum), 0, 0, 0, h); basket(h, 0, -1.45, 0, 0.8); return h; });
    return { g, hangs };
  };
  const carryPath = new THREE.CatmullRomCurve3([V3(26, 0, -20), V3(30, 0, -8), V3(30, 0, 6), V3(34, 0, 14)]);
  const carriers = [0, 0.5].map((u, i) => { const p = walker(W, { col: [PAL.teal, PAL.coral][i], hat: '#F8D97A' }); return { p, u, pole: pole(p) }; });

  // ---------- 集貨棚、文旦攤、小貨車 ----------
  const stall = new THREE.Group(); stall.position.set(40, 0, 13); W.add(stall);
  const sb = new Batch();
  for (const x of [-4, 4]) for (const z of [-2.5, 2.5]) sb.add(box(0.2, 3.6, 0.2), M(PAL.plum), x, 0, z);
  sb.add(new THREE.BoxGeometry(9.4, 0.25, 6.4), M(PAL.coral, { pat: 4, patCol: '#FFFFFF', patScale: 0.6 }), 0, 3.7, 0, 0.12, 0, 0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) sb.add(box(1.5, 0.9, 1.1), stripes('#F3E3CF', 0.2, '#E6D2B6', 4), -3 + i * 2, j * 0.9, -1.4);
  // 一堆疊成金字塔的文旦
  for (let l = 0; l < 4; l++) for (let a = 0; a < 4 - l; a++) for (let c = 0; c < 4 - l; c++) sb.add(new THREE.SphereGeometry(0.33, 10, 8).scale(1, 1.15, 1), FRUIT, 1 + (a - (3 - l) / 2) * 0.62, 0.35 + l * 0.52, 1.2 + (c - (3 - l) / 2) * 0.62);
  sb.add(box(3.2, 1.1, 0.12), M(PAL.yellow), -2.4, 2.3, 2.6);
  sb.build(stall);
  tag(stall, 'stall', null, clickables);
  const truck = car(W, PAL.sky, 1.0);
  const crate = new Batch(); for (let k = 0; k < 3; k++) crate.add(box(0.8, 0.5, 0.9), stripes('#F3E3CF', 0.2, '#E6D2B6', 4), -0.9 + k * 0.6, 1.6, 0); crate.build(truck);
  const road = new THREE.CatmullRomCurve3([V3(-100, 0.1, 21), V3(100, 0.1, 21)]);
  const farm = house(W, -50, 2, { i: 2, w: 7, d: 6, rot: Math.PI / 2 });
  const fence = [tree(W, R, -48, 14, 'column', CROWN.pine, 1.2), tree(W, R, -56, -12, 'egg', CROWN.lime, 1.3), tree(W, R, 52, -10, 'cloud', CROWN.teal, 1.3)];

  // ---------- 草上的露水：一顆顆閃一下的白點 ----------
  const DEW = 140;
  const dew = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), DEW);
  dew.userData.noOutline = true; dew.frustumCulled = false; W.add(dew);
  const DS = Array.from({ length: DEW }, () => ({ x: rr(-40, 26), z: rr(-26, 14), ph: R() }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();

  // ---------- 燕子：一群小黑鳥往南飛 ----------
  const swallows = Array.from({ length: 12 }, (_, i) => ({ b: bird(W, PAL.plum, 0.55), dx: rr(-6, 6), dy: rr(-1.5, 1.5), dz: rr(-5, 5), ph: R() * 6 }));
  const drift = clouds(W, R, [[-30, 16, 3, 1.04], [40, 27, 5, 0.88]], LOOP);

  return {
    bg: '#E4F0D8', clickables,
    view: { target: [13, 2, 1], span: 31, el: 30, az: 24, swing: 6, shadowR: 80 },
    update(t) {
      drift(t, 110, 13);
      for (const o of orchard) { const T = ev.trees.get(orchard.indexOf(o)) ?? -9; sway(o.tr, t, 1, Math.exp(-Math.max(0, t - T) * 3) * Math.sin((t - T) * 14) * 0.12 * (t > T ? 1 : 0)); }
      for (const p of pickers) {
        const s = Math.max(0, Math.sin(t * 1.4 + p.ph));
        p.p.arms[0].rotation.z = -1.2 - s * 1.4; p.p.arms[1].rotation.z = -0.4 - (1 - s) * 0.8;
        p.p.body.rotation.z = -s * 0.12;
      }
      for (const c of carriers) {
        const u = fr(c.u + t / LOOP), uu = u < 0.5 ? u * 2 : 2 - u * 2;
        const a = carryPath.getPointAt(uu), n = carryPath.getPointAt(Math.min(0.999, uu + 0.01));
        const ang = Math.atan2(n.z - a.z, n.x - a.x) + (u < 0.5 ? 0 : Math.PI), ph = t * 6.5 + c.u * 9;
        walk(c.p, a.x, a.z, ang, ph);
        c.p.arms[0].rotation.z = -1.5; c.p.arms[1].rotation.z = -2.4;
        c.pole.g.rotation.z = Math.sin(ph) * 0.06;
        for (const h of c.pole.hangs) h.rotation.z = Math.sin(ph * 0.5) * 0.12;
      }
      const tu = fr(t / LOOP * 1.5 + 0.3);
      driveAlong(truck, road, 0.02 + 0.96 * tu, t); truck.scale.setScalar(fadeEnds(tu, 14));
      for (let i = 0; i < DEW; i++) {
        const d = DS[i], f = fr(t / 4 + d.ph), k = Math.max(0, Math.sin(f * Math.PI * 6)) * (f < 0.17 ? 1 : 0);
        dew.setMatrixAt(i, m4.compose(pos.set(d.x, 0.3, d.z), q, sc.setScalar(k)));
      }
      dew.instanceMatrix.needsUpdate = true;
      const fu = fr(t / (LOOP * 0.6));
      for (const s of swallows) {
        s.b.g.position.set(lerp(-80, 80, fu) + s.dx + Math.sin(t * 2 + s.ph) * 1.2, 15 + s.dy + Math.sin(t * 3 + s.ph) * 0.4, lerp(-30, 40, fu) + s.dz);
        s.b.g.rotation.y = -Math.atan2(70, 160); s.b.g.scale.setScalar(0.55 * fadeEnds(fu, 8));
        flap(s.b, t * 12 + s.ph, 0.9);
      }
      stall.scale.y = squash(t - ev.stall);
      for (const tr of fence) sway(tr, t);
      leaves.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tree') { ev.trees.set(ref, t); leaves.add(V3(p.x, p.y, p.z), t, R, 0.6); }
      if (kind === 'stall') { ev.stall = t; leaves.add(V3(41, 3, 14), t, R, 0.8); }
    },
  };
}
