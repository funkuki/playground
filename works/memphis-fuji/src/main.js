// Fuji：孟菲斯微縮富士山。畫面是時間的決定論函數 frame(i)，t = i / FPS；網頁上用實際經過的時間換算格數播放。
import * as THREE from 'three';
import { Diorama, setHalftone, clamp01 } from './memphis.js';
import { buildWorld, PAL } from './world.js';
import { buildLife } from './life.js';

const FPS = 60;
const LOOP = 40;                                 // 一圈 40 秒，所有週期性的動態都整除它，接得回開頭
const mobile = matchMedia('(max-width: 700px)').matches;

if (new URLSearchParams(location.search).has('shot')) document.body.classList.add('shot');   // 截封面用

const canvas = document.getElementById('gl');
const dio = new Diorama(canvas, { shadowSize: mobile ? 2048 : 4096 });
dio.scene.background = new THREE.Color(PAL.grass);
setHalftone(1);
const world = buildWorld(dio.scene);
const life = buildLife(world, LOOP);

// ---------- 版面：外框和下方三行字的位置（CSS 像素）----------
const caption = document.getElementById('caption');
const tools = document.getElementById('tools');
const L = { cx: 0, cy: 0, hw: 0, hh: 0 };
// 圖說最寬那一行的寬度：和右下角的按鈕撞到時，外框和圖說一起往上讓一排
function captionWidth() {
  const r = document.createRange();
  return Math.max(...[...caption.querySelectorAll('p')].map((p) => { r.selectNodeContents(p); return r.getBoundingClientRect().width; }));
}
function layout() {
  const w = innerWidth, h = innerHeight, narrow = w < 700;
  const clash = w / 2 + captionWidth() / 2 + 12 > w - 14 - tools.offsetWidth;
  const top = narrow ? 64 : 72, capH = (narrow ? 128 : 124) + (clash ? 50 : 0), side = narrow ? 14 : Math.max(36, w * 0.055);
  const avail = h - top - capH;
  L.hw = (w - 2 * side) / 2;
  // 手機直向：外框接近正方形，放在可用空間的中間；不要拉成細長條
  L.hh = Math.max(80, Math.min(avail / 2, narrow ? L.hw * 1.12 : Infinity));
  L.cx = w / 2; L.cy = top + avail / 2;
  L.narrow = narrow;
  const k = Math.min(1, Math.max(0.42, Math.min(w, h * 1.5) / 1500));
  const dpr = Math.min(devicePixelRatio || 1, 2);
  dio.setSize(w, h, dpr, dpr >= 2 ? 1 : 2);
  dio.setFrame(L.cx, L.cy, L.hw, L.hh, k);
  caption.style.top = `${L.cy + L.hh + (narrow ? 16 : 20)}px`;
}
addEventListener('resize', layout);
layout();
document.fonts?.ready.then(layout);   // 字型載完圖說會變寬，重算一次

// ---------- 使用者的視角調整：拖曳轉、滾輪／雙指縮放；放手幾秒後慢慢回到自動運鏡 ----------
const view = { az: 0, el: 0, zoom: 1, pan: new THREE.Vector3(), last: -1e9 };
const D2R = THREE.MathUtils.degToRad;
function relax(dtMs) {
  if (performance.now() - view.last < 3500) return;
  const k = Math.exp(-dtMs / 1000 * 0.9);
  view.az *= k; view.el *= k; view.zoom = 1 + (view.zoom - 1) * k; view.pan.multiplyScalar(k);
}

// ---------- 鏡頭：從高處慢慢左右擺、微微推近，40 秒回到原位 ----------
const TARGET = new THREE.Vector3(8, 18, -6);
const TAN_H = Math.tan(THREE.MathUtils.degToRad(15)) * 2.05;   // 外框要水平看得到這麼寬（手機上允許裁掉兩側一些）
const _tg = new THREE.Vector3();
function camera(t) {
  const u = (t % LOOP) / LOOP * Math.PI * 2;
  const az = D2R(6 + 15 * Math.sin(u)) + view.az;
  const el = THREE.MathUtils.clamp(D2R(35 + 3 * Math.sin(u * 2 + 0.6)) + view.el, D2R(16), D2R(72));   // 不會低到穿進山或地面
  let dist = (238 - 20 * (0.5 - 0.5 * Math.cos(u))) * view.zoom;   // 慢推再退回
  // 外框比例不同（手機直向）就把視角或距離放大，讓湖和山都收得進來
  const A = L.hw / L.hh;
  let tanV = Math.max(Math.tan(THREE.MathUtils.degToRad(16.5)), TAN_H * (L.narrow ? 0.72 : 1) / A);
  const maxV = Math.tan(THREE.MathUtils.degToRad(21));
  if (tanV > maxV) { dist *= tanV / maxV; tanV = maxV; }
  const cam = dio.cam, w = innerWidth, h = innerHeight;
  cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV * h / (2 * L.hh)));
  cam.aspect = w / h;
  const tg = _tg.copy(TARGET).add(view.pan);
  cam.position.set(tg.x + Math.sin(az) * Math.cos(el) * dist, tg.y + Math.sin(el) * dist, tg.z + Math.cos(az) * Math.cos(el) * dist);
  cam.lookAt(tg);
  cam.setViewOffset(w, h, 0, h / 2 - L.cy, w, h);   // 把畫面中心挪到外框中心
  cam.updateProjectionMatrix();
}

