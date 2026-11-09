// 羊皮紙故事書：書頁用 canvas 畫（紙紋、黑體字假文字、紅金藤蔓），插圖是另一個場景的 render target
import * as THREE from 'three';
import { C, poly, rng } from './kit.js';

export const PAGE_W = 5.4;
export const PAGE_H = 6.6;
const CW = 1024;
const CH = Math.round((CW * PAGE_H) / PAGE_W);
const INK = '#2a2220', RED = '#9e2a26', GOLD = '#c4a24c', STEM = '#33402f';
const FONT = '"UnifrakturMaguntia", "Old English Text MT", serif';

// ---------- 紙 ----------
function parchment(ctx, side, r) {
  ctx.fillStyle = '#efe5cd';
  ctx.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 160; i++) {
    const x = r() * CW, y = r() * CH, rad = 20 + r() * 130;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(150,118,70,${0.02 + r() * 0.04})`);
    g.addColorStop(1, 'rgba(150,118,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.strokeStyle = 'rgba(120,95,60,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 220; i++) {
    const x = r() * CW, y = r() * CH, l = 10 + r() * 40, a = r() * Math.PI;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  // 書背陰影與外緣
  const spineX = side === 'left' ? CW : 0;
  const sg = ctx.createLinearGradient(spineX, 0, side === 'left' ? CW - 190 : 190, 0);
  sg.addColorStop(0, 'rgba(80,52,28,0.42)');
  sg.addColorStop(0.35, 'rgba(80,52,28,0.12)');
  sg.addColorStop(1, 'rgba(80,52,28,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, CW, CH);
  const edge = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.45, CW / 2, CH / 2, CH * 0.8);
  edge.addColorStop(0, 'rgba(110,80,40,0)');
  edge.addColorStop(1, 'rgba(110,80,40,0.22)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, CW, CH);
}

// ---------- 假文字 ----------
const LETTERS = 'abcdefghilmnopqrstuvaeiouaeiounrst';
function word(r) {
  let s = '';
  const n = 2 + Math.floor(r() * 7);
  for (let i = 0; i < n; i++) s += LETTERS[Math.floor(r() * LETTERS.length)];
  if (r() < 0.15) s = s[0].toUpperCase() + s.slice(1);
  if (r() < 0.08) s += r() < 0.5 ? '.' : ',';
  return s;
}
function textLines(ctx, r, x, y, w, lines, { size = 30, lh = 46, cap = null } = {}) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  let capW = 0;
  if (cap) {
    const cs = lh * 2.6;
    ctx.fillStyle = 'rgba(196,162,76,0.22)';
    ctx.fillRect(x, y - lh * 0.9, cs * 0.92, lh * 2.55);
    ctx.font = `${cs}px ${FONT}`;
    ctx.fillStyle = RED;
    ctx.fillText(cap, x + cs * 0.08, y + lh * 1.4);
    capW = cs * 0.92 + 14;
    ctx.font = `${size}px ${FONT}`;
  }
  for (let li = 0; li < lines; li++) {
    const ox = li < 3 ? capW : 0, lw = w - ox;
    const last = li === lines - 1, target = last ? lw * (0.35 + r() * 0.4) : lw;
    const ws = [];
    let tw = 0;
    while (true) {
      const wd = word(r), ww = ctx.measureText(wd).width;
      if (tw + ww + (ws.length ? 12 : 0) > target) break;
      ws.push([wd, ww]);
      tw += ww + (ws.length > 1 ? 12 : 0);
    }
    const gap = !last && ws.length > 1 ? (lw - ws.reduce((a, b) => a + b[1], 0)) / (ws.length - 1) : 12;
    let cx = x + ox;
    ctx.fillStyle = INK;
    for (const [wd, ww] of ws) { ctx.fillText(wd, cx, y + li * lh); cx += ww + gap; }
  }
  return y + lines * lh;
}

// ---------- 藤蔓 ----------
function leafShape(ctx, x, y, a, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.55, -s * 0.45, s, 0);
  ctx.quadraticCurveTo(s * 0.55, s * 0.45, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}
function flower(ctx, x, y, s, r) {
  const petal = r() < 0.5 ? RED : GOLD;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = petal;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = petal === RED ? GOLD : RED;
  ctx.fill();
}
function vine(ctx, r, x1, y1, x2, y2) {
  const len = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const pt = (t) => {
    const o = Math.sin(t * len * 0.022) * 9;
    return [x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o];
  };
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) { const [px, py] = pt(i / 80); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.lineWidth = 5;
  ctx.strokeStyle = STEM;
  ctx.lineCap = 'round';
  ctx.stroke();
  const n = Math.floor(len / 46);
  for (let i = 1; i < n; i++) {
    const t = i / n, [px, py] = pt(t), side = i % 2 ? 1 : -1;
    const base = Math.atan2(y2 - y1, x2 - x1) + side * (0.9 + r() * 0.4);
    if (i % 5 === 2) flower(ctx, px + nx * side * 22, py + ny * side * 22, 13 + r() * 4, r);
    else leafShape(ctx, px, py, base, 24 + r() * 10, r() < 0.55 ? GOLD : RED);
    if (i % 4 === 0) {
      ctx.beginPath();
      const cx = px - nx * side * 16, cy = py - ny * side * 16;
      ctx.arc(cx, cy, 8, 0, Math.PI * 1.6);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = STEM;
      ctx.stroke();
    }
  }
}
function corner(ctx, x, y, r) {
  flower(ctx, x, y, 20, r);
  leafShape(ctx, x + 14, y + 6, 0.5, 34, RED);
  leafShape(ctx, x - 6, y + 16, 1.9, 30, GOLD);
}

// ---------- 一頁 ----------
// blocks：{type:'title'} / {type:'text', lines, cap} / {type:'illus', h} / {type:'end'} / {type:'gap', h}
export function pageTexture(side, seed, blocks) {
  const cv = document.createElement('canvas');
  cv.width = CW;
  cv.height = CH;
  const ctx = cv.getContext('2d'), r = rng(seed);
  parchment(ctx, side, r);
  const inner = 120, outer = 150;
  const x0 = side === 'left' ? outer : inner, w = CW - inner - outer;
  // 外側一條直藤、下緣一條橫藤
  const vx = side === 'left' ? 78 : CW - 78;
  vine(ctx, r, vx, 120, vx, CH - 120);
  vine(ctx, r, side === 'left' ? 110 : CW - 110, CH - 78, side === 'left' ? CW - 170 : 170, CH - 78);
  corner(ctx, vx, 110, r);
  corner(ctx, vx, CH - 80, r);
  const illus = [];
  let y = 150;
  for (const b of blocks) {
    if (b.type === 'gap') y += b.h;
    else if (b.type === 'text') y = textLines(ctx, r, x0, y + 30, w, b.lines, { cap: b.cap }) + 6;
    else if (b.type === 'illus') { illus.push({ x: x0 - 10, y, w: w + 20, h: b.h }); y += b.h + 20; }
    else if (b.type === 'title') {
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `92px ${FONT}`;
      ctx.fillText("Alice's", x0 + w / 2, y + 100);
      ctx.fillText('Adventures', x0 + w / 2, y + 200);
      ctx.font = `64px ${FONT}`;
      ctx.fillText('in Wonderland', x0 + w / 2, y + 285);
      ctx.fillStyle = RED;
      ctx.font = `40px ${FONT}`;
      ctx.fillText('by Lewis Carroll', x0 + w / 2, y + 360);
      ctx.fillStyle = GOLD;
      ctx.fillRect(x0 + w * 0.3, y + 392, w * 0.4, 4);
      ctx.textAlign = 'left';
      y += 420;
    } else if (b.type === 'end') {
      ctx.textAlign = 'center';
      ctx.fillStyle = RED;
      ctx.font = `150px ${FONT}`;
      ctx.fillText('T', x0 + w / 2 - 150, y + 150);
      ctx.fillStyle = INK;
      ctx.font = `120px ${FONT}`;
      ctx.fillText('he End', x0 + w / 2 + 50, y + 150);
      ctx.textAlign = 'left';
      y += 200;
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return { tex, illus };
}

// 畫布像素 → 書頁平面座標
function rectToPlane(rc) {
  return {
    x: ((rc.x + rc.w / 2) / CW) * PAGE_W - PAGE_W / 2,
    y: PAGE_H / 2 - ((rc.y + rc.h / 2) / CH) * PAGE_H,
    w: (rc.w / CW) * PAGE_W,
    h: (rc.h / CH) * PAGE_H,
  };
}

// 插圖：獨立的小舞台，畫在透明背景的 render target 上，再貼到頁面
export function illustration(pageMesh, rc, { viewH = 6.2, groundFrom = 0.55 } = {}) {
  const p = rectToPlane(rc), aspect = p.w / p.h;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera((-viewH * aspect) / 2, (viewH * aspect) / 2, viewH / 2, -viewH / 2, 0.1, 100);
  camera.position.z = 50;
  const world = new THREE.Group();
  world.position.y = -viewH / 2 + groundFrom;
  scene.add(world);
  const rt = new THREE.WebGLRenderTarget(Math.round(rc.w * 1.5), Math.round(rc.h * 1.5), { samples: 4 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, depthWrite: false }));
  plane.position.set(p.x, p.y, 0.004);
  pageMesh.add(plane);
  return { scene, camera, world, rt, width: viewH * aspect };
}

// 一本打開的書：紅色封皮、書背厚度、左右兩頁
export function openBook(parent, leftTex, rightTex) {
  const root = new THREE.Group();
  parent.add(root);
  const shadow = new THREE.Group();
  shadow.position.set(0.25, -0.3, -0.3);
  root.add(shadow);
  poly(shadow, [[-5.95, -3.7], [5.95, -3.7], [5.95, 3.55], [-5.95, 3.55]], 0x2a2222);
  poly(root, [[-5.9, -3.6], [5.9, -3.6], [5.9, 3.55], [-5.9, 3.55]], C.red, -0.2);
  poly(root, [[-5.9, -3.6], [5.9, -3.6], [5.9, -3.45], [-5.9, -3.45]], C.redDark, -0.19);
  // 書頁的厚度：左右各疊幾層，越下面越暗
  const stack = [0xb9ab8c, 0xcdbf9f, 0xdcd0b4];
  stack.forEach((c, i) => {
    const o = (3 - i) * 0.055;
    poly(root, [[-PAGE_W - o, -PAGE_H / 2 - o * 0.8], [0, -PAGE_H / 2 - o * 0.5], [0, PAGE_H / 2], [-PAGE_W - o, PAGE_H / 2 - o * 0.2]], c, -0.15 + i * 0.01);
    poly(root, [[PAGE_W + o, -PAGE_H / 2 - o * 0.8], [0, -PAGE_H / 2 - o * 0.5], [0, PAGE_H / 2], [PAGE_W + o, PAGE_H / 2 - o * 0.2]], c, -0.15 + i * 0.01);
  });
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
  const left = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: leftTex }));
  left.position.set(-PAGE_W / 2, 0, 0);
  const right = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: rightTex }));
  right.position.set(PAGE_W / 2, 0, 0);
  root.add(left, right);
  return { root, left, right };
}

// 翻頁：以書背為軸。正面是原本的右頁，背面是翻過去後的左頁
export function flipPage(book, frontTex, backTex) {
  const pivot = new THREE.Group();
  pivot.position.z = 0.05;
  book.root.add(pivot);
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
  const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: frontTex, side: THREE.FrontSide }));
  front.position.x = PAGE_W / 2;
  const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, side: THREE.FrontSide }));
  back.position.x = PAGE_W / 2;
  back.rotation.y = Math.PI;
  pivot.add(front, back);
  return { pivot, front, back };
}
