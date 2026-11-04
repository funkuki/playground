// 節氣圖鑑共用的零件：材質快取、合併幾何、樹、房子、街屋、小人、腳踏車、車、船、水紋、鳥、雲、雪、蒸氣。
// 每個節氣的場景只負責擺放和自己特有的小動靜。樹和房子的做法來自 memphis-fuji（參考 memphis-diorama demo，MIT, LemoLab）。
// 單位大約是公尺，x 往東、z 往南；鏡頭在南邊往北看，太陽從西南照過來。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, mesh, box, rng, lerp, clamp01, ease, noEdge, setWave, setLamps } from './memphis.js';
import { person, walk } from './people.js';
import { WA, wa } from './wairo.js';

export { THREE, flat, mesh, box, lerp, clamp01, ease, noEdge, person, walk, setWave, setLamps };
export const TAU = Math.PI * 2;
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const fr = (x) => x - Math.floor(x);
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
// 出現和消失都用長出來／縮回去，不會突然跳出來
export const fadeEnds = (f, k = 8) => ease(clamp01(Math.min(f, 1 - f) * k));
// 壓扁再彈回（STYLE.md §5、§8）：先蹲 0.18 秒，再帶點過衝地彈回來
export function squash(dt) {
  if (dt < 0 || dt > 1.6) return 1;
  if (dt < 0.18) return lerp(1, 0.84, ease(dt / 0.18));
  const u = dt - 0.18;
  return 1 - 0.16 * Math.cos(u * 13) * Math.exp(-u * 4.2);
}
// 彈出來：0 → 1，帶一點過衝（back-ease）
export function pop(x) { x = clamp01(x); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

export function rand(seed) {
  const R = rng(seed);
  return { R, rr: (a, b) => a + (b - a) * R(), pick: (arr) => arr[Math.floor(R() * arr.length)] };
}

// ---------- 材質 ----------
const cache = new Map();
export const M = (hex, o = {}) => { const k = hex + JSON.stringify(o); if (!cache.has(k)) cache.set(k, flat(hex, o)); return cache.get(k); };
// 把顏色往白（k > 0）或往深靛（k < 0）推
export const lt = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? '#FFFFFF' : '#3A2F66'), Math.abs(k)).getHexString();
// 點點／條紋材質的簡寫：花紋顏色預設是主色稍微深一點
export const dots = (hex, s = 1, pc) => M(hex, { pat: 1, patCol: pc || lt(hex, -0.1), patScale: s });
export const stripes = (hex, s = 1, pc, pat = 6) => M(hex, { pat, patCol: pc || lt(hex, -0.1), patScale: s });

// 調色盤：沿用 Memphis 的名字，顏色換成和色（./wairo.js）。每頁挑 5～7 個主色 + 2～3 個粉彩，依區域集中
export const PAL = {
  yellow: WA.tamago, pink: WA.toki, sky: WA.sora, mint: WA.byakuroku, lilac: WA.fuji, peach: WA.anzu,
  cobalt: WA.tsuyukusa, coral: WA.sango, green: WA.wakatake, teal: WA.seiji, plum: WA.hatoba, white: WA.hakuji,
  trunk: WA.kurumi, base: WA.shirafuji, warm: '#F9D58E',
};

// ---------- 合併幾何：靜態的小東西依材質合併成一個 mesh，省 draw call ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(g);
    geo.dispose();
  }
  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, list] of this.groups) {
      const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive;
      parent.add(m); out.push(m); for (const g of list) g.dispose();
    }
    this.groups.clear(); return out;
  }
}
// 標記可以點的東西：kind 給場景的 poke() 用，ref 是任意資料
export function tag(obj, kind, ref, clickables) {
  obj.userData.kind = kind; obj.userData.ref = ref;
  obj.traverse((o) => { if (o.isMesh) clickables.push(o); });
  return obj;
}

// ---------- 地面 ----------
export function ground(W, hex, dot, s = 2.4) {
  const g = mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), dots(hex, s, dot), 0, 0, 0, W);
  g.castShadow = false; g.userData.kind = 'ground'; return g;
}
// 地上的一塊（田、廣場、沙灘）：薄薄的平板，可以給圓角
export function slab(b, mat, x, z, w, d, h = 0.3, y = 0, r = 0) {
  if (r <= 0) { b.add(box(w, h, d), mat, x, y, z); return; }
  const s = new THREE.Shape(), hw = w / 2, hd = d / 2;
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r); s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r); s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  b.add(new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 6 }).rotateX(-Math.PI / 2), mat, x, y, z);
}
// 一條緞帶（路、河、圳溝）：沿著點列，寬 w，高度用 yAt(x, z) 算
export function ribbon(pts, w, yAt = () => 0.05, seg = 200) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => V3(p[0], 0, p[1])));
  const pos = [], idx = [], P = c.getSpacedPoints(seg);
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    for (const s of [-1, 1]) {
      const x = P[i].x + nx * s * w / 2, z = P[i].z + nz * s * w / 2;
      pos.push(x, Math.max(yAt(x, z), yAt(P[i].x, P[i].z)), z);
    }
  }
  for (let i = 0; i < P.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }   // 法線朝上
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return { geo: g, curve: c };
}

