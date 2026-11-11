// 第七幕變大又縮小的 2D 紙偶場景：Alice 喝了 DRINK ME，先長得比畫面還高，再縮得比牆上的小門還小，跑到門邊，
// 又「啵」一聲變回原本大小，左右張望，最後轉向觀眾、頭上冒問號。
// 素材在 public/works/alice-margins/art/：girl-parts/alice7/（照使用者的角色設定圖用 gpt-image 重畫的高解析版，
// rig.json 是替換頭位置和各姿勢的比例、腳底）、props7/（牆、小門、玻璃桌、瓶子、植物）。
// draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';

const W = 1920, H = 1080;
const LINE = 800;                       // 舞台水平線（和第一幕一樣）
// 整個舞台以水平線中點縮小，左右上下留出和第一幕一樣的空間
const FIT = 0.72;
const SHADOW = 'rgba(12,6,8,0.55)';

const AL = { s: 0.34 };                  // Alice 原本大小
const WALL = { x: 1150, s: 0.65 };
const DOOR = { x: 1150 + 411 * 0.65, y: LINE + 2, s: 0.65 * 0.87 };   // 小門嵌在牆的拱門裡
const TABLE = { x: 840, s: 0.6 };
const BOTTLE = { x: 640, s: 0.3 };

// 大小：[時間, 倍數]（1 是原本大小）
const SIZE = [[0, 1], [1.9, 1], [3.3, 3.0], [5.7, 3.0], [7.0, 0.32], [9.6, 0.32]];
const POP = 9.6;                        // 變回原本大小
// 位置（腳底 x）：縮小後小跑步到門邊
const WALK = [[0, 500], [7.3, 500], [8.9, 1420]];
// 表情或姿勢：[起, 迄, 頭或 pose:姿勢]；'a/b' 表示兩顆頭交替
const FACE = [[0, 0.9, 'neutral'], [0.9, 1.9, 'pose:drink'], [1.9, 2.3, 'blink'], [2.3, 5.6, 'surprised'], [5.6, 7.2, 'worried'],
  [7.2, 8.9, 'smile'], [8.9, 9.6, 'surprised'], [9.6, 10.4, 'surprised'], [10.4, 11.0, 'puzzled'], [11.0, 11.8, 'pose:left'],
  [11.8, 12.6, 'puzzled'], [12.6, 13.4, 'pose:left'], [13.4, 13.55, 'blink'], [13.55, 17, 'pose:front']];
const QMARK = 13.9;                     // 轉向觀眾後頭上冒問號

const ALICE = ['ref', 'head-neutral', 'head-surprised', 'head-puzzled', 'head-worried', 'head-smile', 'head-blink',
  'pose-drink', 'pose-front', 'pose-left', 'qmark'];
const PROPS = ['wall', 'door', 'door-open', 'key', 'table', 'bottle', 'grass', 'bell', 'daisy', 'flower', 'foxglove', 'mush', 'bush',
  'fern-si', 'stone1', 'stone2', 'ivy3'];

