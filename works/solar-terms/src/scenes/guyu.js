// 穀雨・新北坪林：北勢溪繞過山谷，對岸的山坡是一層層的茶園，戴斗笠、背竹簍的人在茶行之間採春茶。
// 細雨一直下，霧貼著山腰；溪上一座吊橋，有人走過去；這邊岸上的茶廠冒著炒茶的煙。
import { THREE, M, dots, stripes, Batch, mesh, box, ribbon, tree, sway, house, walker, walk, straw, rain, steam, ripples, bursts, clouds, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

const riverZ = (x) => 8 + 3 * Math.sin(x * 0.05);
function H(x, z) {
  const c = riverZ(x), back = 15 * ease(clamp01((c - z - 5) / 30)), front = 5 * ease(clamp01((z - c - 5) / 20));
  return 0.2 + back + front + 0.6 * Math.sin(x * 0.11 + z * 0.07) * clamp01((c - z - 5) / 10);
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(420);
  const clickables = [];
  const ev = { tea: -9, bridge: -9, factory: -9 };
  const rings = ripples(W, 10);
  const leaves = bursts(W, ['#98D98E', '#68BE8D', '#C7DC68']);

  // ---------- 地形、北勢溪、遠山 ----------
  const g = new THREE.PlaneGeometry(220, 170, 110, 85).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  mesh(g, dots('#B6D58A', 1.1, '#A1C473'), 0, 0, 0, W);
  const RP = []; for (let x = -110; x <= 110; x += 10) RP.push([x, riverZ(x)]);
  const river = mesh(ribbon(RP, 9, () => 0.3, 220).geo, dots('#7EBEAB', 1.0, '#A8D8B9'), 0, 0, 0, W); river.castShadow = false; tag(river, 'river', null, clickables);
  const far = new Batch();
  ridge(far, [[-70, -90, 44, 30, 6], [10, -100, 50, 36, 7], [80, -90, 44, 30, 6]], stripes('#7EBEAB', 2.4, '#6AAD99', 2));
  far.build(W);

  // ---------- 茶園：沿著等高線一行行圓圓的茶樹 ----------
  const zAt = (x, h) => { let lo = riverZ(x) - 5, hi = -60; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (H(x, m) < h) lo = m; else hi = m; } return (lo + hi) / 2; };
  const tea = new Batch(), TEA = [dots('#98D98E', 0.3, '#7CC47A'), dots('#88CF84', 0.3, '#6DBA6B')], rows = [];
  for (let h = 1.6; h < 14; h += 1.25) {
    for (let x = -46; x <= 46; x += 1.7) {
      if (x > -2 && x < 22 && h < 6) continue;              // 吊橋那頭留一塊空地
      const z = zAt(x, h), z2 = zAt(x + 1.7, h);
      tea.add(new THREE.CapsuleGeometry(0.62, 1.2, 3, 8).rotateZ(Math.PI / 2).scale(1, 0.85, 1), TEA[Math.round(h) % 2], x + 0.85, h + 0.45, (z + z2) / 2, 0, -Math.atan2(z2 - z, 1.7), 0);
    }
    rows.push(h);
  }
  const teaMeshes = tea.build(W);
  for (const m of teaMeshes) tag(m, 'tea', null, clickables);
  const trees = [[-56, -10, 'cloud'], [-52, -30, 'round'], [52, -12, 'egg'], [56, -34, 'cloud'], [6, -46, 'round'], [-20, -48, 'cone'], [30, -46, 'cone']].map(([x, z, k]) => tree(W, R, x, z, k, k === 'cone' ? CROWN.pine : pick([CROWN.green, CROWN.teal]), 1.4, H(x, z) - 0.2));

  // ---------- 採茶的人：斗笠、背後的竹簍，手在茶樹上一摘一摘 ----------
  const pickers = Array.from({ length: 10 }, (_, i) => {
    const h = rows[1 + (i * 3) % (rows.length - 2)] + 0.62, x = -40 + i * 8.4 + rr(-1, 1), z = zAt(x, h - 0.62) + 1.0;
    const p = walker(W, { col: pick([PAL.pink, PAL.sky, PAL.white, PAL.lilac, PAL.yellow]) }); straw(p);
    mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.6, 10, 1, true), stripes('#E6C68A', 0.15, '#B08A72', 4), -0.38, 1.1, 0, p.g);   // 竹簍
    p.g.position.set(x, H(x, z) + 0.1, z); p.g.rotation.y = Math.PI / 2;
    return { p, ph: R() * 6 };
  });

  // ---------- 吊橋：兩座橋塔，橋面跟著纜繩往下垂 ----------
  const BX = 10, Z0 = riverZ(BX) - 8.5, Z1 = riverZ(BX) + 8.5, BY = 2.6;
  const bridge = new THREE.Group(); W.add(bridge);
  const bb = new Batch(), N = 22, deckY = (u) => BY - Math.sin(Math.PI * u) * 0.9;
  for (let k = 0; k <= N; k++) { const u = k / N; bb.add(box(2.4, 0.14, 0.7), M('#E6C68A'), BX, deckY(u), lerp(Z0, Z1, u)); }
  for (const z of [Z0, Z1]) for (const dx of [-1.3, 1.3]) bb.add(box(0.35, 5.5, 0.35), M('#D9665B'), BX + dx, H(BX, z) - 0.2, z);
  for (const dx of [-1.3, 1.3]) for (let k = 0; k < N; k++) {
    const u0 = k / N, u1 = (k + 1) / N, y0 = BY + 2.6 - Math.sin(Math.PI * u0) * 2.2, y1 = BY + 2.6 - Math.sin(Math.PI * u1) * 2.2, len = Math.hypot(lerp(Z0, Z1, u1) - lerp(Z0, Z1, u0), y1 - y0);
    bb.add(new THREE.CylinderGeometry(0.05, 0.05, len, 4).rotateX(Math.PI / 2), M('#6B6283'), BX + dx, (y0 + y1) / 2, (lerp(Z0, Z1, u0) + lerp(Z0, Z1, u1)) / 2, -Math.atan2(y1 - y0, lerp(Z0, Z1, u1) - lerp(Z0, Z1, u0)), 0, 0);
    if (k % 2 === 0) bb.add(new THREE.CylinderGeometry(0.03, 0.03, y0 - deckY(u0), 4).translate(0, (y0 - deckY(u0)) / 2, 0), M('#6B6283'), BX + dx, deckY(u0), lerp(Z0, Z1, u0));
  }
  bb.build(bridge);
  tag(bridge, 'bridge', null, clickables);
  const crossers = Array.from({ length: 3 }, (_, i) => ({ p: walker(W, { col: pick([PAL.yellow, PAL.coral, PAL.mint]), hat: '#F8D97A' }), u: i / 3, dir: i % 2 ? 1 : -1 }));

  // ---------- 這邊岸上：茶廠、老街的房子 ----------
  const factory = house(W, -26, 22, { i: 1, w: 10, d: 6, two: false, wall: '#FFFDF8', roof: ['#6B6283', '#BBBCDE'], y: H(-26, 22) - 0.2 });
  const roast = steam(W, R, [[-29, H(-26, 22) + 5.5, 22, 1], [-23, H(-26, 22) + 5.5, 22, 1]], 5, 3.4);
  const fhit = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), new THREE.MeshBasicMaterial({ visible: false })); fhit.position.set(-26, H(-26, 22) + 3, 22); W.add(fhit); tag(fhit, 'factory', null, clickables);
  const homes = [[30, 21, 0], [38, 23, 2], [46, 21, 3]].map(([x, z, i]) => house(W, x, z, { i, w: 6, d: 5, y: H(x, z) - 0.2 }));
  const fronts = [[-40, 22, 'round'], [22, 26, 'cloud']].map(([x, z, k]) => tree(W, R, x, z, k, CROWN.green, 1.3, H(x, z) - 0.2));
  const drizzle = rain(W, R, 280, [-55, 55, -40, 30, 28], LOOP);
  const mist = clouds(W, R, [[-30, 12, -24, 1.5], [20, 14, -30, 1.8], [50, 10, -14, 1.3], [-10, 18, -40, 1.6]], LOOP);

  return {
    bg: '#EDF2EE', clickables,
    view: { target: [2, 5, 0], span: 42, el: 28, az: 14, swing: 6, shadowR: 90 },
    update(t) {
      mist(t, 120); drizzle(t, H);
      const busy = t - ev.tea < 3;
      for (const pk of pickers) {
        const pickA = Math.max(0, Math.sin(t * (busy ? 6 : 2.2) + pk.ph));
        pk.p.arms[1].rotation.z = -1.0 - pickA * 0.8; pk.p.arms[0].rotation.z = -0.9 - Math.max(0, Math.sin(t * 2.2 + pk.ph + 1.6)) * 0.6;
        pk.p.body.rotation.z = -0.2 - pickA * 0.15;
      }
      const sway2 = t - ev.bridge < 2.5 ? Math.sin((t - ev.bridge) * 8) * Math.exp(-(t - ev.bridge) * 1.5) : 0;
      bridge.position.y = sway2 * 0.3; bridge.rotation.z = sway2 * 0.01;
      for (const c of crossers) {
        const u = fr(c.u + c.dir * t / LOOP * 0.6), z = lerp(Z0 - 6, Z1 + 6, u);
        walk(c.p, BX + c.dir * 0.4, z, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, t * 6 + c.u * 9);
        const onDeck = z > Z0 && z < Z1, y = onDeck ? deckY((z - Z0) / (Z1 - Z0)) + 0.07 + bridge.position.y : H(BX, z);
        c.p.g.position.y += y; c.p.g.scale.setScalar(fadeEnds(u, 12));
      }
      roast(t, t - ev.factory < 3 ? 1 : 0);
      for (const tr of trees) sway(tr, t);
      for (const tr of fronts) sway(tr, t);
      rings.update(t); leaves.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tea') { ev.tea = t; leaves.add(V3(p.x, p.y + 0.5, p.z), t, R, 0.5); }
      if (kind === 'bridge') { ev.bridge = t; }
      if (kind === 'factory') ev.factory = t;
      if (kind === 'river') rings.add(V3(p.x, 0, p.z), t, 0.35);
    },
  };
}