// ---------- 一格 ----------
let snapWanted = false;   // 按了相機：這一格畫完就剪下來做卡片
function frame(i) {
  const t = i / FPS;
  life.update(t);
  camera(t);
  dio.fitShadow(new THREE.Vector3(0, 0, 0), 175);
  // 開場：外框從中間長開
  const grow = 60 + 2400 * Math.pow(clamp01(t / 1.4), 1.6);
  dio.render(t, i, { grow });
  if (snapWanted) { snapWanted = false; makeCard(grabFrame()); }
  caption.style.opacity = String(clamp01((t - 0.8) / 0.8));
}

// ---------- 播放：用實際經過的時間換算格數 ----------
const t0 = performance.now();
let nowT = 0, prev = t0;
function loop(now) {
  now = now ?? performance.now();
  relax(now - prev); prev = now;
  const i = Math.floor((now - t0) / 1000 * FPS);
  nowT = i / FPS;
  frame(i);
  requestAnimationFrame(loop);
}
loop();

// ---------- 互動 ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const KINDS = new Set(['fuji', 'house', 'pagoda', 'tree', 'water']);
function pickAt(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  dio.cam.updateMatrixWorld();
  ray.setFromCamera(ndc, dio.cam);
  const hit = ray.intersectObjects(world.clickables, false)[0];
  if (!hit) return null;
  for (let o = hit.object; o; o = o.parent) if (KINDS.has(o.userData.kind)) return { kind: o.userData.kind, ref: o.userData.ref, point: hit.point };
  return null;
}
// 縮放時朝游標（或兩指中點）底下的地面拉近，而不是只朝畫面中心
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _g = new THREE.Vector3();
function zoomTo(z1, x, y) {
  z1 = THREE.MathUtils.clamp(z1, 0.45, 1.45);
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  dio.cam.updateMatrixWorld(); ray.setFromCamera(ndc, dio.cam);
  if (ray.ray.intersectPlane(ground, _g)) {
    const f = 1 - z1 / view.zoom;
    view.pan.x += (_g.x - TARGET.x - view.pan.x) * f; view.pan.z += (_g.z - TARGET.z - view.pan.z) * f;
    view.pan.clampLength(0, 130);
  }
  view.zoom = z1;
}
// 只在外框裡面算數
const inFrame = (x, y) => Math.abs(x - L.cx) < L.hw && Math.abs(y - L.cy) < L.hh;

const pts = new Map();
let down = null, pinch0 = 0, zoom0 = 1;
canvas.addEventListener('pointerdown', (e) => {
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { canvas.setPointerCapture(e.pointerId); } catch { /* 有些合成或已結束的指標不能 capture，不影響操作 */ }
  if (pts.size === 1) down = { x: e.clientX, y: e.clientY, time: performance.now(), moved: 0 };
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = view.zoom; if (down) down.moved = 99; }
  view.last = performance.now(); hideHint();
});
canvas.addEventListener('pointermove', (e) => {
  if (!pts.has(e.pointerId)) { hover(e); return; }
  const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (pts.size === 1) {
    view.az -= dx * 0.006; view.el += dy * 0.004;
    if (down) down.moved += Math.abs(dx) + Math.abs(dy);
  } else if (pts.size === 2) {
    const [a, b] = [...pts.values()];
    zoomTo(zoom0 * pinch0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  view.last = performance.now();
});
const up = (e) => {
  if (!pts.has(e.pointerId)) return;
  pts.delete(e.pointerId);
  if (down && pts.size === 0 && down.moved < 8 && performance.now() - down.time < 450 && inFrame(e.clientX, e.clientY)) {
    const hit = pickAt(e.clientX, e.clientY);
    if (hit) life.poke(hit.kind, hit.ref, hit.point, nowT);
  }
  if (pts.size === 0) down = null;
  view.last = performance.now();
};
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomTo(view.zoom * Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY);
  view.last = performance.now(); hideHint();
}, { passive: false });
// 滑到可以點的東西上，游標變成手指
let hoverAt = 0;
function hover(e) {
  if (e.pointerType !== 'mouse') return;
  const now = performance.now(); if (now - hoverAt < 90) return; hoverAt = now;
  canvas.style.cursor = inFrame(e.clientX, e.clientY) && pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
}

