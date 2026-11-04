// 寒露・屏東滿州：傍晚落鷹。灰面鵟鷹在天上繞著熱氣流一圈圈盤旋（鷹柱），太陽快下山時，一隻接一隻滑進山谷的樹林裡過夜。
// 前面的小丘上有賞鷹台，賞鳥的人架著望遠鏡；山下是滿州的小村子、田和一條溪，遠處是海。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, ribbon, tree, pine, sway, house, walker, bursts, clouds, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

// 地形：後面（-z）是一道長滿樹的山，中間是谷地，前面左邊一座小丘（賞鷹台）
function H(x, z) {
  const back = 20 * Math.exp(-Math.pow((z + 34 + 5 * Math.sin(x / 19)) / 20, 2));
  const knoll = 7 * Math.exp(-((x + 20) ** 2 + (z - 16) ** 2) / 180);
  const bumps = 1.2 * Math.sin(x * 0.17 + z * 0.11) + 0.8 * Math.sin(x * 0.07 - z * 0.23);
  return Math.max(0, back + knoll + bumps + 0.6);
}
const HAWK = '#9C7A6A';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(1008);
  const clickables = [];
  const ev = { flock: -9, deck: -9 };
  const feathers = bursts(W, [HAWK, '#F3E3CF', '#FFFFFF']);

  // ---------- 地形、樹林 ----------
  const g = new THREE.PlaneGeometry(200, 160, 100, 80).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  mesh(g, dots('#A8D8B9', 1.1, '#93C9A6'), 0, 0, 0, W);
  const fb = new Batch();
  for (let i = 0; i < 260; i++) {
    const x = rr(-95, 95), z = rr(-70, 0), y = H(x, z);
    if (y < 3) continue;
    pine(fb, x, z, rr(0.8, 1.2), pick([CROWN.pine, CROWN.green, CROWN.teal, CROWN.pine]), y - 0.3);
  }
  fb.build(W);
  const forest = new THREE.Mesh(new THREE.PlaneGeometry(190, 70).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
  forest.position.set(0, 14, -36); W.add(forest); tag(forest, 'forest', null, clickables);
  // 溪、田、村子
  const rv = ribbon([[-100, 34], [-60, 28], [-30, 34], [0, 30], [30, 22], [60, 26], [100, 18]], 4.5, () => 0.05);
  mesh(rv.geo, dots('#A0D8EF', 0.9, '#BCE2E8'), 0, 0, 0, W).castShadow = false;
  const fields = new Batch();
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const x = 4 + i * 10, z = 4 + j * 9; if (H(x, z) < 2.5) slab(fields, M(pick(['#D8DC92', '#C9DB8E', '#F3E3CF']), { pat: 6, patCol: '#C2C47A', patScale: 0.6 }), x, z, 9, 8, 0.15, H(x, z) - 0.05); }
  fields.build(W, { cast: false });
  const homes = [[10, 22, 0], [20, 24, 2], [32, 20, 4], [44, 24, 1], [54, 20, 3]].map(([x, z, i]) => house(W, x, z, { i, w: 5.5, d: 4.5, y: H(x, z) - 0.1, night: true }));
  const trees = [[2, 18, 'cloud'], [62, 14, 'round'], [-4, 30, 'egg'], [40, 32, 'cloud']].map(([x, z, k]) => tree(W, R, x, z, k, CROWN.green, 1.3, H(x, z) - 0.1));
  const sea = new Batch(); sea.add(box(220, 0.04, 60), dots('#A0D8EF', 1.6, '#BCE2E8'), 0, 0, 80); sea.build(W, { cast: false });

  // ---------- 賞鷹台：小丘頂上的木平台，幾個人架著望遠鏡 ----------
  const dy = H(-20, 16);
  const deck = new THREE.Group(); deck.position.set(-20, dy, 16); W.add(deck);
  const db = new Batch();
  db.add(box(9, 0.4, 6), stripes('#E6C68A', 0.3, '#D4B176', 4), 0, 0, 0);
  for (const sx of [-4.3, 4.3]) db.add(box(0.15, 1.1, 6), M('#B08A72'), sx, 0.4, 0);
  db.add(box(9, 1.1, 0.15), M('#B08A72'), 0, 0.4, 2.9);
  db.build(deck);
  const watchers = [[-2.6, 0.6, PAL.yellow], [0, -1.2, PAL.sky], [2.6, 0.4, PAL.pink], [1.2, 1.8, PAL.white]].map(([x, z, col], i) => {
    const p = walker(deck, { col, hat: i % 2 ? '#F8D97A' : null }); p.g.position.set(x, 0.5, z); p.g.rotation.y = Math.PI / 2 + 0.2;
    const sc = new THREE.Group(); sc.position.set(x + 0.2, 0.4, z - 0.9); deck.add(sc);
    for (const a of [0, 2.1, 4.2]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4).translate(0, 0.8, 0), M(PAL.plum), Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25, sc).rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15);
    const tube = mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.0, 10).rotateZ(Math.PI / 2), M('#FFFFFF'), 0, 1.65, 0, sc);
    return { p, sc, tube, i };
  });
  tag(deck, 'deck', null, clickables);

  // ---------- 灰面鵟鷹：寬翅膀的鷹，一群繞著兩根「鷹柱」盤旋，最後滑進樹林 ----------
  const hawk = () => {
    const g = new THREE.Group(); W.add(g);
    const m = M(HAWK, { shadow: false, pat: 6, patCol: '#F3E3CF', patScale: 0.12 });
    mesh(new THREE.CapsuleGeometry(0.22, 0.8, 4, 10).rotateZ(Math.PI / 2), m, 0, 0, 0, g);
    mesh(new THREE.SphereGeometry(0.2, 10, 8), M('#F3E3CF', { shadow: false }), 0.55, 0.08, 0, g);
    mesh(new THREE.ConeGeometry(0.06, 0.2, 6).rotateZ(-Math.PI / 2), M(PAL.yellow, { shadow: false }), 0.75, 0.05, 0, g);
    mesh(box(0.5, 0.05, 0.6).translate(-0.25, 0, 0), m, -0.45, 0, 0, g);
    const wings = [-1, 1].map((sd) => { const w = new THREE.Group(); w.position.set(0, 0.05, sd * 0.15); g.add(w); mesh(box(0.7, 0.05, 1.6).translate(0, 0, sd * 0.8), m, 0, 0, 0, w); w.userData.sd = sd; return w; });
    return { g, wings };
  };
  const COLS = [V3(-14, 0, -18), V3(18, 0, -26)];
  const hawks = Array.from({ length: 34 }, (_, i) => ({ h: hawk(), col: i % 2, a: R() * TAU, r: rr(4, 11), y: rr(18, 34), sp: rr(0.35, 0.55) * (R() < 0.85 ? 1 : -1), land: rr(0.66, 0.92), to: V3(rr(-60, 60), 0, rr(-44, -26)), ph: R() * 6 }));

  // ---------- 夕陽 ----------
  const sun = mesh(new THREE.CircleGeometry(8, 40), M('#F9D58E', { emit: true, shadow: false }), 130, 16, -90, W);
  sun.lookAt(V3(-20, 30, 80)); noEdge(sun);
  const drift = clouds(W, R, [[-40, 40, -60, 1.6], [50, 46, -50, 1.3], [0, 44, -80, 1.8]], LOOP);

  return {
    bg: '#F6D3C4', night: 0.5, dusk: 1, clickables,
    view: { target: [-4, 12, -2], span: 40, el: 22, az: -12, swing: 6, shadowR: 90 },
    update(t) {
      drift(t, 220);
      // 一個 loop：前段盤旋往上，後段一隻一隻滑進樹林；最後幾秒新的一群從北邊飛進來
      const u = fr(t / LOOP), scatter = Math.exp(-Math.max(0, t - ev.flock) * 1.2) * (t > ev.flock ? 1 : 0);
      for (const k of hawks) {
        const c = COLS[k.col], ang = k.a + t * k.sp, rise = k.y + Math.sin(t * 0.3 + k.ph) * 2 + u * 6;
        const rr2 = k.r * (1 + scatter * 1.8);
        let x = c.x + Math.cos(ang) * rr2, y = rise, z = c.z + Math.sin(ang) * rr2;
        let heading = ang + Math.PI / 2 * Math.sign(k.sp), bank = -0.35 * Math.sign(k.sp), glide = 0;
        if (u > k.land) {
          glide = ease(clamp01((u - k.land) / 0.08));
          x = lerp(x, k.to.x, glide); z = lerp(z, k.to.z, glide); y = lerp(y, H(k.to.x, k.to.z) + 4, glide);
          bank *= 1 - glide;
        }
        const enter = ease(clamp01(u / 0.05));
        k.h.g.position.set(x, y + (1 - enter) * 20, z);
        k.h.g.rotation.set(bank, -heading, 0);
        const s = 1.05 * enter * (1 - ease(clamp01((u - k.land - 0.08) / 0.04)));
        k.h.g.scale.setScalar(Math.max(0.001, s));
        const beat = glide > 0 ? 0.15 : 0.08 + scatter * 0.6;
        for (const w of k.h.wings) w.rotation.x = w.userData.sd * (Math.sin(t * (3 + scatter * 9) + k.ph) * beat + (glide > 0 ? 0.25 : -0.05));
      }
      for (const w of watchers) {
        const look = Math.sin(t * 0.4 + w.i);
        w.sc.rotation.y = Math.PI / 2 + look * 0.3; w.tube.rotation.z = 0.5 + look * 0.1;
        w.p.arms[1].rotation.z = w.i === 3 ? -2.2 + Math.sin(t * 2) * 0.3 : -1.1;
      }
      deck.scale.y = squash(t - ev.deck);
      for (const tr of trees) sway(tr, t);
      feathers.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'forest' || kind === 'flock') { ev.flock = t; feathers.add(V3(p.x, p.y + 2, p.z), t, R, 0.8); }
      if (kind === 'deck') { ev.deck = t; feathers.add(V3(-20, dy + 3, 16), t, R, 0.8); }
    },
  };
}
