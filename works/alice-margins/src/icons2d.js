// 第九幕角色能走出原作的 2D 紙偶場景：開場四本書一本本掉下來疊高，上面的年份從 1865 翻到 2026；
// 書縮掉之後，白兔、柴郡貓、瘋帽客、紅心皇后依序從水平線彈出來，各做招牌動作（看懷錶、眨眼閃一下、舉杯大笑、伸手指人）；
// 口白講到「插畫、玩具、遊戲和電影」時，畫框、玩具兔、紅心皇后撲克牌、電影膠捲用細線從上方垂下來。
// 素材在 public/works/alice-margins/art/：rabbit-parts/（本幕用 gpt-image 生成的白兔四個全身姿勢，rig.json 是腳底位置）、
// props9/（書、畫框、玩具、撲克牌、膠捲）、cheshire-parts/、queen-parts/、hatter-parts/、props5/chair、props6/（植物）。
// draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';
import { puppets } from './reversal2d.js';

const W = 1920, H = 1080;
const LINE = 800;                       // 舞台水平線（和第一幕一樣）
const FIT = 0.72;                       // 整個舞台以水平線中點縮小，左右上下留出和第一幕一樣的空間
const SHADOW = 'rgba(12,6,8,0.55)';
const GOLD = '#e0c46e', CREAM = '#e6dcc6';

const backOut = (x, c = 2.2) => { x = Math.min(Math.max(x, 0), 1); return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const backIn = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 1.7; return (c + 1) * x ** 3 - c * x ** 2; };

// 開場：書掉下來的時間，年份換頁的時間（第一個年份 0.2 秒彈出），一起縮掉的時間
const BOOKS = [['book-red', 0.35], ['book-blue', 1.6], ['book-green', 2.3], ['book-plum', 3.0]];
const YEARS = [['1865', 0.2], ['1951', 1.6], ['2010', 2.3], ['2026', 3.0]];
const SINCE = 3.2, OUT = 4.05;

// 角色：x 是腳底（貓是身體中心）、登場時間
const RB = { x: 290, s: 0.36, t: 4.6 };
const CAT = { x: 720, s: 0.55, t: 6.1 };
const HT = { x: 1180, s: 0.62, t: 7.6 };
const QN = { x: 1620, s: 0.76, t: 9.1 };
// 招牌動作
const RB_WATCH = 6.0, RB_BLINK = [[7.0, 7.15], [8.6, 8.75], [11.2, 11.35], [14.0, 14.15], [19.2, 19.35]];
const RB_RUN = [[17.4, 18.6]];          // 原地小跑步，又停下來看錶
const CAT_FLICKER = 7.2;                // 閃一下差點消失
const CAT_WINK = [[7.6, 8.4], [15.0, 15.5]];
const HT_TOAST = 9.0;
const QN_POINT = 10.4;
// 垂下來的道具：[素材, 掛在哪個角色上方的 x, 時間, 高度]（口白「插畫、玩具、遊戲和電影」）
const HANG = [['frame', RB.x + 20, 15.6, 270], ['toy', CAT.x, 16.4, 220], ['card', QN.x - 40, 17.2, 270], ['reel', HT.x + 30, 18.0, 190]];

const RABBIT = ['stand', 'watch', 'blink', 'run'];
const CATP = ['base', 'tail-low', 'head', 'head-smug', 'head-wide', 'head-wink'];
const PROPS = ['book-red', 'book-blue', 'book-green', 'book-plum', 'frame', 'toy', 'card', 'reel'];
const PLANTS = ['grass', 'fern', 'bell', 'mush1', 'mush2', 'sprig', 'bush-ol', 'stone1', 'stone2'];