// ---------- 樹：樹幹 + 一根枝 + 一團 lobes，向陽面加亮的 lobes（STYLE.md §9：至少五種樹冠形狀）----------
export const CS = (main, dot, bloom) => ({ main: dots(main, 0.75, dot), hi: dots(lt(main, 0.3), 0.6, lt(dot, 0.28)), bloom });
export const CROWN = {
  green: CS(WA.wakatake, '#57AC7C'), lime: CS(WA.wakaba, '#A1C473'), teal: CS(WA.seiji, '#6AAD99'), pine: CS(WA.tokiwa, '#438A6A'),   // 若竹、若葉、青磁、常磐
  maple: CS(WA.sango, '#DF715E'), gold: CS(WA.yamabuki, '#E6B158'),                                                                  // 珊瑚朱、山吹
  lilac: CS(WA.fuji, '#FFFFFF'), ice: CS(WA.sora, '#FFFFFF'), mint: CS(WA.byakuroku, '#FFFFFF'),                                       // 藤、空、白緑
};
const TRUNK = () => M(PAL.trunk);
export function tree(parent, R, x, z, kind, cs, s = 1, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); g.rotation.y = R() * 6.28; parent.add(g);
  const th = kind === 'column' ? 1.5 : 2.1;
  const tb = new Batch();
  tb.add(new THREE.CylinderGeometry(0.16, 0.32, th, 8).translate(0, th / 2, 0), TRUNK());
  tb.add(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 6).translate(0, 0.5, 0), TRUNK(), 0.05, th * 0.55, 0, 0, 0, -0.75);
  tb.build(g);
  const c = new THREE.Group(); c.position.y = th; g.add(c);
  const ry = g.rotation.y, sx = -0.75, sz = 0.6;
  const hx = Math.cos(ry) * sx - Math.sin(ry) * sz, hz = Math.sin(ry) * sx + Math.cos(ry) * sz;
  const b = new Batch(), lobes = [];
  const L = (geo, px, py, pz, r) => { b.add(geo, cs.main, px, py, pz); lobes.push([px, py, pz, r]); };
  const HI = (geo, k, py) => b.add(geo, cs.hi, hx * k, py, hz * k);
  if (kind === 'cloud') {
    for (const [dx, dy, dz, r] of [[0, 1.7, 0, 1.45], [1.15, 1.05, 0.35, 1.1], [-1.05, 1.15, -0.3, 1.15], [0.25, 2.5, -0.35, 1.0], [-0.4, 1.0, 0.95, 0.95], [0.6, 1.2, -1.0, 0.9]]) L(new THREE.SphereGeometry(r, 16, 10), dx, dy, dz, r);
    HI(new THREE.SphereGeometry(0.62, 12, 8), 1.0, 2.35); HI(new THREE.SphereGeometry(0.5, 12, 8), 1.55, 1.6);
  }
  if (kind === 'round') { L(new THREE.SphereGeometry(1.85, 20, 12).scale(1, 0.92, 1), 0, 1.5, 0, 1.8); HI(new THREE.SphereGeometry(0.85, 14, 10), 1.1, 2.3); HI(new THREE.SphereGeometry(0.52, 12, 8), 1.6, 1.55); }
  if (kind === 'egg') { L(new THREE.SphereGeometry(1.45, 18, 12).scale(0.85, 1.35, 0.85), 0, 1.8, 0, 1.3); HI(new THREE.SphereGeometry(0.6, 14, 10).scale(0.85, 1.25, 0.85), 0.75, 2.5); }
  if (kind === 'cone') { for (const [r, h, yy] of [[1.9, 2.0, 0.9], [1.5, 1.8, 2.0], [1.05, 1.6, 3.0]]) L(new THREE.ConeGeometry(r, h, 16), 0, yy, 0, r); HI(new THREE.SphereGeometry(0.3, 10, 8), 0, 3.85); }
  if (kind === 'column') { L(new THREE.CapsuleGeometry(0.9, 2.6, 6, 14), 0, 2.0, 0, 0.9); HI(new THREE.CapsuleGeometry(0.38, 1.3, 6, 10), 0.7, 2.6); }
  if (cs.bloom) for (let i = 0; i < 14; i++) {
    const [px, py, pz, r] = lobes[i % lobes.length], u = R() * 6.28, v = R() * 1.3 - 0.15;
    b.add(new THREE.SphereGeometry(0.17, 8, 6), M(cs.bloom[i % 2], { shadow: false }), px + Math.cos(u) * Math.cos(v) * r * 0.97, py + Math.sin(v) * r * 0.97, pz + Math.sin(u) * Math.cos(v) * r * 0.97);
  }
  b.build(c);
  return { g, c, p: g.position.clone(), s, ph: R() * 6.28 };
}
// 針葉樹（遠處的林子，合併成一個 mesh）
export function pine(b, x, z, s, cs = CROWN.pine, y = 0) {
  b.add(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 6).translate(0, 0.7, 0), TRUNK(), x, y, z, 0, 0, 0, s);
  for (const [r, h, yy] of [[2.0, 2.4, 2.2], [1.5, 2.1, 3.5], [0.95, 1.8, 4.7]]) b.add(new THREE.ConeGeometry(r, h, 9), cs.main, x, y + yy * s, z, 0, 0, 0, s);
}
// 樹在風裡搖：樹冠繞著樹幹頂端輕輕擺
export function sway(tr, t, k = 1, extra = 0) {
  tr.c.rotation.z = (Math.sin(t * 1.3 + tr.ph) * 0.035 + extra) * k;
  tr.c.rotation.x = Math.sin(t * 0.9 + tr.ph * 1.7) * 0.025 * k;
}

