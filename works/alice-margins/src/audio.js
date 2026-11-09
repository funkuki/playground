// 音軌：口白（逐句音檔）+ 合成音效 + 低低的環境底音，用 OfflineAudioContext 一次算成一整條。
// 播放時從目前秒數開始播這條音軌；輸出時把同一段寫成 WAV，畫面和聲音用的是同一份時間。
import { rng } from './kit.js';

export const SR = 48000;
const GAP = 0.4, LEAD = 0.5;

// 把每句口白排進它那一幕：從幕開始後 0.5 秒起，句與句之間留 0.4 秒
export function placeNarration(scenes, clips) {
  const cues = [];
  for (const s of scenes) {
    let t = s.start + LEAD;
    for (const c of clips.filter((c) => c.scene === s.id)) {
      cues.push({ ...c, start: t, end: t + c.duration });
      t += c.duration + GAP;
    }
    if (t - GAP > s.end) console.warn(`口白超出「${s.id}」這一幕 ${(t - GAP - s.end).toFixed(2)} 秒`);
  }
  return cues;
}

// ---------- 合成音效 ----------
function makeNoise(ctx) {
  const r = rng(7), len = SR * 2, buf = ctx.createBuffer(1, len, SR), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
  return buf;
}

function voice(ctx, out, noise, r) {
  const gainAt = (t, peak, attack, decay, node) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    if (node) node.connect(g);
    g.connect(out);
    return g;
  };
  const osc = (type, t, f0, f1, dur) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  };
  const noiseSrc = (t, dur) => {
    const n = ctx.createBufferSource();
    n.buffer = noise;
    n.loop = true;
    n.start(t, r() * 1.5);
    n.stop(t + dur + 0.05);
    return n;
  };
  const filter = (type, f, q = 1, src) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    src.connect(b);
    return b;
  };

  return {
    pop(t, { pitch = 1, vol = 0.5 } = {}) {
      gainAt(t, vol, 0.004, 0.09, osc('sine', t, 520 * pitch, 1150 * pitch, 0.08));
    },
    sprout(t, { n = 4, vol = 0.07 } = {}) {
      // 植物長出來：細碎的葉子沙沙聲，加上一個慢慢往上滑、像莖在伸長的柔和音，最後輕輕「啵」開一朵花
      const dur = 0.45 + n * 0.05;
      for (let i = 0; i < 10 + n * 3; i++) {
        const tt = t + r() * dur, k = 1 - (tt - t) / dur * 0.5;
        gainAt(tt, vol * 0.5 * k * (0.5 + r() * 0.5), 0.004, 0.03 + r() * 0.04, filter('bandpass', 2600 + r() * 3200, 2.2, noiseSrc(tt, 0.09)));
      }
      const stem = filter('lowpass', 1400, 0.7, osc('triangle', t, 260 + r() * 40, 620 + r() * 80, dur));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * 0.55, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      stem.connect(g);
      g.connect(out);
      const f = [784, 880, 1046.5][Math.floor(r() * 3)];
      gainAt(t + dur * 0.9, vol * 0.45, 0.003, 0.35, osc('sine', t + dur * 0.9, f, f, 0.4));
    },
    whoosh(t, { dur = 0.7, vol = 0.35, from = 300, to = 2400 } = {}) {
      const bp = filter('bandpass', from, 1.4, noiseSrc(t, dur));
      bp.frequency.setValueAtTime(from, t);
      bp.frequency.exponentialRampToValueAtTime(to, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.55);
      g.gain.linearRampToValueAtTime(0, t + dur);
      bp.connect(g);
      g.connect(out);
    },
    page(t, { dur = 1.7, vol = 0.4 } = {}) {
      // 翻書：掀起時紙張的脆響 → 書頁劃過空氣的「唰」（中間最快最響）→ 落下時輕拍一聲
      const mid = t + dur * 0.5, sw = Math.min(0.9, dur * 0.55);
      for (let i = 0; i < 7; i++) {
        const tt = t + 0.05 + r() * 0.22;
        gainAt(tt, vol * (0.25 + r() * 0.3), 0.001, 0.012 + r() * 0.02, filter('highpass', 3500 + r() * 3000, 0.8, noiseSrc(tt, 0.04)));
      }
      const air = (type, f0, f1, q, peak) => {
        const b = filter(type, f0, q, noiseSrc(mid - sw / 2, sw + 0.1));
        b.frequency.setValueAtTime(f0, mid - sw / 2);
        b.frequency.exponentialRampToValueAtTime(f1, mid);
        b.frequency.exponentialRampToValueAtTime(f0 * 0.8, mid + sw / 2);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, mid - sw / 2);
        g.gain.linearRampToValueAtTime(peak, mid - sw * 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, mid + sw / 2);
        b.connect(g);
        g.connect(out);
      };
      air('bandpass', 900, 3200, 0.7, vol * 0.9);
      air('lowpass', 300, 900, 0.5, vol * 0.6);
      // 紙邊在空氣裡抖動的細碎聲
      for (let i = 0; i < 12; i++) {
        const tt = mid - sw * 0.4 + r() * sw * 0.8;
        gainAt(tt, vol * 0.18 * (0.5 + r() * 0.5), 0.002, 0.02 + r() * 0.03, filter('bandpass', 4000 + r() * 3000, 1.5, noiseSrc(tt, 0.06)));
      }
      // 落下：一聲軟軟的「啪」
      const land = t + dur * 0.95;
      gainAt(land, vol * 0.8, 0.003, 0.09, filter('bandpass', 650, 0.8, noiseSrc(land, 0.14)));
      gainAt(land, vol * 0.3, 0.002, 0.05, filter('highpass', 2500, 0.7, noiseSrc(land, 0.07)));
    },
    thud(t, { vol = 0.6, pitch = 1 } = {}) {
      gainAt(t, vol, 0.003, 0.22, osc('sine', t, 140 * pitch, 48 * pitch, 0.2));
      gainAt(t, vol * 0.4, 0.002, 0.04, filter('lowpass', 1800, 0.7, noiseSrc(t, 0.06)));
    },
    boing(t, { dur = 1.2, up = true, vol = 0.32 } = {}) {
      const o = osc('triangle', t, up ? 180 : 900, up ? 900 : 160, dur);
      const lfo = osc('sine', t, 9, 9, dur), depth = ctx.createGain();
      depth.gain.value = 18;
      lfo.connect(depth);
      depth.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.05);
      g.gain.setValueAtTime(vol, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g);
      g.connect(out);
    },
    clink(t, { vol = 0.25 } = {}) {
      for (const [f, a] of [[2093, 1], [3140, 0.6], [4610, 0.4], [6200, 0.2]]) gainAt(t, vol * a, 0.002, 0.5, osc('sine', t, f, f, 0.55));
    },
    tick(t, { vol = 0.18, f = 3200 } = {}) {
      gainAt(t, vol, 0.001, 0.025, filter('bandpass', f, 3, noiseSrc(t, 0.04)));
    },
    clank(t, { vol = 0.3 } = {}) {
      for (const f of [820, 1370, 2210]) gainAt(t, vol / 2, 0.002, 0.3, osc('square', t, f, f * 0.98, 0.3));
      gainAt(t, vol, 0.002, 0.05, filter('highpass', 2500, 0.7, noiseSrc(t, 0.08)));
    },
    shimmer(t, { vol = 0.14, notes = [1046.5, 1318.5, 1568, 2093] } = {}) {
      notes.forEach((f, i) => gainAt(t + i * 0.09, vol, 0.004, 0.9, osc('sine', t + i * 0.09, f, f, 1.0)));
    },
    fanfare(t, { vol = 0.16, short = false } = {}) {
      // 皇后的小號：三個方波音，經過低通讓它不刺耳
      const seq = short ? [[0, 523.3, 0.22], [0.24, 784, 0.4]] : [[0, 523.3, 0.16], [0.18, 659.3, 0.16], [0.36, 784, 0.55]];
      for (const [dt, f, d] of seq) {
        const lp = filter('lowpass', 1800, 0.8, osc('sawtooth', t + dt, f, f, d));
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + dt);
        g.gain.linearRampToValueAtTime(vol, t + dt + 0.03);
        g.gain.setValueAtTime(vol, t + dt + d - 0.05);
        g.gain.linearRampToValueAtTime(0, t + dt + d);
        lp.connect(g);
        g.connect(out);
      }
    },
    vanish(t, { vol = 0.22 } = {}) {
      const o = osc('sine', t, 1100, 220, 0.5), trem = osc('sine', t, 22, 22, 0.5), d = ctx.createGain();
      d.gain.value = 0.5;
      const g = gainAt(t, vol, 0.01, 0.5, o);
      trem.connect(d);
      d.connect(g.gain);
    },
    splash(t, { vol = 0.22 } = {}) {
      gainAt(t, vol, 0.01, 0.35, filter('bandpass', 900 + r() * 400, 0.9, noiseSrc(t, 0.45)));
    },
    water(t0, t1, { vol = 0.07 } = {}) {
      const lp = filter('lowpass', 520, 0.6, noiseSrc(t0, t1 - t0));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 1);
      g.gain.setValueAtTime(vol, t1 - 1);
      g.gain.linearRampToValueAtTime(0, t1);
      lp.connect(g);
      g.connect(out);
    },
  };
}

