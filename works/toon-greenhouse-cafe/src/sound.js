import * as THREE from 'three';

// 咖啡廳環境音：杯子輕碰、湯匙攪拌、磨豆機、敲粉渣、萃取幫浦、蒸氣管
// 全部用 Web Audio 即時合成，不用外部音檔。瀏覽器規定要使用者點過才能出聲，所以預設關閉。

const BAR = new THREE.Vector3(-1.5, 1.5, -2.0); // 吧台上的咖啡機
const TABLE = new THREE.Vector3(2.3, 0.9, 0.6); // 沙發區茶几
const _p = new THREE.Vector3();
const rr = (a, b) => a + (b - a) * Math.random();

export function createSound(camera) {
  let ctx = null;
  let master, noise, room;
  let on = false;
  let nextClink = 0, nextMachine = 0;

  // 4 秒白噪音，循環使用
  function makeNoise() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function noiseSource(at, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const offset = Math.random() * 3;
    if (at === undefined) src.start(0, offset);
    else { src.start(at, offset); src.stop(at + dur); }
    return src;
  }
  const filter = (type, freq, Q = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  };
  // 音量包絡：attack → 持續 → release
  function env(at, peak, attack, hold, release) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.setValueAtTime(peak, at + attack + hold);
    g.gain.linearRampToValueAtTime(0, at + attack + hold + release);
    return g;
  }

  function init() {
    ctx = new AudioContext();
    noise = makeNoise();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // 室內底噪：很輕的低頻空氣聲
    room = ctx.createGain();
    room.gain.value = 0.004;
    noiseSource().connect(filter('lowpass', 500, 0.5)).connect(room).connect(master);
  }

  // 世界座標 → 左右聲道與音量（離相機越遠越小聲）
  function out(pos) {
    _p.copy(pos).project(camera);
    const p = ctx.createStereoPanner();
    p.pan.value = THREE.MathUtils.clamp(_p.x * 0.7, -1, 1);
    const g = ctx.createGain();
    g.gain.value = THREE.MathUtils.clamp(22 / camera.position.distanceTo(pos), 0.4, 1.6);
    g.connect(p).connect(master);
    return g;
  }

  // ---------- 杯子 ----------
  // 陶瓷輕碰：幾個不成倍數的正弦泛音，很快衰減
  function clink(at, dest, vol, f0 = rr(2300, 3300)) {
    for (const [ratio, amp, decay] of [[1, 1, 0.22], [2.32, 0.45, 0.12], [4.07, 0.2, 0.07]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f0 * ratio * rr(0.99, 1.01);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol * amp, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      o.connect(g).connect(dest);
      o.start(at);
      o.stop(at + decay + 0.02);
    }
    // 碰到瞬間的一點雜音
    const n = noiseSource(at, 0.02);
    const g = env(at, vol * 0.3, 0.001, 0, 0.015);
    n.connect(filter('highpass', 4000)).connect(g).connect(dest);
  }
  // 杯子放回盤子：先一聲低一點的碰，再一聲輕的
  function cupOnSaucer(at, dest) {
    clink(at, dest, 0.03, rr(1500, 1900));
    clink(at + rr(0.05, 0.09), dest, 0.015, rr(2600, 3200));
  }
  // 湯匙攪拌：一串很輕的高音叮叮
  function stir(at, dest) {
    const n = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) clink(at + i * rr(0.13, 0.17), dest, rr(0.006, 0.012), rr(4200, 5200));
  }

  // ---------- 咖啡機 ----------
  // 磨豆機：帶通噪音 + 馬達嗡聲，音量微微抖動
  function grind(at, dest, dur = rr(1.8, 2.6)) {
    const g = env(at, 0.02, 0.08, dur, 0.25);
    const n = noiseSource(at, dur + 0.4);
    n.connect(filter('bandpass', 1700, 1.4)).connect(g);
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(95, at);
    motor.frequency.linearRampToValueAtTime(118, at + 0.15);
    const mg = ctx.createGain();
    mg.gain.value = 0.35;
    motor.connect(filter('lowpass', 600)).connect(mg).connect(g);
    motor.start(at);
    motor.stop(at + dur + 0.4);
    // 豆子被打碎的顆粒感
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 23;
    const lg = ctx.createGain();
    lg.gain.value = 0.006;
    lfo.connect(lg).connect(g.gain);
    lfo.start(at);
    lfo.stop(at + dur + 0.4);
    g.connect(dest);
    return at + dur + 0.3;
  }
  // 敲粉渣、壓粉：兩下悶悶的木頭聲
  function knock(at, dest) {
    for (const dt of [0, rr(0.22, 0.3)]) {
      const t = at + dt;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(dest);
      o.start(t);
      o.stop(t + 0.15);
      const n = noiseSource(t, 0.05);
      n.connect(filter('lowpass', 900)).connect(env(t, 0.03, 0.001, 0, 0.04)).connect(dest);
    }
  }
  // 萃取：幫浦低沉的嗡嗡聲 + 咖啡滴進杯子的細碎聲
  function brew(at, dest, dur = rr(4, 6)) {
    const g = env(at, 0.012, 0.3, dur, 0.6);
    for (const [f, type] of [[50, 'square'], [100, 'sawtooth']]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * rr(0.99, 1.01);
      o.connect(filter('lowpass', 320, 0.7)).connect(g);
      o.start(at);
      o.stop(at + dur + 1);
    }
    g.connect(dest);
    // 滴落：隨機的小水滴聲
    for (let t = at + 1.0; t < at + dur; t += rr(0.05, 0.16)) {
      const n = noiseSource(t, 0.03);
      n.connect(filter('bandpass', rr(1800, 3200), 6)).connect(env(t, rr(0.01, 0.02), 0.002, 0, 0.025)).connect(dest);
    }
    return at + dur + 0.6;
  }
  // 蒸氣管打奶泡：高頻嘶聲慢慢變調，底下有咕嚕咕嚕
  function steam(at, dest, dur = rr(2.5, 3.5)) {
    const g = env(at, 0.014, 0.15, dur, 0.4);
    const bp = filter('bandpass', 5200, 0.8);
    bp.frequency.setValueAtTime(5200, at);
    bp.frequency.linearRampToValueAtTime(3600, at + dur); // 奶泡變多，聲音變低
    noiseSource(at, dur + 0.6).connect(filter('highpass', 2000)).connect(bp).connect(g);
    // 咕嚕聲：低通噪音被快速 LFO 調變
    const gur = ctx.createGain();
    gur.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const lg = ctx.createGain();
    lg.gain.value = 0.4;
    lfo.connect(lg).connect(gur.gain);
    lfo.start(at);
    lfo.stop(at + dur + 0.6);
    noiseSource(at, dur + 0.6).connect(filter('lowpass', 700)).connect(gur).connect(g);
    g.connect(dest);
    return at + dur + 0.5;
  }

  // 一整杯：磨豆 → 敲粉 → 萃取 → 有時打奶泡 → 杯子放到盤上
  function makeCoffee(now) {
    const dest = out(BAR);
    let t = grind(now + 0.05, dest);
    knock(t + rr(0.4, 0.8), dest);
    t = brew(t + rr(1.4, 2.0), dest);
    if (Math.random() < 0.6) t = steam(t + rr(0.6, 1.2), dest);
    cupOnSaucer(t + rr(0.6, 1.2), dest);
  }
  // 茶几那邊：杯子碰盤子、湯匙攪拌、兩個杯子輕輕碰在一起
  function tableSound(now) {
    const dest = out(TABLE);
    const r = Math.random();
    if (r < 0.45) cupOnSaucer(now + 0.05, dest);
    else if (r < 0.75) stir(now + 0.05, dest);
    else clink(now + 0.05, dest, 0.025);
  }

  return {
    get on() { return on; },
    toggle() {
      if (!ctx) init();
      on = !on;
      if (on) {
        ctx.resume();
        // 打開後很快就聽得到一次
        nextClink = ctx.currentTime + 1.5;
        nextMachine = ctx.currentTime + 4;
      }
      master.gain.setTargetAtTime(on ? 2.6 : 0, ctx.currentTime, 0.3); // 各聲音本身都很輕，整體再放大
      return on;
    },
    // 分頁切到背景時暫停，回來再繼續
    setHidden(hidden) {
      if (!ctx || !on) return;
      hidden ? ctx.suspend() : ctx.resume();
    },
    // 每幀檢查：時間到就排下一個聲音
    update() {
      if (!on) return;
      const now = ctx.currentTime;
      if (now >= nextClink) {
        tableSound(now);
        nextClink = now + rr(4, 10);
      }
      if (now >= nextMachine) {
        makeCoffee(now);
        nextMachine = now + rr(25, 45);
      }
    },
  };
}