// ---------- 房子：台基、橫板牆、白色轉角、兩片屋頂和屋脊、窗框+百葉+花台、門、遮雨棚、門燈（正面朝 +z）----------
const WALLS = ['#FFEFA8', '#FFB8D9', '#5EDFB0', '#B9A0FF', '#FF9C6B', '#FFFFFF', '#5CC8FF'];
const ROOFS = [['#FF5A5F', '#FFE0DF'], ['#2F5BFF', '#FFFFFF'], ['#14B8A0', '#B8F0DC'], ['#FFD234', '#F39C12'], ['#4A4468', '#8D86C0']];
export function house(parent, x, z, o = {}) {
  const { w = 6, d = 5, i = 0, rot = 0, two = i % 3 === 1, night = false } = o;
  const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = rot; parent.add(g);
  const b = new Batch();
  const wc = o.wall || WALLS[i % WALLS.length], h = two ? 6.2 : 4.0, B = 0.45, F = d / 2;
  b.add(box(w + 0.5, B, d + 0.5), dots(PAL.base, 0.32, '#C9C0E3'));
  b.add(box(w, h, d), stripes(wc, 0.5, lt(wc, -0.07)), 0, B, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.24, h, 0.24), M('#FFFFFF'), sx * (w / 2 - 0.04), B, sz * (d / 2 - 0.04));
  const [rc, rp] = o.roof || ROOFS[(i * 3 + 1) % ROOFS.length], run = d / 2 + 0.7, rise = 2.4, Ls = Math.hypot(run, rise), th = Math.atan2(rise, run);
  for (const sd of [-1, 1]) b.add(new THREE.BoxGeometry(w + 1.1, 0.3, Ls), stripes(rc, 0.55, rp), 0, B + h + rise / 2 + 0.05, sd * run / 2, sd * th, 0, 0);
  b.add(new THREE.CylinderGeometry(0.2, 0.2, w + 1.25, 10).rotateZ(Math.PI / 2), M(lt(rc, -0.15)), 0, B + h + rise + 0.12, 0);
  const gs = new THREE.Shape(); gs.moveTo(-d / 2, 0); gs.lineTo(d / 2, 0); gs.lineTo(0, rise - 0.15); gs.closePath();
  b.add(new THREE.ExtrudeGeometry(gs, { depth: w - 0.02, bevelEnabled: false }).translate(0, 0, -(w - 0.02) / 2).rotateY(Math.PI / 2), M(wc), 0, B + h, 0);
  // 窗：白天是淺藍玻璃，night 時是暖黃燈（emit，不受夜色影響；zoneAware 讓光環掃到才亮）
  const glass = night ? M(PAL.warm, { emit: true, zoneAware: true }) : M('#BFE4FF', { lit: true });
  const shut = ['#2F5BFF', '#FF5A5F', '#14B8A0', '#FFD234', '#FF7EB3'][i % 5];
  const floors = two ? [B + 1.55, B + 4.0] : [B + 1.55];
  for (const fy of floors) for (const sx of [-w / 4 - 0.15, w / 4 + 0.15]) for (const f of [1, -1]) {
    b.add(box(1.25, 1.3, 0.1), M('#FFFFFF'), sx, fy - 0.08, f * (F + 0.03));
    b.add(box(0.98, 1.05, 0.14), glass, sx, fy + 0.04, f * (F + 0.05));
    b.add(box(0.07, 1.05, 0.16), M('#FFFFFF'), sx, fy + 0.04, f * (F + 0.06));
    if (f > 0) for (const ss of [-1, 1]) b.add(box(0.38, 1.15, 0.08), stripes(shut, 0.18, lt(shut, -0.2)), sx + ss * 0.85, fy - 0.03, F + 0.04);
    if (f > 0 && fy < B + 2) {
      b.add(box(1.35, 0.32, 0.45), M('#FFFFFF'), sx, fy - 0.42, F + 0.24);
      [-0.42, -0.14, 0.14, 0.42].forEach((k, j) => b.add(new THREE.SphereGeometry(0.17, 8, 6), M(['#FF5A5F', '#FFD234', '#FF7EB3', '#7FB2FF'][(i + j) % 4]), sx + k, fy - 0.05, F + 0.28));
    }
  }
  const dc = ['#2F5BFF', '#FF5A5F', '#14B8A0'][i % 3];
  b.add(box(1.25, 2.15, 0.1), M('#FFFFFF'), 0, B, F + 0.03);
  b.add(box(0.95, 1.95, 0.16), stripes(dc, 0.3, lt(dc, -0.18)), 0, B, F + 0.05);
  b.add(box(1.6, 0.18, 0.7), M(PAL.base), 0, 0, F + 0.5);
  b.add(box(1.7, 0.1, 0.8), M(['#FF5A5F', '#2F5BFF', '#FFD234'][(i + 1) % 3], { pat: 4, patCol: '#FFFFFF', patScale: 0.28 }), 0, B + 2.3, F + 0.42, 0.3, 0, 0);
  b.add(new THREE.SphereGeometry(0.16, 10, 8), night ? M(PAL.warm, { emit: true, zoneAware: true }) : M('#FFE38A', { lit: true }), 0.85, B + 2.0, F + 0.12);
  for (const sx of [-1.0, 1.0]) { b.add(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 10).translate(0, 0.19, 0), M('#FF9C6B'), sx, B, F + 0.55); b.add(new THREE.SphereGeometry(0.32, 10, 8), dots('#3CBE7E', 0.18, '#FF7EB3'), sx, B + 0.62, F + 0.55); }
  b.add(box(0.7, 1.6, 0.7), stripes('#FF7EB3', 0.3, '#E8679C'), w / 2 - 1.1, B + h + 1.0, -0.7);
  b.add(box(0.9, 0.16, 0.9), M(PAL.plum), w / 2 - 1.1, B + h + 2.6, -0.7);
  b.build(g);
  return { g, p: g.position.clone() };
}