// 白天／黃昏
const duskBtn = document.getElementById('dusk');
duskBtn.addEventListener('click', () => {
  const on = life.toggleDusk(nowT);
  duskBtn.setAttribute('aria-pressed', String(on));
  duskBtn.querySelector('span').textContent = on ? '白天' : '黃昏';
  hideHint();
});

// ---------- 相機：照節氣圖鑑的做法，把現在這一格和圖說排成一張卡片，先給人看，再存圖或分享 ----------
const TAU = Math.PI * 2;
const SEASON_CARD = [   // 季節名、英文、強調色、底色
  ['春', 'Spring', '#E85D8C', '#FFE6EE'], ['夏', 'Summer', '#178F55', '#DDF5E6'],
  ['秋', 'Autumn', '#E8612C', '#FFE6D9'], ['冬', 'Winter', '#2E5BE6', '#E3EAFA'],
];
let cardURL = '', cardSeason = 0, cardDusk = false;
const $ = (q) => document.querySelector(q);
const cardEl = $('#card'), cardImg = cardEl.querySelector('img');
$('#snap').addEventListener('click', () => {
  snapWanted = true;   // 下一格畫完馬上剪下來（WebGL 沒開 preserveDrawingBuffer）
  const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  hideHint();
});
// 剪下外框裡的畫面
function grabFrame(w = 1400) {
  const k = canvas.width / innerWidth, m = 14;
  const sx = (L.cx - L.hw - m) * k, sy = (L.cy - L.hh - m) * k, sw = (L.hw + m) * 2 * k, sh = (L.hh + m) * 2 * k;
  const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * sh / sw);
  const x = c.getContext('2d'); x.fillStyle = '#FFFCF6'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(canvas, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}
function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.roundRect(X, Y, w, h, r); }
async function makeCard(shot) {
  await document.fonts.ready;
  cardSeason = life.season(); cardDusk = duskBtn.getAttribute('aria-pressed') === 'true';
  const [zh, en, mo] = SEASON_TEXT[cardSeason], [sz, se, acc, tint] = SEASON_CARD[cardSeason];
  const W = 1080, P = 64, iw = W - P * 2, ih = Math.round(iw * shot.height / shot.width);
  const H = P + ih + 500;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const SANS = '"Noto Sans TC", "PingFang TC", sans-serif', EN = '"Inter Tight", "Noto Sans TC", sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';
  x.fillStyle = '#FFFCF6'; x.fillRect(0, 0, W, H);
  x.drawImage(shot, P, P, iw, ih);
  let y = P + ih + 72;
  // 季節的小膠囊、月份；黃昏時多一顆
  x.textBaseline = 'alphabetic';
  x.font = `600 24px ${EN}`; const pill = `${sz} ${se}`, pw = x.measureText(pill).width + 32;
  x.fillStyle = tint; roundRect(x, P, y - 30, pw, 42, 21); x.fill(); x.fillStyle = acc; x.fillText(pill, P + 16, y);
  let cx = P + pw + 14;
  if (cardDusk) {
    const dl = '黃昏 Dusk', dw = x.measureText(dl).width + 32;
    x.fillStyle = '#FFE9DC'; roundRect(x, cx, y - 30, dw, 42, 21); x.fill(); x.fillStyle = '#D9653B'; x.fillText(dl, cx + 16, y);
    cx += dw + 14;
  }
  x.font = `500 26px ${MONO}`; x.fillStyle = '#8D8AA0'; x.fillText(mo, cx + 6, y);
  // 地名
  y += 104;
  x.font = `600 76px ${SANS}`; x.fillStyle = '#2B2840'; x.fillText('富士山・河口湖', P - 4, y);
  y += 54;
  x.font = `400 32px ${EN}`; x.fillStyle = '#8D8AA0'; x.fillText('Mt. Fuji & Lake Kawaguchi', P, y);
  // 這一季的一句話
  y += 72;
  x.font = `400 30px ${SANS}`; x.fillStyle = '#5A5670'; x.fillText(zh, P, y);
  y += 42;
  x.font = `400 24px ${EN}`; x.fillStyle = '#8D8AA0'; x.fillText(en, P, y);
  y += 58;
  x.font = `400 24px ${MONO}`; x.fillStyle = '#B7B4C6'; x.fillText('35.3606° N   138.7274° E', P, y);
  // 底部：三個孟菲斯小符號和網址
  const fy = H - 52;
  x.fillStyle = '#FFC93C'; x.beginPath(); x.arc(P + 10, fy - 8, 10, 0, TAU); x.fill();
  x.fillStyle = '#FF7FAA'; x.beginPath(); x.moveTo(P + 32, fy + 2); x.lineTo(P + 43, fy - 18); x.lineTo(P + 54, fy + 2); x.fill();
  x.strokeStyle = '#2E5BE6'; x.lineWidth = 4; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(P + 66, fy - 8); x.lineTo(P + 74, fy - 15); x.lineTo(P + 83, fy - 1); x.lineTo(P + 92, fy - 8); x.stroke();
  x.font = `400 22px ${MONO}`; x.fillStyle = '#B7B4C6'; x.textAlign = 'right'; x.fillText('sui.funkuki.com/playground', W - P, fy); x.textAlign = 'left';
  cardURL = c.toDataURL('image/png');
  cardImg.src = cardURL;
  cardEl.classList.add('open'); cardEl.setAttribute('aria-hidden', 'false'); $('#card-save').focus();
}
const cardName = () => `富士山-${SEASON_CARD[cardSeason][0]}${cardDusk ? '-黃昏' : ''}.png`;
function closeCard() { cardEl.classList.remove('open'); cardEl.setAttribute('aria-hidden', 'true'); $('#snap').focus(); }
$('#card-save').addEventListener('click', () => { const a = document.createElement('a'); a.href = cardURL; a.download = cardName(); a.click(); });
$('#card-close').addEventListener('click', closeCard);
cardEl.addEventListener('click', (e) => { if (e.target === cardEl) closeCard(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && cardEl.classList.contains('open')) closeCard(); });
// 手機上可以直接分享到相簿或其他 app
if (navigator.canShare && navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] })) {
  const sh = $('#card-share'); sh.hidden = false;
  sh.addEventListener('click', async () => {
    const blob = await (await fetch(cardURL)).blob();
    try { await navigator.share({ files: [new File([blob], cardName(), { type: 'image/png' })], title: '富士山・河口湖 · Fuji' }); } catch { /* 使用者取消分享 */ }
  });
}

