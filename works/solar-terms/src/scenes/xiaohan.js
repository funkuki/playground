// 小寒・南投合歡山：寒流來了，山上下雪。箭竹草坡上積了雪，冷杉的樹梢是粉紫、冰藍、薄荷色加白點（STYLE.md：冬天不是全白）；
// 台 14 甲線彎彎地翻過鞍部，車子慢慢開；山屋前有人堆雪人，帝雉在路邊散步，山下的谷裡是一片雲海。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, ribbon, pine, tree, sway, house, walker, car, driveAlong, snowfall, bursts, ridge, noEdge, CROWN, PAL, rand, squash, tag, V3, fr, ease, clamp01, lerp, fadeEnds, TAU, clouds } from '../kit.js';

// 地形：一道東西向的主稜，兩座山頭，中間一個鞍部；前面（南邊）低下去是雲海
function H(x, z) {
  const ridgeZ = -18 + 6 * Math.sin(x / 23);
  const ridgeH = 25 * Math.exp(-Math.pow((z - ridgeZ) / 19, 2));
  const pa = 13 * Math.exp(-((x + 36) ** 2 + (z + 26) ** 2) / 260), pb = 12 * Math.exp(-((x - 42) ** 2 + (z + 22) ** 2) / 300);
  const saddle = -9 * Math.exp(-((x - 4) ** 2) / 140) * Math.exp(-((z - ridgeZ) ** 2) / 260);
  const bumps = 1.3 * Math.sin(x * 0.21 + z * 0.13) + 0.9 * Math.sin(x * 0.07 - z * 0.19);
  return Math.max(0, ridgeH + pa + pb + saddle + bumps + 3 - Math.max(0, z - 12) * 0.32);
}

