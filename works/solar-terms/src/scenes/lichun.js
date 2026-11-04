// 立春・宜蘭蘭陽平原：清晨，一格格放滿水的田映著粉紅色的天空，田中央站著幾棟農舍。
// 插秧機在一塊田裡來回走，後面留下一排排秧苗，白鷺跟在後面啄蟲；海上是龜山島，區間車從田邊的路堤開過去。
import { THREE, M, dots, stripes, Batch, mesh, box, slab, tree, sway, house, walker, bird, flap, ripples, bursts, clouds, ridge, noEdge, straw, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(204);
  const clickables = [];
  const ev = { egrets: -9, train: -9, planter: -9 };
  const rings = ripples(W, 10);
  const pop = bursts(W, ['#FFFFFF', '#F4B3C2', '#A8D8B9']);

  // ---------- 地面、水田、田埂 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#B6D58A', 2, '#A1C473'), 0, 0, 0, W); gnd.castShadow = false;
  const b = new Batch();
  const WATER = [dots('#F6D3DB', 1.4, '#FBE6EA'), dots('#F9DFE4', 1.4, '#FFFFFF'), dots('#D7E9F2', 1.4, '#EAF4F8')];
  const CW = 12, CD = 9, cells = [];
  for (let i = -6; i <= 5; i++) for (let j = -4; j <= 3; j++) {
    const x = i * (CW + 0.8) + 6, z = j * (CD + 0.8) + 4;
    if (Math.abs(z - 13) < 4) continue;                       // 中間留一條路
    cells.push([x, z]);
  }
  const refl = new Batch();
  const homeCells = new Set([5, 22, 41, 60]);
  cells.forEach(([x, z], k) => {
    if (homeCells.has(k)) { slab(b, dots('#C9E2B0', 0.8, '#B6D59A'), x, z, CW, CD, 0.5, 0, 0.6); return; }
    const plain = k % 7 === 3;                               // 少數幾塊已經插好秧
    slab(b, plain ? M('#A8D8B9', { pat: 6, patCol: '#93C9A6', patScale: 0.35 }) : pick(WATER), x, z, CW, CD, 0.12, 0, 0.3);
    if (!plain) for (let c = 0; c < 2; c++) {                                   // 水面上的雲倒影
      refl.add(new THREE.CircleGeometry(rr(1.2, 2.2), 20).rotateX(-Math.PI / 2).scale(1.8, 1, 1), M('#FFFFFF', { shadow: false }), x + rr(-3, 3), 0.14, z + rr(-2.5, 2.5));
    }
  });
  b.add(box(200, 0.25, 6), dots('#EDE6F0', 0.8, '#DED5E3'), 0, 0, 13);       // 田中間的路
  // 電線桿和電線
  for (let x = -70; x <= 70; x += 14) { b.add(new THREE.CylinderGeometry(0.16, 0.2, 7, 6).translate(0, 3.5, 0), M('#DED5E3'), x, 0, 9.4); b.add(box(1.6, 0.18, 0.18), M('#B9B3CC'), x, 6.6, 9.4); }
  for (const dz of [-0.6, 0.6]) b.add(new THREE.CylinderGeometry(0.03, 0.03, 140, 4).rotateZ(Math.PI / 2), M('#6B6283'), 0, 6.75, 9.4 + dz);
  // 鐵路的路堤
  b.add(box(220, 1.4, 5), stripes('#D8C9AE', 0.5, '#C9B897', 6), 0, 0, -33);
  for (let x = -110; x <= 110; x += 1.2) b.add(box(0.3, 0.12, 3), M('#B08A72'), x, 1.4, -33);
  for (const z of [-33.8, -32.2]) b.add(box(220, 0.14, 0.14), M('#6B6283'), 0, 1.52, z);
  // 海和龜山島，左邊是雪山山脈
  b.add(box(400, 0.1, 120), dots('#A0D8EF', 2, '#BCE2E8'), 0, 0.02, -110);
  b.add(box(400, 0.3, 6), dots('#F3E3CF', 1, '#E6D2B6'), 0, 0, -50);
  ridge(b, [[-140, -40, 40, 30, 6], [-150, 10, 44, 34, 7], [-130, -90, 36, 22, 6]], stripes('#BBBCDE', 2.4, '#C9C3E3', 2));
  b.build(W, { cast: false });
  for (const m of refl.build(W, { cast: false })) noEdge(m);
  const turtle = new Batch();
  turtle.add(new THREE.SphereGeometry(10, 20, 12, 0, TAU, 0, Math.PI / 2).scale(1.3, 0.75, 1), stripes('#68BE8D', 1, '#57AC7C', 4), -2, 0, -70);
  turtle.add(new THREE.ConeGeometry(4, 12, 12).translate(0, 6, 0), dots('#4E9A78', 0.6, '#438A6A'), -14, 0, -70, 0, 0, 0.35);   // 龜頭那座尖尖的山
  turtle.add(new THREE.SphereGeometry(3, 14, 10).scale(1.4, 0.7, 1), M('#7EBEAB'), -28, 0, -70);
  turtle.build(W);
  const sun = mesh(new THREE.CircleGeometry(7, 40), M('#F9D58E', { emit: true, shadow: false }), 70, 10, -150, W); sun.lookAt(V3(0, 30, 40)); noEdge(sun);

  // ---------- 田中央的農舍 ----------
  const homes = [...homeCells].map((k, n) => { const [x, z] = cells[k]; return house(W, x - 1, z, { i: n + 1, w: 6.5, d: 5, y: 0.5, rot: n % 2 ? 0 : Math.PI / 2 }); });
  const trees = [...homeCells].map((k, n) => { const [x, z] = cells[k]; return tree(W, R, x + 4, z + 2, n % 2 ? 'round' : 'egg', n % 2 ? CROWN.green : CROWN.teal, 1.1, 0.5); });

  // ---------- 插秧機：在前面這塊田裡來回走，後面一排排秧苗長出來 ----------
  const F = { x: 6, z: 23.6, w: CW - 1, d: CD - 1 }, ROWS = 6, COLS = 18;
  const planter = new THREE.Group(); W.add(planter);
  const pb = new Batch();
  pb.add(box(2.4, 0.9, 1.8), M('#EE836F'), 0, 0.5, 0);
  pb.add(box(1.2, 0.2, 2.6), M('#F8D97A'), -1.4, 0.4, 0);
  for (const dz of [-0.7, 0.7]) pb.add(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 14).rotateX(Math.PI / 2), M('#4A4468'), 0.5, 0.55, dz);
  pb.add(box(0.15, 1.4, 0.15), M('#6B6283'), 0.9, 1.4, 0); pb.add(box(1.2, 0.12, 1.4), M('#FFFDF8'), 0.4, 2.4, 0);
  pb.build(planter);
  const driver = walker(planter, { col: PAL.sky, s: 0.8 }); driver.g.position.set(0.1, 0.9, 0); straw(driver);
  for (const l of driver.legs) l.visible = false;
  tag(planter, 'planter', null, clickables);
  const SN = ROWS * COLS, seed = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 0.6, 5).translate(0, 0.3, 0), M('#68BE8D', { shadow: false }), SN);
  seed.userData.noOutline = true; seed.frustumCulled = false; W.add(seed);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const rowZ = (j) => F.z - F.d / 2 + (j + 0.5) * F.d / ROWS, colX = (i) => F.x - F.w / 2 + (i + 0.5) * F.w / COLS;

  // ---------- 白鷺：跟在插秧機後面走，點一下就飛起來 ----------
  const egrets = Array.from({ length: 5 }, (_, i) => {
    const e = bird(W, '#FFFFFF', 1.1);
    tag(e.g, 'egret', i, clickables);
    return { e, i, ph: R() * 6 };
  });

  // ---------- 區間車：白底藍條，從路堤上開過去 ----------
  const train = new THREE.Group(); W.add(train);
  const trb = new Batch();
  for (let c = 0; c < 4; c++) {
    const x = -c * 9.4;
    trb.add(box(9, 3.2, 2.8), M('#FFFDF8', { pat: 6, patCol: '#5B7FC7', patScale: 0.6 }), x, 0, 0);
    trb.add(box(9, 0.5, 2.9), M('#5B7FC7'), x, 0.9, 0);
    for (let w = 0; w < 4; w++) trb.add(box(1.4, 1.0, 2.9), M('#BFE4FF', { lit: true }), x - 3.2 + w * 2.1, 1.7, 0);
  }
  trb.add(new THREE.CapsuleGeometry(1.3, 0.6, 4, 10).rotateX(Math.PI / 2).scale(0.8, 1.1, 1), M('#5B7FC7'), 4.6, 1.5, 0);
  trb.build(train);
  tag(train, 'train', null, clickables);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 90).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  water.position.set(0, 0.15, 0); W.add(water); tag(water, 'water', null, clickables);
  const drift = clouds(W, R, [[-30, 26, -40, 1.4], [30, 30, -60, 1.3], [0, 24, -20, 1.0]], LOOP);

  return {
    bg: '#FBE8EA', night: 0.15, dusk: 0.8, clickables,
    view: { target: [2, 2, 2], span: 40, el: 32, az: 24, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 200);
      // 插秧機：一個 loop 來回走完六排
      const u = fr(t / LOOP), row = Math.min(ROWS - 1, Math.floor(u * ROWS)), k = fr(u * ROWS), dir = row % 2 ? -1 : 1;
      const px = F.x + dir * (k - 0.5) * F.w, pz = rowZ(row), shake = t - ev.planter < 1 ? Math.sin(t * 40) * 0.05 : 0;
      planter.position.set(px, 0.1 + shake, pz); planter.rotation.y = dir > 0 ? 0 : Math.PI;
      let n = 0;
      for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
        const x = colX(i), done = j < row || (j === row && (dir > 0 ? x < px - 1.2 : x > px + 1.2));
        m4.compose(pos.set(x, 0.1, rowZ(j)), q, sc.setScalar(done ? 1 : 0.0001)); seed.setMatrixAt(n++, m4);
      }
      seed.instanceMatrix.needsUpdate = true;
      // 白鷺：在插秧機後面幾步啄蟲；被點的時候一起飛起來，繞一圈再落回來
      const fly = t - ev.egrets < 4 ? Math.sin(Math.PI * (t - ev.egrets) / 4) : 0;
      for (const g of egrets) {
        const bx = px - dir * (3 + g.i * 1.3) + Math.sin(t * 0.5 + g.ph) * 0.6, bz = pz + (g.i % 2 ? 1.5 : -1.5) + Math.cos(t * 0.4 + g.ph) * 0.5;
        const hop = Math.max(0, Math.sin(t * 2.8 + g.ph * 3)) * (g.i === 2 ? 1.6 : 0.2);   // 跟立冬一樣：偶爾跳一下
        g.e.g.position.set(bx + fly * Math.cos(t + g.i) * 6, 0.65 + hop + fly * (6 + g.i), bz + fly * Math.sin(t + g.i) * 6);
        g.e.g.rotation.y = dir > 0 ? 0 : Math.PI;
        flap(g.e, t * 9 + g.ph, fly > 0.05 || hop > 0.4 ? 0.9 : 0.12);
      }
      const tu = fr(t / (LOOP * 0.5) + 0.2);
      train.position.set(lerp(-130, 150, tu), 1.6 + (t - ev.train < 3 ? Math.abs(Math.sin(t * 20)) * 0.08 : 0), -33); train.scale.setScalar(fadeEnds(tu, 10));
      for (const tr of trees) sway(tr, t);
      rings.update(t); pop.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'water') rings.add(V3(p.x, 0, p.z), t, 0.18);
      if (kind === 'egret') { ev.egrets = t; pop.add(V3(p.x, p.y + 1, p.z), t, R, 0.5); }
      if (kind === 'planter') { ev.planter = t; pop.add(V3(p.x, p.y + 2, p.z), t, R, 0.6); }
      if (kind === 'train') { ev.train = t; pop.add(V3(p.x, p.y + 2, p.z), t, R, 0.6); }
    },
  };
}
