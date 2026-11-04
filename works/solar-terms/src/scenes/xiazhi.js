// 夏至・嘉義水上北回歸線：廣場中間一座白色的標誌塔，地上畫著一條 23.5 度的線，一直延伸到兩邊的稻田。
// 站在線上的人影子越來越短，正午縮到腳底下；旁邊是圓頂的太陽館和開滿繡球花的花圃，縱貫線的火車從前面開過去。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, walker, walk, bursts, clouds, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(621);
  const clickables = [];
  const ev = { tower: -9, train: -9, hydra: -9 };
  const confetti = bursts(W, ['#F8D97A', '#A59ACA', '#FFFFFF']);

  // ---------- 地面、稻田、廣場 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#C9E2B0', 2, '#B6D59A'), 0, 0, 0, W); gnd.castShadow = false;
  const b = new Batch();
  for (let i = -5; i <= 5; i++) for (let j = -3; j <= 2; j++) {
    const x = i * 12, z = j * 11;
    if (Math.abs(x) < 20 && z > -18 && z < 14) continue;
    slab(b, M(pick(['#B0CA71', '#A8D8B9', '#B6D58A']), { pat: 6, patCol: '#9DB862', patScale: 0.5 }), x, z, 11, 10, 0.15);
  }
  slab(b, stripes('#F3E3CF', 0.6, '#E6D2B6', 4), 0, -2, 38, 30, 0.2, 0, 3);   // 廣場
  b.add(box(140, 0.06, 0.6), M('#EE836F'), 0, 0.2, -2);                        // 北回歸線：一條紅線橫過廣場和田
  for (let x = -66; x <= 66; x += 6) b.add(box(0.6, 0.08, 1.4), M('#FFFDF8'), x, 0.2, -2);
  // 鐵路：碎石路基、枕木、兩條鐵軌
  b.add(box(200, 0.4, 4), dots('#C9C3E3', 0.5, '#BBBCDE'), 0, 0, 20);
  for (let x = -100; x <= 100; x += 1.2) b.add(box(0.3, 0.12, 3), M('#B08A72'), x, 0.4, 20);
  for (const z of [19.2, 20.8]) b.add(box(200, 0.14, 0.14), M('#6B6283'), 0, 0.5, z);
  b.build(W, { cast: false });

  // ---------- 標誌塔：白色的細塔，上面一個金色的球；底座寫著 23°27′ ----------
  const tower = new THREE.Group(); tower.position.set(0, 0.2, -2); W.add(tower);
  const tb = new Batch();
  tb.add(box(4, 0.8, 4), stripes('#EDE6F0', 0.3, '#DED5E3', 4), 0, 0, 0);
  for (const [dx, dz] of [[-0.9, 0], [0.9, 0]]) tb.add(box(0.5, 11, 1.4), M('#FFFDF8'), dx, 0.8, dz);
  tb.add(box(2.6, 0.4, 1.6), M('#FFFDF8'), 0, 11.8, 0);
  tb.add(new THREE.SphereGeometry(0.9, 18, 12), M('#F2C26B'), 0, 13.2, 0);
  tb.add(new THREE.TorusGeometry(1.4, 0.08, 6, 30).rotateX(Math.PI / 2 - 0.41), M('#EE836F'), 0, 13.2, 0);   // 黃道環，斜 23.5 度
  tb.build(tower);
  tag(tower, 'tower', null, clickables);

  // ---------- 太陽館：圓頂的建築 ----------
  const hall = new Batch();
  hall.add(new THREE.CylinderGeometry(6, 6.4, 4, 28), stripes('#FFFDF8', 0.4, '#EDE6F0', 4), 12, 2.2, -10);
  hall.add(new THREE.SphereGeometry(6, 28, 12, 0, TAU, 0, Math.PI / 2), dots('#A0D8EF', 0.5, '#BCE2E8'), 12, 4.2, -10);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; hall.add(box(1.0, 1.6, 0.2), M('#BFE4FF', { lit: true }), 12 + Math.cos(a) * 6.3, 1.6, -10 + Math.sin(a) * 6.3, 0, -a + Math.PI / 2, 0); }
  hall.build(W);

  // ---------- 繡球花圃：一叢叢紫藍色的花球 ----------
  const hydra = new THREE.Group(); W.add(hydra);
  const hb = new Batch();
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI + Math.PI, x = -12 + Math.cos(a) * 6, z = 6 + Math.sin(a) * 3.5;
    hb.add(new THREE.SphereGeometry(0.9, 10, 8).scale(1, 0.7, 1), dots('#68BE8D', 0.25, '#57AC7C'), x, 0.2, z);
    for (let k = 0; k < 3; k++) hb.add(new THREE.SphereGeometry(0.42, 10, 8), dots(pick(['#A59ACA', '#89C3EB', '#BBBCDE', '#F4B3C2']), 0.1, '#FFFFFF'), x + rr(-0.5, 0.5), 0.8 + rr(0, 0.3), z + rr(-0.5, 0.5));
  }
  hb.build(hydra);
  tag(hydra, 'hydra', null, clickables);
  const trees = [[-16, -14, 'column'], [18, 6, 'round'], [-18, 10, 'egg'], [24, -16, 'cloud'], [-24, -4, 'column']].map(([x, z, k]) => tree(W, R, x, z, k, k === 'column' ? CROWN.pine : CROWN.green, 1.3));

  // ---------- 站在線上的人和他們的影子：影子跟著時間變短，正午縮成一小圈 ----------
  const SH = M('#A6A5C4', { shadow: false });
  const standers = [-6, -3.5, 3.5, 6].map((x, i) => {
    const p = walker(W, { col: [PAL.yellow, PAL.pink, PAL.sky, PAL.white][i], hat: i % 2 ? '#F8D97A' : null }); p.g.position.set(x, 0.35, -2); p.g.rotation.y = Math.PI / 2;
    p.g.traverse((o) => { if (o.isMesh) o.castShadow = false; });   // 影子改由下面那塊自己畫，跟著時間變長變短
    const sh = mesh(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2).translate(0, 0, 0), SH, x, 0.26, -2, W); sh.userData.noOutline = true;
    return { p, sh, i };
  });
  const visitors = Array.from({ length: 6 }, (_, i) => ({ p: walker(W, { col: pick([PAL.mint, PAL.lilac, PAL.coral, PAL.sky]), hat: R() < 0.5 ? '#F8D97A' : null }), a: R() * TAU, r: rr(9, 13), sp: rr(0.1, 0.18) * (i % 2 ? 1 : -1) }));

  // ---------- 火車：白底藍條的區間車 ----------
  const train = new THREE.Group(); W.add(train);
  const trb = new Batch();
  for (let c = 0; c < 4; c++) {
    const x = -c * 9.4;
    trb.add(box(9, 3.2, 2.8), M('#FFFDF8', { pat: 6, patCol: '#5B7FC7', patScale: 0.6 }), x, 0.9, 0);
    trb.add(box(9, 0.5, 2.9), M('#5B7FC7'), x, 1.8, 0);
    for (let w = 0; w < 4; w++) trb.add(box(1.4, 1.0, 2.9), M('#BFE4FF', { lit: true }), x - 3.2 + w * 2.1, 2.6, 0);
  }
  trb.add(new THREE.CapsuleGeometry(1.3, 0.6, 4, 10).rotateX(Math.PI / 2).scale(0.8, 1.1, 1), M('#5B7FC7'), 4.6, 2.4, 0);
  trb.build(train);
  tag(train, 'train', null, clickables);
  const drift = clouds(W, R, [[-40, 30, -40, 1.4], [40, 34, -20, 1.2]], LOOP);

  return {
    bg: '#EEF2F8', clickables,
    view: { target: [0, 3, 0], span: 34, el: 34, az: 22, swing: 6, shadowR: 85 },
    update(t) {
      drift(t, 220);
      // 時間：一個 loop 從上午到下午，中間是正午；影子朝北（-z）伸長再縮回
      const u = fr(t / LOOP), noon = Math.abs(u - 0.5) * 2, dir = u < 0.5 ? 1 : -1;
      for (const s of standers) {
        const len = 0.15 + noon * 3.2;
        s.sh.scale.set(1 + noon * 0.2, 1, Math.max(1, len / 0.5));
        s.sh.position.set(s.p.g.position.x + dir * noon * 1.6, 0.26, -2 - len * 0.45);
        s.p.arms[1].rotation.z = noon < 0.08 ? -2.8 : -0.2;   // 正午舉手歡呼
        s.p.g.position.y = 0.35 + (noon < 0.08 ? Math.abs(Math.sin(t * 8 + s.i)) * 0.25 : 0);
      }
      for (const v of visitors) { const a = v.a + t * v.sp; walk(v.p, 4 + Math.cos(a) * v.r, -2 + Math.sin(a) * v.r * 0.7, a + Math.PI / 2 * Math.sign(v.sp), t * 6 + v.a); v.p.g.position.y += 0.2; }
      const tu = fr(t / (LOOP * 0.5) + 0.3), fast = t - ev.train < 3 ? 1 : 0;
      train.position.set(lerp(-120, 150, tu), 0.4, 20); train.scale.setScalar(fadeEnds(tu, 10)); train.position.y = 0.4 + fast * Math.abs(Math.sin(t * 20)) * 0.06;
      tower.scale.y = squash(t - ev.tower);
      hydra.scale.y = squash(t - ev.hydra);
      for (const tr of trees) sway(tr, t);
      confetti.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'tower') { ev.tower = t; confetti.add(V3(0, 13, -2), t, R, 1.2); }
      if (kind === 'train') { ev.train = t; confetti.add(V3(p.x, p.y + 2, p.z), t, R, 0.6); }
      if (kind === 'hydra') { ev.hydra = t; confetti.add(V3(p.x, p.y + 1, p.z), t, R, 0.6); }
    },
  };
}
