// 秋分・花蓮六十石山：山頂的緩坡上一整片橘色的金針花，一壟一壟順著坡排；採花的人彎著腰摘花苞。
// 山頂散著紅屋頂的小木屋和涼亭，一條小路彎上來，車子慢慢開。東邊坡下是縱谷的稻田，遠處是中央山脈，雲從谷裡湧上來。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, ribbon, tree, sway, house, walker, car, driveAlong, bursts, clouds, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 地形：中間是一塊緩緩起伏的山頂台地，往東（+x）和往前（+z）落到縱谷
function H(x, z) {
  const top = 9 + 1.6 * Math.sin(x * 0.09) * Math.cos(z * 0.11) + 0.8 * Math.sin(x * 0.21 + z * 0.17);
  const edge = Math.max(0, Math.hypot(x * 0.9, z * 1.1) - 34);
  return Math.max(0, top - edge * 0.55);
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(923);
  const clickables = [];
  const ev = { pav: -9, cabins: new Map() };
  const petals = bursts(W, ['#F8B862', '#F39A4E', '#FFFFFF']);

  // ---------- 地形 ----------
  const g = new THREE.PlaneGeometry(220, 180, 110, 90).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  mesh(g, dots('#A8D8B9', 1.1, '#93C9A6'), 0, 0, 0, W);
  // 坡下縱谷的稻田（抽穗的綠和開始黃的田）
  const paddy = new Batch();
  for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) {
    const x = -70 + i * 15, z = 58 + j * 11;
    if (H(x, z) > 0.2) continue;
    slab(paddy, M(pick(['#B6D58A', '#C9DB8E', '#D8DC92']), { pat: 6, patCol: '#A1C473', patScale: 0.6 }), x, z, 13.6, 9.6, 0.2);
  }
  paddy.build(W, { cast: false });
  const far = new Batch();
  ridge(far, [[-90, -90, 46, 30, 7], [-20, -105, 56, 38, 6], [55, -96, 50, 34, 7], [120, -80, 44, 26, 6]], stripes('#BBBCDE', 2.4, '#C9C3E3', 2));
  far.build(W);

  // ---------- 金針花田：一壟壟綠葉，上面一朵朵橘色的花 ----------
  const fb = new Batch(), LEAF = dots('#68BE8D', 0.3, '#57AC7C'), FLOW = M('#F8B862', { pat: 1, patCol: '#F39A4E', patScale: 0.12 }), BUD = M('#B6D58A');
  const field = new THREE.Group(); W.add(field);
  for (let r = 0; r < 11; r++) {
    const z = -24 + r * 4.2;
    for (let x = -40; x <= 30; x += 1.7) {
      const xx = x + Math.sin(z * 0.3) * 1.2, y = H(xx, z);
      if (y < 4.5 || Math.hypot(xx - 14, z + 2) < 7 || Math.abs(z - (xx * 0.1 + 12)) < 2.2) continue;
      fb.add(new THREE.SphereGeometry(0.7, 7, 5).scale(1, 0.45, 0.8), LEAF, xx, y + 0.1, z);
      for (let k = 0; k < 5; k++) {
        const fx = xx + rr(-0.75, 0.75), fz = z + rr(-0.6, 0.6), fy = y + 0.75 + rr(0, 0.35);
        if (R() < 0.85) fb.add(new THREE.SphereGeometry(0.36, 6, 4).scale(1, 0.55, 1), FLOW, fx, fy, fz);
        else fb.add(new THREE.CapsuleGeometry(0.07, 0.32, 2, 5), BUD, fx, fy, fz, 0.3, 0, 0.2);
      }
    }
  }
  fb.build(field);
  tag(field, 'flowers', null, clickables);

  // ---------- 小路和車 ----------
  const RP = [[80, 70], [50, 50], [34, 30], [24, 14], [10, 12], [-4, 10], [-22, 14], [-40, 8], [-60, 0]];
  const rd = ribbon(RP, 3.2, (x, z) => H(x, z) + 0.12, 220);
  mesh(rd.geo, dots('#EDE6F7', 0.9, '#DCD4EE'), 0, 0, 0, W).castShadow = false;
  const RC = new THREE.CatmullRomCurve3(rd.curve.getSpacedPoints(220).map((p) => V3(p.x, H(p.x, p.z) + 0.15, p.z)));
  const cars = [[PAL.coral, 0], [PAL.sky, 0.5]].map(([c, ph]) => ({ g: car(W, c, 0.9), ph }));

  // ---------- 紅屋頂的小木屋、涼亭 ----------
  const cabins = [[14, -2, 0], [-30, -30, 1], [26, -26, 2]].map(([x, z, i], k) => {
    const c = house(W, x, z, { i: 0, w: 5.5, d: 4.5, two: false, wall: '#E6C68A', roof: ['#EE836F', '#FBE3E6'], y: H(x, z) - 0.2, rot: [0.2, -0.3, 0.5][k] });
    tag(c.g, 'cabin', k, clickables);
    return c;
  });
  const pav = new THREE.Group(); const py = H(-8, -14); pav.position.set(-8, py, -14); W.add(pav);
  const pb = new Batch();
  pb.add(box(5, 0.4, 5), stripes('#EDE6F7', 0.4, '#DCD4EE', 4));
  for (const sx of [-2, 2]) for (const sz of [-2, 2]) pb.add(box(0.3, 3, 0.3), M('#EE836F'), sx, 0.4, sz);
  pb.add(new THREE.ConeGeometry(4.2, 2.2, 4).rotateY(Math.PI / 4).translate(0, 1.1, 0), stripes('#EE836F', 0.4, '#FBE3E6', 4), 0, 3.4, 0);
  pb.add(new THREE.SphereGeometry(0.3, 10, 8), M(PAL.yellow), 0, 5.7, 0);
  pb.build(pav);
  tag(pav, 'pav', null, clickables);
  const trees = [];
  for (const [x, z, k, cs, s] of [[-46, -18, 'cloud', CROWN.pine, 1.6], [-40, -36, 'round', CROWN.teal, 1.4], [36, -12, 'cone', CROWN.pine, 1.3], [40, -32, 'cloud', CROWN.green, 1.4], [-50, 6, 'egg', CROWN.lime, 1.3], [4, -36, 'round', CROWN.pine, 1.5], [-18, -40, 'cone', CROWN.pine, 1.2]]) trees.push(tree(W, R, x, z, k, cs, s, H(x, z) - 0.2));

  // ---------- 採花的人：彎腰摘花苞，揹著籃子；遊客在涼亭邊拍照 ----------
  const pickers = Array.from({ length: 6 }, (_, i) => {
    const z = -24 + (1 + i * 2) % 11 * 4.2 + 2.1, x = rr(-34, 4);
    const p = walker(W, { col: pick([PAL.sky, PAL.pink, PAL.white, PAL.mint]), hat: '#F8D97A' });
    mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.5, 10), M('#E6C68A', { pat: 5, patCol: '#C9A46A', patScale: 0.15 }), -0.35, 1.1, 0, p.g);
    return { p, x, z, ph: R() * 6, dir: i % 2 ? 1 : -1 };
  });
  const visitors = [[-6, -9, PAL.yellow], [-11, -10, PAL.lilac], [-4, -17, PAL.coral]].map(([x, z, col], i) => { const p = walker(W, { col, hat: i === 1 ? PAL.coral : null }); p.g.position.set(x, H(x, z) + 0.15, z); return { p, i }; });

  // ---------- 雲：從谷裡湧上來，貼著坡慢慢飄 ----------
  const fog = Array.from({ length: 8 }, (_, i) => {
    const g = new THREE.Group(); W.add(g);
    const cb = new Batch();
    for (let k = 0; k < 4; k++) cb.add(new THREE.SphereGeometry(rr(3.5, 6), 16, 10).scale(1.6, 0.5, 1), M('#FFFFFF', { lit: true, shadow: false }), k * 6 - 9, rr(-0.4, 0.4), rr(-2, 2));
    for (const m of cb.build(g)) { m.castShadow = false; m.receiveShadow = false; }
    noEdge(g); return { g, x: rr(-90, 90), z: rr(40, 70), ph: R() };
  });
  const drift = clouds(W, R, [[-40, 32, -50, 1.4], [50, 34, -40, 1.2]], LOOP);

  return {
    bg: '#E9F1E4', clickables,
    view: { target: [-6, 8, -4], span: 36, el: 34, az: 22, swing: 7, shadowR: 90 },
    update(t) {
      drift(t, 200);
      for (const f of fog) { const u = fr(t / (LOOP * 1.5) + f.ph); f.g.position.set(((f.x + t * 1.4 + 100) % 200) - 100, 2 + u * 5, f.z - u * 8); f.g.scale.setScalar(fadeEnds(u, 4)); }
      cars.forEach((c) => { const u = fr(t / (LOOP * 1.2) + c.ph); driveAlong(c.g, RC, 0.02 + 0.96 * u, t); c.g.scale.setScalar(0.9 * fadeEnds(u, 14)); });
      for (const p of pickers) {
        const x = p.x + Math.sin(t * 0.25 + p.ph) * 4, z = p.z, bend = Math.max(0, Math.sin(t * 1.6 + p.ph));
        p.p.g.position.set(x, H(x, z) + 0.15, z); p.p.g.rotation.y = Math.cos(t * 0.25 + p.ph) > 0 ? 0 : Math.PI;
        p.p.body.rotation.z = -bend * 0.5; p.p.head.position.x = bend * 0.35;
        p.p.arms[0].rotation.z = -0.6 - bend * 0.6; p.p.arms[1].rotation.z = -0.3 - bend * 0.8;
      }
      for (const v of visitors) { v.p.g.rotation.y = Math.sin(t * 0.3 + v.i * 2) * 1.2 + 1.6; v.p.arms[1].rotation.z = -1.4 * Math.max(0, Math.sin(t * 0.7 + v.i * 1.7)); }
      pav.scale.y = squash(t - ev.pav);
      cabins.forEach((c, k) => { c.g.scale.y = squash(t - (ev.cabins.get(k) ?? -9)); });
      for (const tr of trees) sway(tr, t);
      petals.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'flowers') petals.add(V3(p.x, p.y + 0.4, p.z), t, R, 0.7);
      if (kind === 'pav') { ev.pav = t; petals.add(V3(-8, py + 6, -14), t, R, 1); }
      if (kind === 'cabin') { ev.cabins.set(ref, t); petals.add(V3(p.x, p.y + 1, p.z), t, R, 0.6); }
    },
  };
}
