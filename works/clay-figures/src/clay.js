import * as THREE from 'three';

// ---------- 黏土細節貼圖：一張可以無縫重複的 RGBA，所有黏土物件共用 ----------
// R 表面起伏（大拇指按痕 + 低頻凹凸）、G 粗糙度變化、B 縫隙暗部、A 指紋細紋
// 參考 Claybound：用同一張細節貼圖、三向投影貼到每個物件上，指紋大小和方向才會一致

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// 週期為 period 的值雜訊，貼圖左右上下才接得起來
function vnoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const w = (n) => ((n % period) + period) % period;
  const a = hash(w(xi), w(yi), seed), b = hash(w(xi + 1), w(yi), seed);
  const c = hash(w(xi), w(yi + 1), seed), d = hash(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function makeClayDetail(size = 512) {
  const N = size * size;
  const H = new Float32Array(N);
  const P = new Float32Array(N); // 指紋
  const rand = makeRng(7);

  // 大拇指按痕：橢圓形的淺凹，邊緣微微隆起
  const presses = [];
  for (let i = 0; i < 34; i++) {
    presses.push({
      x: rand() * size, y: rand() * size,
      rx: size * (0.05 + rand() * 0.07), ry: size * (0.035 + rand() * 0.04),
      a: rand() * Math.PI, depth: 0.35 + rand() * 0.65,
    });
  }
  // 指紋：每一格 Voronoi 是一個指紋中心，畫同心的細紋
  const prints = [];
  for (let i = 0; i < 46; i++) prints.push({ x: rand() * size, y: rand() * size, a: rand() * Math.PI, e: 0.55 + rand() * 0.35 });
  const wrap = (d) => d - Math.round(d / size) * size;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const nx = (x / size), ny = (y / size);
      // 低頻起伏
      let h = 0;
      h += (vnoise(nx * 4, ny * 4, 4, 1) - 0.5) * 0.9;
      h += (vnoise(nx * 9, ny * 9, 9, 2) - 0.5) * 0.45;
      h += (vnoise(nx * 19, ny * 19, 19, 3) - 0.5) * 0.08;
      for (const p of presses) {
        const dx = wrap(x - p.x), dy = wrap(y - p.y);
        const c = Math.cos(p.a), s = Math.sin(p.a);
        const u = (dx * c + dy * s) / p.rx, v = (-dx * s + dy * c) / p.ry;
        const d2 = u * u + v * v;
        if (d2 < 2.2) {
          const d = Math.sqrt(d2);
          if (d < 1) h -= p.depth * (1 - d2) * (1 - d2) * 0.9;
          h += p.depth * 0.22 * Math.exp(-((d - 1.05) ** 2) / 0.03); // 被推開的邊
        }
      }
      H[i] = h;
      // 最近的指紋中心
      let best = 1e9, bp = null;
      for (const p of prints) {
        const dx = wrap(x - p.x), dy = wrap(y - p.y);
        const d = dx * dx + dy * dy;
        if (d < best) { best = d; bp = p; }
      }
      const dx = wrap(x - bp.x), dy = wrap(y - bp.y);
      const c = Math.cos(bp.a), s = Math.sin(bp.a);
      const u = dx * c + dy * s, v = (-dx * s + dy * c) / bp.e;
      const r = Math.sqrt(u * u + v * v);
      const wob = (vnoise(nx * 30, ny * 30, 30, 9) - 0.5) * 2.2;
      P[i] = 0.5 + 0.5 * Math.sin(r * 0.95 + wob);
    }
  }

  // 正規化高度，算縫隙（模糊後減原本）
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < N; i++) { lo = Math.min(lo, H[i]); hi = Math.max(hi, H[i]); }
  for (let i = 0; i < N; i++) H[i] = (H[i] - lo) / (hi - lo);
  const B = new Float32Array(N);
  const R = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -R; k <= R; k++) s += H[y * size + ((x + k + size) % size)];
      B[y * size + x] = s / (2 * R + 1);
    }
  }
  const B2 = new Float32Array(N);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -R; k <= R; k++) s += B[((y + k + size) % size) * size + x];
      B2[y * size + x] = s / (2 * R + 1);
    }
  }

  const data = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const cav = Math.min(1, Math.max(0, 0.75 + (H[i] - B2[i]) * 3.2));
    const rough = 0.55 + 0.45 * vnoise((i % size) / size * 12, Math.floor(i / size) / size * 12, 12, 5);
    data[i * 4] = H[i] * 255;
    data[i * 4 + 1] = rough * 255;
    data[i * 4 + 2] = cav * 255;
    data[i * 4 + 3] = P[i] * 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ---------- 黏土材質：MeshPhysicalMaterial + onBeforeCompile ----------