export function growScene({ base = './art/' } = {}) {
  const pr = {}, ap = {}, RIG = {};
  const ready = Promise.all([
    ...PROPS.map(async (n) => { pr[n] = await loadImg(`${base}props7/${n}.png`); }),
    ...ALICE.map(async (n) => { ap[n] = await loadImg(`${base}girl-parts/alice7/${n}.png`); }),
    fetch(`${base}girl-parts/alice7/rig.json`).then((r) => r.json()).then((j) => { RIG.alice = j; }),
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
  function backOut(u) { const c = 1.7; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); }

  // 大小：變大、變小用 ease；變回原本大小時用回彈
  function size(t) {
    if (t >= POP) return 0.32 + 0.68 * backOut(Math.min(1, (t - POP) / 0.45));
    let v = SIZE[0][1];
    for (let i = 1; i < SIZE.length; i++) {
      const [a, va] = SIZE[i - 1], [b, vb] = SIZE[i];
      if (t >= a && t < b) return va + (vb - va) * ease((t - a) / (b - a));
      if (t >= b) v = vb;
    }
    return v;
  }
  function walkX(t) {
    const [[, x0], [a, xa], [b, xb]] = WALK;
    if (t <= a) return x0;
    if (t >= b) return xb;
    return xa + (xb - xa) * ((t - a) / (b - a));
  }

  // ── Alice：參考圖＋替換頭，或整個換成喝水／轉身／正面的姿勢；腳底固定，整個人以腳底為中心縮放 ──
  const M = 40;
  const acv = canvas2d(700 + M * 2, 1360 + M * 2), ag = acv.getContext('2d');
  function alice(t) {
    const R = RIG.alice, f = (FACE.find(([a, b]) => t >= a && t < b) || [0, 0, 'neutral'])[2];
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, acv.width, acv.height);
    let foot = R.foot;
    if (f.startsWith('pose:')) {
      const p = f.slice(5), o = R.poses[p], im = ap['pose-' + p];
      foot = o.foot * o.s;
      ag.translate(M, M + R.bottom - o.bottom * o.s); ag.scale(o.s, o.s); ag.drawImage(im, 0, 0);
    } else {
      ag.translate(M, M); ag.drawImage(ap.ref, 0, 0);
      const o = R.heads[f], hi = ap['head-' + f];
      ag.save(); ag.translate(o.cx, o.cy); ag.rotate((o.rot || 0) * Math.PI / 180); ag.scale(o.s, o.s);
      ag.drawImage(hi, -hi.width / 2, -hi.height / 2); ag.restore();
    }
    const sz = size(t);
    // 小跑步時一蹦一蹦；變大後地面跟著震、身體晃
    const walking = t > WALK[1][0] && t < WALK[2][0];
    const hop = walking ? Math.abs(Math.sin((t - WALK[1][0]) * Math.PI * 4.5)) * 40 : 0;
    const big = sz > 2 ? 1.6 * Math.sin(t * 2.1) : 0;
    const sway = 0.8 * Math.sin(t * 1.6) + big + (walking ? 4 : 0);
    const br = 1 + 0.006 * Math.sin(t * 2.1);
    g.save(); shadow(g, 0.9 * Math.min(1.6, Math.max(0.5, sz)));
    g.translate(walkX(t), LINE - hop * sz); g.rotate(sway * Math.PI / 180); g.scale(AL.s * sz, AL.s * sz * br);
    g.drawImage(acv, -foot - M, -R.bottom - M);
    g.restore();

    // 轉向觀眾後頭上冒一個問號
    if (t >= QMARK) {
      const q = ap.qmark, u = Math.min(1, (t - QMARK) / 0.35), k = backOut(u) * 1.4;
      const qx = walkX(t) + 30, qy = LINE - R.bottom * AL.s - 40 + 6 * Math.sin(t * 3);
      g.save(); shadow(g, 0.5); g.translate(qx, qy); g.rotate(10 * Math.sin(t * 2.4) * Math.PI / 180); g.scale(k, k);
      g.drawImage(q, -q.width / 2, -q.height / 2); g.restore();
    }
  }

  // 變大時地面上的震動小線條
  function thuds(t) {
    const u = t - 1.9;
    if (u < 0 || u > 1.6) return;
    const ph = (u * 3) % 1;
    if (ph > 0.4) return;
    g.save(); g.strokeStyle = '#e9dcc0'; g.globalAlpha = 0.6 * (1 - ph / 0.4); g.lineWidth = 3; g.lineCap = 'round';
    for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
      const bx = walkX(t) + sd * (90 + ph * 60), by = LINE - 8 - k * 16;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + sd * (26 + ph * 30), by - 8 + k * 8); g.stroke();
    }
    g.restore();
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(paper, 0, 0);
    const z = 1 + 0.035 * ease(t / 17);   // 鏡頭慢慢推近
    // 變大時畫面輕輕震
    const shake = tq > 1.9 && tq < 3.4 ? 3 * Math.sin(tq * 60) : 0;
    g.setTransform(z, 0, 0, z, W / 2 * (1 - z) + shake, LINE * (1 - z) * 0.9);
    g.fillStyle = 'rgba(18,10,12,0.55)';
    g.fillRect(200, LINE, 1520, 3);       // 舞台水平線（和第一幕同長）
    g.translate(W / 2, LINE); g.scale(FIT, FIT); g.translate(-W / 2, -LINE);

    plant(t, 'bell', 200, LINE + 6, 0.55, 0.4);
    plant(t, 'grass', 290, LINE + 6, 0.45, 1.3);
    // 牆和小門：跑到門邊時門打開，看得到後面的花園；變回原本大小時門又關上
    piece('wall', WALL.x, LINE + 4, WALL.s);
    const open = tq >= 8.6 && tq < POP;
    piece(open ? 'door-open' : 'door', DOOR.x, DOOR.y, DOOR.s);
    plant(t, 'foxglove', 1110, LINE + 6, 0.45, 2.2);
    // 玻璃桌和桌上的鑰匙
    piece('table', TABLE.x, LINE + 4, TABLE.s);
    piece('key', TABLE.x + 60, LINE - pr.table.height * TABLE.s + 14, 0.4);
    // 地上的 DRINK ME：喝的時候被拿起來，喝完放回去變成空瓶倒在地上
    if (tq < 0.9 || tq >= 1.9) {
      g.save();
      if (tq >= 1.9) { g.translate(BOTTLE.x + 50, LINE); g.rotate(-80 * Math.PI / 180); g.translate(-BOTTLE.x - 50, -LINE + 6); }
      piece('bottle', BOTTLE.x, LINE + 4, BOTTLE.s);
      g.restore();
    }
    plant(t, 'daisy', 1700, LINE + 6, 0.5, 2.8);
    plant(t, 'bush', 1820, LINE + 8, 0.5, 1.7);
    piece('mush', 1040, LINE + 4, 0.4);
    piece('stone2', 1080, LINE + 4, 0.7);
    thuds(tq);
    alice(tq);
    plant(t, 'flower', 370, LINE + 8, 0.45, 3.3);
    return stage;
  }

  return { ready, draw, canvas: stage, loop: 17 };
}
