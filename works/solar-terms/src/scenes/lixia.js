// 立夏・苗栗桐花步道：淺山上的油桐樹開滿白花，花一朵朵旋轉著落下，步道鋪成白色，散步的人在花下走。
// 山腳是客家人家和一片竹林，竹筍一節節冒出來，有人在挖筍；田邊的水塘裡，青蛙跳來跳去。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, ribbon, tree, sway, house, walker, walk, bursts, clouds, ridge, CS, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 地形：後面兩座淺山，前面是緩坡和田
function H(x, z) {
  const a = 14 * Math.exp(-((x + 16) ** 2 / 600 + (z + 26) ** 2 / 300)), b = 11 * Math.exp(-((x - 24) ** 2 / 500 + (z + 22) ** 2 / 260));
  return Math.max(0, a + b + 0.8 * Math.sin(x * 0.15 + z * 0.1) + 0.5);
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(506);
  const clickables = [];
  const ev = { trees: new Map(), shoots: -9, frogs: -9 };
  const petals = bursts(W, ['#FFFFFF', '#FBE3E6', '#F4B3C2']);

  // ---------- 地形 ----------
  const g = new THREE.PlaneGeometry(200, 160, 100, 80).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  mesh(g, dots('#B6D58A', 1.1, '#A1C473'), 0, 0, 0, W);
  const far = new Batch();
  ridge(far, [[-80, -80, 46, 26, 7], [0, -90, 50, 30, 6], [80, -80, 44, 24, 7]], stripes('#A8D8B9', 2.4, '#93C9A6', 2));
  far.build(W);

  // ---------- 步道：從山腳彎上山，鋪滿落花（白色點點）----------
  const TP = [[40, 28], [22, 20], [8, 12], [-4, 4], [-10, -6], [-6, -16], [-14, -24], [-26, -30]];
  const trail = ribbon(TP, 3, (x, z) => H(x, z) + 0.1, 200);
  mesh(trail.geo, dots('#F3E3CF', 0.5, '#FFFFFF'), 0, 0, 0, W).castShadow = false;
  const TC = new THREE.CatmullRomCurve3(trail.curve.getSpacedPoints(200).map((p) => V3(p.x, H(p.x, p.z) + 0.1, p.z)));

  // ---------- 油桐樹：白色的樹冠，花朵是白中帶紅心 ----------
  const TUNG = CS('#FFFFFF', '#F4F0F6', ['#FBE3E6', '#EE836F']);
  const tungs = [];
  for (let i = 0; i < 26; i++) {
    const x = rr(-46, 46), z = rr(-40, -2), y = H(x, z);
    if (y < 3 || tungs.some((t) => Math.hypot(t.p.x - x, t.p.z - z) < 6)) continue;
    const tr = tree(W, R, x, z, pick(['cloud', 'round', 'cloud']), TUNG, rr(1.2, 1.6), y - 0.2);
    tag(tr.g, 'tung', tungs.length, clickables);
    tungs.push(tr);
  }
  const greens = [[-40, -6, 'cone', CROWN.pine], [44, -4, 'round', CROWN.green], [30, -36, 'egg', CROWN.teal], [-30, -38, 'cone', CROWN.pine]].map(([x, z, k, cs]) => tree(W, R, x, z, k, cs, 1.4, H(x, z) - 0.2));

  // ---------- 落花：一朵朵小白花，邊落邊轉 ----------
  const FN = 180;
  const flower = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.22, 0.05, 5), new THREE.MeshBasicMaterial({ color: '#FFFDF8' }), FN);
  flower.userData.noOutline = true; flower.frustumCulled = false; W.add(flower);
  const FS = Array.from({ length: FN }, () => { const tr = tungs[Math.floor(R() * tungs.length)]; return { x: tr.p.x + rr(-3, 3), z: tr.p.z + rr(-3, 3), y0: tr.p.y + rr(4, 7) * tr.s, ph: R(), w: R() * TAU, sp: rr(0.6, 1.2) }; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();

  // ---------- 客家人家、田、水塘 ----------
  const homes = [house(W, -30, 18, { i: 0, w: 9, d: 5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], y: H(-30, 18) - 0.1 }), house(W, -40, 24, { i: 1, w: 6, d: 5, two: false, wall: '#FFFDF8', roof: ['#D9665B', '#F7B977'], rot: Math.PI / 2, y: H(-40, 24) - 0.1 })];
  const fields = new Batch();
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) slab(fields, M(pick(['#B0CA71', '#C9DB8E', '#A8D8B9']), { pat: 6, patCol: '#9DB862', patScale: 0.5 }), -14 + i * 10, 24 + j * 9, 9, 8, 0.2, H(-14 + i * 10, 24 + j * 9) - 0.1);
  slab(fields, dots('#A0D8EF', 0.8, '#BCE2E8'), 26, 22, 12, 8, 0.15, H(26, 22) - 0.05, 3);
  fields.build(W, { cast: false });
  // 青蛙：塘邊幾隻綠色小青蛙，隔一陣子跳一下
  const frogs = Array.from({ length: 5 }, (_, i) => {
    const g = new THREE.Group(); W.add(g);
    mesh(new THREE.SphereGeometry(0.35, 10, 8).scale(1.2, 0.7, 1), M('#68BE8D'), 0, 0.25, 0, g);
    for (const sd of [-0.18, 0.18]) mesh(new THREE.SphereGeometry(0.1, 8, 6), M('#FFFFFF'), 0.25, 0.48, sd, g);
    const a = (i / 5) * TAU;
    return { g, x: 26 + Math.cos(a) * 6.8, z: 22 + Math.sin(a) * 4.6, ph: R(), a };
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(7, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  pond.position.set(26, H(26, 22) + 0.3, 22); W.add(pond); tag(pond, 'frogs', null, clickables);

  // ---------- 竹林和竹筍 ----------
  const bamboo = new Batch();
  for (let i = 0; i < 40; i++) {
    const x = rr(-58, -44), z = rr(4, 20), h = rr(7, 11), y = H(x, z);
    bamboo.add(new THREE.CylinderGeometry(0.16, 0.18, h, 6).translate(0, h / 2, 0), stripes('#68BE8D', 0.4, '#57AC7C', 6), x, y, z, rr(-0.08, 0.08), 0, rr(-0.08, 0.08));
    bamboo.add(new THREE.SphereGeometry(1.0, 8, 6).scale(0.8, 1.3, 0.8), dots('#A8D8B9', 0.3, '#93C9A6'), x, y + h, z);
  }
  bamboo.build(W);
  const shoots = Array.from({ length: 7 }, (_, i) => {
    const x = -42 + (i % 4) * 1.6, z = 8 + Math.floor(i / 4) * 2.4 + (i % 2) * 0.6;
    const m = mesh(new THREE.ConeGeometry(0.35, 1.2, 8).translate(0, 0.6, 0), stripes('#E6C68A', 0.15, '#B08A72', 6), x, H(x, z), z, W);
    return { m, ph: i / 7 };
  });
  const sg = new THREE.Group(); W.add(sg); for (const s of shoots) sg.attach(s.m); tag(sg, 'shoots', null, clickables);
  const digger = walker(W, { col: PAL.sky, hat: '#F8D97A' }); digger.g.position.set(-38.5, H(-38.5, 10) + 0.15, 10); digger.g.rotation.y = Math.PI;
  const hoe = new THREE.Group(); digger.arms[0].add(hoe);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6).translate(0, -0.8, 0), M(PAL.trunk), 0, -0.5, 0, hoe);
  mesh(box(0.4, 0.06, 0.3), M('#C9C3E3'), 0, -2.2, 0, hoe);

  // ---------- 散步的人 ----------
  const hikers = Array.from({ length: 7 }, (_, i) => ({ p: walker(W, { col: pick([PAL.pink, PAL.yellow, PAL.sky, PAL.mint, PAL.white, PAL.lilac]), hat: R() < 0.4 ? pick([PAL.coral, '#F8D97A']) : null }), u: i / 7, dir: i % 2 ? 1 : -1, off: rr(-0.7, 0.7) }));
  const drift = clouds(W, R, [[-30, 30, -50, 1.3], [40, 34, -40, 1.1]], LOOP);

  return {
    bg: '#EEF4E6', clickables,
    view: { target: [-2, 6, -6], span: 40, el: 30, az: 14, swing: 7, shadowR: 90 },
    update(t) {
      drift(t, 200);
      for (let i = 0; i < FN; i++) {
        const s = FS[i], f = fr(t * s.sp / LOOP * 3 + s.ph), y = lerp(s.y0, H(s.x, s.z) + 0.1, f);
        pos.set(s.x + Math.sin(t * 0.9 + s.w) * 1.3 + f * 3, y, s.z + Math.cos(t * 0.7 + s.w) * 0.8);
        q.setFromEuler(e.set(t * 2 + s.w, t * 1.5, Math.sin(t * 3 + s.w) * 0.6));
        flower.setMatrixAt(i, m4.compose(pos, q, sc.setScalar(fadeEnds(f, 12))));
      }
      flower.instanceMatrix.needsUpdate = true;
      tungs.forEach((tr, k) => { const T = ev.trees.get(k) ?? -9; sway(tr, t, 1, Math.exp(-Math.max(0, t - T) * 3) * Math.sin((t - T) * 14) * 0.1 * (t > T ? 1 : 0)); });
      for (const tr of greens) sway(tr, t);
      for (const h of hikers) {
        const u = fr(h.u + h.dir * t / LOOP * 0.6), a = TC.getPointAt(u), n = TC.getPointAt(fr(u + 0.003 * h.dir));
        walk(h.p, a.x + h.off, a.z, Math.atan2(n.z - a.z, n.x - a.x), t * 6 + h.u * 9);
        h.p.g.position.y += a.y; h.p.g.scale.setScalar(fadeEnds(u, 14));
      }
      // 竹筍：一個 loop 慢慢長高；點一下全部冒出一截
      const boost = Math.exp(-Math.max(0, t - ev.shoots) * 2) * (t > ev.shoots ? 1 : 0);
      for (const s of shoots) { const k = 0.4 + fr(t / LOOP + s.ph) * 0.9 + boost * 0.5; s.m.scale.set(1, k, 1); }
      const dig = Math.max(0, Math.sin(t * 2.4));
      digger.body.rotation.z = -0.3 - dig * 0.25; digger.arms[0].rotation.z = -0.4 - dig * 0.9; digger.arms[1].rotation.z = -0.3 - dig * 0.8;
      // 青蛙：輪流跳，點水塘全部一起跳
      for (const f of frogs) {
        const T = fr(t / 2.4 + f.ph), hop = T < 0.25 ? Math.sin(Math.PI * T / 0.25) : 0, all = Math.sin(Math.PI * clamp01((t - ev.frogs) / 0.6));
        const j = Math.max(hop * 0.7, all * 1.4), a = f.a + Math.floor(t / 2.4 + f.ph) * 0.4;
        const x = 26 + Math.cos(a) * 6.8, z = 22 + Math.sin(a) * 4.6;
        f.g.position.set(x, H(x, z) + 0.05 + j, z); f.g.rotation.y = -a - Math.PI / 2; f.g.scale.set(1, 1 + j * 0.3, 1);
      }
      petals.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tung') { ev.trees.set(ref, t); petals.add(V3(p.x, p.y + 1, p.z), t, R, 0.8); }
      if (kind === 'shoots') ev.shoots = t;
      if (kind === 'frogs') ev.frogs = t;
    },
  };
}
