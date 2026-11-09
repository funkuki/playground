// 每一幕：建立自己的物件，再把動作排進主 timeline 的 [t0, t0 + D) 區段
// 物件都在建立時就做好，不用 tl.call() 臨時產生（seek 時 callback 不會觸發）
import * as THREE from 'three';
import { C, clump, ground, rng, textPlane, joint, poly, stroke } from './kit.js';
import * as cast from './cast.js';
import { openBook, pageTexture, illustration, flipPage } from './book.js';

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
const BUILD = {
  boat(main, A) {
    const { root, world } = stage(main);
    const w = cast.water(world, 18, 3.2, 0.3);
    A.fromTo(w.ripples.position, { x: 0 }, { x: -1.4, duration: A.D, ease: 'none' }, 0);
    A.plants(world, [[-6.3, 0.8, -0.4], [-4.4, 0.65, -0.4], [3.6, 0.7, -0.4], [6.0, 0.9, -0.4]], 10, 0.3);
    boatParty(world, A, { x: -0.6, enter: 0.2 });
    A.sfx('water', 0, { len: A.D });
    A.sfx('whoosh', 0.3, { dur: 2.4, vol: 0.12, from: 200, to: 700 });
    return { root };
  },

  'title-page'(main, A) {
    const root = new THREE.Group();
    main.add(root);
    const L = pageTexture('left', 21, [{ type: 'title' }, { type: 'text', lines: 9 }]);
    const R = pageTexture('right', 22, [{ type: 'text', lines: 6, cap: 'A' }, { type: 'illus', h: 380 }, { type: 'text', lines: 4 }]);
    const book = openBook(root, L.tex, R.tex);
    const il = illustration(book.right, R.illus[0], { viewH: 5.2, groundFrom: 1.1 });
    const w = cast.water(il.world, 9.5, 0.8, 0.3);
    clump(il.world, -5.2, 23, 0.6, 0.2);
    clump(il.world, 5.2, 24, 0.7, 0.2);
    A.fromTo(w.ripples.position, { x: 0 }, { x: -1.2, duration: A.D, ease: 'none' }, 0);
    boatParty(il.world, A, { x: 0, enter: null });
    A.fromTo(book.root.position, { y: -0.7 }, { y: 0, duration: 1.3, ease: 'power3.out' }, 0);
    A.fromTo(book.root.scale, { x: 0.92, y: 0.92 }, { x: 1, y: 1, duration: 1.3, ease: 'power3.out' }, 0);
    A.to(book.root.scale, { x: 1.07, y: 1.07, duration: A.D - 2, ease: 'sine.inOut' }, 1.6);
    A.sfx('whoosh', 0, { dur: 1.1, vol: 0.25 });
    A.sfx('thud', 1.0, { vol: 0.35, pitch: 0.8 });
    A.sfx('shimmer', 1.2);
    return { root, illus: [il] };
  },

  nonsense(main, A) {
    const { root, world } = stage(main);
    ground(world);
    A.plants(world, [[-5.2, 0.9, -0.3], [-2.4, 0.7, 0.3], [2.2, 0.8, 0.3], [5.0, 1.0, -0.3]], 30);
    const carroll = cast.adult(world, -0.4);
    A.loop(carroll.body.idle.rotation, { z: -0.015 }, { z: 0.015 }, 2.4);
    // 托著下巴想，最後攤手
    A.to(carroll.shoulder.act.rotation, { z: 0.35, duration: 0.6, ease: 'power2.inOut' }, 0.8);
    A.to(carroll.elbow.act.rotation, { z: 1.75, duration: 0.6, ease: 'power2.inOut' }, 0.8);
    A.to(carroll.head.act.rotation, { z: 0.12, duration: 0.8 }, 1.0);
    A.to(carroll.shoulder.act.rotation, { z: 1.25, duration: 0.5, ease: 'back.out(2)' }, 10.2);
    A.to(carroll.elbow.act.rotation, { z: 0.5, duration: 0.5, ease: 'back.out(2)' }, 10.2);
    A.to(carroll.head.act.rotation, { z: -0.1, duration: 0.5 }, 10.2);
    A.sfx('boing', 10.2, { dur: 0.45, vol: 0.2 });
    const glyphs = ['∴', '≠', 'x²', '?', 'A', 'Z', '∞'];
    glyphs.forEach((g, i) => {
      const a = Math.PI * (0.88 - (0.76 * i) / (glyphs.length - 1));
      const q = new THREE.Group();
      q.position.set(-0.3 + Math.cos(a) * 2.5, 3.85 + Math.sin(a) * 0.9, 0.3);
      world.add(q);
      textPlane(q, g, { font: /[A-Z]/.test(g) ? 'UnifrakturMaguntia' : 'Georgia', px: 110, color: i % 3 === 1 ? '#c4a24c' : '#e6dcc6', height: 0.7 });
      A.pop(q, 2.0 + i * 0.6);
      A.sfx('pop', 2.0 + i * 0.6, { pitch: 0.8 + i * 0.12 });
      A.loop(q.position, { y: q.position.y - 0.08 }, { y: q.position.y + 0.08 }, 1.3 + (i % 3) * 0.3, 2.6 + i * 0.6);
      A.loop(q.rotation, { z: -0.12 }, { z: 0.12 }, 1.7 + (i % 2) * 0.4, 2.6 + i * 0.6);
    });
    return { root };
  },

  queen(main, A) {
    const { root, world } = stage(main);
    ground(world);
    A.plants(world, [[-5.6, 0.9, -0.3], [-1.4, 0.7, 0.4], [5.6, 0.9, 0.3]], 40);
    const q = cast.queen(world, -3.3);
    const soldiers = [cast.cardSoldier(world, 1.4, { flip: true }), cast.cardSoldier(world, 3.6, { flip: true, suit: 'spade', z: -0.1 })];
    A.loop(q.body.idle.rotation, { z: -0.015 }, { z: 0.02 }, 2.2);
    A.loop(q.head.idle.rotation, { z: -0.03 }, { z: 0.05 }, 1.7);
    // 第一次指：手臂抬起、身體前傾
    A.to(q.shoulder.act.rotation, { z: 1.3, duration: 0.4, ease: 'back.out(2)' }, 1.2);
    A.to(q.elbow.act.rotation, { z: -0.25, duration: 0.4 }, 1.2);
    A.to(q.body.act.rotation, { z: -0.06, duration: 0.4 }, 1.2);
    A.sfx('fanfare', 1.0);
    soldiers.forEach((s, i) => {
      A.loop(s.body.idle.rotation, { z: -0.02 }, { z: 0.02 }, 1.6 + i * 0.3);
      A.to(s.shoulder.act.rotation, { z: 0.55, duration: 0.35, ease: 'back.out(2.5)' }, 1.6 + i * 0.15);
      A.sfx('clank', 1.8 + i * 0.15);
    });
    // 卷軸由上往下展開
    const scroll = new THREE.Group();
    scroll.position.set(-0.6, 5.2, 0.4);
    world.add(scroll);
    stroke(scroll, [[-1.9, 0], [1.9, 0]], 0.1, C.wood, 0.01);
    const sheet = new THREE.Group();
    scroll.add(sheet);
    poly(sheet, [[-1.7, 0], [1.7, 0], [1.7, -1.6], [-1.7, -1.6]], C.parch);
    const l1 = textPlane(sheet, 'Sentence first —', { color: '#1d1818', height: 0.5, z: 0.01 });
    l1.position.y = -0.5;
    const l2 = textPlane(sheet, 'verdict afterwards.', { color: '#9e2a26', height: 0.5, z: 0.01 });
    l2.position.y = -1.08;
    A.fromTo(sheet.scale, { y: 0.0001 }, { y: 1, duration: 1.2, ease: 'power2.out' }, 3.4);
    A.sfx('whoosh', 3.0, { dur: 0.6, vol: 0.2, from: 1200, to: 300 });
    A.sfx('page', 3.4, { dur: 1.1, vol: 0.25 });
    A.fromTo(scroll.position, { y: 7.0 }, { y: 5.2, duration: 0.6, ease: 'power2.out' }, 3.0);
    // 第二次指，士兵發抖
    A.to(q.shoulder.act.rotation, { z: 0.2, duration: 0.5, ease: 'power2.inOut' }, 5.6);
    A.to(q.body.act.rotation, { z: 0, duration: 0.5 }, 5.6);
    A.to(q.shoulder.act.rotation, { z: 1.45, duration: 0.3, ease: 'back.out(3)' }, 8.6);
    A.to(q.body.act.rotation, { z: -0.1, duration: 0.3 }, 8.6);
    A.sfx('fanfare', 8.5, { short: true });
    for (let k = 0; k < 14; k++) A.sfx('tick', 8.9 + k * 0.1, { vol: 0.12, f: 1400 + (k % 2) * 600 });
    soldiers.forEach((s) => A.fromTo(s.body.act.position, { x: -0.04 }, { x: 0.04, duration: 0.06, repeat: 23, yoyo: true, ease: 'none' }, 8.9));
    return { root };
  },

  tea(main, A) {
    const { root, world } = stage(main);
    ground(world);
    A.plants(world, [[-6.0, 0.8, -0.3], [5.8, 0.9, -0.3]], 50);
    const ck = cast.clock(world, -4.6, 2.2, 0.1);
    A.fromTo(ck.minute.rotation, { z: -0.18 }, { z: 0.18, duration: 0.08, repeat: 9, yoyo: true, ease: 'none' }, 6.0);
    A.to(ck.minute.rotation, { z: 0, duration: 0.2 }, 6.8);
    for (let k = 0.5; k < A.D; k += 1) A.sfx('tick', k, { vol: 0.07 });
    for (let k = 0; k < 10; k++) A.sfx('tick', 6.0 + k * 0.08, { vol: 0.12 });
    const seats = [-1.6, 0.1, 1.7];
    const who = [
      cast.hatter(world, 0, { z: -0.1 }),
      cast.rabbit(world, 0, { flip: true, brown: true, coat: false, z: -0.12 }),
      cast.girl(world, 0, { flip: true, z: -0.14 }),
    ];
    const lift = [-0.95, -0.95, -0.55];
    who.forEach((w, i) => {
      w.root.position.set(seats[i], lift[i], w.root.position.z);
      A.loop(w.head.idle.rotation, { z: -0.05 }, { z: 0.06 }, 1.6 + i * 0.4);
    });
    cast.table(world, 0.2);
    // 喝茶
    A.to(who[0].elbow.act.rotation, { z: 0.6, duration: 0.4 }, 1.6);
    A.to(who[0].head.act.rotation, { z: 0.15, duration: 0.4 }, 1.6);
    A.to(who[0].elbow.act.rotation, { z: 0, duration: 0.4 }, 2.8);
    A.sfx('clink', 3.1);
    A.to(who[0].head.act.rotation, { z: 0, duration: 0.4 }, 2.8);
    // 換位子：每個人往右一格，最右邊的跳回最左邊
    for (const [k, s] of [[1, 4.2], [2, 8.6]]) {
      who.forEach((w, i) => {
        const x = seats[(i + k) % 3], wrap = (i + k) % 3 === 0;
        A.to(w.root.position, { x, duration: wrap ? 0.9 : 0.6, ease: 'power1.inOut' }, s + i * 0.08);
        A.sfx(wrap ? 'boing' : 'pop', s + i * 0.08, wrap ? { dur: 0.9, vol: 0.18 } : { pitch: 0.7, vol: 0.3 });
        A.sfx('clink', s + i * 0.08 + (wrap ? 0.9 : 0.6), { vol: 0.08 });
        A.to(w.root.position, { y: lift[i] + (wrap ? 1.6 : 0.45), duration: (wrap ? 0.45 : 0.3), ease: 'power2.out', yoyo: true, repeat: 1 }, s + i * 0.08);
      });
    }
    return { root };
  },

  cheshire(main, A) {
    const { root, world } = stage(main);
    ground(world);
    A.plants(world, [[-5.8, 0.9, -0.3], [-1.6, 0.7, 0.3], [5.4, 0.8, 0.3]], 60);
    cast.tree(world, 3.4);
    const cat = cast.cheshire(world, 1.9, 2.66, { flip: true, z: 0.05 });
    const alice = cast.girl(world, -3.0);
    cast.signpost(world, -0.9, -0.05);
    A.loop(cat.tail.idle.rotation, { z: -0.25 }, { z: 0.2 }, 1.1);
    A.loop(cat.head.idle.rotation, { z: -0.05 }, { z: 0.06 }, 1.8);
    A.loop(alice.body.idle.rotation, { z: -0.01 }, { z: 0.01 }, 2.0);
    A.to(alice.head.act.rotation, { z: 0.38, duration: 0.6, ease: 'power2.inOut' }, 1.4);
    A.to(alice.head.act.rotation, { z: -0.05, duration: 0.6, ease: 'power2.inOut' }, 4.6);
    A.to(alice.shoulder.act.rotation, { z: 1.2, duration: 0.5, ease: 'back.out(2)' }, 5.0);
    A.to(alice.shoulder.act.rotation, { z: 0, duration: 0.5 }, 6.6);
    A.to(alice.head.act.rotation, { z: 0.38, duration: 0.6, ease: 'power2.inOut' }, 7.4);
    // 從尾巴開始一塊塊消失，只剩笑容
    cat.parts.forEach((p, i) => A.sfx('vanish', 8.0 + i * 0.6));
    A.sfx('shimmer', 9.9, { vol: 0.1 });
    A.sfx('pop', 12.4, { pitch: 0.6, vol: 0.3 });
    cat.parts.forEach((p, i) => A.to(p.act.scale, { x: 0.0001, y: 0.0001, duration: 0.45, ease: 'back.in(2)' }, 8.0 + i * 0.6));
    A.to(cat.grin.scale, { x: 1.25, y: 1.25, duration: 0.5, ease: 'back.out(2)' }, 9.9);
    A.to(cat.grin.scale, { x: 0.0001, y: 0.0001, duration: 0.6, ease: 'back.in(2)' }, 12.4);
    return { root };
  },

  grow(main, A) {
    const { root, world } = stage(main);
    ground(world);
    A.plants(world, [[-5.6, 0.9, -0.3], [-3.6, 0.6, 0.3], [4.6, 0.8, 0.3], [6.2, 0.7, -0.3]], 70);
    cast.door(world, 2.6);
    cast.bottle(world, 0.7);
    const alice = cast.girl(world, -1.0);
    A.loop(alice.head.idle.rotation, { z: -0.05 }, { z: 0.05 }, 1.7);
    A.to(alice.size.act.scale, { x: 2.2, y: 2.2, duration: 1.4, ease: 'power2.inOut' }, 1.8);
    A.sfx('boing', 1.8, { dur: 1.4, up: true });
    A.sfx('boing', 5.6, { dur: 1.4, up: false });
    A.sfx('pop', 9.6, { pitch: 0.9 });
    [11.0, 11.8, 12.6].forEach((s) => A.sfx('tick', s, { vol: 0.15, f: 2200 }));
    A.to(alice.shoulder.act.rotation, { z: 1.0, duration: 0.4 }, 3.0);
    A.to(alice.size.act.scale, { x: 0.28, y: 0.28, duration: 1.4, ease: 'power2.inOut' }, 5.6);
    A.to(alice.shoulder.act.rotation, { z: 0, duration: 0.4 }, 5.6);
    A.to(alice.size.act.scale, { x: 1, y: 1, duration: 1.0, ease: 'back.out(1.6)' }, 9.6);
    // 左右張望：整個人轉向，再轉回來
    A.set(alice.root.scale, { x: -1 }, 11.0);
    A.set(alice.root.scale, { x: 1 }, 11.8);
    A.set(alice.root.scale, { x: -1 }, 12.6);
    return { root };
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
    // 插圖 A：大人說教
    const ia = illustration(book.left, L.illus[0], { viewH: 5.6, groundFrom: 0.7 });
    ground(ia.world, 9);
    const q = cast.queen(ia.world, -1.5);
    const h = cast.hatter(ia.world, 1.6, { flip: true });
    A.loop(q.shoulder.act.rotation, { z: 0.7 }, { z: 1.35 }, 0.7, 0.6, 9);
    A.loop(h.head.act.rotation, { z: -0.1 }, { z: 0.12 }, 0.45, 0.6, 9);
    A.loop(h.elbow.act.rotation, { z: 0 }, { z: 0.9 }, 0.9, 0.6, 9);
    // 插圖 B：Alice 提問（畫在翻過去那頁的背面）
    const ib = illustration(flip.back, L2.illus[0], { viewH: 5.6, groundFrom: 0.7 });
    ground(ib.world, 9);
    clump(ib.world, -2.6, 85, 0.7, 0.2);
    clump(ib.world, 2.8, 86, 0.8, 0.2);
    const alice = cast.girl(ib.world, -0.4);
    A.to(alice.shoulder.act.rotation, { z: 2.6, duration: 0.5, ease: 'back.out(2)' }, 10.2);
    A.loop(alice.head.idle.rotation, { z: -0.04 }, { z: 0.14 }, 1.2, 10.2);
    questionMarks(ib.world, A, [0.9, 1.7, 2.4], 3.0, 11.0, 0.7);
    A.fromTo(book.root.position, { y: -0.7 }, { y: 0, duration: 1.3, ease: 'power3.out' }, 0);
    turnPage(A, flip, 8.0, 1.7);
    A.sfx('whoosh', 0, { dur: 1.1, vol: 0.25 });
    A.sfx('thud', 1.0, { vol: 0.35, pitch: 0.8 });
    A.sfx('page', 8.0, { dur: 1.7 });
    A.sfx('boing', 10.2, { dur: 0.35, vol: 0.15 });
    [11.0, 11.7, 12.4].forEach((s, i) => A.sfx('pop', s, { pitch: 1 + i * 0.25 }));
    return { root, illus: [ia, ib] };
  },

  icons(main, A) {
    const { root, world } = stage(main);
    ground(world);
    // 開場：年份從出版那年一路翻到今天，數字縮掉之後角色才一個個登場
    const years = new THREE.Group();
    years.position.set(0, 2.55, 0.2);
    world.add(years);
    const ys = ['1865', '1951', '2010', '2026'];
    const yearPlanes = ys.map((y, i) => {
      const m = textPlane(years, y, { font: 'Georgia', px: 160, color: i === ys.length - 1 ? '#e0c46e' : '#e6dcc6', height: 1.7 });
      m.visible = i === 0;
      return m;
    });
    const since = new THREE.Group();
    since.position.y = -1.2;
    years.add(since);
    textPlane(since, '160 years & counting', { font: 'Georgia', px: 72, color: '#e0c46e', height: 0.5 });
    stroke(since, [[-3.1, 0], [-2.3, 0]], 0.04, C.gold);
    stroke(since, [[2.3, 0], [3.1, 0]], 0.04, C.gold);
    // 一年一本：書越疊越高
    const pile = new THREE.Group();
    pile.position.set(0, 0, 0.1);
    world.add(pile);
    const covers = [[C.red, C.redLit], [C.blue, C.blueLit], [C.green, C.greenLit], [C.violet, C.violetLit]];
    const books = covers.map(([c, lit], i) => {
      const b = new THREE.Group();
      b.position.set((i % 2 ? 0.12 : -0.1) + (i === 3 ? 0.05 : 0), i * 0.26 + 0.13, i * 0.01);
      b.rotation.z = [0.0, -0.04, 0.05, -0.02][i];
      pile.add(b);
      const w = [1.7, 1.5, 1.6, 1.3][i];
      poly(b, [[-w / 2, -0.13], [w / 2, -0.13], [w / 2, 0.13], [-w / 2, 0.13]], c);
      poly(b, [[w / 2 - 0.12, -0.13], [w / 2, -0.13], [w / 2, 0.13], [w / 2 - 0.12, 0.13]], lit, 0.001);
      poly(b, [[-w / 2 + 0.06, -0.09], [w / 2 - 0.16, -0.09], [w / 2 - 0.16, 0.09], [-w / 2 + 0.06, 0.09]], C.parch, -0.001);
      stroke(b, [[-w * 0.2, 0], [w * 0.15, 0]], 0.03, C.gold, 0.002);
      return b;
    });
    A.to(pile.scale, { x: 0.0001, y: 0.0001, duration: 0.4, ease: 'back.in(2)' }, 4.1);
    A.pop(years, 0.2, 0.6);
    A.sfx('pop', 0.2, { pitch: 0.7, vol: 0.3 });
    books.forEach((b, i) => {
      const s = i ? 0.9 + i * 0.7 : 0.35;
      A.fromTo(b.position, { y: b.position.y + 3 }, { y: b.position.y, duration: 0.45, ease: 'bounce.out' }, s);
      A.fromTo(b.scale, { x: 0.0001 }, { x: 1, duration: 0.01 }, s);
      A.sfx('thud', s + 0.15, { vol: 0.3, pitch: 1.3 });
    });
    for (let i = 1; i < ys.length; i++) {
      const s = 0.9 + i * 0.7;
      A.set(yearPlanes[i - 1], { visible: false }, s);
      A.set(yearPlanes[i], { visible: true }, s);
      A.fromTo(yearPlanes[i].scale, { y: 0.55 }, { y: 1, duration: 0.25, ease: 'back.out(3)' }, s);
      A.sfx('tick', s, { vol: 0.2, f: 2400 });
    }
    A.pop(since, 3.2, 0.5);
    A.sfx('shimmer', 3.2, { vol: 0.08 });
    A.to(years.scale, { x: 0.0001, y: 0.0001, duration: 0.45, ease: 'back.in(2)' }, 4.05);
    A.sfx('whoosh', 4.05, { dur: 0.45, vol: 0.12, from: 2000, to: 400 });

    const xs = [-5.0, -1.9, 1.5, 4.6];
    const rb = cast.rabbit(world, xs[0]);
    const cat = cast.cheshire(world, xs[1], 0.32, { z: 0.05 });
    const ht = cast.hatter(world, xs[2], { flip: true });
    const qn = cast.queen(world, xs[3], { flip: true });
    const roots = [rb.root, cat.root, ht.root, qn.root];
    roots.forEach((r, i) => {
      A.pop(r, 4.6 + i * 1.5, 0.6, 'back.out(1.8)');
      A.sfx('thud', 4.6 + i * 1.5, { vol: 0.45, pitch: 1.2 });
      A.sfx('pop', 4.65 + i * 1.5, { pitch: 1 + i * 0.15 });
      A.plants(world, [[xs[i] - 0.9, 0.6, 0.3], [xs[i] + 0.9, 0.55, -0.3]], 90 + i * 2, 4.7 + i * 1.5);
    });
    // 招牌動作
    A.loop(rb.earA.idle.rotation, { z: -0.08 }, { z: 0.08 }, 1.4);
    A.to(rb.shoulder.act.rotation, { z: 0.9, duration: 0.4, ease: 'back.out(2)' }, 6.0);
    A.to(rb.head.act.rotation, { z: -0.25, duration: 0.4 }, 6.0);
    for (let k = 0; k < 6; k++) A.sfx('tick', 6.4 + k * 0.5, { vol: 0.1 });
    A.sfx('vanish', 7.2, { vol: 0.12 });
    A.sfx('clink', 9.2);
    A.sfx('fanfare', 10.3, { short: true, vol: 0.12 });
    A.loop(cat.tail.idle.rotation, { z: -0.25 }, { z: 0.2 }, 1.1);
    A.loop(cat.grin.scale, { x: 1, y: 1 }, { x: 1.15, y: 1.15 }, 0.8, 7.0);
    A.to(ht.elbow.act.rotation, { z: 0.8, duration: 0.4, ease: 'back.out(2)' }, 9.0);
    A.loop(ht.hat.idle.rotation, { z: -0.06 }, { z: 0.06 }, 0.6, 9.4);
    A.to(qn.shoulder.act.rotation, { z: 1.3, duration: 0.4, ease: 'back.out(2)' }, 10.4);
    A.loop(qn.head.idle.rotation, { z: -0.03 }, { z: 0.06 }, 1.5);
    return { root };
  },

  roles(main, A) {
    const { root, world } = stage(main);
    ground(world);
    A.plants(world, [[-5.6, 0.9, -0.3], [-1.6, 0.6, 0.3], [1.6, 0.6, 0.3], [5.6, 0.9, -0.3]], 110);
    const props = [cast.crown, cast.tallHat, cast.bunnyEars];
    [-3.4, 0, 3.4].forEach((x, i) => {
      const a = cast.adult(world, x, { hat: false, coat: C.grey, coatLit: C.greyLit, hair: i === 1 ? 0x6a5a4a : C.hairDark });
      A.loop(a.body.idle.rotation, { z: -0.012 }, { z: 0.012 }, 2.1 + i * 0.3);
      const p = props[i](a.hat.act);
      p.position.x = -0.05;
      A.fromTo(p.position, { y: 6 }, { y: 0, duration: 0.9, ease: 'bounce.out' }, 2.6 + i * 1.1);
      A.sfx('whoosh', 2.4 + i * 1.1, { dur: 0.4, vol: 0.15, from: 2000, to: 500 });
      [[0.33, 0.5], [0.67, 0.25], [0.85, 0.12]].forEach(([d, v]) => A.sfx(i === 0 ? 'clink' : 'thud', 2.6 + i * 1.1 + d * 0.9, { vol: v }));
      A.sfx('boing', 7.6 + i * 0.2, { dur: 0.3, vol: 0.12 });
      A.to(a.head.act.rotation, { z: 0.15, duration: 0.5, ease: 'back.out(2)' }, 7.6 + i * 0.2);
      A.to(a.body.act.scale, { y: 1.04, duration: 0.5, ease: 'back.out(2)' }, 7.6 + i * 0.2);
    });
    return { root };
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

    // 右頁插圖：Alice 抬頭看著一個問號
    const il = illustration(flip.front, R.illus[0], { viewH: 5.4, groundFrom: 0.6 });
    ground(il.world, 9);
    clump(il.world, -3.0, 125, 0.7, 0.2);
    clump(il.world, 3.0, 126, 0.8, 0.2);
    const alice = cast.girl(il.world, -1.2);
    A.to(alice.head.act.rotation, { z: 0.4, duration: 0.8, ease: 'power2.inOut' }, 3.0);
    A.loop(alice.body.idle.rotation, { z: -0.01 }, { z: 0.01 }, 2.0);
    questionMarks(il.world, A, [1.0], 2.0, 6.0);

    // 翻過去的新一頁：戴著皇冠、高帽、兔耳的大人們，頭上冒出問號（「我們是不是也成了那些大人？」）
    const il2 = illustration(flip.back, back.illus[0], { viewH: 5.4, groundFrom: 0.5 });
    ground(il2.world, 10);
    clump(il2.world, -3.4, 127, 0.6, 0.2);
    clump(il2.world, 3.4, 128, 0.6, 0.2);
    const crowd = new THREE.Group();
    crowd.scale.setScalar(0.95);
    il2.world.add(crowd);
    const props = [cast.crown, cast.tallHat, cast.bunnyEars];
    [-2.2, 0, 2.2].forEach((x, i) => {
      const a = cast.adult(crowd, x, { hat: false, flip: i === 2, coat: C.grey, coatLit: C.greyLit, hair: i === 1 ? 0x6a5a4a : C.hairDark });
      props[i](a.hat.act).position.x = -0.05;
      A.loop(a.body.idle.rotation, { z: -0.012 }, { z: 0.012 }, 2.1 + i * 0.3);
      A.to(a.head.act.rotation, { z: [0.18, -0.12, 0.18][i], duration: 0.6, ease: 'power2.inOut' }, 17.2 + i * 0.15);
    });
    questionMarks(il2.world, A, [-1.1, 1.1], 3.7, 16.2, 0.55);
    [16.2, 16.75].forEach((s, i) => A.sfx('pop', s, { pitch: 0.9 + i * 0.2 }));

    A.fromTo(book.root.position, { y: -0.7 }, { y: 0, duration: 1.3, ease: 'power3.out' }, 0);
    A.to(book.root.scale, { x: 1.05, y: 1.05, duration: A.D - 6.5, ease: 'sine.inOut' }, 1.5);
    // 在「Which leaves a question:」翻頁，最後一句時新的一頁已經攤開
    turnPage(A, flip, 13.3, 2.0);
    A.sfx('whoosh', 0, { dur: 1.1, vol: 0.25 });
    A.sfx('thud', 1.0, { vol: 0.35, pitch: 0.8 });
    A.sfx('pop', 6.0, { pitch: 1.2 });
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
