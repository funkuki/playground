// TOY TRANSIT 雷射乘車證：信封開封 → 票飛出 → 傾斜看雷射 → 翻面看主視覺 → 剪票 → 蓋「已抵達」郵戳。
import kokoUrl from '../models/koko.glb?url';
import platformUrl from '../models/platform.glb?url';
import trainUrl from '../models/train.glb?url';
import catAUrl from '../models/cat-a.glb?url';
import catBUrl from '../models/cat-b.glb?url';
import { PERSONAS, frontHTML, backHTML, envelopeHTML } from './ticket.js';
import { Koko } from './koko.js';
import { Station } from './station.js';
import './info.js';
import { Confetti } from './confetti.js';
import { tween, wait, ease, lerp, stepTweens, setSpeed } from './tween.js';

const $ = (s) => document.querySelector(s);
const card = $('#card'), front = card.querySelector('.front'), back = card.querySelector('.back');
const ghost = $('#over .ghost'), ghostFront = ghost.querySelector('.front');
const shadow = $('#shadow'), envBack = $('#env-back'), envFront = $('#env-front'), envFlap = $('#env-flap'), seal = $('#seal');
const hint = $('#hint'), openBtn = $('#open'), dock = $('#dock'), flipBtn = $('#flip');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) setSpeed(0.35);
const TILT = reduced ? 8 : 16;
const THREE_DEG = Math.PI / 180;
const touch = matchMedia('(pointer: coarse)').matches;

// 星星網點遮罩（正面的雷射只從這些星星透出來）
const star = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path d="M6 1l1.3 3.7L11 6 7.3 7.3 6 11 4.7 7.3 1 6l3.7-1.3z"/><circle cx="16.5" cy="16.5" r="1.6"/></svg>');
document.documentElement.style.setProperty('--stars', `url("data:image/svg+xml,${star}") 0 0 / 22px 22px`);

// ---------- 狀態 ----------
// phase：sealed（信封）→ opening → ticket；level：1 待出發、2 已上車、3 已抵達
const S = { phase: 'sealed', level: 1, persona: 'invited', flipped: false, portrait: null, busy: false };
const C = { x: 0, y: 0, s: 1, rx: 0, rz: 0, flip: 0, op: 1, sh: 0, shake: 0 }; // 票的 transform
const E = { dy: 0, op: 1, flap: 0, sealLift: 0, sealRot: 0, sealOp: 1, shake: 0 }; // 信封
const L = {}; // 版面
const tilt = { x: 0, y: 0, tx: 0, ty: 0, gyro: false, dragging: false, lastInput: 0 };

const koko = new Koko($('#koko'));
let stampArt; // 正面的黃色郵票，扣扣住在裡面
const confetti = new Confetti($('#confetti'));
// 背面的 3D 月台：canvas 只建一次，每次 fill() 重畫背面時再放回去
const station = new Station(document.createElement('canvas'));

// ---------- 內容 ----------
function fill() {
  const p = PERSONAS[S.persona];
  front.innerHTML = ghostFront.innerHTML = frontHTML(p);
  stampArt = front.querySelector('.stamp .art');
  back.innerHTML = backHTML(p, S.portrait);
  back.querySelector('.scene').append(station.renderer.domElement);
  const env = envelopeHTML(p);
  envFront.innerHTML = env.front;
  seal.innerHTML = env.seal;
  card.setAttribute('aria-label', `玩具轉運站${p.kind}，乘客 ${p.passenger}，${p.date} ${p.train} ${p.time}，座位 ${p.seat}`);
  syncFaces();
}
function syncFaces() {
  front.setAttribute('aria-hidden', S.flipped);
  back.setAttribute('aria-hidden', !S.flipped);
}

