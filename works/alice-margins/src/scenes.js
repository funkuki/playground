// 每一幕：建立自己的物件，再把動作排進主 timeline 的 [t0, t0 + D) 區段
// 物件都在建立時就做好，不用 tl.call() 臨時產生（seek 時 callback 不會觸發）
import * as THREE from 'three';
import { C, clump, ground, rng, textPlane, joint, poly, stroke } from './kit.js';
import * as cast from './cast.js';
import { openBook, pageTexture, illustration, canvasIllustration, flipPage } from './book.js';
import { boatScene } from './boat2d.js';
import { nonsenseScene, GLYPHS } from './nonsense2d.js';
import { queenScene } from './queen2d.js';
import { cheshireScene } from './cheshire2d.js';
import { growScene } from './grow2d.js';
import { lectureScene, askScene } from './reversal2d.js';
import { teaScene } from './tea2d.js';
import { iconsScene } from './icons2d.js';
import { rolesScene } from './roles2d.js';
import { aliceScene, grownupScene } from './end2d.js';

export const GROUND_Y = -1.7;

function makeAnim(tl, t0, D, seed, cues) {
  const rnd = rng(seed);
  const at = (s) => t0 + s;
  const A = {
    at, rnd, D,
    // yoyo 循環，重複到填滿 [from, to]
    loop(target, a, b, dur, from = 0, to = D) {
      const n = Math.max(1, Math.ceil((to - from) / dur));
      tl.fromTo(target, { ...a }, { ...b, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: n - 1 }, at(from));
    },
    to(target, vars, s) { tl.to(target, vars, at(s)); },
    fromTo(target, a, b, s) { tl.fromTo(target, a, b, at(s)); },
    set(target, vars, s) { tl.set(target, vars, at(s)); },
    // 音效提示點：記下時間，由 audio.js 合成進音軌
    sfx(name, s, opts = {}) { if (s < D) cues.push({ name, t: at(s), opts }); },
    // 一個物件從 0 彈出來
    pop(obj, s, d = 0.55, ease = 'back.out(2.2)') {
      tl.fromTo(obj.scale, { x: 0.0001, y: 0.0001 }, { x: obj.scale.x || 1, y: obj.scale.y || 1, duration: d, ease }, at(s));
    },
    grow(items, s = 0.2, each = 0.05) {
      tl.fromTo(items.map((i) => i.grow.scale), { x: 0.0001, y: 0.0001 }, { x: 1, y: 1, duration: 0.55, ease: 'back.out(2.4)', stagger: each }, at(s));
    },
    sway(items) {
      items.forEach((i) => A.loop(i.sway.rotation, { z: -0.035 }, { z: 0.035 }, 2.2 + rnd() * 1.4, rnd() * 0.5));
    },
    plants(world, list, seedBase, s = 0.15) {
      const items = [];
      list.forEach(([x, size, z], i) => items.push(...clump(world, x, seedBase + i, size, z)));
      A.grow(items, s);
      A.sway(items);
      A.sfx('sprout', s, { n: Math.min(6, list.length * 2), vol: 0.06 });
      return items;
    },
  };
  return A;
}

function stage(parent) {
  const root = new THREE.Group();
  parent.add(root);
  const world = new THREE.Group();
  world.position.y = GROUND_Y;
  world.scale.setScalar(1.15);
  root.add(world);
  return { root, world };
}