export default function build(W, { LOOP }) {
  const { R, rr, pick } = rand(105);
  const clickables = [];
  const ev = { snowman: -9, pheasant: -9, lodge: -9 };
  const puff = bursts(W, ['#FFFFFF', '#DCE6FF', '#C9B8FF']);

  // ---------- 地形和雪 ----------
  const g = new THREE.PlaneGeometry(180, 140, 120, 94).rotateX(-Math.PI / 2), gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, H(gp.getX(i), gp.getZ(i)));
  g.computeVertexNormals();
  // 一張地形：箭竹草坡的綠，高於雪線的地方由材質畫成雪（雪線在 shader 裡逐像素算）
  const land = mesh(g, dots('#7FD8A6', 0.9, '#62C990'), 0, 0, 0, W);
  land.material = M('#7FD8A6', { pat: 1, patCol: '#62C990', patScale: 0.9, snowY: 6.5 });
  tag(land, 'snow', null, clickables);

  // ---------- 冷杉林：樹冠粉紫、冰藍、薄荷加白點 ----------
  const fb = new Batch();
  for (let i = 0; i < 300; i++) {
    const x = rr(-85, 85), z = rr(-60, 40), y = H(x, z);
    if (y < 1.2 || Math.abs(x - 4) < 9 && z > -30 && z < 5) continue;
    if (Math.hypot(x - 18, z + 6) < 10 || Math.hypot(x + 14, z - 6) < 6) continue;
    pine(fb, x, z, rr(0.8, 1.35), pick([CROWN.lilac, CROWN.ice, CROWN.mint, CROWN.ice]), y - 0.2);
  }
  fb.build(W);
  const mb = new Batch();
  ridge(mb, [[-120, -120, 50, 50, 6], [-50, -128, 56, 62, 5], [30, -124, 50, 56, 6], [110, -122, 54, 48, 5]], stripes('#C9B8FF', 2.4, '#DCD0FF', 2));
  mb.build(W);

  // ---------- 台 14 甲線：彎彎地翻過鞍部 ----------
  const RP = [[-92, 40], [-62, 30], [-40, 20], [-46, 8], [-28, 2], [-12, -2], [-2, -9], [4, -17], [12, -26], [30, -34], [60, -48], [92, -58]];
  const road = ribbon(RP, 3.4, (x, z) => H(x, z) + 0.32, 260);
  mesh(road.geo, dots('#9F96D6', 0.9, '#B3ABE3'), 0, 0, 0, W).castShadow = false;
  const RC = new THREE.CatmullRomCurve3(road.curve.getSpacedPoints(260).map((p) => V3(p.x, H(p.x, p.z) + 0.35, p.z)));
  const cars = [[PAL.coral, 0], [PAL.yellow, 0.36], [PAL.cobalt, 0.68]].map(([col, ph]) => ({ g: car(W, col, 0.95), ph }));

  // ---------- 鞍部的山屋、石碑、雪人、看雪的人 ----------
  const ly = H(18, -6);
  const lodge = house(W, 18, -6, { w: 11, d: 7, i: 2, two: true, roof: ['#FFFFFF', '#DCE6FF'], wall: '#5CC8FF', y: ly });   // 屋頂積了雪
  tag(lodge.g, 'lodge', null, clickables);
  const sy = H(-6, 4);
  const stone = new Batch(); stone.add(box(2.2, 3.2, 1.2), stripes('#EDE6F7', 0.25, '#DCD4EE', 5), 0, 0, 0); stone.add(box(1.6, 1.8, 0.1), M(PAL.coral), 0, 0.9, 0.62); stone.add(box(2.4, 0.4, 1.4), dots('#FFFFFF', 0.3), 0, 3.2, 0);
  const st = new THREE.Group(); st.position.set(-6, sy, 4); W.add(st); stone.build(st);
  const smy = H(-12, 7);
  const snowman = new THREE.Group(); snowman.position.set(-12, smy, 7); W.add(snowman);
  const smM = dots('#FFFFFF', 0.25, '#EAF0FF');
  mesh(new THREE.SphereGeometry(1.2, 18, 14), smM, 0, 1.0, 0, snowman);
  mesh(new THREE.SphereGeometry(0.8, 18, 14), smM, 0, 2.6, 0, snowman);
  mesh(new THREE.ConeGeometry(0.15, 0.7, 8).rotateX(Math.PI / 2), M(PAL.peach), 0, 2.65, 0.95, snowman);
  mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.7, 14), M(PAL.coral), 0, 3.55, 0, snowman);
  mesh(new THREE.TorusGeometry(0.75, 0.16, 8, 20).rotateX(Math.PI / 2), M(PAL.cobalt, { pat: 4, patCol: '#FFFFFF', patScale: 0.2 }), 0, 1.95, 0, snowman);
  tag(snowman, 'snowman', null, clickables);
  const visitors = [[-9, 9, PAL.coral, PAL.yellow], [-15, 4, PAL.cobalt, PAL.pink], [-3, 7, PAL.yellow, PAL.coral], [12, 0, PAL.teal, PAL.yellow]].map(([x, z, col, hat], i) => {
    const p = walker(W, { col, hat }); p.g.position.set(x, H(x, z) + 0.15, z); p.g.rotation.y = rr(0, TAU); return { p, i, x, z };
  });

  // ---------- 帝雉：深藍色的身體、紅臉、長長的白條紋尾巴 ----------
  const ph = new THREE.Group(); W.add(ph);
  const body = new THREE.Group(); ph.add(body);
  mesh(new THREE.SphereGeometry(0.75, 16, 12).scale(1.35, 0.95, 0.9), M('#3B4BB8', { pat: 1, patCol: '#5A6BD8', patScale: 0.25 }), 0, 1.0, 0, body);
  mesh(new THREE.SphereGeometry(0.42, 12, 10), M('#3B4BB8'), 0.9, 1.75, 0, body);
  mesh(new THREE.SphereGeometry(0.2, 10, 8), M(PAL.coral), 1.08, 1.8, 0.18, body);
  mesh(new THREE.SphereGeometry(0.2, 10, 8), M(PAL.coral), 1.08, 1.8, -0.18, body);
  mesh(new THREE.ConeGeometry(0.1, 0.3, 6).rotateZ(-Math.PI / 2), M(PAL.yellow), 1.38, 1.72, 0, body);
  const tail = mesh(box(3.2, 0.14, 0.5).translate(-1.6, 0, 0), M('#3B4BB8', { pat: 4, patCol: '#FFFFFF', patScale: 0.42 }), -0.8, 1.2, 0, body);
  for (const sd of [-0.25, 0.25]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), M('#FF9C6B'), 0, 0.3, sd, ph);
  tag(ph, 'pheasant', null, clickables);

  // ---------- 雲海、雪 ----------
  const sea = Array.from({ length: 9 }, (_, i) => {
    const g = new THREE.Group(); W.add(g);
    const cb = new Batch();
    for (let k = 0; k < 4; k++) cb.add(new THREE.SphereGeometry(rr(4, 7), 16, 10).scale(1.6, 0.5, 1), M('#FFFFFF', { lit: true, shadow: false }), k * 7 - 10, rr(-0.5, 0.5), rr(-2, 2));
    for (const m of cb.build(g)) { m.castShadow = false; m.receiveShadow = false; }
    noEdge(g); return { g, x: rr(-100, 100), z: rr(28, 62), y: rr(1.5, 3.5), ph: R() };
  });
  const flakes = snowfall(W, R, 520, [-80, 80, -50, 50, 46], LOOP);

  // 小寒的合歡山：山前（南邊）低下去的谷裡是一整片白色雲海，慢慢流；山頂上空只有幾朵
  const drift = clouds(W, R, [[-50, 3, 28, 2.2], [-30, 3.5, 32, 2.4], [-10, 3, 28, 2.6], [10, 3.5, 32, 2.4], [30, 3, 28, 2.4]], LOOP, { shape: 'flat', speed: 0.3 });
  const sky = clouds(W, R, [[10, 34, -6, 1.1], [-40, 30, -10, 1.0]], LOOP);
  return {
    bg: '#DCE6FF', clickables,
    view: { target: [-2, 9, -3], span: 40, el: 30, az: 8, swing: 7, shadowR: 95 },
    update(t) {
      drift(t, 110, -2); sky(t, 110, -2);
      flakes(t, (x, z) => H(x, z));
      for (const c of sea) c.g.position.set(((c.x + t * 1.2 + 100) % 200) - 100, c.y, c.z);
      cars.forEach((c, i) => {
        const u = fr(t / (LOOP * 1.5) + c.ph);
        driveAlong(c.g, RC, 0.02 + 0.96 * u, t);
        c.g.scale.setScalar(0.95 * fadeEnds(u, 16));
      });
      // 看雪的人：原地轉來轉去、偶爾抬手（拍照）
      for (const v of visitors) { v.p.g.rotation.y = Math.sin(t * 0.3 + v.i * 2) * 1.2 + v.i; v.p.arms[1].rotation.z = -1.4 * Math.max(0, Math.sin(t * 0.7 + v.i * 1.7)); }
      // 帝雉：沿著路邊慢慢走，走幾步低頭啄一下；點牠會跳起來拍翅
      const u = fr(t / LOOP), seg = u * 6, k = Math.floor(seg), f = seg - k;
      const x0 = -40 + k * 3.2, x = x0 + 3.2 * ease(clamp01(f / 0.6)), z = 11 + Math.sin(x * 0.3) * 0.6;
      const hop = Math.sin(Math.PI * clamp01((t - ev.pheasant) / 0.9)) * 2.5;
      ph.position.set(x, H(x, z) + hop, z); ph.rotation.y = k % 2 ? 0.3 : -0.2;
      body.rotation.z = f > 0.6 ? -0.45 * Math.sin(Math.PI * (f - 0.6) / 0.4) : Math.sin(t * 9) * 0.03;
      tail.rotation.z = 0.12 + Math.sin(t * 2) * 0.04 + hop * 0.12;
      ph.visible = true;
      const ss = squash(t - ev.snowman); snowman.scale.set(1 / Math.sqrt(ss), ss, 1 / Math.sqrt(ss));
      lodge.g.scale.set(1, squash(t - ev.lodge), 1);
      puff.update(t);
    },
    poke(kind, ref, p, t) {
      if (kind === 'snowman') { ev.snowman = t; puff.add(V3(-12, smy + 3, 7), t, R, 1); }
      if (kind === 'pheasant') ev.pheasant = t;
      if (kind === 'lodge') { ev.lodge = t; puff.add(V3(18, ly + 9, -6), t, R, 1.2); }
      if (kind === 'snow') puff.add(V3(p.x, p.y + 0.3, p.z), t, R, 0.7);
    },
  };
}
