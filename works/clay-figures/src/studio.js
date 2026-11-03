import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clayMaterial } from './clay.js';

// ---------- 黏土工作室：木桌、轉台、牆上的展示架、一盞檯燈 ----------
// 單位：公仔高 1。桌面在 y = 0，轉台頂面在 TOP。

export const TOP = 0.11;
export const SHELF = { y: 1.32, z: -1.62, gap: 0.6, scale: 0.4 };

const flat = (color, rough = 0.85) => clayMaterial({ color, bump: 0.0012, print: 0.00015, rough, sss: 0.03, sheen: 0.1, period: 0.6 });

function mesh(geo, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

// 名牌：小小的奶油色黏土片，字用 canvas 畫
function nameplate(text, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f3e8d8';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#6d5a4c';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '600 52px "Noto Sans TC", "PingFang TC", sans-serif';
  g.fillText(text, 256, sub ? 52 : 64);
  if (sub) {
    g.font = '500 26px "Inter Tight", "Noto Sans TC", sans-serif';
    g.fillStyle = '#a8968a';
    g.fillText(sub, 256, 100);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = mesh(new RoundedBoxGeometry(0.34, 0.085, 0.012, 2, 0.006), [
    flat(0xf3e8d8), flat(0xf3e8d8), flat(0xf3e8d8), flat(0xf3e8d8),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), flat(0xf3e8d8),
  ], { cast: false });
  return m;
}

// 還沒捏好的公仔：一團用保鮮膜包著的黏土
function clayLump(color) {
  const geo = new THREE.SphereGeometry(0.42, 48, 32);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9 + 1.3) * Math.sin(v.y * 7 + v.z * 5) * 0.06 + Math.sin(v.z * 13 + v.y * 4) * 0.025;
    v.multiplyScalar(1 + n);
    v.y *= 0.82;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.translate(0, 0.34, 0);
  return mesh(geo, clayMaterial({ color, bump: 0.004, print: 0.0005 }));
}

export function buildStudio(scene) {
  const wood = flat(0xc89a6c, 0.8);
  const woodDark = flat(0x9c7350, 0.8);
  const cream = flat(0xf2e6d4, 0.85);

  // 桌面和牆
  const table = mesh(new RoundedBoxGeometry(7, 0.2, 4.2, 3, 0.04), wood, { cast: false });
  table.position.set(0, -0.1, -0.2);
  scene.add(table);
  const wallMat = flat(0xefe4d6, 0.95);
  const wall = mesh(new THREE.PlaneGeometry(14, 6), wallMat, { cast: false });
  wall.position.set(0, 2.6, -1.95);
  scene.add(wall);

  // ---------- 轉台：木頭底座 + 會轉的奶油色圓盤 ----------
  const turn = new THREE.Group();
  scene.add(turn);
  const base = mesh(new THREE.CylinderGeometry(0.6, 0.64, 0.05, 72), woodDark);
  base.position.y = 0.025;
  turn.add(base);
  const disc = new THREE.Group();
  disc.position.y = 0.05;
  turn.add(disc);
  const top = mesh(new THREE.CylinderGeometry(0.58, 0.58, TOP - 0.05, 96), cream);
  top.position.y = (TOP - 0.05) / 2;
  disc.add(top);
  // 圓盤邊上一圈小圓點，看得出它在轉
  const dotMat = flat(0xd9c3a5, 0.85);
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const tick = mesh(new THREE.SphereGeometry(0.009, 10, 8), dotMat, { cast: false });
    tick.position.set(Math.cos(a) * 0.58, (TOP - 0.05) / 2, Math.sin(a) * 0.58);
    tick.rotation.y = -a;
    disc.add(tick);
  }
  const stand = new THREE.Group(); // 公仔站在這裡（跟著圓盤轉）
  stand.position.y = TOP - 0.05;
  disc.add(stand);

  // ---------- 展示架：四格，掛在後面的牆上 ----------
  const shelf = new THREE.Group();
  shelf.position.set(0, SHELF.y, SHELF.z);
  scene.add(shelf);
  const W = SHELF.gap * 4 + 0.08, D = 0.34, Hh = 0.56;
  const board = (w, h, d) => mesh(new RoundedBoxGeometry(w, h, d, 2, 0.012), wood);
  const bottom = board(W, 0.05, D); bottom.position.set(0, -0.025, 0); shelf.add(bottom);
  const lid = board(W, 0.05, D); lid.position.set(0, Hh + 0.025, 0); shelf.add(lid);
  for (let i = 0; i <= 4; i++) {
    const side = board(0.04, Hh, D);
    side.position.set((i - 2) * SHELF.gap, Hh / 2, 0);
    shelf.add(side);
  }
  const back = mesh(new THREE.PlaneGeometry(W, Hh), flat(0xe6d6c0, 0.95), { cast: false });
  back.position.set(0, Hh / 2, -D / 2 + 0.005);
  shelf.add(back);
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group();
    s.position.set((i - 1.5) * SHELF.gap, 0, 0.02);
    s.scale.setScalar(SHELF.scale);
    shelf.add(s);
    slots.push(s);
  }

  // ---------- 檯燈：夜晚的燈光從這裡來 ----------
  const lamp = new THREE.Group();
  lamp.position.set(-1.45, 0, 0.05);
  lamp.rotation.y = 0.15;
  scene.add(lamp);
  const lampMat = flat(0x7f9db8, 0.75);
  const lb = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.06, 40), lampMat);
  lb.position.y = 0.03;
  lamp.add(lb);
  // 兩段燈臂：底座 → 關節 → 燈罩，關節放一顆小球
  const joints = [new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.16, 0.8, 0), new THREE.Vector3(0.58, 0.98, 0)];
  for (let i = 0; i < 2; i++) {
    const a = joints[i], b = joints[i + 1];
    const arm = mesh(new THREE.CylinderGeometry(0.024, 0.024, a.distanceTo(b), 16), lampMat);
    arm.position.copy(a).lerp(b, 0.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    lamp.add(arm);
    const knob = mesh(new THREE.SphereGeometry(0.04, 16, 12), lampMat);
    knob.position.copy(b);
    lamp.add(knob);
  }
  const head = new THREE.Group();
  head.position.copy(joints[2]).add(new THREE.Vector3(0.06, -0.04, 0));
  head.rotation.z = 0.7; // 燈罩開口朝右下，對著轉台
  lamp.add(head);
  const shade = mesh(new THREE.CylinderGeometry(0.07, 0.17, 0.2, 40, 1, true), lampMat);
  shade.material.side = THREE.DoubleSide;
  head.add(shade);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc77a, emissiveIntensity: 0 });
  const bulb = mesh(new THREE.SphereGeometry(0.06, 24, 16), bulbMat, { cast: false });
  bulb.position.y = -0.05;
  head.add(bulb);

  // 點擊判斷用
  const turnTargets = [top, base];

  return { turn, disc, stand, shelf, slots, lamp, head, bulbMat, wallMat, turnTargets, nameplate, clayLump };
}
