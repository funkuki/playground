// 春分・台北竹子湖：火山圍起來的小盆地，一層層濕濕的田裡站滿白色的海芋。穿雨鞋的遊客下田採花，
// 農家門口擺著一桶桶剛採的海芋；下午霧從大屯山上流下來，慢慢蓋住後面的田。
import { THREE, M, dots, stripes, Batch, mesh, box, slab, tree, sway, house, walker, walk, straw, bursts, clouds, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 地形：前低後高的梯田，每一層是平的
const STEP = (z) => Math.max(0, Math.floor((-z + 14) / 9)) * 1.2;

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(320);
  const clickables = [];
  const ev = { plots: new Map(), stall: -9 };
  const pop = bursts(W, ['#FFFFFF', '#F8D97A', '#A8D8B9']);

  // ---------- 梯田、田埂、步道 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#B6D58A', 2, '#A1C473'), 0, 0, 0, W); gnd.castShadow = false;
  const b = new Batch();
  const plots = [];
  for (let r = 0; r < 6; r++) {
    const z = 10 - r * 9, y = STEP(z - 0.1);
    b.add(box(120, y + 0.01, 9.2), dots('#C9E2B0', 1.0, '#B6D59A'), 0, 0, z - 4.5);           // 這一層的土台
    for (let c = -4; c <= 4; c++) {
      if (c === 0 || (r === 1 && c === -1)) continue;                                         // 中間留給步道，左邊一格是農家
      const x = c * 12.4 + (r % 2) * 3;
      slab(b, dots('#7EBEAB', 0.8, '#93C9A6'), x, z - 4.5, 11, 7.6, 0.12, y, 0.4);             // 濕濕的田
      plots.push({ x, z: z - 4.5, y: y + 0.12, k: plots.length });
    }
  }
  for (let r = 0; r < 6; r++) b.add(box(2.4, 0.1, 9.2), dots('#F3E3CF', 0.6, '#E6D2B6'), 0, STEP(10 - r * 9 - 0.1), 10 - r * 9 - 4.5);   // 中間一路往上的步道
  ridge(b, [[-50, -90, 44, 40, 7], [30, -100, 50, 50, 8], [100, -80, 40, 34, 6], [-110, -60, 36, 26, 6]], stripes('#A8D8B9', 2.4, '#93C9A6', 2));
  b.build(W, { cast: false });

  // ---------- 海芋：白色的喇叭花站在一叢綠葉上 ----------
  const CALLA = new THREE.LatheGeometry([[0.02, 0], [0.12, 0.25], [0.3, 0.6], [0.42, 0.85], [0.36, 0.9]].map(([r, y]) => new THREE.Vector2(r, y)), 10);
  const flowers = plots.map((p) => {
    const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); W.add(g);
    const fb = new Batch();
    for (let i = 0; i < 18; i++) {
      const x = rr(-4.6, 4.6), z = rr(-3.2, 3.2);
      fb.add(new THREE.SphereGeometry(0.55, 8, 6).scale(0.5, 1.2, 1), dots('#68BE8D', 0.2, '#57AC7C'), x, 0.5, z, 0, rr(0, 3), rr(-0.4, 0.4));   // 葉子
      fb.add(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 4).translate(0, 0.7, 0), M('#68BE8D'), x + 0.2, 0, z);
      fb.add(CALLA.clone(), M('#FFFDF8'), x + 0.2, 1.35, z, rr(-0.5, -0.2), rr(0, TAU), 0, 1.7);
      fb.add(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 5).translate(0, 0.3, 0), M('#F8D97A'), x + 0.2, 1.4, z);
    }
    fb.build(g);
    tag(g, 'calla', p.k, clickables);
    return g;
  });

  // ---------- 農家和花攤 ----------
  const farm = house(W, -9.4, -3.5, { i: 3, w: 8, d: 5, two: false, wall: '#FFFDF8', roof: ['#5B7FC7', '#A0D8EF'], y: 1.2 });
  const stall = new THREE.Group(); stall.position.set(8, 0, 16); W.add(stall);
  const stb = new Batch();
  stb.add(box(6, 1, 2.2), stripes('#F3E3CF', 0.3, '#E6D2B6', 4), 0, 0, 0);
  stb.add(new THREE.BoxGeometry(7, 0.25, 3.4), M('#A0D8EF', { pat: 4, patCol: '#FFFFFF', patScale: 0.6 }), 0, 3.2, 0);
  for (const dx of [-3.2, 3.2]) stb.add(box(0.2, 3.2, 0.2), M('#B08A72'), dx, 0, 1.4);
  for (let k = 0; k < 4; k++) {
    stb.add(new THREE.CylinderGeometry(0.45, 0.38, 0.7, 12), M(['#5B7FC7', '#F8D97A', '#EE836F', '#A8D8B9'][k]), -2.1 + k * 1.4, 1.35, 0);
    for (let n = 0; n < 5; n++) stb.add(CALLA.clone(), M('#FFFDF8'), -2.1 + k * 1.4 + rr(-0.2, 0.2), 1.9 + rr(0, 0.4), rr(-0.2, 0.2), rr(-0.4, 0.4), rr(0, 3), rr(-0.4, 0.4), 0.8);
  }
  stb.build(stall);
  const seller = walker(stall, { col: PAL.coral, hat: '#F8D97A' }); seller.g.position.set(0, 0.15, -1.6); seller.g.rotation.y = -Math.PI / 2;
  tag(stall, 'stall', null, clickables);
  const trees = [[-30, 16, 'round'], [26, 18, 'cloud'], [-46, -10, 'egg'], [40, -14, 'round'], [-20, -30, 'cloud']].map(([x, z, k]) => tree(W, R, x, z, k, pick([CROWN.green, CROWN.teal]), 1.3, STEP(z)));

  // ---------- 採海芋的人：穿雨鞋在田裡彎腰，手上抱著一把花 ----------
  const pickers = Array.from({ length: 8 }, (_, i) => {
    const p = plots[(i * 5 + 3) % plots.length];
    const w = walker(W, { col: pick([PAL.pink, PAL.yellow, PAL.sky, PAL.white, PAL.lilac]), hat: R() < 0.5 ? pick(['#F8D97A', PAL.coral]) : null });
    for (const l of w.legs) mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.35, 8).translate(0, -0.52, 0), M(pick(['#EE836F', '#F8D97A', '#5B7FC7'])), 0, 0, 0, l);   // 雨鞋
    const bunch = new Batch(); for (let n = 0; n < 3; n++) bunch.add(CALLA.clone(), M('#FFFDF8'), 0, n * 0.1, (n - 1) * 0.12, -0.3, 0, 0, 0.7); bunch.build(w.arms[0]);
    w.arms[0].children[w.arms[0].children.length - 1].position.y = -0.6;
    return { w, p, ph: R() * 6, dx: rr(-3, 3), dz: rr(-2, 2) };
  });
  const hikers = Array.from({ length: 5 }, (_, i) => ({ w: walker(W, { col: pick([PAL.mint, PAL.sky, PAL.peach]), hat: R() < 0.5 ? '#F8D97A' : null }), u: i / 5, dir: i % 2 ? 1 : -1 }));

  // ---------- 霧：一團團白霧從後面的山坡流下來 ----------
  const FOG = 14, fog = Array.from({ length: FOG }, (_, i) => {
    const m = mesh(new THREE.SphereGeometry(1, 16, 10), M('#FFFFFF', { lit: true, shadow: false }), 0, 0, 0, W); noEdge(m); m.castShadow = false;
    return { m, x: rr(-50, 50), ph: i / FOG, s: rr(5, 9) };
  });
  const drift = clouds(W, R, [[-20, 34, -50, 1.5], [40, 38, -40, 1.3]], LOOP);

  return {
    bg: '#EEF3F0', clickables,
    view: { target: [0, 4, -6], span: 40, el: 30, az: 16, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 200);
      flowers.forEach((g, k) => { g.scale.y = squash(t - (ev.plots.get(k) ?? -9)); });
      for (const pk of pickers) {
        const x = pk.p.x + pk.dx + Math.sin(t * 0.3 + pk.ph) * 1.5, z = pk.p.z + pk.dz;
        pk.w.g.position.set(x, pk.p.y + 0.1, z); pk.w.g.rotation.y = pk.ph;
        const bend = Math.max(0, Math.sin(t * 0.9 + pk.ph)); pk.w.body.rotation.z = -bend * 0.6; pk.w.arms[1].rotation.z = -bend * 1.2;
        pk.w.arms[0].rotation.z = -0.6;
      }
      for (const h of hikers) { const u = fr(h.u + h.dir * t / LOOP * 0.5), z = lerp(22, -42, u); walk(h.w, h.dir * 0.5, z, h.dir > 0 ? -Math.PI / 2 : Math.PI / 2, t * 6 + h.u * 9); h.w.g.position.y += STEP(z); h.w.g.scale.setScalar(fadeEnds(u, 12)); }
      // 霧：從山上（-z、高處）往下流，一邊變大一邊變淡
      for (const f of fog) {
        const u = fr(t / (LOOP * 0.8) + f.ph);
        f.m.position.set(f.x + Math.sin(t * 0.2 + f.ph * 9) * 3, lerp(14, 3, u), lerp(-60, -10, u));
        f.m.scale.set(f.s * (0.7 + u * 0.6), f.s * 0.35, f.s * 0.8); f.m.visible = u < 0.98; f.m.scale.multiplyScalar(Math.max(0.001, Math.sin(Math.PI * u)));
      }
      seller.arms[1].rotation.z = -1.4 + Math.sin(t * 3) * 0.4 * (t - ev.stall < 2 ? 1 : 0.2);
      stall.scale.y = squash(t - ev.stall);
      for (const tr of trees) sway(tr, t);
      pop.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'calla') { ev.plots.set(ref, t); pop.add(V3(p.x, p.y + 1, p.z), t, R, 0.6); }
      if (kind === 'stall') { ev.stall = t; pop.add(V3(8, 4, 16), t, R, 0.8); }
    },
  };
}
