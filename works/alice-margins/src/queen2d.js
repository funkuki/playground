// 第四幕紅心皇后的 2D 紙偶場景：皇后抬手指著三個撲克牌士兵，卷軸降下「Sentence first — verdict afterwards.」，
// 再指一次，士兵發抖。素材在 public/works/alice-margins/art/：queen-parts/、soldier-parts/（rig.json 是替換頭對照參考圖的位置）、
// props4/（從靜態構圖切下的玫瑰叢）、props3/（植物）。draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';

const W = 1920, H = 1080;
const LINE = 800;                       // 舞台水平線（和第一幕一樣）
// 整個舞台以水平線中點縮小，左右上下留出和第一幕一樣的空間，像紙偶在一條水平面上表演
const FIT = 0.62;
const SHADOW = 'rgba(12,6,8,0.55)';

const Q = { x: 330, s: 0.9 };           // 皇后參考圖（674×613）左上角與縮放
const S = { s: 0.72, xs: [1085, 1295, 1505], cards: ['ace-h', 'three-h', 'five-h'] };   // 三個士兵（參考圖 329×518）
const QHEADS = ['stern', 'glare', 'side', 'shout', 'scowl', 'wince'];
const SHEADS = ['neutral', 'oh', 'shout', 'wary'];

// 皇后的表情：[起, 迄, 頭]；'yell' 是 shout / glare 交替（大吼）
const QFACE = [[0, 1.2, 'stern'], [1.2, 2.6, 'yell'], [2.6, 5.6, 'glare'], [5.6, 7.0, 'scowl'], [7.0, 8.0, 'side'],
  [8.0, 8.6, 'wince'], [8.6, 10.6, 'yell'], [10.6, 13.5, 'glare'], [13.5, 14.2, 'wince'], [14.2, 17, 'scowl']];
const YELL = '110110011101101100111011';
// 士兵的表情：皇后第一次吼時嚇一跳，第二次吼時發抖
const SFACE = [[1.5, 2.6, 'oh'], [8.8, 11.5, 'wary'], [11.5, 12.2, 'oh'], [12.2, 17, 'wary']];
const TREMBLE = [8.9, 11.3];

const backOut = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 2.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