// 環境底音：兩個低音加一點被濾掉的噪音，講話時自動壓低
function ambience(ctx, out, noise, duration, cues) {
  const g = ctx.createGain();
  g.gain.value = 0.06;
  g.connect(out);
  for (const [f, a] of [[98, 0.5], [146.8, 0.35], [196, 0.18]]) {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.value = f;
    og.gain.value = a;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07 + f / 4000;
    lg.gain.value = a * 0.35;
    lfo.connect(lg);
    lg.connect(og.gain);
    o.connect(og);
    og.connect(g);
    o.start(0); lfo.start(0);
    o.stop(duration); lfo.stop(duration);
  }
  const n = ctx.createBufferSource();
  n.buffer = noise;
  n.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 300;
  const ng = ctx.createGain();
  ng.gain.value = 0.25;
  n.connect(lp); lp.connect(ng); ng.connect(g);
  n.start(0); n.stop(duration);
  for (const c of cues) {
    g.gain.setTargetAtTime(0.035, c.start - 0.15, 0.12);
    g.gain.setTargetAtTime(0.06, c.end + 0.1, 0.4);
  }
  g.gain.setValueAtTime(0.06, 0);
}

export async function renderSoundtrack({ duration, cues, sfx, base, music }) {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * SR), SR);
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -14;
  master.ratio.value = 4;
  // 最後一道限幅：好幾個音效疊在口白上時也不會爆
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  const noise = makeNoise(ctx);

  const fx = ctx.createGain();
  fx.gain.value = 0.55;
  fx.connect(master);
  const v = voice(ctx, fx, noise, rng(11));
  for (const e of sfx) {
    if (e.name === 'water') v.water(e.t, Math.min(duration, e.t + (e.opts.len ?? 4)), e.opts);
    else v[e.name](e.t, e.opts);
  }
  // 背景音樂（tools/music.py 產生）：講話時壓低、句子之間回來；沒有音樂檔就用合成的環境底音
  const score = music && await fetch(music).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => b && ctx.decodeAudioData(b)).catch(() => null);
  if (score) {
    const mg = ctx.createGain();
    const up = 0.42, down = 0.16;
    mg.gain.setValueAtTime(up, 0);
    for (const c of cues) {
      mg.gain.setTargetAtTime(down, c.start - 0.25, 0.15);
      mg.gain.setTargetAtTime(up, c.end + 0.15, 0.5);
    }
    mg.connect(master);
    const src = ctx.createBufferSource();
    src.buffer = score;
    src.connect(mg);
    src.start(0);
  } else {
    ambience(ctx, master, noise, duration, cues);
  }

  // 口白：每句一個音檔
  const decoded = await Promise.all(cues.map(async (c) => {
    const res = await fetch(base + c.file);
    return ctx.decodeAudioData(await res.arrayBuffer());
  }));
  const vo = ctx.createGain();
  vo.gain.value = 1.0;
  vo.connect(master);
  cues.forEach((c, i) => {
    const s = ctx.createBufferSource();
    s.buffer = decoded[i];
    s.connect(vo);
    s.start(c.start);
  });
  return ctx.startRendering();
}

// AudioBuffer 的一段 → 16-bit 立體聲 WAV
export function wav(buffer, t0, t1) {
  const a = Math.max(0, Math.floor(t0 * SR)), b = Math.min(buffer.length, Math.ceil(t1 * SR)), n = b - a;
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, SR, true); out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true);
  str(36, 'data'); out.setUint32(40, n * 4, true);
  const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[a + i])) * 0x7fff, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[a + i])) * 0x7fff, true);
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
