// 小雪・嘉義東石漁港：烏魚季開始。港裡停著漁船，有一艘出海又回來；防波堤盡頭一座紅白燈塔。
// 西邊的空地上，木板一排排曬著琥珀色的烏魚子；港外的海面上是一排排蚵棚，膠筏在中間穿梭。東北季風吹得旗子一直飄。
import { THREE, flat, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, house, temple, steam, car, driveAlong, walker, walkAlong, boat, bird, flap, clouds, squiggles, ripples, bursts, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr } = rand(1122);
  const clickables = [];
  const ev = { light: -9, roe: -9, market: -9, fish: [] };
  const waterRing = ripples(W, 10);
  const spray = bursts(W, ['#FFFFFF', '#BFE9FF']);

  // ---------- 海是整片地面；陸地、港池、防波堤疊在上面 ----------
  const sea = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#5CC8FF', 1.6, '#86D6FF'), 0, 0, 0, W);
  sea.castShadow = false; tag(sea, 'water', null, clickables);
  const LAND = dots('#FFF1D6', 1.2, '#FFE2AE'), QUAY = stripes('#EDE6F7', 0.6, '#DCD4EE');
  const b = new Batch();
  slab(b, LAND, -10, -58, 200, 90, 0.9);                    // 北邊的陸地（z < -13）
  slab(b, LAND, -78, -6, 64, 30, 0.9);                      // 西邊突出的一塊
  slab(b, QUAY, 18, -12.6, 110, 2, 1.1);                    // 碼頭邊
  slab(b, QUAY, -45, 6, 2.4, 30, 1.0);                      // 西邊的突堤
  slab(b, stripes('#DCD4EE', 0.5, '#C9C0E3'), 26, 11, 68, 3, 1.4);   // 防波堤
  for (let x = -6; x < 60; x += 2.2) b.add(new THREE.TetrahedronGeometry(1.0), M('#C9C0E3'), x + rr(-0.3, 0.3), 0.6, 13 + rr(-0.3, 0.3), rr(0, 3), rr(0, 3), 0);   // 消波塊
  // 碼頭上的繫船柱
  for (let x = -30; x < 70; x += 6) b.add(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 10), M(PAL.plum), x, 1.5, -12);
  b.build(W, { cast: true });

  // ---------- 魚市場：長長的棚子，藍白條紋屋頂 ----------
  const market = new THREE.Group(); market.position.set(24, 0.9, -22); W.add(market);
  const mb = new Batch();
  mb.add(box(30, 4, 9), stripes('#FFFFFF', 0.5, '#F2EDF8', 4));
  for (let x = -13; x <= 13; x += 3.25) mb.add(box(2.2, 2.6, 0.12), M('#5CC8FF', { lit: true }), x, 0.4, 4.52);
  for (const sd of [-1, 1]) mb.add(new THREE.BoxGeometry(31.5, 0.3, 5.6), M(PAL.cobalt, { pat: 4, patCol: '#FFFFFF', patScale: 0.9 }), 0, 5.1, sd * 2.5, sd * 0.32, 0, 0);
  mb.add(box(12, 1.6, 0.2), M(PAL.yellow), 0, 4.2, 4.7);
  for (let i = 0; i < 8; i++) mb.add(box(1.2, 0.7, 0.9), M(['#5EDFB0', '#FF7EB3', '#FFD234', '#5CC8FF'][i % 4]), -11 + i * 3, 0, 6.2);   // 漁獲箱
  mb.build(market);
  tag(market, 'market', null, clickables);
  // 村子的房子和幾棵樹
  const homes = [[-8, -34, 0], [0, -36, 2], [48, -34, 4], [58, -30, 1], [-22, -46, 3], [-12, -48, 5], [62, -44, 6], [52, -47, 2]].map(([x, z, i]) => house(W, x, z, { i, w: 6.5, d: 5.5, y: 0.9 }));
  const shrine = temple(W, -28, -31, { w: 9, d: 7, y: 0.9 });
  const incense = steam(W, R, [[shrine.burner.x, 3.6, shrine.burner.z, 0.7]], 5, 3.4);
  // 碼頭後面的路：一台小貨車載著漁獲開過去
  const rd = new Batch(); rd.add(box(200, 0.12, 4), dots('#EDE6F7', 1, '#DCD4EE'), 0, 0.9, -16); rd.build(W, { cast: false });
  const truck = car(W, PAL.coral, 1.0);
  const roadC = new THREE.CatmullRomCurve3([V3(-100, 1.0, -16.8), V3(100, 1.0, -16.8)]);
  const trees = [];
  for (const [x, z, k, cs] of [[-14, -27, 'round', CROWN.teal], [8, -30, 'egg', CROWN.green], [44, -27, 'column', CROWN.pine], [62, -22, 'cloud', CROWN.lime], [-36, -40, 'round', CROWN.green], [-4, -42, 'cone', CROWN.pine], [30, -40, 'round', CROWN.teal], [-46, -36, 'egg', CROWN.lime], [70, -36, 'column', CROWN.green]]) trees.push(tree(W, R, x, z, k, cs, 1.1, 0.9));

  // ---------- 烏魚子曬場：木板上排著一片片琥珀色的烏魚子 ----------
  const roe = new THREE.Group(); roe.position.set(-60, 0.9, -22); W.add(roe);
  const rb = new Batch(), ROE = dots('#F2863C', 0.18, '#FFB067');
  for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) {
    const x = c * 15 - 7.5, z = r * 4 - 10;
    rb.add(box(12, 0.8, 2.2), stripes('#F7D9A8', 0.35, '#EDC48A', 4), x, 0, z);
    for (let k = 0; k < 9; k++) rb.add(new THREE.SphereGeometry(0.5, 12, 8).scale(1.25, 0.32, 0.72), ROE, x - 5.2 + k * 1.3, 0.85, z + (k % 2 ? 0.45 : -0.45));
  }
  rb.build(roe);
  tag(roe, 'roe', null, clickables);
  const workers = [0, 0.5].map((u, i) => ({ p: walker(W, { col: [PAL.pink, PAL.teal][i], hat: PAL.yellow }), u }));
  const roePath = new THREE.CatmullRomCurve3([V3(-75, 0.9, -12), V3(-45, 0.9, -12), V3(-45, 0.9, -32), V3(-75, 0.9, -32)], true);

  // ---------- 燈塔：紅白條紋，頂上一盞燈 ----------
  const light = new THREE.Group(); light.position.set(-7, 1.4, 11); W.add(light);
  const lb = new Batch();
  lb.add(new THREE.CylinderGeometry(1.3, 1.7, 9, 18).translate(0, 4.5, 0), M(PAL.coral, { pat: 6, patCol: '#FFFFFF', patScale: 1.5 }));
  lb.add(new THREE.CylinderGeometry(1.7, 1.7, 0.3, 18).translate(0, 9.1, 0), M('#FFFFFF'));
  lb.add(new THREE.ConeGeometry(1.2, 1.4, 18).translate(0, 11.4, 0), M(PAL.coral));
  lb.build(light);
  const lamp = mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 14).translate(0, 9.9, 0), flat(PAL.yellow, { lit: true }), 0, 0, 0, light);   // 自己一個材質，閃的時候不影響別的黃色
  tag(light, 'light', null, clickables);

  // ---------- 蚵棚：港外的海面上，一排排白色浮筒和竹竿 ----------
  const ob = new Batch();
  for (let r = 0; r < 7; r++) {
    const z = 22 + r * 3.6, x0 = 4 + (r % 2) * 3;
    for (let k = 0; k < 9; k++) { ob.add(box(4.6, 0.5, 0.9), stripes('#FFFFFF', 0.25, '#E6E9FF', 4), x0 + k * 5.6, 0.0, z); ob.add(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6).translate(0, 0.8, 0), M('#A8705A'), x0 + k * 5.6 - 2.6, 0, z); }
  }
  ob.build(W);
  const raft = new THREE.Group(); W.add(raft);
  mesh(box(4.2, 0.4, 1.6), stripes('#5EDFB0', 0.3, '#3FC7AE', 4), 0, 0, 0, raft);
  const farmer = walker(raft, { col: PAL.cobalt, hat: PAL.yellow }); farmer.g.position.set(-1.2, 0.4, 0);

  // ---------- 漁船：港裡停四艘，一艘出海又回來 ----------
  const moored = [[-12, PAL.coral], [-1, PAL.cobalt], [10, PAL.teal], [36, PAL.yellow]].map(([x, col], i) => { const bt = boat(W, col, 1.05); bt.g.position.set(x, 0, -8.6); bt.g.rotation.y = i % 2 ? Math.PI : 0; bt.ph = i * 1.3; return bt; });
  const runner = boat(W, PAL.pink, 1.1);
  const route = new THREE.CatmullRomCurve3([V3(22, 0, -6), V3(0, 0, -2), V3(-20, 0, 4), V3(-26, 0, 18), V3(-40, 0, 40), V3(-70, 0, 60), V3(-46, 0, 62), V3(-20, 0, 36), V3(-14, 0, 14), V3(4, 0, 2), V3(30, 0, 0)], true);
  const gulls = Array.from({ length: 5 }, (_, i) => ({ b: bird(W, '#FFFFFF', 1.1), i }));
  const drift = clouds(W, R, [[-40, 21, -4, 1.2], [30, 35, -2, 1.44], [80, 39, 0, 1.04]], LOOP);
  const waves = squiggles(W, R, 60, () => { for (;;) { const x = rr(-90, 90), z = rr(-12, 70); if (z > 14 || (x > -44 && x < 60)) return V3(x, 0, z); } }, [-0.7, 0.7], 2, LOOP);
  // 烏魚：圓滾的流線身體（背灰藍、肚子銀白，側面幾條細細的縱紋），鈍頭大眼，背上前後兩片分開的背鰭，分岔的尾巴
  const MPROF = [[0.0, -1.3], [0.12, -1.2], [0.24, -0.9], [0.36, -0.4], [0.42, 0.15], [0.4, 0.6], [0.32, 0.95], [0.18, 1.18], [0.0, 1.26]].map(([r, y]) => new THREE.Vector2(r, y));
  const mfin = (pts) => new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.05, bevelEnabled: false, curveSegments: 3 }).translate(0, 0, -0.025);
  const MB = dots('#5D6FA8', 0.16, '#7F8FD6'), MS = stripes('#E8EEF8', 0.12, '#C3CDE6', 3), MF = M('#5D6FA8'), ME = M('#FFFFFF'), MP = M('#2E2A40');
  const mulletMesh = () => {
    const g = new THREE.Group(), b = new Batch();
    b.add(new THREE.LatheGeometry(MPROF, 16).rotateZ(-Math.PI / 2), MS, 0, 0, 0, 0, 0, 0, 1, 1, 0.82);
    b.add(new THREE.LatheGeometry(MPROF, 16, Math.PI, Math.PI).rotateZ(-Math.PI / 2), MB, 0, 0, 0, 0, 0, 0, 1.01, 1.04, 0.85);   // 背上那一半
    b.add(mfin([[0, 0], [-0.3, 0.42], [-0.62, 0.62], [-0.44, 0.2], [-0.36, 0], [-0.44, -0.2], [-0.62, -0.62], [-0.3, -0.42]]), MF, -1.22, 0, 0);   // 分岔的尾巴
    b.add(mfin([[0.18, 0], [-0.05, 0.36], [-0.2, 0]]), MF, 0.25, 0.38, 0);    // 第一背鰭（短刺）
    b.add(mfin([[0.16, 0], [-0.12, 0.3], [-0.2, 0]]), MF, -0.55, 0.3, 0);     // 第二背鰭
    b.add(mfin([[0.16, 0], [-0.12, -0.26], [-0.2, 0]]), MF, -0.55, -0.3, 0);  // 臀鰭
    for (const sd of [-1, 1]) { b.add(mfin([[0.1, 0], [-0.45, 0.12], [-0.4, -0.05]]).rotateX(sd * 1.3), MF, 0.55, 0.02, sd * 0.3); b.add(new THREE.SphereGeometry(0.11, 10, 8), ME, 0.88, 0.1, sd * 0.24); b.add(new THREE.SphereGeometry(0.06, 8, 6), MP, 0.93, 0.11, sd * 0.29); }
    b.build(g);
    g.scale.setScalar(1.25); g.visible = false; W.add(g);
    return g;
  };
  const mullet = Array.from({ length: 34 }, mulletMesh);
  // 烏魚季：海面上一群一群地跳，一群七到十條，前後只差一點點就接連跳出水面
  const JUMPS = [];
  for (let k = 0; k < 18; k++) {
    // 大多在港西邊那片開闊的海面，少數在防波堤和蚵棚之間
    const c = k % 3 === 2 ? V3(rr(8, 54), 0, rr(16.5, 19.5)) : V3(rr(-38, -8), 0, rr(4, 32));
    const T0 = (k + 0.3) * LOOP / 18, a = rr(0, TAU), n = 7 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) JUMPS.push({ T: T0 + i * rr(0.07, 0.16), p: c.clone().add(V3(rr(-5, 5), 0, rr(-3.5, 3.5))), a: a + rr(-0.35, 0.35), h: rr(2.6, 4.2) });
  }

  return {
    bg: '#5CC8FF', clickables,
    view: { target: [-10, 0, -6], span: 44, el: 35, az: 14, swing: 7, shadowR: 95 },
    update(t) {
      drift(t, 110, -10); waves(t);
      // 停著的船輕輕晃，旗子被東北季風吹得一直飄
      for (const bt of moored) { bt.g.position.y = Math.sin(t * 1.4 + bt.ph) * 0.12; bt.g.rotation.z = Math.sin(t * 1.1 + bt.ph) * 0.03; bt.flag.rotation.y = 0.5 + Math.sin(t * 9 + bt.ph) * 0.25; }
      const u = fr(t / LOOP), uu = u + 0.035 * Math.sin(u * TAU * 2);
      const a = route.getPointAt(fr(uu)), n = route.getPointAt(fr(uu + 0.004));
      runner.g.position.set(a.x, Math.sin(t * 1.8) * 0.15, a.z); runner.g.rotation.y = -Math.atan2(n.z - a.z, n.x - a.x); runner.g.rotation.z = Math.sin(t * 1.3) * 0.04;
      runner.flag.rotation.y = 0.5 + Math.sin(t * 10) * 0.3;
      gulls.forEach((g) => {
        const ang = t * 0.5 + g.i * TAU / 5, r = 6 + g.i;
        g.b.g.position.set(a.x + Math.cos(ang) * r, 9 + g.i * 0.8 + Math.sin(t + g.i) * 0.6, a.z + Math.sin(ang) * r);
        g.b.g.rotation.y = -ang - Math.PI / 2; g.b.g.rotation.x = 0.25; flap(g.b, t * 6 + g.i * 2, 0.5);
      });
      // 膠筏在蚵棚之間來回
      const ru = fr(t / LOOP + 0.3), rx = lerp(8, 50, ease(ru < 0.5 ? ru * 2 : 2 - ru * 2));
      raft.position.set(rx, 0.2 + Math.sin(t * 2) * 0.08, 33.8); raft.rotation.y = ru < 0.5 ? 0 : Math.PI;
      farmer.legs[0].rotation.z = Math.sin(t * 3) * 0.2; farmer.arms[0].rotation.z = -1.2 + Math.sin(t * 3) * 0.4;
      for (const w of workers) walkAlong(w.p, roePath, w.u + t / LOOP * 1.2, t * 7);
      roe.scale.y = squash(t - ev.roe);
      incense(t);
      const tu = fr(t / LOOP + 0.6); driveAlong(truck, roadC, 0.1 + 0.8 * tu, t); truck.scale.setScalar(fadeEnds(tu, 12));
      market.scale.setScalar(squash(t - ev.market));
      // 燈塔：點了先蹲一下，燈閃三下
      light.scale.set(1, squash(t - ev.light), 1);
      const dl = t - ev.light;
      lamp.material.uniforms.uCol.value.set(dl > 0.2 && dl < 2.2 && Math.sin(dl * 9) > 0 ? '#FFFFFF' : PAL.yellow);
      for (const tr of trees) sway(tr, t, 1.4);
      // 烏魚跳
      mullet.forEach((m) => { m.visible = false; });
      let k = 0;
      const cyc = Math.floor(t / LOOP);
      for (const j of [...JUMPS, ...ev.fish]) {
        const T = j.once ? j.T : cyc * LOOP + j.T, dt = t - T;
        if (dt < 0 || dt > 1.1 || k >= mullet.length) continue;
        const m = mullet[k++], f = dt / 1.1;
        m.visible = true; m.position.set(j.p.x + Math.cos(j.a) * (f - 0.5) * 5, Math.sin(Math.PI * f) * (j.h || 3.4) - 0.3, j.p.z + Math.sin(j.a) * (f - 0.5) * 5);
        m.rotation.set(0, -j.a, Math.cos(Math.PI * f) * 0.9);
        if (dt > 1.0 && j.splash !== T) { j.splash = T; const q = V3(j.p.x + Math.cos(j.a) * 2.5, 0, j.p.z + Math.sin(j.a) * 2.5); waterRing.add(q, t, 0.1); spray.add(V3(q.x, 0.3, q.z), t, R, 0.4); }
        if (dt < 0.08 && j.out !== T) { j.out = T; spray.add(V3(j.p.x - Math.cos(j.a) * 2.5, 0.3, j.p.z - Math.sin(j.a) * 2.5), t, R, 0.35); }
      }
      waterRing.update(t); spray.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'water') { waterRing.add(p, t, 0.1); const a = R() * TAU; for (let i = 0; i < 7; i++) ev.fish.push({ T: t + 0.15 + i * 0.1, p: p.clone().add(V3(rr(-2.5, 2.5), 0, rr(-2.5, 2.5))), a: a + rr(-0.4, 0.4), h: rr(2.6, 4), once: true }); if (ev.fish.length > 14) ev.fish.splice(0, ev.fish.length - 14); spray.add(V3(p.x, 0.3, p.z), t, R, 0.6); }
      if (kind === 'light') ev.light = t;
      if (kind === 'roe') ev.roe = t;
      if (kind === 'market') ev.market = t;
    },
  };
}
