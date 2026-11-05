// 河口湖北岸看富士山：山、湖、湖畔小鎮、櫻花、五重塔、芝櫻和油菜花田、富士急行的鐵軌。
// 全部用程式產生；房子和樹的做法參考 memphis-diorama 的 demo（MIT, LemoLab）。
// 單位大約是公尺，x 往東、z 往南（鏡頭在南邊往北看，富士山在湖的後面）。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, mesh, box, rng, lerp, noEdge } from './memphis.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const R = rng(3776);
const rr = (a, b) => a + (b - a) * R();
const pick = (arr) => arr[Math.floor(R() * arr.length)];

const cache = new Map();
export const M = (hex, o = {}) => { const k = hex + JSON.stringify(o); if (!cache.has(k)) cache.set(k, flat(hex, o)); return cache.get(k); };
// 把顏色往白（k > 0）或往深靛（k < 0）推
export const lt = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? '#FFFFFF' : '#3A2F66'), Math.abs(k)).getHexString();

// 靜態的小東西依材質合併成一個 mesh，省 draw call（花紋用世界座標，合併後不受影響）
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    _m.compose(V3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    g.applyMatrix4(_m);
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    this.groups.get(mat).push(g);
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

// ---------- 四季：會換季的材質記住 [春, 夏, 秋, 冬] 四組顏色 ----------
// 平常畫 uCol（這一季）；換季時 life.js 用 setSeason 推一圈波紋，圈內畫 uCol2（下一季），STYLE.md §3、§8
export const SEASONAL = [];
export function S(cols, o = {}) {
  const pats = o.patCols || cols.map(() => o.patCol || '#FFFFFF');
  const m = flat(cols[0], { ...o, patCol: pats[0], col2: cols[0], patCol2: pats[0] });
  m.userData.cols = cols.map((c) => new THREE.Color(c)); m.userData.pats = pats.map((c) => new THREE.Color(c));
  SEASONAL.push(m); return m;
}
export function applySeason(cur, next) {
  for (const m of SEASONAL) {
    const u = m.uniforms, d = m.userData;
    u.uCol.value.copy(d.cols[cur]); u.uPatCol.value.copy(d.pats[cur]);
    u.uCol2.value.copy(d.cols[next]); u.uPatCol2.value.copy(d.pats[next]);
  }
}
// 冬天的屋頂、塔簷：前三季原色，冬天積雪變白
const roofCache = new Map();
const seasonalRoof = (rc, rp, scale = 0.55) => {
  const k = rc + rp + scale;
  if (!roofCache.has(k)) roofCache.set(k, S([rc, rc, rc, '#FFFFFF'], { pat: 6, patCols: [rp, rp, rp, '#E3EAFA'], patScale: scale }));
  return roofCache.get(k);
};

// ---------- 調色盤（STYLE.md §3：5～7 個飽和色 + 2～3 個粉彩，依區域集中）----------
export const PAL = {
  grass: '#A5EBAA', grassDot: '#86DE93',
  fuji: '#5D6DF5', fujiStripe: '#7584FF',
  forest: '#2FCB7A', forestDot: '#1FA862',
  snow: '#FFFFFF', snowDot: '#D8E3FF',
  water: '#8ED8F7', waterDot: '#B5E7FB', deep: '#55B6EE', deepDot: '#7FCBF4',
  bank: '#EFE6F7', bankDot: '#D3CAE8',
  road: '#FFE6BD', roadDot: '#FFD39A',
  coral: '#FF5A5F', yellow: '#FFD234', pink: '#FF7EB3', cobalt: '#2F5BFF', teal: '#14B8A0', plum: '#4A4468',
};
const MAT = {
  grass: S([PAL.grass, '#6FD889', '#D6E68E', '#F6F7FF'], { pat: 1, patCols: [PAL.grassDot, '#47B868', '#BCD26E', '#DCE2F7'], patScale: 2.4 }),
  fuji: M(PAL.fuji, { pat: 2, patCol: PAL.fujiStripe, patScale: 2.6 }),
  forest: S([PAL.forest, '#1FA862', '#FF7A45', '#D6E4F5'], { pat: 1, patCols: [PAL.forestDot, '#178F55', '#FFC14D', '#FFFFFF'], patScale: 1.1 }),
  water: S([PAL.water, '#72C9F3', '#7BBFE8', '#B8DDF6'], { pat: 1, patCols: [PAL.waterDot, '#9ED9F7', '#A5D2F0', '#E3F1FC'], patScale: 1.6 }),
  deep: S([PAL.deep, '#3FA2E2', '#4C9BD6', '#8CC4EE'], { pat: 1, patCols: [PAL.deepDot, '#62B8EC', '#6FB0E0', '#B9DCF5'], patScale: 1.4 }),
  bank: M(PAL.bank, { pat: 1, patCol: PAL.bankDot, patScale: 0.5 }),
  road: M(PAL.road, { pat: 1, patCol: PAL.roadDot, patScale: 1.2 }),
  trunk: M('#A8705A'),
  white: M('#FFFFFF'),
};
// 樹冠：主色 + 向陽面較亮的一組 lobes（冬天變白，像向陽面積了雪）+ 櫻花的花點（只有春天看得到）
const CS = (cols, pats, bloom) => ({
  main: S(cols, { pat: 1, patCols: pats, patScale: 0.75 }),
  hi: S(cols.map((c, i) => (i === 3 ? '#FFFFFF' : lt(c, i === 0 ? 0.3 : 0.17))), { pat: 1, patCols: pats.map((c, i) => (i === 3 ? '#DCE6FA' : lt(c, i === 0 ? 0.28 : 0.15))), patScale: 0.6 }),
  bloom: bloom && bloom.map((b) => S([b, cols[1], cols[2], cols[3]], { shadow: false })),
});
const CROWN = {
  sakura: CS(['#FFB8D9', '#3CBE7E', '#FF6F61', '#E6DCFF'], ['#FF8DB5', '#2FA866', '#E8463C', '#FFFFFF'], ['#FFFFFF', '#FF4F93']),
  sakuraW: CS(['#FFF1F7', '#2FCB7A', '#FFD21F', '#D6EAFF'], ['#FFC4DA', '#1FA862', '#F3B51A', '#FFFFFF'], ['#FF8DB5', '#FFD234']),
  green: CS(['#3CBE7E', '#2FB57A', '#FF9C6B', '#D3F1E6'], ['#2FA866', '#1F9C64', '#FF7A45', '#FFFFFF']),
  lime: CS(['#9BE15D', '#2FCB7A', '#FFD21F', '#E6DCFF'], ['#7FCC45', '#1FA862', '#F3B51A', '#FFFFFF']),
  teal: CS(['#62E0C8', '#14B8A0', '#FF7A45', '#CDEFF0'], ['#3FC7AE', '#0E9A86', '#E85A2A', '#FFFFFF']),
  pine: CS(['#1FA862', '#178F55', '#1FA862', '#5FB98C'], ['#17905A', '#127A48', '#17905A', '#FFFFFF']),
};

export function buildWorld(scene) {
  const W = new THREE.Group(); scene.add(W);
  const out = { W, trees: [], houses: [], lamps: [], clickables: [] };

  // ---------- 地面 ----------
  const ground = mesh(new THREE.PlaneGeometry(5000, 5000).rotateX(-Math.PI / 2), MAT.grass, 0, 0, 0, W); ground.castShadow = false;
  ground.userData.kind = 'ground';
  {
    // 深淺不同的草地塊，打破大片單色
    const pa = S(['#B8F0AE', '#74DA8E', '#E4EEA2', '#FFFFFF'], { pat: 1, patCols: ['#99E59A', '#5ACB7A', '#CCDC80', '#E3EAFA'], patScale: 2.2 });
    const pb = S(['#93E39A', '#54C878', '#F2D27A', '#EEF1FF'], { pat: 1, patCols: ['#78D888', '#3FB868', '#E2BC5E', '#DCE2F7'], patScale: 2.2 });
    const b = new Batch();
    for (let i = 0; i < 70; i++) {
      const x = rr(-170, 170), z = rr(-150, 110);
      if (Math.hypot(x, (z + 60) * 1.0) < 74) continue;          // 富士山底下不用
      b.add(new THREE.CircleGeometry(rr(4, 10), 24).rotateX(-Math.PI / 2), i % 2 ? pa : pb, x, 0.012 + i * 0.0001, z, 0, rr(0, 6.28), 0, rr(1, 1.9), 1, rr(0.7, 1.2));
    }
    b.build(W, { cast: false });
  }

  // ---------- 富士山 ----------
  const FUJI = V3(0, 0, -64), R0 = 70, HT = 58, RC = 5.5;
  const rAt = (y) => RC + (R0 - RC) * Math.pow(1 - y / HT, 1.75);   // 內凹的山腰，越往上越陡
  const fuji = new THREE.Group(); fuji.position.copy(FUJI); W.add(fuji);
  out.fuji = fuji; out.FUJI = FUJI; out.HT = HT;
  {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const y = HT * (i / 40); pts.push(new THREE.Vector2(rAt(y), y)); }
    pts.push(new THREE.Vector2(RC - 1.2, HT - 1.4), new THREE.Vector2(0.01, HT - 1.4));
    const body = mesh(new THREE.LatheGeometry(pts, 120), MAT.fuji, 0, 0, 0, fuji);
    body.userData.kind = 'fuji'; out.clickables.push(body);
    // 一圈不規則邊緣的殼：給定每個角度的下緣、上緣，沿山的輪廓長出來
    const shell = (lo, hi, off, mat, N = 120, rows = 14) => {
      const pos = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2, y0 = lo(th), y1 = hi(th);
        for (let j = 0; j <= rows; j++) {
          const y = lerp(y0, y1, j / rows), r = (y >= HT - 0.01 ? RC - 1.2 : rAt(y)) + off;
          pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < rows; j++) {
        const a = i * (rows + 1) + j, b = a + rows + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = mesh(g, mat, 0, 0, 0, fuji); m.userData.kind = 'fuji'; out.clickables.push(m); return m;
    };
    // 雪：三層殼，雪線一層比一層低。每一層在不同季節是「雪」或「山的顏色」，疊起來就是那一季的雪線：
    //   冬：三層都白｜春：上兩層白｜秋：只有山頂（初冠雪）｜夏：雪化了，山頂是曬紅的岩（赤富士）
    // 斜紋和山身用同一種世界座標斜紋，「沒有雪」的那一層看起來跟山身一樣，接縫看不出來
    const ON = '#FFFFFF', ONs = '#E3EAFF', OFF = PAL.fuji, OFFs = PAL.fujiStripe;
    const snowMat = (cols, pats) => S(cols, { pat: 2, patCols: pats, patScale: 2.6 });
    const gully = (th, k, a) => a * Math.pow(0.5 + 0.5 * Math.sin(th * k + 2 * Math.sin(th * 5)), 6);
    const capLine = (th) => HT * (0.8 - 0.03 * Math.sin(th * 3 + 1) - gully(th, 11, 0.09));
    const snowLine = (th) => HT * (0.6 - 0.04 * Math.sin(th * 3 + 1) - gully(th, 13, 0.2) - 0.06 * Math.pow(0.5 + 0.5 * Math.sin(th * 29 + 1.3), 8));
    // 最低一層從山腳開始，貼得比森林帶（0.18）更近山身：森林帶蓋在它上面，冬天森林帶以上整片白、不會露出一圈山身
    const lowLine = () => HT * 0.04;
    shell(lowLine, () => HT, 0.13, snowMat([OFF, OFF, OFF, ON], [OFFs, OFFs, OFFs, ONs]), 240, 18);
    shell(snowLine, () => HT, 0.28, snowMat([ON, OFF, OFF, ON], [ONs, OFFs, OFFs, ONs]), 240, 16);
    shell(capLine, () => HT, 0.34, snowMat([ON, '#FF8A65', ON, ON], [ONs, '#FFA488', ONs, ONs]), 240, 10);
    // 山腳的森林帶（青木原）
    shell(() => 0.02, (th) => HT * (0.17 + 0.035 * Math.sin(th * 7) + 0.025 * Math.sin(th * 17 + 1)), 0.18, MAT.forest, 120, 6);
    // 火山口
    const crater = mesh(new THREE.CircleGeometry(RC - 1.2, 40).rotateX(-Math.PI / 2), M('#DCD4F5', { pat: 1, patCol: '#C9C0E8', patScale: 0.6 }), 0, HT - 1.35, 0, fuji);
    crater.castShadow = false;
  }
  // 山腳一圈針葉林（湖那一側留空）
  {
    const b = new Batch();
    for (let i = 0; i < 420; i++) {
      const a = rr(0, Math.PI * 2), d = rr(R0 - 6, R0 + 46);
      const x = FUJI.x + Math.sin(a) * d, z = FUJI.z + Math.cos(a) * d;
      if (z > -8 && x > -100 && x < 95) continue;   // 湖和芝櫻田
      if (x < -78 && z > -40) continue;
      pine(b, x, z, rr(0.8, 1.3));
    }
    b.build(W);
  }

  // ---------- 河口湖 ----------
  // 東西向的長湖，西邊有一個細腰（大橋跨過去）
  const LX0 = -92, LX1 = 86;
  const zc = (x) => 23 + 3 * Math.sin(x / 26 + 0.5);
  const hwz = (x, grow = 0) => {
    const u = (x - (LX0 + LX1) / 2) / ((LX1 - LX0) / 2 + grow);
    const base = 12.5 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(u), 3.2)));
    return (base * (1 - 0.58 * Math.exp(-Math.pow((x + 26) / 9, 2))) * (1 + 0.12 * Math.sin(x / 9))) + (base > 0 ? grow : 0);
  };
  out.lake = { zc, hwz, LX0, LX1 };
  const lakeShape = (grow, k = 1, dz = 0) => {
    const top = [], bot = [];
    for (let i = 0; i <= 160; i++) {
      const x = lerp(LX0 - grow, LX1 + grow, i / 160), h = hwz(x, grow) * k;
      top.push(new THREE.Vector2(x, -(zc(x) + dz - h))); bot.push(new THREE.Vector2(x, -(zc(x) + dz + h)));
    }
    return new THREE.Shape([...top, ...bot.reverse()]);
  };
  const flatShape = (shape, y, mat) => {
    const m = mesh(new THREE.ShapeGeometry(shape, 1).rotateX(-Math.PI / 2), mat, 0, y, 0, W); m.castShadow = false; return m;
  };
  flatShape(lakeShape(2.2), 0.04, MAT.bank);
  const water = flatShape(lakeShape(0), 0.08, MAT.water); water.userData.kind = 'water'; out.clickables.push(water);
  const deep = flatShape(lakeShape(0, 0.42, -0.8), 0.1, MAT.deep); deep.userData.kind = 'water'; out.clickables.push(deep);
  // 岸邊的白色泡沫線
  {
    const foam = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    for (const sd of [-1, 1]) {
      const pos = [], idx = []; const n = 160;
      for (let i = 0; i <= n; i++) {
        const x = lerp(LX0 + 3, LX1 - 3, i / n), h = hwz(x);
        if (h < 1) { pos.push(x, 0.11, zc(x), x, 0.11, zc(x)); continue; }
        const z = zc(x) + sd * (h - 0.35);
        pos.push(x, 0.11, z - 0.18, x, 0.11, z + 0.18);
      }
      for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, foam); m.userData.noOutline = true; W.add(m);
    }
  }
  // 細腰上的紅色大橋
  {
    const BX = -26, z0 = zc(BX) - hwz(BX) - 4, z1 = zc(BX) + hwz(BX) + 4, len = z1 - z0, zm = (z0 + z1) / 2;
    const b = new Batch(), deck = M('#FFF4DD', { pat: 1, patCol: '#F2DFC2', patScale: 0.6 }), red = M(PAL.coral);
    b.add(new THREE.BoxGeometry(3.4, 0.45, len), deck, BX, 1.1, zm);
    for (const s of [-1, 1]) {
      b.add(new THREE.BoxGeometry(0.16, 0.16, len), red, BX + s * 1.6, 2.25, zm);
      for (let z = z0 + 0.6; z < z1; z += 1.8) b.add(new THREE.BoxGeometry(0.24, 0.9, 0.24), red, BX + s * 1.6, 1.75, z);
    }
    // 三道紅色拱
    for (const dz of [-len / 3.2, 0, len / 3.2]) {
      const arc = new THREE.TorusGeometry(2.2, 0.28, 8, 24, Math.PI).rotateY(Math.PI / 2);
      for (const s of [-1, 1]) b.add(arc, red, BX + s * 1.45, -0.8, zm + dz);
    }
    for (const z of [z0 + 0.5, z1 - 0.5]) b.add(box(3.6, 1.1, 1.2), deck, BX, 0, z);
    b.build(W);
  }

  // ---------- 湖畔道路、鐵軌 ----------
  const roadZ = (x) => 44 + 2.2 * Math.sin(x / 32);
  out.roadZ = roadZ;
  const strip = (fz, x0, x1, halfW, y, mat, n = 220) => {
    const pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), z = fz(x); pos.push(x, y, z - halfW, x, y, z + halfW); }
    for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; W.add(m); return m;
  };
  strip(roadZ, -260, 260, 2.2, 0.05, MAT.road);
  {
    // 白色虛線
    const b = new Batch();
    for (let x = -200; x < 200; x += 4) b.add(new THREE.PlaneGeometry(1.8, 0.22).rotateX(-Math.PI / 2), MAT.white, x, 0.07, roadZ(x), 0, -Math.atan(2.2 / 32 * Math.cos(x / 32)), 0);
    const [m] = b.build(W, { cast: false }); m.userData.noOutline = true;
  }
  const RAILZ = 74;
  out.RAILZ = RAILZ;
  strip(() => RAILZ, -260, 260, 2.0, 0.04, M('#DCD4EE', { pat: 1, patCol: '#C9C0E3', patScale: 0.35 }), 4);
  {
    const b = new Batch(), sleeper = M('#A8705A'), rail = M('#8D86C0');
    for (let x = -200; x < 200; x += 1.4) b.add(box(0.45, 0.14, 2.8), sleeper, x, 0.05, RAILZ);
    b.build(W, { cast: false });
    for (const s of [-1, 1]) { const r = mesh(box(400, 0.16, 0.16), rail, 0, 0.19, RAILZ + s * 0.8, W); r.castShadow = false; }
  }

  // ---------- 湖畔小鎮 ----------
  let hi = 0;
  const townXs = [-62, -52, -42.5, -33, -14, -4.5, 5, 14.5, 24, 33.5, 43];
  for (const x of townXs) {
    const z = roadZ(x) + 7.6;
    out.houses.push(house(W, x, z, -1, rr(6.8, 8), 5.8, hi++, out));
  }
  // 第二排（靠鐵軌）
  for (const x of [-57, -38, -9, 19, 38]) out.houses.push(house(W, x + rr(-1, 1), roadZ(x) + 19.5, 1, rr(6.4, 7.4), 5.4, hi++ + 2, out));
  // 溫泉旅館：大一點的樓，立面有窗格
  {
    const g = new THREE.Group(); g.position.set(-23.5, 0, roadZ(-23.5) + 10); W.add(g);
    const b = new Batch();
    b.add(box(15, 0.5, 10.5), M('#DCD4EE', { pat: 1, patCol: '#C9C0E3', patScale: 0.32 }), 0, 0, 0);
    const wallM = M('#FFF4DD', { win: true, y0: 0.5, y1: 11.5, seed: 3 });
    b.add(box(14, 11, 9.5), wallM, 0, 0.5, 0);
    b.add(box(15.2, 0.6, 10.7), M(PAL.coral, { pat: 6, patCol: '#FFE0DF', patScale: 0.5 }), 0, 11.5, 0);
    b.add(new THREE.ConeGeometry(8.4, 3.4, 4, 1).rotateY(Math.PI / 4).scale(1.3, 1, 0.9), seasonalRoof(PAL.plum, '#6A6290', 0.5), 0, 13.8, 0);
    b.add(box(4, 0.25, 1.6), M(PAL.coral, { pat: 4, patCol: '#FFFFFF', patScale: 0.4 }), 0, 3.2, -5.4, -0.25, 0, 0);
    b.add(box(2.4, 2.8, 0.2), M(PAL.plum), 0, 0.5, -4.8);
    b.build(g);
    const ref = { g, p: g.position.clone(), big: true, lampAt: V3(g.position.x + 3, 0, g.position.z - 7.2) };
    g.userData.kind = 'house'; g.userData.ref = ref; out.houses.push(ref);
    out.clickables.push(...g.children);
  }
  // 車站
  {
    const g = new THREE.Group(); g.position.set(10, 0, RAILZ - 4.2); W.add(g);
    const b = new Batch();
    b.add(box(22, 0.9, 3.2), M('#FFF4DD', { pat: 1, patCol: '#F2DFC2', patScale: 0.5 }), 0, 0, 0);
    for (const x of [-8, -3, 2, 7]) b.add(box(0.3, 3.2, 0.3), MAT.white, x, 0.9, 0.6);
    b.add(box(20, 0.3, 3.4), seasonalRoof(PAL.coral, '#FFFFFF', 0.6), 0, 4.1, 0.2, 0.12, 0, 0);
    b.add(box(6, 3.6, 4.5), M(PAL.yellow, { pat: 6, patCol: '#F3C21A', patScale: 0.5 }), -12, 0, -3.5);
    b.add(new THREE.ConeGeometry(4.8, 2.2, 4).rotateY(Math.PI / 4).scale(1, 1, 0.75), seasonalRoof(PAL.cobalt, '#5C7DFF', 0.5), -12, 4.7, -3.5);
    b.build(g);
  }

  // ---------- 路燈：沿湖一排，黃昏時跟著光環一盞一盞亮 ----------
  {
    const post = M(PAL.plum), b = new Batch();
    for (let x = -80; x < 76; x += 15.5) {
      if (Math.abs(x + 26) < 5) continue;
      const z = roadZ(x) - 2.7;
      b.add(new THREE.CylinderGeometry(0.11, 0.15, 3.4, 8).translate(0, 1.7, 0), post, x, 0, z);
      b.add(new THREE.CylinderGeometry(0.42, 0.3, 0.16, 12), post, x, 3.75, z);
      const head = flat('#FFFFFF', { lit: true });
      const m = mesh(new THREE.SphereGeometry(0.3, 12, 8), head, x, 3.5, z, W); m.castShadow = false;
      out.lamps.push({ head, p: V3(x, 3.5, z) });
    }
    b.build(W);
  }

  // ---------- 樹 ----------
  // 湖畔一排櫻花（粉紅、白交錯）
  for (let x = -86; x < 80; x += rr(6.5, 8.5)) {
    if (Math.abs(x + 26) < 6) continue;
    const z = roadZ(x) - 4.6 + rr(-0.6, 0.6);
    const pinkTree = R() < 0.62;
    out.trees.push(tree(W, x, z, pinkTree ? pick(['cloud', 'round']) : 'round', pinkTree ? CROWN.sakura : CROWN.sakuraW, rr(0.85, 1.1), out));
  }
  // 小鎮裡和鐵軌邊的綠樹，形狀混著用
  for (let i = 0; i < 26; i++) {
    const x = rr(-80, 60), z = rr(roadZ(x) + 14, RAILZ - 5);
    if (out.houses.some((h) => Math.abs(h.p.x - x) < (h.big ? 9 : 5.5) && Math.abs(h.p.z - z) < (h.big ? 7.5 : 5))) continue;
    if (x > -4 && x < 24 && z > RAILZ - 10) continue;
    out.trees.push(tree(W, x, z, pick(['egg', 'cone', 'column', 'round', 'cloud']), pick([CROWN.green, CROWN.lime, CROWN.teal, CROWN.sakura]), rr(0.75, 1.05), out));
  }
  for (let i = 0; i < 30; i++) {
    const x = rr(-160, 160), z = RAILZ + rr(4, 8);
    out.trees.push(tree(W, x, z, pick(['egg', 'cone', 'column', 'round']), pick([CROWN.green, CROWN.lime, CROWN.teal, CROWN.pine]), rr(0.8, 1.2), out, true));
  }

  // ---------- 五重塔的小山（新倉山的感覺）----------
  {
    const HX = 108, HZ = 20, g = new THREE.Group(); g.position.set(HX, 0, HZ); W.add(g);
    const hill = mesh(new THREE.SphereGeometry(20, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 0.85), S(['#6FD889', '#3FB868', '#C9D96E', '#F2F4FF'], { pat: 1, patCols: ['#54C878', '#2FA866', '#B4C65A', '#DCE2F7'], patScale: 1.6 }), 0, 0, 0, g);
    hill.userData.kind = 'hill';
    // 山頂平台
    mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.6, 28), M('#FFE6BD', { pat: 1, patCol: '#FFD39A', patScale: 0.8 }), 0, 9.7, 0, g);
    const pag = pagoda(g, 0, 10.1, 0, out);
    out.pagoda = pag;
    // 山坡上的櫻花和松
    for (let i = 0; i < 16; i++) {
      const a = rr(0, Math.PI * 2), d = rr(8, 17), x = Math.sin(a) * d, z = Math.cos(a) * d * 0.85;
      const y = 10 * Math.sqrt(Math.max(0, 1 - (d / 20) ** 2)) - 0.4;
      const t = tree(g, x, z, i % 3 ? 'cloud' : 'cone', i % 3 ? CROWN.sakura : CROWN.pine, rr(0.75, 0.95), out);
      t.g.position.y = y; out.trees.push(t);
    }
  }

  // ---------- 田：芝櫻（西邊山腳）和油菜花 ----------
  {
    const b = new Batch();
    // 一條條彎曲的色帶，像花祭的花毯：春芝櫻、夏薰衣草、秋掃帚草（紅橘）、冬天蓋上雪
    const SHIBA = [
      S(['#FF7EB3', '#B9A0FF', '#FF5A5F', '#F6F7FF'], { pat: 6, patCols: ['#FFB8D9', '#DCD0FF', '#FF9C8F', '#DCE2F7'], patScale: 0.9 }),
      S(['#FFFFFF', '#9F86F5', '#FF7A45', '#FFFFFF'], { pat: 6, patCols: ['#FFC4DA', '#C9B6FF', '#FFB08A', '#E3EAFA'], patScale: 0.9 }),
      S(['#B9A0FF', '#C9B6FF', '#E8463C', '#EEF1FF'], { pat: 6, patCols: ['#DCD0FF', '#E6DCFF', '#FF8A80', '#DCE2F7'], patScale: 0.9 }),
      S(['#FF4F93', '#8E72F0', '#FF9C6B', '#FFFFFF'], { pat: 6, patCols: ['#FF8DB5', '#B9A0FF', '#FFC6A5', '#E3EAFA'], patScale: 0.9 }),
    ];
    for (let row = 0; row < 9; row++) {
      const mat = SHIBA[row % SHIBA.length];
      for (let k = 0; k < 7; k++) {
        const x = -150 + k * 9.6, z = -38 + row * 6.2 + 4 * Math.sin(k * 0.7 + row * 0.4);
        if (Math.hypot(x - FUJI.x, z - FUJI.z) < R0 + 2) continue;
        b.add(box(9, 0.3, 5.2), mat, x, 0, z, 0, 0.12 * Math.sin(k + row), 0);
      }
    }
    // 油菜花田，田埂淡色
    // 春油菜花、夏一片綠、秋稻穗金黃、冬雪
    const rape = S([PAL.yellow, '#7FCC45', '#F2C14E', '#F8FAFF'], { pat: 1, patCols: ['#FFF3A6', '#A4E35F', '#FFE08A', '#DCE2F7'], patScale: 1.6 });
    const ridge = S(['#FFE6BD', '#FFE6BD', '#F7D49B', '#DCD0F2'], { pat: 1, patCols: ['#FFD39A', '#FFD39A', '#E8BE7C', '#C9BEE6'], patScale: 0.8 });
    for (let gx = -150; gx < -96; gx += 11) for (let gz = 18; gz < 66; gz += 9) {
      b.add(box(11, 0.12, 9), ridge, gx + 5.5, 0, gz + 4.5);
      b.add(box(10, 0.2, 8), (gx / 11 + gz / 9) % 3 === 0 ? MAT.forest : rape, gx + 5.5, 0, gz + 4.5);
    }
    // 鐵軌南邊：剛放水的秧田（天藍）和綠色的茶園、油菜花，一格一格像地圖
    // 秧田：春天剛放水（天藍＋秧苗）、夏天綠油油、秋天稻穗金黃、冬天積雪
    const paddy = S(['#A6E3FB', '#A4E35F', '#F2C14E', '#F8FAFF'], { pat: 6, patCols: ['#92E3A0', '#7FCC45', '#E0A93A', '#DCE2F7'], patScale: 1.2 });
    const tea = S(['#3CBE7E', '#2FA866', '#3CBE7E', '#CFEBDD'], { pat: 6, patCols: ['#2FA866', '#1F9C64', '#2FA866', '#FFFFFF'], patScale: 0.9 });
    for (let gx = -160; gx < 150; gx += 10.7) for (let gz = RAILZ + 10; gz < RAILZ + 70; gz += 8.7) {
            const cx = gx + 5, cz = gz + 4;
      const v = Math.sin(gx * 0.05 + 1.3) + Math.cos(gz * 0.09);
      b.add(box(10.7, 0.12, 8.7), ridge, cx, 0, cz);
      b.add(box(10, 0.2, 8), v > 0.6 ? rape : v < -0.7 ? tea : paddy, cx, 0, cz);
    }
    b.build(W, { cast: false });
  }

  // ---------- 雲：山頂的笠雲 + 幾朵飄過的雲（會投下雲影）----------
  {
    const capM = M('#FFFFFF', { shadow: false });
    const cap = new THREE.Group(); cap.position.set(FUJI.x, HT + 5.5, FUJI.z); W.add(cap);
    // 一圈一圈扁扁的雲團疊成斗笠的樣子
    const cb = new Batch();
    for (const [ring, n, r, y] of [[9.5, 11, 3.2, 0], [6.2, 8, 3.0, 1.6], [2.8, 4, 2.8, 3.0]]) {
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + ring; cb.add(new THREE.SphereGeometry(r, 16, 10), capM, Math.cos(a) * ring, y, Math.sin(a) * ring, 0, 0, 0, 1, 0.45, 1); }
    }
    cb.add(new THREE.SphereGeometry(4, 16, 10), capM, 0, 3.6, 0, 0, 0, 0, 1, 0.5, 1);
    for (const m of cb.build(cap)) m.receiveShadow = false;
    out.capCloud = noEdge(cap);   // 雲不畫框線（但仍會遮住後面的描邊）
    out.clouds = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); W.add(g);
      const b = new Batch();
      for (const [dx, dy, dz, r] of [[0, 1.2, 0, 5], [4.6, 0.6, 1, 3.8], [-4.4, 0.4, -0.5, 4], [1.5, 2.4, -1.5, 3.4], [-1.2, 0.2, 3, 3.2], [6.5, 0, -1.6, 2.6]]) b.add(new THREE.SphereGeometry(r, 18, 12), capM, dx, dy, dz, 0, 0, 0, 1, 0.75, 1);
      const ms = b.build(g, { receive: false });
      g.userData = { ph: i / 3, y: 34 + i * 4, z: -10 + i * 30, s: 1 + i * 0.25 };
      g.scale.setScalar(g.userData.s); g.position.set(-90 + i * 75, g.userData.y, g.userData.z);
      out.clouds.push(noEdge(g));
      for (const m of ms) m.receiveShadow = false;
    }
  }
  return out;
}