// ---------- 版面 ----------
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const portrait = vw < 640;
  const changed = portrait !== S.portrait;
  S.portrait = portrait;
  card.classList.toggle('portrait', portrait);
  Object.assign(L, { vw, vh });

  if (portrait) {
    const avail = vh - 100 - 124;
    L.w = Math.min(vw - 32, avail / 1.9, 420); L.h = L.w * 1.9;
    L.cx = vw / 2; L.cy = 100 + avail / 2;
    L.ew = Math.min(vw - 72, 340); L.eh = L.ew * 0.66;
    L.kh = L.w * 0.34;
  } else {
    L.w = Math.min(vw * 0.84, 780, (vh - 230) * 2.4); L.h = L.w / 2.4;
    L.cx = vw / 2; L.cy = vh / 2 - 6;
    L.ew = Math.min(vw * 0.6, 520, (vh - 260) * 1.56); L.eh = L.ew * 0.64;
    L.kh = L.h * 0.72;
  }
  L.ex = vw / 2; L.ey = vh * 0.46;
  L.pr = L.w * (portrait ? 0.05 : 0.024);

  card.style.width = shadow.style.width = `${L.w}px`;
  card.style.height = shadow.style.height = `${L.h}px`;
  for (const el of [envBack, envFront, envFlap]) { el.style.width = `${L.ew}px`; el.style.height = `${L.eh}px`; }
  const sz = L.ew * 0.2;
  seal.style.width = seal.style.height = `${sz}px`;
  setPunch(S.level >= 2 && S.phase === 'ticket');

  if (changed) fill();
  koko.resize(vw, vh);
  station.resize(L.w, L.h, portrait);
  confetti.resize();
  if (!S.busy && koko.ready && S.phase === 'sealed') koko.place(anchor('sealed'));
}

// 扣扣在各狀態站的位置（腳底的畫面座標＋身高）
function anchor(kind) {
  const R = { l: L.cx - L.w / 2, r: L.cx + L.w / 2, t: L.cy - L.h / 2, b: L.cy + L.h / 2 };
  const kh = L.kh, P = S.portrait;
  switch (kind) {
    case 'sealed': {
      const h = P ? L.ew * 0.36 : L.eh * 0.72;
      return P ? { x: L.ex + L.ew / 2 - h * 0.3, y: L.ey + L.eh / 2 + h * 0.8, h } : { x: L.ex + L.ew / 2 + h * 0.5, y: L.ey + L.eh / 2 + 4, h };
    }
    case 'punch': return P ? { x: R.l + L.w * 0.5 + kh * 0.32, y: R.b + kh * 0.04, h: kh } : { x: R.r + kh * 0.2, y: L.cy + kh * 0.5, h: kh };
    case 'stomp': return P ? { x: L.cx, y: R.t + L.h * 0.64, h: kh } : { x: R.l + L.w * 0.47, y: R.t + L.h * 0.82, h: kh };
  }
}
const punchPoint = () => (S.portrait ? { x: L.cx, y: L.cy + L.h / 2 } : { x: L.cx + L.w / 2, y: L.cy });
function setPunch(on) { card.style.setProperty('--pr', on ? `${L.pr}px` : '0px'); }

