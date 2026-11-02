// 音效：全部用 Web Audio 即時合成，沒有音檔
// 背景是柔和的水聲（低通的棕噪音慢慢起伏 + 偶爾拍岸、冒泡），事件音有落水水花、划水、甩水
let ctx = null, master = null, noiseBuf = null, brownBuf = null;
let on = true;       // 使用者想不想聽
let started = false; // 瀏覽器要求先有使用者操作才能出聲
let nextLap = 0, nextPlip = 0;

const rand = (a, b) => a + Math.random() * (b - a);
const panFor = (x) => Math.max(-0.8, Math.min(0.8, x / 10));

function makeNoise(seconds, brown) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else d[i] = w;
  }
  return buf;
}

// 噪音 → 濾波 → 包絡 → 聲像，回傳 gain 讓呼叫端排包絡
function noiseVoice(when, dur, { type = 'bandpass', freq = 800, q = 1, pan = 0 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(f).connect(g).connect(p).connect(master);
  src.start(when, Math.random() * 1.5);
  src.stop(when + dur + 0.05);
  return { f, g };
}

function env(g, when, peak, attack, decay) {
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
}

// 水滴「啵」：音高快速往上滑的短正弦（氣泡共振的聲音）
function plip(when, { gain = 0.03, freq = rand(700, 1500), pan = 0 } = {}) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(freq, when);
  o.frequency.exponentialRampToValueAtTime(freq * rand(1.5, 2.2), when + 0.06);
  const g = ctx.createGain();
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  o.connect(g).connect(p).connect(master);
  env(g, when, gain, 0.004, 0.09);
  o.start(when);
  o.stop(when + 0.12);
}

function startAmbient() {
  // 低通棕噪音，濾波頻率和音量用很慢的 LFO 推動，像水面輕輕晃
  const src = ctx.createBufferSource();
  src.buffer = brownBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.value = 0.16;
  src.connect(f).connect(g).connect(master);
  for (const [param, rate, depth] of [[f.frequency, 0.11, 140], [g.gain, 0.07, 0.05]]) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const d = ctx.createGain();
    d.gain.value = depth;
    lfo.connect(d).connect(param);
    lfo.start();
  }
  src.start();
}

function init() {
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = on ? 0.8 : 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  master.connect(comp).connect(ctx.destination);
  noiseBuf = makeNoise(2, false);
  brownBuf = makeNoise(6, true);
  startAmbient();
  nextLap = ctx.currentTime + 1;
  nextPlip = ctx.currentTime + 2;
}

const ready = () => ctx && started && on && ctx.state === 'running';

export const sfx = {
  get ctx() { return ctx; },
  get master() { return master; },
  // 第一次使用者操作時呼叫，之後才會出聲
  unlock() {
    if (started) return;
    started = true;
    if (!ctx) init();
    ctx.resume();
  },
  get on() { return on; },
  setOn(v) {
    on = v;
    if (v) this.unlock();
    if (!ctx) return;
    master.gain.setTargetAtTime(v ? 0.8 : 0, ctx.currentTime, 0.08);
  },
  suspend(hidden) {
    if (!ctx) return;
    if (hidden) ctx.suspend();
    else if (started) ctx.resume();
  },

  // 每幀呼叫：安排背景裡偶爾的拍岸聲和冒泡
  tick() {
    if (!ready()) return;
    const now = ctx.currentTime;
    if (now >= nextLap) {
      const { f, g } = noiseVoice(now, 1.4, { freq: rand(450, 750), q: 1.3, pan: rand(-0.6, 0.6) });
      env(g, now, rand(0.05, 0.09), rand(0.25, 0.45), rand(0.6, 0.9));
      f.frequency.exponentialRampToValueAtTime(f.frequency.value * 0.6, now + 1.2);
      nextLap = now + rand(1.6, 4.2);
    }
    if (now >= nextPlip) {
      plip(now, { gain: rand(0.012, 0.025), pan: rand(-0.7, 0.7) });
      nextPlip = now + rand(0.8, 3.5);
    }
  },

  // 落水：低沉的「噗通」+ 往下掃的水花噪音 + 水滴陸續落回水面
  splash(x) {
    if (!ready()) return;
    const now = ctx.currentTime, pan = panFor(x);
    const thump = noiseVoice(now, 0.5, { type: 'lowpass', freq: 260, q: 0.7, pan });
    env(thump.g, now, 0.9, 0.006, 0.32);
    const sp = noiseVoice(now, 1.0, { freq: 2600, q: 0.7, pan });
    env(sp.g, now, 0.45, 0.01, 0.75);
    sp.f.frequency.setValueAtTime(2600, now);
    sp.f.frequency.exponentialRampToValueAtTime(650, now + 0.6);
    const hiss = noiseVoice(now, 1.0, { type: 'highpass', freq: 4500, q: 0.5, pan });
    env(hiss.g, now + 0.03, 0.12, 0.02, 0.5);
    for (let i = 0; i < 30; i++) {
      const w = now + 0.25 + Math.pow(Math.random(), 1.4) * 1.3;
      plip(w, { gain: rand(0.015, 0.05), pan: pan + rand(-0.25, 0.25) });
    }
  },

  // 狗爬式划水：很輕的短水聲
  paddle(x) {
    if (!ready()) return;
    const now = ctx.currentTime + rand(0, 0.05);
    const { f, g } = noiseVoice(now, 0.4, { freq: rand(500, 900), q: 1.6, pan: panFor(x) });
    env(g, now, rand(0.04, 0.07), 0.05, 0.22);
    f.frequency.exponentialRampToValueAtTime(f.frequency.value * 0.7, now + 0.3);
    if (Math.random() < 0.4) plip(now + rand(0.05, 0.2), { gain: 0.015, pan: panFor(x) });
  },

  // 上岸甩水：高頻噪音快速顫動，像水珠被甩出去
  shake(x, dur = 1.1) {
    if (!ready()) return;
    const now = ctx.currentTime, pan = panFor(x);
    const { g } = noiseVoice(now, dur + 0.3, { freq: 3200, q: 0.8, pan });
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.1);
    g.gain.setValueAtTime(0.22, now + dur - 0.3);
    g.gain.linearRampToValueAtTime(0, now + dur);
    const am = ctx.createOscillator();
    am.frequency.value = 13;
    const depth = ctx.createGain();
    depth.gain.value = 0.11;
    am.connect(depth).connect(g.gain);
    am.start(now);
    am.stop(now + dur);
    for (let i = 0; i < 10; i++) plip(now + rand(0.1, dur + 0.3), { gain: rand(0.008, 0.02), freq: rand(1200, 2200), pan });
  },
};
