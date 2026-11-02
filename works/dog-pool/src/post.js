import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { strokeTex } from './paint.js';

// 不透明水彩後製：用筆觸貼圖扭曲取樣位置讓邊緣變毛，再疊紙紋和筆觸明暗
export function gouachePass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tStroke: { value: strokeTex },
      uSize: { value: new THREE.Vector2(1, 1) },
      uAmount: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse, tStroke;
      uniform vec2 uSize;
      uniform float uAmount;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec2 px = vUv * uSize;           // CSS 像素
        vec2 su = px / 512.0;
        vec2 n = vec2(texture2D(tStroke, su * 0.7).r, texture2D(tStroke, su * 0.7 + vec2(0.31, 0.57)).r) - 0.5;
        vec2 uv = vUv + n * 10.0 * uAmount / uSize;
        vec3 c = texture2D(tDiffuse, uv).rgb;
        float g = noise(px * 0.55) * 0.5 + noise(px * 0.13) * 0.35 + noise(px * 0.03) * 0.15;
        c *= 1.0 + (g - 0.5) * 0.09 * uAmount;
        float s = texture2D(tStroke, su * 1.4 + 0.2).r - 0.5;
        c *= 1.0 + s * 0.1 * uAmount;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
