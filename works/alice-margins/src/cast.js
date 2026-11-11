// 角色與道具。全部面向右、腳底在 y = 0；要面向左就把 root.scale.x 設成 -1
import * as THREE from 'three';
import { C, poly, stroke, disc, heart, joint, shade, textPlane, windy } from './kit.js';
import * as v2 from './cast2.js';

// 第二版畫風試作：網址加 ?v2 時，瘋帽客和 Alice 換成 cast2.js 的圓滑版本
const V2 = new URLSearchParams(location.search).has('v2');
export function girl(parent, x, opts = {}) { return (V2 ? v2.girl : girl1)(parent, x, opts); }
export function hatter(parent, x, opts = {}) { return (V2 ? v2.hatter : hatter1)(parent, x, opts); }

function rootAt(parent, x, z = 0, flip = false) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  if (flip) root.scale.x = -1;
  parent.add(root);
  return root;
}

function profileFace(g, skin = C.skin, nose = 0.47) {
  poly(g, [[0, 0], [0.28, 0.04], [0.38, 0.2], [0.33, 0.38], [0.2, 0.48], [0.0, 0.42], [-0.08, 0.2]], skin);
  poly(g, [[0.37, 0.24], [nose, 0.16], [0.36, 0.12]], skin, 0.001);
  poly(g, [[0.22, 0.3], [0.29, 0.3], [0.29, 0.27], [0.22, 0.27]], C.ink, 0.002);
}

// 大人：長外套、高帽（Carroll，或第 10 幕的灰衣大人）
export function adult(parent, x, { flip = false, z = 0, coat = C.coat, coatLit = C.coatLit, hat = true, hair = C.hairDark } = {}) {
  const root = rootAt(parent, x, z, flip);
  const body = joint(root);
  stroke(body.act, [[-0.1, 1.6], [-0.15, 0.04]], 0.12, 0x2f2d30, -0.01);
  stroke(body.act, [[0.12, 1.6], [0.18, 0.04]], 0.12, 0x2f2d30, -0.01);
  poly(body.act, [[-0.28, 0], [0.02, 0], [0.0, 0.08], [-0.24, 0.08]], C.ink);
  poly(body.act, [[0.1, 0], [0.42, 0], [0.38, 0.08], [0.12, 0.08]], C.ink);
  windy([poly(body.act, [[-0.42, 2.0], [-0.58, 1.0], [-0.2, 1.1]], coat)], 2.0, 1.0, 0.09);
  windy([
    poly(body.act, [[-0.4, 1.2], [0.42, 1.2], [0.38, 2.9], [0.22, 3.3], [-0.25, 3.3], [-0.42, 2.9]], coat, 0.01),
    poly(body.act, [[0.05, 1.2], [0.42, 1.2], [0.38, 2.9], [0.22, 3.3], [0.05, 3.3]], coatLit, 0.011),
  ], 2.6, 1.2, 0.07);
  poly(body.act, [[0.0, 3.25], [0.24, 3.3], [0.12, 3.12]], C.parch, 0.012);
  const head = joint(body.act, 0.0, 3.3, 0.02);
  profileFace(head.act);
  poly(head.act, [[-0.1, 0.12], [0.0, 0.46], [0.2, 0.5], [0.06, 0.3], [-0.04, 0.08]], hair, 0.003);
  const hatJ = joint(head.act, 0.15, 0.46, 0.004);
  if (hat) {
    poly(hatJ.act, [[-0.28, 0], [0.28, 0.02], [0.28, 0.07], [-0.28, 0.05]], C.hat);
    poly(hatJ.act, [[-0.2, 0.05], [0.2, 0.06], [0.19, 0.64], [-0.19, 0.62]], C.hat);
    poly(hatJ.act, [[0.04, 0.06], [0.2, 0.06], [0.19, 0.64], [0.04, 0.63]], shade(C.hat, 0.45), 0.001);
    poly(hatJ.act, [[-0.2, 0.08], [0.2, 0.09], [0.2, 0.17], [-0.2, 0.16]], C.grey, 0.002);
  }
  const shoulder = joint(body.act, 0.1, 3.05, 0.03);
  poly(shoulder.act, [[-0.11, 0.06], [0.11, 0.05], [0.22, -0.6], [0.03, -0.66]], coat);
  const elbow = joint(shoulder.act, 0.13, -0.62, 0.001);
  poly(elbow.act, [[-0.08, 0.06], [0.07, -0.06], [0.55, -0.02], [0.52, 0.12]], coat);
  poly(elbow.act, [[0.5, -0.04], [0.66, -0.02], [0.66, 0.1], [0.52, 0.12]], C.skin, 0.001);
  return { root, body, head, hat: hatJ, shoulder, elbow };
}

