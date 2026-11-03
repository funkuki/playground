// ---------- 音效：全部用 Web Audio 即時合成，沒有音檔 ----------
// 瀏覽器要等使用者第一次點擊才能出聲，所以 unlock() 掛在第一次 pointerdown。

let ctx = null, master = null, noiseBuf = null;
let enabled = true;

export function unlock() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    // 輕微壓縮，連續戳的時候音量不會疊太大
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setEnabled(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.03);
}

const ready = () => ctx && enabled && ctx.state === 'running';

// 小工具：一個聲部 → 左右聲道 → master
function out(pan = 0) {
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(master);
  return p;
}
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function noise(t, dur, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = rate;
  s.start(t, Math.random() * 1.5, dur + 0.05);
  return s;
}
function tone(type, t, f0, f1, dur) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.start(t);
  o.stop(t + dur + 0.05);
  return o;
}
// 濕濕的黏土「噗」：低通的雜訊，濾波器從高往低掃
function squish(t, pan, { amp = 0.5, from = 1400, to = 220, dur = 0.14 } = {}) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 6;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  env(g, t, 0.006, amp, dur);
  noise(t, dur + 0.02).connect(f).connect(g).connect(out(pan));
}

// 持續的聲部（揉、拉長）：一直開著雜訊，音量跟著手的速度走
function voice(type, freq, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  const p = ctx.createStereoPanner();
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.connect(f).connect(g).connect(p).connect(master);
  s.start();
  return {
    f, g, p,
    stop() {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      s.stop(ctx.currentTime + 0.4);
    },
  };
}

let rubV = null, stretchV = null;