// ---------- 共用的小場面（舞台和書頁插圖都會用到） ----------
function boatParty(world, A, { x = 0, enter = 0 } = {}) {
  const b = cast.boat(world, x, 0.2);
  b.root.position.y = 0.1;
  const rower = cast.adult(b.hull.act, 1.1, { flip: true, z: -0.02 });
  rower.root.position.y = -1.15;
  stroke(rower.elbow.act, [[0.6, 0.05], [2.0, -1.2]], 0.06, C.woodLit, -0.002);
  const girls = [
    cast.girl(b.hull.act, -0.2, { scale: 0.72, z: -0.03 }),
    cast.girl(b.hull.act, -0.85, { scale: 0.66, dress: 0x8f5a62, dressLit: 0xa36d74, apron: false, hair: C.hairDark, z: -0.04 }),
    cast.girl(b.hull.act, -1.45, { scale: 0.6, dress: 0x56704f, dressLit: 0x688360, apron: false, hair: 0x7a5530, z: -0.05 }),
  ];
  girls.forEach((g) => (g.root.position.y = -0.45));
  if (enter !== null) A.fromTo(b.root.position, { x: x - 10 }, { x, duration: 3.2, ease: 'power2.out' }, enter);
  A.loop(b.hull.idle.rotation, { z: -0.025 }, { z: 0.025 }, 1.9);
  A.loop(b.hull.idle.position, { y: -0.04 }, { y: 0.05 }, 1.3);
  A.loop(rower.shoulder.idle.rotation, { z: -0.5 }, { z: 0.35 }, 1.2);
  A.loop(rower.body.idle.rotation, { z: -0.06 }, { z: 0.08 }, 1.2);
  for (let s = 1.2; s < A.D; s += 2.4) A.sfx('splash', s, { vol: enter === null ? 0.08 : 0.2 });
  girls.forEach((g, i) => A.loop(g.head.idle.rotation, { z: -0.08 }, { z: 0.12 }, 2.4 + i * 0.5, i * 0.3));
  return b;
}

// 翻頁：轉到一半時正面變暗、背面由暗轉亮，正交相機下才看得出是一張紙在翻
function turnPage(A, flip, s, d) {
  A.to(flip.pivot.rotation, { y: -Math.PI, duration: d, ease: 'power2.inOut' }, s);
  A.to(flip.pivot.position, { z: 0.6, duration: d / 2, ease: 'power2.out', yoyo: true, repeat: 1 }, s);
  A.to(flip.front.material.color, { r: 0.55, g: 0.55, b: 0.55, duration: d / 2, ease: 'power2.in' }, s);
  A.fromTo(flip.back.material.color, { r: 0.55, g: 0.55, b: 0.55 }, { r: 1, g: 1, b: 1, duration: d / 2, ease: 'power2.out' }, s + d / 2);
}

function questionMarks(parent, A, xs, y, start, gap = 0.5) {
  xs.forEach((x, i) => {
    const q = new THREE.Group();
    q.position.set(x, y + (i % 2) * 0.35, 0.3);
    parent.add(q);
    textPlane(q, '?', { font: 'Georgia', px: 120, color: '#9e2a26', height: 0.8 });
    A.pop(q, start + i * gap);
    A.loop(q.position, { y: q.position.y - 0.06 }, { y: q.position.y + 0.08 }, 1.4 + i * 0.2, start + i * gap + 0.5);
  });
}

// ---------- 各幕 ----------
// 滿版的 2D 場景：src 是 { ready, canvas, draw(t) }，每格重畫後更新貼圖（畫面 16×9 對齊主鏡頭）
function canvasStage(root, src) {
  const tex = new THREE.CanvasTexture(src.canvas);
  tex.anisotropy = 4;
  root.add(new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: tex, depthWrite: false })));
  return { ready: src.ready, draw(t) { src.draw(t); tex.needsUpdate = true; } };
}