export function iconsScene({ base = './art/' } = {}) {
  const rp = {}, cp = {}, pr = {}, pl = {}, RIG = {};
  const P = puppets(base, SHADOW);
  const ready = Promise.all([
    P.ready,
    ...RABBIT.map(async (n) => { rp[n] = await loadImg(`${base}rabbit-parts/${n}.webp`); }),
    ...CATP.map(async (n) => { cp[n] = await loadImg(`${base}cheshire-parts/${n}.webp`); }),
    ...PROPS.map(async (n) => { pr[n] = await loadImg(`${base}props9/${n}.webp`); }),
    ...PLANTS.map(async (n) => { pl[n] = await loadImg(`${base}props6/${n}.webp`); }),
    fetch(`${base}rabbit-parts/rig.json`).then((r) => r.json()).then((j) => { RIG.rabbit = j; }),
    fetch(`${base}cheshire-parts/rig.json`).then((r) => r.json()).then((j) => { RIG.cat = j; }),
  ]);

  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const paper = paperCanvas(W, H);
  const shadow = (ctx, k) => {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  };
  const inside = (t, list) => list.some(([a, b]) => t >= a && t < b);

  // 登場：從水平線往上彈出來（先瘦高再壓扁），回傳 [sx, sy]；還沒登場回傳 null
  function popIn(t, t0) {
    if (t < t0) return null;
    const u = (t - t0) / 0.5;
    if (u >= 1.4) return [1, 1];
    const y = backOut(u, 2.6), x = u < 1 ? 0.75 + 0.25 * backOut(u * 1.2, 3) : 1;
    const squash = u > 1 && u < 1.4 ? 0.05 * Math.sin((u - 1) / 0.4 * Math.PI) : 0;
    return [x + squash, Math.max(0.001, y - squash)];
  }

  // 植物：水平切條，越高偏移越多（風吹）；登場時跟著長出來
  function plant(t, n, x, s, phase, t0) {
    const grow = t0 == null ? 1 : backOut((t - t0) / 0.5);
    if (grow <= 0) return;
    const im = pl[n], h = im.height, step = 3;
    g.save(); shadow(g, 0.7);
    g.translate(x + im.width * s / 2, LINE + 6); g.scale(1, grow); g.translate(-x - im.width * s / 2, -LINE - 6);
    for (let y = 0; y < h; y += step) {
      const k = Math.pow(1 - y / h, 2);
      const dx = k * 6 * Math.sin(t * 1.5 + phase) + k * 2 * Math.sin(t * 3.7 + phase * 2);
      g.drawImage(im, 0, y, im.width, step, x + dx, LINE + 6 - (h - y) * s, im.width * s, step * s + 0.6);
    }
    g.restore();
  }

  // ── 開場：書一本本掉下來疊高，年份翻頁 ──
  function intro(t) {
    if (t > OUT + 0.5) return;
    const k = t < OUT ? 1 : 1 - backIn((t - OUT) / 0.45);
    if (k <= 0) return;
    g.save(); g.translate(W / 2, LINE); g.scale(k, k); g.translate(-W / 2, -LINE);
    const bs = 0.52;
    let top = LINE;
    BOOKS.forEach(([n, t0], i) => {
      if (t < t0) return;
      const im = pr[n], bw = im.width * bs, bh = im.height * bs;
      const y = top - bh;
      const fall = key(t, [[t0, -520], [t0 + 0.42, 0]]);
      const bounce = t > t0 + 0.42 && t < t0 + 0.7 ? -14 * Math.sin((t - t0 - 0.42) / 0.28 * Math.PI) : 0;
      const dx = [0, 18, -14, 10][i], rot = [0, -1.5, 2, -1][i];
      g.save(); shadow(g, 0.8);
      g.translate(W / 2 + dx, y + bh / 2 + fall + bounce); g.rotate(rot * Math.PI / 180);
      g.drawImage(im, -bw / 2, -bh / 2, bw, bh);
      g.restore();
      top = y + 4;
    });
    // 年份：換頁時壓扁再彈回來
    let yi = -1;
    YEARS.forEach(([, t0], i) => { if (t >= t0) yi = i; });
    if (yi >= 0) {
      const [y, t0] = YEARS[yi];
      const sy = yi === 0 ? backOut((t - t0) / 0.5) : 0.55 + 0.45 * backOut((t - t0) / 0.25, 3);
      g.save(); shadow(g, 0.6);
      g.translate(W / 2, LINE - 470); g.scale(yi === 0 ? sy : 1, sy);
      g.font = '700 170px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = yi === YEARS.length - 1 ? GOLD : CREAM; g.fillText(y, 0, 0);
      g.restore();
    }
    if (t >= SINCE) {
      const s = backOut((t - SINCE) / 0.5);
      g.save(); g.translate(W / 2, LINE - 345); g.scale(s, s);
      g.font = 'italic 600 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = GOLD; g.fillText('160 years & counting', 0, 0);
      g.fillRect(-470, -2, 90, 4); g.fillRect(380, -2, 90, 4);
      g.restore();
    }
    g.restore();
  }

  // ── 白兔：整個換成站、看錶、眨眼、趕路的全身姿勢，腳底固定 ──
  function rabbit(t) {
    const pop = popIn(t, RB.t);
    if (!pop) return;
    let p = t < RB_WATCH ? 'stand' : inside(t, RB_BLINK) ? 'blink' : 'watch';
    const running = inside(t, RB_RUN);
    if (running) p = 'run';
    const o = RIG.rabbit[p], im = rp[p];
    const hop = running ? Math.abs(Math.sin((t - RB_RUN[0][0]) * Math.PI * 5)) * 22 : 0;
    // 看錶時嚇一跳往上彈一下
    const jolt = t >= RB_WATCH && t < RB_WATCH + 0.3 ? 30 * Math.sin((t - RB_WATCH) / 0.3 * Math.PI) : 0;
    const sway = (running ? 6 : 0) + 1.2 * Math.sin(t * 1.7);
    g.save(); shadow(g, 1);
    g.translate(RB.x, LINE - hop - jolt); g.rotate(sway * Math.PI / 180);
    g.scale(RB.s * pop[0], RB.s * pop[1] * (1 + 0.006 * Math.sin(t * 2.3)));
    g.drawImage(im, -o.foot, -o.bottom);
    g.restore();
  }

  // ── 柴郡貓：趴在地上，尾巴以接縫為軸晃；7.2 秒閃一下差點消失，之後眨眼 ──
  const M = 40, ccv = canvas2d(900 + M * 2, 560 + M * 2), cg = ccv.getContext('2d');
  function overlay(ctx, im, o) {
    ctx.save(); ctx.translate(o.cx, o.cy); ctx.rotate((o.rot || 0) * Math.PI / 180); ctx.scale(o.s, o.s);
    ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore();
  }
  function cat(t) {
    const pop = popIn(t, CAT.t);
    if (!pop) return;
    const rig = RIG.cat, cw = rig.w, ch = rig.h;
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, ccv.width, ccv.height); cg.translate(M, M);
    const tl = rig.tail, [px, py] = tl.pivot, sw = 9 * Math.sin(t * 2.2) + 3 * Math.sin(t * 4.7);
    cg.save(); cg.translate(px, py); cg.rotate(sw * Math.PI / 180); cg.translate(-px, -py); cg.drawImage(cp['tail-low'], tl.x, tl.y); cg.restore();
    cg.drawImage(cp.base, 0, 0);
    const f = inside(t, CAT_WINK) ? 'wink' : t >= CAT_FLICKER && t < CAT_FLICKER + 0.4 ? 'wide' : 'smug';
    overlay(cg, cp['head-' + f], rig.heads[f]);
    // 閃一下：透明度掉下去又回來
    const fl = t >= CAT_FLICKER && t < CAT_FLICKER + 0.6 ? Math.sin((t - CAT_FLICKER) / 0.6 * Math.PI) : 0;
    const breathe = 1 + 0.015 * Math.sin(t * 2);
    g.save(); shadow(g, 0.9 * (1 - fl * 0.8)); g.globalAlpha = 1 - 0.8 * fl;
    g.translate(CAT.x, LINE + 4); g.scale(CAT.s * pop[0], CAT.s * pop[1] * breathe);
    g.drawImage(ccv, -cw / 2 - M, -ch - M);
    g.restore();
  }

  // ── 瘋帽客：坐在椅子上，9 秒舉杯喝一口，接著仰頭大笑、在椅子上彈 ──
  function hatter(t) {
    const pop = popIn(t, HT.t);
    if (!pop) return;
    let f = 'grin', nod = 0, bounce = 0;
    if (t >= HT_TOAST && t < HT_TOAST + 0.8) { f = 'sip'; bounce = 18 * backOut((t - HT_TOAST) / 0.3); }
    else if (t >= HT_TOAST + 0.8 && t < HT_TOAST + 3.2) {
      f = Math.floor(t * 6) % 2 ? 'laugh' : 'talk';
      bounce = 10 * Math.abs(Math.sin(t * 9)); nod = -6 * Math.abs(Math.sin(t * 9));
    } else if (t >= HT_TOAST + 3.2) {
      f = Math.floor(t * 0.7) % 4 === 3 ? 'blink' : 'grin'; nod = 3 * Math.sin(t * 2);
    }
    g.save(); g.translate(HT.x, LINE); g.scale(pop[0], pop[1]); g.translate(-HT.x, -LINE);
    P.hatter(g, HT.x, LINE, HT.s, false, f, nod, bounce);
    g.restore();
  }

  // ── 紅心皇后：面向左，10.4 秒伸手指人、大吼，之後手指一直搖 ──
  function queen(t) {
    const pop = popIn(t, QN.t);
    if (!pop) return;
    let f = 'stern', arm = 68;
    if (t >= QN_POINT) {
      arm = 68 * (1 - backOut((t - QN_POINT) / 0.4)) + (t > QN_POINT + 0.5 ? 8 * Math.sin(t * 8) : 0);
      f = t < QN_POINT + 2.4 ? (Math.floor(t * 6) % 2 ? 'shout' : 'glare') : Math.floor(t * 0.8) % 3 === 0 ? 'scowl' : 'glare';
    }
    g.save(); g.translate(QN.x, LINE); g.scale(pop[0], pop[1]); g.translate(-QN.x, -LINE);
    P.queen(g, QN.x, LINE, QN.s, true, f, arm, -1.5 + 1.5 * Math.sin(t * 1.8));
    g.restore();
  }

  // ── 從上方用細線垂下來的道具，彈一下之後輕輕擺 ──
  function hangs(t) {
    HANG.forEach(([n, x, t0, hgt], i) => {
      if (t < t0) return;
      const im = pr[n], s = hgt / im.height, iw = im.width * s;
      const cy = LINE - 640 + (i % 2) * 30;
      const drop = key(t, [[t0, -700], [t0 + 0.5, 0]]);
      const settle = t > t0 + 0.5 ? 18 * Math.exp(-(t - t0 - 0.5) * 5) * Math.sin((t - t0 - 0.5) * 18) : 0;
      const swing = (5 * Math.exp(-(t - t0) * 0.8) + 2) * Math.sin((t - t0) * 2.2 + i);
      const top = -H;                         // 線從畫面最上面垂下來
      g.save(); g.translate(x, cy + drop + settle - hgt / 2); g.rotate(swing * Math.PI / 180);
      g.strokeStyle = 'rgba(230,220,198,0.55)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-iw * 0.25, 0); g.lineTo(-iw * 0.25, top); g.moveTo(iw * 0.25, 0); g.lineTo(iw * 0.25, top); g.stroke();
      shadow(g, 0.8);
      g.drawImage(im, -iw / 2, 0, iw, hgt);
      g.restore();
    });
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(paper, 0, 0);
    const z = 1 + 0.035 * ease(t / 21);   // 鏡頭慢慢推近
    g.setTransform(z, 0, 0, z, W / 2 * (1 - z), LINE * (1 - z) * 0.9);
    g.fillStyle = 'rgba(18,10,12,0.55)';
    g.fillRect(200, LINE, 1520, 3);       // 舞台水平線（和第一幕同長）
    g.translate(W / 2, LINE); g.scale(FIT, FIT); g.translate(-W / 2, -LINE);

    intro(tq);
    // 每個角色登場時腳邊長出植物
    plant(t, 'grass', RB.x - 210, 0.5, 0.4, RB.t + 0.1);
    plant(t, 'fern', CAT.x - 330, 0.45, 1.2, CAT.t + 0.1);
    plant(t, 'mush1', CAT.x + 250, 0.5, 2.0, CAT.t + 0.2);
    plant(t, 'bell', HT.x - 200, 0.5, 2.6, HT.t + 0.1);
    plant(t, 'bush-ol', QN.x + 220, 0.5, 3.1, QN.t + 0.1);
    rabbit(tq);
    cat(tq);
    hatter(tq);
    queen(tq);
    plant(t, 'sprig', RB.x + 120, 0.45, 1.7, RB.t + 0.2);
    plant(t, 'stone1', HT.x + 260, 0.45, 0, HT.t + 0.2);
    plant(t, 'mush2', QN.x - 330, 0.45, 2.3, QN.t + 0.2);
    hangs(tq);
    return stage;
  }

  return { ready, draw, canvas: stage, loop: 21 };
}