// Alice（或船上的姊妹）：裙子、圍裙、長髮
function girl1(parent, x, { flip = false, z = 0, dress = C.blue, dressLit = C.blueLit, apron = true, hair = C.hair, scale = 1 } = {}) {
  const root = rootAt(parent, x, z, flip);
  const size = joint(root);
  size.pos.scale.setScalar(scale);
  const body = joint(size.act);
  stroke(body.act, [[-0.08, 0.75], [-0.1, 0.06]], 0.08, C.parch, -0.01);
  stroke(body.act, [[0.1, 0.75], [0.14, 0.06]], 0.08, C.parch, -0.01);
  poly(body.act, [[-0.2, 0], [0.0, 0], [-0.02, 0.07], [-0.18, 0.08]], C.ink);
  poly(body.act, [[0.06, 0], [0.3, 0], [0.26, 0.07], [0.08, 0.08]], C.ink);
  windy([
    poly(body.act, [[-0.55, 0.7], [0.55, 0.7], [0.18, 1.75], [-0.15, 1.75]], dress, 0.01),
    poly(body.act, [[0.05, 0.7], [0.55, 0.7], [0.18, 1.75], [0.05, 1.75]], dressLit, 0.011),
    ...(apron ? [poly(body.act, [[0.08, 0.8], [0.42, 0.8], [0.15, 1.7], [0.08, 1.7]], C.parch, 0.012)] : []),
  ], 1.7, 0.7, 0.06);
  poly(body.act, [[-0.15, 1.72], [0.18, 1.72], [0.16, 2.2], [-0.12, 2.2]], dress, 0.013);
  if (apron) poly(body.act, [[0.05, 1.72], [0.18, 1.72], [0.16, 2.15], [0.07, 2.15]], C.parch, 0.014);
  const head = joint(body.act, 0.02, 2.18, 0.02);
  poly(head.act, [[-0.32, -0.5], [-0.05, -0.42], [0.0, 0.0], [0.04, 0.5], [-0.2, 0.55], [-0.38, 0.2]], hair, -0.001);
  poly(head.act, [[-0.02, 0.02], [0.22, 0.04], [0.3, 0.18], [0.26, 0.36], [0.12, 0.45], [-0.04, 0.38]], C.skin);
  poly(head.act, [[-0.08, 0.3], [0.12, 0.47], [0.24, 0.42], [0.08, 0.54], [-0.16, 0.5]], hair, 0.001);
  stroke(head.act, [[-0.08, 0.42], [0.16, 0.5]], 0.04, C.ink, 0.002);
  poly(head.act, [[0.17, 0.26], [0.23, 0.26], [0.23, 0.23], [0.17, 0.23]], C.ink, 0.002);
  const shoulder = joint(body.act, 0.0, 2.1, 0.03);
  poly(shoulder.act, [[-0.1, 0.06], [0.1, 0.06], [0.11, -0.13], [-0.07, -0.15]], dress);
  stroke(shoulder.act, [[0.02, -0.08], [0.12, -0.5]], 0.07, C.skin, -0.001);
  const elbow = joint(shoulder.act, 0.12, -0.5, -0.001);
  stroke(elbow.act, [[0, 0], [0.08, -0.4]], 0.07, C.skin);
  return { root, size, body, head, shoulder, elbow };
}