// 全部黏土共用的 uniform：細節貼圖、透光強度（跟著燈光預設變）
export const clayShared = {
  uDetail: { value: null },
  uSSS: { value: 1 },
};

/**
 * @param {object} o
 * @param {THREE.Texture} [o.map] 底色貼圖（公仔的五官在這裡）
 * @param {THREE.ColorRepresentation} [o.color]
 * @param {number} [o.period] 細節貼圖一格代表多長（世界單位）
 * @param {number} [o.bump] 起伏深度
 * @param {number} [o.print] 指紋細紋深度
 * @param {boolean} [o.sculpt] 可以捏的公仔：多了 aRest（原始位置）和 aTouch（揉亮、壓痕）
 */
export function clayMaterial({ map = null, color = 0xffffff, period = 0.6, bump = 0.0017, print = 0.00028, rough = 0.72, sss = 0.1, sheen = 0.25, sculpt = false } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    map, color, roughness: rough, metalness: 0,
    sheen, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff4ea),
  });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, clayShared, {
      uPeriod: { value: period }, uBump: { value: bump }, uPrint: { value: print }, uSSSk: { value: sss },
    });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
${sculpt ? 'attribute vec3 aRest;\nattribute vec2 aTouch;' : ''}
varying vec3 vClayP;
varying vec3 vClayN;
varying vec2 vTouch;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 claySize = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
${sculpt ? 'vClayP = aRest * claySize;\nvTouch = aTouch;' : 'vClayP = position * claySize;\nvTouch = vec2(0.0);'}
vClayN = normal;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uDetail;
uniform float uPeriod, uBump, uPrint, uSSS, uSSSk;
varying vec3 vClayP;
varying vec3 vClayN;
varying vec2 vTouch;
vec4 clayTex(vec3 p, vec3 n) {
  vec3 w = pow(abs(normalize(n)), vec3(4.0));
  w /= max(dot(w, vec3(1.0)), 1e-4);
  return texture2D(uDetail, p.yz / uPeriod) * w.x
       + texture2D(uDetail, p.xz / uPeriod + 0.37) * w.y
       + texture2D(uDetail, p.xy / uPeriod + 0.71) * w.z;
}
// 螢幕空間微分算凹凸（Mikkelsen），不需要切線
vec3 clayPerturb(vec3 p, vec3 n, float h, float side) {
  vec3 sx = dFdx(p), sy = dFdy(p);
  vec3 r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1) * side;
  if (abs(det) < 1e-9) return n;
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec4 cd = clayTex(vClayP, vClayN);
// 貼圖裡很暗的地方是黑豆眼和鼻子：亮亮的珠子，不印黏土紋路
float bead = 1.0 - smoothstep(0.04, 0.16, dot(diffuseColor.rgb, vec3(0.333)));
float sheenT = clamp(vTouch.x, 0.0, 1.0);
float dentT = clamp(vTouch.y, 0.0, 1.0);
diffuseColor.rgb *= mix(1.0, 0.78 + 0.3 * cd.b, 0.7);
diffuseColor.rgb *= 1.0 - 0.1 * dentT;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.07 + 0.012, sheenT * 0.6);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor * (0.82 + 0.36 * cd.g) - sheenT * 0.32, 0.3, 0.98);
roughnessFactor = mix(roughnessFactor, 0.22, bead);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
// 揉過的地方被抹平：起伏變淺；壓痕裡印著指紋
float clayH = (cd.r * uBump * (1.0 - 0.75 * sheenT) + (cd.a - 0.5) * uPrint * (0.16 + 2.6 * dentT) * (1.0 - 0.6 * sheenT)) * (1.0 - bead);
normal = clayPerturb(-vViewPosition, normal, clayH, faceDirection);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
#ifdef USE_SHEEN
material.sheenColor *= 1.0 - bead;
#endif`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
// 黏土微微透光：邊緣補一點本色
float rimT = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
totalEmissiveRadiance += diffuseColor.rgb * uSSS * uSSSk * (0.35 + rimT * rimT) * (1.0 - bead);`);
  };
  m.customProgramCacheKey = () => `clay-v1-${sculpt ? 's' : 'p'}`;
  return m;
}