// ---------- 街屋：窄面寬、立面朝 +z。騎樓、拱窗、女兒牆的山頭（迪化街、鹿港老街）----------
export function shophouse(parent, x, z, o = {}) {
  const { w = 4.2, d = 9, floors = 2, wall = '#FFB8D9', trim = '#FFFFFF', rot = 0, night = false, brick = false, sign } = o;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const b = new Batch(), FH = 3.2, H = floors * FH, F = d / 2;
  const wallM = brick ? stripes(wall, 0.32, lt(wall, -0.12)) : stripes(wall, 0.5, lt(wall, -0.06));
  b.add(box(w, H, d - 2.2), wallM, 0, 0, -1.1);                                  // 騎樓後面的主體
  b.add(box(w, H - FH, 2.2), wallM, 0, FH, F - 1.1);                             // 騎樓上方的樓層
  b.add(box(w - 0.4, 0.06, 2.2), dots('#F2E6D8', 0.3), 0, 0.02, F - 1.1);        // 騎樓地坪
  for (const sx of [-1, 1]) b.add(box(0.5, FH, 0.5), M(trim), sx * (w / 2 - 0.25), 0, F - 0.25);   // 騎樓柱
  b.add(box(w, 0.35, 0.3), M(trim), 0, FH - 0.35, F - 0.15);
  const glass = night ? M(PAL.warm, { emit: true, zoneAware: true }) : M('#BFE4FF', { lit: true });
  // 一樓店面（騎樓裡）
  b.add(box(w - 1.4, 2.2, 0.1), glass, 0, 0.2, F - 2.2 + 0.02);
  b.add(box(w - 1.2, 0.3, 0.14), M(PAL.plum), 0, 2.4, F - 2.2 + 0.04);
  // 樓上拱窗：長方窗 + 半圓頂
  for (let f = 1; f < floors; f++) {
    const y = f * FH + 0.7;
    for (const sx of w > 3.6 ? [-w / 4 - 0.05, w / 4 + 0.05] : [0]) {
      b.add(box(1.1, 1.5, 0.12), M(trim), sx, y - 0.1, F + 0.02);
      b.add(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2), M(trim), sx, y + 1.4, F + 0.02);
      b.add(box(0.8, 1.3, 0.16), glass, sx, y, F + 0.04);
      b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.16, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2), glass, sx, y + 1.3, F + 0.04);
    }
    b.add(box(w - 0.3, 0.12, 0.6), M(trim), 0, y - 0.25, F + 0.25);              // 陽台
  }
  b.add(box(w, 0.3, 0.4), M(trim), 0, H, F - 0.2);
  // 女兒牆的山頭：中間高起的三角或弧形，頂上一顆小球
  const ps = new THREE.Shape(), hw = w / 2 - 0.15;
  ps.moveTo(-hw, 0); ps.lineTo(-hw, 0.7); ps.quadraticCurveTo(-hw * 0.4, 0.75, -0.6, 1.6); ps.quadraticCurveTo(0, 2.1, 0.6, 1.6); ps.quadraticCurveTo(hw * 0.4, 0.75, hw, 0.7); ps.lineTo(hw, 0); ps.closePath();
  b.add(new THREE.ExtrudeGeometry(ps, { depth: 0.35, bevelEnabled: false, curveSegments: 6 }), M(o.gable || wall), 0, H + 0.3, F - 0.4);
  b.add(new THREE.CircleGeometry(0.32, 16), M(trim), 0, H + 1.35, F - 0.04);
  b.add(new THREE.SphereGeometry(0.22, 10, 8), M(o.ball || PAL.yellow), 0, H + 2.45, F - 0.22);
  // 屋頂：後面一片斜的瓦屋頂
  b.add(new THREE.BoxGeometry(w + 0.2, 0.25, d - 1.4), stripes(o.roof || '#FF7A59', 0.5, lt(o.roof || '#FF7A59', -0.15), 2), 0, H + 0.8, -1.2, -0.18, 0, 0);
  if (sign) b.add(box(0.7, 2.0, 0.18), stripes(sign, 0.25, lt(sign, -0.15), 4), w / 2 - 0.45, FH + 0.5, F + 0.35);
  b.build(g);
  return { g, p: g.position.clone(), H };
}