const BUILD = {
  boat(main, A) {
    // 2D 紙偶場景（boat2d.js）畫在滿版的貼圖上；船從左邊划進來
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, boatScene({ enter: [0.2, 2.8] }));
    A.sfx('water', 0, { len: A.D });
    A.sfx('whoosh', 0.3, { dur: 2.4, vol: 0.12, from: 200, to: 700 });
    return { root, illus: [il] };
  },

  'title-page'(main, A) {
    const root = new THREE.Group();
    main.add(root);
    const L = pageTexture('left', 21, [{ type: 'title' }, { type: 'text', lines: 9 }]);
    const R = pageTexture('right', 22, [{ type: 'text', lines: 6, cap: 'A' }, { type: 'illus', h: 285 }, { type: 'text', lines: 5 }]);
    const book = openBook(root, L.tex, R.tex);
    // 插圖：第一幕的 2D 紙偶場景，書頁版（透明底、墨色水面），裁出船和兩岸
    const il = canvasIllustration(book.right, R.illus[0], boatScene({ book: true, crop: [370, 418, 1300, 479], out: 1160 }));
    A.fromTo(book.root.position, { y: -0.7 }, { y: 0, duration: 1.3, ease: 'power3.out' }, 0);
    A.fromTo(book.root.scale, { x: 0.92, y: 0.92 }, { x: 1, y: 1, duration: 1.3, ease: 'power3.out' }, 0);
    A.to(book.root.scale, { x: 1.07, y: 1.07, duration: A.D - 2, ease: 'sine.inOut' }, 1.6);
    A.sfx('whoosh', 0, { dur: 1.1, vol: 0.25 });
    A.sfx('thud', 1.0, { vol: 0.35, pitch: 0.8 });
    A.sfx('shimmer', 1.2);
    return { root, illus: [il] };
  },

  nonsense(main, A) {
    // 2D 紙偶場景（nonsense2d.js）：托腮想、頭上冒出符號，10.2 秒攤手
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, nonsenseScene());
    GLYPHS.forEach(([, at], i) => A.sfx('pop', at, { pitch: 0.8 + i * 0.12 }));
    A.sfx('boing', 10.2, { dur: 0.45, vol: 0.2 });
    return { root, illus: [il] };
  },

  queen(main, A) {
    // 2D 紙偶場景（queen2d.js）：1.2 秒抬手指士兵、3 秒卷軸降下、8.6 秒再指一次，士兵發抖
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, queenScene());
    A.sfx('fanfare', 1.0);
    for (let i = 0; i < 3; i++) A.sfx('clank', 1.8 + i * 0.15);
    A.sfx('whoosh', 3.0, { dur: 0.6, vol: 0.2, from: 1200, to: 300 });
    A.sfx('page', 3.4, { dur: 1.1, vol: 0.25 });
    A.sfx('fanfare', 8.5, { short: true });
    for (let k = 0; k < 14; k++) A.sfx('tick', 8.9 + k * 0.1, { vol: 0.12, f: 1400 + (k % 2) * 600 });
    return { root, illus: [il] };
  },

  tea(main, A) {
    // 2D 紙偶場景（tea2d.js）：鐘停在六點，6 秒指針狂轉兩圈、鐘跳起來又彈回六點；4.2、8.6 秒三個人往右挪一個位子
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, teaScene());
    for (let k = 0.5; k < A.D; k += 1) A.sfx('tick', k, { vol: 0.07 });
    for (let k = 0; k < 18; k++) A.sfx('tick', 6.0 + k * 0.066, { vol: 0.13, f: 1400 + (k % 2) * 600 });
    for (let k = 0; k < 5; k++) A.sfx('pop', 6.2 + k * 0.2, { pitch: 0.5, vol: 0.22 });
    A.sfx('boing', 7.2, { dur: 0.5, vol: 0.16 });
    for (const k of [2.4, 10.4, 14.2]) A.sfx('tick', k, { vol: 0.12, f: 2000 });
    A.sfx('clink', 3.1);
    for (const [k, s] of [[1, 4.2], [2, 8.6]]) {
      for (let i = 0; i < 3; i++) {
        const wrap = (i + k) % 3 === 0;
        A.sfx(wrap ? 'boing' : 'pop', s + i * 0.08, wrap ? { dur: 0.9, vol: 0.18 } : { pitch: 0.7, vol: 0.3 });
        A.sfx('clink', s + i * 0.08 + (wrap ? 0.9 : 0.6), { vol: 0.08 });
      }
    }
    return { root, illus: [il] };
  },

  cheshire(main, A) {
    // 2D 紙偶場景（cheshire2d.js）：Alice 問路，貓一開口路標就轉圈；8 秒起貓從尾巴一段段消失，只剩笑容，12.4 秒笑容也消失
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, cheshireScene());
    A.sfx('pop', 3.0, { pitch: 1.3, vol: 0.15 });
    for (let k = 0; k < 8; k++) A.sfx('tick', 4.3 + k * 0.28 * (1 - k * 0.06), { vol: 0.1, f: 900 + k * 120 });
    A.sfx('boing', 6.7, { dur: 0.5, vol: 0.14 });
    // 和 cheshire2d.js 的 VANISH 同步：每一段在這個時間開始淡出
    [8.0, 8.4, 8.8, 9.2, 9.6].forEach((t, i) => A.sfx('poof', t, { pitch: 1 + i * 0.12 }));
    A.sfx('shimmer', 9.9, { vol: 0.06 });
    A.sfx('pop', 12.4, { pitch: 0.6, vol: 0.15 });
    // Alice 頭上冒問號（和 cheshire2d.js 的 QMARKS 同步），一個比一個高
    [1.5, 4.5, 4.9, 5.3, 13.6, 14.1].forEach((t, i) => A.sfx('pop', t, { pitch: 1.5 + (i % 3) * 0.2, vol: 0.18 }));
    return { root, illus: [il] };
  },

  grow(main, A) {
    // 2D 紙偶場景（grow2d.js）：喝 DRINK ME、變得比畫面高、縮得比小門小、跑到門邊，9.6 秒變回原本大小，左右張望
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, growScene());
    [1.0, 1.25, 1.5].forEach((t) => A.sfx('pop', t, { pitch: 0.55, vol: 0.12 }));   // 咕嚕
    A.sfx('boing', 1.9, { dur: 1.4, up: true });
    A.sfx('boing', 5.7, { dur: 1.3, up: false });
    for (let t = 7.35; t < 8.9; t += 0.11) A.sfx('tick', t, { vol: 0.05, f: 2600 });   // 小碎步
    A.sfx('pop', 8.6, { pitch: 0.7, vol: 0.12 });   // 小門打開
    A.sfx('pop', 9.6, { pitch: 0.9 });
    [11.0, 11.8, 12.6].forEach((s) => A.sfx('tick', s, { vol: 0.15, f: 2200 }));
    // 問號：清楚的高音 pop，加兩個很輕的亮音，蓋過口白也聽得到
    A.sfx('pop', 13.9, { pitch: 1.6, vol: 0.4 });
    A.sfx('shimmer', 13.95, { vol: 0.07, notes: [1568, 2093] });
    return { root, illus: [il] };
  },

  reversal(main, A) {
    const root = new THREE.Group();
    main.add(root);
    const L = pageTexture('left', 81, [{ type: 'text', lines: 4, cap: 'T' }, { type: 'illus', h: 420 }, { type: 'text', lines: 6 }]);
    const R1 = pageTexture('right', 82, [{ type: 'text', lines: 17 }]);
    const L2 = pageTexture('left', 83, [{ type: 'text', lines: 3 }, { type: 'illus', h: 440 }, { type: 'text', lines: 6 }]);
    const R2 = pageTexture('right', 84, [{ type: 'text', lines: 7, cap: 'B' }, { type: 'gap', h: 30 }, { type: 'text', lines: 9 }]);
    const book = openBook(root, L.tex, R2.tex);
    const flip = flipPage(book, R1.tex, L2.tex);
    // 插圖 A：大人說教；插圖 B：Alice 提問（畫在翻過去那頁的背面）。都是 reversal2d.js 的 2D 紙偶書頁插圖
    const ia = canvasIllustration(book.left, L.illus[0], lectureScene({ w: 1160, h: Math.round(1160 * L.illus[0].h / L.illus[0].w) }));
    const ib = canvasIllustration(flip.back, L2.illus[0], askScene({ w: 1160, h: Math.round(1160 * L2.illus[0].h / L2.illus[0].w) }));
    A.fromTo(book.root.position, { y: -0.7 }, { y: 0, duration: 1.3, ease: 'power3.out' }, 0);
    turnPage(A, flip, 8.0, 1.7);
    A.sfx('whoosh', 0, { dur: 1.1, vol: 0.25 });
    A.sfx('thud', 1.0, { vol: 0.35, pitch: 0.8 });
    A.sfx('page', 8.0, { dur: 1.7 });
    A.sfx('boing', 10.2, { dur: 0.35, vol: 0.15 });
    [11.0, 11.7, 12.4].forEach((s, i) => A.sfx('pop', s, { pitch: 1 + i * 0.25, vol: 0.4 }));
    [14.4, 17.2, 20.0, 22.6].forEach((s) => A.sfx('pop', s, { pitch: 0.8, vol: 0.15 }));   // Alice 換姿勢
    A.sfx('boing', 17.2, { dur: 0.4, vol: 0.12, up: false });                                // 大人被問住
    [20.6, 21.1].forEach((s, i) => A.sfx('pop', s, { pitch: 1.4 + i * 0.2, vol: 0.35 }));   // 大人頭上的問號
    return { root, illus: [ia, ib] };
  },

  icons(main, A) {
    // 2D 紙偶場景（icons2d.js）：書疊高、年份翻到 2026；四個角色依序從水平線彈出來做招牌動作，最後道具從上方垂下來
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, iconsScene());
    A.sfx('pop', 0.2, { pitch: 0.7, vol: 0.3 });
    [0.35, 1.6, 2.3, 3.0].forEach((s) => A.sfx('thud', s + 0.42, { vol: 0.3, pitch: 1.3 }));   // 書落下
    [1.6, 2.3, 3.0].forEach((s) => A.sfx('tick', s, { vol: 0.2, f: 2400 }));                     // 年份翻頁
    A.sfx('shimmer', 3.2, { vol: 0.08 });
    A.sfx('whoosh', 4.05, { dur: 0.45, vol: 0.12, from: 2000, to: 400 });
    // 和 icons2d.js 的登場時間同步：白兔、貓、帽客、皇后
    [4.6, 6.1, 7.6, 9.1].forEach((s, i) => {
      A.sfx('thud', s, { vol: 0.4, pitch: 1.2 });
      A.sfx('pop', s + 0.05, { pitch: 1 + i * 0.15 });
    });
    A.sfx('boing', 6.0, { dur: 0.3, vol: 0.12 });                                               // 白兔看錶嚇一跳
    for (let k = 0; k < 6; k++) A.sfx('tick', 6.4 + k * 0.5, { vol: 0.1 });
    A.sfx('poof', 7.2, { vol: 0.08, pitch: 1.2 });                                               // 貓閃一下
    A.sfx('shimmer', 7.6, { vol: 0.05, notes: [1318.5, 1760] });                                  // 眨眼
    A.sfx('clink', 9.0);                                                                          // 帽客舉杯
    A.sfx('fanfare', 10.4, { short: true, vol: 0.12 });                                           // 皇后指人
    for (let t = 17.4; t < 18.6; t += 0.1) A.sfx('tick', t, { vol: 0.05, f: 2600 });             // 白兔小跑步
    // 道具垂下來：插畫、玩具、遊戲、電影
    [15.6, 16.4, 17.2, 18.0].forEach((s, i) => {
      A.sfx('whoosh', s, { dur: 0.4, vol: 0.1, from: 1800, to: 600 });
      A.sfx('pop', s + 0.5, { pitch: 1.2 + i * 0.15, vol: 0.25 });
    });
    return { root, illus: [il] };
  },

  roles(main, A) {
    // 2D 紙偶場景（roles2d.js）：三個一模一樣的灰外套大人，金冠、大高帽、兔耳朵掉到頭上；挺胸之後各自做出角色的招牌動作
    const root = new THREE.Group();
    main.add(root);
    const il = canvasStage(root, rolesScene());
    // 和 roles2d.js 的 ADULTS 同步：頭飾在 land 秒開始掉，落地後彈兩下
    [2.6, 3.7, 4.8].forEach((s, i) => {
      A.sfx('whoosh', s - 0.1, { dur: 0.4, vol: 0.15, from: 2000, to: 500 });
      [[0.36, 0.5], [0.73, 0.25], [0.91, 0.12]].forEach(([d, v]) => A.sfx(i === 0 ? 'clink' : 'thud', s + d * 0.9, { vol: v }));
    });
    A.sfx('boing', 7.6, { dur: 0.35, vol: 0.14 });                       // 挺起胸膛
    A.sfx('fanfare', 9.6, { short: true, vol: 0.1 });                     // 伸手指人
    A.sfx('clink', 10.3, { vol: 0.2 });                                   // 端茶
    for (let k = 0; k < 5; k++) A.sfx('tick', 11.0 + k * 0.5, { vol: 0.1 });   // 看懷錶
    return { root, illus: [il] };
  },

  'the-end'(main, A) {
    const root = new THREE.Group();
    main.add(root);
    const L = pageTexture('left', 121, [{ type: 'text', lines: 7, cap: 'P' }, { type: 'gap', h: 20 }, { type: 'text', lines: 10 }]);
    const R = pageTexture('right', 122, [{ type: 'gap', h: 30 }, { type: 'end' }, { type: 'illus', h: 520 }]);
    const back = pageTexture('left', 123, [{ type: 'gap', h: 10 }, { type: 'illus', h: 800 }, { type: 'text', lines: 4 }]);
    const book = openBook(root, L.tex, R.tex);
    const flip = flipPage(book, R.tex, back.tex);
    book.right.visible = false;
    const under = new THREE.Mesh(book.right.geometry, new THREE.MeshBasicMaterial({ color: 0x76201d }));
    under.position.copy(book.right.position);
    under.position.z = -0.05;
    book.root.add(under);

    // 右頁插圖：Alice 抬頭看著一個問號；翻過去的新一頁：同一個大人輪流換上皇冠、高帽、兔耳，頭上冒出問號
    // （「我們是不是也成了那些大人？」）。都是 end2d.js 的 2D 紙偶書頁插圖
    const size = (rc) => ({ w: 1160, h: Math.round(1160 * rc.h / rc.w) });
    const il = canvasIllustration(flip.front, R.illus[0], aliceScene(size(R.illus[0])));
    const il2 = canvasIllustration(flip.back, back.illus[0], grownupScene(size(back.illus[0])));
    [16.2, 16.75, 19.6].forEach((s, i) => A.sfx('pop', s, { pitch: 0.9 + i * 0.2, vol: 0.35 }));   // 大人頭上的問號
    [16.0, 16.7, 17.4, 18.1, 18.8].forEach((s, i) => A.sfx('pop', s, { pitch: 0.7 + (i % 3) * 0.12, vol: 0.15 }));   // 換頭飾（和 end2d.js 的 SWAPS 同步）

    A.fromTo(book.root.position, { y: -0.7 }, { y: 0, duration: 1.3, ease: 'power3.out' }, 0);
    A.to(book.root.scale, { x: 1.05, y: 1.05, duration: A.D - 6.5, ease: 'sine.inOut' }, 1.5);
    // 在「Which leaves a question:」翻頁，最後一句時新的一頁已經攤開
    turnPage(A, flip, 13.3, 2.0);
    A.sfx('whoosh', 0, { dur: 1.1, vol: 0.25 });
    A.sfx('thud', 1.0, { vol: 0.35, pitch: 0.8 });
    A.sfx('pop', 6.0, { pitch: 1.2, vol: 0.4 });                          // Alice 頭上的問號
    A.sfx('shimmer', 6.05, { vol: 0.06, notes: [1568, 2093] });
    A.sfx('pop', 9.0, { pitch: 0.8, vol: 0.15 });                         // 托腮
    A.sfx('page', 13.3, { dur: 2.0 });
    A.sfx('shimmer', A.D - 1.0, { vol: 0.1, notes: [523.3, 659.3, 784, 1046.5] });
    return { root, illus: [il, il2] };
  },
};

export function buildFilm(main, tl, specs, cues = []) {
  let t0 = 0;
  return specs.map((spec, i) => {
    const A = makeAnim(tl, t0, spec.duration, 1000 + i * 17, cues);
    const s = BUILD[spec.id](main, A);
    s.root.visible = false;
    const out = { ...spec, ...s, illus: s.illus || [], start: t0, end: t0 + spec.duration };
    tl.addLabel(spec.id, t0);
    t0 += spec.duration;
    return out;
  });
}