export function queen(parent, x, { flip = false, z = 0 } = {}) {
  const root = rootAt(parent, x, z, flip);
  const body = joint(root);
  // 長袍：整件連同下擺花邊、愛心一起飄，貼在上面的花樣才不會滑開
  windy([
    poly(body.act, [[-0.75, 0], [0.7, 0], [0.32, 2.7], [-0.3, 2.7]], C.red),
    poly(body.act, [[0.05, 0], [0.7, 0], [0.32, 2.7], [0.05, 2.7]], C.redLit, 0.001),
    poly(body.act, [[-0.78, 0], [0.72, 0], [0.66, 0.24], [-0.72, 0.24]], C.parch, 0.002),
    ...Array.from({ length: 7 }, (_, i) => poly(body.act, [[-0.6 + i * 0.2, 0.08], [-0.56 + i * 0.2, 0.14], [-0.52 + i * 0.2, 0.08], [-0.56 + i * 0.2, 0.02]], C.ink, 0.003)),
    heart(body.act, 0.12, 1.45, 0.32, C.gold, 0.003),
  ], 2.2, 0, 0.06);
  poly(body.act, [[-0.38, 2.62], [0.4, 2.62], [0.48, 2.86], [-0.42, 2.86]], C.parch, 0.004);
  const head = joint(body.act, 0.02, 2.82, 0.02);
  poly(head.act, [[-0.28, -0.05], [-0.04, 0.0], [0.06, 0.5], [-0.15, 0.56], [-0.34, 0.24]], C.ink, -0.001);
  profileFace(head.act);
  stroke(head.act, [[0.22, 0.12], [0.33, 0.1]], 0.025, C.redDark, 0.003);
  poly(head.act, [[-0.12, 0.45], [0.34, 0.48], [0.38, 0.82], [0.28, 0.66], [0.18, 0.86], [0.1, 0.67], [0.0, 0.85], [-0.08, 0.66], [-0.15, 0.8]], C.gold, 0.004);
  poly(head.act, [[-0.12, 0.45], [0.34, 0.48], [0.34, 0.54], [-0.12, 0.52]], C.goldLit, 0.005);
  const shoulder = joint(body.act, 0.15, 2.5, 0.03);
  poly(shoulder.act, [[-0.13, 0.08], [0.12, 0.05], [0.4, -0.5], [0.2, -0.6]], C.red);
  const elbow = joint(shoulder.act, 0.3, -0.55, 0.001);
  poly(elbow.act, [[-0.08, 0.06], [0.08, -0.06], [0.6, 0.04], [0.55, 0.17]], C.redLit);
  poly(elbow.act, [[0.56, 0.02], [0.7, 0.04], [0.7, 0.15], [0.56, 0.17]], C.skin, 0.001);
  stroke(elbow.act, [[0.7, 0.12], [0.86, 0.14]], 0.035, C.skin, 0.001);
  return { root, body, head, shoulder, elbow };
}

export function cardSoldier(parent, x, { flip = false, z = 0, suit = 'heart' } = {}) {
  const root = rootAt(parent, x, z, flip);
  const body = joint(root);
  stroke(body.act, [[-0.18, 1.0], [-0.2, 0.04]], 0.07, C.ink, -0.01);
  stroke(body.act, [[0.18, 1.0], [0.22, 0.04]], 0.07, C.ink, -0.01);
  poly(body.act, [[-0.45, 0.95], [0.45, 0.95], [0.45, 2.6], [-0.45, 2.6]], C.parch);
  poly(body.act, [[0.32, 0.95], [0.45, 0.95], [0.45, 2.6], [0.32, 2.6]], C.parchDark, 0.001);
  const pip = suit === 'heart' ? (px, py, s) => heart(body.act, px, py, s, C.red, 0.002)
    : (px, py, s) => heart(body.act, px, py, s, C.ink, 0.002, true);
  pip(-0.25, 2.4, 0.12); pip(0.18, 1.12, 0.12); pip(0, 1.78, 0.3);
  const head = joint(body.act, 0, 2.6, 0.01);
  poly(head.act, [[-0.15, 0], [0.15, 0], [0.22, 0.2], [0.12, 0.38], [-0.1, 0.38], [-0.18, 0.2]], C.skin);
  poly(head.act, [[0.08, 0.22], [0.14, 0.22], [0.14, 0.19], [0.08, 0.19]], C.ink, 0.001);
  poly(head.act, [[-0.18, 0.3], [0.18, 0.34], [0.12, 0.48], [-0.14, 0.46]], suit === 'heart' ? C.red : C.ink, 0.001);
  const shoulder = joint(body.act, 0.42, 2.3, 0.02);
  stroke(shoulder.act, [[0, 0], [0.32, -0.42]], 0.07, C.ink);
  stroke(shoulder.act, [[0.3, -1.5], [0.36, 1.3]], 0.06, C.wood, 0.001);
  poly(shoulder.act, [[0.36, 1.0], [0.78, 1.25], [0.82, 0.95], [0.78, 0.68], [0.36, 0.9]], C.greyLit, 0.002);
  poly(shoulder.act, [[0.32, 1.3], [0.4, 1.5], [0.42, 1.28]], C.greyLit, 0.002);
  return { root, body, head, shoulder };
}

