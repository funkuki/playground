import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clayShared, clayMaterial, makeClayDetail } from './clay.js';
import { Sculpt } from './sculpt.js';
import { buildStudio, SHELF } from './studio.js';
import { buildLights, PRESETS } from './lighting.js';
import { takePhoto } from './photo.js';
import { sfx, unlock, setEnabled } from './sound.js';
import haruoUrl from '../models/haruo.glb?url';
import bunnyUrl from '../models/bunny.glb?url';
import angelUrl from '../models/angel.glb?url';
import devilUrl from '../models/devil.glb?url';
import './info.js';

// 架上四格，順序和左右方向鍵一樣
const FIGURES = [
  { id: 'haruo', name: '春男', en: 'Haruo', url: haruoUrl, slot: 1, seed: 1 },
  { id: 'bunny', name: '粉紅兔', en: 'Pinky', url: bunnyUrl, slot: 2, seed: 2 },
  { id: 'devil', name: '惡魔', en: 'Devil', url: devilUrl, slot: 3, seed: 4 },
  { id: 'angel', name: '天使', en: 'Angel', url: angelUrl, slot: 0, seed: 3 },
];
const COMING = []; // 還沒做好的公仔：架上放一團黏土、名牌寫「製作中」

const params = new URLSearchParams(location.search);
if (params.has('shot')) document.body.classList.add('shot');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;

const scene = new THREE.Scene();
clayShared.uDetail.value = makeClayDetail(512);
const studio = buildStudio(scene);
const lights = buildLights(scene, studio);
lights.set(0, true);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 40);

// ---------- 名牌和還沒捏的黏土 ----------
for (const f of [...FIGURES, ...COMING]) {
  const plate = studio.nameplate(f.name, f.color ? `${f.en} · 製作中` : f.en);
  plate.position.set((f.slot - 1.5) * SHELF.gap, 0.0, 0.178);
  studio.shelf.add(plate);
}
for (const c of COMING) studio.slots[c.slot].add(studio.clayLump(c.color));

// ---------- 載入公仔 ----------
const figures = [];
let active = Math.min(FIGURES.length - 1, Math.max(0, +params.get('fig') || 0));
const loader = new GLTFLoader();
const status = document.getElementById('status');

Promise.all(FIGURES.map((f) => loader.loadAsync(f.url))).then((gltfs) => {
  gltfs.forEach((gltf, i) => {
    const def = FIGURES[i];
    let src;
    gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
    src.updateWorldMatrix(true, false);
    const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
    const mesh = new THREE.Mesh(geo, clayMaterial({ map: src.material.map, sculpt: true }));
    mesh.castShadow = mesh.receiveShadow = true;
    const holder = new THREE.Group(); // 戳下去時整隻被擠一下、恢復時抖一抖
    holder.add(mesh);
    const root = new THREE.Group();
    root.add(holder);
    const fig = { def, root, holder, mesh, sculpt: new Sculpt(mesh, { seed: def.seed }), squash: 0, wiggle: 0 };
    figures.push(fig);
    (i === active ? studio.stand : studio.slots[def.slot]).add(root);
  });
  updateName();
  status.classList.add('gone');
  document.body.classList.add('ready');
  if (params.has('demo')) demo();
}).catch((err) => {
  console.error(err);
  status.textContent = '模型載入失敗，請重新整理';
});

// ---------- 相機：繞著轉台看，可以小範圍轉動和縮放 ----------
const target = new THREE.Vector3(0, 0.95, -0.5);
const view = { yaw: 0, pitch: 0.2, zoom: 1, fit: 4 };
function fitCamera() {
  const aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  camera.fov = aspect < 0.8 ? 38 : 30;
  camera.updateProjectionMatrix();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanH = tanV * aspect;
  // 上下要放得下轉台到架子頂（下方再留工具列的空間），左右放得下轉台和架子中間兩格
  const dV = 1.32 / tanV;
  const dH = Math.max(0.8 / tanH, 1.3 / tanH - 1.15);
  view.fit = Math.max(dV, dH);
  target.y = aspect < 0.8 ? 0.72 : 0.8;
}
function placeCamera() {
  const d = view.fit * view.zoom;
  camera.position.set(
    target.x + Math.sin(view.yaw) * Math.cos(view.pitch) * d,
    target.y + Math.sin(view.pitch) * d,
    target.z + Math.cos(view.yaw) * Math.cos(view.pitch) * d,
  );
  camera.lookAt(target);
}
fitCamera();