// ---------- 廟：石台基、紅牆、前廊紅柱、兩層屋頂、燕尾脊（正面朝 +z）----------
export function temple(parent, x, z, o = {}) {
  const { w = 10, d = 8, rot = 0, night = false } = o;
  const g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = rot; parent.add(g);
  const b = new Batch(), red = stripes(PAL.coral, 0.35, '#E8464C', 4), roof = stripes('#FF8A50', 0.45, '#E8693A', 6);
  b.add(box(w + 2, 0.8, d + 3), dots('#EDE6F7', 0.4, '#DCD4EE'), 0, 0, 0.5);
  b.add(box(w, 4.2, d - 1.8), red, 0, 0.8, -0.9);
  for (const sx of [-1, -0.33, 0.33, 1]) b.add(new THREE.CylinderGeometry(0.28, 0.28, 4.2, 12).translate(0, 2.1, 0), M(PAL.coral), sx * (w / 2 - 0.4), 0.8, d / 2 - 0.4);
  b.add(box(2.4, 3.0, 0.15), stripes(PAL.yellow, 0.35, '#F5B21C', 4), 0, 0.8, d / 2 - 1.75);
  for (const sx of [-1, 1]) b.add(new THREE.CircleGeometry(0.75, 20), M(PAL.yellow), sx * (w / 4 + 0.3), 3.0, d / 2 - 1.79);
  const lit = night ? M(PAL.warm, { emit: true, zoneAware: true }) : M(PAL.yellow);
  for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.45, 12, 10).scale(1, 1.2, 1), night ? M(PAL.coral, { emit: true, zoneAware: true }) : M(PAL.coral), sx * 1.8, 4.1, d / 2 - 0.2);
  // 兩層屋頂：下層前廊、上層主殿，屋脊兩端翹起的燕尾
  const roofs = [[w + 1.6, d + 1.2, 5.0, 1.8], [w * 0.75, d * 0.75, 6.6, 1.6]];
  for (const [rw, rd, y, rise] of roofs) {
    const run = rd / 2, L = Math.hypot(run, rise), th = Math.atan2(rise, run);
    for (const sd of [-1, 1]) b.add(new THREE.BoxGeometry(rw, 0.3, L), roof, 0, y + rise / 2, sd * run / 2 - 0.4, sd * th, 0, 0);
    b.add(new THREE.CylinderGeometry(0.22, 0.22, rw, 10).rotateZ(Math.PI / 2), M(PAL.yellow), 0, y + rise + 0.1, -0.4);
    for (const sx of [-1, 1]) b.add(new THREE.ConeGeometry(0.32, 2.0, 8).rotateZ(-sx * 0.85), M(PAL.yellow), sx * (rw / 2 + 0.4), y + rise + 0.6, -0.4);
    if (y > 6) for (let k = -2; k <= 2; k++) b.add(new THREE.SphereGeometry(0.28, 10, 8), M(['#5EDFB0', '#FF7EB3', '#5CC8FF', '#FFFFFF', '#5EDFB0'][k + 2]), k * 0.9, y + rise + 0.45, -0.4);
  }
  b.add(box(w * 0.75, 1.6, d * 0.75 - 1), red, 0, 5.0, -0.4);
  b.add(box(1.8, 1.0, 0.12), lit, 0, 5.3, d * 0.375 - 0.85);
  // 香爐
  b.add(new THREE.CylinderGeometry(0.8, 0.6, 1.0, 14).translate(0, 0.5, 0), M(PAL.plum), 0, 0.8, d / 2 + 2.6);
  b.add(new THREE.CylinderGeometry(0.5, 0.8, 0.8, 14).translate(0, 0.4, 0), M(PAL.yellow), 0, 1.8, d / 2 + 2.6);
  b.build(g);
  return { g, p: g.position.clone(), burner: V3(x + Math.sin(rot) * (d / 2 + 2.6), 2.7 + (o.y || 0), z + Math.cos(rot) * (d / 2 + 2.6)) };
}

// ---------- 小人（STYLE.md：遠景的點綴，只走路，不演戲）----------
export function walker(W, o) { const p = person(W, o); p.g.scale.setScalar(o.s || 1); return p; }
// 沿著一條封閉或來回的曲線走：u 是 0～1 的位置
export function walkAlong(p, curve, u, ph) {
  const a = curve.getPointAt(fr(u)), b2 = curve.getPointAt(fr(u + 0.002));
  walk(p, a.x, a.z, Math.atan2(b2.z - a.z, b2.x - a.x), ph);
  p.g.position.y += a.y;
}
// 腳踏車：一個小人坐在兩個輪子上，腳踩踏板
export function cyclist(W, o) {
  const g = new THREE.Group(); W.add(g);
  const p = person(g, o); p.g.position.y = 0.55; p.g.rotation.z = -0.25;
  const wheel = M(PAL.plum), frame = M(o.bike || PAL.coral);
  const wheels = [-0.75, 0.75].map((dx) => mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 18), wheel, dx, 0.45, 0, g));
  mesh(new THREE.BoxGeometry(1.4, 0.1, 0.08), frame, 0, 0.75, 0, g);
  mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), frame, 0.6, 0.95, 0, g);
  g.scale.setScalar(o.s || 1);
  return { g, p, wheels };
}
export function ride(c, x, z, a, ph) {
  c.g.position.set(x, 0, z); c.g.rotation.y = -a;
  c.p.legs[0].rotation.z = Math.sin(ph) * 0.7 - 0.6; c.p.legs[1].rotation.z = -Math.sin(ph) * 0.7 - 0.6;
  c.p.arms[0].rotation.z = -1.0; c.p.arms[1].rotation.z = -1.0;
  for (const w of c.wheels) w.rotation.z = -ph;
}
// 小汽車：車身、車頂、窗、輪胎（輪胎是深靛，STYLE.md §3）
export function car(W, col, s = 1) {
  const g = new THREE.Group(); W.add(g);
  const b = new Batch();
  b.add(new THREE.CapsuleGeometry(0.8, 2.4, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.75, 1), M(col), 0, 1.0, 0);
  b.add(new THREE.CapsuleGeometry(0.62, 1.1, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.85, 1.1), M('#FFFFFF'), -0.2, 1.55, 0);
  b.add(box(1.5, 0.45, 1.45), M('#BFE4FF', { lit: true }), -0.2, 1.38, 0);
  for (const dx of [-1.05, 1.05]) for (const dz of [-0.62, 0.62]) b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14).rotateX(Math.PI / 2), M('#25214A'), dx, 0.38, dz);
  b.build(g); g.scale.setScalar(s);
  return g;
}
// 沿曲線開車：慢慢加速、減速（u 的變化交給呼叫的人），車頭對準前進方向，輕輕上下晃
export function driveAlong(g, curve, u, t, yOff = 0) {
  const a = curve.getPointAt(fr(u)), b2 = curve.getPointAt(fr(u + 0.003));
  g.position.set(a.x, a.y + yOff + Math.sin(t * 9 + u * 40) * 0.03, a.z);
  g.rotation.y = -Math.atan2(b2.z - a.z, b2.x - a.x);
  g.rotation.z = Math.atan2(b2.y - a.y, Math.hypot(b2.x - a.x, b2.z - a.z));
}

