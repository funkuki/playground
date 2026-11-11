// 第六幕柴郡貓的 2D 紙偶場景：左邊 Alice 站在路標旁，右邊柴郡貓趴在樹枝上。Alice 問路，貓一開口，路標的兩塊箭頭板就繞著柱子轉圈
// （繞圈子的邏輯）；接著貓從尾巴開始一段段消失，只剩笑容，笑容最後也消失。
// 素材在 public/works/alice-margins/art/：cheshire-parts/（base 是去掉頭和下半截尾巴的參考圖，tail-low 是從參考圖切下的尾巴，
// rig.json 是替換頭、嘴巴的位置和尾巴的接縫）、
// girl-parts/alice-stand/（站姿 Alice，rig.json 是替換頭和姿勢的腳底位置）、props6/（樹、路標、植物）。全部是 gpt-image 生成後切開的。
// draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';

const W = 1920, H = 1080;
const LINE = 800;                       // 舞台水平線（和第一幕一樣）
// 整個舞台以水平線中點縮小，左右上下留出和第一幕一樣的空間
const FIT = 0.64;
const SHADOW = 'rgba(12,6,8,0.55)';

const AL = { x: 390, s: 0.38 };         // Alice 腳底的 x、縮放
const POST = { x: 684, s: 0.55 };       // 路標柱子中心
const PIN = [684, 452];                 // 箭頭板釘在柱子上的點（轉圈的軸心）
const BOARDS = [                        // 箭頭板：中心、縮放
  { n: 'this', x: 651, y: 448, s: 0.47, dir: 1 },
  { n: 'that', x: 740, y: 546, s: 0.475, dir: -1 },
];
const TREE = { x: 803, s: 0.69 };
const CAT = { x: 1068, y: 279, s: 0.56 };
const VANISH = [8.0, 8.4, 8.8, 9.2, 9.6];   // 尾巴、後腿、身體、前腳、頭依序消失
const GRIN_POP = 9.9, GRIN_OUT = 12.4;

// Alice：[起, 迄, 頭或姿勢]；'a/b' 表示兩顆頭交替（說話）
const AFACE = [[1.4, 2.3, 'puzzled'], [2.3, 3.0, 'up'], [3.0, 4.0, 'ask/up'], [4.0, 4.3, 'upeye'], [4.3, 5.1, 'puzzled'],
  [5.1, 5.25, 'blink'], [5.25, 6.9, 'puzzled'], [6.9, 12.6, 'pose:shade'], [12.6, 13.4, 'upeye'], [13.4, 14.9, 'pose:left'],
  [14.9, 15.05, 'blink'], [15.05, 16, 'puzzled']];
// 貓：頭的表情；嘴巴另外疊
const CFACE = [[0, 2.8, 'smug'], [2.8, 4.0, 'neutral'], [4.0, 6.0, 'smug'], [6.0, 6.6, 'wink'], [6.6, 7.4, 'smug'], [7.4, 8.0, 'wide']];
const CAT_TALK = [[4.1, 6.0], [6.6, 7.3]];
// Alice 困惑時頭上冒出的問號：[出現時間, 消失時間]，同一段裡一個接一個冒出來
const QMARKS = [[[1.5, 2.4]], [[4.5, 7.0], [4.9, 7.0], [5.3, 7.0]], [[13.6, 16], [14.1, 16]]];

const ALICE = ['ref', 'head-upeye', 'head-up', 'head-puzzled', 'head-ask', 'head-blink', 'head-smile', 'pose-shade', 'pose-left'];
const CATP = ['base', 'mouth', 'tail-low', 'head', 'head-smug', 'head-wide', 'head-wink'];
const PROPS = ['post', 'tree', 'this', 'that', 'mush1', 'mush2', 'mush3', 'bell', 'sprig', 'fern', 'grass', 'bush', 'bush-ol', 'bush-si',
  'stone1', 'stone2', 'stone3'];