// ---------- 轉台 ----------
const spin = { angle: 0, vel: 0, auto: 0.32, idle: 9, drag: false, home: false };

// ---------- 公仔在轉台和架子之間飛 ----------
const flights = [];
function fly(obj, dest, dur = 0.9, lift = 0.45) {
  const p = obj.getWorldPosition(new THREE.Vector3());
  const q = obj.getWorldQuaternion(new THREE.Quaternion());
  const s = obj.getWorldScale(new THREE.Vector3());
  scene.attach(obj);
  flights.push({ obj, dest, t: 0, dur, lift, p, q, s });
}
function updateFlights(dt) {
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i];
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    const p = f.dest.getWorldPosition(new THREE.Vector3());
    const q = f.dest.getWorldQuaternion(new THREE.Quaternion());
    const s = f.dest.getWorldScale(new THREE.Vector3());
    f.obj.position.lerpVectors(f.p, p, e);
    f.obj.position.y += Math.sin(Math.PI * k) * f.lift;
    f.obj.quaternion.slerpQuaternions(f.q, q, e);
    f.obj.scale.lerpVectors(f.s, s, e);
    if (k >= 1) {
      f.dest.add(f.obj);
      f.obj.position.set(0, 0, 0);
      f.obj.quaternion.identity();
      f.obj.scale.set(1, 1, 1);
      flights.splice(i, 1);
      f.done?.();
    }
  }
}
function choose(i) {
  if (i === active || flights.length || !figures[i]) return;
  const cur = figures[active], next = figures[i];
  cur.sculpt.stopAnim();
  sfx.whoosh(-0.3);
  fly(cur.root, studio.slots[cur.def.slot], 0.9, 0.5);
  // 轉台先轉回正面，新的公仔落下來時面向鏡頭
  spin.home = true;
  setTimeout(() => {
    fly(next.root, studio.stand, 0.95, 0.55);
    sfx.whoosh();
    flights[flights.length - 1].done = () => { next.squash = 1; spin.home = false; spin.idle = 0; sfx.land(); };
  }, 260);
  active = i;
  updateName();
}

// ---------- 操作：戳、揉、捏、轉轉台、轉視角 ----------
let tool = 'poke';
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let act = null; // 目前這一下在做什麼
let pinch0 = 0, zoom0 = 1;

// 聲音的左右：看碰到的點在畫面哪一邊
const panOf = (p) => THREE.MathUtils.clamp(p.clone().project(camera).x * 0.7, -0.8, 0.8);

function setRay(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
}
const activeFig = () => (flights.length ? null : figures[active]);
function hitFigure() {
  const f = activeFig();
  if (!f) return null;
  return ray.intersectObject(f.mesh, false)[0] || null;
}
function hitShelf() {
  const list = figures.filter((f, i) => i !== active).map((f) => f.mesh);
  const h = ray.intersectObjects(list, false)[0];
  return h ? figures.findIndex((f) => f.mesh === h.object) : -1;
}

