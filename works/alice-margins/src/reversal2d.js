// 第八幕大人和孩子位置顛倒的兩張書頁插圖（2D 紙偶，書頁版：透明底、墨色地平線、淡投影）：
// lectureScene：翻頁前左頁，皇后搖著手指說教、瘋帽客坐在椅子上猛點頭，中間掛著一張道德詩卷軸。
// askScene：翻頁後新的左頁，Alice 舉手發問、托腮、抱胸、舉指說理，頭上一個個冒出問號；右邊的皇后和帽客反而答不出來。
// 素材沿用 queen-parts/、hatter-parts/、props5/chair、girl-parts/alice7/（pose-raise、think、cross、explain 是本幕另外生成的）。
// draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。翻頁在 8.0–9.7 秒，askScene 的動作從 10 秒開始。
import { ease, key, canvas2d, loadImg } from './boat2d.js';

const SHADOW = 'rgba(70,40,20,0.38)';
const INK = '#3a2a20', GOLD = '#b8862e';
const backOut = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const backIn = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 1.7; return (c + 1) * x ** 3 - c * x ** 2; };

// 共用：載入皇后、帽客、Alice 的部件，提供畫各個紙偶的函式（第九幕也用，舞台版投影比較深）
export function puppets(base, shadowColor = SHADOW) {
  const qp = {}, hp = {}, ap = {}, pr = {}, QR = {}, HR = {}, AR = {};
  const load = (dir, obj, names) => names.map(async (n) => { obj[n] = await loadImg(`${base}${dir}/${n}.webp`); });
  const QH = ['stern', 'glare', 'side', 'shout', 'scowl', 'wince'], HH = ['talk', 'laugh', 'grin', 'blink', 'oh', 'sip'];
  const AP = ['ref', 'head-neutral', 'head-puzzled', 'head-surprised', 'head-blink', 'pose-raise', 'pose-think', 'pose-cross', 'pose-explain'];
  const ready = Promise.all([
    ...load('queen-parts', qp, ['base', 'arm', 'crown-front', ...QH.map((h) => 'head-' + h)]),
    ...load('hatter-parts', hp, ['base', ...HH.map((h) => 'head-' + h)]),
    ...load('girl-parts/alice7', ap, AP),
    ...load('props5', pr, ['chair']),
    fetch(`${base}queen-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(QR, j)),
    fetch(`${base}hatter-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(HR, j)),
    fetch(`${base}girl-parts/alice7/rig.json`).then((r) => r.json()).then((j) => Object.assign(AR, j)),
  ]);
  const shadow = (ctx, k) => {
    ctx.shadowColor = shadowColor; ctx.shadowBlur = 10 * k; ctx.shadowOffsetX = 3.5 * k; ctx.shadowOffsetY = 5 * k;
  };
  // 替換頭：rig 給左上角、縮放、旋轉；nod 是額外繞頸部的點頭角度
  const head = (ctx, im, o, nod = 0) => {
    const w = im.width * o.s, h = im.height * o.s;
    ctx.save();
    ctx.translate(o.x + w / 2, o.y + h * 0.85); ctx.rotate(((o.rot || 0) + nod) * Math.PI / 180);
    ctx.drawImage(im, -w / 2, -h * 0.85, w, h);
    ctx.restore();
  };

  // 皇后：腳底中心在 (x, line)；arm 是手臂角度（0 是伸手指人，68 是放下）
  const QM = 120, qc = canvas2d(674 + QM * 2, 613 + QM), qg = qc.getContext('2d');
  function queen(g, x, line, s, flip, face, arm, lean = 0) {
    qg.setTransform(1, 0, 0, 1, 0, 0); qg.clearRect(0, 0, qc.width, qc.height); qg.translate(QM, QM);
    const [sx, sy] = QR.shoulder;
    qg.save(); qg.translate(sx, sy); qg.rotate(arm * Math.PI / 180); qg.translate(-sx, -sy); qg.drawImage(qp.arm, 0, 0); qg.restore();
    qg.drawImage(qp.base, 0, 0);
    head(qg, qp['head-' + face], QR.heads[face]);
    qg.drawImage(qp['crown-front'], 0, 0);
    g.save(); shadow(g, 1);
    g.translate(x, line); g.scale(flip ? -s : s, s); g.rotate(lean * Math.PI / 180);
    g.drawImage(qc, -330 - QM, -613 - QM);
    g.restore();
  }
  // 帽客坐在椅子上：臀部在 (x, line - 座高)；flip 時朝左
  const HM = 40, hc = canvas2d(502 + HM * 2, 773 + HM * 2), hg = hc.getContext('2d');
  function hatter(g, x, line, s, flip, face, nod = 0, bounce = 0) {
    const cs = s * 1.426, seat = 206 * s;
    g.save(); shadow(g, 1);
    g.translate(x, line); g.scale(flip ? -1 : 1, 1);
    g.drawImage(pr.chair, -120 * cs, -pr.chair.height * cs, pr.chair.width * cs, pr.chair.height * cs);
    g.restore();
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, hc.width, hc.height); hg.translate(HM, HM);
    hg.drawImage(hp.base, 0, 0);
    head(hg, hp['head-' + face], HR.heads[face], nod);
    g.save(); shadow(g, 1);
    g.translate(x, line - seat - bounce); g.scale(flip ? -s : s, s);
    g.drawImage(hc, -200 - HM, -575 - HM);
    g.restore();
  }
  // Alice：腳底中心在 (x, line)；f 是頭（neutral／puzzled…）或 pose:姿勢；look 是頭額外轉的角度（負的是抬頭）
  const AM = 40, ac = canvas2d(700 + AM * 2, 1420 + AM * 2), agc = ac.getContext('2d');
  function alice(g, x, line, s, f, pop = 1, look = 0) {
    agc.setTransform(1, 0, 0, 1, 0, 0); agc.clearRect(0, 0, ac.width, ac.height);
    let foot = AR.foot;
    if (f.startsWith('pose:')) {
      const p = f.slice(5), o = AR.poses[p];
      foot = o.foot * o.s;
      agc.translate(AM, AM + AR.bottom - o.bottom * o.s); agc.scale(o.s, o.s); agc.drawImage(ap['pose-' + p], 0, 0);
    } else {
      agc.translate(AM, AM); agc.drawImage(ap.ref, 0, 0);
      const o = AR.heads[f], hi = ap['head-' + f];
      agc.save(); agc.translate(o.cx, o.cy); agc.rotate(((o.rot || 0) + look) * Math.PI / 180); agc.scale(o.s, o.s);
      agc.drawImage(hi, -hi.width / 2, -hi.height / 2); agc.restore();
    }
    g.save(); shadow(g, 1);
    g.translate(x, line); g.scale(s * pop, s * (2 - pop));
    g.drawImage(ac, -foot - AM, -AR.bottom - AM);
    g.restore();
  }
  return { ready, queen, hatter, alice, AR };
}

