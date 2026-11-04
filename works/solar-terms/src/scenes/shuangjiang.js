// 霜降・新竹新埔：九降風裡曬柿餅。客家伙房前的曬場擺滿一面面圓竹篩，篩上排著橘色的柿子；
// 有人蹲著一顆顆翻面、捏扁，有人把竹篩搬到架上。乾乾的風從海那邊一陣陣吹過來，屋旁的柿子樹掛滿果子，後山的楓香轉紅了。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, house, walker, walk, squiggles, bursts, clouds, ridge, CS, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

const KAKI = '#F09A5B';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(1023);
  const clickables = [];
  const ev = { trays: new Map(), gust: -9, house: -9 };
  const bits = bursts(W, [KAKI, '#F8D97A', '#FFFFFF']);

  // ---------- 地面、曬場、後山 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#C9E2B0', 2, '#B6D59A'), 0, 0, 0, W); gnd.castShadow = false;
  gnd.userData.kind = 'wind'; clickables.push(gnd);
  const base = new Batch();
  slab(base, dots('#EDE6F0', 0.8, '#DED5E3'), 0, 4, 54, 30, 0.15);
  base.add(box(200, 0.1, 4), dots('#F3E3CF', 1, '#E6D2B6'), 0, 0, 24);
  ridge(base, [[-70, -60, 40, 22, 7], [-10, -70, 48, 28, 6], [56, -62, 42, 24, 7]], stripes('#A8D8B9', 2.2, '#93C9A6', 2));
  base.build(W);

  // ---------- 客家伙房：中間正身，兩邊橫屋，屋頂是瓦片紅 ----------
  const home = new THREE.Group(); W.add(home);
  const hb = house(home, 0, -16, { i: 0, w: 14, d: 6, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'] });
  const wl = house(home, -11, -9, { i: 1, w: 9, d: 5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], rot: Math.PI / 2 });
  const wr = house(home, 11, -9, { i: 2, w: 9, d: 5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], rot: -Math.PI / 2 });
  tag(home, 'house', null, clickables);
  // 柿子樹：綠葉上掛滿橘色的柿子；後山一排轉紅的楓香
  const KAKI_TREE = CS('#68BE8D', '#57AC7C', [KAKI, '#F7B977']);
  const trees = [[-22, -18, 'round', KAKI_TREE, 1.4], [22, -20, 'cloud', KAKI_TREE, 1.3], [-30, 2, 'round', KAKI_TREE, 1.3], [32, 8, 'egg', CROWN.green, 1.3], [30, -6, 'round', KAKI_TREE, 1.2]].map(([x, z, k, cs, s]) => tree(W, R, x, z, k, cs, s));
  for (let i = 0; i < 9; i++) { const x = -56 + i * 14 + rr(-3, 3), z = -34 + rr(-4, 4); trees.push(tree(W, R, x, z, pick(['cone', 'egg', 'round']), pick([CROWN.maple, CROWN.gold, CROWN.maple]), rr(1.3, 1.7))); }

  // ---------- 竹篩：一面面圓竹篩擺在矮架上，篩上排著柿子 ----------
  const TRAY = M('#E6C68A', { pat: 5, patCol: '#D4B176', patScale: 0.18 }), FRUIT = dots(KAKI, 0.12, '#E5844A');
  const trays = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = -19 + c * 7.6, z = -2 + r * 5.2;
    const g = new THREE.Group(); g.position.set(x, 0, z); W.add(g);
    const b = new Batch();
    for (const sx of [-2.6, 2.6]) b.add(box(0.2, 0.9, 3.6), M('#B08A72'), sx, 0, 0);
    b.add(box(5.6, 0.12, 0.2), M('#B08A72'), 0, 0.85, 0);
    for (const dx of [-1.4, 1.4]) b.add(new THREE.CylinderGeometry(1.35, 1.35, 0.12, 24), TRAY, dx, 1.0, 0);
    b.build(g);
    const fruit = new THREE.Group(); fruit.position.y = 1.1; g.add(fruit);
    const fb = new Batch();
    for (const dx of [-1.4, 1.4]) for (let k = 0; k < 7; k++) {
      const a = k === 0 ? 0 : (k - 1) / 6 * TAU, rad = k === 0 ? 0 : 0.78;
      fb.add(new THREE.SphereGeometry(0.34, 12, 8).scale(1, 0.5, 1), FRUIT, dx + Math.cos(a) * rad, 0.08, Math.sin(a) * rad);
    }
    fb.build(fruit);
    tag(g, 'tray', trays.length, clickables);
    trays.push({ g, fruit, ph: R() * 6 });
  }

  // ---------- 人：蹲著翻柿子；一個人搬竹篩來回走 ----------
  const flippers = [[-15, 0.4, 0], [4, 5.6, 1], [-4, 11, 2], [15, 13.6, 3]].map(([x, z, i]) => {
    const p = walker(W, { col: [PAL.pink, PAL.white, PAL.sky, PAL.lilac][i], hat: '#F8D97A' }); p.g.position.set(x, 0.0, z + 2); p.g.rotation.y = Math.PI / 2;
    return { p, i };
  });
  const carryC = new THREE.CatmullRomCurve3([V3(-24, 0, 16), V3(-24, 0, -4), V3(-8, 0, -9), V3(8, 0, -9)]);
  const carrier = walker(W, { col: PAL.teal, hat: '#F8D97A' });
  const held = new THREE.Group(); held.position.set(0.5, 2.1, 0); carrier.g.add(held);
  mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 20), TRAY, 0, 0, 0, held);
  for (let k = 0; k < 5; k++) mesh(new THREE.SphereGeometry(0.28, 10, 8).scale(1, 0.5, 1), FRUIT, Math.cos(k * 1.25) * 0.55, 0.08, Math.sin(k * 1.25) * 0.55, held);
  const dog = new THREE.Group(); W.add(dog);
  mesh(new THREE.CapsuleGeometry(0.3, 0.7, 4, 10).rotateZ(Math.PI / 2), M('#F3E3CF'), 0, 0.6, 0, dog);
  mesh(new THREE.SphereGeometry(0.26, 10, 8), M('#F3E3CF'), 0.55, 0.85, 0, dog);
  for (const [dx, dz] of [[-0.3, -0.15], [-0.3, 0.15], [0.3, -0.15], [0.3, 0.15]]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6).translate(0, 0.2, 0), M('#F3E3CF'), dx, 0, dz, dog);

  // ---------- 九降風：一陣陣白色的風線從右邊吹過來；曬衣竿上的布條飄 ----------
  const wind = squiggles(W, R, 40, () => V3(rr(-40, 40), rr(3, 9), rr(-20, 24)), [-1, 0.25], 2.6, LOOP);
  const flags = [];
  for (const [x, z, col] of [[-26, -6, PAL.coral], [26, -2, PAL.sky], [26, 14, PAL.yellow]]) {
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6).translate(0, 2.5, 0), M('#B08A72'), x, 0, z, W);
    const f = mesh(box(1.8, 0.9, 0.05).translate(-0.9, 0, 0), M(col, { pat: 4, patCol: '#FFFFFF', patScale: 0.3 }), x, 4.4, z, W);
    flags.push(f);
  }
  // 霜降：九降風很強，扁扁的雲被吹得飛快
  const drift = clouds(W, R, [[-30, 16, 2, 1.04], [40, 29, 4, 0.88], [0, 23, 6, 1.12]], LOOP, { shape: 'flat', speed: 2.5 });

  return {
    bg: '#E6EFF6', clickables,
    view: { target: [0, 2, 0], span: 32, el: 34, az: 16, swing: 6, shadowR: 80 },
    update(t) {
      drift(t, 110, 0); wind(t);
      const gust = 1 + Math.exp(-Math.max(0, t - ev.gust) * 1.2) * (t > ev.gust ? 2.5 : 0) + Math.max(0, Math.sin(t * 0.8)) * 0.6;
      for (const f of flags) { f.rotation.y = Math.PI + Math.sin(t * 5 * gust + f.position.x) * 0.25 * gust; f.rotation.z = -0.05 * gust; }
      for (const tr of trees) sway(tr, t, 1, -0.03 * gust);
      // 翻柿子：手一下一下伸到篩子上；被點的竹篩，上面的柿子一起翻一圈
      for (const f of flippers) {
        const s = Math.max(0, Math.sin(t * 2 + f.i * 1.3));
        f.p.body.rotation.z = -0.35 - s * 0.15; f.p.legs[0].rotation.z = 0.9; f.p.legs[1].rotation.z = 0.9; f.p.g.position.y = -0.25;
        f.p.arms[0].rotation.z = -1.0 - s * 0.6; f.p.arms[1].rotation.z = -0.7 - (1 - s) * 0.6;
      }
      trays.forEach((tr, k) => {
        const T = ev.trays.get(k) ?? -9, dt = t - T;
        tr.fruit.rotation.x = dt > 0 && dt < 0.8 ? ease(dt / 0.8) * TAU : 0;
        tr.fruit.position.y = 1.1 + (dt > 0 && dt < 0.8 ? Math.sin(Math.PI * dt / 0.8) * 1.2 : 0);
        tr.g.scale.y = squash(dt);
      });
      const u = fr(t / LOOP * 1.5), uu = u < 0.5 ? u * 2 : 2 - u * 2;
      const a = carryC.getPointAt(uu), n = carryC.getPointAt(Math.min(0.999, uu + 0.01));
      walk(carrier, a.x, a.z, Math.atan2(n.z - a.z, n.x - a.x) + (u < 0.5 ? 0 : Math.PI), t * 6.5);
      carrier.arms[0].rotation.z = carrier.arms[1].rotation.z = -2.7;
      held.visible = u < 0.5;
      // 狗：在曬場邊繞圈
      const da = t * 0.5, dx = 30 * 0 + Math.cos(da) * 4 - 26, dz = Math.sin(da) * 3 + 14;
      dog.position.set(dx, Math.abs(Math.sin(t * 9)) * 0.06, dz); dog.rotation.y = -da - Math.PI / 2;
      home.scale.y = squash(t - ev.house);
      bits.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tray') { ev.trays.set(ref, t); bits.add(V3(p.x, p.y + 0.6, p.z), t, R, 0.5); }
      if (kind === 'house') { ev.house = t; bits.add(V3(p.x, p.y + 1, p.z), t, R, 0.8); }
      if (kind === 'wind') ev.gust = t;
    },
  };
}
