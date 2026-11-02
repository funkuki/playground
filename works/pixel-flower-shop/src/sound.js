import * as THREE from 'three';
import { gust as gustAt } from './wind.js';

// 環境音：微風（只當背景襯底）、麻雀叫聲
// 全部用 Web Audio 即時合成，不用外部音檔。瀏覽器規定要使用者點過才能出聲，所以預設關閉。

const _p = new THREE.Vector3();

export function createSound(camera) {
  let ctx = null;
  let master, wind, leaves, windFilter, noise;
  let on = false;

  // 4 秒白噪音，循環使用
  function makeNoise() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function noiseSource() {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.loopStart = Math.random() * 3; // 每條從不同位置開始，避免聽起來一樣
    src.start(0, src.loopStart);
    return src;
  }

  function init() {
    ctx = new AudioContext();
    noise = makeNoise();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // ---- 微風：帶通濾波的噪音，頻率和音量隨陣風慢慢起伏 ----
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 400;
    windFilter.Q.value = 0.7;
    wind = ctx.createGain();
    wind.gain.value = 0;
    noiseSource().connect(windFilter).connect(wind).connect(master);
    // 樹葉沙沙聲：高頻噪音，陣風大時才明顯
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    leaves = ctx.createGain();
    leaves.gain.value = 0;
    noiseSource().connect(hp).connect(leaves).connect(master);
  }


  // 世界座標 → 左右聲道位置與是否在畫面內
  function placement(pos) {
    _p.copy(pos).project(camera);
    const inView = Math.abs(_p.x) < 1.1 && Math.abs(_p.y) < 1.1;
    return { pan: Math.max(-1, Math.min(1, _p.x * 0.8)), vol: inView ? 1 : 0.35 };
  }
  function panner(pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(master);
    return p;
  }

  // 一聲「啾」：高音快速往下滑，帶一點泛音
  function chirpNote(at, out, vol) {
    const f0 = 3800 + Math.random() * 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.07 + Math.random() * 0.03);
    g.connect(out);
    for (const [mult, amp] of [[1, 1], [2, 0.18]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0 * 1.15 * mult, at);
      o.frequency.linearRampToValueAtTime(f0 * 1.3 * mult, at + 0.015);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.7 * mult, at + 0.08);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + 0.12);
    }
  }

  return {
    get on() { return on; },
    toggle() {
      if (!ctx) init();
      on = !on;
      if (on) ctx.resume();
      master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.3);
      return on;
    },
    // 分頁切到背景時暫停，回來再繼續
    setHidden(hidden) {
      if (!ctx || !on) return;
      hidden ? ctx.suspend() : ctx.resume();
    },
    // 麻雀叫：連續 1～4 聲「啾啾」
    chirp(pos) {
      if (!on) return;
      const { pan, vol } = placement(pos);
      const out = panner(pan);
      const n = 1 + Math.floor(Math.random() * 4);
      let at = ctx.currentTime + 0.01;
      for (let i = 0; i < n; i++) {
        chirpNote(at, out, 0.09 * vol);
        at += 0.11 + Math.random() * 0.1;
      }
    },
    // 每幀更新：陣風
    update(time) {
      if (!on) return;
      const now = ctx.currentTime;
      // 陣風曲線跟樹葉晃動同一條；音量壓低，只當環境底噪
      const gust = gustAt(time);
      wind.gain.setTargetAtTime(0.004 + gust * 0.01, now, 0.6);
      windFilter.frequency.setTargetAtTime(380 + gust * 420, now, 0.5); // 下限拉高，避免低頻嗡嗡聲
      leaves.gain.setTargetAtTime(gust ** 3 * 0.004 * (0.7 + 0.3 * Math.sin(time * 7)), now, 0.15);
    },
  };
}