// ---------- 漁船：船身、白色船艙、桅桿和旗子（船頭朝 +x）----------
export function boat(W, col, s = 1) {
  const g = new THREE.Group(); W.add(g);
  const b = new Batch();
  const hull = new THREE.Shape(); hull.moveTo(-2.6, 0.9); hull.lineTo(2.2, 0.9); hull.lineTo(3.4, 1.4); hull.lineTo(2.4, 0); hull.lineTo(-2.4, 0); hull.lineTo(-2.7, 0.9);
  const hg = new THREE.ExtrudeGeometry(hull, { depth: 2.0, bevelEnabled: false }).translate(0, 0, -1.0);
  b.add(hg, stripes(col, 0.35, lt(col, 0.35)), 0, -0.3, 0);
  b.add(box(5.2, 0.12, 1.9), M('#FFF4DD'), -0.2, 0.6, 0);
  b.add(box(1.8, 1.4, 1.5), M('#FFFFFF'), -1.0, 0.65, 0);
  b.add(box(1.85, 0.5, 1.55), M('#BFE4FF', { lit: true }), -1.0, 1.35, 0);
  b.add(box(2.1, 0.18, 1.8), M(lt(col, -0.1)), -1.0, 2.05, 0);
  b.add(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6).translate(0, 1.7, 0), M('#FFFFFF'), 0.9, 0.6, 0);
  b.build(g);
  const flag = mesh(box(0.9, 0.55, 0.05).translate(0.45, 0, 0), M(PAL.yellow, { lit: true }), 0.9, 3.5, 0, g);
  flag.userData.noOutline = true;
  g.scale.setScalar(s);
  return { g, flag };
}

// ---------- 水紋：白色的小波浪（InstancedMesh，不描邊），在一個區域裡往一個方向漂 ----------
export function squiggles(W, R, n, inside, dir = [1, 0], speed = 1.2, LOOP = 30) {
  const pts = []; for (let i = 0; i <= 8; i++) pts.push(V3((i - 4) * 0.3, 0, Math.sin(i * 1.5) * 0.16));
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.08, 5);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), n);
  im.userData.noOutline = true; im.frustumCulled = false; W.add(im);
  const S = Array.from({ length: n }, () => { const p = inside(); return { p, ph: R(), s: 0.7 + R() * 0.8 }; });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -Math.atan2(dir[1], dir[0])), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const travel = speed * LOOP / 3;
  return (t) => {
    for (let i = 0; i < n; i++) {
      const s = S[i], f = fr(t / (LOOP / 3) + s.ph), k = fadeEnds(f, 5) * s.s;
      pos.set(s.p.x + dir[0] * (f - 0.5) * travel, s.p.y + 0.06, s.p.z + dir[1] * (f - 0.5) * travel);
      im.setMatrixAt(i, m4.compose(pos, q, sc.set(k, 1, k)));
    }
    im.instanceMatrix.needsUpdate = true;
  };
}
// 漣漪圈：點水面時擴散的白圈
export function ripples(W, n = 8) {
  const geo = new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2);
  const list = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthWrite: false }));
    m.userData.noOutline = true; m.visible = false; W.add(m); return m;
  });
  const ev = []; let k = 0;
  return {
    add(p, t, y = 0.08) { for (let j = 0; j < 3; j++) ev.push({ m: list[k++ % n], p: p.clone(), T: t + j * 0.25, y }); },
    update(t) {
      for (const m of list) m.visible = false;
      for (let i = ev.length - 1; i >= 0; i--) {
        const e = ev[i], dt = t - e.T;
        if (dt > 2.2) { ev.splice(i, 1); continue; }
        if (dt < 0) continue;
        e.m.visible = true; e.m.position.set(e.p.x, e.y, e.p.z); e.m.scale.setScalar(0.3 + easeOut(dt / 2.2) * 3.2);
        e.m.material.opacity = 1 - dt / 2.2;
      }
    },
  };
}