// 四季：按了就從富士山推一圈波紋換季，圖說的第二、三行淡出再換字淡入
const SEASON_TEXT = [
  ['春・湖畔櫻花開了，山頂還留著雪', 'Spring · cherry blossoms by the lake, snow still on the summit', 'APR'],
  ['夏・山頂的雪化了，薰衣草開滿北岸', 'Summer · the snow is gone, lavender along the north shore', 'AUG'],
  ['秋・楓葉轉紅，山頂下了第一場雪', 'Autumn · maples turn red under the first snow on the summit', 'NOV'],
  ['冬・雪落在屋頂上，整座山都白了', 'Winter · snow on the roofs, the whole mountain in white', 'JAN'],
];
const l2 = caption.querySelector('.l2'), l3 = caption.querySelector('.l3');
let swapTimer = 0;
for (const b of document.querySelectorAll('#seasons button')) {
  b.addEventListener('click', () => {
    const i = Number(b.dataset.s);
    life.changeSeason(i, nowT);
    for (const o of document.querySelectorAll('#seasons button')) o.setAttribute('aria-pressed', String(o === b));
    l2.classList.add('swap'); l3.classList.add('swap');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      const [zh, en, mo] = SEASON_TEXT[i], sp = l2.querySelectorAll(':scope > span:not(.sep)');
      sp[0].textContent = zh; sp[1].textContent = en; l3.querySelector('.mo').textContent = mo;
      l2.classList.remove('swap'); l3.classList.remove('swap');
    }, 380);
    hideHint();
  });
}

// 網址可以直接指定開場的季節和黃昏（?season=0~3、?dusk），截封面和錄預覽用
{
  const q = new URLSearchParams(location.search), i = Number(q.get('season'));
  if (i >= 1 && i <= 3) {
    life.changeSeason(i, 0, true);
    for (const o of document.querySelectorAll('#seasons button')) o.setAttribute('aria-pressed', String(Number(o.dataset.s) === i));
    const [zh, en, mo] = SEASON_TEXT[i], sp = l2.querySelectorAll(':scope > span:not(.sep)');
    sp[0].textContent = zh; sp[1].textContent = en; l3.querySelector('.mo').textContent = mo;
  }
  if (q.has('dusk')) { life.toggleDusk(-10); duskBtn.setAttribute('aria-pressed', 'true'); duskBtn.querySelector('span').textContent = '白天'; }
}

// 操作提示：幾秒後或第一次操作就淡出
const hint = document.getElementById('hint');
function hideHint() { hint.classList.add('gone'); }
setTimeout(hideHint, 9000);
