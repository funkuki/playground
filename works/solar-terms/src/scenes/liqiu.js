// 立秋・台南七股鹽田：傍晚。一格一格的瓦盤鹽田映著夕陽，鹽工拿木耙把鹽推成一小堆；田埂上推車把鹽運走。
// 後面是白色的七股鹽山，有人沿著步道爬上去看夕陽；西邊是海，太陽快落下去了，白鷺成群飛回去。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, walker, walk, bird, flap, squiggles, ripples, bursts, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(815);
  const clickables = [];
  const ev = { hill: -9, heaps: new Map() };
  const rings = ripples(W, 10);
  const salt = bursts(W, ['#FFFFFF', '#FFF4E8', '#F4D9E8']);

  // ---------- 地面、海 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#F3E3CF', 2, '#EAD5BC'), 0, 0, 0, W); gnd.castShadow = false;
  const sb = new Batch();
  sb.add(box(80, 0.06, 300), dots('#A2D7DD', 1.4, '#BCE2E8'), -86, 0, 0);
  // 鹽田四周：草地、引海水的水道、防風林旁的小路
  slab(sb, dots('#C9E2B0', 1.2, '#B6D59A'), 2, -22, 120, 18, 0.08);
  slab(sb, dots('#C9E2B0', 1.2, '#B6D59A'), 2, 34, 120, 14, 0.08);
  sb.add(box(110, 0.1, 3), dots('#A2D7DD', 0.9, '#BCE2E8'), 0, 0.02, -12.4);
  sb.add(box(3, 0.1, 50), dots('#A2D7DD', 0.9, '#BCE2E8'), -36.5, 0.02, 8);
  sb.add(box(120, 0.12, 3.4), dots('#EDE6F7', 0.8, '#DCD4EE'), 2, 0, 28);
  sb.build(W, { cast: false });
  const waves = squiggles(W, R, 26, () => V3(rr(-120, -50), 0.06, rr(-80, 80)), [1, 0.15], 1.0, LOOP);

  // ---------- 瓦盤鹽田：淺淺的水映著天空，田底是碎瓦（剖面線花紋）----------
  // 每一格映著不同的天色：靠西邊（太陽那邊）的偏暖，東邊的偏藍紫
  const SKY = ['#F9D58E', '#F7B977', '#F6D6CC', '#F4B3C2', '#E4DCE8', '#BCE2E8', '#A2D7DD'];
  const PAN = (k) => M(SKY[Math.min(SKY.length - 1, Math.max(0, k))], { pat: 5, patCol: lt(SKY[Math.min(SKY.length - 1, Math.max(0, k))], -0.08), patScale: 0.7 });
  const DIKE = dots('#E9D6BE', 0.5, '#DDC6AA');
  const pb = new Batch(), pans = [];
  const COLS = 7, ROWS = 5, PW = 7.4, PD = 5.6, GAP = 1.1;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = -30 + c * (PW + GAP), z = -6 + r * (PD + GAP);
    slab(pb, DIKE, x, z, PW + GAP, PD + GAP, 0.45);
    slab(pb, PAN(Math.round(c * 0.85 + (r % 2) * 0.6 + (R() - 0.5) * 1.2)), x, z, PW, PD, 0.5);
    pans.push({ x, z, k: r * COLS + c });
  }
  pb.build(W, { cast: false });
  const panHit = new THREE.Mesh(new THREE.PlaneGeometry(COLS * (PW + GAP), ROWS * (PD + GAP)).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  panHit.position.set(-30 + (COLS - 1) * (PW + GAP) / 2, 0.55, -6 + (ROWS - 1) * (PD + GAP) / 2); W.add(panHit);
  tag(panHit, 'pan', null, clickables);

  // ---------- 鹽堆：有鹽工在耙的田，鹽堆慢慢變大；其他田的田埂上已經堆好一排 ----------
  const HEAP = dots('#FFFFFF', 0.35, '#F1E9F4');
  const fixed = new Batch();
  for (const p of pans) if (p.k % 3 === 1) for (let j = 0; j < 4; j++) fixed.add(new THREE.ConeGeometry(0.55, 0.75, 10).translate(0, 0.37, 0), HEAP, p.x - 2.6 + j * 1.7, 0.5, p.z - PD / 2 + 0.5);
  fixed.build(W);
  const rakers = [8, 16, 24].map((k, i) => {
    const p = pans[k];
    const g = new THREE.Group(); g.position.set(p.x, 0.5, p.z); W.add(g);
    const man = walker(g, { col: [PAL.white, PAL.sky, PAL.pink][i], hat: '#F8D97A', s: 0.95 });
    const rake = new THREE.Group(); man.g.add(rake);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6).rotateZ(1.15), M(PAL.trunk), 0.9, 0.85, 0, rake);
    mesh(box(0.12, 0.3, 1.1), M(PAL.trunk), 2.05, 0.15, 0, rake);
    const heaps = [0, 1, 2].map((j) => { const h = mesh(new THREE.ConeGeometry(0.75, 0.95, 12).translate(0, 0.47, 0), HEAP, -2.3 + j * 2.3, 0, 1.6, g); return h; });
    tag(g, 'heap', i, clickables);
    return { g, man, heaps, ph: i * 0.31 };
  });

  // ---------- 推車：沿著田埂把鹽運到鹽山 ----------
  const cartPath = new THREE.CatmullRomCurve3([V3(-36, 0.5, -9.5), V3(28, 0.5, -9.5), V3(34, 0.5, -16), V3(26, 0.5, -24)]);
  const cart = new THREE.Group(); W.add(cart);
  const cb = new Batch();
  cb.add(box(1.4, 0.5, 0.9), stripes(PAL.sky, 0.25, '#FFFFFF', 4), 0.4, 0.35, 0);
  cb.add(new THREE.ConeGeometry(0.55, 0.55, 10), HEAP, 0.4, 1.1, 0);
  cb.add(new THREE.TorusGeometry(0.25, 0.07, 6, 12), M(PAL.plum), 1.0, 0.25, 0);
  cb.build(cart);
  const pusher = walker(cart, { col: PAL.coral, hat: '#F8D97A', s: 0.95 }); pusher.g.position.x = -0.7;
  for (const a of pusher.arms) a.rotation.z = -1.1;

  // ---------- 七股鹽山 ----------
  const hill = new THREE.Group(); hill.position.set(16, 0, -28); W.add(hill);
  const hb = new Batch();
  hb.add(new THREE.ConeGeometry(14, 13, 9).translate(0, 6.5, 0), dots('#FFFFFF', 0.9, '#EFE8F4'), 0, 0, 0, 0, 0.3, 0);
  hb.add(new THREE.ConeGeometry(9, 8.5, 8).translate(0, 4.25, 0), dots('#FFFFFF', 0.9, '#EFE8F4'), 13, 0, 4, 0, 0.8, 0);
  hb.add(new THREE.ConeGeometry(7, 6, 8).translate(0, 3, 0), dots('#FFFFFF', 0.9, '#EFE8F4'), -12, 0, 5, 0, 0.2, 0);
  hb.build(hill);
  // 步道：沿著山坡一階一階往上
  const steps = new Batch(), STEP = [];
  for (let i = 0; i < 16; i++) { const u = i / 15, x = lerp(4, 0.6, u), z = lerp(13, 1.4, u), y = u * 12.2; STEP.push(V3(x + 16, y, z - 28)); steps.add(box(1.6, 0.25, 0.8), M('#F2A58E'), x, y, z, 0, -0.3, 0); }
  steps.build(hill);
  tag(hill, 'hill', null, clickables);
  const climbC = new THREE.CatmullRomCurve3(STEP);
  const climbers = [0, 0.33, 0.66].map((u, i) => ({ p: walker(W, { col: [PAL.lilac, PAL.yellow, PAL.mint][i], hat: i === 1 ? PAL.coral : null, s: 0.9 }), u }));
  // 鹽山旁邊的遊客中心和幾棵木麻黃
  const shed = new Batch();
  shed.add(box(12, 3.2, 6), stripes('#FFFFFF', 0.45, '#F2EDF8', 4), 40, 0, -26);
  shed.add(new THREE.BoxGeometry(13, 0.3, 7.5), M(PAL.sky, { pat: 4, patCol: '#FFFFFF', patScale: 0.6 }), 40, 3.4, -26, 0.05, 0, 0);
  shed.add(box(4, 1.2, 0.2), M(PAL.coral), 40, 3.6, -22.2);
  shed.build(W);
  const trees = [];
  for (let x = -40; x <= 46; x += 5.5) trees.push(tree(W, R, x + rr(-1, 1), 31.5, 'column', CROWN.pine, rr(1.0, 1.3)));   // 路邊一排木麻黃
  for (const [x, z, s] of [[-40, -26, 1.3], [-30, -30, 1.1], [44, -14, 1.2], [36, -20, 1.4]]) trees.push(tree(W, R, x, z, 'cloud', CROWN.green, s));

  // ---------- 夕陽：一顆不描邊的大太陽，掛在海上 ----------
  const sun = mesh(new THREE.CircleGeometry(9, 40), M('#F9D58E', { emit: true, shadow: false }), -150, 14, -60, W);
  sun.lookAt(V3(60, 30, 80)); noEdge(sun);
  const sunRing = mesh(new THREE.RingGeometry(10.5, 11.6, 40), M('#F4B3C2', { emit: true, shadow: false }), -150, 14, -60, W);
  sunRing.lookAt(V3(60, 30, 80)); noEdge(sunRing);

  // ---------- 白鷺：成群往西飛 ----------
  const egrets = Array.from({ length: 7 }, (_, i) => ({ b: bird(W, '#FFFFFF', 1.1), dx: (i % 4) * 2.4 + rr(-0.5, 0.5), dz: Math.floor(i / 4) * 2.6 + (i % 2) * 1.2, ph: R() * 6 }));

  return {
    bg: '#FBE0D2', night: 0.2, dusk: 1, clickables,
    view: { target: [2, 2, -6], span: 36, el: 30, az: 22, swing: 6, shadowR: 90 },
    update(t) {
      waves(t);
      // 鹽工：拉耙子推鹽，一個 loop 裡鹽堆慢慢長大
      const grow = fr(t / LOOP);
      for (const r of rakers) {
        const s = Math.sin(t * 1.6 + r.ph * 9), x = -1.6 + s * 1.4;
        r.man.g.position.set(x, 0.12, -0.6); r.man.g.rotation.y = 0;
        r.man.body.rotation.z = -0.25 - s * 0.12;
        r.man.arms[0].rotation.z = -0.9 - s * 0.3; r.man.arms[1].rotation.z = -0.9 - s * 0.3;
        r.man.legs[0].rotation.z = 0.25 + s * 0.15; r.man.legs[1].rotation.z = -0.2 - s * 0.15;
        const T = ev.heaps.get(rakers.indexOf(r)) ?? -9;
        r.heaps.forEach((h, j) => { const k = clamp01(grow * 3 - j * 0.8) * 0.85 + 0.15; h.scale.set(k, k * squash(t - T - j * 0.08), k); });
      }
      // 推車：在田埂上來回
      const cu = fr(t / LOOP + 0.2), cuu = cu < 0.5 ? cu * 2 : 2 - cu * 2;
      const a = cartPath.getPointAt(Math.min(0.999, cuu)), b2 = cartPath.getPointAt(Math.min(0.999, cuu + 0.003));
      cart.position.set(a.x, a.y + Math.abs(Math.sin(t * 9)) * 0.04, a.z);
      cart.rotation.y = -Math.atan2(b2.z - a.z, b2.x - a.x) + (cu < 0.5 ? 0 : Math.PI);
      const ph = t * 7;
      pusher.legs[0].rotation.z = Math.sin(ph) * 0.5; pusher.legs[1].rotation.z = -Math.sin(ph) * 0.5;
      // 爬鹽山的人
      for (const c of climbers) {
        const u = fr(c.u + t / LOOP * 0.5), uu = u < 0.5 ? u * 2 : 2 - u * 2;
        const p = climbC.getPointAt(uu), n = climbC.getPointAt(Math.min(0.999, uu + 0.01));
        const ang = Math.atan2(n.z - p.z, n.x - p.x) + (u < 0.5 ? 0 : Math.PI);
        walk(c.p, p.x, p.z, ang, t * 6 + c.u * 9);
        c.p.g.position.y += p.y + 0.2;
      }
      // 白鷺
      const fu = fr(t / (LOOP * 0.5));
      for (const e of egrets) {
        e.b.g.position.set(lerp(70, -110, fu) + e.dx, 16 + Math.sin(t * 0.8 + e.ph) * 0.6, 10 + e.dz);
        e.b.g.rotation.y = Math.PI; e.b.g.scale.setScalar(1.1 * fadeEnds(fu, 8));
        flap(e.b, t * 6 + e.ph, 0.6);
      }
      hill.scale.y = squash(t - ev.hill);
      sunRing.scale.setScalar(1 + Math.sin(t * 1.2) * 0.04);
      for (const tr of trees) sway(tr, t, 1.3);
      rings.update(t); salt.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'hill') { ev.hill = t; salt.add(V3(16, 13, -28), t, R, 1.2); }
      if (kind === 'heap') { ev.heaps.set(ref, t); salt.add(V3(p.x, p.y + 0.6, p.z), t, R, 0.6); }
      if (kind === 'pan') rings.add(V3(p.x, 0, p.z), t, 0.58);
    },
  };
}