// ---------- 鳥：白鷺、海鷗（身體 + 兩片會拍的翅膀，不描邊太細的部分）----------
// 平面形狀擠成薄片（x 往前、v 往翼尖），sd 決定左右
export const flatShape = (pts, sd = 1) => {
  const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v * sd)));
  return new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false, curveSegments: 4 }).rotateX(Math.PI / 2);
};
// 細長的翅膀：前緣在腕部往前凸，翼尖尖尖地往後掠（海鷗、燕子、白鷺都適用）；尾巴是小小的楔形
const BIRD_WING = [[0.2, 0], [0.3, 0.32], [0.27, 0.55], [0.12, 0.82], [-0.08, 1.05], [-0.22, 1.25], [-0.14, 0.98], [-0.14, 0.7], [-0.2, 0.42], [-0.22, 0.18], [-0.2, 0]];
const BIRD_TAIL = [[0, 0.1], [-0.38, 0.17], [-0.46, 0.06], [-0.42, 0], [-0.46, -0.06], [-0.38, -0.17], [0, -0.1]];
export function bird(W, col = '#FFFFFF', s = 1) {
  const g = new THREE.Group(); W.add(g);
  const m = M(col, { shadow: false });
  mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 10).rotateZ(Math.PI / 2), m, 0, 0, 0, g);
  mesh(new THREE.SphereGeometry(0.17, 10, 8), m, 0.5, 0.12, 0, g);
  mesh(new THREE.ConeGeometry(0.06, 0.35, 6).rotateZ(-Math.PI / 2), M(PAL.yellow, { shadow: false }), 0.75, 0.1, 0, g);
  mesh(flatShape(BIRD_TAIL), m, -0.38, 0.04, 0, g);
  const wings = [-1, 1].map((sd) => { const w = new THREE.Group(); w.position.set(0.02, 0.08, sd * 0.12); g.add(w); mesh(flatShape(BIRD_WING, sd), m, 0, 0, 0, w); w.userData.sd = sd; return w; });
  g.scale.setScalar(s);
  return { g, wings };
}
export function flap(bd, ph, amp = 0.7) { for (const w of bd.wings) w.rotation.x = w.userData.sd * Math.sin(ph) * amp; }

// ---------- 雲：幾顆不描邊的球，在地上投下紫色的雲影 ----------
// o.col 雲的顏色（雨雲偏灰紫、夕陽偏橘粉、夜裡偏深）；o.shape：puffy 積雲、flat 層雲（扁長）、tall 積雨雲（往上堆高）；o.speed 飄的速度
const PUFF = [[0, 0, 0, 3], [3, -0.6, 0.5, 2.2], [-3.1, -0.8, 0, 2.3], [1, 1.5, -0.6, 2.2], [-1.4, 0.9, 0.8, 1.9]];
const FLAT = [[0, 0, 0, 3], [3.6, -0.3, 0.6, 2.4], [-3.8, -0.2, -0.3, 2.6], [7, -0.6, 0, 1.9], [-7.2, -0.5, 0.4, 1.8], [1.4, 0.8, -0.8, 2.0]];
const TALL = [[0, 0, 0, 3.2], [3, -0.8, 0.6, 2.4], [-3, -0.8, 0, 2.5], [0.6, 3.2, 0, 2.8], [-0.8, 5.8, 0.3, 2.4], [0.5, 8.0, -0.2, 2.0], [2.2, 5.0, 0.6, 1.8], [0.2, 9.8, 0, 2.9]];
export function clouds(W, R, list, LOOP = 30, o = {}) {
  const { col = '#FFFFFF', shape = 'puffy', speed = 1 } = o;
  const m = M(col, { lit: true, shadow: false });
  const parts = shape === 'flat' ? FLAT : shape === 'tall' ? TALL : PUFF;
  const out = list.map(([x, y, z, s]) => {
    const g = new THREE.Group(); W.add(g);
    const b = new Batch();
    for (const [dx, dy, dz, r] of parts) b.add(new THREE.SphereGeometry(r, 16, 10), m, dx, dy, dz);
    const ms = b.build(g); for (const mm of ms) mm.receiveShadow = false;
    if (shape === 'flat') g.scale.set(s * 1.2, s * 0.42, s * 0.9); else if (shape === 'tall') g.scale.set(s, s * 0.95, s * 0.85); else g.scale.set(s, s * 0.7, s * 0.8);
    noEdge(g);
    return { g, x, y, z, s: g.scale.clone(), ph: R() };   // ph 沒在用，但留著讓亂數序列和之前一樣，場景其他東西的位置才不會變
  });
  // 雲在 cx ± span/2 之間循環飄（cx 對準鏡頭的 target），飄到兩端時縮小消失、再從另一頭長出來；t = 0 時就在寫好的 x 上
  return (t, span = 110, cx = 0) => {
    for (const c of out) {
      const f = fr((c.x - cx) / span + 0.5 + t * speed / (LOOP * 2));
      c.g.position.set(cx + (f - 0.5) * span, c.y, c.z); c.g.scale.copy(c.s).multiplyScalar(fadeEnds(f, 6));
    }
  };
}

