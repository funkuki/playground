// 第一幕划船的 2D 紙偶場景：Gemini 生成的分層素材（public/works/alice-margins/art/），用 canvas 2D 逐格畫。
// 測試頁 art/boat-test.html 用滿版深色舞台；第二幕書頁插圖用 book 模式（透明底、墨色水面），再裁成插圖比例。
// draw(t) 只由 t 決定，可以任意 seek：角色的表演每 5 秒循環一次，水、燈籠、植物跟著絕對時間走。

const W = 1920, H = 1080;
const LOOP = 5;
const LINE = 800;                       // 舞台水平線
const SINK = 26;                        // 船身吃水深度

const BOAT = ['boat-front', 'lantern', 'plants-left', 'plants-mid', 'plants-right'];
// 數學家紙偶的部件（math-parts/，rig.json 是對照整體參考圖算出的位置）
const MATH = ['body-a', 'legs-seated', 'arm-fore-a', 'hand-point-up', 'hand-palm-up', 'arm-bent-near', 'hand-book',
  'head-talk', 'head-neutral', 'head-content'];

// 版面：參考圖左上角與縮放
const P = {
  lorina: { x: 548, y: 470, s: 0.47 },
  edith:  { x: 668, y: 553, s: 0.37 },
  alice:  { x: 775, y: 520, s: 0.39 },
  math:   { x: 930, y: 458, s: 0.62 },
  front:  { x: 500, y: 822, sx: 1.68, sy: 0.98 },
};

// 三個女孩：每段 [起, 迄, 替換頭]，沒寫到的時間用 neutral。只換表情，身體不動
const GIRL_ACT = {
  lorina: [[1.0, 1.35, 'laugh'], [2.05, 2.2, 'look'], [3.1, 3.45, 'talk'], [3.45, 3.6, 'neutral'], [3.6, 3.85, 'talk2'], [4.5, 4.75, 'laugh']],
  edith:  [[0.85, 1.0, 'blink'], [1.9, 2.4, 'oh'], [2.9, 3.6, 'grin'], [4.2, 4.35, 'blink']],
  alice:  [[0.55, 1.2, 'oh2'], [1.6, 1.75, 'blink'], [2.4, 3.3, 'oh'], [3.95, 4.7, 'smile']],
};

// 說話：數學家嘴型開合的節奏（每格 1/12 秒，1 = 張嘴）
const TALK = '0110101101100100110101100000000011011010110100000000110101101011010000000';
const HIP = [318, 360], NECK = [262, 152], PAD = 60;

