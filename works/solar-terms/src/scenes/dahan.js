// 大寒・台北迪化街：年貨大街開張。北邊一排有山頭的街屋和霞海城隍廟，南邊沿街搭起紅黃條紋的攤棚，
// 攤上堆著禮盒、糖果、烏魚子和乾貨；紅燈籠一串串掛過街，人擠人地走。西邊是淡水河，渡船慢慢開過。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, tree, sway, shophouse, temple, walker, boat, squiggles, steam, bursts, clouds, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(120);
  const clickables = [];
  const ev = { temple: -9, lantern: -9, stalls: new Map() };
  const confetti = bursts(W, ['#FF5A5F', '#FFD234', '#FF7EB3']);

  // ---------- 地面、街、淡水河 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#F2EDF8', 2, '#E3DCF0'), 0, 0, 0, W); gnd.castShadow = false;
  const base = new Batch();
  base.add(box(110, 0.08, 7.5), stripes('#FFE6BD', 0.5, '#FFD9A0', 2), 6, 0, 0);
  base.add(box(60, 0.1, 200), dots('#5CC8FF', 1.5, '#86D6FF'), -78, 0, 0);
  base.add(box(2, 1.2, 200), stripes('#DCD4EE', 0.4, '#C9C0E3'), -48, 0, 0);
  base.build(W, { cast: false });
  const flow = squiggles(W, R, 30, () => V3(rr(-100, -52), 0.12, rr(-60, 60)), [0, 1], 3, LOOP);
  const ferry = boat(W, PAL.yellow, 1.3);

  // ---------- 北邊：街屋和霞海城隍廟 ----------
  const WALL = ['#FFF4DD', '#A8F0D2', '#FFB8D9', '#FFEFA8', '#C9D8FF', '#FFFFFF'];
  const fronts = [];
  let i = 0;
  for (let x = -40; x <= 56; x += 4.4, i++) {
    if (x > 2 && x < 12) continue;
    const wall = WALL[i % WALL.length];
    fronts.push(shophouse(W, x, -3.75 - 4.5, { w: 4.2, d: 9, floors: 2 + (i % 3 === 0 ? 1 : 0), wall, trim: '#FFFFFF', gable: pick(['#FF9C6B', '#5CC8FF', '#FF7EB3', '#5EDFB0', wall]), ball: pick([PAL.yellow, PAL.coral, PAL.cobalt]), roof: '#FF7A59', sign: i % 2 ? pick([PAL.coral, PAL.yellow, PAL.cobalt, PAL.teal]) : null }));
  }
  const tp = temple(W, 7, -9, { w: 8, d: 8 });
  tag(tp.g, 'temple', null, clickables);
  const incense = steam(W, R, [[tp.burner.x, tp.burner.y + 0.8, tp.burner.z, 0.7]], 5, 3.4);
  // 南邊的人行道：一排行道樹和停著的機車
  const side = new Batch();
  side.add(box(110, 0.25, 3), dots('#FFFFFF', 0.6, '#EDE6F7'), 6, 0, 10);
  for (let x = -34; x <= 52; x += 5.2) {
    const c = pick([PAL.cobalt, PAL.coral, PAL.mint, PAL.yellow, PAL.pink]);
    side.add(new THREE.CapsuleGeometry(0.32, 1.1, 4, 10).rotateZ(Math.PI / 2), M(c), x, 0.85, 9.6);
    side.add(box(0.5, 0.5, 0.45), M(lt(c, -0.1)), x - 0.55, 1.1, 9.6);
    for (const dx of [-0.75, 0.75]) side.add(new THREE.TorusGeometry(0.3, 0.1, 6, 14), M('#25214A'), x + dx, 0.4, 9.6);
  }
  side.build(W);
  const trees = [tree(W, R, -44, -12, 'round', CROWN.green, 1.6), tree(W, R, -44, 8, 'cloud', CROWN.teal, 1.5), tree(W, R, 60, -2, 'egg', CROWN.lime, 1.4)];
  for (let x = -30; x <= 50; x += 13) trees.push(tree(W, R, x, 11.8, x % 2 ? 'round' : 'egg', x % 3 ? CROWN.green : CROWN.lime, 1.25));

  // ---------- 年貨攤：紅黃條紋的攤棚，桌上堆滿東西 ----------
  const GOODS = [['#FF3B4A', 'box'], ['#FFD234', 'ball'], ['#F2863C', 'roe'], ['#A8705A', 'ball'], ['#FF7EB3', 'ball'], ['#FFFFFF', 'box'], ['#5EDFB0', 'ball']];
  const stalls = [];
  for (let x = -36, k = 0; x <= 52; x += 7.2, k++) {
    const g = new THREE.Group(); g.position.set(x, 0, 5.4); W.add(g);
    const sb = new Batch(), col = k % 2 ? PAL.coral : PAL.yellow;
    sb.add(box(6, 1.0, 2.2), M('#FFFFFF', { pat: 4, patCol: lt(col, 0.6), patScale: 0.4 }), 0, 0, 0);
    for (const sx of [-2.9, 2.9]) for (const sz of [-1.0, 1.0]) sb.add(box(0.16, 3.2, 0.16), M(PAL.plum), sx, 0, sz);
    sb.add(new THREE.BoxGeometry(6.6, 0.22, 3.2), M(col, { pat: 4, patCol: '#FFFFFF', patScale: 0.55 }), 0, 3.25, 0, -0.18, 0, 0);
    for (let j = 0; j < 7; j++) {
      const [gc, kind] = GOODS[(j + k * 3) % GOODS.length], gx = -2.4 + j * 0.8;
      if (kind === 'box') { sb.add(box(0.7, 0.55, 0.8), M(gc, { pat: 6, patCol: PAL.yellow, patScale: 0.2 }), gx, 1.0, -0.3); sb.add(box(0.55, 0.45, 0.65), M(gc), gx, 1.55, -0.3); }
      else if (kind === 'roe') for (let q = 0; q < 2; q++) sb.add(new THREE.SphereGeometry(0.32, 10, 8).scale(1.3, 0.35, 0.7), dots(gc, 0.12, '#FFB067'), gx, 1.1 + q * 0.18, -0.3 + q * 0.2);
      else for (let q = 0; q < 5; q++) sb.add(new THREE.SphereGeometry(0.17, 8, 6), M(gc), gx + (q % 3 - 1) * 0.22, 1.12 + Math.floor(q / 3) * 0.2, -0.3 + (q % 2) * 0.2);
    }
    sb.build(g);
    tag(g, 'stall', k, clickables);
    stalls.push(g);
  }

  // ---------- 燈籠：一串串掛過街 ----------
  const lanterns = new THREE.Group(); W.add(lanterns);
  const lb = new Batch();
  for (let x = -34; x <= 52; x += 6) {
    for (const dz of [-2.4, -0.8, 0.8, 2.4]) {
      lb.add(new THREE.SphereGeometry(0.4, 14, 10).scale(1, 1.2, 1), M(PAL.coral, { pat: 6, patCol: '#FF8A8E', patScale: 0.3 }), x, 6.3 - (2.4 - Math.abs(dz)) * 0.18, dz);
      lb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), M(PAL.yellow), x, 6.85 - (2.4 - Math.abs(dz)) * 0.18, dz);
    }
    lb.add(new THREE.CylinderGeometry(0.03, 0.03, 7.6, 4).rotateX(Math.PI / 2), M(PAL.plum), x, 7.1, 0);
  }
  lb.build(lanterns);
  tag(lanterns, 'lantern', null, clickables);

  // ---------- 人擠人 ----------
  const COLS = [PAL.cobalt, PAL.pink, PAL.teal, PAL.yellow, '#FFFFFF', PAL.lilac, PAL.coral, PAL.peach];
  const people = Array.from({ length: 26 }, (_, k) => ({ p: walker(W, { col: pick(COLS), hat: R() < 0.35 ? pick([PAL.coral, PAL.yellow, PAL.cobalt]) : null, s: 0.95 }), u: R(), dir: k % 2 ? 1 : -1, z: rr(-2.6, 2.6), sp: rr(0.55, 0.9), stop: R() }));
  const drift = clouds(W, R, [[-20, 26, -30, 1.2], [40, 30, -10, 1.4]], LOOP);

  return {
    bg: '#F2EDF8', clickables,
    view: { target: [6, 3.5, -2], span: 28, el: 32, az: 22, swing: 6, shadowR: 70 },
    update(t) {
      drift(t, 200); flow(t); incense(t);
      const fu = fr(t / LOOP + 0.1);
      ferry.g.position.set(-70, Math.sin(t * 1.5) * 0.15, lerp(70, -70, fu)); ferry.g.rotation.y = Math.PI / 2; ferry.g.scale.setScalar(1.3 * fadeEnds(fu, 10));
      ferry.flag.rotation.y = 0.4 + Math.sin(t * 7) * 0.2;
      // 人：沿著街慢慢走，在攤子前停一下
      for (const q of people) {
        const raw = q.u + q.dir * t / LOOP * 0.25 * q.sp, u = fr(raw);
        const x = lerp(-38, 54, u), pause = Math.max(0, Math.sin((raw * 9 + q.stop) * TAU)) > 0.85;
        const ph = pause ? 0 : t * 6.5 + q.u * 9;
        q.p.g.position.set(x, 0.12 + (pause ? 0 : Math.abs(Math.sin(ph)) * 0.07), q.z);
        q.p.g.rotation.y = pause ? -Math.PI / 2 * 0.6 : q.dir > 0 ? 0 : Math.PI;
        q.p.legs[0].rotation.z = Math.sin(ph) * 0.45; q.p.legs[1].rotation.z = -Math.sin(ph) * 0.45;
        q.p.arms[0].rotation.z = -Math.sin(ph) * 0.4; q.p.arms[1].rotation.z = Math.sin(ph) * 0.4;
        q.p.g.scale.setScalar(0.95 * ease(clamp01(Math.min(u, 1 - u) * 16)));
      }
      tp.g.scale.set(1, squash(t - ev.temple), 1);
      stalls.forEach((g, k) => { const T = ev.stalls.get(k) ?? -9; g.scale.y = squash(t - T); });
      lanterns.position.y = Math.sin(t * 1.4) * 0.05;
      for (const tr of trees) sway(tr, t);
      confetti.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'temple') { ev.temple = t; confetti.add(V3(7, 8, -6), t, R, 1); }
      if (kind === 'lantern') { ev.lantern = t; confetti.add(V3(p.x, p.y, p.z), t, R, 0.8); }
      if (kind === 'stall') { ev.stalls.set(ref, t); confetti.add(V3(p.x, p.y + 0.5, p.z), t, R, 0.6); }
    },
  };
}