function hatter1(parent, x, { flip = false, z = 0 } = {}) {
  const root = rootAt(parent, x, z, flip);
  const body = joint(root);
  stroke(body.act, [[-0.12, 1.4], [-0.18, 0.05]], 0.13, C.trouser, -0.01);
  stroke(body.act, [[0.12, 1.4], [0.2, 0.05]], 0.13, C.trouser, -0.01);
  poly(body.act, [[-0.3, 0], [0.0, 0], [-0.04, 0.09], [-0.28, 0.09]], C.ink);
  poly(body.act, [[0.12, 0], [0.46, 0], [0.42, 0.09], [0.14, 0.09]], C.ink);
  windy([poly(body.act, [[-0.42, 1.9], [-0.6, 0.95], [-0.25, 1.2]], C.green)], 1.9, 0.95, 0.09);
  windy([
    poly(body.act, [[-0.38, 1.2], [0.4, 1.2], [0.36, 2.6], [0.15, 2.85], [-0.25, 2.85], [-0.42, 2.5]], C.green, 0.01),
    poly(body.act, [[0.04, 1.2], [0.4, 1.2], [0.36, 2.6], [0.15, 2.85], [0.04, 2.85]], C.greenLit, 0.011),
  ], 2.3, 1.2, 0.06);
  poly(body.act, [[0.08, 2.72], [0.3, 2.84], [0.3, 2.62]], C.gold, 0.012);
  poly(body.act, [[0.08, 2.72], [-0.12, 2.84], [-0.12, 2.62]], C.goldLit, 0.012);
  const head = joint(body.act, 0.0, 2.85, 0.02);
  poly(head.act, [[-0.12, 0.05], [0.0, 0.35], [-0.24, 0.42], [-0.34, 0.12]], 0xb5562f, -0.001);
  poly(head.act, [[0, 0], [0.3, 0.02], [0.42, 0.2], [0.36, 0.36], [0.18, 0.42], [0, 0.36]], C.skin);
  poly(head.act, [[0.4, 0.26], [0.6, 0.12], [0.4, 0.1]], C.skin, 0.001);
  poly(head.act, [[0.22, 0.27], [0.29, 0.27], [0.29, 0.24], [0.22, 0.24]], C.ink, 0.002);
  const hatJ = joint(head.act, 0.08, 0.38, 0.003);
  hatJ.pos.rotation.z = 0.14;
  poly(hatJ.act, [[-0.36, 0], [0.5, 0], [0.5, 0.07], [-0.36, 0.07]], 0x5a4636);
  poly(hatJ.act, [[-0.22, 0.07], [0.38, 0.07], [0.5, 1.25], [-0.32, 1.25]], 0x5a4636);
  poly(hatJ.act, [[0.08, 0.07], [0.38, 0.07], [0.5, 1.25], [0.12, 1.25]], 0x6c5743, 0.001);
  poly(hatJ.act, [[-0.24, 0.12], [0.4, 0.12], [0.42, 0.32], [-0.26, 0.32]], C.redDark, 0.002);
  poly(hatJ.act, [[0.28, 0.2], [0.52, 0.24], [0.5, 0.5], [0.26, 0.46]], C.parch, 0.003);
  stroke(hatJ.act, [[0.31, 0.38], [0.46, 0.4]], 0.025, C.ink, 0.004);
  const shoulder = joint(body.act, 0.1, 2.6, 0.03);
  poly(shoulder.act, [[-0.1, 0.05], [0.1, 0.05], [0.25, -0.55], [0.08, -0.6]], C.green);
  const elbow = joint(shoulder.act, 0.17, -0.57, 0.001);
  poly(elbow.act, [[-0.07, 0.05], [0.07, -0.05], [0.5, 0.15], [0.46, 0.27]], C.green);
  poly(elbow.act, [[0.46, 0.24], [0.68, 0.24], [0.65, 0.42], [0.5, 0.42]], C.parch, 0.001);
  stroke(elbow.act, [[0.42, 0.23], [0.72, 0.23]], 0.03, C.parchDark, 0.002);
  return { root, body, head, hat: hatJ, shoulder, elbow };
}

