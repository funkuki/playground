// 第三幕 Carroll 的 2D 紙偶場景：坐在凳子上托腮看紙卡，頭上一個個冒出符號排成弧形，最後攤開手。
// 素材在 public/works/alice-margins/art/：carroll-parts/（人物，rig.json 是替換頭對照參考圖的位置）、props3/（道具）。
// draw(t) 只由 t 決定（t 是本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';

const W = 1920, H = 1080;
const LINE = 860;                       // 舞台水平線
const SHADOW = 'rgba(12,6,8,0.55)';
// 整個舞台縮小放回第一幕的水平線，上下留出和第一幕一樣的空間
const FIT = 0.56, FIT_LINE = 800;

const HEADS = ['smile', 'talk', 'wink', 'blink', 'oh', 'grin', 'sly'];
const PROPS = ['globe', 'rabbit', 'cup', 'quill', 'catcard', 'd12', 'board', 'stand', 'books3', 'math', 'logic', 'games', 'word',
  'rbook', 'obook', 'upbooks', 'leaf1', 'leaf2', 'leaf3', 'leaf4', 'bush', 'grass', 'mound', 'rocks', 'tuft'];

// Carroll 參考圖（769×775，含凳子和桌子）在舞台上的左上角與縮放
const C = { x: 640, s: 0.8 };
C.y = LINE - 775 * C.s;
const WRIST = [405, 298];               // 拿紙卡那隻手的袖口（參考圖座標）
const PALM_CUFF = [14, 76];             // hand-palm-up.png 上的袖口位置
const RAISE = 10.2;                     // 攤手的時間

// 頭上的符號：[字, 出現秒數]；A、Z 用斜體
export const GLYPHS = ['∴', '≠', 'x²', '?', 'A', 'Z', '∞'].map((g, i) => [g, 2.0 + i * 0.6]);
const ARC = { cx: 930, cy: 285, rx: 480, ry: 125 };

// 表情：[起, 迄, 替換頭]，其餘時間是 smile
const FACE = [[1.3, 1.45, 'blink'], [2.6, 3.4, 'sly'], [3.75, 4.5, 'oh'], [5.2, 5.35, 'blink'], [6.0, 7.0, 'wink'],
  [8.1, 8.25, 'blink'], [9.0, 9.9, 'sly'], [RAISE, 11.4, 'grin'], [11.4, 13.6, 'talk*'], [14.5, 14.65, 'blink'], [15.6, 18, 'grin']];
const TALK = '011010110110010011010110';

const backOut = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