// ---------- 每格畫面 ----------
function render(dt, t) {
  // 傾斜：滑鼠／手指／陀螺儀，沒有輸入時自己慢慢晃，讓雷射光流動
  let tx = tilt.tx, ty = tilt.ty;
  if (!tilt.gyro && !tilt.dragging && t - tilt.lastInput > 2.5 && !reduced) { tx = Math.sin(t * 0.7) * 0.45; ty = Math.sin(t * 0.5) * 0.25; }
  const k = 1 - Math.exp(-dt * 7);
  tilt.x += (tx - tilt.x) * k; tilt.y += (ty - tilt.y) * k;
  const live = S.phase === 'ticket' ? 1 : 0;
  const mx = tilt.x * live, my = tilt.y * live;

  const left = L.cx + C.x - L.w / 2, top = L.cy + C.y + C.shake - L.h / 2;
  card.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${C.s}) rotateX(${C.rx - my * TILT * 0.75}deg) rotateY(${mx * TILT + C.flip}deg) rotateZ(${C.rz}deg)`;
  card.style.setProperty('--mx', mx.toFixed(3));
  card.style.setProperty('--my', my.toFixed(3));
  front.style.opacity = back.style.opacity = C.op;
  ghost.className = card.className + ' ghost'; ghost.style.cssText = card.style.cssText; ghostFront.style.cssText = front.style.cssText;
  if (card.style.visibility !== 'visible') ghost.style.display = 'none'; // 還在信封裡時票是藏起來的，郵戳也不能露出來
  shadow.style.transform = `translate3d(${left - mx * 16}px, ${top + 20 - my * 8}px, 0) scale(${C.s * 0.95})`;
  shadow.style.opacity = C.sh * C.op;

  if (S.phase === 'sealed' || S.phase === 'opening') {
    const bob = reduced ? 0 : Math.sin(t * 1.6) * 5;
    const base = `translate3d(${L.ex - L.ew / 2}px, ${L.ey - L.eh / 2 + E.dy + bob}px, 0) rotate(${E.shake}deg)`;
    envBack.style.transform = envFront.style.transform = base;
    envFlap.style.transform = `${base} perspective(900px) rotateX(${E.flap}deg)`;
    envFlap.classList.toggle('open', E.flap > 90);
    for (const el of [envBack, envFront, envFlap]) el.style.opacity = E.op;
    const sz = L.ew * 0.2;
    seal.style.transform = `translate3d(${L.ex - sz / 2}px, ${L.ey - L.eh / 2 + L.eh * 0.62 - sz / 2 + E.dy + bob - E.sealLift}px, 0) rotate(${E.sealRot + E.shake}deg)`;
    seal.style.opacity = E.sealOp;
  }

  koko.look = S.portrait ? -0.5 : -0.65;
  // 郵票裡的扣扣跟著票傾斜、翻面（CSS 的 rotateX 和 three.js 方向相反）；翻到背面就看不到郵票
  koko.stampRect = stampArt.getBoundingClientRect();
  koko.cardYaw = THREE_DEG * (mx * TILT + C.flip);
  koko.cardPitch = -THREE_DEG * (C.rx - my * TILT * 0.75);
  const f = ((C.flip % 360) + 360) % 360;
  koko.hidden = koko.mode === 'stamp' && f > 90 && f < 270;
  koko.update(dt, t);
  station.update(dt, t, mx, my, f > 90 && f < 270);
  confetti.update(dt);
}

// ---------- 開封儀式 ----------
async function open() {
  if (S.phase !== 'sealed' || S.busy) return;
  requestGyro(); // iOS 要在點擊的當下請求陀螺儀權限
  S.busy = true; S.phase = 'opening';
  openBtn.classList.add('gone'); setHint('');

  // 1 撕封：封蠟彈起、信封抖一下
  tween(320, (_, k) => { E.shake = Math.sin(k * Math.PI * 6) * (1 - k) * 2.5; }, ease.linear);
  await tween(360, (e) => { E.sealLift = 80 * e; E.sealRot = 200 * e; E.sealOp = 1 - e; });
  // 2 開蓋
  await tween(440, (e) => { E.flap = 180 * e; }, ease.inOutCubic);

  // 3 出票：票從信封裡往上滑出，信封往下掉
  const s0 = Math.min((L.ew * 0.84) / L.w, (L.eh * 0.78) / L.h);
  const y0 = L.ey + L.eh * 0.12 - L.cy, x0 = L.ex - L.cx;
  Object.assign(C, { x: x0, y: y0, s: s0, rx: 0, rz: 0, flip: 0, op: 1, sh: 0 });
  card.style.zIndex = 2;
  card.style.visibility = shadow.style.visibility = 'visible';
  const jumped = koko.ready ? koko.jump(0.95, 640) : null; // 模型還沒載完就開封時，扣扣之後直接掉進郵票
  const y1 = y0 - L.eh * 0.8;
  wait(220).then(() => tween(620, (e) => { E.dy = 260 * e; E.op = 1 - e; }, ease.inQuad));
  await tween(520, (e) => { C.y = lerp(y0, y1, e); });

  // 4 飛到眼前：3D 翻轉回正、到位時閃光加碎紙
  card.style.zIndex = 6;
  await tween(720, (e) => {
    C.x = lerp(x0, 0, e); C.y = lerp(y1, 0, e); C.s = lerp(s0, 1, e);
    C.rx = lerp(52, 0, e); C.rz = lerp(-10, 0, e); C.sh = Math.min(1, e * 1.4);
  }, ease.outBack);
  Object.assign(C, { x: 0, y: 0, s: 1, rx: 0, rz: 0, sh: 1 });
  S.phase = 'ticket';
  for (const el of [envBack, envFront, envFlap, seal]) el.style.display = 'none';
  front.querySelector('.flash').classList.add('go');
  if (!reduced) confetti.burst(L.cx, L.cy, S.portrait ? 90 : 130, S.portrait ? 0.8 : 1);
  tilt.lastInput = performance.now() / 1000;

  dock.classList.add('show');
  setHint(readyHint());
  // 5 扣扣跳進郵票裡，開始在郵票裡轉
  if (jumped) {
    await jumped;
    await koko.hopTo(() => koko.stampAnchor(), { arc: 0.9, ms: 660 });
    koko.enterStamp();
  }
  S.busy = false;
}

async function reseal() {
  if (S.phase !== 'ticket' || S.busy) return;
  S.busy = true; dock.classList.add('busy');
  koko.leaveStamp();
  const hopOut = koko.hopTo(anchor('sealed'), { arc: 0.8, ms: 640 });
  await tween(320, (e) => { C.op = 1 - e; C.s = lerp(1, 0.92, e); });
  card.classList.remove('boarded', 'arrived');
  S.level = 1; S.flipped = false; setPunch(false); syncFaces();
  Object.assign(C, { flip: 0, op: 1, s: 1, sh: 0 });
  card.style.visibility = shadow.style.visibility = 'hidden';
  Object.assign(E, { dy: -40, op: 0, flap: 0, sealLift: 0, sealRot: 0, sealOp: 1, shake: 0 });
  for (const el of [envBack, envFront, envFlap, seal]) el.style.display = '';
  S.phase = 'sealed';
  dock.classList.remove('show', 'busy'); flipBtn.classList.remove('on');
  syncSeg();
  await hopOut;
  await tween(420, (e) => { E.dy = lerp(-40, 0, e); E.op = e; });
  openBtn.classList.remove('gone');
  setHint('點封蠟或按「開封」');
  S.busy = false;
}

// ---------- 翻面 ----------
async function doFlip(toBack) {
  if (toBack === S.flipped) return;
  const from = C.flip, to = toBack ? 180 : 0;
  if (toBack) station.arrive();
  await tween(720, (e) => { C.flip = lerp(from, to, e); C.s = 1 - 0.06 * Math.sin(Math.PI * e); }, ease.inOutCubic);
  C.s = 1;
  S.flipped = toBack; syncFaces();
  flipBtn.classList.toggle('on', toBack);
  setHint(toBack ? '背面是展覽主視覺「首班車月台」，轉動看看立體感' : readyHint());
}
async function flip() {
  if (S.phase !== 'ticket' || S.busy) return;
  S.busy = true;
  await doFlip(!S.flipped);
  S.busy = false;
}

// ---------- 剪票／蓋章 ----------
async function setLevel(n) {
  if (S.phase !== 'ticket' || S.busy || n === S.level) return;
  S.busy = true; dock.classList.add('busy');
  syncSeg(n);
  if (S.flipped) await doFlip(false);
  // 從郵票跳出去做完動作，再跳回郵票裡
  const home = () => koko.stampAnchor();

  if (n > S.level) {
    if (S.level < 2) {
      koko.leaveStamp();
      await koko.pounce(anchor('punch'), home, () => {
        card.classList.add('boarded'); setPunch(true); shake(5);
        const pt = punchPoint(); confetti.chip(pt.x, pt.y);
      });
      koko.enterStamp();
      S.level = 2;
      setHint('喀！扣扣幫你剪好票了，存根上多了一個剪票孔');
    }
    if (n === 3) {
      koko.leaveStamp();
      await koko.stomp(anchor('stomp'), home, () => {
        card.classList.add('arrived'); shake(12);
        if (!reduced) confetti.burst(anchor('stomp').x, anchor('stomp').y - L.kh * 0.2, 45, 0.55);
      });
      koko.enterStamp();
      setHint('展覽結束，乘車證變成紀念存根了。翻到背面看看');
    }
  } else {
    if (n < 3) card.classList.remove('arrived');
    if (n < 2) { card.classList.remove('boarded'); setPunch(false); }
    await koko.jump(0.35, 420);
    setHint(readyHint());
  }
  S.level = n;
  dock.classList.remove('busy');
  S.busy = false;
}
function shake(px) {
  tween(380, (_, k) => { C.shake = Math.sin(k * Math.PI * 5) * (1 - k) * px; C.rz = Math.sin(k * Math.PI * 4) * (1 - k) * px * 0.08; }, ease.linear)
    .then(() => { C.shake = 0; C.rz = 0; });
}

// ---------- UI ----------
function setHint(text) {
  hint.classList.toggle('gone', !text);
  hint.classList.toggle('sealed', S.phase === 'sealed');
  if (text) hint.textContent = text;
}
function readyHint() {
  if (!touch) return '移動滑鼠轉動票面，看雷射光流動';
  return tilt.gyro ? '傾斜手機，看雷射光流動' : '在票上拖曳，轉動看看雷射光';
}
function syncSeg(n = S.level) {
  dock.querySelectorAll('[data-state]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.state === n)));
}

openBtn.addEventListener('click', open);
seal.addEventListener('click', open);
envBack.addEventListener('click', open);
flipBtn.addEventListener('click', flip);
$('#reseal').addEventListener('click', reseal);
dock.querySelectorAll('[data-state]').forEach((b) => b.addEventListener('click', () => setLevel(+b.dataset.state)));
dock.querySelectorAll('[data-persona]').forEach((b) => b.addEventListener('click', () => {
  if (S.busy || S.persona === b.dataset.persona) return;
  S.persona = b.dataset.persona;
  dock.querySelectorAll('[data-persona]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  fill();
}));
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || $('#info').classList.contains('open')) return; // 說明視窗開著時不觸發快捷鍵
  const k = e.key.toLowerCase();
  if (k === 'f') flip();
  else if (k === 'r') reseal();
  else if (['1', '2', '3'].includes(k)) setLevel(+k);
  else if (k === 'o' || ((k === 'enter' || k === ' ') && S.phase === 'sealed' && document.activeElement === document.body)) open();
});

// ---------- 輸入：滑鼠、手指、陀螺儀 ----------
const clamp = (v) => Math.max(-1, Math.min(1, v));
function pointTilt(e) {
  tilt.tx = clamp((e.clientX - L.cx) / (L.w * 0.55));
  tilt.ty = clamp((e.clientY - L.cy) / (L.h * 0.55));
  tilt.lastInput = performance.now() / 1000;
}
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' || tilt.dragging) pointTilt(e);
});
document.documentElement.addEventListener('mouseleave', () => { tilt.tx = tilt.ty = 0; });
card.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  tilt.dragging = true; pointTilt(e);
});
addEventListener('pointerup', () => {
  if (!tilt.dragging) return;
  tilt.dragging = false;
  if (!tilt.gyro) tilt.tx = tilt.ty = 0;
});

let base = null;
function onOrient(e) {
  if (e.beta == null || tilt.dragging) return;
  if (!base) base = { b: e.beta, g: e.gamma };
  // 基準角度慢慢跟上目前的握法，換姿勢也不會一直歪一邊
  base.b += (e.beta - base.b) * 0.005; base.g += (e.gamma - base.g) * 0.005;
  tilt.tx = clamp((e.gamma - base.g) / 20);
  tilt.ty = clamp((e.beta - base.b) / 20);
  if (!tilt.gyro) { tilt.gyro = true; if (S.phase === 'ticket' && !S.flipped && S.level === 1) setHint(readyHint()); }
  tilt.lastInput = performance.now() / 1000;
}
function requestGyro() {
  if (!touch || typeof DeviceOrientationEvent === 'undefined') return;
  const listen = () => addEventListener('deviceorientation', onOrient);
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then((r) => r === 'granted' && listen()).catch(() => {});
  } else listen();
}

// ---------- 開始 ----------
layout();
addEventListener('resize', layout);
setHint('點封蠟或按「開封」');

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  stepTweens(now);
  render(dt, now / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

koko.load(kokoUrl).then(async () => {
  if (S.phase === 'sealed') {
    await koko.dropIn(anchor('sealed'));
    if (location.hash === '#open') open(); // 網址加 #open 直接開封（分享連結、截封面用）
    return;
  }
  // 載完時已經開封了：等票到位，從郵票上方掉進去
  while (S.phase !== 'ticket') await wait(100);
  koko.stampRect = stampArt.getBoundingClientRect();
  koko.enterStamp();
  await koko.dropIn(koko.stampAnchor());
}).catch((err) => console.error('扣扣載入失敗', err))
  // 背面的月台等正面的扣扣載完再載，不跟開封搶頻寬
  .then(() => station.load({ platform: platformUrl, train: trainUrl, catA: catAUrl, catB: catBUrl, koko: kokoUrl }))
  .then(() => station.renderer.domElement.classList.add('on'))
  .catch((err) => console.error('月台載入失敗', err));