// 白兔（或棕色的三月兔）
export function rabbit(parent, x, { flip = false, z = 0, brown = false, coat = true } = {}) {
  const f = brown ? { base: C.hare, lit: C.hareLit, dark: C.hareDark } : { base: C.fur, lit: C.furLit, dark: C.furDark };
  if (!brown) { f.base = 0xb9afa8; f.lit = 0xcac1ba; f.dark = 0x958b85; }
  const root = rootAt(parent, x, z, flip);
  const body = joint(root);
  poly(body.act, [[-0.2, 1.5], [0.02, 1.5], [-0.24, 0.75], [-0.04, 0.04], [-0.25, 0], [-0.46, 0.75]], f.dark, -0.02);
  poly(body.act, [[-0.3, 1.4], [0.25, 1.45], [0.32, 2.3], [0.15, 2.9], [-0.1, 2.85], [-0.25, 2.2]], f.base);
  poly(body.act, [[0.0, 1.45], [0.25, 1.45], [0.32, 2.3], [0.15, 2.85], [0.05, 2.3]], f.lit, 0.001);
  if (coat) {
    windy([
      poly(body.act, [[-0.28, 1.55], [0.27, 1.6], [0.3, 2.3], [0.12, 2.6], [-0.2, 2.5]], C.red, 0.002),
      poly(body.act, [[0.02, 1.6], [0.27, 1.6], [0.3, 2.3], [0.12, 2.6]], C.redLit, 0.003),
    ], 2.3, 1.55, 0.04);
    stroke(body.act, [[0.05, 2.0], [0.26, 1.82]], 0.02, C.gold, 0.004);
  }
  const leg = joint(body.act, 0.08, 1.45, 0.02);
  poly(leg.act, [[-0.1, 0.05], [0.12, 0.05], [0.24, -0.72], [0.12, -1.42], [0.4, -1.45], [0.36, -1.38], [0.02, -0.72]], f.base);
  const head = joint(body.act, 0.06, 2.82, 0.03);
  const earB = joint(head.act, 0.1, 0.4, -0.02);
  earB.pos.rotation.z = 0.15;
  poly(earB.act, [[-0.07, 0], [0.07, 0], [0.04, 1.0], [-0.08, 1.08]], f.dark);
  poly(head.act, [[-0.15, 0], [0.15, -0.05], [0.55, 0.15], [0.62, 0.28], [0.4, 0.42], [0.05, 0.45], [-0.12, 0.3]], f.base);
  poly(head.act, [[0.15, -0.05], [0.55, 0.15], [0.62, 0.28], [0.3, 0.2]], f.lit, 0.001);
  poly(head.act, [[0.3, 0.3], [0.38, 0.31], [0.37, 0.27], [0.3, 0.26]], brown ? C.ink : C.red, 0.002);
  const earA = joint(head.act, -0.02, 0.4, 0.01);
  earA.pos.rotation.z = 0.35;
  poly(earA.act, [[-0.08, 0], [0.08, 0], [0.04, 1.1], [-0.1, 1.18]], f.base);
  poly(earA.act, [[-0.02, 0.15], [0.03, 0.15], [0.01, 0.95], [-0.05, 1.0]], 0xd8b3a8, 0.001);
  const shoulder = joint(body.act, 0.15, 2.45, 0.06);
  stroke(shoulder.act, [[0, 0], [0.3, -0.4]], 0.09, f.base);
  const elbow = joint(shoulder.act, 0.3, -0.4, 0.001);
  stroke(elbow.act, [[0, 0], [0.42, 0.1]], 0.08, f.base);
  // 懷錶
  const watch = joint(elbow.act, 0.48, 0.12, 0.002);
  disc(watch.act, 0, 0, 0.13, C.gold);
  disc(watch.act, 0, 0, 0.09, C.parch, 0.001);
  stroke(watch.act, [[0, 0], [0, 0.07]], 0.015, C.ink, 0.002);
  stroke(watch.act, [[0, 0], [0.05, 0]], 0.015, C.ink, 0.002);
  return { root, body, head, earA, earB, leg, shoulder, elbow, watch };
}

