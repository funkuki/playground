// 節氣圖鑑：一頁一個節氣。左（手機是上）是一張會動的孟菲斯微縮插畫，右（下）是文字頁。
// 畫面是時間的決定論函數 frame(i)，t = i / FPS；網頁上用實際經過的時間換算格數播放。
// 翻頁：拖曳時外框跟著手指收起來，放手超過門檻就翻過去，下一頁的外框從中間長開（STYLE.md §6 的轉場）。
import * as THREE from 'three';
import { Diorama, setHalftone, setNight, setDusk, setLamps, setWave, setSeason, clamp01, ease } from './memphis.js';
import { TERMS, SEASONS, IRO, schedule } from './terms.js';
import { wa } from './wairo.js';

const FPS = 60, LOOP = 30;
const TAU = Math.PI * 2, D2R = THREE.MathUtils.degToRad;
const SCENES = {
  lixia: () => import('./scenes/lixia.js'),
  xiaoman: () => import('./scenes/xiaoman.js'),
  mangzhong: () => import('./scenes/mangzhong.js'),
  xiazhi: () => import('./scenes/xiazhi.js'),
  xiaoshu: () => import('./scenes/xiaoshu.js'),
  dashu: () => import('./scenes/dashu.js'),
  liqiu: () => import('./scenes/liqiu.js'),
  chushu: () => import('./scenes/chushu.js'),
  bailu: () => import('./scenes/bailu.js'),
  qiufen: () => import('./scenes/qiufen.js'),
  hanlu: () => import('./scenes/hanlu.js'),
  shuangjiang: () => import('./scenes/shuangjiang.js'),
  lidong: () => import('./scenes/lidong.js'),
  xiaoxue: () => import('./scenes/xiaoxue.js'),
  daxue: () => import('./scenes/daxue.js'),
  dongzhi: () => import('./scenes/dongzhi.js'),
  xiaohan: () => import('./scenes/xiaohan.js'),
  dahan: () => import('./scenes/dahan.js'),
  sketch: () => import('./scenes/sketch.js'),
};
const shot = new URLSearchParams(location.search).has('shot');
if (shot) document.body.classList.add('shot');

const canvas = document.getElementById('gl');
const mobile = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const dio = new Diorama(canvas, { shadowSize: mobile ? 2048 : 4096 });
setHalftone(1);
dio.scene.background = new THREE.Color('#FFFCF6');
const { list: DATES, now: NOW, today: TODAY } = schedule();

