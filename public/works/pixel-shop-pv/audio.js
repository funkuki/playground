/* Cosy 8-bit BGM + SFX for the promo video, synthesised with Web Audio (no audio files).
   120 BPM, 16 bars = 32 s. 2 pulse channels, 1 triangle bass, 1 noise channel, plus a sine "bell". */
(function () {
  'use strict';
  var BPM = 120, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4;
  var A = { ctx: null, t0: 0, master: null };
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function hz(n) {
    var m = /^([A-G])(#?)(\d)$/.exec(n);
    var midi = NOTE[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function pulse(ctx, duty) {
    var n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (var i = 1; i < n; i++) re[i] = 2 * Math.sin(i * Math.PI * duty) / (i * Math.PI);
    return ctx.createPeriodicWave(re, im);
  }
  var noiseBuf;
  function tone(wave, f, t, dur, vol, f2) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    if (typeof wave === 'string') o.type = wave; else o.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.02);
  }
  function bell(f, t, dur, vol) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, type, freq, f2) {
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + dur + 0.02);
  }

  var CH = {
    C: ['C3', 'G4', 'C5', 'E5'], Am: ['A2', 'A4', 'C5', 'E5'], F: ['F2', 'A4', 'C5', 'F5'],
    G: ['G2', 'B4', 'D5', 'G5'], Em: ['E3', 'G4', 'B4', 'E5']
  };
  // 8 eighth-notes per bar; '-' holds, '.' rests
  var A1 = ['C', 'E5 - G5 - C6 - G5 E5'], A2 = ['Am', 'A5 - E5 - C5 E5 A5 -'], A3 = ['F', 'F5 - A5 - C6 - A5 F5'], A4 = ['G', 'G5 - B5 - D6 B5 G5 -'];
  var B1 = ['F', 'A5 C6 A5 F5 . A5 - C6'], B2 = ['G', 'B5 - G5 - D5 G5 B5 -'], B3 = ['Em', 'G5 - E5 - B4 E5 G5 -'], B4 = ['Am', 'A5 - - E5 C6 - A5 -'];
  var SONG = [
    ['C', '. . . . . . . .', 'chime'], ['C', '. . . . . . G5 B5', 'chime2'],     // 0–4 s: school bell
    A1.concat('soft'), A2.concat('soft'),                                           // 4–8 map + bookstore being furnished
    A3.concat('full'), A4.concat('full'),                                           // 8–12
    B1.concat('full'), B2.concat('full'),                                           // 12–16
    B3.concat('full'), B4.concat('full'),                                           // 16–20
    ['F', 'F5 A5 C6 F6 E6 C6 A5 F5', 'full'],                                       // 20–22 seasons
    ['G', 'G5 . G5 . B5 . D6 .', 'build'],                                          // 22–24 roll call
    ['C', 'E6 - G6 - C6 - G5 E6', 'xmas'], ['Am', 'A5 - E6 - C6 E6 A6 -', 'xmas'],  // 24–28 market
    ['F', 'F5 . A5 C6 - - D6 B5', 'soft'],                                          // 28–30 logo
    ['C', 'C6 . . . E6 - - -', 'end']                                               // 30–32 tagline
  ];

  var TS = 3;   // title screen before the music starts (same value as in pv.js)
  function schedule(t0) {
    (function () {   // title screen: cursor moves twice, then confirm
      var arp0 = pulse(A.ctx, 0.125), lead0 = pulse(A.ctx, 0.25);
      ['G4', 'C5', 'E5', 'G5'].forEach(function (n, k) { bell(hz(n), t0 + 0.45 + k * 0.06, 0.9, 0.09); });
      tone(arp0, 660, t0 + 0.9, 0.05, 0.07); tone(arp0, 660, t0 + 1.5, 0.05, 0.07);
      ['C6', 'E6', 'G6'].forEach(function (n, k) { tone(lead0, hz(n), t0 + 2.1 + k * 0.06, k === 2 ? 0.3 : 0.07, 0.08); });
    })();
    t0 += TS;
    var lead = pulse(A.ctx, 0.25), arp = pulse(A.ctx, 0.125);
    SONG.forEach(function (bar, bi) {
      var tb = t0 + bi * BAR, ch = CH[bar[0]], mode = bar[2];
      var m = bar[1].split(' ');
      for (var i = 0; i < 8; i++) {
        if (m[i] === '.' || m[i] === '-') continue;
        var len = 1; while (i + len < 8 && m[i + len] === '-') len++;
        tone(lead, hz(m[i]), tb + i * STEP * 2, len * STEP * 2 * 0.9, mode === 'soft' ? 0.07 : 0.085);
        if (mode === 'xmas') bell(hz(m[i]) * 2, tb + i * STEP * 2, 0.5, 0.05);
      }
      if (mode === 'chime' || mode === 'chime2') {             // Westminster-style school chime (public domain)
        (mode === 'chime' ? ['E5', 'C5', 'D5', 'G4'] : ['G4', 'D5', 'E5', 'C5']).forEach(function (n, k) {
          if (mode === 'chime2' && k === 3) { bell(hz(n), tb + k * BEAT, 0.5, 0.2); return; }
          bell(hz(n), tb + k * BEAT, 1.1, 0.2); bell(hz(n) * 2, tb + k * BEAT, 0.6, 0.05);
        });
        return;
      }
      if (mode === 'end') {
        ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'].forEach(function (n, k) { tone(arp, hz(n), tb + k * 0.045, 0.5, 0.045); bell(hz(n) * 2, tb + k * 0.045, 1.2, 0.03); });
        tone('triangle', hz('C3'), tb, 0.4, 0.3); tone('triangle', hz('C3'), tb + BEAT, 1.2, 0.3);
        noise(tb, 0.12, 0.2, 'highpass', 1800); noise(tb + BEAT, 0.5, 0.15, 'highpass', 5000);
        return;
      }
      for (var s = 0; s < 16; s++) {
        var ts = tb + s * STEP;
        // arpeggio on 8ths (16ths in the busy bars)
        if (mode !== 'build' && (s % 2 === 0 || mode === 'xmas')) tone(arp, hz(ch[1 + ((s >> (mode === 'xmas' ? 0 : 1)) % 3)]), ts, STEP * 1.4, mode === 'soft' ? 0.022 : 0.03);
        // bass: root, then a bounce on the off-beat
        if (s % 4 === 0) tone('triangle', hz(ch[0]) * (mode === 'build' ? 1 : 1), ts, STEP * 2.6, 0.26);
        if (s % 4 === 2 && mode !== 'soft') tone('triangle', hz(ch[0]) * 2, ts, STEP * 1.5, 0.2);
        // drums
        if (mode === 'full' || mode === 'xmas') {
          if (s % 8 === 0 || s === 10) tone('sine', 150, ts, 0.09, 0.4, 45);
          if (s % 8 === 4) noise(ts, 0.1, 0.15, 'bandpass', 1900);
          if (s % 2 === 0) noise(ts, 0.03, s % 4 === 2 ? 0.07 : 0.04, 'highpass', 7000);
          if (mode === 'xmas' && s % 4 === 0) noise(ts, 0.05, 0.05, 'highpass', 9000);     // sleigh-bell tick
        } else if (mode === 'soft') { if (s % 4 === 2) noise(ts, 0.03, 0.05, 'highpass', 7000); }
        else if (mode === 'build') { if (s % 4 === 0) { tone('sine', 150, ts, 0.09, 0.4, 45); noise(ts, 0.08, 0.14, 'bandpass', 1900); } if (s >= 12) noise(ts, 0.05, 0.14, 'bandpass', 1900); }
      }
    });
    // ----- sound effects, timed to the picture -----
    function at(t) { return t0 + t; }
    function blip(t, a, b, v) { tone(arp, a, at(t), 0.09, v || 0.08, b); }
    function sparkle(t) { ['E6', 'G6', 'C7', 'E7'].forEach(function (n, k) { tone(lead, hz(n), at(t) + k * 0.05, 0.12, 0.05); }); }
    function whoosh(t) { noise(at(t), 0.22, 0.12, 'bandpass', 500, 5000); }
    function thump(t) { tone('sine', 110, at(t), 0.1, 0.38, 50); }
    function pop(t, k) { tone('sine', 420 + (k || 0) * 60, at(t), 0.07, 0.3, 160); noise(at(t), 0.04, 0.08, 'highpass', 3000); }
    function coin(t) { tone(lead, hz('B5'), at(t), 0.05, 0.06); tone(lead, hz('E6'), at(t) + 0.05, 0.16, 0.06); }
    function talk(t, n) { for (var k = 0; k < n; k++) tone(arp, 620 + (k % 3) * 70, at(t) + k * 0.07, 0.03, 0.035); }
    function fanfare(t) { ['C5', 'E5', 'G5', 'C6'].forEach(function (n, k) { tone(lead, hz(n), at(t) + k * 0.07, k === 3 ? 0.3 : 0.08, 0.08); }); }
    talk(1.4, 12); blip(2.2, 500, 1000); [3.0, 3.1, 3.2, 3.3, 3.4].forEach(function (t) { noise(at(t), 0.05, 0.08, 'highpass', 4000); });
    whoosh(3.8); noise(at(4.1), 0.6, 0.06, 'bandpass', 700, 300); thump(4.6); thump(4.8);
    [[5, 4, 0.3], [10, 4, 0.3], [15, 8, 0.17]].forEach(function (c) {
      for (var k = 0; k < c[1]; k++) pop(c[0] + 0.25 + k * c[2], k);
      blip(c[0] + 1.6, 700, 1400, 0.07);                        // open!
      talk(c[0] + 2.0, 12); thump(c[0] + 2.5);
      [3.1, 3.4, 3.7].forEach(function (a) { coin(c[0] + a + 0.12); });
      whoosh(c[0] + 3.9); fanfare(c[0] + 4.05); sparkle(c[0] + 4.5);
    });
    [20.5, 21.0, 21.5].forEach(function (t, k) { pop(t, k * 2); whoosh(t - 0.05); }); sparkle(21.55);
    ['C5', 'E5', 'G5', 'C6', 'E6'].forEach(function (n, k) { var t = 22.0 + k * BEAT / 2; tone(lead, hz(n), at(t), 0.14, 0.09); thump(t); });
    talk(24.6, 9);
    for (var k = 0; k < 12; k += 2) coin(25.2 + k * 0.13);
    whoosh(25.9); fanfare(26.0); sparkle(26.2); for (k = 0; k < 6; k++) coin(26.3 + k * 0.16);
    [27.3, 27.5, 27.7].forEach(thump);
    whoosh(28.4); thump(28.7); sparkle(28.75);
    whoosh(29.95); sparkle(30.5);
  }

  function setup(ctx) {
    A.ctx = ctx; A.master = ctx.createGain(); A.master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    A.master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  A.start = function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (A.ctx) { try { A.ctx.close(); } catch (e) {} }
    setup(new AC());
    A.t0 = A.ctx.currentTime + 0.1;
    schedule(A.t0);
  };
  /* offline render of the same score, for exporting a video: resolves to a Float32Array (mono, 48 kHz) */
  A.renderOffline = function (seconds) {
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var keep = { ctx: A.ctx, master: A.master, t0: A.t0 };
    var oc = new OC(1, Math.ceil(seconds * 48000), 48000);
    setup(oc); schedule(0);
    var pr = oc.startRendering();
    A.ctx = keep.ctx; A.master = keep.master; A.t0 = keep.t0;
    return pr.then(function (buf) { return buf.getChannelData(0); });
  };
  window.PV_AUDIO = A;
})();
