// 大暑・台東鹿野高台：清晨的熱氣球嘉年華。台地的草坪上，熱氣球一顆顆鼓起來，噴火器一噴就慢慢升空，飄到縱谷上；
// 飛行傘在旁邊繞圈。台地邊是一排排茶園和鳳梨田，坡下是寬寬的卑南溪和一格格的田，遠處是海岸山脈。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, ribbon, tree, sway, walker, walk, bursts, clouds, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 地形：左後方是一塊平平的台地（高 8），往右前方落到縱谷
function H(x, z) {
  const d = (x - z * 0.4) - 6;
  return 8 * (1 - ease(clamp01((d + 6) / 14))) + 0.6 * Math.sin(x * 0.2 + z * 0.13);
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(723);
  const clickables = [];
  const ev = { balloons: new Map(), crowd: -9 };
  const sparks = bursts(W, ['#F8D97A', '#EE836F', '#FFFFFF']);

  // ---------- 地形、溪、田、遠山 ----------
  const g = new THREE.PlaneGeometry(220, 180, 110, 90).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, Math.max(0, H(gp.getX(i), gp.getZ(i))));
  g.computeVertexNormals();
  mesh(g, dots('#B6D58A', 1.1, '#A1C473'), 0, 0, 0, W);
  const rv = ribbon([[40, -90], [46, -40], [56, 0], [62, 40], [72, 90]], 14, () => 0.06);
  mesh(rv.geo, dots('#BCE2E8', 1.0, '#FFFFFF'), 0, 0, 0, W).castShadow = false;
  const vb = new Batch();
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { const x = 24 + i * 9, z = -60 + j * 14; if (H(x, z) < 0.8 && Math.abs(x - (46 + z * 0.15)) > 10) slab(vb, M(pick(['#B0CA71', '#C9DB8E', '#D8DC92', '#A8D8B9']), { pat: 6, patCol: '#9DB862', patScale: 0.5 }), x, z, 8, 12, 0.15, 0.1); }
  ridge(vb, [[110, -70, 40, 26, 7], [120, -10, 44, 30, 6], [116, 50, 40, 24, 7], [-60, -100, 50, 30, 6]], stripes('#BBBCDE', 2.4, '#C9C3E3', 2));
  vb.build(W);

  // ---------- 台地上：草坪、茶園一排排、鳳梨田 ----------
  const tb = new Batch();
  slab(tb, dots('#C9E2B0', 0.9, '#B6D59A'), -20, 0, 26, 28, 0.12, H(-20, 0) - 0.05, 4);
  for (let r = 0; r < 9; r++) for (let x = -50; x <= -34; x += 1.6) { const z = -24 + r * 3, y = H(x, z); tb.add(new THREE.CapsuleGeometry(0.75, 0.8, 3, 8).rotateX(Math.PI / 2).scale(1, 0.75, 1), dots('#68BE8D', 0.2, '#57AC7C'), x, y + 0.4, z); }
  for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) { const x = -40 + c * 2, z = 22 + r * 2.4, y = H(x, z); tb.add(new THREE.ConeGeometry(0.6, 0.9, 6).translate(0, 0.45, 0), M('#7EBEAB'), x, y, z); if ((r + c) % 2) tb.add(new THREE.SphereGeometry(0.28, 8, 6).scale(1, 1.3, 1), M('#F8B862'), x, y + 1.0, z); }
  tb.build(W);
  const trees = [[-24, -20, 'round'], [-4, -22, 'cloud'], [-54, 8, 'egg'], [-30, 18, 'cloud'], [4, 20, 'round']].map(([x, z, k]) => tree(W, R, x, z, k, pick([CROWN.green, CROWN.teal]), 1.3, H(x, z) - 0.1));

  // ---------- 熱氣球 ----------
  const SKINS = [['#F8D97A', '#EE836F'], ['#A0D8EF', '#FFFDF8'], ['#F4B3C2', '#FFFDF8'], ['#A8D8B9', '#F8D97A'], ['#BBBCDE', '#F4B3C2'], ['#F7B977', '#5B7FC7'], ['#FFFDF8', '#68BE8D']];
  const balloon = (k) => {
    const g = new THREE.Group(); W.add(g);
    const [a, c] = SKINS[k % SKINS.length];
    const env = new THREE.Group(); env.position.y = 5.2; g.add(env);
    mesh(new THREE.SphereGeometry(3, 24, 16).scale(1, 1.15, 1), M(a, { pat: 4, patCol: c, patScale: 1.1 }), 0, 0, 0, env);
    mesh(new THREE.CylinderGeometry(1.2, 0.7, 1.6, 16, 1, true), M(c), 0, -3.6, 0, env);
    const b = new Batch();
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4).translate(0, 0.8, 0), M(PAL.plum), dx, 0.9, dz);
    b.add(box(1.4, 0.9, 1.4), stripes('#E6C68A', 0.2, '#B08A72', 4), 0, 0, 0);
    b.build(g);
    const flame = new THREE.Group(); flame.position.y = 2.2; g.add(flame);
    mesh(new THREE.ConeGeometry(0.3, 1.0, 8).translate(0, 0.5, 0), M('#F8B500', { emit: true, shadow: false }), 0, 0, 0, flame);
    const riders = [0, 1].map((i) => { const p = walker(g, { col: [PAL.white, PAL.sky][i], s: 0.55 }); p.g.position.set(i ? 0.3 : -0.3, 0.2, 0); for (const l of p.legs) l.visible = false; return p; });
    tag(g, 'balloon', k, clickables);
    return { g, env, flame, riders };
  };
  const SPOTS = [[-22, -8], [-14, -12], [-6, -6], [-18, 4], [-8, 6], [-28, 2], [0, -14]];
  const balloons = SPOTS.map(([x, z], k) => ({ ...balloon(k), x, z, ph: k / SPOTS.length, dx: rr(0.6, 1.2), dz: rr(-0.4, 0.4) }));

  // ---------- 飛行傘：彩色的弧形傘翼，下面吊著一個人 ----------
  const glider = new THREE.Group(); W.add(glider);
  mesh(new THREE.TorusGeometry(3, 0.35, 6, 20, Math.PI).scale(1, 0.6, 1.8), M('#EE836F', { pat: 4, patCol: '#F8D97A', patScale: 0.5 }), 0, 3, 0, glider).rotation.y = Math.PI / 2;
  const pilot = walker(glider, { col: PAL.yellow, s: 0.8 }); pilot.g.position.y = 0;
  for (const sd of [-1, 1]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4).translate(0, 1.6, 0), M(PAL.plum), 0, 1.2, sd * 0.4, glider).rotation.x = sd * 0.5;

  // ---------- 看熱氣球的人 ----------
  const crowd = Array.from({ length: 22 }, () => {
    const x = rr(-30, 2), z = rr(10, 14), p = walker(W, { col: pick([PAL.pink, PAL.yellow, PAL.sky, PAL.white, PAL.mint, PAL.lilac]), hat: R() < 0.4 ? pick(['#F8D97A', PAL.coral]) : null, s: 0.9 });
    p.g.position.set(x, H(x, z) + 0.15, z); p.g.rotation.y = Math.PI / 2 + rr(-0.5, 0.5);
    return { p, ph: R() * 6 };
  });
  const crowdHit = new THREE.Mesh(new THREE.BoxGeometry(34, 3, 6), new THREE.MeshBasicMaterial({ visible: false })); crowdHit.position.set(-14, 9.5, 12); W.add(crowdHit); tag(crowdHit, 'crowd', null, clickables);
  const sun = mesh(new THREE.CircleGeometry(6, 40), M('#F9D58E', { emit: true, shadow: false }), 140, 20, -40, W); sun.lookAt(V3(-20, 20, 40)); noEdge(sun);
  const drift = clouds(W, R, [[20, 40, -60, 1.4], [70, 44, -20, 1.2]], LOOP);

  return {
    bg: '#FBE8D8', night: 0.12, dusk: 0.7, clickables,
    view: { target: [4, 14, -2], span: 42, el: 24, az: 30, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 220);
      for (const [k, bl] of balloons.entries()) {
        // 0～0.15 鼓起來；0.15～0.9 升空往縱谷飄；0.9～1 縮回去、換下一顆
        const T = ev.balloons.get(k) ?? -9, boost = Math.exp(-Math.max(0, t - T) * 1.0) * (t > T ? 1 : 0);
        const u = fr(t / (LOOP * 1.2) + bl.ph), inflate = ease(clamp01(u / 0.15)), fly = clamp01((u - 0.15) / 0.75);
        const gy = H(bl.x, bl.z);
        bl.g.position.set(bl.x + fly * 50 * bl.dx, gy + 0.45 + ease(fly) * 26 + boost * 2, bl.z + fly * 30 * bl.dz);
        bl.env.scale.set(lerp(0.3, 1, inflate), lerp(0.15, 1, inflate), lerp(0.3, 1, inflate));
        bl.env.position.y = lerp(2.5, 5.2, inflate);
        bl.g.rotation.y = t * 0.1 + k; bl.g.rotation.z = Math.sin(t * 0.7 + k) * 0.03;
        bl.g.scale.setScalar(1 - ease(clamp01((u - 0.9) / 0.1)) + 0.001);
        const burn = Math.max(boost, Math.max(0, Math.sin(t * 2 + k * 3)) > 0.85 ? 1 : 0, u < 0.15 ? 1 : 0);
        bl.flame.visible = burn > 0.05; bl.flame.scale.set(1, burn * (1 + Math.sin(t * 20) * 0.2), 1);
        for (const r of bl.riders) r.arms[1].rotation.z = -2.2 + Math.sin(t * 2 + k) * 0.4;
      }
      const ga = t / LOOP * TAU;
      glider.position.set(20 + Math.cos(ga) * 18, 22 + Math.sin(ga * 2) * 2 - fr(t / LOOP) * 4, -10 + Math.sin(ga) * 14);
      glider.rotation.set(0, -ga - Math.PI / 2, -0.15);
      const cheer = Math.exp(-Math.max(0, t - ev.crowd) * 1.5) * (t > ev.crowd ? 1 : 0);
      for (const c of crowd) { c.p.arms[1].rotation.z = -1.0 - Math.max(0, Math.sin(t * 0.8 + c.ph)) * 1.2 - cheer * 1.2; c.p.g.position.y = H(c.p.g.position.x, c.p.g.position.z) + 0.15 + cheer * Math.abs(Math.sin(t * 9 + c.ph)) * 0.25; }
      for (const tr of trees) sway(tr, t);
      sparks.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'balloon') { ev.balloons.set(ref, t); sparks.add(V3(p.x, p.y, p.z), t, R, 0.6); }
      if (kind === 'crowd') ev.crowd = t;
    },
  };
}