// ---------- 版面 ----------
const $ = (s) => document.querySelector(s);
const caption = $('#caption'), sheet = $('#sheet'), page = $('#page'), index = $('#index'), hint = $('#hint');
const L = { cx: 0, cy: 0, hw: 0, hh: 0, cw: 0, ch: 0, wide: true, k: 1 };
let cur = -1;
function layout() {
  const w = innerWidth, h = innerHeight, wide = w >= 900 && w > h * 1.1;
  L.wide = wide;
  document.body.classList.toggle('wide', wide); document.body.classList.toggle('narrow', !wide);
  let cw, ch;
  if (wide) {
    cw = shot ? w : Math.round(w * 0.6); ch = h;                // 截封面時插畫占滿整個畫面
    const top = shot ? 50 : 70, bottom = shot ? 50 : 158, side = Math.max(32, cw * 0.05);
    L.hw = (cw - side * 1.6) / 2; L.hh = Math.max(120, (ch - top - bottom) / 2);
    L.cx = side * 0.8 + L.hw; L.cy = top + L.hh;
    Object.assign(sheet.style, { left: `${cw}px`, top: '0', width: `${w - cw}px`, height: `${h}px`, padding: `78px ${Math.max(28, (w - cw) * 0.1)}px 48px 12px` });
    Object.assign(index.style, { left: '0', width: `${cw}px`, top: `${h - 42}px`, height: '36px' });
    caption.style.cssText = `left:0;width:${cw}px;top:${L.cy + L.hh + 18}px`;
    for (const [id, x] of [['#prev', L.cx - L.hw - 4], ['#next', L.cx + L.hw - 40]]) Object.assign($(id).style, { left: `${x}px`, top: `${L.cy}px` });
  } else {
    cw = w; ch = Math.round(Math.min(h * 0.55, w * 1.12 + 110));
    const top = 58, bottom = 64, side = 12;
    L.hw = (cw - side * 2) / 2; L.hh = Math.max(90, (ch - top - bottom) / 2);
    L.cx = cw / 2; L.cy = top + L.hh;
    Object.assign(sheet.style, { left: '0', top: `${ch + 36}px`, width: `${w}px`, height: `${h - ch - 36}px`, padding: '6px 22px 40px' });
    Object.assign(index.style, { left: '0', width: `${w}px`, top: `${ch - 4}px`, height: '40px' });
    caption.style.cssText = `left:0;width:${cw}px;top:${L.cy + L.hh + 8}px`;
  }
  Object.assign(canvas.style, { width: `${cw}px`, height: `${ch}px` });
  L.cw = cw; L.ch = ch;
  L.k = Math.min(1, Math.max(0.42, Math.min(cw, ch * 1.5) / 1500));
  const dpr = Math.min(devicePixelRatio || 1, 2);
  dio.setSize(cw, ch, dpr, dpr >= 2 ? 1 : 2);
  dio.setFrame(L.cx, L.cy, L.hw, L.hh, L.k);
  Object.assign(hint.style, { left: `${L.cx}px`, top: `${L.wide ? 70 : L.cy + L.hh - 44}px` });
  if (cur >= 0) renderCaption(cur);
}
// 外框完全打開時「長開」的半徑（設計單位）
const fullGrow = () => Math.hypot(L.hw, L.hh) / L.k + 260;

// ---------- 場景：翻到才建立，前後兩頁在空檔先建好 ----------
const built = new Map();      // 頁碼 → Promise<scene>
function sceneFor(i) {
  if (!built.has(i)) {
    const T = TERMS[i];
    built.set(i, SCENES[T.scene || 'sketch']().then((mod) => {
      const W = new THREE.Group();
      const s = mod.default(W, { LOOP, term: T, season: T.season });
      s.W = W; s.clickables = s.clickables || [];
      return s;
    }));
  }
  return built.get(i);
}
function dispose(s) {
  s.W.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); });
}
function prune(c) {
  for (const [i, p] of built) {
    const d = Math.min((i - c + 24) % 24, (c - i + 24) % 24);
    if (d > 1) { built.delete(i); p.then((s) => { if (s !== active) dispose(s); }); }
  }
}
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
function preload(c) {
  for (const d of [1, -1]) idle(() => sceneFor((c + d + 24) % 24), { timeout: 1500 });
}

let active = null, nowT = 0;
function activate(s) {
  if (active) dio.scene.remove(active.W);
  active = s; dio.scene.add(s.W);
  dio.scene.background = new THREE.Color(wa(s.bg || '#A5EBAA'));
  setNight(s.night || 0); setDusk(s.dusk || 0); setLamps(s.lamps || []); setWave(1e5); setSeason(0, 0, -1);
  s.enterT = nowT;
}