// ---------- 樹：樹幹 + 一根枝 + 一團 lobes，向陽面加亮的 lobes（STYLE.md §9：至少五種樹冠形狀）----------
function tree(parent, x, z, kind, cs, s = 1, out, far = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = R() * 6.28; parent.add(g);
  const th = kind === 'column' ? 1.5 : 2.1;
  const tb = new Batch();
  tb.add(new THREE.CylinderGeometry(0.16, 0.32, th, 8).translate(0, th / 2, 0), MAT.trunk);
  if (!far) tb.add(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 6).translate(0, 0.5, 0), MAT.trunk, 0.05, th * 0.55, 0, 0, 0, -0.75);
  tb.build(g);
  const c = new THREE.Group(); c.position.y = th; g.add(c);
  // 向陽面：太陽從西南（-x, +z）照過來；樹本身有隨機旋轉，所以亮面的位置要轉回世界座標
  const ry = g.rotation.y, sx = -0.75, sz = 0.6;
  const hx = Math.cos(ry) * sx - Math.sin(ry) * sz, hz = Math.sin(ry) * sx + Math.cos(ry) * sz;
  const b = new Batch(), lobes = [];
  const L = (geo, mat, px, py, pz) => { b.add(geo, mat, px, py, pz); lobes.push([px, py, pz, geo.parameters?.radius || 1.2]); };
  const HI = (geo, k, py) => b.add(geo, cs.hi, hx * k, py, hz * k);
  if (kind === 'cloud') {
    for (const [dx, dy, dz, r] of [[0, 1.7, 0, 1.45], [1.15, 1.05, 0.35, 1.1], [-1.05, 1.15, -0.3, 1.15], [0.25, 2.5, -0.35, 1.0], [-0.4, 1.0, 0.95, 0.95], [0.6, 1.2, -1.0, 0.9]]) L(new THREE.SphereGeometry(r, 16, 10), cs.main, dx, dy, dz);
    HI(new THREE.SphereGeometry(0.62, 12, 8), 1.0, 2.35); HI(new THREE.SphereGeometry(0.5, 12, 8), 1.55, 1.6);
  }
  if (kind === 'round') { L(new THREE.SphereGeometry(1.85, 20, 12).scale(1, 0.92, 1), cs.main, 0, 1.5, 0); HI(new THREE.SphereGeometry(0.85, 14, 10), 1.1, 2.3); HI(new THREE.SphereGeometry(0.52, 12, 8), 1.6, 1.55); }
  if (kind === 'egg') { L(new THREE.SphereGeometry(1.45, 18, 12).scale(0.85, 1.35, 0.85), cs.main, 0, 1.8, 0); HI(new THREE.SphereGeometry(0.6, 14, 10).scale(0.85, 1.25, 0.85), 0.75, 2.5); }
  if (kind === 'cone') { for (const [r, h, y] of [[1.9, 2.0, 0.9], [1.5, 1.8, 2.0], [1.05, 1.6, 3.0]]) L(new THREE.ConeGeometry(r, h, 16), cs.main, 0, y, 0); HI(new THREE.SphereGeometry(0.3, 10, 8), 0, 3.85); }
  if (kind === 'column') { L(new THREE.CapsuleGeometry(0.9, 2.6, 6, 14), cs.main, 0, 2.0, 0); HI(new THREE.CapsuleGeometry(0.38, 1.3, 6, 10), 0.7, 2.6); }
  if (cs.bloom && !far) for (let i = 0; i < 14; i++) {
    const [px, py, pz, r] = lobes[i % lobes.length], u = R() * 6.28, v = R() * 1.3 - 0.15;
    b.add(new THREE.SphereGeometry(0.17, 8, 6), cs.bloom[i % 2], px + Math.cos(u) * Math.cos(v) * r * 0.97, py + Math.sin(v) * r * 0.97, pz + Math.sin(u) * Math.cos(v) * r * 0.97);
  }
  b.build(c);
  const t = { g, c, p: g.position.clone(), crown: cs, ph: R() * 6.28, sakura: cs === CROWN.sakura || cs === CROWN.sakuraW };
  if (!far) { g.userData.kind = 'tree'; g.userData.ref = t; for (const m of c.children) out.clickables.push(m); }
  return t;
}
function pine(b, x, z, s) {
  b.add(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 6).translate(0, 0.7, 0), MAT.trunk, x, 0, z, 0, 0, 0, s);
  const cs = R() < 0.5 ? CROWN.pine : CROWN.green;
  for (const [r, h, y] of [[2.0, 2.4, 2.2], [1.5, 2.1, 3.5], [0.95, 1.8, 4.7]]) b.add(new THREE.ConeGeometry(r, h, 9), cs.main, x, y * s, z, 0, 0, 0, s);
}

