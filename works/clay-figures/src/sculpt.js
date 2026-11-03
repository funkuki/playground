import * as THREE from 'three';

// ---------- 可以捏的黏土網格 ----------
// 模型的 UV 接縫會把同一個點拆成好幾個頂點，直接推頂點會裂開。
// 所以先把位置相同的頂點合成一個「點」，所有變形都在點上算，最後再寫回每個頂點。
// 範圍用沿著表面走的距離（Dijkstra）來找，捏兔子耳朵正面時不會連背面一起拉走。

const ease = (t) => t * t * (3 - 2 * t);

export class Sculpt {
  /** @param {THREE.Mesh} mesh 有 index 的網格，高度大約 1 */
  constructor(mesh, { lumps = 0.0022, seed = 1 } = {}) {
    this.mesh = mesh;
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const nV = pos.count;

    // 合併同位置的頂點
    const key = new Map();
    const uid = new Uint32Array(nV);
    const first = [];
    for (let i = 0; i < nV; i++) {
      const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
      let u = key.get(k);
      if (u === undefined) { u = first.length; key.set(k, u); first.push(i); }
      uid[i] = u;
    }
    const nU = first.length;
    this.uid = uid;
    this.nU = nU;

    const idx = g.index.array;
    this.faces = new Uint32Array(idx.length);
    for (let i = 0; i < idx.length; i++) this.faces[i] = uid[idx[i]];

    // 鄰居表（CSR）
    const sets = Array.from({ length: nU }, () => new Set());
    const F = this.faces;
    for (let i = 0; i < F.length; i += 3) {
      const a = F[i], b = F[i + 1], c = F[i + 2];
      sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b);
    }
    this.nStart = new Uint32Array(nU + 1);
    let total = 0;
    for (let u = 0; u < nU; u++) { this.nStart[u] = total; total += sets[u].size; }
    this.nStart[nU] = total;
    this.nList = new Uint32Array(total);
    for (let u = 0, o = 0; u < nU; u++) for (const v of sets[u]) this.nList[o++] = v;

    // 點的位置：原始（加上一點手捏的不平整）、目前、法線
    this.rest = new Float32Array(nU * 3);
    for (let u = 0; u < nU; u++) {
      const i = first[u];
      this.rest[u * 3] = pos.getX(i); this.rest[u * 3 + 1] = pos.getY(i); this.rest[u * 3 + 2] = pos.getZ(i);
    }
    this.normal = new Float32Array(nU * 3);
    this.computeNormals(this.rest);
    if (lumps > 0) {
      for (let u = 0; u < nU; u++) {
        const x = this.rest[u * 3], y = this.rest[u * 3 + 1], z = this.rest[u * 3 + 2];
        const n = Math.sin(x * 11 + seed + Math.sin(y * 8)) * Math.sin(y * 9 + z * 7) * 0.65
          + Math.sin(z * 14 + x * 6 + y * 5 + seed * 2) * 0.35;
        for (let k = 0; k < 3; k++) this.rest[u * 3 + k] += this.normal[u * 3 + k] * n * lumps;
      }
      this.computeNormals(this.rest);
    }
    this.cur = this.rest.slice();
    this.touch = new Float32Array(nU * 2); // x 揉亮、y 壓痕

    // 給材質用的屬性：aRest 讓黏土紋路跟著被拉長，aTouch 控制揉亮和壓痕
    const aRest = new Float32Array(nV * 3);
    for (let i = 0; i < nV; i++) for (let k = 0; k < 3; k++) aRest[i * 3 + k] = this.rest[uid[i] * 3 + k];
    g.setAttribute('aRest', new THREE.BufferAttribute(aRest, 3));
    g.setAttribute('aTouch', new THREE.BufferAttribute(new Float32Array(nV * 2), 2));
    pos.setUsage(THREE.DynamicDrawUsage);
    g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    g.attributes.aTouch.setUsage(THREE.DynamicDrawUsage);

