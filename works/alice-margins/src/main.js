// 頁緣仙境：Three.js 畫面 + 一條暫停的 GSAP 主 timeline。
// 畫面只由「第幾格」決定：frame → seek(time) → render，所以可以拖曳、也可以逐格輸出成 PNG 序列。
import * as THREE from 'three';
import gsap from 'gsap';
import { zipSync } from 'fflate';
import FILM from './scenes.json';
import { C, WIND } from './kit.js';
import { buildFilm } from './scenes.js';
import { placeNarration, renderSoundtrack, wav } from './audio.js';

gsap.defaults({ lazy: false });

const FPS = FILM.fps;
const OUT_W = 1920, OUT_H = 1080;
const canvas = document.getElementById('film');
const $ = (id) => document.getElementById(id);

// 等黑體字載入後才畫書頁（canvas 文字不會自己等字體）
async function start() {
  await Promise.all([document.fonts.load('96px "UnifrakturMaguntia"'), document.fonts.ready]);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = true;

  const main = new THREE.Scene();
  main.background = new THREE.Color(C.bg);
  const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 100);
  camera.position.z = 50;

  const tl = gsap.timeline({ paused: true });
  const sfx = [];
  const scenes = buildFilm(main, tl, FILM.scenes, sfx);
  const DURATION = scenes.at(-1).end;
  // 2D 插圖的素材要先載完
  await Promise.all(scenes.flatMap((s) => s.illus.map((il) => il.ready)).filter(Boolean));
  const FRAMES = Math.round(DURATION * FPS);
  tl.set({}, {}, DURATION);

  // ---------- 後製：暗角、紙紋、逐格跳動的顆粒、場景間淡入淡出 ----------
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: rt.texture }, uTime: { value: 0 }, uGrain: { value: 0 }, uFade: { value: 1 },
      uRes: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tScene; uniform float uTime, uGrain, uFade; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 c = texture2D(tScene, vUv).rgb;
        vec2 d = vUv - 0.5; d.x *= uRes.x / uRes.y;
        c *= mix(0.5, 1.0, smoothstep(1.05, 0.15, length(d)));
        vec2 q = vUv * vec2(uRes.x / uRes.y, 1.0);
        c *= 1.0 + ((vnoise(q * 4.0) * 0.6 + vnoise(q * 11.0) * 0.4) - 0.5) * 0.07 * uGrain;
        // 顆粒以 1080p 為準，輸出和預覽的顆粒大小一致
        vec2 gp = floor(vUv * vec2(1920.0, 1080.0) / 1.6);
        c += (hash(gp + floor(uTime * 24.0) * vec2(17.0, 31.0)) - 0.5) * 0.055 * uGrain;
        c = mix(vec3(0.075, 0.058, 0.058), c, uFade);
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---------- 口白與字幕 ----------
  // 有 narration.json（tools/narrate.py 產生）就照每句實際長度排；沒有就依字數估
  const VO = './narration/';
  let cues = [];
  try {
    const res = await fetch(VO + 'narration.json');
    if (res.ok) cues = placeNarration(scenes, (await res.json()).clips);
  } catch { /* 沒有配音檔時退回估計值 */ }
  if (!cues.length) for (const s of scenes) {
    const parts = s.narration.split(/(?<=[.!?:;])\s+/);
    const total = parts.reduce((a, p) => a + p.length, 0);
    let t = s.start + 0.4;
    const span = s.duration - 0.9;
    for (const p of parts) {
      const d = (span * p.length) / total;
      cues.push({ start: t, end: t + d, text: p, scene: s.id });
      t += d;
    }
  }
  // 中文字幕：scenes.json 的 narration_zh 和英文逐句對應
  for (const s of scenes) cues.filter((c) => c.scene === s.id).forEach((c, i) => { c.zh = s.narration_zh?.[i] ?? ''; });

  // ---------- 畫一格 ----------
  const flags = { twos: true, grain: false, sound: true };   // 紙紋和顆粒預設關掉，可以用「顆粒」按鈕打開
  let subs = 'both'; // en / zh / both / off
  const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
  const timeOf = (f) => (flags.twos ? Math.floor(f / 2) * 2 : f) / FPS;
  const sceneAt = (t) => scenes.find((s) => t < s.end) || scenes.at(-1);

  function renderFrame(f) {
    const t = timeOf(f);
    tl.seek(Math.min(t, DURATION - 1e-4), false);
    WIND.value = t;
    const active = sceneAt(t);
    for (const s of scenes) s.root.visible = s === active;
    renderer.setClearColor(0x000000, 0);
    for (const il of active.illus) {
      if (il.draw) { il.draw(t - active.start); continue; }
      renderer.setRenderTarget(il.rt);
      renderer.clear();
      renderer.render(il.scene, il.camera);
    }
    renderer.setRenderTarget(rt);
    renderer.render(main, camera);
    renderer.setRenderTarget(null);
    post.uniforms.uTime.value = t;
    post.uniforms.uGrain.value = flags.grain ? 1 : 0;
    post.uniforms.uFade.value = smooth((t - active.start) / 0.45) * smooth((active.end - t) / 0.45);
    renderer.render(postScene, postCam);
    return { t, active };
  }

  function setDrawSize(w, h, pr) {
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    rt.setSize(Math.round(w * pr), Math.round(h * pr));
    post.uniforms.uRes.value.set(w * pr, h * pr);
  }

  // ---------- 版面：畫面維持 16:9 ----------
  const frameBox = $('frame');
  function layout() {
    const vp = $('viewport').getBoundingClientRect();
    const w = Math.max(160, Math.min(vp.width - 32, ((vp.height - 32) * 16) / 9));
    const h = (w * 9) / 16;
    frameBox.style.width = `${w}px`;
    frameBox.style.height = `${h}px`;
    frameBox.style.setProperty('--fw', `${w}px`);
    setDrawSize(w, h, Math.min(devicePixelRatio || 1, 2));
    draw();
  }

  // ---------- 播放 ----------
  let frame = 0, playing = false, clock = 0, last = 0;
  const slider = $('scrub'), sceneSel = $('scene');
  slider.max = FRAMES - 1;
  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  scenes.forEach((s, i) => sceneSel.add(new Option(`${i + 1}. ${s.name}`, s.id)));

  function draw() {
    const { t, active } = renderFrame(frame);
    slider.value = frame;
    $('time').textContent = `${fmt(frame / FPS)} / ${fmt(DURATION)}`;
    $('frame-no').textContent = `#${String(frame).padStart(4, '0')}`;
    if (sceneSel.value !== active.id) sceneSel.value = active.id;
    const cue = cues.find((c) => t >= c.start && t < c.end);
    const sub = $('subtitle');
    const lines = !cue || subs === 'off' ? [] : subs === 'en' ? [cue.text] : subs === 'zh' ? [cue.zh] : [cue.zh, cue.text];
    sub.replaceChildren(...lines.filter(Boolean).map((l, i) => Object.assign(document.createElement('span'), { textContent: l, className: i ? 'en' : '' })));
    sub.hidden = !sub.childElementCount;
    sub.dataset.mode = subs;
  }
  // ---------- 聲音：整條音軌先算好，播放時從目前秒數接著播 ----------
  let track = null, actx = null, src = null;
  const trackReady = cues[0]?.file
    ? (($('status').textContent = '音軌準備中…'),
      renderSoundtrack({ duration: DURATION, cues, sfx, base: VO, music: './music/score.m4a' })
        .then((b) => { track = b; $('status').textContent = ''; if (playing) startAudio(); })
        .catch((err) => { $('status').textContent = `音軌載入失敗：${err.message}`; }))
    : Promise.resolve();
  function stopAudio() { if (src) { src.onended = null; src.stop(); src = null; } }
  function startAudio() {
    stopAudio();
    if (!track || !flags.sound) return;
    actx ??= new AudioContext({ sampleRate: track.sampleRate });
    actx.resume();
    src = actx.createBufferSource();
    src.buffer = track;
    src.connect(actx.destination);
    src.start(0, clock);
    // 畫面跟著聲音的時鐘走，才不會越播越不同步
    audioZero = actx.currentTime - clock;
  }
  let audioZero = 0;

  function go(f) { frame = Math.max(0, Math.min(FRAMES - 1, f)); clock = frame / FPS; draw(); if (playing) startAudio(); }
  function tick(now) {
    if (!playing) return;
    if (src) clock = actx.currentTime - audioZero;
    else clock += Math.min(0.1, (now - last) / 1000);
    last = now;
    const f = Math.floor(clock * FPS);
    if (f >= FRAMES - 1) { setPlaying(false); go(FRAMES - 1); return; }
    if (f !== frame) { frame = f; draw(); }
    requestAnimationFrame(tick);
  }
  function setPlaying(p) {
    playing = p;
    $('play').setAttribute('aria-label', p ? '暫停' : '播放');
    $('play').dataset.state = p ? 'pause' : 'play';
    if (p) {
      if (frame >= FRAMES - 1) go(0);
      clock = frame / FPS;
      last = performance.now();
      startAudio();
      requestAnimationFrame(tick);
    } else stopAudio();
  }

  $('play').addEventListener('click', () => setPlaying(!playing));
  slider.addEventListener('input', () => go(+slider.value));
  sceneSel.addEventListener('change', () => go(Math.round(scenes.find((s) => s.id === sceneSel.value).start * FPS)));
  $('subs').addEventListener('change', (e) => { subs = e.target.value; draw(); });
  for (const [id, key] of [['t-twos', 'twos'], ['t-grain', 'grain'], ['t-sound', 'sound']]) {
    const b = $(id);
    b.addEventListener('click', () => {
      flags[key] = !flags[key];
      b.setAttribute('aria-pressed', String(flags[key]));
      if (key === 'sound' && playing) startAudio();
      draw();
    });
  }
  addEventListener('keydown', (e) => {
    if (e.target.closest('select, input')) return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    if (e.code === 'ArrowRight') { setPlaying(false); go(frame + (e.shiftKey ? FPS : 1)); }
    if (e.code === 'ArrowLeft') { setPlaying(false); go(frame - (e.shiftKey ? FPS : 1)); }
  });
  addEventListener('resize', layout);

  // ---------- 輸出 PNG 序列 + 字幕檔 ----------
  const srtTime = (t) => {
    const ms = Math.max(0, Math.round(t * 1000));
    const p = (n, l = 2) => String(n).padStart(l, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  function srt(t0, t1, key = 'text') {
    return cues.filter((c) => c.end > t0 && c.start < t1)
      .map((c, i) => `${i + 1}\n${srtTime(Math.max(c.start, t0) - t0)} --> ${srtTime(Math.min(c.end, t1) - t0)}\n${c[key]}\n`)
      .join('\n');
  }
  const toBlob = () => new Promise((r) => canvas.toBlob(r, 'image/png'));
  let exporting = false;

  async function exportRange(f0, f1, label) {
    if (exporting) return;
    let dir = null;
    const files = {};
    if ('showDirectoryPicker' in window) {
      try { dir = await window.showDirectoryPicker({ id: 'alice-margins-frames', mode: 'readwrite' }); }
      catch { return; }
    }
    exporting = true;
    setPlaying(false);
    document.body.classList.add('exporting');
    const status = $('status');
    const write = async (name, data) => {
      if (dir) {
        const fh = await dir.getFileHandle(name, { create: true });
        const ws = await fh.createWritable();
        await ws.write(data);
        await ws.close();
      } else {
        files[name] = new Uint8Array(await new Blob([data]).arrayBuffer());
      }
    };
    try {
      setDrawSize(OUT_W, OUT_H, 1);
      for (let f = f0; f < f1; f++) {
        renderFrame(f);
        await write(`frame_${String(f - f0).padStart(5, '0')}.png`, await toBlob());
        status.textContent = `輸出中 ${f - f0 + 1} / ${f1 - f0}`;
      }
      await write('narration.en.srt', srt(f0 / FPS, f1 / FPS));
      await write('narration.zh-TW.srt', srt(f0 / FPS, f1 / FPS, 'zh'));
      status.textContent = '輸出音軌…';
      await trackReady;
      if (track) await write('soundtrack.wav', wav(track, f0 / FPS, f1 / FPS));
      if (!dir) {
        const zip = zipSync(files, { level: 0 });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
        a.download = `alice-margins-${label}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      }
      status.textContent = `已輸出 ${f1 - f0} 格`;
    } catch (err) {
      status.textContent = `輸出失敗：${err.message}`;
    } finally {
      exporting = false;
      document.body.classList.remove('exporting');
      layout();
    }
  }
  $('export-scene').addEventListener('click', () => {
    const s = sceneAt(timeOf(frame));
    exportRange(Math.round(s.start * FPS), Math.round(s.end * FPS), s.id);
  });
  $('export-all').addEventListener('click', () => exportRange(0, FRAMES, 'full'));

  // ---------- 說明視窗 ----------
  const info = $('info');
  const openInfo = (o) => { info.classList.toggle('open', o); info.setAttribute('aria-hidden', String(!o)); };
  $('info-btn').addEventListener('click', () => openInfo(true));
  $('info-close').addEventListener('click', () => openInfo(false));
  info.addEventListener('click', (e) => { if (e.target === info) openInfo(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') openInfo(false); });

  // 給自動化錄影用（例如 Puppeteer 逐格截圖）
  window.__film = { fps: FPS, frames: FRAMES, duration: DURATION, render: (f) => { renderFrame(f); return canvas; }, setSize: setDrawSize, srt: (key) => srt(0, DURATION, key), cues, sfx, soundtrack: async (t0 = 0, t1 = DURATION) => { await trackReady; return track && wav(track, t0, t1); }, scenes: scenes.map(({ id, start, end }) => ({ id, start, end })) };

  const startAt = scenes.find((s) => s.id === location.hash.slice(1));
  layout();
  if (startAt) go(Math.round(startAt.start * FPS));
  document.body.classList.add('ready');
}
start();
