import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildScene, PALETTE, outlineMeshes } from './scene.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // 硬一點的影子比較像賽璐璐
renderer.toneMapping = THREE.NoToneMapping; // 保留平塗色，不做色調壓縮
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = backgroundTex();
scene.fog = new THREE.Fog(PALETTE.bg, 34, 70);

// ---------- 透視相機：近正面、略俯視 ----------
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 200);
const target = new THREE.Vector3(-0.4, 4.1, 0.5);
const params = new URLSearchParams(location.search);
const AZ = THREE.MathUtils.degToRad(Number(params.get('az') ?? 6));
const EL = THREE.MathUtils.degToRad(Number(params.get('el') ?? 9));
const DIST = Number(params.get('d') ?? 27);
camera.position.set(
  target.x + DIST * Math.cos(EL) * Math.sin(AZ),
  target.y + DIST * Math.sin(EL),
  target.z + DIST * Math.cos(EL) * Math.cos(AZ),
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
// 限制旋轉：左右各 55°、仰角 0°~35°、距離 18~45
controls.minAzimuthAngle = THREE.MathUtils.degToRad(-55);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(55);
controls.minPolarAngle = THREE.MathUtils.degToRad(55);
controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
controls.minDistance = 18;
controls.maxDistance = 45;
controls.update();

buildScene(scene);

// ---------- 後製：bloom 只抓自發光（> 1 的亮度） ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function backgroundTex() {
  // 暗藍綠背景，中間略亮、四周壓暗（平塗的同心色帶，維持賽璐璐感）
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  const bands = ['#1f2b2e', '#243235', '#29383b', '#2e3e41', '#334447'];
  bands.forEach((col, i) => {
    g.fillStyle = col;
    const r = 1 - i / bands.length;
    g.beginPath();
    g.ellipse(256, 300, 520 * r, 420 * r, 0, 0, Math.PI * 2);
    g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.aspect = w / h;
  // 直式畫面時放寬視角，讓整個模型放得下
  camera.fov = w / h < 1.3 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * 1.3 / (w / h))) : 30;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
addEventListener('keydown', (e) => {
  if (e.key === 'o' || e.key === 'O') outlineMeshes.forEach((m) => (m.visible = !m.visible));
  if (e.key === 'b' || e.key === 'B') bloom.enabled = !bloom.enabled;
});
resize();

renderer.setAnimationLoop(() => {
  controls.update();
  composer.render();
});
