// 站長扣扣：Tripo 生成的 GLB（沒有骨架），所有動作都是整隻身體的位移、轉向和擠壓伸展。
// 畫面座標用 CSS px：相機放在 z=0 平面剛好 1 單位 = 1px 的距離，扣扣就能直接對齊 DOM 上的票。
// 開封後扣扣住在票面的黃色郵票裡（mode 'stamp'）：跟著郵票位置和票的傾斜，用 scissor 裁在郵票框內，自己慢慢轉。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tween, wait, ease, lerp } from './tween.js';

const FOV = 30;

export class Koko {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.autoClear = false;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.85;
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
    sun.position.set(-0.6, 1, 1.3);
    this.scene.add(sun, new THREE.HemisphereLight(0xfff6e8, 0xb7a68a, 0.5));
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);

    // root（位置、大小）→ body（擠壓伸展）→ turn（轉向）→ lean（傾身）→ 模型
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.turn = new THREE.Group();
    this.lean = new THREE.Group();
    this.root.add(this.body); this.body.add(this.turn); this.turn.add(this.lean);
    this.root.visible = false;
    this.scene.add(this.root);

    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(30,42,68,0.42)'); grad.addColorStop(1, 'rgba(30,42,68,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    this.shadow.position.z = -0.35;
    this.shadow.renderOrder = -1;
    this.root.add(this.shadow);

    // 動作狀態（px）；look 由 main.js 依滑鼠／陀螺儀設定
    this.p = { x: 0, y: 0, h: 100, lift: 0, squash: 1, lean: 0, spin: 0, face: 0 };
    this.look = 0;
    this.mode = 'free';
    this.stampRect = null; // 郵票在畫面上的範圍（DOMRect），由 main.js 每格更新
    this.hidden = false;   // 票翻到背面時郵票看不到，扣扣也跟著藏起來
    this.cardYaw = 0; this.cardPitch = 0; // 票的傾斜（弧度），郵票裡的扣扣跟著一起轉
    this.turntable = 0;
    this.busy = false;
    this.ready = false;
    this.yaw = 0;
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      // Tripo 給的是霧面材質；改成烤漆鐵皮：低粗糙度、一點金屬感和 clearcoat
      o.material = new THREE.MeshPhysicalMaterial({ map: o.material.map, roughness: 0.42, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    });

    // 從背後打一條射線找到背部表面，把發條鑰匙插在那裡
    model.updateMatrixWorld(true);
    const hit = new THREE.Raycaster(new THREE.Vector3(0, 0.3, -3), new THREE.Vector3(0, 0, 1)).intersectObject(model, true)[0];
    const brass = new THREE.MeshPhysicalMaterial({ color: 0xc99a3a, metalness: 0.85, roughness: 0.3, clearcoat: 0.4 });
    this.key = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.11, 12), brass);
    shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.045;
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), brass);
    hub.position.z = -0.1;
    this.key.add(shaft, hub);
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.015, 10, 28), brass);
      loop.rotation.x = Math.PI / 2; loop.position.set(s * 0.068, 0, -0.1);
      this.key.add(loop);
    }
    this.key.position.set(0, 0.3, (hit ? hit.point.z : -0.22) + 0.02);
    model.add(this.key);

    model.rotation.x = 0.1; // 稍微往前傾，看起來像從斜上方看
    this.lean.add(model);
    this.ready = true;
  }

  resize(w, h) {
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.position.set(0, 0, h / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    this.camera.updateProjectionMatrix();
  }

  place({ x, y, h }) { Object.assign(this.p, { x, y, h, lift: 0 }); }

  // 郵票裡的站位：腳底在郵票下緣稍上，身高約郵票高度的八成
  stampAnchor() {
    const r = this.stampRect;
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.93, h: r.height * 0.72 };
  }
  enterStamp() {
    this.mode = 'stamp';
    this.turntable = this.yaw;
  }
  leaveStamp() {
    if (this.mode !== 'stamp') return;
    this.mode = 'free';
    this.yaw = Math.atan2(Math.sin(this.turntable), Math.cos(this.turntable));
    this.root.rotation.set(0, 0, 0);
  }

  // 從畫面上方掉下來登場
  async dropIn(at) {
    this.place(at);
    this.p.lift = at.h * 3;
    this.root.visible = true;
    await tween(520, (e) => { this.p.lift = lerp(at.h * 3, 0, e); }, ease.inQuad);
    await this.land();
  }

  async land(onLand) {
    this.p.lift = 0;
    onLand?.();
    await tween(80, (e) => { this.p.squash = lerp(1, 0.76, e); });
    await tween(260, (e) => { this.p.squash = lerp(0.76, 1, e); }, ease.outBack);
  }

  // 跳到某個位置；arc 是跳躍高度（以身高為單位），lean 是空中往前撲的角度
  async hopTo(to, { arc = 0.45, ms = 520, lean = 0, onLand } = {}) {
    const p = this.p, from = { x: p.x, y: p.y, h: p.h };
    const target = typeof to === 'function' ? to : () => to;
    const dx = target().x - from.x;
    this.busy = true;
    p.face = Math.abs(dx) > 6 ? Math.sign(dx) * 0.9 : 0;
    await tween(110, (e) => { p.squash = lerp(1, 0.8, e); });
    await tween(ms, (_, k) => {
      const t = target();
      p.x = lerp(from.x, t.x, k); p.y = lerp(from.y, t.y, k); p.h = lerp(from.h, t.h ?? from.h, k);
      p.lift = arc * p.h * 4 * k * (1 - k);
      p.squash = k < 0.3 ? lerp(1.16, 1, k / 0.3) : 1;
      p.lean = -Math.sign(dx) * lean * Math.sin(Math.PI * k);
    }, ease.linear);
    p.lean = 0;
    await this.land(onLand);
    p.face = 0;
    this.busy = false;
  }

  // 原地蹲下再跳起（開封時把票拋出去）
  async jump(height = 0.9, ms = 620, onPeak) {
    const p = this.p;
    this.busy = true;
    await tween(140, (e) => { p.squash = lerp(1, 0.74, e); });
    let peaked = false;
    await tween(ms, (_, k) => {
      p.lift = height * p.h * 4 * k * (1 - k);
      p.squash = k < 0.3 ? lerp(1.2, 1, k / 0.3) : 1;
      p.spin = Math.PI * 2 * ease.inOutCubic(k);
      if (!peaked && k > 0.45) { peaked = true; onPeak?.(); }
    }, ease.linear);
    p.spin = 0;
    await this.land();
    this.busy = false;
  }

  // 剪票：撲到存根旁邊，落地瞬間打出剪票孔，再跳回原位
  async pounce(target, home, onImpact) {
    await this.hopTo(target, { arc: 0.55, ms: 460, lean: 0.45, onLand: onImpact });
    await wait(260);
    await this.hopTo(home, { arc: 0.4, ms: 480 });
  }

  // 蓋章：高高跳起、在空中轉一圈，整隻落在票面上，落地瞬間蓋出郵戳
  async stomp(target, home, onImpact) {
    const p = this.p, from = { x: p.x, y: p.y, h: p.h };
    this.busy = true;
    await tween(170, (e) => { p.squash = lerp(1, 0.68, e); });
    await tween(460, (e, k) => {
      p.x = lerp(from.x, target.x, k); p.y = lerp(from.y, target.y, k); p.h = lerp(from.h, target.h, k);
      p.lift = lerp(0, p.h * 1.4, e);
      p.spin = Math.PI * 2 * k;
      p.squash = lerp(1.2, 1, Math.min(1, k * 3));
    }, ease.outQuad);
    p.spin = 0;
    await wait(70);
    await tween(150, (e) => { p.lift = lerp(p.h * 1.4, 0, e); p.squash = lerp(1, 1.12, e); }, ease.inQuad);
    onImpact?.();
    await tween(90, (e) => { p.squash = lerp(1.12, 0.6, e); });
    await tween(300, (e) => { p.squash = lerp(0.6, 1, e); }, ease.outBack);
    await wait(180);
    await tween(520, (e) => { p.spin = Math.PI * 2 * e; }, ease.inOutCubic);
    p.spin = 0;
    this.busy = false;
    await this.hopTo(home, { arc: 0.5, ms: 520 });
  }

  update(dt, t) {
    const r = this.renderer;
    r.setScissorTest(false);
    r.clear();
    if (!this.ready || !this.root.visible || this.hidden) return;
    const p = this.p;
    const inStamp = this.mode === 'stamp' && this.stampRect;
    if (inStamp) {
      const a = this.stampAnchor();
      if (!this.busy) { p.x = a.x; p.y = a.y; p.h = a.h; }
    }
    const idle = !this.busy && p.lift === 0;
    // 待機：郵票裡跟著發條節奏左右搖、小步踏；在外面（未開封）只原地呼吸，身體慢慢一伸一縮
    const sway = idle && inStamp ? Math.sin(t * 2.8) * 0.05 : 0;
    const step = idle && inStamp ? Math.abs(Math.sin(t * 2.8)) * 0.012 : 0;
    const breath = idle && !inStamp ? Math.sin(t * 2.1) * 0.022 : 0;
    this.key.rotation.z -= dt * (this.busy ? 10 : 2.6);

    if (inStamp) {
      // 郵票裡像放在轉台上，自己慢慢轉；整隻跟著票一起傾斜
      this.turntable += dt * 0.9;
      this.turn.rotation.y = this.turntable + p.spin;
      this.root.rotation.set(this.cardPitch, this.cardYaw, 0);
    } else {
      const yawTarget = p.face || this.look;
      this.yaw += (yawTarget - this.yaw) * Math.min(1, dt * 7);
      this.turn.rotation.y = this.yaw + p.spin;
    }

    this.root.position.set(p.x - this.W / 2, this.H / 2 - p.y + p.lift + step * p.h, 0);
    this.root.scale.setScalar(p.h);
    const sq = p.squash * (1 + breath);
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.lean.rotation.z = p.lean + sway;

    // 影子留在地上，跳越高越小越淡
    const k = 1 / (1 + (p.lift / p.h) * 1.4);
    this.shadow.position.y = -(p.lift + step * p.h) / p.h + 0.01;
    this.shadow.scale.set(0.78 * k, 0.16 * k, 1);
    this.shadow.material.opacity = k;

    if (inStamp && !this.busy) {
      const c = this.stampRect;
      r.setScissorTest(true);
      r.setScissor(c.left, this.H - c.bottom, c.width, c.height);
    }
    r.render(this.scene, this.camera);
  }
}
