// 小滿・屏東東港：黑鮪魚季。漁船一艘艘進港，吊車把大黑鮪魚吊上岸；魚市場的地上排著一尾尾黑鮪魚，
// 拍賣員站在箱子上喊價，買家舉手。港邊是東隆宮金色的牌樓，梅雨季的雲飄過去，偶爾下一陣雨。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, house, temple, walker, walk, boat, steam, squiggles, ripples, bursts, clouds, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

const TUNA = '#4E5A8C', BELLY = '#D9DCEB';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(521);
  const clickables = [];
  const ev = { tuna: new Map(), auction: -9, gate: -9, statue: -9 };
  const rings = ripples(W, 10);
  const pop = bursts(W, ['#FFFFFF', '#F8D97A', '#A0D8EF']);

  // ---------- 海、碼頭、陸地 ----------
  const sea = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#5B7FC7', 1.6, '#7F9BD6'), 0, 0, 0, W);
  sea.castShadow = false; tag(sea, 'water', null, clickables);
  const waves = squiggles(W, R, 30, () => V3(rr(-70, 70), 0.05, rr(6, 50)), [1, 0], 0.8, LOOP);
  const b = new Batch();
  slab(b, dots('#EDE6F0', 1.2, '#DED5E3'), 0, -30, 200, 60, 1.0);          // 陸地（z < 0）
  slab(b, stripes('#C9C3E3', 0.6, '#BBBCDE'), 0, 0.6, 200, 1.4, 1.1);      // 碼頭邊
  for (let x = -60; x < 70; x += 7) b.add(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 10), M(PAL.plum), x, 1.0, 0.4);
  b.add(box(200, 0.06, 4.5), dots('#F3E3CF', 1, '#E6D2B6'), 0, 1.0, -26);  // 港邊的路
  b.build(W);

  // ---------- 魚市場：大棚子，地上一排排黑鮪魚 ----------
  const mk = new THREE.Group(); mk.position.set(-4, 1.0, -9); W.add(mk);
  const mb = new Batch();
  mb.add(box(34, 0.1, 14), stripes('#FFFFFF', 0.6, '#EDE6F0', 4), 0, 0, 0);
  for (const x of [-16, -8, 0, 8, 16]) for (const z of [-6.5, 6.5]) mb.add(box(0.35, 6, 0.35), M('#7F9BD6'), x, 0, z);
  mb.add(new THREE.BoxGeometry(35, 0.3, 15), M('#A0D8EF', { pat: 4, patCol: '#FFFFFF', patScale: 0.9 }), 0, 6.1, 0);
  mb.add(box(10, 1.6, 0.25), M(PAL.coral), 0, 6.4, 7.4);
  mb.build(mk);
  // 黑鮪魚：紡錘形的身體（背深藍、肚子銀白），尖嘴、月牙形的尾巴，背上兩片鰭，尾柄上下一排黃色小鰭
  const PROF = [[0.0, -1.95], [0.1, -1.8], [0.2, -1.5], [0.36, -1.1], [0.52, -0.5], [0.6, 0.1], [0.56, 0.6], [0.44, 1.05], [0.26, 1.42], [0.08, 1.62], [0.0, 1.66]].map(([r, y]) => new THREE.Vector2(r, y));
  const fin = (pts) => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.06, bevelEnabled: false, curveSegments: 3 }).translate(0, 0, -0.03);
  const TB = dots(TUNA, 0.2, '#5E6BA0'), TS = M(BELLY), TF = M(TUNA), TY = M('#F8D97A'), TE = M('#FFFFFF'), TP = M('#2E2A40');
  const tunaMesh = () => {
    const g = new THREE.Group();
    const tb = new Batch();
    tb.add(new THREE.LatheGeometry(PROF, 18).rotateZ(-Math.PI / 2), TS, 0, 0.6, 0, 0, 0, 0, 1, 1, 0.85);
    tb.add(new THREE.LatheGeometry(PROF, 18, Math.PI, Math.PI).rotateZ(-Math.PI / 2), TB, 0, 0.6, 0, 0, 0, 0, 1.01, 1.03, 0.88);   // 背上那一半
    tb.add(fin([[0, 0], [-0.25, 0.5], [-0.75, 1.15], [-0.5, 0.55], [-0.48, 0], [-0.5, -0.55], [-0.75, -1.15], [-0.25, -0.5]]), TF, -1.82, 0.6, 0);   // 月牙尾
    tb.add(fin([[0.35, 0], [-0.1, 0.6], [-0.35, 0]]), TF, 0.2, 1.1, 0);                     // 第一背鰭
    tb.add(fin([[0.2, 0], [-0.15, 0.5], [-0.2, 0]]), TY, -0.6, 1.08, 0);                    // 第二背鰭
    tb.add(fin([[0.2, 0], [-0.15, -0.45], [-0.2, 0]]), TY, -0.6, 0.15, 0);                  // 臀鰭
    for (let k = 0; k < 5; k++) { const x = -0.95 - k * 0.17, r = 0.36 - k * 0.05; for (const sd of [1, -1]) tb.add(fin([[0.06, 0], [-0.04, sd * 0.16], [-0.06, 0]]), TY, x, 0.6 + sd * r, 0); }   // 小鰭
    for (const sd of [-1, 1]) tb.add(fin([[0.15, 0], [-0.9, -0.1], [-0.1, -0.12]]).rotateX(sd * 1.2), TF, 0.7, 0.5, sd * 0.45);   // 胸鰭貼著身體往後
    for (const sd of [-1, 1]) { tb.add(new THREE.SphereGeometry(0.11, 10, 8), TE, 1.12, 0.68, sd * 0.33); tb.add(new THREE.SphereGeometry(0.06, 8, 6), TP, 1.17, 0.69, sd * 0.4); }
    tb.build(g);
    return g;
  };
  const tunas = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const g = tunaMesh(); g.position.set(-12 + c * 5.4, 0.1, -3.6 + r * 3.6); g.rotation.y = 0.05 * (c - 2); mk.add(g);
    tag(g, 'tuna', tunas.length, clickables);
    tunas.push(g);
  }
  // 拍賣員和買家
  const crier = walker(mk, { col: PAL.white, hat: PAL.coral }); crier.g.position.set(15, 1.2, 0); crier.g.rotation.y = Math.PI;
  mesh(box(1.4, 1.1, 1.4), M('#F8D97A'), 15, 0.1, 0, mk);
  tag(crier.g, 'auction', null, clickables);
  const buyers = Array.from({ length: 9 }, (_, i) => {
    const p = walker(mk, { col: pick([PAL.sky, PAL.yellow, PAL.mint, PAL.pink, PAL.lilac]), hat: pick([PAL.white, '#F8D97A', PAL.coral]) });
    p.g.position.set(-12 + (i % 5) * 5.4 + 1.5, 0.15, -5.4 + Math.floor(i / 5) * 7.2 + 1.8); p.g.rotation.y = Math.PI * 0.95;
    return { p, ph: R() * 6, i };
  });

  // ---------- 進港的漁船：船上吊著一尾黑鮪魚，靠岸時吊上去 ----------
  const boats = [[PAL.coral, 0], [PAL.sky, 0.5]].map(([col, ph]) => {
    const bt = boat(W, col, 1.5);
    const fish = tunaMesh(); fish.scale.setScalar(0.7); bt.g.add(fish); fish.position.set(1.4, 0.7, 0);
    return { ...bt, fish, ph };
  });
  // 碼頭上的吊車
  const crane = new THREE.Group(); crane.position.set(24, 1.0, -1.5); W.add(crane);
  const cb = new Batch();
  cb.add(box(1, 7, 1), M('#F8D97A', { pat: 6, patCol: '#6B6283', patScale: 0.4 }), 0, 0, 0);
  cb.build(crane);
  const arm = new THREE.Group(); arm.position.y = 7; crane.add(arm);
  mesh(box(7, 0.5, 0.5).translate(3, 0, 0), M('#F8D97A', { pat: 6, patCol: '#6B6283', patScale: 0.4 }), 0, 0, 0, arm);
  const hook = new THREE.Group(); arm.add(hook);
  const rope = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4).translate(0, -0.5, 0), M(PAL.plum), 0, 0, 0, hook);
  const hung = tunaMesh(); hook.add(hung); hung.scale.setScalar(0.75); hung.rotation.z = Math.PI / 2;

  // ---------- 港口的大黑鮪魚雕像：從浪花裡往上躍起 ----------
  const statue = new THREE.Group(); statue.position.set(24, 1.0, -16); W.add(statue);
  const sb = new Batch();
  sb.add(new THREE.CylinderGeometry(3.2, 3.6, 1.2, 24), stripes('#EDE6F0', 0.3, '#DED5E3', 4), 0, 0.6, 0);
  for (const [dx, dz, r] of [[0, 0, 1.8], [1.4, 0.6, 1.2], [-1.3, -0.4, 1.3], [0.4, -1.3, 1.0], [-0.6, 1.3, 1.0]]) sb.add(new THREE.SphereGeometry(r, 14, 10).scale(1, 0.7, 1), dots('#A0D8EF', 0.4, '#FFFFFF'), dx, 1.5, dz);
  sb.build(statue);
  const big = tunaMesh(); big.scale.setScalar(2.6); big.position.set(-0.6, 2.2, 0); big.rotation.set(0, -0.5, 0.75); statue.add(big);
  tag(statue, 'statue', null, clickables);

  // ---------- 東隆宮的金色牌樓、港邊的房子 ----------
  const gate = new THREE.Group(); gate.position.set(-36, 1.0, -30); W.add(gate);
  const gb = new Batch(), GOLD = stripes('#F2C26B', 0.3, '#E6B158', 6);
  for (const x of [-5, -1.8, 1.8, 5]) gb.add(box(0.8, 6, 0.8), GOLD, x, 0, 0);
  gb.add(box(12, 1.0, 1.4), GOLD, 0, 6, 0); gb.add(box(7, 1.0, 1.4), GOLD, 0, 7.8, 0);
  for (const [w, y] of [[13.4, 7.0], [8.4, 8.8]]) gb.add(new THREE.BoxGeometry(w, 0.4, 2.6), M('#EE836F'), 0, y, 0, 0.0, 0, 0);
  gb.add(new THREE.SphereGeometry(0.5, 10, 8), M('#F8D97A'), 0, 9.6, 0);
  gb.build(gate);
  tag(gate, 'gate', null, clickables);
  const shrine = temple(W, -36, -42, { w: 12, d: 9, y: 1.0 });
  const incense = steam(W, R, [[shrine.burner.x, shrine.burner.y + 0.8, shrine.burner.z, 0.7]], 5, 3.4);
  const homes = [[-12, -36, 0], [-2, -38, 2], [10, -36, 4], [22, -38, 1], [34, -36, 3], [46, -38, 5]].map(([x, z, i]) => house(W, x, z, { i, w: 6.5, d: 5.5, y: 1.0 }));
  const trees = [[-20, -30], [40, -28], [52, -18], [-50, -22]].map(([x, z], i) => tree(W, R, x, z, ['round', 'cloud', 'egg', 'cloud'][i], i % 2 ? CROWN.teal : CROWN.green, 1.3, 1.0));
  // 小滿：梅雨季，厚厚的灰色層雲蓋滿天
  const drift = clouds(W, R, [[-30, 17, -6, 1.28], [30, 30, -4, 1.12], [60, 34, -2, 1.2], [-60, 18, -5, 1.2], [0, 25, -3, 1.44]], LOOP, { col: '#D9D3E6', shape: 'flat', speed: 0.6 });
  const sellers = Array.from({ length: 6 }, (_, i) => ({ p: walker(W, { col: pick([PAL.pink, PAL.sky, PAL.white, PAL.yellow]), hat: R() < 0.5 ? '#F8D97A' : null }), u: R(), dir: i % 2 ? 1 : -1 }));

  return {
    bg: '#E6ECF4', clickables,
    view: { target: [2, 3, -8], span: 34, el: 33, az: 20, swing: 6, shadowR: 80 },
    update(t) {
      drift(t, 110, 2); waves(t); incense(t);
      // 漁船：從外海開進來、靠岸停一下、再開出去
      for (const bt of boats) {
        const u = fr(t / LOOP + bt.ph);
        const k = u < 0.4 ? ease(u / 0.4) : u < 0.6 ? 1 : 1 - ease((u - 0.6) / 0.4);
        bt.g.position.set(lerp(-90, 18 + bt.ph * 20 - 10, k), Math.sin(t * 1.4 + bt.ph * 5) * 0.15, lerp(30, 4.5, k) + bt.ph * 6);
        bt.g.rotation.y = u < 0.5 ? 0.25 : Math.PI + 0.25;
        bt.fish.visible = u < 0.5;
        bt.flag.rotation.y = 0.4 + Math.sin(t * 7) * 0.2;
      }
      // 吊車：手臂轉過去，把魚吊上岸再放下
      const cu = fr(t / 10);
      arm.rotation.y = -Math.PI / 2 + Math.sin(cu * TAU) * 0.9;
      const drop = 2.5 + Math.sin(cu * TAU * 2) * 1.5;
      hook.position.x = 5.5; rope.scale.y = drop; hung.position.y = -drop - 1.6;
      // 拍賣：拍賣員揮手喊價，買家輪流舉手
      const hot = Math.exp(-Math.max(0, t - ev.auction) * 1.5) * (t > ev.auction ? 1 : 0);
      crier.arms[0].rotation.z = -1.6 + Math.sin(t * 5) * 0.6; crier.arms[1].rotation.z = -2.6 + Math.sin(t * 7) * 0.3;
      crier.g.position.y = 1.2 + Math.abs(Math.sin(t * 5)) * 0.1;
      for (const by of buyers) {
        const up = Math.max(0, Math.sin(t * 1.1 + by.ph)) > 0.8 || hot > 0.2;
        by.p.arms[1].rotation.z = up ? -2.8 : 0;
      }
      tunas.forEach((g, k) => { g.scale.y = squash(t - (ev.tuna.get(k) ?? -9)); });
      for (const s of sellers) { const u = fr(s.u + s.dir * t / LOOP * 0.4); walk(s.p, lerp(-60, 60, u), -26 + s.dir * 0.8, s.dir > 0 ? 0 : Math.PI, t * 6 + s.u * 9); s.p.g.position.y += 1.0; s.p.g.scale.setScalar(fadeEnds(u, 14)); }
      gate.scale.y = squash(t - ev.gate);
      const jump = t - ev.statue < 1.2 ? Math.sin(Math.PI * (t - ev.statue) / 1.2) : 0;
      big.position.y = 2.2 + Math.sin(t * 1.2) * 0.25 + jump * 2.5; big.rotation.z = 0.75 + Math.sin(t * 1.2) * 0.06 + jump * 0.3;
      for (const tr of trees) sway(tr, t);
      rings.update(t); pop.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tuna') { ev.tuna.set(ref, t); pop.add(V3(p.x, p.y + 0.6, p.z), t, R, 0.5); }
      if (kind === 'auction') { ev.auction = t; pop.add(V3(p.x, p.y + 2, p.z), t, R, 0.9); }
      if (kind === 'statue') { ev.statue = t; pop.add(V3(24, 8, -16), t, R, 1); }
      if (kind === 'gate') { ev.gate = t; pop.add(V3(-36, 10, -30), t, R, 1); }
      if (kind === 'water') rings.add(V3(p.x, 0, p.z), t, 0.1);
    },
  };
}
