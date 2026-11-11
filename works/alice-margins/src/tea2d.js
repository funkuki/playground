// 第五幕瘋帽客茶會的 2D 紙偶場景：Alice、三月兔、瘋帽客坐在長桌後，一起往右挪一個位子（最右邊的跳回最左邊），再挪一次；
// 旁邊的落地鐘停在六點，指針抖一下又回去。素材在 public/works/alice-margins/art/：hatter-parts/、hare-parts/（gpt-image 生成，
// 參考圖已去掉椅子，rig.json 是替換頭位置）、girl-parts/alice/（沿用第一幕）、props5/（道具）。
// draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';

const W = 1920, H = 1080;
const LINE = 800;                       // 舞台水平線（和第一幕一樣）
// 整個舞台以水平線中點縮小，左右上下留出和第一幕一樣的空間，像紙偶在一條水平面上表演
const FIT = 0.68;
const SEAT_Y = 660;                     // 椅面高度
const SEATS = [705, 1065, 1425];        // 三個座位（臀部的 x）
const CLOTH_TOP = 585;
const SHADOW = 'rgba(12,6,8,0.55)';

// 角色：參考圖大小、縮放、臀部在參考圖上的位置；一開始由左到右是 Alice、三月兔、瘋帽客
const CAST = {
  alice:  { dir: 'girl-parts/alice', w: 492, h: 589, s: 0.6, hip: [235, 560], dy: 48, heads: ['neutral', 'oh', 'oh2', 'talk', 'blink', 'smile'], hands: true },
  hare:   { dir: 'hare-parts', w: 431, h: 662, s: 0.62, hip: [190, 640], heads: ['talk', 'shout', 'laugh', 'smile', 'startle', 'giggle'] },
  hatter: { dir: 'hatter-parts', w: 502, h: 773, s: 0.68, hip: [200, 575], heads: ['talk', 'laugh', 'grin', 'blink', 'oh', 'sip'] },
};
const ORDER = ['alice', 'hare', 'hatter'];
const HOPS = [4.2, 8.6];                // 換位子的時間

// 表情：[起, 迄, 頭]；'a/b' 表示兩顆頭交替（說話、大笑）
const FACE = {
  hatter: [[0, 1.5, 'talk/grin'], [1.6, 2.8, 'sip'], [2.8, 3.0, 'blink'], [3.2, 4.1, 'talk/grin'], [4.2, 5.0, 'laugh'],
    [5.2, 6.0, 'talk/grin'], [6.0, 7.0, 'oh'], [7.0, 8.4, 'talk/laugh'], [8.6, 9.6, 'laugh'], [9.8, 9.95, 'blink'],
    [10.2, 12.0, 'talk/grin'], [12.2, 13.0, 'laugh'], [13.2, 15.0, 'talk/grin'], [15.5, 15.65, 'blink']],
  hare: [[0, 1.0, 'giggle'], [1.0, 2.0, 'laugh/giggle'], [2.5, 3.5, 'shout/talk'], [4.2, 5.0, 'startle'], [5.2, 6.0, 'laugh/giggle'],
    [6.0, 7.0, 'startle'], [7.2, 8.4, 'giggle/laugh'], [8.6, 9.4, 'startle'], [9.6, 12.0, 'laugh/giggle'], [12.5, 14.0, 'talk/shout'],
    [14.5, 17, 'giggle/laugh']],
  alice: [[1.3, 1.45, 'blink'], [4.2, 4.9, 'oh'], [5.6, 5.75, 'blink'], [6.0, 7.0, 'oh2'], [8.6, 9.4, 'oh'], [11.0, 11.15, 'blink'],
    [12.5, 13.5, 'talk/neutral'], [15.0, 15.15, 'blink']],
};
const IDLE = { hatter: 'grin', hare: 'smile', alice: 'neutral' };

// 朝向：最左邊的人朝右、最右邊的人朝左，中間的人照下面的時間表轉頭看說話的人（1 朝右、-1 朝左）
const MID = {
  hare:   [[0, 1], [2.3, -1], [3.7, 1]],
  alice:  [[4.9, -1], [7.3, 1], [7.9, -1]],
  hatter: [[9.6, -1], [12.3, 1], [13.2, -1], [15.2, 1]],
};
const TURN = 0.16;                      // 紙偶翻面的時間

const PROPS = ['clock', 'hand-min', 'hand-hour', 'chair', 'table', 'cloth', 'pot-red', 'pot-cream', 'dormouse-pot', 'cake', 'sugar',
  'cup1', 'cup2', 'cup-tip', 'rose', 'bush', 'bush-ochre', 'bush-small', 'bluebell'];
const CLOCK = { x: 235, s: 1.0, face: [116, 185] };