// ---------- 鏡頭：每頁一個構圖，慢慢左右擺、微微推近；使用者滾輪縮放後幾秒慢慢回位 ----------
const view = { zoom: 1, last: -1e9 };
const _tg = new THREE.Vector3();
function camera(t, v) {
  const u = (t / LOOP) * TAU;
  const az = D2R(v.az + (v.swing ?? 7) * Math.sin(u));
  const el = D2R(v.el + 2.5 * Math.sin(u * 2 + 0.6));
  const A = L.hw / L.hh;
  let tanH = 0.27, tanV = tanH / A;
  if (tanV > 0.36) { tanV = 0.36; tanH = tanV * A; }
  const span = v.span * (L.wide ? 1 : 0.86);
  const dist = span / tanH * view.zoom * (1 - 0.05 * (0.5 - 0.5 * Math.cos(u)));
  const cam = dio.cam, w = L.cw, h = L.ch;
  cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV * h / (2 * L.hh)));
  cam.aspect = w / h;
  cam.near = Math.max(1, dist * 0.05); cam.far = dist * 6;
  const tg = _tg.set(...v.target);
  cam.position.set(tg.x + Math.sin(az) * Math.cos(el) * dist, tg.y + Math.sin(el) * dist, tg.z + Math.cos(az) * Math.cos(el) * dist);
  cam.lookAt(tg);
  cam.setViewOffset(w, h, w / 2 - L.cx, h / 2 - L.cy, w, h);
  cam.updateProjectionMatrix();
}
function relax(dtMs) {
  if (performance.now() - view.last < 3500) return;
  view.zoom = 1 + (view.zoom - 1) * Math.exp(-dtMs / 1000 * 0.9);
}

// ---------- 翻頁的狀態 ----------
// mode：idle 平常｜drag 手指拖著｜close 外框收起中｜wait 等下一頁建好｜open 外框長開中｜back 沒翻過去，彈回
const flip = { mode: 'wait', p: 0, p0: 0, dir: 1, sign: 1, T: 0, target: -1 };
const DUR = { close: 0.32, open: 1.0, back: 0.28 };
function go(to, dir) {
  to = (to + 24) % 24;
  if (to === cur && flip.mode !== 'drag') return;
  if (flip.mode === 'wait') return;
  flip.target = to; flip.dir = dir; flip.p0 = flip.mode === 'drag' ? Math.abs(flip.p) : 0; flip.mode = 'close'; flip.T = nowT;
  sceneFor(to); hideHint();
}
const next = () => go(cur + 1, 1), prev = () => go(cur - 1, -1);

function setPage(i) {
  cur = i;
  const T = TERMS[i];
  renderText(i);
  history.replaceState(null, '', `#${T.id}`);
  dotEls.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  document.title = `${T.zh} ${T.en} · 節氣圖鑑 · sui's playground`;
  prune(i); preload(i);
}