canvas.addEventListener('pointerdown', (e) => {
  unlock();
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  hideHint();
  if (pointers.size === 2) {
    // 兩指：縮放。正在做的事先收尾
    endAct();
    const [a, b] = [...pointers.values()];
    pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
    zoom0 = view.zoom;
    act = { type: 'pinch' };
    return;
  }
  if (pointers.size > 2) return;
  setRay(e);
  const x0 = e.clientX, y0 = e.clientY;
  const hit = hitFigure();
  const fig = activeFig();
  if (hit && fig && !fig.sculpt.anim?.type?.startsWith('reset')) {
    spin.idle = 0;
    if (tool === 'poke') {
      fig.sculpt.startPoke(hit);
      fig.squash = 1;
      sfx.poke(panOf(hit.point));
      act = { type: 'poke', fig, pan: panOf(hit.point), creak: 0 };
    } else if (tool === 'rub') {
      fig.sculpt.rub(hit);
      sfx.rubStart(panOf(hit.point));
      act = { type: 'rub', fig, ev: null, x: e.clientX, y: e.clientY, t: performance.now() };
    } else {
      fig.sculpt.grab(hit);
      sfx.grab(panOf(hit.point));
      const n = camera.getWorldDirection(new THREE.Vector3());
      act = {
        type: 'pull', fig, ev: null,
        plane: new THREE.Plane().setFromNormalAndCoplanarPoint(n, hit.point),
        from: fig.mesh.worldToLocal(hit.point.clone()),
        pan: panOf(hit.point), x: e.clientX, y: e.clientY, t: performance.now(),
      };
    }
    canvas.style.cursor = tool === 'pull' ? 'grabbing' : 'crosshair';
    return;
  }
  const s = hitShelf();
  if (s >= 0) { act = { type: 'shelf', i: s, x0, y0 }; return; }
  if (ray.intersectObjects(studio.turnTargets, false)[0]) {
    spin.drag = true;
    act = { type: 'spin', x: e.clientX, t: performance.now() };
    canvas.style.cursor = 'grabbing';
    return;
  }
  act = { type: 'orbit', x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointermove', (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!act) { hover(e); return; }
  if (act.type === 'pinch' && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    view.zoom = THREE.MathUtils.clamp(zoom0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 0.55, 1.3);
  } else if (act.type === 'rub' || act.type === 'pull') {
    act.ev = { clientX: e.clientX, clientY: e.clientY }; // 每格最多處理一次
  } else if (act.type === 'spin') {
    const now = performance.now();
    const da = (e.clientX - act.x) * 0.011;
    spin.angle += da;
    spin.vel = da / Math.max(0.008, (now - act.t) / 1000);
    act.x = e.clientX; act.t = now;
  } else if (act.type === 'orbit') {
    view.yaw = THREE.MathUtils.clamp(view.yaw - (e.clientX - act.x) * 0.005, -0.75, 0.75);
    view.pitch = THREE.MathUtils.clamp(view.pitch + (e.clientY - act.y) * 0.004, 0.02, 0.62);
    act.x = e.clientX; act.y = e.clientY;
  }
});

function endAct() {
  if (!act) return;
  if (act.type === 'poke') act.fig.sculpt.endPoke();
  if (act.type === 'rub') sfx.rubEnd();
  if (act.type === 'pull') {
    act.fig.sculpt.release();
    sfx.release(act.fig.sculpt.grabbed ? act.fig.sculpt.grabbed.d.length() / 0.2 : 0, act.pan);
  }
  if (act.type === 'spin') spin.drag = false;
  if (act.fig) spin.idle = 0;
  act = null;
  canvas.style.cursor = '';
}
function onUp(e) {
  pointers.delete(e.pointerId);
  if (act?.type === 'shelf' && Math.hypot(e.clientX - act.x0, e.clientY - act.y0) < 8) choose(act.i);
  if (act?.type === 'pinch' && pointers.size) return;
  endAct();
}
canvas.addEventListener('pointerup', onUp);
canvas.addEventListener('pointercancel', onUp);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  view.zoom = THREE.MathUtils.clamp(view.zoom * Math.exp(e.deltaY * 0.001), 0.55, 1.3);
}, { passive: false });

function hover(e) {
  setRay(e);
  if (hitFigure()) canvas.style.cursor = tool === 'pull' ? 'grab' : 'crosshair';
  else if (hitShelf() >= 0) canvas.style.cursor = 'pointer';
  else if (ray.intersectObjects(studio.turnTargets, false)[0]) canvas.style.cursor = 'grab';
  else canvas.style.cursor = '';
}