export function cheshireScene({ base = './art/' } = {}) {
  const pr = {}, ap = {}, cp = {}, RIG = {};
  const ready = Promise.all([
    ...PROPS.map(async (n) => { pr[n] = await loadImg(`${base}props6/${n}.webp`); }),
    ...ALICE.map(async (n) => { ap[n] = await loadImg(`${base}girl-parts/alice-stand/${n}.webp`); }),
    ...CATP.map(async (n) => { cp[n] = await loadImg(`${base}cheshire-parts/${n}.webp`); }),
    fetch(`${base}girl-parts/alice-stand/rig.json`).then((r) => r.json()).then((j) => { RIG.alice = j; }),
    fetch(`${base}cheshire-parts/rig.json`).then((r) => r.json()).then((j) => { RIG.cat = j; }),
  ]);

  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const paper = paperCanvas(W, H);

  function shadow(ctx, k) {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  }
  // 道具紙片：x 是左邊、yBottom 是底邊
  function piece(n, x, yBottom, s) {
    const im = pr[n];
    g.save(); shadow(g, 1);
    g.drawImage(im, x, yBottom - im.height * s, im.width * s, im.height * s);
    g.restore();
  }
  // 植物：水平切條，越高偏移越多（風吹）
  function plant(t, n, x, yBottom, s, phase) {
    const im = pr[n], h = im.height, step = 3;
    g.save(); shadow(g, 0.8);
    for (let y = 0; y < h; y += step) {
      const k = Math.pow(1 - y / h, 2);
      const dx = k * 6 * Math.sin(t * 1.5 + phase) + k * 2 * Math.sin(t * 3.7 + phase * 2);
      g.drawImage(im, 0, y, im.width, step, x + dx, yBottom - (h - y) * s, im.width * s, step * s + 0.6);
    }
    g.restore();
  }
  // 替換頭／嘴巴：rig 給的是在參考圖上的中心、縮放、旋轉
  function overlay(ctx, im, o, sy = 1) {
    ctx.save();
    ctx.translate(o.cx, o.cy); ctx.rotate((o.rot || 0) * Math.PI / 180); ctx.scale(o.s, o.s * sy);
    ctx.drawImage(im, -im.width / 2, -im.height / 2);
    ctx.restore();
  }
  const pick = (tl, t, idle) => {
    let h = (tl.find(([a, b]) => t >= a && t < b) || [0, 0, idle])[2];
    if (h.includes('/')) { const [a, b] = h.split('/'); h = Math.floor(t * 6) % 2 ? b : a; }
    return h;
  };

  // ── Alice：參考圖＋替換頭；看貓、轉身時整個換成另一個姿勢 ──
  const M = 40;
  const acv = canvas2d(700 + M * 2, 1262 + M * 2);
  function alice(t) {
    const f = pick(AFACE, t, 'neutral');
    const ag = acv.getContext('2d');
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, acv.width, acv.height);
    let im, s = 1, foot = RIG.alice.foot;
    if (f.startsWith('pose:')) {
      const p = f.slice(5), o = RIG.alice.poses[p];
      im = ap['pose-' + p]; s = o.s; foot = o.foot * s;
      ag.translate(M, M + 1262 - im.height * s); ag.scale(s, s); ag.drawImage(im, 0, 0);
    } else {
      ag.translate(M, M); ag.drawImage(ap.ref, 0, 0);
      if (f !== 'neutral') overlay(ag, ap['head-' + f], RIG.alice.heads[f]);
    }
    // 腳底固定在地上，身體微微晃、呼吸
    const sway = 0.8 * Math.sin(t * 1.6);
    const br = 1 + 0.006 * Math.sin(t * 2.1);
    g.save(); shadow(g, 0.9);
    g.translate(AL.x, LINE); g.rotate(sway * Math.PI / 180); g.scale(AL.s, AL.s * br);
    g.drawImage(acv, -foot - M, -1262 - M);
    g.restore();
  }

  // ── 路標：柱子＋兩塊箭頭板。貓說話時兩塊板子繞著釘子轉圈，越轉越快，最後回到原位 ──
  function signpost(t) {
    const post = pr.post;
    piece('post', POST.x - post.width * POST.s / 2, LINE + 4, POST.s);
    BOARDS.forEach((b, i) => {
      const im = pr[b.n];
      const u = (t - 4.3 - i * 0.12) / 2.4;
      const spin = u <= 0 ? 0 : u >= 1 ? 0 : 720 * b.dir * ease(u);
      const wob = u >= 1 && u < 1.35 ? 10 * b.dir * Math.sin((u - 1) * 50) * (1 - (u - 1) / 0.35) : 0;
      const sway = 1.5 * Math.sin(t * 1.3 + i * 2);
      g.save(); shadow(g, 0.9);
      g.translate(PIN[0], PIN[1]); g.rotate((spin + wob + sway) * Math.PI / 180); g.translate(-PIN[0], -PIN[1]);
      g.translate(b.x, b.y); g.scale(b.s, b.s);
      g.drawImage(im, -im.width / 2, -im.height / 2);
      g.restore();
    });
    // 釘子
    g.fillStyle = '#3a2418';
    g.beginPath(); g.arc(PIN[0], PIN[1], 6, 0, Math.PI * 2); g.fill();
  }

  // ── 柴郡貓：底圖（無頭、無下半截尾巴）＋擺動的尾巴＋替換頭＋嘴巴。消失時由右往左一段段淡出，嘴巴留下 ──
  const ccv = canvas2d(900 + M * 2, 560 + M * 2), cg = ccv.getContext('2d');
  const STRIPS = [[600, 900], [420, 600], [250, 420], [0, 250]];   // 後腿、身體、前腳、頭（參考圖 x 範圍）
  // 消失：一開始就掉最多（和音效同時），0.3 秒內淡完
  const fade = (t, t0) => { const u = Math.min(1, Math.max(0, (t - t0) / 0.3)); return (1 - u) * (1 - u); };
  function cat(t) {
    const rig = RIG.cat, ch = rig.h;
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, ccv.width, ccv.height);
    cg.translate(M, M);
    // 尾巴：以身體下緣的接縫為軸左右晃，接縫上方多切的一截藏在身體後面
    const ta = fade(t, VANISH[0]);
    if (ta > 0) {
      const tl = rig.tail, [px, py] = tl.pivot;
      const sw = 7 * Math.sin(t * 1.9) + 3 * Math.sin(t * 4.3);
      cg.save(); cg.globalAlpha = ta;
      cg.translate(px, py); cg.rotate(sw * Math.PI / 180); cg.translate(-px, -py);
      cg.drawImage(cp['tail-low'], tl.x, tl.y);
      cg.restore();
    }
    cg.drawImage(cp.base, 0, 0);
    const f = pick(CFACE, t, 'smug');
    overlay(cg, f === 'neutral' ? cp.head : cp['head-' + f], rig.heads[f]);
    STRIPS.forEach(([a, b], i) => {
      const k = fade(t, VANISH[i + 1]);
      if (k >= 1) return;
      cg.save(); cg.globalCompositeOperation = 'destination-out'; cg.globalAlpha = 1 - k;
      cg.fillRect(a, -M, b - a, ch + M * 2);
      cg.restore();
    });
    const breathe = 1 + 0.012 * Math.sin(t * 2);
    g.save(); shadow(g, 0.9);
    g.translate(CAT.x, CAT.y + ch * CAT.s); g.scale(CAT.s, CAT.s * breathe);
    g.drawImage(ccv, -M, -ch - M);
    g.restore();

    // 嘴巴：說話時一開一合；身體消失後浮起來、變大，最後也消失
    if (t >= GRIN_OUT + 0.5) return;
    const talk = CAT_TALK.some(([a, b]) => t >= a && t < b);
    const sy = talk ? 0.75 + 0.25 * Math.abs(Math.sin(t * 9)) : 1;
    const m = rig.mouth;
    const grow = t < GRIN_POP ? 1 : t < GRIN_OUT ? 1 + 0.35 * backOut(Math.min(1, (t - GRIN_POP) / 0.5)) : 1.35 * (1 - backIn(Math.min(1, (t - GRIN_OUT) / 0.5)));
    const lift = t < GRIN_POP ? 0 : 14 * Math.sin((t - GRIN_POP) * 1.6) - 10 * Math.min(1, (t - GRIN_POP) / 0.5);
    g.save(); shadow(g, 0.6);
    g.translate(CAT.x + m.cx * CAT.s, CAT.y + (m.cy + lift) * CAT.s);
    g.rotate(((m.rot || 0) + (t >= GRIN_POP ? 4 * Math.sin(t * 1.3) : 0)) * Math.PI / 180);
    g.scale(CAT.s * m.s * grow, CAT.s * m.s * grow * sy);
    const im = cp.mouth;
    g.drawImage(im, -im.width / 2, -im.height / 2);
    g.restore();
  }
  function backOut(u) { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }
  function backIn(u) { const c = 1.7; return (c + 1) * u * u * u - c * u * u; }

  // 消失時的小亮點：從消失的段落往上飄
  function sparkles(t) {
    g.save(); g.fillStyle = '#efdcae';
    VANISH.forEach((v, i) => {
      const u = (t - v) / 0.9;
      if (u <= 0 || u >= 1) return;
      const x0 = CAT.x + (i === 0 ? 785 : (STRIPS[i - 1][0] + STRIPS[i - 1][1]) / 2) * CAT.s;
      const y0 = CAT.y + (i === 0 ? 450 : 200) * CAT.s;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.7 + i;
        g.globalAlpha = 0.8 * (1 - u);
        const x = x0 + Math.cos(a) * 50 * u + (k - 2) * 14, y = y0 - 70 * u - k * 9;
        const r = 4 * (1 - u) + 1.5;
        g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x + r, y); g.lineTo(x, y + r * 2); g.lineTo(x - r, y); g.closePath(); g.fill();
      }
    });
    g.restore();
  }

  // Alice 頭上的問號：彈出來、上下浮、左右搖，時間到就縮掉
  function qmarks(t) {
    const top = LINE - 1262 * AL.s;
    g.save(); g.font = 'italic 700 84px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    QMARKS.forEach((grp) => grp.forEach(([a, b], k) => {
      if (t < a || t > b + 0.3) return;
      const sc = t < b ? backOut(Math.min(1, (t - a) / 0.3)) : 1 - backIn(Math.min(1, (t - b) / 0.3));
      if (sc <= 0) return;
      const x = AL.x + 30 + k * 70 - (grp.length - 1) * 24, y = top - 40 - k * 34 + 6 * Math.sin(t * 3 + k * 1.7);
      g.save(); g.translate(x, y); g.rotate((-12 + k * 14 + 8 * Math.sin(t * 2.4 + k)) * Math.PI / 180); g.scale(sc, sc);
      shadow(g, 0.6); g.fillStyle = k % 2 ? '#d9a441' : '#efdcae'; g.fillText('?', 0, 0);
      g.restore();
    }));
    g.restore();
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(paper, 0, 0);
    const z = 1 + 0.035 * ease(t / 16);   // 鏡頭慢慢推近
    g.setTransform(z, 0, 0, z, W / 2 * (1 - z), LINE * (1 - z) * 0.9);
    g.fillStyle = 'rgba(18,10,12,0.55)';
    g.fillRect(200, LINE, 1520, 3);       // 舞台水平線（和第一幕同長）
    g.translate(W / 2, LINE); g.scale(FIT, FIT); g.translate(-W / 2, -LINE);

    plant(t, 'bell', 70, LINE + 6, 0.62, 0.4);
    plant(t, 'bush', 120, LINE + 10, 0.5, 1.1);
    piece('tree', TREE.x, LINE + 8, TREE.s);
    cat(tq);
    sparkles(t);
    signpost(tq);
    piece('mush1', 735, LINE + 4, 0.42);
    piece('mush2', 800, LINE + 4, 0.38);
    plant(t, 'fern', 560, LINE + 6, 0.48, 2.0);
    alice(tq);
    qmarks(tq);
    plant(t, 'bush-ol', 1300, LINE + 8, 0.55, 2.4);
    piece('mush3', 1640, LINE + 4, 0.55);
    piece('mush2', 1700, LINE + 4, 0.45);
    plant(t, 'sprig', 1770, LINE + 6, 0.6, 3.0);
    plant(t, 'grass', 1840, LINE + 6, 0.48, 0.7);
    piece('stone2', 1560, LINE + 4, 0.6);
    return stage;
  }

  return { ready, draw, canvas: stage, loop: 16 };
}
