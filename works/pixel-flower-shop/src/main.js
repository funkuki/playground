import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildScene, PALETTE } from './scene.js';
import { createLife } from './life.js';
import { createSound } from './sound.js';
import { updateWind } from './wind.js';
import './info.js';

// 每個低解析度像素放大成幾個螢幕像素
let pixelSize = 1;

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // 硬邊陰影，像素風
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);

// ---------- 正交相機，等角視角 ----------
const VIEW_H = 21; // 世界單位：畫面高度
const VIEW_W = 30; // 窄視窗時至少要放得下的寬度
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const target = new THREE.Vector3(0.5, 4.6, 0.8);
const ELEV = THREE.MathUtils.degToRad(20); // 仰角（相機在地平面上方 20°）
// 從正面往右偏；網址可帶 ?az=角度 指定初始方位
const AZIM = THREE.MathUtils.degToRad(Number(new URLSearchParams(location.search).get('az') ?? 28));
const DIST = 60;
camera.position.set(
  target.x + DIST * Math.cos(ELEV) * Math.sin(AZIM),
  target.y + DIST * Math.sin(ELEV),
  target.z + DIST * Math.cos(ELEV) * Math.cos(AZIM),
);
camera.lookAt(target);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.12;
// 鎖住垂直角度，只能水平轉
const polar = Math.PI / 2 - ELEV;
controls.minPolarAngle = polar;
controls.maxPolarAngle = polar;
controls.minZoom = 0.6;
controls.maxZoom = 3;
controls.update();

buildScene(scene);
const sound = createSound(camera);
const life = createLife(scene, sound);

// 音效開關（瀏覽器規定要點過才能出聲）；M 鍵也可以切換
const soundBtn = document.getElementById('sound');
function toggleSound() {
  soundBtn.textContent = sound.toggle() ? '音效：開' : '音效：關';
  soundBtn.classList.toggle('on', sound.on);
}
soundBtn.addEventListener('click', toggleSound);
document.addEventListener('visibilitychange', () => sound.setHidden(document.hidden));
const clock = new THREE.Clock();

// ---------- 低解析度 render target ----------
const rt = new THREE.WebGLRenderTarget(1, 1, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  depthTexture: new THREE.DepthTexture(1, 1),
});

// 放大到全螢幕：NearestFilter 取樣，加上深度描邊與色階量化
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: rt.texture },
    tDepth: { value: rt.depthTexture },
    texel: { value: new THREE.Vector2() },
    levels: { value: 32.0 },
    saturation: { value: 0.72 },
    lift: { value: 0.07 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform vec2 texel;
    uniform float levels;
    uniform float saturation;
    uniform float lift;
    varying vec2 vUv;
    float D(vec2 o) { return texture2D(tDepth, vUv + o * texel).r; }
    void main() {
      vec3 c = texture2D(tColor, vUv).rgb;
      float d = D(vec2(0.0));
      // 自己比鄰居遠很多 → 在物件輪廓外側畫一圈深色
      float thr = 0.012;
      float edge = 0.0;
      edge = max(edge, step(thr, d - D(vec2( 1.0, 0.0))));
      edge = max(edge, step(thr, d - D(vec2(-1.0, 0.0))));
      edge = max(edge, step(thr, d - D(vec2(0.0,  1.0))));
      edge = max(edge, step(thr, d - D(vec2(0.0, -1.0))));
      c = mix(c, c * vec3(0.5, 0.48, 0.55), edge);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      // 降彩度、把暗部往上提，整體偏柔和的粉彩調
      vec3 s = gl_FragColor.rgb;
      float l = dot(s, vec3(0.299, 0.587, 0.114));
      s = mix(vec3(l), s, saturation);
      s = s * (1.0 - lift) + lift;
      gl_FragColor.rgb = s;
      // 限制色階（在 sRGB 空間做），讓色塊更平
      gl_FragColor.rgb = floor(gl_FragColor.rgb * levels + 0.5) / levels;
    }
  `,
  depthTest: false,
  depthWrite: false,
});
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  const rw = Math.max(1, Math.floor(w / pixelSize));
  const rh = Math.max(1, Math.floor(h / pixelSize));
  rt.setSize(rw, rh);
  postMat.uniforms.texel.value.set(1 / rw, 1 / rh);
  const aspect = w / h;
  const vh = Math.max(VIEW_H, VIEW_W / aspect);
  camera.left = (-vh * aspect) / 2;
  camera.right = (vh * aspect) / 2;
  camera.top = vh / 2;
  camera.bottom = -vh / 2;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
addEventListener('keydown', (e) => {
  if (e.key === '[') pixelSize = Math.max(1, pixelSize - 1);
  if (e.key === ']') pixelSize = Math.min(8, pixelSize + 1);
  if (e.key === 'm' || e.key === 'M') toggleSound();
  resize();
});
resize();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1); // 切回分頁時不要一次跳太多
  updateWind(clock.elapsedTime);
  life.update(dt, clock.elapsedTime);
  sound.update(clock.elapsedTime);
  controls.update();
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
});
