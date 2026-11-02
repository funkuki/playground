import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildScene, PALETTE, outlineMeshes } from './scene.js';
import { backgroundTex } from './textures.js';
import './info.js';
import { initCritters } from './critters.js';
import { createSound } from './sound.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // 硬一點的影子比較像賽璐璐
renderer.toneMapping = THREE.NoToneMapping; // 保留平塗色，不做色調壓縮
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = backgroundTex();
scene.fog = new THREE.Fog(PALETTE.fog, 38, 80);

// ---------- 透視相機：右前上方俯視 ----------
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.5, 200);
const params = new URLSearchParams(location.search);
// ?t=x,y,z 可以改相機注視點（截圖檢查用）
const target = new THREE.Vector3(...(params.get('t')?.split(',').map(Number) ?? [0.6, 2.2, 0.4]));
const AZ = THREE.MathUtils.degToRad(Number(params.get('az') ?? 18));
const EL = THREE.MathUtils.degToRad(Number(params.get('el') ?? 26));
const DIST = Number(params.get('d') ?? 29);
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
// 限制旋轉：方位 -25°~75°、仰角 10°~55°、距離 16~45
controls.minAzimuthAngle = THREE.MathUtils.degToRad(-25);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(75);
controls.minPolarAngle = THREE.MathUtils.degToRad(35);
controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
controls.minDistance = Math.min(16, DIST); // 網址指定更近時放寬（截圖檢查用）
controls.maxDistance = 45;
controls.update();

buildScene(scene);
const updateCritters = initCritters(scene);
const clock = new THREE.Clock();

// ---------- 音效（預設關閉，按鈕或 M 鍵開關） ----------
const sound = createSound(camera);
const soundBtn = document.getElementById('sound');
function toggleSound() {
  soundBtn.textContent = sound.toggle() ? '音效：開' : '音效：關';
  soundBtn.classList.toggle('on', sound.on);
}
soundBtn.addEventListener('click', toggleSound);
document.addEventListener('visibilitychange', () => sound.setHidden(document.hidden));

// ---------- 後製：bloom 只抓自發光（> 1 的亮度） ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.8, 1.0);
composer.addPass(bloom);
// 柔化：降一點彩度、把暗部往上提、整體加一層淡淡的暖色
const soften = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 0.82 },
    lift: { value: 0.035 },
    tint: { value: new THREE.Color(1.0, 0.97, 0.9) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float lift;
    uniform vec3 tint;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = c * (1.0 - lift) + lift * tint;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
});
composer.addPass(soften);
composer.addPass(new OutputPass());

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
  if (e.key === 'm' || e.key === 'M') toggleSound();
});
resize();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  updateCritters(dt, clock.elapsedTime);
  sound.update();
  controls.update();
  composer.render();
});