// ---------- 粒子：雪、蒸氣（都不描邊，STYLE.md §2）----------
export function snowfall(W, R, n, area, LOOP = 30) {
  const [x0, x1, z0, z1, top] = area;
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), n);
  im.userData.noOutline = true; im.frustumCulled = false; W.add(im);
  const S = Array.from({ length: n }, () => ({ x: lerp(x0, x1, R()), z: lerp(z0, z1, R()), ph: R(), sp: 1 + Math.floor(R() * 3), w: R() * 6.28, s: 0.6 + R() * 0.8 }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  return (t, yFloor = () => 0) => {
    for (let i = 0; i < n; i++) {
      const s = S[i], f = fr(t * s.sp / LOOP * 2 + s.ph);
      const x = s.x + Math.sin(t * 0.8 + s.w) * 1.2 - f * 4, z = s.z + Math.cos(t * 0.6 + s.w) * 0.8;
      const fl = yFloor(x, z), y = lerp(top, fl, f);
      pos.set(x, y, z); im.setMatrixAt(i, m4.compose(pos, q, sc.setScalar(s.s * fadeEnds(f, 10))));
    }
    im.instanceMatrix.needsUpdate = true;
  };
}
// 雨：一條條斜斜的細線落下，落到地面就從頂上重來（不描邊）
export function rain(W, R, n, area, LOOP = 30) {
  const [x0, x1, z0, z1, top] = area;
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 3), new THREE.MeshBasicMaterial({ color: '#9FB3D6', transparent: true, opacity: 0.8 }), n);
  im.userData.noOutline = true; im.frustumCulled = false; im.castShadow = false; W.add(im);
  const S = Array.from({ length: n }, () => ({ x: lerp(x0, x1, R()), z: lerp(z0, z1, R()), ph: R(), sp: 6 + Math.floor(R() * 4) }));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), 0.18), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  return (t, yFloor = () => 0, k = 1) => {
    for (let i = 0; i < n; i++) {
      const s = S[i], f = fr(t * s.sp / LOOP + s.ph), fl = yFloor(s.x, s.z);
      pos.set(s.x - f * 3, lerp(top, fl, f), s.z); im.setMatrixAt(i, m4.compose(pos, q, sc.setScalar(i / n < k ? 1 : 0.0001)));
    }
    im.instanceMatrix.needsUpdate = true;
  };
}
// 小人的配件：雨傘（舉在頭上）、斗笠（尖尖的竹帽）
export function umbrella(p, col) {
  const u = new THREE.Group(); u.position.set(0.15, 2.5, 0.25); p.g.add(u);
  mesh(new THREE.ConeGeometry(0.85, 0.42, 10).translate(0, 0.21, 0), stripes(col, 0.25, lt(col, 0.35), 4), 0, 0, 0, u);
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 4).translate(0, -0.45, 0), M(PAL.plum), 0, 0, 0, u);
  p.arms[1].rotation.z = -2.4;
  return u;
}
export function straw(p, col = '#E6C68A') { return mesh(new THREE.ConeGeometry(0.52, 0.32, 14).translate(0, 0.16, 0), stripes(col, 0.15, '#D4B176', 4), 0, 0.12, 0, p.head); }
// 蒸氣：從幾個點冒出來、變大、變淡的白球
export function steam(W, R, spots, perSpot = 5, period = 3.2) {
  const n = spots.length * perSpot;
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 12, 8), M('#FFFFFF', { lit: true, shadow: false }), n);
  im.userData.noOutline = true; im.frustumCulled = false; im.castShadow = false; W.add(im);
  const S = []; spots.forEach((p, k) => { for (let j = 0; j < perSpot; j++) S.push({ p, ph: j / perSpot + R() * 0.1, w: R() * 6.28 }); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  return (t, boost = 0) => {
    for (let i = 0; i < n; i++) {
      const s = S[i], f = fr(t / period + s.ph), k = Math.sin(Math.PI * f) * (0.5 + f * 0.9) * (s.p[3] || 1) * (1 + boost);
      pos.set(s.p[0] + Math.sin(f * 4 + s.w) * 0.35 + f * 0.8, s.p[1] + f * 3.2 * (s.p[3] || 1) * (1 + boost * 0.6), s.p[2] + Math.cos(f * 3 + s.w) * 0.25);
      im.setMatrixAt(i, m4.compose(pos, q, sc.setScalar(Math.max(0.001, k))));
    }
    im.instanceMatrix.needsUpdate = true;
  };
}
// 一陣噴出來的小碎片（點擊的回饋：花瓣、紙屑、雪花），各自拋物線落下
export function bursts(W, cols, n = 40) {
  const geo = new THREE.BoxGeometry(0.28, 0.06, 0.2);
  const mats = cols.map((c) => new THREE.MeshBasicMaterial({ color: wa(c) }));
  const ims = mats.map((m) => { const im = new THREE.InstancedMesh(geo, m, n); im.userData.noOutline = true; im.frustumCulled = false; im.count = 0; W.add(im); return im; });
  const ev = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  return {
    add(p, t, R, power = 1) { ev.push({ p: p.clone(), T: t, parts: Array.from({ length: n }, () => ({ vx: (R() - 0.5) * 6 * power, vy: (2 + R() * 5) * power, vz: (R() - 0.5) * 6 * power, r: R() * 6, c: Math.floor(R() * cols.length) })) }); if (ev.length > 3) ev.shift(); },
    update(t) {
      const cnt = ims.map(() => 0);
      for (const b of ev) {
        const dt = t - b.T; if (dt < 0 || dt > 2.6) continue;
        for (const s of b.parts) {
          const im = ims[s.c], i = cnt[s.c]; if (i >= n) continue;
          const y = b.p.y + s.vy * dt - 4.5 * dt * dt;
          if (y < 0.05) continue;
          pos.set(b.p.x + s.vx * dt, y, b.p.z + s.vz * dt);
          im.setMatrixAt(i, m4.compose(pos, q.setFromEuler(e.set(s.r + dt * 5, s.r * 2 + dt * 3, 0)), sc));
          cnt[s.c]++;
        }
      }
      ims.forEach((im, k) => { im.count = cnt[k]; im.instanceMatrix.needsUpdate = true; });
    },
  };
}
// 山：幾顆壓扁的多角錐排成一道稜線，條紋花紋（遠景）
export function ridge(b, list, mat) {
  for (const [x, z, r, h, seg = 6, ry = 0] of list) b.add(new THREE.ConeGeometry(r, h, seg, 1).translate(0, h / 2, 0), mat, x, 0, z, 0, ry, 0, 1, 1, 0.65);
}