// ---------- 文字頁 ----------
const pad = (n) => String(n).padStart(2, '0');
const md = (d) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 季節色（和色）：春 常磐色、夏 山吹色、秋 茜色、冬 露草色；tint 是同色系的淡色
const ACCENT = { spring: ['#3F8C6B', '#E3F1E8'], summer: ['#B58A2E', '#FBF0D6'], autumn: ['#C7594E', '#FBE7E2'], winter: ['#4F6FB5', '#E6ECF7'] };
function renderText(i) {
  const T = TERMS[i], S = SEASONS[T.season], D = DATES[i];
  const days = Math.round((D.end - D.start) / 86400000) + 1;
  const until = Math.round((D.start - TODAY) / 86400000);
  const when = i === NOW ? '就是現在' : until > 0 && until < 60 ? `還有 ${until} 天` : '';
  const root = document.documentElement.style;
  root.setProperty('--accent', ACCENT[T.season][0]); root.setProperty('--tint', ACCENT[T.season][1]);
  const [iName, iKana, iHex, iWhy] = IRO[T.id];
  const iro = `<span class="iro" title="${esc(iWhy)}"><i style="background:${iHex}"></i><b lang="ja">${esc(iName)}<small>${esc(iKana)}</small></b><code>${iHex}</code></span>`;
  const hou = T.hou.map((h, k) => `<li><i>${k + 1}</i><b lang="ja">${esc(h)}<small>${esc(T.ja[k])}</small></b><span>${esc(T.houNote[k])}</span></li>`).join('');
  const story = T.story
    ? `<section class="story"><h2>${esc(T.place)}<small class="place-en">${esc(T.placeEn)}</small></h2>${T.story.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
       <aside class="card"><h3>${esc(T.card.title)}</h3><p>${esc(T.card.body)}</p></aside>`
    : `<section class="story sketch"><h2>${esc(T.place)}<small class="place-en">${esc(T.placeEn)}</small></h2><p>${esc(T.teaser)}</p>
       <p>這一頁的插畫和故事還在畫。目前畫好的是夏天、秋天和冬天的十八頁（立夏到大寒），春天的六頁之後補上。</p></section>`;
  page.innerHTML = `
    <div class="kicker"><span class="no">${pad(i + 1)}</span><span>/ 24</span><span class="sea">${S.zh} ${S.en}</span><span class="when">${when}</span></div>
    <h1><span class="zh">${T.zh}</span><span class="en">${esc(T.en)}</span>${iro}</h1>
    <dl class="period">
      <dt>期間</dt><dd>${D.start.getFullYear()}.${md(D.start)} – ${md(D.end)}<small>約 ${days} 天</small></dd>
      <dt>黃經</dt><dd>${T.lon}°<small>太陽在黃道上的位置，每 15° 一個節氣</small></dd>
    </dl>
    <section class="hou"><h2>三候<small>日本七十二候</small></h2><ol>${hou}</ol>${T.tw ? `<p class="tw"><b>在台灣</b>${esc(T.tw)}</p>` : ''}</section>
    ${story}
    <p class="credit">日期由公式推算，可能差一天。</p>`;
  sheet.scrollTop = 0;
  renderCaption(i);
}
function renderCaption(i) {
  const T = TERMS[i], D = DATES[i];
  const lat = T.lat ? `${T.lat.toFixed(2)}°N ${T.lng.toFixed(2)}°E` : '';
  caption.querySelector('.l1').innerHTML = `${esc(T.place)}<span class="sep"></span>${esc(T.placeEn)}`;
  const l2 = caption.querySelector('.l2');
  l2.textContent = T.line || T.teaser; l2.style.display = L.wide ? '' : 'none';
  caption.querySelector('.l3').innerHTML = [`${T.zh} ${md(D.start)}`, T.hou[0], lat].filter(Boolean).map(esc).join('<span class="sep"></span>·<span class="sep"></span>');
}

// ---------- 目錄的點 ----------
const dotsBox = index.querySelector('.dots');
const SEA_COL = { spring: '#68BE8D', summer: '#F2C26B', autumn: '#EE836F', winter: '#7F9BD6' };   // 若竹、山吹、珊瑚朱、露草（淡）
const dotEls = TERMS.map((T, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = `dot${T.scene ? ' has' : ''}${i % 6 === 0 && i ? ' gap' : ''}`;
  b.style.setProperty('--c', SEA_COL[T.season]);
  b.setAttribute('aria-label', `${pad(i + 1)} ${T.zh}${T.scene ? '' : '（繪製中）'}`);
  b.innerHTML = `<span class="tip">${T.zh}</span>`;
  b.addEventListener('click', () => { if (i !== cur) go(i, i > cur ? 1 : -1); });
  dotsBox.append(b);
  return b;
});
for (const [id, f] of [['#prev', prev], ['#next', next], ['#prev2', prev], ['#next2', next]]) $(id).addEventListener('click', f);
addEventListener('keydown', (e) => {
  if ($('#info').classList.contains('open')) return;
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
});
addEventListener('hashchange', () => { const i = TERMS.findIndex((T) => `#${T.id}` === location.hash); if (i >= 0 && i !== cur) go(i, i > cur ? 1 : -1); });
addEventListener('resize', layout);
layout();