// 兩張插圖共用的書頁畫布：墨色地平線、左右兩端淡出
export function pageCanvas(w, h) {
  const cv = canvas2d(w, h), g = cv.getContext('2d');
  return {
    cv, g,
    begin() { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); },
    line(y) { g.fillStyle = 'rgba(70,45,30,0.55)'; g.fillRect(60, y, w - 120, 2.5); },
    end() {
      const m = g.createLinearGradient(0, 0, w, 0);
      m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.06, '#000'); m.addColorStop(0.94, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.save(); g.globalCompositeOperation = 'destination-in'; g.fillStyle = m; g.fillRect(0, 0, w, h); g.restore();
    },
  };
}
// 問號：Georgia 斜體，彈出、浮動、搖擺；t1 之後縮掉
export function qmark(g, t, t0, x, y, size, color, t1 = Infinity) {
  if (t < t0 || t > t1 + 0.3) return;
  const k = t < t1 ? backOut((t - t0) / 0.3) : 1 - backIn((t - t1) / 0.3);
  if (k <= 0) return;
  g.save(); g.font = `italic 700 ${size}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.translate(x, y + 5 * Math.sin(t * 3 + x)); g.rotate((8 * Math.sin(t * 2.4 + x * 0.01)) * Math.PI / 180); g.scale(k, k);
  g.shadowColor = SHADOW; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 3;
  g.fillStyle = color; g.fillText('?', 0, 0);
  g.restore();
}

// ── 插圖 A：大人說教 ──
export function lectureScene({ base = './art/', w = 1160, h = 630 } = {}) {
  const P = puppets(base), pc = pageCanvas(w, h), g = pc.g, LINE = h - 70;
  const QFACE = [[0, 1.0, 'stern'], [1.0, 3.2, 'yell'], [3.2, 4.0, 'glare'], [4.0, 6.4, 'yell'], [6.4, 7.0, 'scowl'], [7.0, 99, 'yell']];
  // 道德詩卷軸：慢慢垂下來，上面是卡羅戲仿的那首詩的原句
  function scroll(t) {
    const drop = key(t, [[0.6, -200], [1.2, 0]]), open = ease((t - 1.0) / 1.0);
    const cx = w / 2 + 10, top = 40 + drop + 3 * Math.sin(t * 1.6), sw = 330, sh = 120 * open;
    g.save(); g.shadowColor = SHADOW; g.shadowBlur = 8; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
    g.translate(cx, top); g.rotate(0.8 * Math.sin(t * 1.3) * Math.PI / 180);
    if (sh > 1) {
      g.fillStyle = '#efe2c2'; g.fillRect(-sw / 2 + 10, 0, sw - 20, sh);
      g.shadowColor = 'transparent';
      g.save(); g.beginPath(); g.rect(-sw / 2, 0, sw, sh); g.clip();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK;
      g.font = 'italic 600 26px Georgia, serif'; g.fillText('How doth the little', 0, 40);
      g.font = 'italic 700 26px Georgia, serif'; g.fillStyle = '#8e2a22'; g.fillText('busy bee…', 0, 78);
      g.restore();
    }
    g.shadowColor = SHADOW;
    g.fillStyle = '#7a4a2a'; g.fillRect(-sw / 2 - 6, -6, sw + 12, 12); g.fillRect(-sw / 2 - 6, sh - 2, sw + 12, 12);
    g.restore();
  }
  function draw(t) {
    const tq = Math.floor(t * 12) / 12;
    pc.begin(); pc.line(LINE);
    scroll(tq);
    // 皇后：1 秒伸出手指，之後手指一直搖
    let f = (QFACE.find(([a, b]) => tq >= a && tq < b) || [0, 0, 'glare'])[2];
    if (f === 'yell') f = Math.floor(tq * 6) % 2 ? 'shout' : 'glare';
    const arm = (tq < 1.0 ? 68 : 68 * (1 - backOut((tq - 1.0) / 0.4))) + (tq > 1.4 ? 9 * Math.sin(tq * 9) : 0);
    P.queen(g, 260, LINE, 0.66, false, f, arm, -2 + 1.5 * Math.sin(tq * 2));
    // 帽客：一邊附和一邊猛點頭
    const hf = Math.floor(tq * 4) % 3 === 0 ? 'grin' : Math.floor(tq * 6) % 2 ? 'talk' : 'laugh';
    const nod = tq > 1.2 ? 9 * Math.max(0, Math.sin(tq * 8)) : 0;
    P.hatter(g, 900, LINE, 0.52, true, hf, nod, tq > 1.2 ? 4 * Math.abs(Math.sin(tq * 8)) : 0);
    pc.end();
    return pc.cv;
  }
  return { ready: P.ready, draw, canvas: pc.cv };
}

// ── 插圖 B：Alice 發問 ──
export function askScene({ base = './art/', w = 1160, h = 660, t0 = 10 } = {}) {
  const P = puppets(base), pc = pageCanvas(w, h), g = pc.g, LINE = h - 70;
  // Alice 的姿勢（本幕秒數）
  const AF = [[0, 10.2, 'neutral'], [10.2, 14.4, 'pose:raise'], [14.4, 17.2, 'pose:think'], [17.2, 20.0, 'pose:cross'],
    [20.0, 22.6, 'pose:explain'], [22.6, 99, 'pose:raise']];
  const POPS = [10.2, 14.4, 17.2, 20.0, 22.6];
  const ALICE_S = 0.25;                 // Alice 和皇后差不多高（皇后連皇冠）
  function draw(t) {
    const tq = Math.floor(t * 12) / 12;
    pc.begin(); pc.line(LINE);
    const f = (AF.find(([a, b]) => tq >= a && tq < b) || [0, 0, 'neutral'])[2];
    // 換姿勢時紙偶壓扁一下再彈回來
    const since = Math.min(...POPS.map((p) => (tq >= p ? tq - p : 99)));
    const pop = since < 0.3 ? 1 + 0.06 * Math.sin(since / 0.3 * Math.PI) : 1;
    P.alice(g, 250, LINE, ALICE_S, f, pop);
    // Alice 頭上的問號，一個比一個高
    const hx = 250, hy = LINE - P.AR.bottom * ALICE_S;
    qmark(g, tq, 11.0, hx + 80, hy - 20, 56, INK);
    qmark(g, tq, 11.7, hx + 140, hy - 70, 68, GOLD);
    qmark(g, tq, 12.4, hx + 205, hy - 30, 78, INK);
    // 右邊的大人：一開始還在說教，被問住之後愣住、互看
    const stuck = tq >= 17.2;
    let qf = stuck ? (tq < 20 ? 'wince' : 'side') : (Math.floor(tq * 6) % 2 ? 'shout' : 'glare');
    if (tq < t0) qf = 'stern';
    const arm = stuck ? 68 * backOut((tq - 17.2) / 0.4) : 0;
    P.queen(g, 1000, LINE, 0.56, true, qf, Math.min(68, arm), stuck ? 3 : 0);
    const hf = stuck ? (tq < 20 ? 'oh' : 'blink') : 'talk';
    P.hatter(g, 650, LINE, 0.46, true, hf === 'blink' && Math.floor(tq * 2) % 3 ? 'oh' : hf);
    qmark(g, tq, 20.6, 1000 - 40, LINE - 400, 60, GOLD);
    qmark(g, tq, 21.1, 650 + 70, LINE - 420, 54, INK);
    pc.end();
    return pc.cv;
  }
  return { ready: P.ready, draw, canvas: pc.cv };
}