// 揉、捏的移動在這裡處理，一格一次
function processDrag() {
  if (!act?.ev) return;
  const e = act.ev;
  act.ev = null;
  setRay(e);
  // 手移動的速度（像素／秒），用來決定聲音大小
  const now = performance.now();
  const speed = Math.hypot(e.clientX - act.x, e.clientY - act.y) / Math.max(0.008, (now - act.t) / 1000);
  act.x = e.clientX; act.y = e.clientY; act.t = now;
  if (act.type === 'rub') {
    const hit = hitFigure();
    if (hit) act.fig.sculpt.rub(hit);
    sfx.rub(hit ? speed : 0, hit ? panOf(hit.point) : 0);
  } else if (act.type === 'pull') {
    const p = ray.ray.intersectPlane(act.plane, new THREE.Vector3());
    if (p) act.fig.sculpt.drag(act.fig.mesh.worldToLocal(p).sub(act.from));
    const gb = act.fig.sculpt.grabbed;
    sfx.stretch(gb ? gb.d.length() / 0.2 : 0, speed);
  }
}

// ---------- 介面 ----------
const $ = (id) => document.getElementById(id);
const toolBtns = [...document.querySelectorAll('[data-tool]')];
function setTool(t) {
  tool = t;
  toolBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tool === t)));
}
toolBtns.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

const lightBtns = [...document.querySelectorAll('[data-light]')];
function setLight(i, quiet = false) {
  const was = lightBtns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
  lights.set(i);
  if (!quiet && i !== was) sfx.light(i);
  lightBtns.forEach((b, j) => b.setAttribute('aria-checked', String(j === i)));
}
lightBtns.forEach((b, i) => b.addEventListener('click', () => { unlock(); setLight(i); }));

// 聲音開關，記在瀏覽器裡
const muteBtn = $('mute');
let soundOn = true;
try { soundOn = localStorage.getItem('clay-sound') !== 'off'; } catch {}
function setSound(on) {
  soundOn = on;
  setEnabled(on);
  muteBtn.setAttribute('aria-pressed', String(!on));
  muteBtn.setAttribute('aria-label', on ? '關閉音效' : '開啟音效');
  try { localStorage.setItem('clay-sound', on ? 'on' : 'off'); } catch {}
}
setSound(soundOn);
muteBtn.addEventListener('click', () => { unlock(); setSound(!soundOn); });

$('reset').addEventListener('click', () => {
  const f = figures[active];
  if (!f || flights.length) return;
  endAct();
  unlock();
  if (f.sculpt.isTouched()) sfx.restore();
  f.sculpt.reset();
});

function updateName() {
  const d = FIGURES[active];
  $('who').innerHTML = `<b>${d.name}</b> ${d.en}`;
}

let wantPhoto = false;
$('shoot').addEventListener('click', () => { unlock(); wantPhoto = true; });

const hint = $('hint');
let hintTimer = setTimeout(hideHint, 9000);
function hideHint() { hint.classList.add('gone'); clearTimeout(hintTimer); }

addEventListener('keydown', (e) => {
  if (e.target.closest?.('#info, #photo')) return;
  unlock();
  const k = e.key.toLowerCase();
  if (k === 'q') setTool('poke');
  else if (k === 'w') setTool('rub');
  else if (k === 'e') setTool('pull');
  else if (k === 'r') $('reset').click();
  else if (k === 'p') wantPhoto = true;
  else if (/^[1-4]$/.test(k)) setLight(+k - 1);
  else if (k === 'm') setSound(!soundOn);
  else if (k === 'arrowleft' || k === 'arrowright') {
    // 照架上的位置往左或往右換
    const order = FIGURES.map((f, i) => i).sort((a, b) => FIGURES[a].slot - FIGURES[b].slot);
    const at = order.indexOf(active), n = order.length;
    choose(order[(at + (k === 'arrowleft' ? n - 1 : 1)) % n]);
  }
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  fitCamera();
});

