// 小暑・澎湖七美：雙心石滬。海水一漲一退，退潮時兩個連在一起的心形石牆露出海面，漁人走進石滬裡收魚；
// 漲潮時石牆又沉到水下。後面是玄武岩的海崖，崖上的草坡開滿天人菊，牛在吃草，觀景台上的人往下看。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, walker, walk, bird, flap, ripples, bursts, clouds, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 心形：t 走一圈，回傳 (x, z)，心尖朝 +z（朝海）
const heart = (t, s) => [16 * Math.sin(t) ** 3 * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(707);
  const clickables = [];
  const ev = { cows: new Map(), deck: -9 };
  const rings = ripples(W, 10);
  const spray = bursts(W, ['#FFFFFF', '#A0D8EF', '#F8D97A']);

  // ---------- 海底（淺灘的沙和礁）和會漲退的海面 ----------
  const floor = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#BCE2E8', 1.4, '#A2D7DD'), 0, -0.6, 0, W); floor.castShadow = false;
  const reef = new Batch();
  slab(reef, dots('#E8DCC6', 0.6, '#D8C9AE'), 0, 2, 70, 34, 0.5, -0.6, 10);          // 潮間帶的沙
  // 石牆：沿著兩個心形，一顆顆石頭排過去
  const STONE = [M('#A6A5C4'), M('#BBBCDE'), M('#8F8AAE'), M('#C9C3E3')];
  const CENTERS = [[-8.5, 4, 0.62], [8.5, 4, 0.62]];
  for (const [cx, cz, s] of CENTERS) {
    for (let k = 0; k < 120; k++) {
      const t = k / 120 * TAU, [x, z] = heart(t, s), [x2, z2] = heart(t + 0.02, s);
      reef.add(new THREE.DodecahedronGeometry(rr(0.55, 0.8), 0), pick(STONE), cx + x, -0.2, cz + z, rr(0, 3), Math.atan2(z2 - z, x2 - x), rr(0, 3), 1.2, 0.9, 1);
    }
  }
  // 外圍一道弧形的石牆，把兩個心連起來
  for (let k = 0; k < 60; k++) { const a = Math.PI * (0.1 + 0.8 * k / 59); reef.add(new THREE.DodecahedronGeometry(rr(0.55, 0.8), 0), pick(STONE), Math.cos(a) * 26, -0.2, 4 + Math.sin(a) * 14, rr(0, 3), rr(0, 3), 0); }
  reef.build(W);
  const sea = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#38A1DB', 1.6, '#6AB8E4'), 0, 0, 0, W);
  sea.castShadow = false; sea.receiveShadow = true; tag(sea, 'water', null, clickables);

  // ---------- 海崖和草坡：玄武岩柱狀的崖壁，崖上一片草，開著天人菊 ----------
  const cliff = new Batch();
  cliff.add(box(140, 12, 40), M('#8F8AAE', { pat: 4, patCol: '#7C7699', patScale: 0.5 }), 0, -0.6, -40);
  cliff.add(box(140, 0.5, 40), dots('#B6D58A', 1.0, '#A1C473'), 0, 11.4, -40);
  for (let i = 0; i < 260; i++) {
    const x = rr(-66, 66), z = rr(-58, -22);
    cliff.add(new THREE.SphereGeometry(0.22, 6, 4).scale(1, 0.5, 1), M(pick(['#EE836F', '#F8B862', '#F8D97A'])), x, 12, z);
  }
  cliff.build(W);
  // 觀景台：崖邊伸出去的木平台
  const deck = new THREE.Group(); deck.position.set(-4, 11.9, -21); W.add(deck);
  const db = new Batch();
  db.add(box(12, 0.4, 5), stripes('#E6C68A', 0.3, '#D4B176', 4), 0, 0, 0);
  db.add(box(12, 1.1, 0.15), M('#B08A72'), 0, 0.4, 2.45);
  db.build(deck);
  const watchers = [-4, -1.4, 1.4, 4].map((x, i) => { const p = walker(deck, { col: [PAL.yellow, PAL.white, PAL.pink, PAL.sky][i], hat: i % 2 ? '#F8D97A' : PAL.coral }); p.g.position.set(x, 0.5, 1.2); p.g.rotation.y = -Math.PI / 2; return { p, i }; });
  tag(deck, 'deck', null, clickables);
  // 牛：在草坡上低頭吃草
  const cows = [[-30, -32], [-22, -40], [26, -34], [36, -44]].map(([x, z], k) => {
    const g = new THREE.Group(); g.position.set(x, 11.9, z); g.rotation.y = rr(0, TAU); W.add(g);
    mesh(new THREE.CapsuleGeometry(0.75, 1.6, 4, 10).rotateZ(Math.PI / 2), dots('#B08A72', 0.4, '#FFFDF8'), 0, 1.4, 0, g);
    const head = new THREE.Group(); head.position.set(1.5, 1.6, 0); g.add(head);
    mesh(new THREE.SphereGeometry(0.5, 10, 8).scale(1.2, 1, 0.9), M('#B08A72'), 0.3, 0, 0, head);
    for (const sd of [-0.35, 0.35]) mesh(new THREE.ConeGeometry(0.08, 0.35, 6), M('#FFFDF8'), 0.1, 0.5, sd, head);
    for (const [dx, dz] of [[-0.8, -0.4], [-0.8, 0.4], [0.8, -0.4], [0.8, 0.4]]) mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 6).translate(0, 0.5, 0), M('#B08A72'), dx, 0, dz, g);
    tag(g, 'cow', k, clickables);
    return { g, head, ph: R() * 6 };
  });
  const trees = [[-56, -30, 'round'], [52, -28, 'cloud'], [60, -50, 'egg']].map(([x, z, k]) => tree(W, R, x, z, k, CROWN.teal, 1.3, 11.9));

  // ---------- 漁人：退潮時走進石滬撿魚 ----------
  const fishers = [[-9, 6], [8, 3]].map(([x, z], i) => {
    const p = walker(W, { col: [PAL.coral, PAL.yellow][i], hat: '#F8D97A' });
    const pail = mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10), M('#A0D8EF'), 0.4, 0.9, 0.35, p.g);
    return { p, x, z, ph: R() * 6 };
  });
  const gulls = Array.from({ length: 4 }, (_, i) => ({ b: bird(W, '#FFFFFF', 0.9), a: i / 4 * TAU, r: rr(14, 22), y: rr(10, 16) }));
  const drift = clouds(W, R, [[-40, 30, 10, 1.4], [40, 34, -10, 1.2]], LOOP);

  return {
    bg: '#E2F2F6', clickables,
    view: { target: [0, 2, 4], span: 34, el: 46, az: 0, swing: 8, shadowR: 90 },
    update(t) {
      drift(t, 200);
      // 潮汐：一個 loop 退一次、漲一次（中間最低）
      const u = fr(t / LOOP), tide = 0.5 + 0.5 * Math.cos(u * TAU);       // 1 = 滿潮
      sea.position.y = lerp(-0.5, 0.75, tide);
      const low = clamp01((0.35 - tide) / 0.3);
      for (const f of fishers) {
        const x = f.x + Math.sin(t * 0.4 + f.ph) * 3, z = f.z + Math.cos(t * 0.3 + f.ph) * 2;
        walk(f.p, x, z, t * 0.4 + f.ph, t * 5 + f.ph);
        f.p.g.position.y = -0.1; f.p.g.scale.setScalar(Math.max(0.001, ease(low)));
        f.p.body.rotation.z = -0.3 * Math.max(0, Math.sin(t * 1.5 + f.ph));
      }
      cows.forEach((c, k) => { const T = ev.cows.get(k) ?? -9; c.head.rotation.z = -0.6 + Math.sin(t * 0.8 + c.ph) * 0.25 + (t - T < 1.5 ? 0.9 * Math.sin(Math.PI * (t - T) / 1.5) : 0); c.g.scale.y = squash(t - T); });
      for (const w of watchers) { w.p.arms[1].rotation.z = -1.4 * Math.max(0, Math.sin(t * 0.7 + w.i * 1.7)); }
      for (const g of gulls) { const a = g.a + t * 0.3; g.b.g.position.set(Math.cos(a) * g.r, g.y + Math.sin(t + g.a) * 0.6, 4 + Math.sin(a) * g.r * 0.6); g.b.g.rotation.y = -a - Math.PI / 2; flap(g.b, t * 5 + g.a, 0.5); }
      deck.scale.y = squash(t - ev.deck);
      for (const tr of trees) sway(tr, t, 1.3);
      rings.update(t); spray.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'water') { rings.add(V3(p.x, 0, p.z), t, p.y + 0.05); spray.add(V3(p.x, p.y + 0.2, p.z), t, R, 0.4); }
      if (kind === 'cow') { ev.cows.set(ref, t); spray.add(V3(p.x, p.y + 1.5, p.z), t, R, 0.5); }
      if (kind === 'deck') { ev.deck = t; spray.add(V3(-4, 14, -21), t, R, 0.8); }
    },
  };
}
