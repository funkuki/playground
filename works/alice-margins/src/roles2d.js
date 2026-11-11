// 第十幕荒誕照出現實的 2D 紙偶場景：三個穿灰色長外套、一模一樣的大人站成一排；
// 金冠、大高帽、兔耳朵從上方一個個掉下來，落在三個大人頭上彈一下；7.6 秒大人們挺起胸膛，
// 接著各自不自覺地做出那個角色的招牌動作（伸手指人、端茶、看懷錶）；最後鏡頭往後退，拉開一點距離。
// 素材在 public/works/alice-margins/art/adult-parts/（本幕用 gpt-image 生成：同一個大人的五個全身姿勢和三種頭飾，
// rig.json 是各姿勢的腳底、頭頂位置），植物沿用 props6/。
// draw(t) 只由 t 決定（本幕內的秒數），可以任意 seek。
import { ease, key, canvas2d, loadImg, paperCanvas } from './boat2d.js';

const W = 1920, H = 1080;
const LINE = 800;                       // 舞台水平線（和第一幕一樣）
const FIT = 0.72;                       // 整個舞台以水平線中點縮小，左右上下留出和第一幕一樣的空間
const SHADOW = 'rgba(12,6,8,0.55)';

const bounceOut = (x) => {
  x = Math.min(Math.max(x, 0), 1);
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
const backOut = (x) => { x = Math.min(Math.max(x, 0), 1); const c = 2.2; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

const S = 0.4;                         // 大人的大小
// 三個大人：腳底 x、頭飾（大小、落在頭上的時間）、之後做的招牌動作
const ADULTS = [
  { x: 560, hat: 'crown', hs: 0.34, land: 2.6, act: 'point', at: 9.6 },
  { x: 960, hat: 'tophat', hs: 0.27, land: 3.7, act: 'tea', at: 10.3 },
  { x: 1360, hat: 'ears', hs: 0.42, land: 4.8, act: 'watch', at: 11.0 },
];
const FALL = 0.9;                       // 頭飾掉下來的時間
const PROUD = 7.6;                      // 挺起胸膛
const BACK = [11.6, 14.5];              // 鏡頭往後退

const POSES = ['stand', 'proud', 'point', 'watch', 'tea'];
const HATS = ['crown', 'tophat', 'ears'];
const PLANTS = ['grass', 'fern', 'bell', 'mush1', 'sprig', 'bush-ol', 'stone2'];

export function rolesScene({ base = './art/' } = {}) {
  const ap = {}, pl = {}, RIG = {};
  const ready = Promise.all([
    ...[...POSES, ...HATS].map(async (n) => { ap[n] = await loadImg(`${base}adult-parts/${n}.webp`); }),
    ...PLANTS.map(async (n) => { pl[n] = await loadImg(`${base}props6/${n}.webp`); }),
    fetch(`${base}adult-parts/rig.json`).then((r) => r.json()).then((j) => Object.assign(RIG, j)),
  ]);

  const stage = canvas2d(W, H), g = stage.getContext('2d');
  const paper = paperCanvas(W, H);
  const shadow = (ctx, k) => {
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 12 * k; ctx.shadowOffsetX = 4.5 * k; ctx.shadowOffsetY = 7 * k;
  };

  // 植物：水平切條，越高偏移越多（風吹）
  function plant(t, n, x, s, phase) {
    const im = pl[n], h = im.height, step = 3;
    g.save(); shadow(g, 0.7);
    for (let y = 0; y < h; y += step) {
      const k = Math.pow(1 - y / h, 2);
      const dx = k * 6 * Math.sin(t * 1.5 + phase) + k * 2 * Math.sin(t * 3.7 + phase * 2);
      g.drawImage(im, 0, y, im.width, step, x + dx, LINE + 6 - (h - y) * s, im.width * s, step * s + 0.6);
    }
    g.restore();
  }

  // 一個大人：換整個姿勢，腳底固定；頭飾畫在同一個座標系裡，跟著身體晃
  function adult(t, a, i) {
    let p = 'stand';
    if (t >= a.at) p = a.act;
    else if (t >= PROUD) p = 'proud';
    const o = RIG.poses[p], im = ap[p];
    // 換姿勢時壓扁一下再彈回來
    const since = Math.min(...[PROUD, a.at].map((s) => (t >= s ? t - s : 99)));
    const pop = since < 0.3 ? 0.05 * Math.sin(since / 0.3 * Math.PI) : 0;
    // 頭飾落下時整個人被壓一下
    const hit = t >= a.land + FALL * 0.36 && t < a.land + FALL * 0.36 + 0.25 ? 0.06 * Math.sin((t - a.land - FALL * 0.36) / 0.25 * Math.PI) : 0;
    const sway = 0.8 * Math.sin(t * (1.6 + i * 0.2) + i);
    const breathe = 1 + 0.006 * Math.sin(t * 2.1 + i);
    g.save(); shadow(g, 1);
    g.translate(a.x, LINE); g.rotate(sway * Math.PI / 180);
    g.scale(S * (1 + pop + hit * 0.5), S * (1 - pop - hit) * breathe);
    g.drawImage(im, -o.foot, -o.bottom);
    // 頭飾：從上方掉下來（bounce），落定後坐在頭頂；挺胸時頭往後仰，頭飾跟著轉
    if (t >= a.land) {
      const hi = ap[a.hat], hr = RIG.hats[a.hat], u = (t - a.land) / FALL;
      const hx = o.topx - o.foot, hy = o.top + 58 - o.bottom;
      const drop = (1 - bounceOut(u)) * -1400;
      const tilt = p === 'proud' ? -9 : p === 'tea' ? -6 : p === 'point' || p === 'watch' ? 4 : 0;
      const wob = u < 1.4 ? 0 : 1.5 * Math.sin(t * 2.4 + i);
      g.save(); g.translate(hx, hy + drop); g.rotate((tilt + wob) * Math.PI / 180); g.scale(a.hs, a.hs);
      g.drawImage(hi, -hi.width / 2, -hr.bottom);
      g.restore();
    }
    g.restore();
  }

  function draw(t) {
    const tq = Math.floor(t * 12) / 12;   // 角色一拍二
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(paper, 0, 0);
    // 鏡頭：先慢慢推近，最後往後退一點，留出看清楚的距離
    const z = 1 + 0.04 * ease(t / BACK[0]) - 0.1 * ease((t - BACK[0]) / (BACK[1] - BACK[0]));
    g.setTransform(z, 0, 0, z, W / 2 * (1 - z), LINE * (1 - z) * 0.9);
    g.fillStyle = 'rgba(18,10,12,0.55)';
    g.fillRect(200, LINE, 1520, 3);       // 舞台水平線（和第一幕同長）
    g.translate(W / 2, LINE); g.scale(FIT, FIT); g.translate(-W / 2, -LINE);

    plant(t, 'grass', 300, 0.5, 0.4);
    plant(t, 'bell', 740, 0.45, 1.3);
    plant(t, 'mush1', 1150, 0.45, 2.1);
    plant(t, 'bush-ol', 1560, 0.5, 2.9);
    ADULTS.forEach((a, i) => adult(tq, a, i));
    plant(t, 'fern', 400, 0.42, 1.7);
    plant(t, 'sprig', 1230, 0.42, 0.6);
    plant(t, 'stone2', 1500, 0.55, 0);
    return stage;
  }

  return { ready, draw, canvas: stage, loop: 15 };
}