export function queenScene({ base = './art/' } = {}) {
  const qp = {}, sp = {}, pr = {};
  const QR = {}, SR = {};
  const load = (dir, obj, names) => names.map(async (n) => { obj[n] = await loadImg(`${base}${dir}/${n}.webp`); });
  const ready = Promise.all([
    ...load('queen-parts', qp, ['base', 'arm', 'crown-front', ...QHEADS.map((h) => 'head-' + h)]),
    ...load('soldier-parts', sp, ['base', 'banner', ...SHEADS.map((h) => 'head-' + h), ...S.cards.map((c) => 'card-' + c)]),
    ...load('props4', pr, ['roses-mid', 'roses-right']),
    ...load('props3', pr, ['bush', 'leaf4', 'tuft']),
    fetch(`${base}queen-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(QR, j)),
    fetch(`${base}soldier-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(SR, j)),
  ]);

  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const paper = paperCanvas(W, H);

  function shadow(ctx, k) {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  }
  // 植物：水平切條，越高偏移越多（風吹）
  function plant(t, im, x, yBottom, s, phase) {
    const h = im.height, step = 3;
    g.save(); shadow(g, 0.8);
    for (let y = 0; y < h; y += step) {
      const k = Math.pow(1 - y / h, 2);
      const dx = k * 6 * Math.sin(t * 1.5 + phase) + k * 2 * Math.sin(t * 3.7 + phase * 2);
      g.drawImage(im, 0, y, im.width, step, x + dx, yBottom - (h - y) * s, im.width * s, step * s + 0.6);
    }
    g.restore();
  }
  // 把替換頭畫到紙偶畫布上（可水平翻轉、可轉角度）
  function head(ctx, im, o) {
    const w = im.width * o.s, h = im.height * o.s;
    ctx.save();
    ctx.translate(o.x + w / 2, o.y + h / 2); ctx.rotate((o.rot || 0) * Math.PI / 180);
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // ── 皇后：底圖＋替換頭＋皇冠前緣＋指人的手臂（繞肩膀轉） ──
  const M = 120;
  const qc = canvas2d(674 + M * 2, 613 + M), qg = qc.getContext('2d');
  function drawQueen(t) {
    qg.setTransform(1, 0, 0, 1, 0, 0);
    qg.clearRect(0, 0, qc.width, qc.height);
    qg.translate(M, M);
    // 手臂：一開始垂著，1.2 秒抬起來指，5.6 秒放下一半，8.6 秒再猛地指
    const arm = (t < 5.6 ? 68 * (1 - backOut((t - 1.2) / 0.4))
      : t < 8.6 ? key(t, [[5.6, 0], [6.1, 28]])
      : 28 - 34 * backOut((t - 8.6) / 0.3)) + (t >= 1.6 ? 1.2 * Math.sin(t * 3.1) : 0);
    const [sx, sy] = QR.shoulder;
    qg.save(); qg.translate(sx, sy); qg.rotate(arm * Math.PI / 180); qg.translate(-sx, -sy);
    qg.drawImage(qp.arm, 0, 0);
    qg.restore();
    qg.drawImage(qp.base, 0, 0);
    let h = (QFACE.find(([a, b]) => t >= a && t < b) || [0, 0, 'glare'])[2];
    if (h === 'yell') h = YELL[Math.floor(t * 12) % YELL.length] === '1' ? 'shout' : 'glare';
    head(qg, qp['head-' + h], QR.heads[h]);
    qg.drawImage(qp['crown-front'], 0, 0);
    // 整個人以裙擺底部為準前傾、呼吸
    const lean = key(t, [[0, 0], [1.2, 0], [1.5, -2.5], [5.6, -2.5], [6.1, 0], [8.6, 0], [8.9, -4], [11, -3], [12, -1.5]]);
    const br = 1 + 0.007 * Math.sin(t * 2.0);
    const bx = Q.x + 330 * Q.s;
    g.save(); shadow(g, 1);
    g.translate(bx, LINE); g.rotate(lean * Math.PI / 180); g.scale(1, br);
    g.drawImage(qc, -bx + Q.x - M * Q.s, -(613 + M) * Q.s, qc.width * Q.s, qc.height * Q.s);
    g.restore();
  }

  // ── 士兵：底圖（去掉原本的頭）＋替換頭＋身上的牌 ──
  const sc = canvas2d(329 + 80, 518 + 60), sg = sc.getContext('2d');
  function drawSoldier(t, i) {
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, sc.width, sc.height);
    sg.translate(40, 60);
    sg.drawImage(sp.base, 0, 0);
    const f = (SFACE.find(([a, b]) => t >= a + i * 0.12 && t < b + i * 0.12) || [0, 0, 'neutral'])[2];
    head(sg, sp['head-' + f], SR.heads[f]);
    const c = SR.card, ci = sp['card-' + S.cards[i]];   // 身上的牌：對齊原本那張牌的外框
    sg.save(); sg.translate(c.cx, c.cy); sg.rotate(c.rot * Math.PI / 180);
    sg.drawImage(ci, -c.w / 2 + 2, -c.h / 2 + 2, c.w - 4, c.h - 4);
    sg.restore();
    // 嚇一跳往上彈；第二次吼時左右發抖
    const tj = t - 1.6 - i * 0.15;
    const jump = tj > 0 && tj < 0.4 ? Math.sin(tj / 0.4 * Math.PI) * 16 : 0;
    const shake = t > TREMBLE[0] && t < TREMBLE[1] + 4 ? 3.5 * (t < TREMBLE[1] ? 1 : 0.35) * Math.sin(t * 70 + i * 2) : 0;
    const sway = 0.8 * Math.sin(t * 1.9 + i * 1.3);
    const x = S.xs[i], s = S.s;
    g.save(); shadow(g, 0.9);
    g.translate(x + 165 * s + shake, LINE - jump); g.rotate(sway * Math.PI / 180);
    g.drawImage(sc, -(165 + 40) * s, -(518 + 60) * s, sc.width * s, sc.height * s);
    g.restore();
  }

  // ── 卷軸：從上方降下來，羊皮紙由上往下展開 ──
  function scroll(t) {
    if (t < 3.0) return;
    const drop = key(t, [[3.0, -260], [3.6, 0]]);
    const open = ease((t - 3.4) / 1.2);
    const cx = 1300, top = 175 + drop + 3 * Math.sin(t * 1.6), w = 540, h = 190 * open;
    g.save(); shadow(g, 1);
    g.translate(cx, top); g.rotate(0.6 * Math.sin(t * 1.3) * Math.PI / 180);
    if (h > 1) {
      g.fillStyle = '#ecdcb8';
      g.beginPath(); g.moveTo(-w / 2 + 14, 0); g.lineTo(w / 2 - 14, 0); g.lineTo(w / 2 - 14, h);
      for (let x = w / 2 - 14; x >= -w / 2 + 14; x -= 30) g.lineTo(x, h + (x / 30 % 2 ? 3 : -3));   // 下緣微微不平，像剪的
      g.closePath(); g.fill();
      g.shadowColor = 'transparent';
      g.save(); g.beginPath(); g.rect(-w / 2, 0, w, h); g.clip();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 600 46px Georgia, serif'; g.fillStyle = '#2a1d1a'; g.fillText('Sentence first —', 0, 62);
      g.font = 'italic 700 46px Georgia, serif'; g.fillStyle = '#9e2a26'; g.fillText('verdict afterwards.', 0, 132);
      g.restore();
      shadow(g, 1);
    }
    // 上下兩根木軸
    const rod = (y) => {
      g.fillStyle = '#7a4a2a'; g.fillRect(-w / 2 - 8, y - 9, w + 16, 18);
      g.fillStyle = '#c4a24c';
      g.beginPath(); g.arc(-w / 2 - 12, y, 12, 0, Math.PI * 2); g.arc(w / 2 + 12, y, 12, 0, Math.PI * 2); g.fill();
    };
    rod(0); rod(h + 6);
    g.restore();
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(paper, 0, 0);
    const z = 1 + 0.035 * ease(t / 17);   // 鏡頭慢慢推近
    g.setTransform(z, 0, 0, z, W / 2 * (1 - z), LINE * (1 - z) * 0.9);
    g.fillStyle = 'rgba(18,10,12,0.55)';
    g.fillRect(200, LINE, 1520, 3);       // 舞台水平線（和第一幕同長）
    g.translate(W / 2, LINE); g.scale(FIT, FIT); g.translate(-W / 2, -LINE);

    // 皇后身後插著的旗子，微微擺動
    const bn = sp.banner;
    g.save(); shadow(g, 0.9);
    g.translate(300, LINE); g.rotate((-4 + 1.5 * Math.sin(t * 1.4)) * Math.PI / 180);
    g.drawImage(bn, -bn.width * 0.85, -bn.height * 1.05, bn.width * 1.05, bn.height * 1.05);
    g.restore();
    plant(t, pr.bush, 235, LINE + 10, 0.85, 0.4);

    drawQueen(tq);
    for (let i = 0; i < 3; i++) drawSoldier(tq, i);
    scroll(t);

    plant(t, pr['roses-mid'], 935, LINE + 8, 0.95, 1.2);
    plant(t, pr.tuft, 1225, LINE + 6, 0.8, 2.2);
    plant(t, pr['roses-right'], 1660, LINE + 8, 0.95, 2.6);
    return stage;
  }

  return { ready, draw, canvas: stage };
}
