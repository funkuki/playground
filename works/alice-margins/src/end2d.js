// 最後一幕的兩張書頁插圖（2D 紙偶，書頁版：透明底、墨色地平線、淡投影，和第八幕同一套）：
// aliceScene：右頁 The End 下方，Alice 站著，3 秒抬頭，6 秒頭上冒出一個大問號慢慢往上浮，她托腮想。
// grownupScene：翻頁（13.3–15.3 秒）後的新一頁，同一個大人挺胸站著，頭飾皇冠、高帽、兔耳輪流換，
// 16.2 秒起頭上冒問號，19.5 秒停下來放下架子，頭上一個大問號（「我們是不是也成了那些大人？」）。
// 素材沿用 girl-parts/alice7/、adult-parts/。draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, loadImg } from './boat2d.js';
import { puppets, pageCanvas, qmark } from './reversal2d.js';

const INK = '#3a2a20', GOLD = '#b8862e', RED = '#9e2a26';
const SHADOW = 'rgba(70,40,20,0.38)';
const backOut = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

// ── 右頁：Alice 抬頭看著問號 ──
const LOOK = 3.0, Q = 6.0, THINK = 9.0;
export function aliceScene({ base = './art/', w = 1160, h = 780 } = {}) {
  const P = puppets(base), pc = pageCanvas(w, h), g = pc.g, LINE = h - 70;
  const S = 0.46, X = 400;
  function draw(t) {
    const tq = Math.floor(t * 12) / 12;
    pc.begin(); pc.line(LINE);
    // 抬頭：頭慢慢往上轉；冒問號時眨一下眼；之後托腮
    const look = -13 * ease((tq - LOOK) / 0.9);
    let f = tq < LOOK ? 'neutral' : 'puzzled';
    if (tq >= Q - 0.1 && tq < Q + 0.05) f = 'blink';
    if (tq >= THINK) f = 'pose:think';
    const pop = tq >= THINK && tq < THINK + 0.3 ? 1 + 0.06 * Math.sin((tq - THINK) / 0.3 * Math.PI) : 1;
    P.alice(g, X, LINE, S, f, pop, f.startsWith('pose:') ? 0 : look + 0.8 * Math.sin(tq * 1.7));
    // 大問號：在她前上方冒出來，越浮越高、越來越大
    const rise = Math.max(0, tq - Q);
    qmark(g, tq, Q, X + 300, LINE - 470 - rise * 10, 150 + rise * 4, RED);
    pc.end();
    return pc.cv;
  }
  return { ready: P.ready, draw, canvas: pc.cv };
}

// ── 翻過去的新一頁：同一個大人挺胸站著，頭上的頭飾一直換（皇冠、高帽、兔耳），頭上冒出問號 ──
const SWAPS = [[0, 'crown'], [16.0, 'tophat'], [16.7, 'ears'], [17.4, 'crown'], [18.1, 'tophat'], [18.8, 'ears']];
const HS = { crown: 0.34, tophat: 0.27, ears: 0.42 };
const PLAIN = 19.5;                     // 停下來，放下架子，頭上一個大問號
export function grownupScene({ base = './art/', w = 1160, h = 1200 } = {}) {
  const pc = pageCanvas(w, h), g = pc.g, LINE = h - 70;
  const ap = {}, RIG = {};
  const ready = Promise.all([
    ...['proud', 'stand', 'crown', 'tophat', 'ears'].map(async (n) => { ap[n] = await loadImg(`${base}adult-parts/${n}.webp`); }),
    fetch(`${base}adult-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(RIG, j)),
  ]);
  const S = 0.64, X = 560;
  function adult(t) {
    const p = t < PLAIN ? 'proud' : 'stand';
    const o = RIG.poses[p], im = ap[p];
    let hat = SWAPS[0][1], since = 99;
    SWAPS.forEach(([s, n]) => { if (t >= s) { hat = n; since = t - s; } });
    if (t >= PLAIN) since = Math.min(since, t - PLAIN);
    // 換頭飾時新的頭飾彈出來，人也被壓一下
    const k = since < 0.3 ? backOut(since / 0.3) : 1;
    const hit = since < 0.25 ? 0.04 * Math.sin(since / 0.25 * Math.PI) : 0;
    const sway = 0.8 * Math.sin(t * 1.6);
    g.save(); g.shadowColor = SHADOW; g.shadowBlur = 10; g.shadowOffsetX = 3.5; g.shadowOffsetY = 5;
    g.translate(X, LINE); g.rotate(sway * Math.PI / 180);
    g.scale(S * (1 + hit * 0.5), S * (1 - hit) * (1 + 0.006 * Math.sin(t * 2.1)));
    g.drawImage(im, -o.foot, -o.bottom);
    const hi = ap[hat], hr = RIG.hats[hat];
    g.translate(o.topx - o.foot, o.top + 58 - o.bottom); g.rotate((p === 'proud' ? -9 : 0) * Math.PI / 180); g.scale(HS[hat] * k, HS[hat] * k);
    g.drawImage(hi, -hi.width / 2, -hr.bottom);
    g.restore();
  }
  function draw(t) {
    const tq = Math.floor(t * 12) / 12;
    pc.begin(); pc.line(LINE);
    adult(tq);
    qmark(g, tq, 16.2, X - 230, LINE - 1000, 96, RED);
    qmark(g, tq, 16.75, X + 260, LINE - 1030, 84, INK);
    qmark(g, tq, PLAIN + 0.1, X + 250, LINE - 860, 130, GOLD);
    pc.end();
    return pc.cv;
  }
  return { ready, draw, canvas: pc.cv };
}