// ---------- 房子：台基、橫板牆、白色轉角、兩片屋頂和屋脊、山牆圓窗、窗框+百葉+花台、門、遮雨棚、門燈 ----------
function house(parent, x, z, face, w, d, i, out) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const b = new Batch();
  const wc = WALLS_[i % WALLS_.length], two = i % 3 === 1, h = two ? 6.2 : 4.0, B = 0.45, F = face * (d / 2);
  b.add(box(w + 0.5, B, d + 0.5), M('#DCD4EE', { pat: 1, patCol: '#C9C0E3', patScale: 0.32 }));
  b.add(box(w, h, d), M(wc, { pat: 6, patCol: lt(wc, -0.07), patScale: 0.5 }), 0, B, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.24, h, 0.24), MAT.white, sx * (w / 2 - 0.04), B, sz * (d / 2 - 0.04));
  const [rc, rp] = ROOFS_[(i * 3 + 1) % ROOFS_.length], run = d / 2 + 0.7, rise = 2.4, Ls = Math.hypot(run, rise), th = Math.atan2(rise, run);
  const roofM = seasonalRoof(rc, rp);
  for (const sd of [-1, 1]) b.add(new THREE.BoxGeometry(w + 1.1, 0.3, Ls), roofM, 0, B + h + rise / 2 + 0.05, sd * run / 2, sd * th, 0, 0);
  b.add(new THREE.CylinderGeometry(0.2, 0.2, w + 1.25, 10).rotateZ(Math.PI / 2), M(lt(rc, -0.15)), 0, B + h + rise + 0.12, 0);
  const gs = new THREE.Shape(); gs.moveTo(-d / 2, 0); gs.lineTo(d / 2, 0); gs.lineTo(0, rise - 0.15); gs.closePath();
  b.add(new THREE.ExtrudeGeometry(gs, { depth: w - 0.02, bevelEnabled: false }).translate(0, 0, -(w - 0.02) / 2).rotateY(Math.PI / 2), M(wc), 0, B + h, 0);
  // 每棟一個玻璃材質，之後黃昏時可以一盞一盞亮
  const glass = flat('#BFE4FF', { lit: true });
  b.add(new THREE.CircleGeometry(0.42, 18).rotateY(Math.PI / 2), glass, w / 2 + 0.01, B + h + 0.8, 0);
  const shut = ['#2F5BFF', '#FF5A5F', '#14B8A0', '#FFD234', '#FF7EB3'][i % 5];
  const floors = two ? [B + 1.55, B + 4.0] : [B + 1.55];
  for (const fy of floors) for (const sx of [-w / 4 - 0.15, w / 4 + 0.15]) {
    b.add(box(1.25, 1.3, 0.1), MAT.white, sx, fy - 0.08, F + face * 0.03);
    b.add(box(0.98, 1.05, 0.14), glass, sx, fy + 0.04, F + face * 0.05);
    b.add(box(0.07, 1.05, 0.16), MAT.white, sx, fy + 0.04, F + face * 0.06);
    for (const ss of [-1, 1]) b.add(box(0.38, 1.15, 0.08), M(shut, { pat: 6, patCol: lt(shut, -0.2), patScale: 0.18 }), sx + ss * 0.85, fy - 0.03, F + face * 0.04);
    // 背面也開窗（鏡頭多半從南邊看過來）
    b.add(box(1.25, 1.3, 0.1), MAT.white, sx, fy - 0.08, -F - face * 0.03);
    b.add(box(0.98, 1.05, 0.14), glass, sx, fy + 0.04, -F - face * 0.05);
    b.add(box(0.07, 1.05, 0.16), MAT.white, sx, fy + 0.04, -F - face * 0.06);
    if (fy < B + 2) {
      b.add(box(1.35, 0.32, 0.45), MAT.white, sx, fy - 0.42, F + face * 0.24);
      [-0.42, -0.14, 0.14, 0.42].forEach((k, j) => b.add(new THREE.SphereGeometry(0.17, 8, 6), M(['#FF5A5F', '#FFD234', '#FF7EB3', '#7FB2FF'][(i + j) % 4]), sx + k, fy - 0.05, F + face * 0.28));
    }
  }
  const dc = ['#2F5BFF', '#FF5A5F', '#14B8A0'][i % 3];
  b.add(box(1.25, 2.15, 0.1), MAT.white, 0, B, F + face * 0.03);
  b.add(box(0.95, 1.95, 0.16), M(dc, { pat: 6, patCol: lt(dc, -0.18), patScale: 0.3 }), 0, B, F + face * 0.05);
  b.add(box(1.6, 0.18, 0.7), M('#DCD4EE'), 0, 0, F + face * 0.5);
  b.add(box(1.7, 0.1, 0.8), M(['#FF5A5F', '#2F5BFF', '#FFD234'][(i + 1) % 3], { pat: 4, patCol: '#FFFFFF', patScale: 0.28 }), 0, B + 2.3, F + face * 0.42, face * 0.3, 0, 0);
  const lamp = flat('#FFE38A', { lit: true });
  b.add(new THREE.SphereGeometry(0.16, 10, 8), lamp, 0.85, B + 2.0, F + face * 0.12);
  for (const sx of [-1.0, 1.0]) { b.add(new THREE.CylinderGeometry(0.22, 0.16, 0.38, 10).translate(0, 0.19, 0), M('#FF9C6B'), sx, B, F + face * 0.55); b.add(new THREE.SphereGeometry(0.32, 10, 8), M('#3CBE7E', { pat: 1, patCol: '#FF7EB3', patScale: 0.18 }), sx, B + 0.62, F + face * 0.55); }
  if (two) {
    b.add(box(2.4, 0.16, 0.9), MAT.white, 0, B + 2.95, F + face * 0.45);
    for (let k = -1.1; k <= 1.11; k += 0.37) b.add(box(0.07, 0.6, 0.07), MAT.white, k, B + 3.11, F + face * 0.85);
    b.add(box(2.4, 0.08, 0.08), MAT.white, 0, B + 3.71, F + face * 0.85);
  }
  b.add(box(0.7, 1.6, 0.7), M('#FF7EB3', { pat: 6, patCol: '#E8679C', patScale: 0.3 }), w / 2 - 1.1, B + h + 1.0, -face * 0.7);
  b.add(box(0.9, 0.16, 0.9), M('#4A4468'), w / 2 - 1.1, B + h + 2.6, -face * 0.7);
  const ms = b.build(g);
  g.userData.kind = 'house';
  out.clickables.push(...ms);
  const ref = { g, p: g.position.clone(), glass, lamp, face, lampAt: V3(x + 0.85, 0, z + F + face * 2.4) };
  g.userData.ref = ref;
  return ref;
}
const WALLS_ = ['#FFEFA8', '#FFB8D9', '#5EDFB0', '#B9A0FF', '#FF9C6B', '#FFFFFF', '#5CC8FF'];
const ROOFS_ = [['#FF5A5F', '#FFE0DF'], ['#2F5BFF', '#FFFFFF'], ['#14B8A0', '#B8F0DC'], ['#FFD234', '#F39C12'], ['#4A4468', '#8D86C0']];

