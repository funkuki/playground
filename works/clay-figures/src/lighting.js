import * as THREE from 'three';
import { clayShared } from './clay.js';

// ---------- 四種燈光：切換時所有數值一起漸變 ----------

export const PRESETS = [
  {
    id: 'window', name: '窗邊午後',
    bg: 0xe9dccb, wall: 0xefe1cf, exposure: 1.0, sss: 1,
    hemi: [0xfff3e4, 0xb3967c, 1.15],
    key: [0xffd9ac, 2.7], keyPos: [-2.6, 3.3, 2.1],
    fill: [0xcfe0ff, 0.45],
    lamp: 0, spot: 0,
  },
  {
    id: 'studio', name: '白色攝影棚',
    bg: 0xf3f2ef, wall: 0xf6f5f2, exposure: 1.0, sss: 0.9,
    hemi: [0xffffff, 0xd9d4cc, 1.75],
    key: [0xffffff, 1.6], keyPos: [0.9, 3.6, 3.2],
    fill: [0xffffff, 0.95],
    lamp: 0, spot: 0,
  },
  {
    id: 'lamp', name: '夜晚檯燈',
    bg: 0x2b2633, wall: 0x6d6276, exposure: 1.05, sss: 1.2,
    hemi: [0x7b7fb8, 0x2a2230, 0.42],
    key: [0x9fb2ff, 0.28], keyPos: [2.6, 3.0, 1.2],
    fill: [0x9fb2ff, 0.08],
    lamp: 9, spot: 0,
  },
  {
    id: 'stage', name: '舞台聚光',
    bg: 0x16151b, wall: 0x3a3742, exposure: 1.0, sss: 1.3,
    hemi: [0x8a86a8, 0x141218, 0.12],
    key: [0xffffff, 0], keyPos: [0.9, 3.6, 3.2],
    fill: [0xb9c6ff, 0.12],
    lamp: 0, spot: 26,
  },
];

export function buildLights(scene, studio) {
  const hemi = new THREE.HemisphereLight();
  scene.add(hemi);

  const key = new THREE.DirectionalLight();
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -1.2, near: 0.5, far: 10 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.target.position.set(0, 0.5, -0.4);
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight();
  fill.position.set(2.8, 1.6, 2.4);
  scene.add(fill);

  // 檯燈：從燈罩往轉台打的聚光
  const lamp = new THREE.SpotLight(0xffbe74, 0, 5, 0.75, 0.6, 1.6);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0006;
  lamp.shadow.normalBias = 0.02;
  lamp.shadow.radius = 4;
  scene.add(lamp, lamp.target);
  lamp.target.position.set(0, 0.6, 0.1);

  // 舞台：正上方一道窄光
  const spot = new THREE.SpotLight(0xfff2de, 0, 8, 0.3, 0.45, 1.4);
  spot.position.set(0.35, 4.2, 2.0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0006;
  spot.shadow.normalBias = 0.02;
  spot.shadow.radius = 3;
  scene.add(spot, spot.target);
  spot.target.position.set(0, 0.4, 0);

  const cur = {}; // 目前的數值
  const from = {}, to = {};
  let t = 1;

  const pack = (p) => ({
    bg: new THREE.Color(p.bg), wall: new THREE.Color(p.wall), exposure: p.exposure, sss: p.sss,
    sky: new THREE.Color(p.hemi[0]), ground: new THREE.Color(p.hemi[1]), hemi: p.hemi[2],
    keyC: new THREE.Color(p.key[0]), key: p.key[1], keyPos: new THREE.Vector3(...p.keyPos),
    fillC: new THREE.Color(p.fill[0]), fill: p.fill[1], lamp: p.lamp, spot: p.spot,
  });
  const lerp = (a, b, k) => {
    const o = {};
    for (const n in a) {
      if (a[n].isColor) o[n] = a[n].clone().lerp(b[n], k);
      else if (a[n].isVector3) o[n] = a[n].clone().lerp(b[n], k);
      else o[n] = a[n] + (b[n] - a[n]) * k;
    }
    return o;
  };

  function apply(v, renderer) {
    scene.background = v.bg;
    studio.wallMat.color.copy(v.wall);
    renderer.toneMappingExposure = v.exposure;
    clayShared.uSSS.value = v.sss;
    hemi.color.copy(v.sky); hemi.groundColor.copy(v.ground); hemi.intensity = v.hemi;
    key.color.copy(v.keyC); key.intensity = v.key; key.position.copy(v.keyPos);
    fill.color.copy(v.fillC); fill.intensity = v.fill;
    lamp.intensity = v.lamp;
    studio.bulbMat.emissiveIntensity = v.lamp / 9 * 2.4;
    spot.intensity = v.spot;
  }

  Object.assign(cur, pack(PRESETS[0]));

  return {
    set(i, instant = false) {
      Object.assign(from, cur);
      Object.assign(to, pack(PRESETS[i]));
      t = instant ? 1 : 0;
      if (instant) Object.assign(cur, to);
    },
    update(dt, renderer) {
      // 檯燈的光跟著燈罩走
      studio.head.updateWorldMatrix(true, false);
      studio.head.getWorldPosition(lamp.position);
      if (t < 1) {
        t = Math.min(1, t + dt / 0.9);
        const k = t * t * (3 - 2 * t);
        Object.assign(cur, lerp(from, to, k));
      }
      apply(cur, renderer);
    },
  };
}