// 柴郡貓：趴著，原點在肚子下緣。grin 放在 head.idle 底下，head.act 縮掉時笑容還在
export function cheshire(parent, x, y, { flip = false, z = 0 } = {}) {
  const root = rootAt(parent, x, z, flip);
  root.position.y = y;
  const parts = [];
  const tail = joint(root, -0.95, 0.25, -0.01);
  const tp = [[0, 0], [-0.3, -0.35], [-0.32, -0.75], [-0.15, -1.05], [0.08, -1.12]];
  for (let i = 0; i < tp.length - 1; i++) stroke(tail.act, [tp[i], tp[i + 1]], 0.15, i % 2 ? C.violetDark : C.violet);
  parts.push(tail);
  const body = joint(root, 0, 0);
  poly(body.act, [[-1.0, 0], [0.7, 0], [0.85, 0.45], [0.3, 0.7], [-0.6, 0.66], [-1.05, 0.35]], C.violet);
  poly(body.act, [[-1.0, 0], [0.7, 0], [0.76, 0.18], [-0.97, 0.16]], C.violetLit, 0.001);
  for (let i = 0; i < 4; i++) poly(body.act, [[-0.8 + i * 0.4, 0.66], [-0.66 + i * 0.4, 0.68], [-0.74 + i * 0.4, 0.34], [-0.86 + i * 0.4, 0.36]], C.violetDark, 0.002);
  poly(body.act, [[0.3, 0], [0.5, 0], [0.48, -0.3], [0.32, -0.32]], C.violet, -0.001);
  poly(body.act, [[-0.5, 0], [-0.3, 0], [-0.32, -0.28], [-0.48, -0.3]], C.violetDark, -0.002);
  parts.push(body);
  const head = joint(root, 0.75, 0.55, 0.01);
  poly(head.act, [[-0.35, -0.1], [0.4, -0.15], [0.55, 0.2], [0.4, 0.5], [-0.3, 0.5], [-0.45, 0.2]], C.violet);
  poly(head.act, [[-0.3, 0.45], [-0.15, 0.88], [0.0, 0.48]], C.violet, 0.001);
  poly(head.act, [[0.15, 0.48], [0.3, 0.88], [0.42, 0.45]], C.violet, 0.001);
  poly(head.act, [[-0.22, 0.48], [-0.15, 0.72], [-0.07, 0.48]], C.violetDark, 0.002);
  for (const ex of [-0.08, 0.24]) {
    poly(head.act, [[ex - 0.1, 0.28], [ex, 0.36], [ex + 0.1, 0.28], [ex, 0.2]], C.goldLit, 0.002);
    poly(head.act, [[ex - 0.015, 0.34], [ex + 0.015, 0.34], [ex + 0.015, 0.22], [ex - 0.015, 0.22]], C.ink, 0.003);
  }
  parts.push(head);
  // 笑容：上下兩條弧之間的月牙
  const grin = new THREE.Group();
  grin.position.set(0.08, 0.06, 0.02);
  head.idle.add(grin);
  const outer = [], inner = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (1.12 + (0.76 * i) / 12);
    outer.push([Math.cos(a) * 0.4, Math.sin(a) * 0.22 + 0.1]);
    inner.push([Math.cos(a) * 0.36, Math.sin(a) * 0.08 + 0.06]);
  }
  poly(grin, outer.concat(inner.reverse()), C.parch);
  for (let i = 1; i < 7; i++) {
    const gx = -0.33 + i * 0.094;
    stroke(grin, [[gx, 0.0], [gx, -0.1 + Math.abs(gx) * 0.25]], 0.014, C.ink, 0.001);
  }
  return { root, tail, body, head, grin, parts };
}

// ---------- 道具 ----------
export function boat(parent, x, z = 0) {
  const root = rootAt(parent, x, z);
  const hull = joint(root, 0, 0);
  poly(hull.act, [[-2.1, 0.35], [2.1, 0.35], [1.6, -0.3], [-1.6, -0.3]], C.wood, 0.05);
  poly(hull.act, [[-2.1, 0.35], [2.1, 0.35], [2.0, 0.22], [-2.0, 0.22]], C.woodLit, 0.051);
  stroke(hull.act, [[-1.7, 0.02], [1.7, 0.02]], 0.03, shade(C.wood, -0.3), 0.052);
  return { root, hull };
}

