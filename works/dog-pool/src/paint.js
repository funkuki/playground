import * as THREE from 'three';

// 色票（從參考圖取樣）與共用的「畫筆」工具：筆觸貼圖、toon 材質、水波、caustics

export const PAL = {
  deck: 0xf2d4ba,
  section: 0xe7c6a4,
  plinth: 0xc99a74,
  water: 0x6ab8b1,
  tile: 0x3aa49e,
  floor: 0x86d0c8,
  step: 0xd6f4ec,
  umbrella: 0xf1b267,
  palm: 0x44511f,
  palmLight: 0x67772c,
  trunk: 0xa88a62,
  yellow: 0xfcd234,
  pink: 0xfa6796,
  banana: 0xf9c00d,
  chair: 0xfde9c7,
  chairFrame: 0xe6cfa8,
  bucketBlue: 0x0db3c4,
  bucketYellow: 0xf6c23a,
  toyOrange: 0xf39a2c,
  toyRed: 0xe8564a,
  metal: 0xc6d2d0,
  black: 0x2f2a27,
  tan: 0xb8743c,
  tongue: 0xe0485a,
  corgi: 0xe58835,
  white: 0xf8efe2,
  brown: 0xd69a67,
  brownLight: 0xedc49c,
  brownDark: 0xa86a3e,
};

// 泳池與底座尺寸（1 單位 = 參考圖 100px，原點在圖中央）
export const POOL = { x0: -8.2, x1: 8.2, z0: -4.8, z1: 3.9, floor: -2.2 };
export const BASE = { x0: -10.4, x1: 10.4, z0: -6.0, z1: 6.0, bottom: -2.5 };
export const WATER_Y = -0.22;

export const uTime = { value: 0 };
// 剖面用的裁切平面（main.js 每幀更新），只套在底座、地面這些「土」的材質上
export const cutPlanes = [0, 1, 2, 3].map(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4));

// 水面起伏：JS 和 GLSL 用同一條公式，浮在水上的東西才會貼著波動
export function waveH(x, z, t) {
  return 0.03 * Math.sin(1.3 * x + 1.6 * t) + 0.022 * Math.sin(1.7 * z - 1.2 * t + 0.6 * x) + 0.012 * Math.sin(2.9 * (x + z) + 2.3 * t);
}
const WAVE_GLSL = /* glsl */ `
float waveH(vec2 p, float t) {
  return 0.03 * sin(1.3 * p.x + 1.6 * t) + 0.022 * sin(1.7 * p.y - 1.2 * t + 0.6 * p.x) + 0.012 * sin(2.9 * (p.x + p.y) + 2.3 * t);
}`;

// 池底光紋：交錯的扭曲正弦，取細亮線
const CAUSTIC_GLSL = /* glsl */ `
float caustic(vec2 p, float t) {
  p = mod(p, 6.2831853) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}`;

export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 灰階筆觸貼圖（可無縫重複）：短而微彎的不透明水彩筆觸
function makeStrokeTex() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  g.lineCap = 'round';
  const r = rng(7);
  for (let i = 0; i < 2600; i++) {
    const x = r() * S, y = r() * S;
    const a = (r() < 0.55 ? 0.35 : -0.8) + (r() - 0.5) * 1.6;
    const len = 8 + r() * 36, w = 1.5 + r() * 5.5;
    const v = Math.round(128 + (r() - 0.5) * 120);
    g.strokeStyle = `rgba(${v},${v},${v},${(0.22 + r() * 0.4).toFixed(2)})`;
    g.lineWidth = w;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len, bend = (r() - 0.5) * len * 0.5;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const cx = x + ox, cy = y + oy;
      if (cx < -60 || cx > S + 60 || cy < -60 || cy > S + 60) continue;
      g.beginPath();
      g.moveTo(cx - dx / 2, cy - dy / 2);
      g.quadraticCurveTo(cx - (dy / len) * bend, cy + (dx / len) * bend, cx + dx / 2, cy + dy / 2);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
export const strokeTex = makeStrokeTex();

// 剖面的地層貼圖（v=1 是地面）：上面一層石板，下面是土
function makeStrataTex() {
  const W = 128, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = rng(3);
  g.fillStyle = '#d8ab84'; g.fillRect(0, 0, W, H);
  for (let y = 40; y < H; y += 6) {
    g.fillStyle = `rgba(${170 + r() * 50 | 0},${120 + r() * 40 | 0},${80 + r() * 30 | 0},0.25)`;
    g.fillRect(0, y, W, 3 + r() * 6);
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(150,100,70,0.35)' : 'rgba(245,220,190,0.35)';
    g.beginPath(); g.ellipse(r() * W, 40 + r() * (H - 40), 1 + r() * 3, 1 + r() * 2, 0, 0, 6.3); g.fill();
  }
  g.fillStyle = '#f0d3b6'; g.fillRect(0, 0, W, 26);
  g.fillStyle = '#c99a72'; g.fillRect(0, 26, W, 4);
  g.fillStyle = '#e2bb94'; g.fillRect(0, 30, W, 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const strataTex = makeStrataTex();

// Toon 三階：亮面、中間、暗面
const gData = new Uint8Array([120, 195, 255]);
export const gradient = new THREE.DataTexture(gData, 3, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshToonMaterial({ color, gradientMap: gradient, ...opts }));
  return matCache.get(key);
}

const f = (v) => v.toFixed(4);
// 把世界座標筆觸、caustics、水波塞進內建材質
export function paintify(m, { stroke = 0, scale = 0.35, caustics = 0, wave = false, band = false, flecks = false } = {}) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.uniforms.uStroke = { value: strokeTex };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPW;\nuniform float uTime;\n${WAVE_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${wave ? 'transformed.y += waveH((modelMatrix * vec4(transformed, 1.0)).xz, uTime);' : ''}`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vPW;\nuniform float uTime;\nuniform sampler2D uStroke;\n${CAUSTIC_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec2 sp = vPW.xz + vPW.y * vec2(0.73, 0.41);
  float sk = texture2D(uStroke, sp * ${f(scale)}).r + texture2D(uStroke, sp * ${f(scale * 2.3)} + 0.37).r - 1.0;
  diffuseColor.rgb *= 1.0 + sk * ${f(stroke)};
  ${band ? `
  // 靠上緣和右緣的深青色帶（參考圖裡池壁投在水上的影子），邊緣用筆觸弄毛
  float jag = (texture2D(uStroke, sp * 0.9).r - 0.5) * 0.35;
  float bt = smoothstep(1.0 + jag, 0.88 + jag, vPW.z - ${f(POOL.z0)}) * smoothstep(${f(POOL.x0 + 1.85)}, ${f(POOL.x0 + 2.05)}, vPW.x + jag * 0.3);
  float br = smoothstep(0.78 + jag, 0.68 + jag, ${f(POOL.x1)} - vPW.x);
  float bandK = max(bt, br);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.3, 0.68, 0.7), bandK);
  diffuseColor.a = mix(diffuseColor.a, 0.95, bandK);` : ''}
  ${flecks ? `
  // 水面上零星的白色亮點筆觸
  float fl = texture2D(uStroke, sp * 0.61 + vec2(0.13, 0.71)).r;
  diffuseColor.rgb += smoothstep(0.6, 0.68, fl) * 0.22;` : ''}
  ${caustics ? `diffuseColor.rgb += vec3(0.85, 1.0, 0.95) * caustic(vPW.xz * 1.1, uTime * 0.9) * ${f(caustics)};` : ''}`);
  };
  m.customProgramCacheKey = () => `paint${stroke}${scale}${caustics}${wave}${band}${flecks}`;
  return m;
}