export function teaScene({ base = './art/' } = {}) {
  const pr = {}, pp = {}, RIG = {};
  const ready = Promise.all([
    ...PROPS.map(async (n) => { pr[n] = await loadImg(`${base}props5/${n}.webp`); }),
    ...ORDER.flatMap((n) => {
      const c = CAST[n]; pp[n] = {};
      const files = ['base', ...c.heads.map((h) => 'head-' + h), ...(c.hands ? ['hands'] : [])];
      return files.map(async (f) => { pp[n][f] = await loadImg(`${base}${c.dir}/${f}.webp`); });
    }),
    fetch(`${base}hatter-parts/rig.json`).then((r) => r.json()).then((j) => { RIG.hatter = j; }),
    fetch(`${base}hare-parts/rig.json`).then((r) => r.json()).then((j) => { RIG.hare = j; }),
    fetch(`${base}girl-parts/rig.json`).then((r) => r.json()).then((j) => { RIG.alice = j.alice; }),
  ]);

  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const paper = paperCanvas(W, H);

  function shadow(ctx, k) {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  }
  // 道具紙片：x 是左邊、yBottom 是底邊
  function piece(n, x, yBottom, sx, sy = sx) {
    const im = pr[n];
    g.save(); shadow(g, 1);
    g.drawImage(im, x, yBottom - im.height * sy, im.width * sx, im.height * sy);
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

  // 第 i 個角色此刻的座位 x、離開椅面的高度、是不是正在大跳（繞回最左邊）
  function seatPos(i, t) {
    let seat = i, x = SEATS[i], y = 0, wrap = false;
    HOPS.forEach((s, k) => {
      const from = (i + k) % 3, to = (i + k + 1) % 3, w = to === 0;
      const t0 = s + i * 0.08, d = w ? 0.9 : 0.6;
      if (t >= t0 + d) { seat = to; x = SEATS[to]; return; }
      if (t > t0) {
        seat = -1;
        const u = (t - t0) / d;
        x = SEATS[from] + (SEATS[to] - SEATS[from]) * ease(u);
        y = Math.sin(u * Math.PI) * (w ? 210 : 55);
        wrap = w;
      }
    });
    return { seat, x, y, wrap };
  }
  // 此刻朝向：跳的時候朝前進方向；翻面用最近 TURN 秒的平均，紙片會壓扁再翻過來
  function dirAt(n, i, t) {
    const p = seatPos(i, t);
    if (p.seat === -1) return p.wrap ? -1 : 1;
    if (p.seat !== 1) return p.seat === 0 ? 1 : -1;
    let d = 1;
    for (const [a, v] of MID[n]) if (t >= a) d = v;
    return d;
  }
  function facing(n, i, t) {
    let sum = 0;
    for (let k = 0; k < 8; k++) sum += dirAt(n, i, t - TURN * k / 7);
    return sum / 8;
  }

  // ── 紙偶：底圖＋替換頭（Alice 再疊托腮的手），先畫在自己的畫布，整個人再帶投影貼進場景 ──
  const M = 60;
  const LABEL = [84, 79, 58, 58];        // 帽客底圖上帽牌文字的範圍
  const lab = canvas2d(LABEL[2], LABEL[3]);
  const pcs = {};
  for (const n of ORDER) { const c = CAST[n]; pcs[n] = canvas2d(c.w + M * 2, c.h + M * 2); }
  const faceRaw = (n, t) => (FACE[n].find(([a, b]) => t >= a && t < b) || [0, 0, IDLE[n]])[2];
  function face(n, t) {
    let h = faceRaw(n, t);
    if (h.includes('/')) { const [a, b] = h.split('/'); h = Math.floor(t * 6) % 2 ? b : a; }
    return h;
  }
  function drawChar(n, t, p, dir) {
    const c = CAST[n], cv = pcs[n], cg = cv.getContext('2d'), im = pp[n];
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.clearRect(0, 0, cv.width, cv.height);
    cg.translate(M, M);
    cg.drawImage(im.base, 0, 0);
    const hn = face(n, t), o = RIG[n].heads[hn], hi = im['head-' + hn];
    cg.save();
    cg.translate(o.x + hi.width * o.s / 2, o.y + hi.height * o.s / 2); cg.rotate((o.rot || 0) * Math.PI / 180);
    cg.drawImage(hi, -hi.width * o.s / 2, -hi.height * o.s / 2, hi.width * o.s, hi.height * o.s);
    cg.restore();
    // 帽客朝左時整個紙偶會鏡像，把帽牌中間的「10/6」再翻回來，字才不會反
    if (n === 'hatter' && dir < 0) {
      const [lx, ly, lw, lh] = LABEL;
      lab.getContext('2d').clearRect(0, 0, lw, lh);
      lab.getContext('2d').drawImage(cv, lx + M, ly + M, lw, lh, 0, 0, lw, lh);
      cg.save(); cg.clearRect(lx, ly, lw, lh); cg.translate(lx + lw, ly); cg.scale(-1, 1); cg.drawImage(lab, 0, 0); cg.restore();
    }
    if (im.hands) cg.drawImage(im.hands, 0, 0);
    // 跳的時候身體往前傾一點；平常微微呼吸、晃動
    const lean = p.y > 0 ? -6 * Math.sin(p.y / (p.wrap ? 210 : 55) * Math.PI / 2) : 0;
    const sip = n === 'hatter' ? key(t, [[1.5, 0], [1.8, -4], [2.7, -4], [3.0, 0]]) : 0;
    const sway = 1.2 * Math.sin(t * 1.7 + n.length);
    const br = 1 + 0.008 * Math.sin(t * 2.2 + n.length);
    // 大笑時整個人彈跳、往後仰；說話時身體往前探
    const fr = faceRaw(n, t), seated = p.y === 0;
    const laugh = seated && /laugh|giggle/.test(fr), talk = seated && /talk|shout/.test(fr);
    const bob = laugh ? 7 * Math.abs(Math.sin(t * 11 + n.length)) : talk ? 2.5 * Math.abs(Math.sin(t * 6)) : 0;
    const tilt = laugh ? -5 + 2 * Math.sin(t * 11) : talk ? 3 + 1.5 * Math.sin(t * 3) : 0;
    const [hx, hy] = c.hip, s = c.s;
    g.save(); shadow(g, 0.9);
    g.translate(p.x, SEAT_Y - p.y + (c.dy || 0) - bob);
    g.scale(dir, 1);
    g.rotate((lean + sip + sway + tilt) * Math.PI / 180); g.scale(s, s * br);
    g.drawImage(cv, -hx - M, -hy - M);
    g.restore();
  }

  // 桌上的茶具：有人落回椅子時，離得近的會跳一下、晃一下
  const LANDS = HOPS.flatMap((s, k) => [0, 1, 2].map((i) => {
    const to = (i + k + 1) % 3;
    return [s + i * 0.08 + (to === 0 ? 0.9 : 0.6), SEATS[to]];
  }));
  function ware(t, n, x, yBottom, sc) {
    const im = pr[n], w = im.width * sc, h = im.height * sc;
    let up = 0, rot = 0;
    for (const [lt, lx] of LANDS) {
      const u = t - lt - Math.abs(x + w / 2 - lx) / 3000;
      if (u <= 0 || u > 0.4) continue;
      const k = Math.max(0, 1 - Math.abs(x + w / 2 - lx) / 600);
      up += k * 14 * Math.sin(u / 0.2 * Math.PI) * (u < 0.2 ? 1 : 0.3);
      rot += k * 6 * Math.sin(u * 40) * (1 - u / 0.4);
    }
    g.save(); shadow(g, 1);
    g.translate(x + w / 2, yBottom - Math.max(0, up)); g.rotate(rot * Math.PI / 180);
    g.drawImage(im, -w / 2, -h, w, h);
    g.restore();
  }
  // 茶壺的熱氣：幾條細細的波浪線往上飄、慢慢淡掉
  function steam(t, x, y, ph) {
    g.save(); g.strokeStyle = '#e9dcc0'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const u = ((t * 0.45 + ph + k * 0.5) % 1);
      g.globalAlpha = 0.5 * Math.sin(u * Math.PI);
      g.beginPath();
      for (let j = 0; j <= 12; j++) {
        const yy = y - u * 60 - j * 5;
        const xx = x + k * 14 + 6 * Math.sin(j * 0.7 + t * 2 + ph);
        j ? g.lineTo(xx, yy) : g.moveTo(xx, yy);
      }
      g.stroke();
    }
    g.restore();
  }

  // ── 落地鐘：鐘身＋可轉的時針、分針（停在六點）。6 秒時指針狂轉兩圈、鐘身跳起來亂晃，又彈回六點；
  // 平常每隔幾秒分針抽一下、鐘抖一下 ──
  const TWITCH = [2.4, 10.4, 14.2];
  function clock(t) {
    const im = pr.clock, s = CLOCK.s, x = CLOCK.x, top = LINE - im.height * s;
    const u = t - 6.0, fit = u > 0 && u < 2.2;
    // 狂轉：0–1.2 秒轉兩圈（分針）／半圈多（時針），1.2 秒後彈回六點並晃幾下
    let mn = 0, hr = 0, hop = 0, rock = 0, sq = 1;
    if (fit) {
      if (u < 1.2) { const e = ease(u / 1.2); mn = 720 * e; hr = 200 * e; }
      else { const v = u - 1.2, d = Math.exp(-v * 4) * Math.cos(v * 22); mn = 40 * d; hr = 15 * d; }
      hop = u < 1.2 ? Math.abs(Math.sin(u * Math.PI * 5)) * 26 * (1 - u / 1.2 * 0.5) : 0;
      rock = u < 1.6 ? 5 * Math.sin(u * 28) * (1 - u / 1.6) : 0;
      sq = u < 1.2 ? 1 + 0.05 * Math.sin(u * Math.PI * 10) : 1;
    }
    for (const tw of TWITCH) {
      const v = t - tw;
      if (v > 0 && v < 0.6) { const d = Math.exp(-v * 7) * Math.cos(v * 30); mn += 30 * d; rock += 1.8 * d; }
    }
    g.save();
    g.translate(x + im.width * s / 2, LINE - hop); g.rotate(rock * Math.PI / 180); g.scale(1 / sq, sq);
    g.translate(-(x + im.width * s / 2), -LINE);
    piece('clock', x, LINE, s);
    const cx = x + CLOCK.face[0] * s, cy = top + CLOCK.face[1] * s;
    const hand = (n, deg, k, pivot) => {
      const h = pr[n];
      g.save(); shadow(g, 0.35);
      g.translate(cx, cy); g.rotate(deg * Math.PI / 180); g.scale(k, k);
      g.drawImage(h, -h.width / 2, -pivot);
      g.restore();
    };
    hand('hand-hour', 180 + hr, 0.36, 140);
    hand('hand-min', mn, 0.45, 155);
    g.restore();
    // 落地時的小線條，表示「碰」
    if (fit && u < 1.2) {
      const ph = (u * 5) % 1;
      if (ph < 0.35) {
        g.save(); g.strokeStyle = '#e9dcc0'; g.globalAlpha = 0.7 * (1 - ph / 0.35); g.lineWidth = 3; g.lineCap = 'round';
        for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
          const bx = x + im.width * s / 2 + sd * (im.width * s / 2 + 10), by = LINE - 10 - k * 18;
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + sd * (22 + ph * 30), by - 6 + k * 6); g.stroke();
        }
        g.restore();
      }
    }
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

    plant(t, 'bush', 40, LINE + 10, 0.75, 0.3);
    plant(t, 'bluebell', 470, LINE + 6, 0.8, 1.4);
    clock(t);

    // 椅子固定在座位上，人跳來跳去
    const cs = 0.97;
    for (const x of SEATS) piece('chair', x - 120 * cs, LINE, cs);
    const pos = ORDER.map((n, i) => seatPos(i, tq));
    ORDER.map((n, i) => [n, i]).sort((a, b) => pos[a[1]].wrap - pos[b[1]].wrap)   // 大跳的人畫在最上面
      .forEach(([n, i]) => drawChar(n, tq, pos[i], facing(n, i, tq)));

    // 長桌：桌腳＋桌布，桌上的茶具在人前面
    piece('table', 523, LINE, 1.1, 1.3);
    piece('cloth', 520, CLOTH_TOP + pr.cloth.height * 0.95, 0.95);
    const on = CLOTH_TOP + 8;
    steam(t, 640, on - 150, 0);
    steam(t, 1320, on - 135, 1.7);
    steam(t, 1492, on - 70, 3.1);
    ware(tq, 'pot-red', 560, on, 0.42);
    ware(tq, 'cup1', 800, on, 0.42);
    ware(tq, 'cake', 900, on, 0.48);
    ware(tq, 'sugar', 1050, on, 0.42);
    ware(tq, 'cup-tip', 1150, on, 0.42);
    ware(tq, 'pot-cream', 1250, on, 0.42);
    ware(tq, 'cup2', 1450, on, 0.42);
    // 睡鼠的茶壺打瞌睡似地左右搖
    const dm = pr['dormouse-pot'], ds = 0.4;
    g.save(); shadow(g, 1);
    g.translate(1520 + dm.width * ds / 2, on); g.rotate(3 * Math.sin(tq * 1.3) * Math.PI / 180);
    g.drawImage(dm, -dm.width * ds / 2, -dm.height * ds, dm.width * ds, dm.height * ds);
    g.restore();

    plant(t, 'rose', 1665, LINE + 8, 0.75, 2.1);
    plant(t, 'bush-ochre', 1730, LINE + 10, 0.75, 2.7);
    plant(t, 'bush-small', 1490, LINE + 8, 0.6, 1.0);
    return stage;
  }

  return { ready, draw, canvas: stage };
}