export function water(parent, w = 18, depth = 3, z = 0.3) {
  const g = new THREE.Group();
  g.position.z = z;
  parent.add(g);
  poly(g, [[-w / 2, 0], [w / 2, 0], [w / 2, -depth], [-w / 2, -depth]], C.water);
  const ripples = new THREE.Group();
  g.add(ripples);
  for (let i = 0; i < 22; i++) {
    const rx = -w / 2 + ((i * 7.31) % w), ry = -0.25 - ((i * 0.53) % (depth - 0.4));
    stroke(ripples, [[rx, ry], [rx + 0.5 + (i % 3) * 0.25, ry]], 0.035, C.waterLit, 0.001);
  }
  return { g, ripples };
}

export function tree(parent, x, z = -0.2) {
  const root = rootAt(parent, x, z);
  poly(root, [[-0.25, 0], [0.25, 0], [0.18, 2.0], [0.35, 2.7], [0.12, 2.5], [-0.05, 3.4], [-0.2, 2.2]], C.wood);
  poly(root, [[0.02, 0], [0.25, 0], [0.18, 2.0], [0.35, 2.7], [0.12, 2.5], [0.02, 2.0]], C.woodLit, 0.001);
  stroke(root, [[0.0, 2.45], [-1.2, 2.6], [-2.6, 2.55]], 0.16, C.wood, 0.002);
  const crown = new THREE.Group();
  crown.position.set(0.1, 3.0, -0.01);
  root.add(crown);
  const blobs = [[-0.9, 0.3, 1.0], [0.0, 0.7, 1.2], [0.9, 0.35, 0.95], [0.4, -0.1, 0.8], [-0.5, -0.15, 0.75]];
  blobs.forEach(([bx, by, r], i) => {
    const c = C.greens[i % C.greens.length], p = [];
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + i; p.push([bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.75]); }
    poly(crown, p, c, i * 0.001);
    poly(crown, [[bx, by], p[0], p[1], p[2]], shade(c, 0.14), i * 0.001 + 0.0005);
  });
  return root;
}

export function signpost(parent, x, z = 0) {
  const root = rootAt(parent, x, z);
  poly(root, [[-0.06, 0], [0.06, 0], [0.06, 2.4], [-0.06, 2.4]], C.wood);
  const board = (y, dir, label) => {
    const g = new THREE.Group();
    g.position.set(0, y, 0.01);
    root.add(g);
    const s = dir;
    poly(g, [[0, -0.16], [s * 1.0, -0.16], [s * 1.18, 0], [s * 1.0, 0.16], [0, 0.16]], C.parch);
    const t = textPlane(g, label, { color: '#1d1818', height: 0.26, z: 0.001 });
    t.position.x = s * 0.52;
    return g;
  };
  board(2.1, 1, 'This way');
  board(1.65, -1, 'That way');
  return root;
}

export function table(parent, z = 0.2) {
  const g = new THREE.Group();
  g.position.z = z;
  parent.add(g);
  stroke(g, [[-2.3, 0], [-2.3, 1.1]], 0.1, C.wood);
  stroke(g, [[2.3, 0], [2.3, 1.1]], 0.1, C.wood);
  poly(g, [[-2.6, 0.55], [2.6, 0.55], [2.6, 1.3], [-2.6, 1.3]], C.parch, 0.01);
  poly(g, [[-2.6, 0.62], [2.6, 0.62], [2.6, 0.72], [-2.6, 0.72]], C.red, 0.011);
  poly(g, [[-2.7, 1.25], [2.7, 1.25], [2.7, 1.36], [-2.7, 1.36]], C.woodLit, 0.012);
  // 茶壺與茶杯
  const pot = new THREE.Group();
  pot.position.set(-0.3, 1.36, 0.02);
  g.add(pot);
  poly(pot, [[-0.3, 0], [0.3, 0], [0.36, 0.3], [0.2, 0.5], [-0.2, 0.5], [-0.36, 0.3]], C.blue);
  poly(pot, [[0.0, 0], [0.3, 0], [0.36, 0.3], [0.2, 0.5], [0.0, 0.5]], C.blueLit, 0.001);
  stroke(pot, [[0.34, 0.25], [0.6, 0.45], [0.66, 0.55]], 0.06, C.blue, 0.001);
  poly(pot, [[-0.06, 0.5], [0.06, 0.5], [0.04, 0.62], [-0.04, 0.62]], C.gold, 0.001);
  for (const cx of [-1.6, 0.9, 1.9]) {
    const cup = new THREE.Group();
    cup.position.set(cx, 1.36, 0.02);
    g.add(cup);
    poly(cup, [[-0.14, 0], [0.14, 0], [0.18, 0.22], [-0.18, 0.22]], C.parch);
    stroke(cup, [[-0.24, 0.0], [0.24, 0.0]], 0.03, C.parchDark, 0.001);
  }
  return g;
}

