import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildScene } from './scene.js';
import { buildDogs } from './dogs.js';
import { buildPyrenees } from './pyrenees.js';
import { gouachePass } from './post.js';
import './info.js';
import { sfx } from './audio.js';
import { uTime, BASE, cutPlanes } from './paint.js';

const params = new URLSearchParams(location.search);
if (params.has('shot')) document.body.classList.add('shot');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3e4d2);

// ---------- 光：右上方斜射的暖陽 + 偏藍的環境光（陰影就是偏藍色塊） ----------
scene.add(new THREE.AmbientLight(0xd6e6f4, 1.66));
const sun = new THREE.DirectionalLight(0xfff1e2, 1.95);
sun.position.set(7, 9, -7);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;
scene.add(sun);

const { glass, props, surface } = buildScene(scene);
const updateDogs = buildDogs(scene);
const updatePyrenees = buildPyrenees(scene, sfx);

// ---------- 相機 ----------
const camera = new THREE.PerspectiveCamera(18, innerWidth / innerHeight, 1, 300);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -1.0, 0);
// 開發用：?look=x,y,z 改注視點，近拍單一隻狗
if (params.has('look')) controls.target.fromArray(params.get('look').split(',').map(Number));
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.02;
controls.maxPolarAngle = THREE.MathUtils.degToRad(86); // 鏡頭最低在注視點上方，不會轉到池底下方
controls.minDistance = 16;
controls.maxDistance = 80;

// 俯看時讓 20×11.25 的參考圖範圍剛好塞滿畫面
function fitDistance() {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return Math.min(5.625 / t, 10 / (t * camera.aspect)) + 0.6;
}
const VIEWS = {
  top: () => ({ az: 0, el: 84, d: fitDistance() }),
  side: () => ({ az: -14, el: 7, d: 34 }),
};
function camPos({ az, el, d }) {
  const p = THREE.MathUtils.degToRad(90 - el), a = THREE.MathUtils.degToRad(az);
  return new THREE.Vector3(Math.sin(p) * Math.sin(a), Math.cos(p), Math.sin(p) * Math.cos(a)).multiplyScalar(d).add(controls.target);
}
// 使用者還沒動過鏡頭前，視窗大小改變就重新取景
let touched = false;
controls.addEventListener('start', () => (touched = true));
function startView() {
  const v = VIEWS[params.get('view') === 'side' ? 'side' : 'top']();
  for (const k of ['az', 'el', 'd']) if (params.has(k)) v[k] = parseFloat(params.get(k));
  camera.position.copy(camPos(v));
  controls.update();
}

let tween = null;
function goTo(name) {
  if (!Number.isFinite(camera.position.x)) startView();
  const from = camera.position.clone().sub(controls.target);
  const to = camPos(VIEWS[name]()).sub(controls.target);
  const s0 = new THREE.Spherical().setFromVector3(from), s1 = new THREE.Spherical().setFromVector3(to);
  let dt = s1.theta - s0.theta;
  if (dt > Math.PI) s1.theta -= Math.PI * 2;
  if (dt < -Math.PI) s1.theta += Math.PI * 2;
  tween = { s0, s1, t: 0 };
}
document.getElementById('top').onclick = () => ((touched = true), goTo('top'));
// 音效：瀏覽器要求先有使用者操作才能出聲，第一次點擊、拖曳或按鍵時開始
const soundBtn = document.getElementById('sound');
const showSound = () => {
  soundBtn.textContent = sfx.on ? '音效 開' : '音效 關';
  soundBtn.setAttribute('aria-pressed', String(sfx.on));
};
soundBtn.onclick = () => (sfx.setOn(!sfx.on), showSound());
if (!params.has('shot')) {
  const unlock = (e) => {
    if (e.target === soundBtn) return;
    if (sfx.on) sfx.unlock();
    removeEventListener('pointerdown', unlock, true);
    removeEventListener('keydown', unlock, true);
  };
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);
}
document.addEventListener('visibilitychange', () => sfx.suspend(document.hidden));
showSound();
document.getElementById('side').onclick = () => ((touched = true), goTo('side'));

// ---------- 剖面：靠鏡頭那側的地面切掉，池壁換成玻璃 ----------
// 每一側一個裁切平面，鏡頭越轉向那側，平面就從底座外緣滑到池壁
const planes = cutPlanes;
renderer.localClippingEnabled = true;
const outer = [BASE.x1, -BASE.x0, BASE.z1, -BASE.z0];
const camDir = new THREE.Vector3();
function updateCut(dt) {
  camDir.copy(camera.position).sub(controls.target).normalize();
  let side = 0;
  glass.forEach((s, i) => {
    // 方向過了門檻就切開（有遲滯），切面再隨時間滑過去，避免停在半切開的狀態
    const d = s.n.dot(camDir);
    if (d > 0.56) s.target = 1;
    else if (d < 0.46) s.target = 0;
    s.w = THREE.MathUtils.clamp(s.w + Math.sign(s.target - s.w) * dt * 2.2, 0, 1);
    const w = s.w * s.w * (3 - 2 * s.w);
    side = Math.max(side, w);
    const cut = THREE.MathUtils.lerp(outer[i] + 5, s.pos + 0.02, w);
    planes[i].normal.copy(s.n).negate();
    planes[i].constant = cut;
    s.group.visible = w > 0.01;
    s.mats.forEach((m, j) => (m.opacity = s.peak[j] * w));
    s.cap.visible = cut < outer[i] && cut > s.pos + 0.06;
    s.cap.position.copy(s.n).multiplyScalar(cut - 0.003);
  });
  // 側看時水面淡一點，從斜上方也看得到水下的腿
  surface.material.opacity = THREE.MathUtils.lerp(0.74, 0.45, side);
  for (const pr of props) pr.obj.visible = planes.every((pl) => pl.distanceToPoint(pr.p) >= 0);
}

// ---------- 後製 ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gouache = gouachePass();
composer.addPass(gouache);
composer.addPass(new OutputPass());
function resize() {
  // 背景分頁可能回報 0×0，這時算出來的比例是 NaN，會連帶弄壞鏡頭和裁切平面
  if (!innerWidth || !innerHeight) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  gouache.uniforms.uSize.value.set(innerWidth, innerHeight);
  if (!touched && !tween) startView();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
const t0 = parseFloat(params.get('t') ?? '0');
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (innerHeight && camera.aspect !== innerWidth / innerHeight) resize();
  // ?freeze：只跑 1 秒就停住，headless 截圖才能拍到指定的時間點
  const t = t0 + (params.has('freeze') ? Math.min(clock.elapsedTime, 1) : clock.elapsedTime);
  uTime.value = t;
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 1.4);
    const k = tween.t * tween.t * (3 - 2 * tween.t);
    const s = new THREE.Spherical(
      THREE.MathUtils.lerp(tween.s0.radius, tween.s1.radius, k),
      THREE.MathUtils.lerp(tween.s0.phi, tween.s1.phi, k),
      THREE.MathUtils.lerp(tween.s0.theta, tween.s1.theta, k),
    );
    camera.position.setFromSpherical(s).add(controls.target);
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  updateDogs(t);
  updatePyrenees(t);
  sfx.tick();
  updateCut(tween || touched ? dt : 1);
  composer.render();
});

if (import.meta.env.DEV) window.__pool = { planes, glass, camera, controls, sfx };