export const sfx = {
  // 戳：手指壓進黏土，悶悶的一聲加一點濕的噗
  poke(pan = 0) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    env(g, t, 0.004, 0.55, 0.12);
    tone('sine', t, 170 + Math.random() * 30, 62, 0.12).connect(g).connect(out(pan));
    squish(t + 0.005, pan, { amp: 0.35, from: 1800 + Math.random() * 600, to: 260, dur: 0.11 });
  },
  // 按住越壓越深：很輕的擠壓聲
  press(depth, pan = 0) {
    if (!ready()) return;
    squish(ctx.currentTime, pan, { amp: 0.04 + depth * 3, from: 380 + depth * 9000, to: 140, dur: 0.1 });
  },

  // 揉：手掌抹過黏土的沙沙聲，速度越快越大聲、越亮
  rubStart(pan = 0) {
    if (!ready()) return;
    rubV?.stop();
    rubV = voice('bandpass', 900, 0.7);
    rubV.p.pan.value = pan;
  },
  rub(speed, pan = 0) {
    if (!rubV) return;
    const k = Math.min(1, speed / 1400);
    const t = ctx.currentTime;
    rubV.g.gain.setTargetAtTime(k * 0.5, t, 0.04);
    rubV.f.frequency.setTargetAtTime(500 + k * 1300, t, 0.05);
    rubV.p.pan.setTargetAtTime(pan, t, 0.05);
  },
  rubEnd() { rubV?.stop(); rubV = null; },

  // 捏：抓起來「啾」一聲，拉長時有低低的拉扯聲，放開「啵嚶」彈回去
  grab(pan = 0) {
    if (!ready()) return;
    const t = ctx.currentTime;
    squish(t, pan, { amp: 0.4, from: 700, to: 2200, dur: 0.09 });
    stretchV?.stop();
    stretchV = voice('bandpass', 260, 4);
    stretchV.p.pan.value = pan;
  },
  stretch(amount, speed) {
    if (!stretchV) return;
    const t = ctx.currentTime;
    const v = Math.min(1, speed / 900);
    stretchV.g.gain.setTargetAtTime(v * (0.35 + amount * 0.5), t, 0.04);
    stretchV.f.frequency.setTargetAtTime(220 + amount * 700, t, 0.06);
  },
  release(amount, pan = 0) {
    stretchV?.stop();
    stretchV = null;
    if (!ready() || amount < 0.05) return;
    const t = ctx.currentTime;
    // 有彈性的「啵嚶」：音高抖動、慢慢收掉
    const o = ctx.createOscillator();
    o.type = 'sine';
    const base = 150 + amount * 120;
    o.frequency.setValueAtTime(base * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(base, t + 0.08);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(base * 0.18, t);
    depth.gain.exponentialRampToValueAtTime(1, t + 0.45);
    lfo.connect(depth).connect(o.frequency);
    const g = ctx.createGain();
    env(g, t, 0.01, 0.3 + amount * 0.25, 0.45);
    o.connect(g).connect(out(pan));
    o.start(t); o.stop(t + 0.55);
    lfo.start(t); lfo.stop(t + 0.55);
    squish(t, pan, { amp: 0.25, from: 2400, to: 400, dur: 0.08 });
  },

  // 恢復原狀：黏土慢慢鼓回去，像被揉順的「咻嚕」聲，中間夾著幾個小小的噗
  restore(dur = 1.15) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur * 0.7);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.25);
    g.gain.setValueAtTime(0.22, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    noise(t, dur + 0.05).connect(f).connect(g).connect(out(0));
    for (let i = 0; i < 6; i++) {
      const at = t + 0.12 + (i / 6) * dur * 0.75 + Math.random() * 0.05;
      squish(at, (Math.random() - 0.5) * 0.8, { amp: 0.12, from: 900 + i * 180, to: 240, dur: 0.07 });
    }
  },
  // 恢復後整隻左右抖：音高跟著擺動上下晃、越晃越小
  wobble(dur = 0.72) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const swing = 3 / dur; // 畫面上抖三下
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = swing;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(55, t);
    depth.gain.exponentialRampToValueAtTime(2, t + dur);
    lfo.connect(depth).connect(o.frequency);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = ctx.createGain();
    env(g, t, 0.02, 0.28, dur);
    // 每擺一邊就小聲一點：用同樣的 LFO 調音量
    const trem = ctx.createGain();
    trem.gain.value = 0.7;
    const tremD = ctx.createGain();
    tremD.gain.value = 0.3;
    lfo.connect(tremD).connect(trem.gain);
    o.connect(lp).connect(g).connect(trem).connect(out(0));
    o.start(t); o.stop(t + dur + 0.1);
    lfo.start(t); lfo.stop(t + dur + 0.1);
    // 每次擺到最旁邊，黏土「啾」一下
    for (let i = 0; i < 6; i++) {
      const k = 1 - i / 6;
      squish(t + (i + 0.5) * dur / 6, i % 2 ? 0.35 : -0.35, { amp: 0.16 * k + 0.02, from: 1500, to: 380, dur: 0.06 });
    }
  },

  // 拍照：拍立得的快門「喀—嚓」，接著馬達把相片吐出來「滋——」
  shutter() {
    if (!ready()) return;
    const t = ctx.currentTime;
    // 快門：兩下很短的機械聲，第一下亮、第二下悶
    for (const [dt, hp, amp, f0] of [[0, 3200, 0.6, 2400], [0.07, 1200, 0.45, 900]]) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      const g = ctx.createGain();
      env(g, t + dt, 0.001, amp, 0.035);
      noise(t + dt, 0.05).connect(f).connect(g).connect(out(0));
      const k = ctx.createGain();
      env(k, t + dt, 0.001, amp * 0.5, 0.05);
      tone('square', t + dt, f0, f0 * 0.6, 0.05).connect(k).connect(out(0));
    }
    // 彈簧回彈的小金屬聲
    const r = ctx.createGain();
    env(r, t + 0.08, 0.002, 0.06, 0.18);
    tone('sine', t + 0.08, 3100, 3000, 0.2).connect(r).connect(out(0.2));
    // 出片馬達：鋸齒波低音加雜訊，音高微微抖
    const start = t + 0.28, dur = 0.85;
    const m = ctx.createOscillator();
    m.type = 'sawtooth';
    m.frequency.setValueAtTime(95, start);
    m.frequency.linearRampToValueAtTime(110, start + 0.12);
    m.frequency.linearRampToValueAtTime(102, start + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 3;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(0.0001, start);
    mg.gain.exponentialRampToValueAtTime(0.13, start + 0.05);
    mg.gain.setValueAtTime(0.13, start + dur - 0.1);
    mg.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    m.connect(lp).connect(mg).connect(out(0));
    m.start(start); m.stop(start + dur + 0.05);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 1800;
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, start);
    ng.gain.exponentialRampToValueAtTime(0.07, start + 0.05);
    ng.gain.setValueAtTime(0.07, start + dur - 0.1);
    ng.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    noise(start, dur).connect(nf).connect(ng).connect(out(0));
    // 相片吐完「喀」停住
    const e = ctx.createGain();
    env(e, start + dur - 0.02, 0.001, 0.25, 0.03);
    const ef = ctx.createBiquadFilter();
    ef.type = 'highpass';
    ef.frequency.value = 1500;
    noise(start + dur - 0.02, 0.04).connect(ef).connect(e).connect(out(0));
  },

  // 換燈光：開關「喀嚓」，接著每種燈光一個小小的音色
  light(i) {
    if (!ready()) return;
    const t = ctx.currentTime;
    for (const [dt, amp] of [[0, 0.5], [0.045, 0.3]]) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2500;
      const g = ctx.createGain();
      env(g, t + dt, 0.001, amp, 0.025);
      noise(t + dt, 0.03).connect(f).connect(g).connect(out(0));
      const k = ctx.createGain();
      env(k, t + dt, 0.001, amp * 0.6, 0.04);
      tone('triangle', t + dt, 1900, 1200, 0.04).connect(k).connect(out(0));
    }
    const notes = [
      [523, 659, 784],  // 窗邊午後：暖暖的大三和弦
      [1047, 1568],     // 白色攝影棚：明亮的「叮」
      [196, 294],       // 夜晚檯燈：低低的一聲
      [110, 165, 220],  // 舞台聚光：厚重的「咚」
    ][i] || [];
    notes.forEach((f, j) => {
      const g = ctx.createGain();
      env(g, t + 0.07 + j * 0.035, 0.01, 0.12, i === 3 ? 0.9 : 0.6);
      tone(i === 1 ? 'sine' : 'triangle', t + 0.07 + j * 0.035, f, f, 1).connect(g).connect(out((j - 1) * 0.3));
    });
    if (i === 3) {
      // 舞台燈點亮的低頻悶響
      const g = ctx.createGain();
      env(g, t + 0.06, 0.005, 0.5, 0.35);
      tone('sine', t + 0.06, 90, 45, 0.35).connect(g).connect(out(0));
    }
  },

  // 換角色：起飛時輕輕的「咻」
  whoosh(pan = 0) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
    f.frequency.exponentialRampToValueAtTime(600, t + 0.55);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    noise(t, 0.62).connect(f).connect(g).connect(out(pan));
  },
  // 落在轉台上：黏土腳底的悶聲 + 木頭轉台被敲一下
  land() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    env(g, t, 0.004, 0.7, 0.2);
    tone('sine', t, 120, 48, 0.2).connect(g).connect(out(0));
    for (const [f, a] of [[520, 0.18], [835, 0.1], [1260, 0.05]]) {
      const k = ctx.createGain();
      env(k, t, 0.002, a, 0.16);
      tone('sine', t, f, f * 0.97, 0.18).connect(k).connect(out(0));
    }
    squish(t + 0.01, 0, { amp: 0.4, from: 1600, to: 200, dur: 0.13 });
    // 轉台小小晃一下的第二聲
    const k2 = ctx.createGain();
    env(k2, t + 0.13, 0.003, 0.08, 0.1);
    tone('sine', t + 0.13, 560, 540, 0.12).connect(k2).connect(out(0));
  },
};