// ---------- 每格 ----------
// ?timer：瀏覽器分頁在背景時 rAF 會停，開發測試改用 setTimeout
const nextFrame = params.has('timer') ? (cb) => setTimeout(() => cb(performance.now()), 16) : requestAnimationFrame;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // 轉台：有人在捏就停，放手一下子再慢慢轉起來
  spin.idle += dt;
  if (spin.home) {
    const goal = Math.round(spin.angle / (Math.PI * 2)) * Math.PI * 2;
    spin.angle += (goal - spin.angle) * Math.min(1, dt * 5);
    spin.vel = 0;
  } else if (!spin.drag) {
    const want = act?.fig || spin.idle < 1.4 ? 0 : spin.auto;
    spin.vel += (want - spin.vel) * Math.min(1, dt * (Math.abs(spin.vel) > spin.auto * 1.5 ? 1.2 : 2.5));
    spin.angle += spin.vel * dt;
  }
  studio.disc.rotation.y = spin.angle;

  processDrag();
  for (const f of figures) {
    if (act?.type === 'poke' && act.fig === f) {
      f.sculpt.holdPoke(dt);
      // 按住越壓越深：每隔一下擠出一點聲音，壓到底就停
      const amt = f.sculpt.press?.amt || 0;
      act.creak += dt;
      if (act.creak > 0.16 && amt < 0.029) { act.creak = 0; sfx.press(amt, act.pan); }
    }
    if (f.sculpt.update(dt) === 'reset') { f.wiggle = 1; sfx.wobble(1 / 1.4); }
    f.sculpt.commit();
    // 戳一下整隻被擠扁再彈回；恢復原狀後左右抖一抖
    f.squash = Math.max(0, f.squash - dt * 2.2);
    const s = Math.sin((1 - f.squash) * Math.PI * 3) * f.squash * 0.035;
    f.holder.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
    f.wiggle = Math.max(0, f.wiggle - dt * 1.4);
    f.holder.rotation.z = Math.sin((1 - f.wiggle) * Math.PI * 6) * f.wiggle * 0.06;
  }
  updateFlights(dt);
  lights.update(dt, renderer);
  placeCamera();
  renderer.render(scene, camera);

  if (wantPhoto) {
    wantPhoto = false;
    const d = FIGURES[active];
    sfx.shutter();
    takePhoto(renderer.domElement, { name: d.name, en: d.en, id: d.id, light: PRESETS[lightBtns.findIndex((b) => b.getAttribute('aria-checked') === 'true')]?.name });
  }
  nextFrame(loop);
}
nextFrame(loop);

// ---------- 開發用：網址參數直接設定畫面，?demo 自動戳、揉、捏幾下 ----------
if (params.has('zoom')) view.zoom = +params.get('zoom');
if (params.has('yaw')) view.yaw = +params.get('yaw');
if (params.has('pitch')) view.pitch = +params.get('pitch');
if (params.has('light')) setLight(+params.get('light'), true);
if (params.has('still')) spin.auto = 0;
function demo() {
  const f = figures[active];
  f.root.updateWorldMatrix(true, true);
  // 從正面（或指定方向）往公仔身上的一點射過去
  const hitAt = (x, y, dir = [0, 0, -1]) => {
    const o = f.mesh.localToWorld(new THREE.Vector3(x - dir[0] * 3, y - dir[1] * 3, -dir[2] * 3));
    const t = f.mesh.localToWorld(new THREE.Vector3(x, y, 0));
    ray.set(o, t.sub(o).normalize());
    return ray.intersectObject(f.mesh, false)[0];
  };
  const s = f.sculpt;
  for (const [x, y] of [[0.12, 0.78], [-0.1, 0.62], [0.05, 0.38]]) {
    const h = hitAt(x, y);
    if (!h) continue;
    s.startPoke(h);
    for (let i = 0; i < 30; i++) s.holdPoke(1 / 60);
    s.endPoke();
  }
  // 捏住右耳往上拉
  const ear = hitAt(f.def.id === 'bunny' ? 0.1 : 0.2, f.def.id === 'bunny' ? 0.93 : 0.92, [0, 0, -1]);
  if (ear) { s.grab(ear); s.drag(new THREE.Vector3(0.05, 0.12, 0)); s.release(); }
  // 揉左臉頰
  for (let i = 0; i < 14; i++) { const h = hitAt(-0.18 + i * 0.004, 0.58); if (h) s.rub(h); }
}
window.__clay = { figures, choose, setLight, setTool, view, spin, camera, scene, renderer, lights };
