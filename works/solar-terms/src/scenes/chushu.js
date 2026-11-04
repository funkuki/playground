// 處暑・基隆望海巷：農曆七月十四的夜裡放水燈。海灣的沙灘上擠滿了人，岸邊立著掛燈的燈篙；
// 房子形狀的水燈頭一盞一盞被推進海裡，亮著光漂出去，漂到遠處燒成一團火。兩邊是黑黑的岬角，山坡上是八斗子的房子。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, slab, tree, sway, house, walker, ridge, squiggles, ripples, bursts, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, setLamps, TAU } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(714);
  const clickables = [];
  const ev = { lantern: new Map(), poles: -9 };
  const rings = ripples(W, 10);
  const sparks = bursts(W, ['#F9D58E', '#EE836F', '#FFFFFF']);

  // ---------- 海是整片地面；沙灘是一道彎彎的弧，兩邊是岬角 ----------
  const sea = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#5B7FC7', 1.6, '#7F9BD6'), 0, 0, 0, W);
  sea.castShadow = false; tag(sea, 'water', null, clickables);
  const waves = squiggles(W, R, 36, () => V3(rr(-60, 60), 0.05, rr(-40, 20)), [0, -1], 0.8, LOOP);
  const land = new Batch();
  const beach = new THREE.Shape(); beach.moveTo(-60, 0);
  for (let i = 0; i <= 24; i++) { const x = -60 + i * 5; beach.lineTo(x, 22 + 7 * Math.cos(x / 38)); }
  beach.lineTo(60, 80); beach.lineTo(-60, 80); beach.closePath();
  land.add(new THREE.ExtrudeGeometry(beach, { depth: 0.6, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.6, 0), dots('#F3E3CF', 0.9, '#E6D2B6'), 0, 0, 0);
  slab(land, dots('#C9C0DE', 1.2, '#B7AED2'), 0, 52, 140, 30, 1.8);   // 沙灘後面的堤防和路
  ridge(land, [[-62, 10, 18, 16, 7], [-70, 34, 22, 22, 6], [62, 6, 17, 14, 7], [72, 30, 22, 20, 6], [0, 92, 60, 26, 8]], stripes('#6B6283', 1.8, '#5E5577', 2));
  land.build(W);
  // 山坡上的房子（夜裡窗戶亮著）
  for (const [x, z, i] of [[-30, 64, 0], [-16, 70, 2], [-2, 66, 4], [14, 70, 1], [28, 64, 3], [40, 70, 5], [-42, 70, 6]]) house(W, x, z, { i, w: 6, d: 5, y: 1.8, night: true, two: i % 2 === 0, rot: Math.PI * 0.0 });
  const trees = [[-50, 46], [50, 44], [-24, 56], [22, 56]].map(([x, z], i) => tree(W, R, x, z, i % 2 ? 'cloud' : 'round', CROWN.pine, 1.3, 1.8));

  // ---------- 燈篙：岸邊一根根竹竿，掛著一串燈 ----------
  const poles = new THREE.Group(); W.add(poles);
  const pb = new Batch(), LANT = M(PAL.coral, { emit: true, zoneAware: true }), CAP = M(PAL.yellow, { emit: true, zoneAware: true });
  const LAMP = [];
  for (let x = -44; x <= 44; x += 11) {
    const z = 23 + 7 * Math.cos(x / 38) + 4;
    pb.add(new THREE.CylinderGeometry(0.1, 0.14, 10, 6).translate(0, 5, 0), M('#B6D58A'), x, 0.6, z);
    for (let k = 0; k < 4; k++) { pb.add(new THREE.SphereGeometry(0.42, 12, 10).scale(1, 1.25, 1), LANT, x, 9.4 - k * 1.2, z); pb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), CAP, x, 10.0 - k * 1.2, z); }
    LAMP.push([x, 6, z, 4]);
  }
  pb.build(poles);
  tag(poles, 'poles', null, clickables);

  // ---------- 人群：站在沙灘上看，幾個人拿著火把 ----------
  const COLS = [PAL.white, PAL.sky, PAL.pink, PAL.yellow, PAL.mint, PAL.lilac];
  const crowd = [];
  for (let i = 0; i < 46; i++) {
    const x = rr(-46, 46), z = 26 + 7 * Math.cos(x / 38) + rr(0, 9);
    const p = walker(W, { col: pick(COLS), hat: R() < 0.25 ? pick([PAL.coral, PAL.yellow]) : null, s: 0.9 });
    p.g.position.set(x, 0.75, z); p.g.rotation.y = Math.PI / 2 + rr(-0.4, 0.4);
    crowd.push({ p, ph: R() * 6, cheer: R() < 0.3 });
  }

  // ---------- 水燈頭：房子形狀，亮著；從沙灘被推進海裡，慢慢漂出去，遠處燒起來 ----------
  const BODY = ['#F4B3C2', '#F8D97A', '#A0D8EF', '#A8D8B9', '#BBBCDE', '#F7B977'];
  const LN = 14;
  const lanterns = Array.from({ length: LN }, (_, k) => {
    const g = new THREE.Group(); W.add(g);
    const b = new Batch(), col = BODY[k % BODY.length];
    b.add(box(1.6, 0.25, 1.6), M(PAL.plum), 0, 0, 0);                                       // 底座（木板）
    b.add(box(1.3, 1.1, 1.3), M(col, { emit: true, zoneAware: true, pat: 4, patCol: '#FFFFFF', patScale: 0.25 }), 0, 0.25, 0);
    b.add(new THREE.ConeGeometry(1.15, 0.8, 4).rotateY(Math.PI / 4).translate(0, 0.4, 0), M(PAL.coral, { emit: true, zoneAware: true }), 0, 1.35, 0);
    b.add(new THREE.SphereGeometry(0.16, 8, 6), M(PAL.yellow, { emit: true }), 0, 2.2, 0);
    b.build(g); g.scale.setScalar(1.35);
    const fire = new THREE.Group(); g.add(fire);
    mesh(new THREE.ConeGeometry(0.9, 2.2, 8).translate(0, 1.1, 0), M('#F8B500', { emit: true, shadow: false }), 0, 1.0, 0, fire);
    mesh(new THREE.ConeGeometry(0.5, 1.4, 8).translate(0, 0.7, 0), M('#FFFFFF', { emit: true, shadow: false }), 0, 1.0, 0, fire);
    const x0 = lerp(-30, 30, (k + 0.5) / LN) + rr(-2, 2);
    tag(g, 'lantern', k, clickables);
    return { g, fire, x0, x1: x0 * 1.6 + rr(-8, 8), ph: k / LN + rr(0, 0.04), wob: R() * 6 };
  });
  const bearers = lanterns.slice(0, 4).map((L, i) => ({ p: walker(W, { col: PAL.white, hat: PAL.coral, s: 0.9 }), L }));

  return {
    bg: '#5E5577', night: 1, dusk: 0.25, lamps: [], clickables,
    view: { target: [2, 1, 12], span: 30, el: 32, az: 28, swing: 7, shadowR: 80 },
    update(t) {
      waves(t);
      const lamps = LAMP.slice();
      for (const L of lanterns) {
        // 0～0.12：放到水邊；0.12～0.85：漂出去；0.85～1：燒起來、熄掉
        const u = fr(t / LOOP + L.ph), T = ev.lantern.get(lanterns.indexOf(L)) ?? -9;
        const shore = 22 + 7 * Math.cos(L.x0 / 38);
        let x, z, y = 0.15, burn = 0;
        if (u < 0.12) { const k = ease(u / 0.12); x = L.x0; z = lerp(shore + 2, shore - 2, k); y = 0.6 - k * 0.45; }
        else { const k = (u - 0.12) / 0.88; x = lerp(L.x0, L.x1, k); z = lerp(shore - 2, -42, Math.pow(k, 0.8)); burn = clamp01((u - 0.82) / 0.06); }
        L.g.position.set(x + Math.sin(t * 0.7 + L.wob) * 0.4, y + Math.sin(t * 2 + L.wob) * 0.08, z);
        L.g.rotation.y = Math.sin(t * 0.5 + L.wob) * 0.3;
        L.g.rotation.z = Math.sin(t * 1.7 + L.wob) * 0.05;
        const fade = 1 - clamp01((u - 0.94) / 0.06);
        L.g.scale.setScalar(1.35 * fade * (u < 0.02 ? ease(u / 0.02) : 1) * squash(t - T));
        L.fire.visible = burn > 0;
        L.fire.scale.set(burn, burn * (1 + Math.sin(t * 13 + L.wob) * 0.15), burn);
        if (lamps.length < 48) lamps.push([L.g.position.x, 1.5, L.g.position.z, 2.2 + burn * 3]);
      }
      setLamps(lamps);
      // 扛水燈的人：跟著前幾盞燈走到水邊再走回來
      for (const b of bearers) {
        const u = fr(t / LOOP + b.L.ph), shore = 22 + 7 * Math.cos(b.L.x0 / 38);
        const k = u < 0.12 ? ease(u / 0.12) : u < 0.3 ? 1 - ease((u - 0.12) / 0.18) : 0;
        b.p.g.position.set(b.L.x0 - 1.4, 0.75 - k * 0.3, shore + 3 - k * 3.4);
        b.p.g.rotation.y = u < 0.12 ? Math.PI / 2 : -Math.PI / 2;
        const ph = t * 6;
        b.p.legs[0].rotation.z = k > 0 && k < 1 ? Math.sin(ph) * 0.5 : 0; b.p.legs[1].rotation.z = -b.p.legs[0].rotation.z;
        b.p.arms[0].rotation.z = b.p.arms[1].rotation.z = u < 0.12 ? -1.2 : 0;
      }
      for (const c of crowd) {
        c.p.g.position.y = 0.75 + (c.cheer ? Math.max(0, Math.sin(t * 3 + c.ph)) * 0.15 : 0);
        c.p.arms[1].rotation.z = c.cheer ? -2.4 + Math.sin(t * 3 + c.ph) * 0.4 : 0;
      }
      poles.scale.y = squash(t - ev.poles);
      for (const tr of trees) sway(tr, t, 0.6);
      rings.update(t); sparks.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'lantern') { ev.lantern.set(ref, t); sparks.add(V3(p.x, p.y + 1, p.z), t, R, 0.7); }
      if (kind === 'poles') { ev.poles = t; sparks.add(V3(p.x, p.y, p.z), t, R, 0.8); }
      if (kind === 'water') rings.add(V3(p.x, 0, p.z), t, 0.1);
    },
  };
}
