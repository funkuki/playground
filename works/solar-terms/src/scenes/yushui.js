// 雨水・台中武陵農場：雪山腳下的河谷，櫻花一路開到山坡上，細雨一直下，花瓣被雨打落、鋪在路上。
// 撐傘的人沿著櫻花道走，山坡上是農場的木屋；谷底的七家灣溪裡，櫻花鉤吻鮭逆著水游，偶爾跳出水面。
import { THREE, M, dots, stripes, Batch, mesh, box, ribbon, tree, sway, house, walker, walk, umbrella, rain, ripples, bursts, clouds, ridge, CS, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

const creekZ = (x) => 10 + 4 * Math.sin(x * 0.06);
// 地形：溪的北邊（-z）是往上爬的山坡，南邊是一小段緩坡
function H(x, z) {
  const c = creekZ(x), back = 13 * ease(clamp01((c - z - 4) / 34)), front = 3 * ease(clamp01((z - c - 4) / 16));
  return 0.2 + back + front + 0.5 * Math.sin(x * 0.17 + z * 0.11) * clamp01(Math.abs(z - c) / 6 - 0.5);
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(219);
  const clickables = [];
  const ev = { trees: new Map(), fish: new Map() };
  const rings = ripples(W, 10);
  const pop = bursts(W, ['#F09199', '#F4B3C2', '#FFFFFF']);

  // ---------- 地形、溪、遠山 ----------
  const g = new THREE.PlaneGeometry(220, 170, 110, 85).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  mesh(g, dots('#B6D58A', 1.1, '#A1C473'), 0, 0, 0, W);
  const CP = []; for (let x = -110; x <= 110; x += 10) CP.push([x, creekZ(x)]);
  const creek = ribbon(CP, 7, () => 0.25, 220);
  const cm = mesh(creek.geo, dots('#A0D8EF', 1.0, '#FFFFFF'), 0, 0, 0, W); cm.castShadow = false; tag(cm, 'creek', null, clickables);
  const far = new Batch();
  ridge(far, [[-70, -95, 40, 34, 6], [0, -105, 50, 44, 7], [70, -95, 42, 36, 6], [130, -70, 36, 26, 6]], stripes('#BBBCDE', 2.4, '#C9C3E3', 2));
  for (const [x, z, h] of [[0, -105, 44], [-70, -95, 34], [70, -95, 36]]) far.add(new THREE.ConeGeometry(h * 0.22, h * 0.2, 7).translate(0, h * 0.9, 0), M('#FFFDF8'), x, 0, z, 0, 0, 0, 1, 1, 0.65);   // 山頂的殘雪
  far.build(W);

  // ---------- 櫻花道：一條路沿著溪上方的山坡，兩邊種滿櫻花 ----------
  const RP = []; for (let x = -100; x <= 100; x += 10) RP.push([x, creekZ(x) - 10 + 2 * Math.sin(x * 0.1)]);
  const road = ribbon(RP, 3.2, (x, z) => H(x, z) + 0.08, 220);
  mesh(road.geo, dots('#F3E3CF', 0.5, '#F4B3C2'), 0, 0, 0, W).castShadow = false;
  const RC = new THREE.CatmullRomCurve3(road.curve.getSpacedPoints(240).map((p) => V3(p.x, H(p.x, p.z) + 0.1, p.z)));
  const SAKURA = [CS('#F09199', '#E57D86', ['#FFFFFF', '#F4B3C2']), CS('#F4B3C2', '#EBA0B0', ['#FFFFFF', '#F09199']), CS('#FBD3DA', '#F4B3C2', ['#FFFFFF', '#F09199'])];
  const trees = [];
  const plant = (x, z, s) => {
    if (trees.some((t) => Math.hypot(t.p.x - x, t.p.z - z) < 4.2) || Math.abs(z - creekZ(x)) < 6) return;
    const tr = tree(W, R, x, z, pick(['cloud', 'round', 'cloud']), pick(SAKURA), s, H(x, z) - 0.2);
    tag(tr.g, 'sakura', trees.length, clickables); trees.push(tr);
  };
  for (let u = 0.04; u < 0.96; u += 0.035) { const p = RC.getPointAt(u), n = RC.getTangentAt(u); for (const sd of [-1, 1]) plant(p.x - n.z * sd * 3.6, p.z + n.x * sd * 3.6, rr(1.05, 1.35)); }
  for (let i = 0; i < 40; i++) plant(rr(-60, 60), rr(-40, 26), rr(0.9, 1.3));
  const pines = new Batch();
  for (let i = 0; i < 26; i++) { const x = rr(-70, 70), z = rr(-60, -38); pines.add(new THREE.ConeGeometry(1.6, 5, 8).translate(0, 2.5, 0), CROWN.pine.main, x, H(x, z) - 0.2, z, 0, 0, 0, rr(0.9, 1.4)); }
  pines.build(W);

  // ---------- 農場的木屋 ----------
  const homes = [[-26, -22, 0], [-16, -26, 1], [20, -20, 2]].map(([x, z, i]) => house(W, x, z, { i, w: 6.5, d: 5, wall: '#FFFDF8', roof: ['#5B7FC7', '#A0D8EF'], y: H(x, z) - 0.2, rot: 0.15 * (i - 1) }));

  // ---------- 落花：粉紅的花瓣被雨打下來 ----------
  const FN = 160;
  const petal = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.18, 0.04, 5), new THREE.MeshBasicMaterial({ color: '#F6C3CC' }), FN);
  petal.userData.noOutline = true; petal.frustumCulled = false; W.add(petal);
  const PS = Array.from({ length: FN }, () => { const tr = trees[Math.floor(R() * trees.length)]; return { x: tr.p.x + rr(-2.5, 2.5), z: tr.p.z + rr(-2.5, 2.5), y0: tr.p.y + rr(3, 5) * tr.s, ph: R(), w: R() * TAU }; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const drizzle = rain(W, R, 320, [-55, 55, -45, 30, 26], LOOP);

  // ---------- 撐傘散步的人 ----------
  const UMB = ['#F09199', '#A0D8EF', '#F8D97A', '#BBBCDE', '#FFFDF8', '#A8D8B9'];
  const strollers = Array.from({ length: 9 }, (_, i) => {
    const p = walker(W, { col: pick([PAL.white, PAL.sky, PAL.yellow, PAL.lilac, PAL.mint]), hat: R() < 0.3 ? '#F8D97A' : null });
    umbrella(p, UMB[i % UMB.length]);
    return { p, u: i / 9, dir: i % 2 ? 1 : -1, off: rr(-0.8, 0.8) };
  });

  // ---------- 櫻花鉤吻鮭：在溪裡逆著水游，偶爾跳一下 ----------
  const fish = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group(); W.add(g);
    const fb = new Batch();
    fb.add(new THREE.SphereGeometry(0.5, 12, 8).scale(1.4, 0.45, 0.45), dots('#8FA3B8', 0.15, '#4A4468'), 0, 0, 0);
    fb.add(new THREE.SphereGeometry(0.5, 12, 8).scale(1.1, 0.16, 0.47), M('#F09199'), 0, 0, 0);   // 身體側面的桃紅色帶
    fb.add(new THREE.ConeGeometry(0.22, 0.4, 4).rotateZ(Math.PI / 2).scale(1, 1, 0.2), M('#8FA3B8'), -0.85, 0, 0);
    fb.build(g);
    return { g, x0: rr(-40, 40), ph: R(), sp: rr(0.6, 1.0) };
  });
  // 雨水：貼著山坡的灰色雨雲
  const drift = clouds(W, R, [[-40, 21, 2, 1.28], [10, 32, 4, 1.44], [50, 36, 6, 1.12], [-10, 31, 3, 0.88]], LOOP, { col: '#CBC2DA', shape: 'flat', speed: 0.7 });

  return {
    bg: '#F3EEF4', night: 0.08, clickables,
    view: { target: [0, 5, 0], span: 40, el: 30, az: 18, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 110, 0); drizzle(t, H);
      for (let i = 0; i < FN; i++) {
        const s = PS[i], f = fr(t / 7 + s.ph), y = lerp(s.y0, H(s.x, s.z) + 0.1, Math.min(1, f * 1.3));
        pos.set(s.x + Math.sin(t * 1.3 + s.w) * 0.8 - f * 2, y, s.z + Math.cos(t + s.w) * 0.6);
        e.set(t * 2 + s.w, s.w, t * 1.5); q.setFromEuler(e);
        petal.setMatrixAt(i, m4.compose(pos, q, sc.setScalar(fadeEnds(f, 10))));
      }
      petal.instanceMatrix.needsUpdate = true;
      trees.forEach((tr, k) => { const T = ev.trees.get(k) ?? -9; sway(tr, t, 1, t > T ? Math.exp(-(t - T) * 3) * Math.sin((t - T) * 14) * 0.12 : 0); });
      for (const s of strollers) {
        const u = fr(s.u + s.dir * t / LOOP * 0.45), a = RC.getPointAt(u), n = RC.getPointAt(fr(u + 0.003 * s.dir));
        walk(s.p, a.x + s.off, a.z, Math.atan2(n.z - a.z, n.x - a.x), t * 5 + s.u * 9);
        s.p.arms[1].rotation.z = -2.4; s.p.g.position.y += a.y; s.p.g.scale.setScalar(fadeEnds(u, 14));
      }
      fish.forEach((f, k) => {
        const x = f.x0 + fr(t / LOOP * f.sp + f.ph) * 30 - 15, z = creekZ(x) + Math.sin(t * 0.8 + k) * 1.5;
        const T = ev.fish.get(k) ?? -9, auto = fr(t / 6 + f.ph), jt = t - T < 1 ? (t - T) : auto < 0.12 ? auto / 0.12 : -1;
        const hop = jt >= 0 ? Math.sin(Math.PI * jt) : 0;
        f.g.position.set(x, 0.3 + hop * 2.2, z); f.g.rotation.set(0, Math.PI - Math.atan2(0.24 * Math.cos(x * 0.06), 1) - Math.PI, hop > 0 ? Math.cos(Math.PI * jt) * 0.8 : 0);
        f.g.scale.setScalar(fadeEnds(fr(t / LOOP * f.sp + f.ph), 10));
      });
      rings.update(t); pop.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'sakura') { ev.trees.set(ref, t); pop.add(V3(p.x, p.y + 1, p.z), t, R, 0.7); }
      if (kind === 'creek') {
        rings.add(V3(p.x, 0, p.z), t, 0.3);
        let best = 0, bd = 1e9; fish.forEach((f, k) => { const d = f.g.position.distanceTo(p); if (d < bd) { bd = d; best = k; } });
        ev.fish.set(best, t);
      }
    },
  };
}
