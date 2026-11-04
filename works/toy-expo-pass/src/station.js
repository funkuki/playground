// 背面主視覺「首班車月台」：Tripo 生成的月台、火車、兩位貓乘客和站長扣扣，排成一座桌上的微縮模型。
// 鏡頭固定在 3/4 視角，跟著票的傾斜小幅繞動；票翻到背面才渲染。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ease, lerp } from './tween.js';

// 鏡頭：看向 target，從 yaw／pitch（度）、dist 的位置看過去。直式票看得比較斜，月台往畫面深處延伸
const VIEW = {
  wide: { fov: 24, yaw: -14, pitch: 21, dist: 0.86, target: [0.02, 0.085, 0] },
  tall: { fov: 30, yaw: -34, pitch: 25, dist: 0.88, target: [-0.01, 0.07, 0.04] },
};

// 火車一直循環：從左邊進站減速、停靠、加速出站往右開走，隔一下再從左邊進來（秒）
const TRAIN = { from: -1.5, stop: -0.42, to: 1.3, enter: 3.2, dwell: 3.5, leave: 4, gap: 1 };
const TRAIN_CYCLE = TRAIN.enter + TRAIN.dwell + TRAIN.leave + TRAIN.gap;
const SEAT_Y = 0.095; // 第一張長椅的座面高度（月台地面 0.069）
// 站牌（Tripo 貼圖上是圓形徽章＋糊掉的「STATION」），用射線量出來的範圍：下半是矩形字板，上面頂著一個拱
// 前面蓋一塊同形狀的「汐見港」字板，把原本的徽章和字一起蓋掉
const SIGN = { x0: 0.284, x1: 0.361, y0: 0.153, y1: 0.192, z: -0.1355, archX: 0.3225, archRx: 0.029, archRy: 0.027 };

export class Station {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
    sun.position.set(-0.8, 1.6, 1.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -0.7, right: 0.7, top: 0.5, bottom: -0.5, near: 0.1, far: 4 });
    sun.shadow.bias = -0.0015;
    sun.shadow.radius = 4;
    this.scene.add(sun, new THREE.HemisphereLight(0xfff6e8, 0xb7a68a, 0.6));

    this.camera = new THREE.PerspectiveCamera(VIEW.wide.fov, 2.4, 0.05, 20);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.view = VIEW.wide;
    this.trainT = TRAIN.enter; // 火車循環的時間；一開始就停在站上
    this.ready = false;
  }

  async load(urls) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [platform, train, catA, catB, koko] = await Promise.all(
      [urls.platform, urls.train, urls.catA, urls.catB, urls.koko].map((u) => loader.loadAsync(u).then((g) => g.scene)),
    );
    // 角色用跟正面扣扣一樣的烤漆鐵皮；月台和火車保留 Tripo 的霧面，只稍微提一點光澤
    const paint = (model, physical) => model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      o.material = physical
        ? new THREE.MeshPhysicalMaterial({ map: o.material.map, roughness: 0.42, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.25 })
        : new THREE.MeshStandardMaterial({ map: o.material.map, roughness: 0.62, metalness: 0.05 });
    });
    paint(platform, false); paint(train, false);
    for (const m of [catA, catB, koko]) paint(m, true);

    // Tripo 的模型都正規化成最長邊 1、底部在 y=0；這裡換算成同一個比例尺擺進月台
    // 月台和火車原本沿 z 排，轉 90° 讓它們沿 x 橫躺在畫面上
    platform.rotation.y = Math.PI / 2;
    this.train = new THREE.Group();
    train.rotation.y = Math.PI / 2; // 車頭朝右
    train.scale.setScalar(0.62);
    this.train.add(train);
    this.train.position.set(0, 0.012, 0.13);

    const actor = (model, h, x, z, face, y = 0.069) => {
      const g = new THREE.Group();
      model.scale.setScalar(h);
      g.add(model);
      g.position.set(x, y, z);
      g.rotation.y = face;
      return g;
    };
    // 扣扣站在月台上、轉向乘客；灰貓提著皮箱排第一個，藍貓坐在雨棚下的長椅上等
    this.koko = actor(koko, 0.085, -0.07, 0, 0.7);
    this.cats = [actor(catA, 0.075, 0.04, 0.002, -0.5), actor(catB, 0.06, 0.15, -0.098, -0.15, SEAT_Y)];

    this.world.add(platform, this.train, ...this.cats, this.koko, await signBoard());
    this.ready = true;
  }

  resize(w, h, portrait) {
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.view = portrait ? VIEW.tall : VIEW.wide;
    this.camera.fov = this.view.fov;
    this.camera.updateProjectionMatrix();
  }

  // 每次翻到背面，火車都從左邊重新進站
  arrive() { this.trainT = 0; }

  trainX() {
    const T = TRAIN, c = this.trainT % TRAIN_CYCLE;
    if (c < T.enter) return lerp(T.from, T.stop, ease.outCubic(c / T.enter));
    if (c < T.enter + T.dwell) return T.stop;
    if (c < T.enter + T.dwell + T.leave) return lerp(T.stop, T.to, ease.inQuad((c - T.enter - T.dwell) / T.leave));
    return T.from;
  }

  // mx、my：票的傾斜（−1～1）；visible：背面朝向觀眾時才渲染
  update(dt, t, mx, my, visible) {
    if (!visible || !this.ready) return;
    const v = this.view;
    const yaw = THREE.MathUtils.degToRad(v.yaw - mx * 7), pitch = THREE.MathUtils.degToRad(v.pitch + my * 5);
    const [tx, ty, tz] = v.target;
    this.camera.position.set(
      tx + Math.sin(yaw) * Math.cos(pitch) * v.dist,
      ty + Math.sin(pitch) * v.dist,
      tz + Math.cos(yaw) * Math.cos(pitch) * v.dist,
    );
    this.camera.lookAt(tx, ty, tz);

    // 火車前進時車身輕輕顛動，停站時靜止
    this.trainT += dt;
    const x = this.trainX(), moving = Math.min(1, Math.abs(x - this.train.position.x) / Math.max(dt, 1e-3) / 0.15);
    this.train.position.x = x;
    this.train.position.y = 0.012 + Math.abs(Math.sin(t * 22)) * 0.0012 * moving;
    // 乘客和扣扣原地呼吸，各自錯開節奏
    [...this.cats, this.koko].forEach((g, i) => {
      g.scale.y = 1 + Math.sin(t * 2.1 + i * 1.7) * 0.02;
    });
    this.renderer.render(this.scene, this.camera);
  }
}

