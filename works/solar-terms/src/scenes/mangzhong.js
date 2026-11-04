// 芒種・台南玉井：傍晚。山邊的芒果園裡，樹上掛著一顆顆套了白紙袋的芒果，果農把紙袋拆開，裡面是紅黃色的愛文；
// 集貨場堆滿一箱箱芒果。前面的溪上，龍舟隊跟著鼓聲划槳練習；溪邊的草叢裡，螢火蟲一閃一閃。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, ribbon, tree, sway, house, walker, walk, car, driveAlong, bursts, clouds, ridge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

const MANGO = '#EE7948', MANGO2 = '#F8B862';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(606);
  const clickables = [];
  const ev = { trees: new Map(), boat: -9, crates: -9 };
  const pops = bursts(W, [MANGO, MANGO2, '#FFFFFF']);

  // ---------- 地面、溪、後山 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#C9E2B0', 2, '#B6D59A'), 0, 0, 0, W); gnd.castShadow = false;
  const RP = [[-100, 16], [-60, 20], [-20, 15], [20, 19], [60, 14], [100, 18]];
  const river = ribbon(RP, 10, () => 0.04);
  const rv = mesh(river.geo, dots('#A0D8EF', 1.0, '#BCE2E8'), 0, 0, 0, W); rv.castShadow = false;
  tag(rv, 'river', null, clickables);
  const bank = new Batch();
  ridge(bank, [[-70, -70, 40, 22, 7], [0, -80, 48, 28, 6], [70, -72, 42, 24, 7]], stripes('#A8D8B9', 2.2, '#93C9A6', 2));
  bank.add(box(200, 0.1, 4), dots('#EDE6F0', 1, '#DED5E3'), 0, 0, 6);    // 溪邊的路
  bank.build(W);

  // ---------- 芒果園：深綠的樹冠，掛著白紙袋，有些已經拆開露出紅黃的芒果 ----------
  const BAG = M('#FFFDF8'), FRUIT = M(MANGO, { col2: MANGO2 });
  const orchard = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    const x = -36 + c * 9 + (r % 2) * 3, z = -36 + r * 8;
    const tr = tree(W, R, x, z, pick(['cloud', 'round']), CROWN.pine, rr(1.05, 1.25));
    const fb = new Batch(), open = [];
    for (let k = 0; k < 10; k++) {
      const a = R() * TAU, v = rr(-0.7, 0.1), rad = 1.8;
      const p = V3(Math.cos(a) * Math.cos(v) * rad, 1.5 + Math.sin(v) * rad, Math.sin(a) * Math.cos(v) * rad);
      if (R() < 0.55) fb.add(box(0.42, 0.55, 0.32), BAG, p.x, p.y - 0.4, p.z, 0, a, 0);
      else fb.add(new THREE.SphereGeometry(0.28, 10, 8).scale(0.85, 1.2, 0.8), FRUIT, p.x, p.y - 0.15, p.z, 0, 0, 0.3);
    }
    fb.build(tr.c);
    tag(tr.g, 'tree', orchard.length, clickables);
    orchard.push(tr);
  }
  const pickers = [3, 9, 16].map((k, i) => {
    const tr = orchard[k], p = walker(W, { col: [PAL.pink, PAL.sky, PAL.white][i], hat: '#F8D97A' });
    p.g.position.set(tr.p.x + 2.4, 0.15, tr.p.z + 1); p.g.rotation.y = Math.PI * 0.85;
    return { p, ph: i * 1.3 };
  });

  // ---------- 集貨場：一箱箱芒果、搬箱子的人、小貨車 ----------
  const yard = new THREE.Group(); yard.position.set(34, 0, -6); W.add(yard);
  const yb = new Batch();
  yb.add(box(16, 0.1, 9), stripes('#EDE6F0', 0.5, '#DED5E3', 4), 0, 0, 0);
  for (const x of [-7.5, 7.5]) for (const z of [-4, 4]) yb.add(box(0.25, 4.5, 0.25), M(PAL.plum), x, 0, z);
  yb.add(new THREE.BoxGeometry(17, 0.25, 10), M('#A0D8EF', { pat: 4, patCol: '#FFFFFF', patScale: 0.7 }), 0, 4.6, 0, 0.08, 0, 0);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 3 - (i + j) % 2; l++) {
    const x = -5.5 + i * 2.6, z = -2.5 + j * 2.2, y = 0.1 + l * 0.75;
    yb.add(box(1.8, 0.7, 1.4), stripes('#F3E3CF', 0.15, '#E6D2B6', 4), x, y, z);
    for (let k = 0; k < 4; k++) yb.add(new THREE.SphereGeometry(0.22, 8, 6).scale(0.85, 1, 1.15), FRUIT, x - 0.5 + (k % 2) * 1.0, y + 0.72, z - 0.3 + Math.floor(k / 2) * 0.6);
  }
  yb.build(yard);
  tag(yard, 'crates', null, clickables);
  const truck = car(W, PAL.coral, 1.0);
  const roadC = new THREE.CatmullRomCurve3([V3(-100, 0.1, 6), V3(100, 0.1, 6)]);
  const homes = [[50, -20, 0], [58, -10, 2], [-48, -14, 4]].map(([x, z, i]) => house(W, x, z, { i, w: 6, d: 5, rot: -Math.PI / 2 }));

  // ---------- 龍舟：長長的船、龍頭龍尾、兩排划槳的人、船中間打鼓 ----------
  const boat = new THREE.Group(); W.add(boat);
  const bb = new Batch();
  bb.add(new THREE.CapsuleGeometry(0.75, 12, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.55, 1), stripes('#EE836F', 0.3, '#F8D97A', 6), 0, 0.2, 0);
  bb.add(new THREE.ConeGeometry(0.55, 1.6, 8).rotateZ(-Math.PI / 2 - 0.5), M('#F8D97A'), 7, 1.0, 0);   // 龍頭
  bb.add(new THREE.SphereGeometry(0.18, 8, 6), M('#FFFFFF'), 7.2, 1.4, 0.3);
  bb.add(new THREE.ConeGeometry(0.4, 1.4, 6).rotateZ(Math.PI / 2 + 0.7), M('#68BE8D'), -7, 1.0, 0);    // 龍尾
  bb.add(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 14), M('#EE836F'), 0, 0.6, 0);                 // 鼓
  bb.build(boat);
  const rowers = [];
  for (let i = 0; i < 8; i++) for (const sd of [-1, 1]) {
    const p = walker(boat, { col: i % 2 ? PAL.yellow : PAL.white, hat: '#F8D97A', s: 0.75 });
    const x = -5 + i * 1.3; p.g.position.set(x, 0.0, sd * 0.4); p.g.rotation.y = 0;
    for (const l of p.legs) l.visible = false;
    const paddle = new THREE.Group(); paddle.position.set(x + 0.1, 0.95, sd * 0.85); boat.add(paddle);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 4).translate(0, -0.6, 0), M('#B08A72'), 0, 0, 0, paddle);
    mesh(box(0.08, 0.5, 0.25), M('#B08A72'), 0, -1.6, 0, paddle);
    rowers.push({ p, paddle, sd });
  }
  const drummer = walker(boat, { col: PAL.coral, hat: PAL.white, s: 0.75 }); drummer.g.position.set(0.9, 0.1, 0); drummer.g.rotation.y = Math.PI;
  tag(boat, 'boat', null, clickables);

  // ---------- 螢火蟲：溪邊草叢裡一閃一閃 ----------
  const FN = 60;
  const fly = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: '#F6F2A0' }), FN);
  fly.userData.noOutline = true; fly.frustumCulled = false; W.add(fly);
  const FS = Array.from({ length: FN }, () => ({ x: rr(-60, 60), z: rr(22, 30) * (R() < 0.5 ? 1 : 0) || rr(8, 10), y: rr(0.5, 2.5), ph: R(), w: R() * TAU }));
  const reeds = new Batch();
  for (let i = 0; i < 70; i++) { const x = rr(-60, 60), z = R() < 0.5 ? rr(22, 26) : rr(8, 10); reeds.add(new THREE.ConeGeometry(0.25, rr(1.2, 2.2), 5).translate(0, 0.8, 0), dots('#93C9A6', 0.2, '#68BE8D'), x, 0, z); }
  reeds.build(W);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const drift = clouds(W, R, [[-30, 28, -50, 1.4], [40, 32, -40, 1.2]], LOOP);

  return {
    bg: '#F8E6D8', night: 0.22, dusk: 0.9, clickables,
    view: { target: [4, 2, -4], span: 36, el: 32, az: 14, swing: 6, shadowR: 85 },
    update(t) {
      drift(t, 200);
      orchard.forEach((tr, k) => { const T = ev.trees.get(k) ?? -9; sway(tr, t, 1, Math.exp(-Math.max(0, t - T) * 3) * Math.sin((t - T) * 14) * 0.1 * (t > T ? 1 : 0)); });
      for (const p of pickers) { const s = Math.max(0, Math.sin(t * 1.5 + p.ph)); p.p.arms[0].rotation.z = -1.4 - s * 1.2; p.p.arms[1].rotation.z = -0.5 - s; }
      const tu = fr(t / LOOP * 1.3 + 0.2); driveAlong(truck, roadC, 0.02 + 0.96 * tu, t); truck.scale.setScalar(fadeEnds(tu, 14));
      // 龍舟：沿著溪來回；點一下鼓打得更快、划得更快
      const fast = 1 + Math.exp(-Math.max(0, t - ev.boat) * 0.8) * (t > ev.boat ? 1.5 : 0);
      const bu = fr(t / LOOP), k = bu < 0.5 ? bu * 2 : 2 - bu * 2, bx = lerp(-50, 40, ease(k));
      const bp = river.curve.getPointAt(clamp01((bx + 100) / 200));
      boat.position.set(bx, 0.15 + Math.sin(t * 6 * fast) * 0.05, bp.z);
      boat.rotation.y = bu < 0.5 ? 0 : Math.PI;
      const stroke = t * 5 * fast;
      for (const r of rowers) { r.paddle.rotation.z = Math.sin(stroke) * 0.6; r.paddle.rotation.x = -r.sd * 0.3; r.p.body.rotation.z = -0.2 + Math.sin(stroke) * 0.2; r.p.arms[0].rotation.z = r.p.arms[1].rotation.z = -1.0 + Math.sin(stroke) * 0.5; }
      drummer.arms[0].rotation.z = -1.4 + Math.abs(Math.sin(stroke)) * 0.8; drummer.arms[1].rotation.z = -1.4 + Math.abs(Math.cos(stroke)) * 0.8;
      for (let i = 0; i < FN; i++) {
        const f = FS[i], glow = Math.max(0, Math.sin(t * 2.2 + f.ph * 20)) ** 3;
        fly.setMatrixAt(i, m4.compose(pos.set(f.x + Math.sin(t * 0.5 + f.w) * 1.5, f.y + Math.sin(t * 0.8 + f.w) * 0.5, f.z + Math.cos(t * 0.6 + f.w)), q, sc.setScalar(glow)));
      }
      fly.instanceMatrix.needsUpdate = true;
      yard.scale.y = squash(t - ev.crates);
      pops.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tree') { ev.trees.set(ref, t); pops.add(V3(p.x, p.y, p.z), t, R, 0.6); }
      if (kind === 'boat' || kind === 'river') ev.boat = t;
      if (kind === 'crates') { ev.crates = t; pops.add(V3(34, 3, -6), t, R, 0.8); }
    },
  };
}
