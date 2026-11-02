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
const L = { cx: 0, cy: 0, hw: 0, hh: 0 };
function layout() {
  const w = innerWidth, h = innerHeight, narrow = w < 700;
  const top = narrow ? 64 : 72, capH = narrow ? 128 : 124, side = narrow ? 14 : Math.max(36, w * 0.055);
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
function frame(i) {
  const t = i / FPS;
  life.update(t);
  camera(t);
  dio.fitShadow(new THREE.Vector3(0, 0, 0), 175);
  // 開場：外框從中間長開
  const grow = 60 + 2400 * Math.pow(clamp01(t / 1.4), 1.6);
  dio.render(t, i, { grow });
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

// 操作提示：幾秒後或第一次操作就淡出
const hint = document.getElementById('hint');
function hideHint() { hint.classList.add('gone'); }
setTimeout(hideHint, 9000);
