// 驚蟄・桃園龍潭埤塘：台地上散著大大小小的埤塘，有一個架滿了太陽能板。遠方雷雲一閃，春雷響了，
// 塘邊的青蛙鼓起鳴囊一起叫；三合院前的桃花開了，菜園裡的紋白蝶飛起來，有人坐在塘邊釣魚。
import { THREE, M, dots, stripes, Batch, mesh, box, slab, tree, sway, house, walker, straw, bird, flap, ripples, bursts, clouds, ridge, noEdge, CS, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(305);
  const clickables = [];
  const ev = { thunder: -9, croak: -9, fish: -9, trees: new Map() };
  const rings = ripples(W, 10);
  const pop = bursts(W, ['#F4B3C2', '#FFFFFF', '#F8D97A']);

  // ---------- 地面、田、埤塘 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#B6D58A', 2, '#A1C473'), 0, 0, 0, W); gnd.castShadow = false;
  const b = new Batch();
  for (let i = -5; i <= 5; i++) for (let j = -4; j <= 3; j++) if (R() < 0.55) slab(b, M(pick(['#B0CA71', '#C9DB8E', '#A8D8B9', '#D8DC92']), { pat: 6, patCol: '#9DB862', patScale: 0.5 }), i * 13, j * 11, 12, 10, 0.12);
  const PONDS = [[-16, -4, 10, 7, 0.3], [6, 6, 8, 5.5, -0.4], [22, -10, 12, 8, 0.2], [-36, 12, 9, 6, 0.6], [34, 16, 7, 5, -0.2], [-4, -24, 11, 7, 0.1], [-30, -22, 8, 6, -0.5]];
  const SOLAR = 2;   // 這個埤塘架了太陽能板
  for (const [x, z, a, c, r] of PONDS) {
    b.add(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), M('#C9E2B0', { pat: 1, patCol: '#B6D59A', patScale: 0.8 }), x, 0.16, z, 0, r, 0, a + 1.6, 1, c + 1.6);   // 塘岸
    b.add(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), dots('#A0D8EF', 1.0, '#BCE2E8'), x, 0.2, z, 0, r, 0, a, 1, c);
  }
  // 太陽能板：一排排斜斜的深藍板子浮在水上
  const [sx, sz, sa, scc, sr] = PONDS[SOLAR];
  for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) {
    const lx = i * 2.6, lz = j * 2.4; if ((lx / sa) ** 2 + (lz / scc) ** 2 > 0.6) continue;
    const x = sx + lx * Math.cos(sr) + lz * Math.sin(sr), z = sz - lx * Math.sin(sr) + lz * Math.cos(sr);
    b.add(box(2.2, 0.1, 1.8), M('#5B7FC7', { pat: 6, patCol: '#A0D8EF', patScale: 0.25 }), x, 0.5, z, -0.35, sr, 0);
    b.add(box(0.2, 0.4, 0.2), M('#DED5E3'), x, 0.2, z);
  }
  // 菜園：一排排高麗菜
  for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) b.add(new THREE.SphereGeometry(0.55, 10, 8).scale(1, 0.75, 1), dots('#A8D8B9', 0.2, '#93C9A6'), 10 + c * 1.5, 0.3, 22 + r * 1.8);
  ridge(b, [[-90, -90, 40, 18, 6], [-10, -100, 46, 22, 7], [80, -90, 40, 16, 6]], stripes('#BBBCDE', 2.4, '#C9C3E3', 2));
  b.build(W, { cast: false });
  const pondHit = PONDS.map(([x, z, a, c, r], k) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, 0.25, z); m.rotation.y = r; m.scale.set(a, 1, c); W.add(m); tag(m, 'pond', k, clickables); return m; });

  // ---------- 三合院和桃花 ----------
  const yard = [house(W, -12, 22, { i: 0, w: 10, d: 5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'] }),
    house(W, -19, 17, { i: 1, w: 7, d: 4.5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], rot: Math.PI / 2 }),
    house(W, -5, 17, { i: 2, w: 7, d: 4.5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], rot: -Math.PI / 2 })];
  const PEACH = CS('#F4B3C2', '#EBA0B0', ['#FFFFFF', '#EE836F']);
  const trees = [[-22, 26], [-2, 26], [-26, 10], [2, 12], [-14, 8]].map(([x, z], k) => { const tr = tree(W, R, x, z, k % 2 ? 'round' : 'cloud', PEACH, 1.0); tag(tr.g, 'peach', k, clickables); return tr; });
  const greens = [[30, 30, 'egg'], [44, -2, 'cloud'], [-44, -6, 'round'], [16, -26, 'column']].map(([x, z, k]) => tree(W, R, x, z, k, k === 'column' ? CROWN.pine : CROWN.green, 1.3));

  // ---------- 青蛙：塘邊一圈，春雷一響就鼓起鳴囊叫 ----------
  const frogs = [];
  PONDS.forEach(([x, z, a, c, r], k) => {
    if (k === SOLAR) return;
    for (let n = 0; n < 3; n++) {
      const t0 = R() * TAU, lx = Math.cos(t0) * (a + 0.6), lz = Math.sin(t0) * (c + 0.6);
      const g = new THREE.Group(); g.position.set(x + lx * Math.cos(r) + lz * Math.sin(r), 0.2, z - lx * Math.sin(r) + lz * Math.cos(r)); g.rotation.y = rr(0, TAU); W.add(g);
      mesh(new THREE.SphereGeometry(0.38, 10, 8).scale(1.2, 0.7, 1), M('#68BE8D'), 0, 0.26, 0, g);
      for (const sd of [-0.18, 0.18]) mesh(new THREE.SphereGeometry(0.1, 8, 6), M('#FFFFFF'), 0.25, 0.5, sd, g);
      const sac = mesh(new THREE.SphereGeometry(0.2, 10, 8), M('#FFFDF8', { shadow: false }), 0.38, 0.2, 0, g);
      frogs.push({ g, sac, ph: R() });
    }
  });

  // ---------- 雷雲和閃電 ----------
  const storm = new THREE.Group(); storm.position.set(-14, 17, -22); W.add(storm);
  const sb = new Batch();
  for (const [dx, dy, dz, r] of [[0, 0, 0, 4.5], [4.5, -1, 1, 3.4], [-4.6, -1.2, 0, 3.6], [1.5, 2.4, -1, 3.2], [-2, 1.6, 2, 2.8], [7.5, -1.8, -1, 2.4]]) sb.add(new THREE.SphereGeometry(r, 16, 10), M('#A6A5C4', { lit: true, shadow: false }), dx, dy, dz);
  sb.build(storm); noEdge(storm);
  tag(storm, 'storm', null, clickables);
  const bolt = new THREE.Group(); storm.add(bolt);
  const ZZ = [[0, -3], [-1.6, -7], [0.6, -8], [-1.4, -13], [1, -14.5], [-1.2, -20]];
  for (let k = 0; k < ZZ.length - 1; k++) {
    const [x0, y0] = ZZ[k], [x1, y1] = ZZ[k + 1], len = Math.hypot(x1 - x0, y1 - y0);
    const m = mesh(box(0.5, len, 0.5).translate(0, -len / 2, 0), M('#F8D97A', { emit: true, shadow: false }), x0, y0, 0, bolt); m.rotation.z = Math.atan2(x1 - x0, -(y1 - y0)); noEdge(m);
  }

  // ---------- 紋白蝶：在菜園上翻飛 ----------
  const flies = Array.from({ length: 8 }, () => {
    const g = new THREE.Group(); W.add(g);
    const wings = [-1, 1].map((sd) => { const w = new THREE.Group(); g.add(w); const m = mesh(new THREE.CircleGeometry(0.3, 10).rotateX(-Math.PI / 2).scale(1, 1, 1.2).translate(0, 0, sd * 0.32), M('#FFFDF8', { shadow: false }), 0, 0, 0, w); noEdge(m); w.userData.sd = sd; return w; });
    return { g, wings, cx: rr(10, 22), cz: rr(22, 30), ph: R() * TAU, r: rr(1.5, 3) };
  });
  // ---------- 塘邊釣魚的人 ----------
  const angler = walker(W, { col: PAL.sky }); straw(angler);
  angler.g.position.set(-16 + 0, 0.2, -4 + 9.2); angler.g.rotation.y = Math.PI / 2;
  for (const l of angler.legs) l.rotation.z = -1.4;
  mesh(box(0.7, 0.45, 0.7), M('#F8D97A'), -16, 0.15, 5.4, W);
  const rod = new THREE.Group(); rod.position.set(0, 1.25, 0.33); angler.g.add(rod);
  mesh(new THREE.CylinderGeometry(0.03, 0.05, 4.5, 5).translate(0, 2.25, 0), M('#B08A72'), 0, 0, 0, rod).rotation.z = -1.0;
  const catchFish = mesh(new THREE.SphereGeometry(0.25, 8, 6).scale(1.5, 0.6, 0.6), M('#BBBCDE'), 3.8, 0.4, 0, rod);
  tag(angler.g, 'angler', null, clickables);
  const egrets = Array.from({ length: 3 }, (_, i) => ({ b: bird(W, '#FFFFFF', 1.0), i }));
  // 驚蟄：春雷前後，雲偏灰
  const drift = clouds(W, R, [[20, 28, 4, 1.12], [50, 38, 6, 0.96], [-40, 20, 8, 1.04]], LOOP, { col: '#E4DCE8' });

  return {
    bg: '#EFEFF4', clickables,
    view: { target: [-2, 2, 2], span: 40, el: 34, az: 22, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 110, -2);
      // 春雷：每 10 秒閃一次，點雲也會打雷；打雷之後青蛙一起叫
      const auto = fr(t / 10), flash = t - ev.thunder < 0.5 ? t - ev.thunder : auto < 0.05 ? auto * 10 : -1;
      bolt.visible = flash >= 0 && (flash < 0.12 || (flash > 0.22 && flash < 0.32));
      storm.position.x = -14 + Math.sin(t * 0.1) * 4;
      storm.scale.setScalar(1 + (bolt.visible ? 0.05 : 0));
      const since = Math.min(t - ev.thunder, t - (Math.floor(t / 10) * 10)), loud = since < 3 || t - ev.croak < 2.5;
      for (const f of frogs) {
        const call = loud ? Math.abs(Math.sin(t * 9 + f.ph * 6)) : Math.max(0, Math.sin(t * 3 + f.ph * 9)) > 0.9 ? 0.7 : 0;
        f.sac.scale.setScalar(0.3 + call * 1.1); f.g.position.y = 0.2 + (loud ? Math.abs(Math.sin(t * 4 + f.ph * 5)) * 0.15 : 0);
      }
      for (const fl of flies) {
        const a = t * 0.9 + fl.ph; fl.g.position.set(fl.cx + Math.cos(a) * fl.r, 1.3 + Math.sin(t * 2.3 + fl.ph) * 0.5, fl.cz + Math.sin(a * 1.3) * fl.r * 0.6);
        fl.g.rotation.y = -a; for (const w of fl.wings) w.rotation.x = w.userData.sd * (0.3 + Math.abs(Math.sin(t * 14 + fl.ph)) * 1.0);
      }
      const ft = t - ev.fish, lift = ft < 2 ? Math.sin(Math.PI * ft / 2) : Math.max(0, Math.sin(t * 0.6)) * 0.1;
      rod.rotation.z = lift * 0.7; catchFish.visible = ft < 2; catchFish.rotation.x = t * 12;
      for (const e of egrets) { const a = t * 0.25 + e.i * 2.1; e.b.g.position.set(Math.cos(a) * 26, 14 + e.i * 2, -6 + Math.sin(a) * 16); e.b.g.rotation.y = -a - Math.PI / 2; flap(e.b, t * 6 + e.i, 0.6); }
      trees.forEach((tr, k) => { const T = ev.trees.get(k) ?? -9; sway(tr, t, 1, t > T ? Math.exp(-(t - T) * 3) * Math.sin((t - T) * 14) * 0.12 : 0); });
      for (const tr of greens) sway(tr, t);
      rings.update(t); pop.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'pond') { ev.croak = t; rings.add(V3(p.x, 0, p.z), t, 0.25); }
      if (kind === 'storm') { ev.thunder = t; pop.add(V3(p.x, p.y - 4, p.z), t, R, 0.8); }
      if (kind === 'peach') { ev.trees.set(ref, t); pop.add(V3(p.x, p.y + 1, p.z), t, R, 0.7); }
      if (kind === 'angler') { ev.fish = t; rings.add(V3(-12, 0, 5.4), t, 0.25); }
    },
  };
}