// 「汐見港」站牌字板：奶油底、深墨藍框和字，下面一行英文站名；上方的拱留白
async function signBoard() {
  const S = SIGN, top = S.y1 + S.archRy;
  const w = S.x1 - S.x0, h = top - S.y0;
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round(512 * h / w);
  await document.fonts.load('900 100px "Noto Sans TC"', '汐見港').catch(() => {});
  const g = c.getContext('2d'), W = c.width, H = c.height, k = W / w;
  const px = (x) => (x - S.x0) * k, py = (y) => (top - y) * k;
  const lw = 14, rect = py(S.y0) - py(S.y1); // 字板（矩形部分）在 canvas 上的高度
  g.beginPath();
  g.moveTo(lw / 2, py(S.y0) - lw / 2);
  g.lineTo(lw / 2, py(S.y1));
  g.lineTo(px(S.archX - S.archRx), py(S.y1));
  g.ellipse(px(S.archX), py(S.y1), S.archRx * k, S.archRy * k - lw / 2, 0, Math.PI, 0);
  g.lineTo(W - lw / 2, py(S.y1));
  g.lineTo(W - lw / 2, py(S.y0) - lw / 2);
  g.closePath();
  g.fillStyle = '#F6EFE2'; g.fill();
  g.strokeStyle = '#1E2A44'; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
  const y = py(S.y1); // 字板上緣
  g.fillStyle = '#E2483A'; g.fillRect(30, y + rect * 0.69, W - 60, 6);
  g.fillStyle = '#1E2A44'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${Math.round(rect * 0.44)}px "Noto Sans TC", sans-serif`;
  g.fillText('汐見港', W / 2, y + rect * 0.4);
  g.font = `800 ${Math.round(rect * 0.13)}px Inter, sans-serif`;
  g.letterSpacing = '6px';
  g.fillText('SHIOMI PORT', W / 2, y + rect * 0.84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, alphaTest: 0.5 }));
  board.position.set((S.x0 + S.x1) / 2, (S.y0 + top) / 2, S.z);
  return board;
}