// ---------- 五重塔：朱紅的塔身、五層深色屋簷、金色相輪 ----------
function pagoda(parent, x, y, z, out) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const b = new Batch();
  const red = M(PAL.coral, { pat: 4, patCol: '#E8464C', patScale: 0.35 });
  const roof = seasonalRoof(PAL.plum, '#6A6290', 0.35);
  const gold = M(PAL.yellow, { pat: 1, patCol: '#FFF3A6', patScale: 0.25 });
  b.add(box(5.4, 0.7, 5.4), M('#FFF4DD', { pat: 1, patCol: '#F2DFC2', patScale: 0.4 }));
  let yy = 0.7;
  for (let k = 0; k < 5; k++) {
    const s = 3.6 - k * 0.38, hh = k === 0 ? 2.3 : 1.55;
    b.add(box(s, hh, s), red, 0, yy, 0);
    b.add(box(s * 0.5, hh * 0.55, 0.1), M('#FFFFFF'), 0, yy + hh * 0.2, s / 2 + 0.02);
    yy += hh;
    const rw = s + 2.6;
    b.add(new THREE.ConeGeometry(rw * 0.74, 0.9, 4, 1).rotateY(Math.PI / 4), roof, 0, yy + 0.25, 0);
    b.add(box(rw * 0.9, 0.2, rw * 0.9), roof, 0, yy - 0.05, 0);
    yy += 0.55;
  }
  b.add(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 8).translate(0, 1.8, 0), gold, 0, yy, 0);
  for (let k = 0; k < 6; k++) b.add(new THREE.TorusGeometry(0.42 - k * 0.03, 0.08, 6, 16).rotateX(Math.PI / 2), gold, 0, yy + 0.5 + k * 0.42, 0);
  b.add(new THREE.SphereGeometry(0.28, 10, 8), gold, 0, yy + 3.7, 0);
  const ms = b.build(g);
  g.userData.kind = 'pagoda';
  out.clickables.push(...ms);
  const ref = { g, p: new THREE.Vector3(), top: yy + 3.7 };
  g.userData.ref = ref;
  return ref;
}