// ---------- 一格 ----------
function textFx(off, a) { page.style.transform = off ? `translateX(${off}px)` : ''; page.style.opacity = String(a); caption.style.opacity = String(a); }
const _sc = new THREE.Vector3();
function frame(i) {
  const t = i / FPS;
  nowT = t;
  const G = fullGrow(), f = flip;
  let grow = 1e9;
  if (f.mode === 'drag') {
    grow = G * (1 - 0.9 * ease(Math.min(1, Math.abs(f.p))));
    textFx(f.p * 70, 1 - Math.min(1, Math.abs(f.p) * 1.3));
  } else if (f.mode === 'close') {
    const u = clamp01((t - f.T) / DUR.close), p = f.p0 + (1 - f.p0) * u;
    grow = G * (1 - 0.9 * ease(p)) * (1 - u) + 40 * u;
    textFx(-f.dir * 70 * p, 1 - Math.min(1, p * 1.3));
    if (u >= 1) {
      f.mode = 'wait';
      sceneFor(f.target).then((s) => { activate(s); setPage(f.target); f.mode = 'open'; f.T = nowT; });
    }
  } else if (f.mode === 'wait') {
    grow = 40;
  } else if (f.mode === 'back') {
    const u = clamp01((t - f.T) / DUR.back), p = f.p0 * (1 - ease(u));
    grow = G * (1 - 0.9 * ease(p));
    textFx(f.sign * 70 * p, 1 - Math.min(1, p * 1.3));
    if (u >= 1) { f.mode = 'idle'; f.p = 0; textFx(0, 1); }
  } else if (f.mode === 'open') {
    const u = clamp01((t - f.T) / DUR.open);
    grow = 60 + (G - 60) * Math.pow(u, 1.6);
    const a = ease(clamp01((t - f.T - 0.15) / 0.5));
    textFx(f.dir * 70 * (1 - a), a);
    if (u >= 1) { f.mode = 'idle'; f.p = 0; textFx(0, 1); }
  }
  if (active) {
    active.update(t, t - active.enterT);
    camera(t, active.view);
    const v = active.view;
    dio.fitShadow(_sc.set(v.target[0], 0, v.target[2]), v.shadowR || v.span * 1.6);
  }
  dio.render(t, i, { grow });
}

const t0 = performance.now();
let prevNow = t0;
function loop(now) {
  now = now ?? performance.now();
  relax(now - prevNow); prevNow = now;
  frame(Math.floor((now - t0) / 1000 * FPS));
  requestAnimationFrame(loop);
}