    this.anim = null;   // 放開後的回彈、恢復原狀
    this.press = null;  // 正在戳
    this.grabbed = null; // 正在捏
    this.dirty = true;
    this.commit();
  }

  // 面積加權的點法線
  computeNormals(P) {
    const N = this.normal;
    N.fill(0);
    const F = this.faces;
    for (let i = 0; i < F.length; i += 3) {
      const a = F[i] * 3, b = F[i + 1] * 3, c = F[i + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      N[a] += nx; N[a + 1] += ny; N[a + 2] += nz;
      N[b] += nx; N[b + 1] += ny; N[b + 2] += nz;
      N[c] += nx; N[c + 1] += ny; N[c + 2] += nz;
    }
    for (let u = 0; u < this.nU; u++) {
      const o = u * 3, l = Math.hypot(N[o], N[o + 1], N[o + 2]) || 1;
      N[o] /= l; N[o + 1] /= l; N[o + 2] /= l;
    }
  }

  // 寫回 GPU
  commit() {
    if (!this.dirty) return;
    this.dirty = false;
    this.computeNormals(this.cur);
    const g = this.mesh.geometry;
    const pos = g.attributes.position.array, nor = g.attributes.normal.array, tch = g.attributes.aTouch.array;
    const uid = this.uid, C = this.cur, N = this.normal, T = this.touch;
    for (let i = 0; i < uid.length; i++) {
      const u = uid[i];
      pos[i * 3] = C[u * 3]; pos[i * 3 + 1] = C[u * 3 + 1]; pos[i * 3 + 2] = C[u * 3 + 2];
      nor[i * 3] = N[u * 3]; nor[i * 3 + 1] = N[u * 3 + 1]; nor[i * 3 + 2] = N[u * 3 + 2];
      tch[i * 2] = T[u * 2]; tch[i * 2 + 1] = T[u * 2 + 1];
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.aTouch.needsUpdate = true;
    g.computeBoundingSphere();
    g.computeBoundingBox();
  }

  // 射線打到的三角形 → 最近的點
  nearest(hit) {
    const p = this.mesh.worldToLocal(hit.point.clone());
    const f = hit.face;
    let best = -1, bd = Infinity;
    for (const i of [f.a, f.b, f.c]) {
      const u = this.uid[i];
      const d = (this.cur[u * 3] - p.x) ** 2 + (this.cur[u * 3 + 1] - p.y) ** 2 + (this.cur[u * 3 + 2] - p.z) ** 2;
      if (d < bd) { bd = d; best = u; }
    }
    return { u: best, p };
  }

  // 沿著表面、從 start 點往外找 radius 內的點，回傳 [點, 距離]
  region(start, radius, P = this.cur) {
    const dist = new Map([[start, 0]]);
    const heap = [[0, start]];
    const push = (d, u) => {
      heap.push([d, u]);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [d, u] = pop();
      if (d > dist.get(u)) continue;
      for (let k = this.nStart[u]; k < this.nStart[u + 1]; k++) {
        const v = this.nList[k];
        const nd = d + Math.hypot(P[v * 3] - P[u * 3], P[v * 3 + 1] - P[u * 3 + 1], P[v * 3 + 2] - P[u * 3 + 2]);
        if (nd <= radius && nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); push(nd, v); }
      }
    }
    return dist;
  }

  // ---------- 戳：按住越久壓越深，旁邊的黏土被推得微微鼓起 ----------
  startPoke(hit) {
    this.stopAnim();
    const { u } = this.nearest(hit);
    const R = 0.05;
    const reg = this.region(u, R * 1.7);
    const n = [this.normal[u * 3], this.normal[u * 3 + 1], this.normal[u * 3 + 2]];
    const ids = [...reg.keys()];
    const base = new Float32Array(ids.length * 3);
    ids.forEach((v, j) => { for (let k = 0; k < 3; k++) base[j * 3 + k] = this.cur[v * 3 + k]; });
    this.press = { ids, dist: ids.map((v) => reg.get(v)), base, n, R, amt: 0, t: 0 };
  }

  holdPoke(dt) {
    const pr = this.press;
    if (!pr) return;
    pr.t += dt;
    // 一戳下去馬上有個凹，按住再慢慢變深
    const target = Math.min(0.03, 0.009 + pr.t * 0.022);
    pr.amt += (target - pr.amt) * Math.min(1, dt * 18);
    const { ids, dist, base, n, R, amt } = pr;
    for (let j = 0; j < ids.length; j++) {
      const v = ids[j], d = dist[j] / R;
      const fall = d < 1 ? (1 - d * d) ** 2 : 0;
      const rim = 0.32 * Math.exp(-((d - 1.15) ** 2) / 0.08);
      for (let k = 0; k < 3; k++) {
        this.cur[v * 3 + k] = base[j * 3 + k] - n[k] * amt * fall + this.normal[v * 3 + k] * amt * rim;
      }
      this.touch[v * 2 + 1] = Math.max(this.touch[v * 2 + 1], fall * Math.min(1, amt / 0.012));
      this.touch[v * 2] *= 1 - fall * 0.5;
    }
    this.dirty = true;
  }

  endPoke() { this.press = null; }

  // ---------- 揉：抹平、壓扁一點、表面變亮 ----------
  rub(hit, strength = 1) {
    this.stopAnim();
    const { u } = this.nearest(hit);
    const R = 0.075;
    const reg = this.region(u, R);
    const C = this.cur;
    const avg = new Map();
    for (const [v, d] of reg) {
      let sx = 0, sy = 0, sz = 0, c = 0;
      for (let k = this.nStart[v]; k < this.nStart[v + 1]; k++) {
        const q = this.nList[k];
        sx += C[q * 3]; sy += C[q * 3 + 1]; sz += C[q * 3 + 2]; c++;
      }
      avg.set(v, [sx / c, sy / c, sz / c, d]);
    }
    for (const [v, [ax, ay, az, d]] of avg) {
      const w = (1 - (d / R) ** 2) ** 2 * strength;
      const a = 0.55 * w;
      C[v * 3] += (ax - C[v * 3]) * a;
      C[v * 3 + 1] += (ay - C[v * 3 + 1]) * a;
      C[v * 3 + 2] += (az - C[v * 3 + 2]) * a;
      // 手掌往裡壓一點點
      for (let k = 0; k < 3; k++) C[v * 3 + k] -= this.normal[v * 3 + k] * 0.0009 * w;
      this.touch[v * 2] = Math.min(1, this.touch[v * 2] + w * 0.12);
      this.touch[v * 2 + 1] *= 1 - w * 0.18;
    }
    this.dirty = true;
  }

  // ---------- 捏：抓住往外拉，放開時彈回一部分，留下被捏過的形狀 ----------
  grab(hit) {
    this.stopAnim();
    const { u } = this.nearest(hit);
    const R = 0.17;
    const reg = this.region(u, R);
    const ids = [...reg.keys()];
    const w = ids.map((v) => 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, reg.get(v) / R)));
    const base = new Float32Array(ids.length * 3);
    ids.forEach((v, j) => { for (let k = 0; k < 3; k++) base[j * 3 + k] = this.cur[v * 3 + k]; });
    this.grabbed = { ids, w, base, d: new THREE.Vector3() };
  }

  // delta 是物件座標裡的位移
  drag(delta) {
    const gb = this.grabbed;
    if (!gb) return;
    // 黏土拉不了太長：越拉越緊
    const MAX = 0.2;
    const len = delta.length();
    const soft = len > 0 ? (MAX * Math.tanh(len / MAX)) / len : 0;
    gb.d.copy(delta).multiplyScalar(soft);
    this.applyGrab(gb.d);
  }

  applyGrab(d) {
    const { ids, w, base } = this.grabbed;
    for (let j = 0; j < ids.length; j++) {
      const v = ids[j];
      this.cur[v * 3] = base[j * 3] + d.x * w[j];
      this.cur[v * 3 + 1] = base[j * 3 + 1] + d.y * w[j];
      this.cur[v * 3 + 2] = base[j * 3 + 2] + d.z * w[j];
      this.touch[v * 2] = Math.min(1, Math.max(this.touch[v * 2], w[j] * Math.min(1, d.length() / 0.12) * 0.5));
    }
    this.dirty = true;
  }

  release() {
    const gb = this.grabbed;
    if (!gb) return;
    // 留下 70%，帶一點點晃動地回彈
    const from = gb.d.clone(), to = gb.d.clone().multiplyScalar(0.7);
    this.anim = { type: 'spring', t: 0, dur: 0.55, from, to, gb };
  }

  // ---------- 恢復原狀：捏痕依序鼓回去，表面慢慢抹平 ----------
  reset() {
    this.press = null;
    this.grabbed = null;
    const from = this.cur.slice(), fromT = this.touch.slice();
    const delay = new Float32Array(this.nU);
    for (let u = 0; u < this.nU; u++) {
      const x = this.rest[u * 3], y = this.rest[u * 3 + 1], z = this.rest[u * 3 + 2];
      delay[u] = 0.5 + 0.5 * Math.sin(x * 9.1 + y * 6.3 + Math.sin(z * 7.7) * 2);
    }
    this.anim = { type: 'reset', t: 0, dur: 1.15, from, fromT, delay };
  }

  isTouched() {
    for (let i = 0; i < this.cur.length; i++) if (Math.abs(this.cur[i] - this.rest[i]) > 1e-5) return true;
    return false;
  }

  stopAnim() {
    if (this.anim?.type === 'spring') {
      this.grabbed = this.anim.gb;
      this.applyGrab(this.anim.to);
    }
    this.anim = null;
    this.grabbed = null;
  }

  update(dt) {
    const a = this.anim;
    if (!a) return false;
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    if (a.type === 'spring') {
      // 阻尼振盪：從拉長的位置晃回 70%
      const s = 1 - Math.exp(-k * 6) * Math.cos(k * 14);
      const d = a.from.clone().lerp(a.to, s);
      this.grabbed = a.gb;
      this.applyGrab(d);
      this.grabbed = null;
    } else if (a.type === 'reset') {
      const { from, fromT, delay } = a;
      for (let u = 0; u < this.nU; u++) {
        const t = ease(Math.min(1, Math.max(0, (a.t - delay[u] * 0.45) / (a.dur - 0.45))));
        for (let c = 0; c < 3; c++) this.cur[u * 3 + c] = from[u * 3 + c] + (this.rest[u * 3 + c] - from[u * 3 + c]) * t;
        this.touch[u * 2] = fromT[u * 2] * (1 - t);
        this.touch[u * 2 + 1] = fromT[u * 2 + 1] * (1 - t);
      }
    }
    this.dirty = true;
    if (k >= 1) {
      const done = a.type;
      this.anim = null;
      return done;
    }
    return false;
  }
}
