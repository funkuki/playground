// 冬至・彰化鹿港老街：一年最長的夜。紅磚老街彎彎的，兩邊是窄長的街屋，街尾是天后宮。
// 一開場，光從天后宮擴散出去，窗戶、燈籠和地上的燈光一盞一盞亮起來；湯圓攤的鍋子冒著白煙，人在街上慢慢走。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, ribbon, tree, sway, shophouse, temple, house, walker, walkAlong, steam, bursts, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, setWave, setLamps, clouds } from '../kit.js';

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(1222);
  const clickables = [];
  const ev = { temple: -9, wave: 0.5, stall: -9, lantern: -9 };
  const confetti = bursts(W, ['#FF5A5F', '#FFD234', '#FFFFFF']);

  // ---------- 地面和彎彎的紅磚街 ----------
  const gnd = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots('#F7E7DA', 2.0, '#EBD3C2'), 0, 0, 0, W); gnd.castShadow = false;
  const zc = (x) => 3.2 * Math.sin(x / 16);
  const PTS = []; for (let x = -40; x <= 60; x += 5) PTS.push([x, zc(x)]);
  const street = ribbon(PTS, 6.4, () => 0.08);
  mesh(street.geo, stripes('#F2A58E', 0.45, '#E58A74'), 0, 0, 0, W).castShadow = false;
  const walkC = new THREE.CatmullRomCurve3(PTS.map(([x, z]) => V3(x, 0.1, z)));

  // ---------- 兩排街屋（北邊兩層、南邊一層），天后宮在街的西頭 ----------
  const BRICK = ['#E8745A', '#F08C6E', '#D9654E', '#FFB8D9', '#FFF4DD'];
  const fronts = [];
  let i = 0;
  for (let x = -22; x <= 50; x += 4.4, i++) {
    const z = zc(x), wall = BRICK[i % 5], brick = i % 5 < 3;
    fronts.push(shophouse(W, x, z - 3.2 - 4.5, { w: 4.2, d: 9, floors: 2, wall, brick, trim: '#FFF4DD', gable: brick ? lt(wall, 0.15) : '#FF9C6B', ball: pick([PAL.yellow, '#5CC8FF', '#5EDFB0']), roof: '#FF7A59', night: true, sign: i % 3 === 0 ? pick([PAL.yellow, PAL.coral, '#5EDFB0']) : null }));
  }
  // 南邊（靠鏡頭這側）不蓋街屋，免得擋住街：一道矮紅磚牆、盆栽和長椅
  const sb0 = new Batch();
  for (let x = -24; x <= 52; x += 4) {
    if (x > 5 && x < 16) continue;
    sb0.add(box(4, 1.1, 0.8), stripes('#E8745A', 0.28, '#D9654E'), x, 0, zc(x) + 4.2, 0, -Math.atan(Math.cos(x / 16) * 0.2), 0);
    if ((x / 4) % 3 === 0) { sb0.add(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 12).translate(0, 0.35, 0), M(PAL.peach), x + 1, 1.1, zc(x) + 4.2); sb0.add(new THREE.SphereGeometry(0.6, 10, 8), dots('#3CBE7E', 0.25, '#FF7EB3'), x + 1, 2.1, zc(x) + 4.2); }
  }
  sb0.build(W);
  // 前景：牆外一排矮的紅磚平房和一棵大榕樹
  for (const [x, i] of [[-20, 0], [-6, 2], [22, 4], [36, 1], [50, 3]]) house(W, x, zc(x) + 17, { w: 8, d: 6, i, two: false, wall: '#E8745A', roof: ['#FF7A59', '#FFD8C9'], night: true });
  // 北邊再後面一排屋頂，讓街看起來很深
  const back = new Batch();
  for (let x = -26; x <= 54; x += 5.5) back.add(new THREE.BoxGeometry(5, 0.3, 9), stripes('#FF7A59', 0.5, '#E8693A', 2), x, 8.4 + (x % 3), zc(x) - 20, -0.25, 0, 0);
  for (let x = -26; x <= 54; x += 5.5) back.add(box(5, 7.5 + (x % 3), 8), stripes('#E8745A', 0.32, '#D9654E'), x, 0, zc(x) - 20);
  back.build(W);
  const tp = temple(W, -33, zc(-33) - 1, { w: 11, d: 9, rot: Math.PI / 2, night: true });
  tag(tp.g, 'temple', null, clickables);
  const trees = [tree(W, R, 9, 15, 'cloud', CROWN.green, 2.2), tree(W, R, -38, 14, 'round', CROWN.green, 1.5), tree(W, R, -40, -14, 'cloud', CROWN.teal, 1.5), tree(W, R, 58, 10, 'egg', CROWN.lime, 1.3)];

  // ---------- 燈籠：一串串掛過街，夜裡是紅色的光 ----------
  const lanterns = new THREE.Group(); W.add(lanterns);
  const lb = new Batch(), lred = M(PAL.coral, { emit: true, zoneAware: true }), lcap = M(PAL.yellow, { emit: true, zoneAware: true });
  const LAMP = [];
  for (let x = -18; x <= 46; x += 8) {
    const z = zc(x);
    for (const dz of [-1.8, 0, 1.8]) {
      lb.add(new THREE.SphereGeometry(0.42, 14, 10).scale(1, 1.25, 1), lred, x, 6.0 - Math.abs(dz) * 0.15, z + dz);
      lb.add(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 10), lcap, x, 6.62 - Math.abs(dz) * 0.15, z + dz);
    }
    lb.add(new THREE.CylinderGeometry(0.03, 0.03, 6.4, 4).rotateX(Math.PI / 2), M(PAL.plum), x, 6.8, z);
    LAMP.push([x, 6, z, 3.6]);
  }
  for (const f of fronts.filter((_, k) => k % 2 === 0)) LAMP.push([f.p.x, 3, f.p.z + 5.6, 2.2]);
  LAMP.push([tp.burner.x, 3, tp.burner.z, 4.5]);
  lb.build(lanterns);
  tag(lanterns, 'lantern', null, clickables);

  // ---------- 湯圓攤 ----------
  const stall = new THREE.Group(); stall.position.set(10.5, 0, zc(10.5) + 5.4); W.add(stall);
  const sb = new Batch();
  sb.add(box(6.5, 1.0, 2.2), stripes('#FFFFFF', 0.4, '#EDE6F7'), 0, 0, 0);
  for (const x of [-3.1, 3.1]) for (const z of [-1.1, 1.6]) sb.add(box(0.2, 3.4, 0.2), M(PAL.plum), x, 0, z);
  sb.add(new THREE.BoxGeometry(7.2, 0.25, 3.8), M(PAL.yellow, { pat: 4, patCol: '#FFFFFF', patScale: 0.5 }), 0, 3.5, 0.3, -0.15, 0, 0);
  sb.add(new THREE.CylinderGeometry(1.0, 0.8, 0.9, 18).translate(0, 0.45, 0), M('#4A4468'), -1.6, 1.0, 0);
  for (let k = 0; k < 4; k++) {
    sb.add(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#FFFFFF'), 0.6 + k * 0.85, 1.42, -0.2);
    for (let j = 0; j < 3; j++) sb.add(new THREE.SphereGeometry(0.12, 8, 6), M(j % 2 ? '#FF7EB3' : '#FFFFFF'), 0.48 + k * 0.85 + j * 0.13, 1.42, -0.2 + (j - 1) * 0.1);
  }
  sb.add(new THREE.SphereGeometry(0.4, 12, 10).scale(1, 1.25, 1), lred, 2.9, 2.8, -1.3);
  sb.build(stall);
  tag(stall, 'stall', null, clickables);
  LAMP.push([10.5, 3, zc(10.5) + 3.6, 3.2]);
  const pot = steam(W, R, [[8.9, 2.0, zc(10.5) + 5.4, 1]], 6, 2.8);
  const incense = steam(W, R, [[tp.burner.x, tp.burner.y + 0.8, tp.burner.z, 0.7]], 5, 3.6);

  // ---------- 街上散步的人 ----------
  const people = Array.from({ length: 9 }, (_, k) => ({ p: walker(W, { col: pick([PAL.cobalt, PAL.pink, PAL.teal, PAL.yellow, '#FFFFFF', PAL.lilac]), hat: R() < 0.4 ? pick([PAL.coral, PAL.yellow]) : null }), u: k / 9 + rr(0, 0.05), dir: k % 2 ? 1 : -1, off: rr(-1.8, 1.8), sp: rr(0.7, 1.0) }));

  // 冬至：東北季風吹來低低的灰雲，一層一層往南推
  const drift = clouds(W, R, [[-24, 17, 3, 1.12], [26, 27, 5, 1.04], [0, 21, 7, 1.36], [44, 31, 4, 0.88]], LOOP, { col: '#E6E1F5', shape: 'flat', speed: 1.4 });
  return {
    bg: '#C9C0E8', night: 1, dusk: 0.42, lamps: [], clickables,
    view: { target: [6, 3, 1], span: 29, el: 33, az: 26, swing: 6, shadowR: 70 },
    update(t, lt) {
      drift(t, 110, 6);
      // 光從天后宮往外擴散：一開場一次，點天后宮再一次
      const dw = lt - ev.wave;
      const r = dw < 0 ? 0 : dw * 26;
      setWave(r, tp.g.position.x, tp.g.position.z);
      setLamps(LAMP.filter((L) => Math.hypot(L[0] - tp.g.position.x, L[2] - tp.g.position.z) < r));
      for (const p of people) {
        const u = fr(p.u + p.dir * t / LOOP * 0.5 * p.sp);
        const a = walkC.getPointAt(Math.min(0.999, u)), n = walkC.getPointAt(Math.min(0.999, u + 0.002));
        const ang = Math.atan2(n.z - a.z, n.x - a.x) + (p.dir < 0 ? Math.PI : 0);
        p.p.g.position.set(a.x, 0.25 + Math.abs(Math.sin(t * 7 + p.u * 9)) * 0.08, a.z + p.off);
        p.p.g.rotation.y = -ang;
        const ph = t * 7 + p.u * 9;
        p.p.legs[0].rotation.z = Math.sin(ph) * 0.5; p.p.legs[1].rotation.z = -Math.sin(ph) * 0.5;
        p.p.arms[0].rotation.z = -Math.sin(ph) * 0.45; p.p.arms[1].rotation.z = Math.sin(ph) * 0.45;
        p.p.g.scale.setScalar(ease(clamp01(Math.min(u, 1 - u) * 14)));
      }
      tp.g.scale.set(1, squash(t - ev.temple), 1);
      stall.scale.setScalar(squash(t - ev.stall));
      lanterns.position.y = squash(t - ev.lantern) * 0 + Math.sin(t * 1.5) * 0.05;
      lanterns.rotation.z = Math.sin(t * 0.9) * 0.004 + Math.exp(-Math.max(0, t - ev.lantern) * 2) * Math.sin((t - ev.lantern) * 10) * 0.01 * (t > ev.lantern ? 1 : 0);
      pot(t, Math.exp(-Math.max(0, t - ev.stall) * 1.5) * (t > ev.stall ? 1.2 : 0)); incense(t);
      for (const tr of trees) sway(tr, t, 0.7);
      confetti.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'temple') { ev.temple = t; ev.wave = t - this.enterT + 0.5; }
      if (kind === 'stall') ev.stall = t;
      if (kind === 'lantern') { ev.lantern = t; confetti.add(V3(p.x, p.y, p.z), t, R, 0.8); }
    },
  };
}