// ---------- 拖曳／滑動翻頁、點畫裡的東西 ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(x, y) {
  if (!active) return null;
  const r = canvas.getBoundingClientRect();
  ndc.set((x - r.left) / L.cw * 2 - 1, -((y - r.top) / L.ch) * 2 + 1);
  dio.cam.updateMatrixWorld(); ray.setFromCamera(ndc, dio.cam);
  const hit = ray.intersectObjects(active.clickables, false)[0];
  if (!hit) return null;
  for (let o = hit.object; o; o = o.parent) if (o.userData.kind) return { kind: o.userData.kind, ref: o.userData.ref, point: hit.point };
  return null;
}
const inFrame = (x, y) => { const r = canvas.getBoundingClientRect(); return Math.abs(x - r.left - L.cx) < L.hw && Math.abs(y - r.top - L.cy) < L.hh; };
let g = null;
const skip = (el) => el.closest('button, a, #info, .lab-bar');
function settleBack() { flip.mode = 'back'; flip.p0 = Math.abs(flip.p); flip.sign = Math.sign(flip.p) || 1; flip.T = nowT; }
addEventListener('pointerdown', (e) => {
  if (skip(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (e.target.closest('#sheet') && e.pointerType === 'mouse') return;      // 滑鼠在文字頁上：留給選取文字
  g = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now(), axis: null, onCanvas: e.target === canvas, hist: [[e.clientX, performance.now()]] };
  if (e.target === canvas) { try { canvas.setPointerCapture(e.pointerId); } catch { /* 合成或已結束的指標不能 capture */ } }
});
addEventListener('pointermove', (e) => {
  if (!g || e.pointerId !== g.id) { if (e.pointerType === 'mouse' && e.target === canvas) hover(e); return; }
  const dx = e.clientX - g.x, dy = e.clientY - g.y;
  if (!g.axis && Math.hypot(dx, dy) > 9) g.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y';
  if (g.axis === 'x' && (flip.mode === 'idle' || flip.mode === 'drag' || flip.mode === 'back')) {
    flip.mode = 'drag';
    flip.p = Math.max(-1, Math.min(1, dx / (Math.min(L.cw, innerWidth) * 0.55)));
    g.hist.push([e.clientX, performance.now()]); if (g.hist.length > 6) g.hist.shift();
    hideHint();
  }
});
addEventListener('pointerup', (e) => {
  if (!g || e.pointerId !== g.id) return;
  const dx = e.clientX - g.x;
  if (flip.mode === 'drag') {
    const [hx, ht] = g.hist[0], v = (e.clientX - hx) / Math.max(1, performance.now() - ht);   // px/ms
    if (Math.abs(flip.p) > 0.3 || (Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(dx))) { const dir = dx < 0 ? 1 : -1; go(cur + dir, dir); }
    else settleBack();
  } else if (!g.axis && g.onCanvas && performance.now() - g.time < 450 && inFrame(e.clientX, e.clientY) && flip.mode === 'idle') {
    const hit = pickAt(e.clientX, e.clientY);
    if (hit && active.poke) { active.poke(hit.kind, hit.ref, hit.point, nowT); hideHint(); }
  }
  g = null;
});
addEventListener('pointercancel', (e) => { if (g && e.pointerId === g.id && flip.mode === 'drag') settleBack(); g = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(e.deltaY * 0.0012), 0.55, 1.35);
  view.last = performance.now(); hideHint();
}, { passive: false });
let hoverAt = 0;
function hover(e) {
  const now = performance.now(); if (now - hoverAt < 90) return; hoverAt = now;
  canvas.style.cursor = inFrame(e.clientX, e.clientY) && pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab';
}

// ---------- 操作提示 ----------
hint.querySelector('span').textContent = matchMedia('(pointer: coarse)').matches ? '左右滑動翻頁・點畫裡的東西看看' : '拖曳或按 ← → 翻頁・點畫裡的東西看看';
function hideHint() { hint.classList.add('gone'); }
setTimeout(hideHint, 8000);

// ---------- info 視窗 ----------
const infoBtn = $('#info-btn'), dialog = $('#info'), closeBtn = $('#info-close');
function setOpen(open) { dialog.classList.toggle('open', open); dialog.setAttribute('aria-hidden', String(!open)); (open ? closeBtn : infoBtn).focus(); }
infoBtn.addEventListener('click', () => setOpen(true));
closeBtn.addEventListener('click', () => setOpen(false));
dialog.addEventListener('click', (e) => { if (e.target === dialog) setOpen(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.classList.contains('open')) setOpen(false); });

// ---------- 第一頁：網址指定的，否則是今天的節氣；今天這頁還沒畫好，就往後找第一個畫好的 ----------
let first = TERMS.findIndex((T) => `#${T.id}` === location.hash);
if (first < 0) {
  const base = NOW >= 0 ? NOW : 0; first = base;
  for (let k = 0; k < 24; k++) { const j = (base + k) % 24; if (TERMS[j].scene) { first = j; break; } }
}
textFx(0, 0);
sceneFor(first).then((s) => { activate(s); setPage(first); flip.mode = 'open'; flip.dir = 1; flip.T = nowT; });
loop();
// 除錯／截圖用
window.__book = { go: (id) => { const i = TERMS.findIndex((T) => T.id === id); if (i >= 0) go(i, 1); }, get cur() { return TERMS[cur]?.id; }, get mode() { return flip.mode; } };