export const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
// 兩段關鍵影格之間的平滑值：keys = [[秒, 值], ...]
export function key(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * ease((t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}

export const canvas2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const loadImg = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

// 深色舞台的底色加暗角
export function paperCanvas(w, h) {
  // 平塗的深暖褐底（不加顆粒），再疊一層暗角
  const c = canvas2d(w, h), p = c.getContext('2d');
  p.fillStyle = 'rgb(58,42,43)'; p.fillRect(0, 0, w, h);
  const v = p.createRadialGradient(w / 2, h * 0.62, 200, w / 2, h * 0.6, 1150);
  v.addColorStop(0, 'rgba(90,62,50,0.20)'); v.addColorStop(1, 'rgba(10,5,6,0.45)');
  p.fillStyle = v; p.fillRect(0, 0, w, h);
  return c;
}

// crop：[x, y, w, h] 只輸出舞台的一塊（書頁插圖用），out：輸出寬度
// enter：[起, 迄] 秒，船（連同人和燈籠）從畫面左外側划到定位
export function boatScene({ base = './art/', book = false, crop = null, out = null, enter = null } = {}) {
  const img = {}, mp = {}, gp = {};
  let RIG, GRIG;
  const ready = Promise.all([
    ...BOAT.map(async (n) => { img[n] = await loadImg(`${base}boat-layers/${n}.webp`); }),
    ...MATH.map(async (n) => { mp[n] = await loadImg(`${base}math-parts/${n}.webp`); }),
    fetch(`${base}math-parts/rig.json`).then((r) => r.json()).then((j) => { RIG = j; }),
    fetch(`${base}girl-parts/rig.json`).then((r) => r.json()).then((j) => {
      GRIG = j;
      return Promise.all(Object.entries(j).flatMap(([n, R]) => {
        gp[n] = {};
        const files = ['base', ...Object.keys(R.heads).map((h) => 'head-' + h)];
        if (R.hands) files.push('hands');
        return files.map(async (k) => { gp[n][k] = await loadImg(`${base}girl-parts/${n}/${k}.webp`); });
      }));
    }),
  ]);

  // 深色舞台和書頁的差別：底色、投影、水面
  const SHADOW = book ? 'rgba(70,40,20,0.38)' : 'rgba(12,6,8,0.55)';
  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const view = crop ? canvas2d(out, Math.round(out * crop[3] / crop[2])) : stage;

  // 紙張底紋；書頁模式不畫
  const paper = book ? null : paperCanvas(W, H);

  function shadow(ctx, k) {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  }

  // 紙片：帶投影畫上去
  function piece(im, x, yBottom, sx, sy) {
    g.save(); shadow(g, 1);
    g.drawImage(im, x, yBottom - im.height * sy, im.width * sx, im.height * sy);
    g.restore();
  }

  // 植物：水平切條，越高的條偏移越多（風吹）
  function plants(t, name, x, yBottom, s, phase) {
    const im = img[name], h = im.height, step = 3;
    for (let y = 0; y < h; y += step) {
      const k = Math.pow(1 - y / h, 2);
      const dx = k * 9 * Math.sin(t * 1.7 + phase) + k * 3 * Math.sin(t * 4.1 + phase * 2);
      g.drawImage(im, 0, y, im.width, step, x + dx, yBottom - (h - y) * s, im.width * s, step * s + 0.6);
    }
  }

  // 水面：沿著水平線的細短線，慢慢往左流，加上槳邊的漣漪
  function water(t, oarX) {
    const ink = book ? '70,52,38' : '205,180,140';
    g.save();
    g.strokeStyle = `rgba(${ink},${book ? 0.4 : 0.18})`; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const row = i % 3, len = 24 + (i * 37) % 50;
      let x = ((i * 157 + 40) - t * (14 + row * 6)) % 1500; if (x < 0) x += 1500;
      const y = LINE + 10 + row * 11;
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i);
      g.beginPath(); g.moveTo(240 + x, y); g.lineTo(240 + x + len, y); g.stroke();
    }
    g.globalAlpha = 1;
    for (let k = 0; k < 2; k++) {
      const age = ((t + k * 1.25) % 2.5) / 2.5;
      g.strokeStyle = `rgba(${ink},${(book ? 0.45 : 0.35) * (1 - age)})`;
      g.beginPath(); g.ellipse(oarX, LINE + 4, 20 + age * 70, 4 + age * 9, 0, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }

  // ── 數學家紙偶：先畫在自己的畫布（參考圖座標），整個人再帶投影貼進場景 ──
  const pup = canvas2d(496 + PAD * 2, 441 + PAD * 2), pg = pup.getContext('2d');
  function part(name, o, { flip = false, at, anchor } = {}) {
    const im = mp[name];
    pg.save();
    if (at) {                       // 讓部件上的 anchor 點（原圖座標）對到 at
      pg.translate(at[0], at[1]); pg.rotate((o.rot || 0) * Math.PI / 180); pg.scale(o.s * (flip ? -1 : 1), o.s);
      pg.drawImage(im, -(flip ? im.width - anchor[0] : anchor[0]), -anchor[1]);
    } else {
      pg.translate(o.cx, o.cy); pg.rotate(o.rot * Math.PI / 180); pg.scale(o.s, o.s);
      pg.drawImage(im, -im.width / 2, -im.height / 2);
    }
    pg.restore();
  }
  function pivot(p, deg, fn) {
    pg.save(); pg.translate(p[0], p[1]); pg.rotate(deg * Math.PI / 180); pg.translate(-p[0], -p[1]); fn(); pg.restore();
  }
  function drawMath(t) {
    pg.setTransform(1, 0, 0, 1, 0, 0);
    pg.clearRect(0, 0, pup.width, pup.height);
    pg.translate(PAD, PAD);
    pg.shadowColor = 'rgba(12,6,8,0.35)'; pg.shadowBlur = 3; pg.shadowOffsetX = 1.5; pg.shadowOffsetY = 2;
    // 手勢：0–1.8 秒舉指晃兩下，2.3 秒起攤手給女孩們看，3.8 秒再舉回來
    const offer = t >= 2.35 && t < 3.85;
    const wag = t > 0.5 && t < 1.5 ? 4 * Math.sin((t - 0.5) * Math.PI * 4) : 0;
    const arm = key(t, [[0, 0], [0.45, 6], [1.7, 6], [2.0, 0], [2.35, -30], [3.6, -30], [3.95, 4], [4.4, 0]]) + wag;
    const lean = key(t, [[0, 0], [0.5, -2.5], [1.8, -1], [2.5, -4], [3.7, -3], [4.5, 0]]);
    const nod = key(t, [[0, 0], [0.55, -3], [0.9, 1], [1.3, -1], [2.45, 3], [2.8, -2], [3.3, 0], [4.1, -2], [4.6, 0]]);
    // 頭：講話時張嘴、閉嘴交替，偶爾眨眼（閉眼那顆）
    const blink = (t > 1.92 && t < 2.1) || (t > 4.55 && t < 4.72);
    const head = blink ? 'head-content' : TALK[Math.floor(t * 12) % TALK.length] === '1' ? 'head-talk' : 'head-neutral';

    part('legs-seated', RIG['legs-seated']);
    pivot(HIP, lean, () => {
      part('body-a', RIG['body-a']);
      pivot(RIG._elbow, arm, () => {   // 舉起的手：前臂＋手繞手肘轉
        part('arm-fore-a', RIG['arm-fore-a']);
        if (offer) part('hand-palm-up', { rot: -10, s: 0.9 }, { flip: true, at: RIG._wrist, anchor: RIG['_cuff_hand-palm-up'] });
        else part('hand-point-up', RIG['hand-point-up']);
      });
      pivot(NECK, nod, () => {
        const o = RIG['head-talk'], d = RIG._headOffset[head] || [0, 0];
        part(head, { ...o, cx: o.cx + d[0] * o.s, cy: o.cy + d[1] * o.s });
      });
      part('arm-bent-near', RIG['arm-bent-near']);
      part('hand-book', RIG['hand-book']);
    });
    g.save(); shadow(g, 0.9);
    const s = P.math.s;
    g.drawImage(pup, P.math.x - PAD * s, P.math.y - PAD * s, pup.width * s, pup.height * s);
    g.restore();
  }

  // ── 三個女孩：整體坐姿＋替換頭＋托腮的手（疊在頭上） ──
  const gcan = canvas2d(700, 700), gg = gcan.getContext('2d');
  function drawGirl(n, t) {
    const R = GRIG[n], im = gp[n], P0 = P[n], M = 60;
    const head = (GIRL_ACT[n].find(([a, b]) => t >= a && t < b) || [0, 0, 'neutral'])[2];
    gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, gcan.width, gcan.height);
    gg.translate(M, M);
    gg.drawImage(im.base, 0, 0);
    const h = R.heads[head], hi = im['head-' + head];
    gg.drawImage(hi, h.x, h.y, hi.width * h.s, hi.height * h.s);
    if (im.hands) gg.drawImage(im.hands, 0, 0);
    // 呼吸：以裙擺底邊為準微微伸縮（每個人的節奏錯開）
    const br = 1 + 0.008 * Math.sin(t * 2.2 + n.length), s = P0.s;
    g.save(); shadow(g, 0.85);
    g.translate(P0.x - M * s, P0.y - M * s + (R.h + M) * s * (1 - br));
    g.drawImage(gcan, 0, 0, gcan.width * s, gcan.height * s * br);
    g.restore();
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    const act = tq % LOOP;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (paper) g.drawImage(paper, 0, 0); else g.clearRect(0, 0, W, H);
    if (!book) {                          // 鏡頭慢慢推近（只在滿版舞台）
      const z = 1 + 0.035 * ease(t / LOOP);
      g.setTransform(z, 0, 0, z, W / 2 * (1 - z), LINE * (1 - z) * 0.9);
    }
    g.fillStyle = book ? 'rgba(70,45,30,0.55)' : 'rgba(18,10,12,0.55)';
    g.fillRect(200, LINE, 1520, 3);       // 舞台水平線

    // 船整組跟著水上下、微微傾
    const bob = 4 * Math.sin(tq * Math.PI * 2 / 2.6), tilt = 0.5 * Math.sin(tq * Math.PI * 2 / 2.6 + 0.9);
    g.save();
    const dx = enter ? key(tq, [[enter[0], -1500], [enter[1], 0]]) : 0;
    g.translate(960 + dx, LINE); g.rotate(tilt * Math.PI / 180); g.translate(-960, -LINE + bob + SINK);
    for (const n of ['lorina', 'edith', 'alice']) drawGirl(n, act);   // 大姊在最後，Alice 在最前
    drawMath(act);
    const f = P.front;
    piece(img['boat-front'], f.x, f.y, f.sx, f.sy);
    // 燈籠：吊環為支點擺動，比船晚半拍
    const ringX = f.x + (522 + 23) * f.sx, ringY = f.y - img['boat-front'].height * f.sy + 31 * f.sy;
    const swing = 6 * Math.sin(t * Math.PI * 2 / 2.6 - 0.8);
    const ls = 1.2, lw = img.lantern.width * ls, lh = img.lantern.height * ls;
    const glow = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.3);
    const gx = ringX + Math.sin(-swing * Math.PI / 180) * lh * 0.6, gy = ringY + lh * 0.6;
    const rg = g.createRadialGradient(gx, gy, 4, gx, gy, 140);
    rg.addColorStop(0, `rgba(255,${book ? '190,100' : '205,130'},${(book ? 0.22 : 0.32) * glow})`); rg.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = rg; g.fillRect(gx - 150, gy - 150, 300, 300);
    g.save();
    g.translate(ringX, ringY); g.rotate(swing * Math.PI / 180);
    shadow(g, 0.8);
    g.drawImage(img.lantern, -16 * ls, 0, lw, lh);
    g.restore();
    g.restore();

    // 河面：半透明的帶子蓋住船底和槳葉，看起來泡在水裡（書頁上是淡淡的灰藍水彩）
    const wb = g.createLinearGradient(0, LINE, 0, LINE + 46);
    if (book) { wb.addColorStop(0, 'rgba(92,104,108,0.62)'); wb.addColorStop(0.7, 'rgba(110,118,116,0.4)'); wb.addColorStop(1, 'rgba(140,130,110,0)'); }
    else { wb.addColorStop(0, 'rgba(30,22,27,0.78)'); wb.addColorStop(0.7, 'rgba(36,26,30,0.6)'); wb.addColorStop(1, 'rgba(58,42,43,0)'); }
    g.fillStyle = wb;
    for (let x = 200; x < 1720; x += 10) {          // 兩端淡出，不留方角
      g.globalAlpha = ease(Math.min(x - 200, 1720 - x) / 260);
      g.fillRect(x, LINE + 2, 10.5, 46);
    }
    g.globalAlpha = 1;
    water(t, 1100);

    // 前景植物：左叢、水面睡蓮、右叢
    plants(t, 'plants-left', 250, LINE + 12, 1.3, 0);
    plants(t, 'plants-mid', 720, LINE + 26, 1.2, 1.3);
    plants(t, 'plants-right', 1490, LINE + 12, 1.3, 2.4);

    if (crop) {
      const v = view.getContext('2d');
      v.clearRect(0, 0, view.width, view.height);
      v.drawImage(stage, crop[0], crop[1], crop[2], crop[3], 0, 0, view.width, view.height);
      if (book) {                         // 左右兩端淡出，裁切處不留硬邊
        const m = v.createLinearGradient(0, 0, view.width, 0);
        m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.09, '#000'); m.addColorStop(0.91, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
        v.globalCompositeOperation = 'destination-in'; v.fillStyle = m; v.fillRect(0, 0, view.width, view.height);
        v.globalCompositeOperation = 'source-over';
      }
    }
    return view;
  }

  return { ready, draw, canvas: view, loop: LOOP };
}
