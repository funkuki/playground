// 清明・高雄美濃：月光山腳的山坡上，一座座客家墳壓著黃紙，一家人一起掃墓、擺供品、拜拜。
// 一陣春雨過去，山後出現彩虹，燕子貼著田飛；山下是水田、老菸樓和燒字紙的敬字亭。
import { THREE, M, dots, stripes, Batch, mesh, box, slab, tree, sway, house, walker, walk, straw, bird, flap, rain, steam, bursts, clouds, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 地形：後面（-z）是月光山的山坡，前面是平平的田；每座墳的地方削出一塊平台
const SPOTS = [[-24, -12], [-10, -16], [6, -12], [20, -17], [-17, -27], [0, -28], [16, -30], [-32, -25], [30, -25]];
function H0(x, z) {
  const s = ease(clamp01((-z - 2) / 34));
  return 0.1 + s * (16 + 3 * Math.sin(x * 0.07)) + 0.5 * Math.sin(x * 0.2 + z * 0.15) * s;
}
const PLAT = SPOTS.map(([x, z]) => H0(x, z + 1));
function H(x, z) {
  let h = H0(x, z);
  SPOTS.forEach(([sx, sz], k) => { const w = 1 - ease(clamp01((Math.hypot(x - sx, (z - sz - 1) * 0.9) - 4.2) / 2.5)); h = lerp(h, PLAT[k], w); });
  return h;
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(415);
  const clickables = [];
  const ev = { graves: new Map(), shrine: -9, rainbow: -9 };
  const paper = bursts(W, ['#F5E56B', '#F8D97A', '#FFFDF8']);

  // ---------- 地形、田、遠山 ----------
  const g = new THREE.PlaneGeometry(220, 170, 110, 85).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  mesh(g, dots('#B6D58A', 1.1, '#A1C473'), 0, 0, 0, W);
  const b = new Batch();
  for (let i = -5; i <= 5; i++) for (let j = 0; j <= 3; j++) slab(b, M(pick(['#A8D8B9', '#B0CA71', '#BCE2E8']), { pat: 6, patCol: '#93C9A6', patScale: 0.4 }), i * 11, 6 + j * 9, 10, 8, 0.12, 0.05);
  b.add(box(200, 0.2, 3.5), dots('#F3E3CF', 0.6, '#E6D2B6'), 0, 0.1, 1.5);
  ridge(b, [[-60, -95, 44, 34, 7], [20, -100, 50, 40, 7], [90, -90, 40, 30, 6]], stripes('#A8D8B9', 2.4, '#93C9A6', 2));
  b.build(W, { cast: false });

  // ---------- 客家墳：半圓的墓手圍著土堆，前面是墓碑，土堆上壓著一疊疊黃紙 ----------
  const PAPER = M('#F5E56B', { shadow: false });
  const graves = SPOTS.map(([x, z], k) => {
    const gg = new THREE.Group(); gg.position.set(x, PLAT[k] - 0.15, z); gg.rotation.y = rr(-0.2, 0.2); gg.scale.setScalar(1.25); W.add(gg);
    const gb = new Batch();
    gb.add(new THREE.CylinderGeometry(3.4, 3.4, 0.4, 24), dots('#EDE6F0', 0.4, '#DED5E3'), 0, 0.2, 0.6);            // 墓埕
    gb.add(new THREE.SphereGeometry(2.0, 16, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.75, 1), dots('#68BE8D', 0.4, '#57AC7C'), 0, 0.4, -0.6);   // 土堆
    gb.add(new THREE.TorusGeometry(2.4, 0.35, 6, 20, Math.PI).rotateX(Math.PI / 2).scale(1, 1, 0.8), M('#DED5E3'), 0, 0.5, -0.4);       // 墓手
    gb.add(box(1.4, 1.6, 0.35), M('#BBBCDE'), 0, 0.4, 1.2);
    gb.add(box(1.0, 0.9, 0.05), M('#EE836F'), 0, 0.7, 1.4);
    for (let n = 0; n < 11; n++) { const a = rr(0, TAU), r = rr(0, 1.5); gb.add(box(0.75, 0.06, 0.5), PAPER, Math.cos(a) * r, 0.43 + 0.75 * Math.sqrt(4 - r * r), -0.6 + Math.sin(a) * r * 0.9, rr(-0.3, 0.3), rr(0, 3), rr(-0.3, 0.3)); gb.add(new THREE.DodecahedronGeometry(0.12, 0), M('#8F8AAE'), Math.cos(a) * r, 0.52 + 0.75 * Math.sqrt(4 - r * r), -0.6 + Math.sin(a) * r * 0.9); }
    for (const dx of [-0.5, 0, 0.5]) gb.add(box(0.5, 0.06, 0.35), PAPER, dx, 1.65, 1.2);
    gb.build(gg);
    tag(gg, 'grave', k, clickables);
    return gg;
  });
  // 掃墓的家人：三家，各在一座墳前
  const families = [0, 2, 5].map((k) => {
    const gg = graves[k], people = [];
    for (let n = 0; n < 4; n++) {
      const p = walker(gg, { col: pick([PAL.white, PAL.sky, PAL.pink, PAL.yellow, PAL.lilac]), hat: n === 0 ? '#E6C68A' : null, s: n === 3 ? 0.7 : 1 });
      p.g.position.set(-1.6 + n * 1.1, 0.5, 2.6 + (n % 2) * 0.4); p.g.rotation.y = Math.PI / 2;
      people.push(p);
    }
    const broom = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 4).translate(0, -0.8, 0), M('#B08A72'), 0, -0.4, 0, people[0].arms[0]);
    const offer = new Batch();
    offer.add(box(1.6, 0.4, 0.8), M('#EE836F'), 0, 0.4, 2.0);
    for (let f = 0; f < 4; f++) offer.add(new THREE.SphereGeometry(0.2, 8, 6), M(['#F8D97A', '#F7B977', '#EE836F', '#A8D8B9'][f]), -0.5 + f * 0.33, 0.95, 2.0);
    offer.build(gg);
    return { people, ph: R() * 6 };
  });
  const trees = [[-40, -10, 'round'], [36, -10, 'cloud'], [-6, -40, 'egg'], [40, -40, 'round'], [-42, -36, 'cloud'], [10, -4, 'column']].map(([x, z, k]) => tree(W, R, x, z, k, k === 'column' ? CROWN.pine : pick([CROWN.green, CROWN.teal]), 1.3, H(x, z) - 0.2));

  // ---------- 山下：菸樓、敬字亭 ----------
  const barn = new Batch();
  barn.add(box(7, 6.5, 6), stripes('#FFFDF8', 0.4, '#EDE6F0', 4), 26, 0.1, 10);
  barn.add(new THREE.ConeGeometry(5.4, 2.4, 4).rotateY(Math.PI / 4).scale(1.05, 1, 0.9).translate(0, 1.2, 0), M('#6B6283'), 26, 6.6, 10);
  barn.add(box(3, 1.4, 4), M('#FFFDF8'), 26, 8.3, 10);                                  // 屋頂上的「氣樓」
  barn.add(new THREE.ConeGeometry(2.6, 1.2, 4).rotateY(Math.PI / 4).scale(1.05, 1, 1.25).translate(0, 0.6, 0), M('#6B6283'), 26, 9.7, 10);
  barn.add(box(5, 3, 4), stripes('#FFFDF8', 0.4, '#EDE6F0', 4), 32, 0.1, 10);
  barn.add(new THREE.BoxGeometry(5.4, 0.25, 4.6), M('#D9665B'), 32, 3.2, 10);
  barn.build(W);
  const shrine = new THREE.Group(); shrine.position.set(-20, 0.1, 10); W.add(shrine);
  const shb = new Batch();
  shb.add(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 6), M('#DED5E3'), 0, 0.25, 0);
  for (const [r, h, y] of [[1.0, 1.8, 0.5], [0.8, 1.4, 2.6], [0.6, 1.1, 4.3]]) { shb.add(new THREE.CylinderGeometry(r, r, h, 6).translate(0, h / 2, 0), stripes('#F3E3CF', 0.3, '#E6D2B6', 4), 0, y, 0); shb.add(new THREE.CylinderGeometry(r * 1.5, r * 1.3, 0.3, 6), M('#D9665B'), 0, y + h, 0); }
  shb.add(new THREE.SphereGeometry(0.3, 8, 6), M('#F2C26B'), 0, 5.9, 0);
  shb.add(box(0.6, 0.6, 0.1), M('#4A4468'), 0, 0.9, 1.0);
  shb.build(shrine);
  tag(shrine, 'shrine', null, clickables);
  const smoke = steam(W, R, [[-20, 6, 10, 0.6]], 5, 3.2);
  const homes = [[-36, 12, 0], [40, 22, 1], [-4, 26, 2]].map(([x, z, i]) => house(W, x, z, { i, w: 6.5, d: 5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], rot: i === 1 ? -Math.PI / 2 : 0 }));

  // ---------- 春雨、彩虹、燕子 ----------
  const shower = rain(W, R, 240, [-50, 50, -40, 30, 28], LOOP);
  const rainbow = new THREE.Group(); rainbow.position.set(6, -4, -58); W.add(rainbow);
  ['#EE836F', '#F7B977', '#F8D97A', '#A8D8B9', '#A0D8EF', '#7F9BD6', '#BBBCDE'].forEach((c, k) => { const m = mesh(new THREE.TorusGeometry(36 - k * 1.1, 0.55, 4, 64, Math.PI), M(c, { lit: true, shadow: false }), 0, 0, 0, rainbow); noEdge(m); m.castShadow = false; });
  tag(rainbow, 'rainbow', null, clickables);
  const swallows = Array.from({ length: 6 }, (_, i) => ({ b: bird(W, '#4A4468', 0.6), i, ph: R() * TAU }));
  // 清明：雨剛停，雲還帶一點灰
  const drift = clouds(W, R, [[-30, 24, -8, 1.2], [30, 33, -6, 1.04], [0, 29, -4, 0.8]], LOOP, { col: '#ECE7F0' });

  return {
    bg: '#F2F2EC', clickables,
    view: { target: [0, 7, -10], span: 38, el: 26, az: 14, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 110, 0);
      // 一個 loop：前四成下著細雨，雨停之後彩虹慢慢浮現
      const u = fr(t / LOOP), wet = u < 0.4 ? 1 : 0;
      shower(t, H, wet ? 1 - clamp01((u - 0.3) / 0.1) : 0);
      const bow = Math.max(clamp01((u - 0.45) / 0.15) * (1 - clamp01((u - 0.92) / 0.08)), t - ev.rainbow < 6 ? Math.sin(Math.PI * Math.min(1, (t - ev.rainbow) / 6)) : 0);
      rainbow.scale.set(1, Math.max(0.001, bow), 1);
      graves.forEach((gg, k) => { gg.scale.y = 1.25 * squash(t - (ev.graves.get(k) ?? -9)); });
      for (const f of families) {
        const [a, c, d, e] = f.people;
        a.arms[0].rotation.z = -0.6 + Math.sin(t * 4 + f.ph) * 0.4; a.body.rotation.z = -0.25;           // 掃地
        const bow2 = Math.max(0, Math.sin(t * 0.8 + f.ph));                                            // 拜拜：雙手合十、鞠躬
        for (const p of [c, d]) { p.arms[0].rotation.z = -1.3; p.arms[1].rotation.z = -1.3; p.body.rotation.z = -bow2 * 0.35; }
        e.g.position.y = 0.5 + Math.abs(Math.sin(t * 3 + f.ph)) * 0.2;                                 // 小孩跳來跳去
      }
      for (const s of swallows) { const a = t * 0.5 + s.ph; s.b.g.position.set(Math.cos(a) * 22, 4 + Math.sin(t * 1.3 + s.ph) * 1.5, 12 + Math.sin(a * 2) * 8); s.b.g.rotation.y = -Math.atan2(Math.cos(a * 2) * 16, -Math.sin(a) * 22); flap(s.b, t * 10 + s.ph, 0.6); }
      smoke(t, t - ev.shrine < 3 ? 1 : 0);
      shrine.scale.y = squash(t - ev.shrine);
      for (const tr of trees) sway(tr, t);
      paper.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'grave') { ev.graves.set(ref, t); paper.add(V3(p.x, p.y + 1, p.z), t, R, 0.7); }
      if (kind === 'shrine') ev.shrine = t;
      if (kind === 'rainbow') ev.rainbow = t;
    },
  };
}