export function clock(parent, x, y, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  stroke(g, [[0, 0], [0, y]], 0.08, C.wood);
  const face = new THREE.Group();
  face.position.y = y;
  g.add(face);
  disc(face, 0, 0, 0.62, C.gold, 0.01, 28);
  disc(face, 0, 0, 0.52, C.parch, 0.011, 28);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    stroke(face, [[Math.sin(a) * 0.42, Math.cos(a) * 0.42], [Math.sin(a) * 0.48, Math.cos(a) * 0.48]], 0.025, C.ink, 0.012);
  }
  const hour = new THREE.Group(), minute = new THREE.Group();
  hour.position.z = minute.position.z = 0.013;
  face.add(hour, minute);
  stroke(hour, [[0, 0], [0, -0.28]], 0.05, C.ink);
  stroke(minute, [[0, 0], [0, 0.4]], 0.03, C.ink);
  disc(face, 0, 0, 0.05, C.red, 0.015);
  return { g, face, hour, minute };
}

export function door(parent, x, z = -0.1) {
  const g = rootAt(parent, x, z);
  poly(g, [[-0.32, 0], [0.32, 0], [0.32, 0.6], [0, 0.8], [-0.32, 0.6]], C.woodLit);
  poly(g, [[-0.24, 0], [0.24, 0], [0.24, 0.55], [0, 0.7], [-0.24, 0.55]], C.wood, 0.001);
  disc(g, 0.14, 0.32, 0.035, C.gold, 0.002);
  return g;
}

export function bottle(parent, x, z = 0.1) {
  const g = rootAt(parent, x, z);
  poly(g, [[-0.14, 0], [0.14, 0], [0.14, 0.32], [0.05, 0.42], [0.05, 0.55], [-0.05, 0.55], [-0.05, 0.42], [-0.14, 0.32]], 0x4f6f86);
  poly(g, [[-0.12, 0.08], [0.12, 0.08], [0.12, 0.24], [-0.12, 0.24]], C.parch, 0.001);
  poly(g, [[-0.05, 0.55], [0.05, 0.55], [0.05, 0.62], [-0.05, 0.62]], C.wood, 0.001);
  return g;
}

export function crown(parent) {
  const g = new THREE.Group();
  parent.add(g);
  poly(g, [[-0.24, 0], [0.24, 0], [0.28, 0.34], [0.16, 0.2], [0.06, 0.4], [-0.04, 0.2], [-0.14, 0.38], [-0.24, 0.2], [-0.3, 0.32]], C.gold);
  poly(g, [[-0.24, 0], [0.24, 0], [0.24, 0.07], [-0.24, 0.07]], C.goldLit, 0.001);
  return g;
}
export function tallHat(parent) {
  const g = new THREE.Group();
  parent.add(g);
  poly(g, [[-0.36, 0], [0.42, 0], [0.42, 0.07], [-0.36, 0.07]], 0x5a4636);
  poly(g, [[-0.22, 0.07], [0.3, 0.07], [0.42, 1.0], [-0.3, 1.0]], 0x5a4636);
  poly(g, [[-0.24, 0.12], [0.32, 0.12], [0.34, 0.28], [-0.26, 0.28]], C.redDark, 0.001);
  poly(g, [[0.2, 0.18], [0.42, 0.22], [0.4, 0.44], [0.18, 0.4]], C.parch, 0.002);
  return g;
}
export function bunnyEars(parent) {
  const g = new THREE.Group();
  parent.add(g);
  stroke(g, [[-0.25, 0.0], [0.25, 0.02]], 0.05, C.ink);
  poly(g, [[-0.16, 0], [-0.02, 0], [-0.1, 0.95], [-0.24, 0.9]], 0xcac1ba, 0.001);
  poly(g, [[0.02, 0], [0.16, 0], [0.22, 0.85], [0.08, 0.92]], 0xb9afa8, 0.001);
  return g;
}
