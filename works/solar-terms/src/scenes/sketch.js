// 還沒畫好的節氣：一張「繪製中」的素描卡。一塊圓形的台子上有幾棵當季顏色的樹、一棟搭著鷹架的小房子，旁邊躺著一支大鉛筆。
import { THREE, M, dots, stripes, lt, Batch, mesh, box, tree, sway, house, walker, walkAlong, CROWN, PAL, rand, squash, tag, V3 } from '../kit.js';

const LOOK = {
  spring: { bg: '#C8F5D8', top: '#A5EBAA', crowns: [CROWN.lime, { ...CROWN.green, bloom: ['#FFFFFF', '#FF7EB3'] }, CROWN.teal] },
  summer: { bg: '#FFF1B8', top: '#9BE15D', crowns: [CROWN.green, CROWN.lime, CROWN.pine] },
  autumn: { bg: '#FFE0CC', top: '#FFD27A', crowns: [CROWN.maple, CROWN.gold, CROWN.green] },
  winter: { bg: '#DCE6FF', top: '#C9D8FF', crowns: [CROWN.lilac, CROWN.ice, CROWN.mint] },
};

export default function build(W, { LOOP, season, term }) {
  const { R, rr } = rand(term.lon + 7);
  const look = LOOK[season], clickables = [];
  const b = new Batch();
  // 台子
  b.add(new THREE.CylinderGeometry(26, 26, 1.6, 64).translate(0, 0.8, 0), stripes('#FFFFFF', 0.5, '#EDE6F7'));
  b.add(new THREE.CylinderGeometry(25.2, 25.2, 0.3, 64).translate(0, 1.75, 0), dots(look.top, 1.4));
  // 一條小路
  b.add(new THREE.RingGeometry(9, 11, 48).rotateX(-Math.PI / 2), dots('#FFF4DD', 0.9), 0, 1.92, 0);
  b.build(W);
  const trees = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + rr(-0.2, 0.2), d = rr(14, 21);
    trees.push(tree(W, R, Math.sin(a) * d, Math.cos(a) * d, ['round', 'cloud', 'egg', 'cone', 'column'][i % 5], look.crowns[i % 3], rr(0.9, 1.25), 1.9));
  }
  // 搭著鷹架的小房子
  const h = house(W, 0, -1, { w: 6, d: 5, i: term.lon % 7, two: true, y: 1.9 });
  const sb = new Batch(), sm = M('#FFFFFF');
  for (const x of [-4, 0, 4]) for (const z of [-4, 2.5]) sb.add(box(0.22, 10, 0.22), sm, x, 1.9, z - 1);
  for (const y of [3, 6, 9]) { sb.add(box(8.2, 0.2, 0.22), sm, 0, 1.9 + y, 1.5); sb.add(box(8.2, 0.2, 0.22), sm, 0, 1.9 + y, -5); }
  sb.build(W);
  // 大鉛筆：黃色六角筆身、粉紅橡皮擦、削好的筆尖
  const pencil = new THREE.Group(); pencil.position.set(-11, 2.7, 9); pencil.rotation.y = 0.5; W.add(pencil);
  const pb = new Batch();
  pb.add(new THREE.CylinderGeometry(0.9, 0.9, 14, 6).rotateZ(Math.PI / 2), stripes(PAL.yellow, 0.6, '#F5B21C', 4));
  pb.add(new THREE.CylinderGeometry(0.92, 0.92, 1.2, 16).rotateZ(Math.PI / 2), M('#C9C0E8'), -7.4, 0, 0);
  pb.add(new THREE.CapsuleGeometry(0.88, 0.8, 4, 16).rotateZ(Math.PI / 2), M(PAL.pink), -8.4, 0, 0);
  pb.add(new THREE.ConeGeometry(0.9, 2.6, 6).rotateZ(-Math.PI / 2), M('#FFE0B8'), 8.3, 0, 0);
  pb.add(new THREE.ConeGeometry(0.32, 0.95, 12).rotateZ(-Math.PI / 2), M('#4A4468'), 9.3, 0, 0);
  pb.build(pencil);
  tag(pencil, 'pencil', null, clickables);
  // 繞著台子散步的人
  const path = new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, k) => V3(Math.sin(k / 16 * Math.PI * 2) * 10, 1.95, Math.cos(k / 16 * Math.PI * 2) * 10)), true);
  const ppl = [0, 0.5].map((u, k) => ({ p: walker(W, { col: [PAL.coral, PAL.cobalt][k], hat: [PAL.yellow, null][k] }), u }));
  const ev = { pencil: -9 };
  return {
    bg: look.bg, clickables,
    view: { target: [0, 4, 0], span: 34, el: 34, az: 12, swing: 10 },
    update(t) {
      for (const tr of trees) sway(tr, t);
      pencil.rotation.x = Math.sin(t * 0.8) * 0.05;
      pencil.scale.setScalar(squash(t - ev.pencil));
      for (const q of ppl) walkAlong(q.p, path, q.u + t / LOOP, t * 7);
      h.g.scale.y = 1;
    },
    poke(kind, ref, p, t) { if (kind === 'pencil') ev.pencil = t; },
  };
}