export function nonsenseScene({ base = './art/' } = {}) {
  const cp = {}, pr = {};
  const RIG = {};
  const ready = Promise.all([
    ...['base', 'hands', 'card-hand', 'hand-palm-up', ...HEADS.map((h) => 'head-' + h)]
      .map(async (n) => { cp[n] = await loadImg(`${base}carroll-parts/${n}.webp`); }),
    ...PROPS.map(async (n) => { pr[n] = await loadImg(`${base}props3/${n}.webp`); }),
    fetch(`${base}carroll-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(RIG, j)),
  ]);

  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const paper = paperCanvas(W, H);

  function shadow(ctx, k) {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  }
  // 道具紙片：x 是左邊、yBottom 是底邊
  function piece(n, x, yBottom, s = 1, rot = 0) {
    const im = pr[n], w = im.width * s, h = im.height * s;
    g.save(); shadow(g, 1);
    g.translate(x + w / 2, yBottom); g.rotate(rot * Math.PI / 180);
    g.drawImage(im, -w / 2, -h, w, h);
    g.restore();
  }
  // 植物：水平切條，越高偏移越多（風吹）
  function plant(t, n, x, yBottom, s, phase) {
    const im = pr[n], h = im.height, step = 3;
    g.save(); shadow(g, 0.8);
    for (let y = 0; y < h; y += step) {
      const k = Math.pow(1 - y / h, 2);
      const dx = k * 7 * Math.sin(t * 1.5 + phase) + k * 2.5 * Math.sin(t * 3.7 + phase * 2);
      g.drawImage(im, 0, y, im.width, step, x + dx, yBottom - (h - y) * s, im.width * s, step * s + 0.6);
    }
    g.restore();
  }

  // ── Carroll：先畫在自己的畫布（參考圖座標），整個人再帶投影貼進場景 ──
  const M = 80;
  const pup = canvas2d(769 + M * 2, 775 + M), pg = pup.getContext('2d');
  function drawCarroll(t) {
    pg.setTransform(1, 0, 0, 1, 0, 0);
    pg.clearRect(0, 0, pup.width, pup.height);
    pg.translate(M, M);
    pg.drawImage(cp.base, 0, 0);
    let head = (FACE.find(([a, b]) => t >= a && t < b) || [0, 0, 'smile'])[2];
    if (head === 'talk*') head = TALK[Math.floor(t * 12) % TALK.length] === '1' ? 'talk' : 'smile';
    const h = RIG.heads[head], hi = cp['head-' + head];
    pg.drawImage(hi, h.x, h.y, hi.width * h.s, hi.height * h.s);
    pg.drawImage(cp.hands, 0, 0);             // 托腮的手蓋在頭上
    // 拿紙卡的手：看卡時輕輕晃；攤手時換成掌心朝上的手，往上抬
    const [wx, wy] = WRIST;
    if (t < RAISE) {
      const rot = 2.2 * Math.sin(t * 1.3) + key(t, [[0, 0], [4.6, 0], [5.0, -6], [8.6, -6], [9.2, 0]]);
      pg.save(); pg.translate(wx, wy); pg.rotate(rot * Math.PI / 180); pg.translate(-wx, -wy);
      pg.drawImage(cp['card-hand'], 0, 0);
      pg.restore();
    } else {
      const k = backOut((t - RAISE) / 0.45);
      const rot = -38 * k + 1.5 * Math.sin((t - RAISE) * 1.6);
      pg.save(); pg.translate(wx, wy); pg.rotate(rot * Math.PI / 180); pg.scale(1.05, 1.05);
      pg.drawImage(cp['hand-palm-up'], -PALM_CUFF[0], -PALM_CUFF[1]);
      pg.restore();
    }
    // 呼吸：以凳腳為準微微伸縮
    const br = 1 + 0.006 * Math.sin(t * 2.1);
    g.save(); shadow(g, 0.9);
    g.translate(C.x - M * C.s, C.y - M * C.s + (775 + M) * C.s * (1 - br));
    g.drawImage(pup, 0, 0, pup.width * C.s, pup.height * C.s * br);
    g.restore();
  }

  // 攤手時紙卡從手上飄起來，停在掌心上方給觀眾看
  function flyingCard(t) {
    if (t < RAISE + 0.15) return;
    const k = ease((t - RAISE - 0.15) / 0.9);
    const hx = C.x + 470 * C.s, hy = C.y + 180 * C.s;
    const tx = 1110, ty = 365;
    const x = hx + (tx - hx) * k, y = hy + (ty - hy) * k - Math.sin(k * Math.PI) * 70;
    const s = 0.55 + 0.35 * k, bob = k >= 1 ? 6 * Math.sin((t - RAISE) * 2.2) : 0;
    const rot = (1 - k) * -25 + 4 * Math.sin(t * 1.4);
    const im = pr.catcard;
    g.save(); shadow(g, 1);
    g.translate(x, y + bob); g.rotate(rot * Math.PI / 180); g.scale(s, s);
    g.drawImage(im, -im.width / 2, -im.height / 2);
    g.restore();
  }

  // 符號：奶油色紙片字，彈出後在弧上浮動
  function glyphs(t) {
    GLYPHS.forEach(([ch, at], i) => {
      if (t < at) return;
      const a = Math.PI * (0.9 - (0.8 * i) / (GLYPHS.length - 1));
      const x = ARC.cx + Math.cos(a) * ARC.rx, y0 = ARC.cy - Math.sin(a) * ARC.ry;
      const k = backOut((t - at) / 0.35), u = t - at;
      // 攤手時全部跳一下
      const jump = t > RAISE ? 26 * Math.sin(Math.min((t - RAISE - i * 0.05) / 0.5, 1) * Math.PI) * (t - RAISE - i * 0.05 > 0) : 0;
      const y = y0 + 8 * Math.sin(u * (2.4 + (i % 3) * 0.5) + i) - jump;
      const rot = 9 * Math.sin(u * (1.8 + (i % 2) * 0.6) + i * 1.7);
      const italic = /[A-Z]/.test(ch);
      g.save();
      g.translate(x, y); g.rotate(rot * Math.PI / 180); g.scale(k, k);
      g.font = `${italic ? 'italic ' : ''}700 ${ch.length > 1 ? 104 : 118}px Georgia, 'Times New Roman', serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      shadow(g, 1);
      g.fillStyle = i % 3 === 1 ? '#d4ae5a' : '#efe3c8';
      g.fillText(ch, 0, 0);
      g.shadowColor = 'transparent';
      g.lineWidth = 2; g.strokeStyle = 'rgba(60,38,30,0.55)';
      g.strokeText(ch, 0, 0);
      g.restore();
    });
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(paper, 0, 0);
    const z = 1 + 0.04 * ease(t / 18);    // 鏡頭慢慢推近
    g.setTransform(z, 0, 0, z, W / 2 * (1 - z), FIT_LINE * (1 - z) * 0.85);
    g.fillStyle = 'rgba(18,10,12,0.55)';
    g.fillRect(200, FIT_LINE, 1520, 3);   // 舞台水平線（和第一幕同長）
    g.translate(W / 2, FIT_LINE); g.scale(FIT, FIT); g.translate(-W / 2, -LINE);

    // 左：書堆，上面放地球儀和兔子
    piece('upbooks', 175, LINE, 1.0, -2);
    // 書一本本往上疊：[名稱, 左邊, 縮放, 角度]
    let y = LINE;
    for (const [n, x, sc, r] of [['books3', 290, 1.05, 0], ['word', 302, 1.1, 0], ['games', 318, 1.05, 2], ['logic', 306, 1.05, -1], ['math', 272, 1.0, 0]]) {
      piece(n, x, y + 4, sc, r);
      y -= pr[n].height * sc - 28;
    }
    piece('globe', 292, y + 6, 0.85);
    const hop = tq > 6.6 && tq < 7.2 ? Math.sin((tq - 6.6) / 0.6 * Math.PI) * 22 : 0;   // 兔子跳一下
    piece('rabbit', 392, y + 6 - hop, 0.85);
    piece('obook', 445, LINE, 0.95, 3);

    // 右：黑板架、地上的書和骰子
    piece('stand', 1530, LINE, 1.6);
    piece('board', 1440, LINE - 300, 1.15, -1);
    piece('rbook', 1335, LINE, 0.9, -4);
    piece('d12', 1720, LINE, 0.7);

    drawCarroll(tq);
    // 桌上：茶杯、羽毛筆和墨水瓶（桌面約在參考圖 y 388）
    const top = C.y + 388 * C.s;
    piece('quill', C.x + 600 * C.s, top + 4, 0.7);
    piece('cup', C.x + 480 * C.s, top + 4, 0.8);
    // 茶的熱氣
    g.save(); g.strokeStyle = 'rgba(239,227,200,0.35)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const cx = C.x + 515 * C.s + k * 16, ph = t * 2 + k * 2;
      g.beginPath();
      for (let y = 0; y < 60; y += 4) g.lineTo(cx + 6 * Math.sin(ph + y * 0.12), top - 50 - y);
      g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 1.7 + k); g.stroke();
    }
    g.restore();

    glyphs(t);
    flyingCard(t);

    // 前景植物
    plant(t, 'bush', 40, LINE + 14, 1.2, 0);
    plant(t, 'leaf3', 545, LINE + 6, 0.9, 1.1);
    plant(t, 'tuft', 700, LINE + 8, 0.9, 0.5);
    plant(t, 'leaf2', 1255, LINE + 6, 1.0, 2.0);
    plant(t, 'leaf4', 1785, LINE + 8, 1.1, 2.7);
    plant(t, 'mound', 1600, LINE + 12, 1.0, 1.7);
    plant(t, 'grass', 1180, LINE + 8, 0.8, 0.9);
    return stage;
  }

  return { ready, draw, canvas: stage };
}
