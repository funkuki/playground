/* Promo video for a fictional shop-management game — three.js, 320x180, nearest-neighbour.
   Every frame is a pure function of time t (seconds), so it can be scrubbed and exported frame by frame. */
(function () {
  'use strict';
  var W = 320, H = 180, TS = 3, DUR = 32 + TS, BEAT = 0.5;   // TS = length of the title screen that plays before the main timeline
  var IMG = window.PV_IMG, META = window.PV_META;

  // ---------- renderer ----------
  var canvas = document.getElementById('pv');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);

  var tex = {}, pending = 0;
  Object.keys(IMG).forEach(function (k) {
    pending++;
    var im = new Image();
    im.onload = function () {
      var t = new THREE.Texture(im);
      t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false; t.needsUpdate = true;
      tex[k] = t;
      if (--pending === 0) onReady();
    };
    im.src = IMG[k];
  });

  var VERT = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';
  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D map; uniform vec4 uvr; uniform vec4 tint; uniform vec3 addc; uniform float addAmt;',
    'uniform float clipMode; uniform vec4 clipA; varying vec2 vUv;',
    'void main(){',
    '  float px=floor(gl_FragCoord.x); float py=179.0-floor(gl_FragCoord.y);',
    '  if(clipMode>0.5){',
    '    if(clipMode<2.5){ vec2 q=floor(vec2(px,py)/2.0)*2.0+1.0; float d=distance(q,clipA.xy);',
    '      if(clipMode<1.5){ if(d>clipA.z) discard; } else { if(d<=clipA.z) discard; } }',
    '    else if(clipMode<3.5){ float s=px+(py-90.0)*clipA.z; if(s<clipA.x||s>=clipA.y) discard; }',
    '    else if(clipMode<4.5){ float s=py+(px-160.0)*clipA.z; if(s<clipA.x||s>=clipA.y) discard; }',
    '  }',
    '  vec4 c=texture2D(map, uvr.xy+vUv*uvr.zw);',
    '  if(c.a<0.004) discard;',
    '  vec3 rgb=mix(c.rgb*tint.rgb, addc, addAmt);',
    '  gl_FragColor=vec4(rgb, c.a*tint.a);',
    '}'
  ].join('\n');

  var geo = new THREE.PlaneGeometry(1, 1);
  var pool = [], used = 0;
  function getMesh() {
    if (used < pool.length) return pool[used++];
    var m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        map: { value: null }, uvr: { value: new THREE.Vector4() }, tint: { value: new THREE.Vector4(1, 1, 1, 1) },
        addc: { value: new THREE.Vector3(1, 1, 1) }, addAmt: { value: 0 },
        clipMode: { value: 0 }, clipA: { value: new THREE.Vector4() }
      }
    }));
    m.frustumCulled = false;
    scene.add(m); pool.push(m); used++;
    return m;
  }

  // ---------- draw state ----------
  var cam = { x: 160, y: 90, z: 1 };
  var clip = { mode: 0, a: 0, b: 0, c: 0 };
  function setCam(x, y, z) {
    z = z || 1;
    var hw = W / 2 / z, hh = H / 2 / z;
    cam.x = Math.max(hw, Math.min(W - hw, x)); cam.y = Math.max(hh, Math.min(H - hh, y)); cam.z = z;
  }
  function setClip(mode, a, b, c) { clip.mode = mode || 0; clip.a = a || 0; clip.b = b || 0; clip.c = c || 0; }
  function rgb(hex) {
    if (typeof hex !== 'string') return hex;
    var n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  /* spr(name, src|null, x, y, opts) — x,y = top-left in world px (or screen px when opts.ui) */
  function spr(name, src, x, y, o) {
    o = o || {};
    var t = tex[name]; if (!t) return;
    var iw = t.image.width, ih = t.image.height;
    var sx = 0, sy = 0, sw = iw, sh = ih;
    if (src) { sx = src[0]; sy = src[1]; sw = src[2]; sh = src[3]; }
    var s = o.s || 1, dw = (o.w || sw) * s, dh = (o.h || sh) * s;
    var X = x, Y = y;
    if (!o.ui) { X = (x - cam.x) * cam.z + W / 2; Y = (y - cam.y) * cam.z + H / 2; dw *= cam.z; dh *= cam.z; }
    X = Math.round(X); Y = Math.round(Y); dw = Math.round(dw); dh = Math.round(dh);
    if (X >= W || Y >= H || X + dw <= 0 || Y + dh <= 0 || dw <= 0 || dh <= 0) return;
    var m = getMesh(), u = m.material.uniforms;
    m.visible = true; m.renderOrder = used;
    m.position.set(X + dw / 2, H - (Y + dh / 2), 0); m.scale.set(dw, dh, 1);
    u.map.value = t;
    var u0 = sx / iw, du = sw / iw;
    if (o.flip) { u0 += du; du = -du; }
    u.uvr.value.set(u0, 1 - (sy + sh) / ih, du, sh / ih);
    var c = o.tint ? rgb(o.tint) : [1, 1, 1];
    u.tint.value.set(c[0], c[1], c[2], o.a === undefined ? 1 : o.a);
    var ad = o.add ? rgb(o.add) : [1, 1, 1];
    u.addc.value.set(ad[0], ad[1], ad[2]); u.addAmt.value = o.addAmt || 0;
    u.clipMode.value = clip.mode; u.clipA.value.set(clip.a, clip.b, clip.c, 0);
  }
  function rect(x, y, w, h, color, a, ui) {
    spr('white', null, x, y, { w: w / 2, h: h / 2, s: 2, tint: color, a: a === undefined ? 1 : a, ui: ui !== false });
  }
  function full(color, a) { rect(0, 0, W, H, color, a, true); }

  // ---------- helpers ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function prog(t, t0, t1) { return clamp((t - t0) / (t1 - t0), 0, 1); }
  function easeOut(p) { return 1 - (1 - p) * (1 - p); }
  function backOut(p) { var c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function hopY(t, t0, dur, h) { var p = (t - t0) / dur; return (p <= 0 || p >= 1) ? 0 : -h * 4 * p * (1 - p); }
  function beatBob(t, amt) { var b = (t / BEAT) % 1; return b < 0.5 ? 0 : (amt || 1); }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function dark(hex, f) { var c = rgb(hex); return [c[0] * f, c[1] * f, c[2] * f]; }
  function light(hex, f) { var c = rgb(hex); return [c[0] + (1 - c[0]) * f, c[1] + (1 - c[1]) * f, c[2] + (1 - c[2]) * f]; }

  function gframe(g, name) { return META.girls[g].frames[name]; }
  function animFrame(g, anim, time, ms) {
    var a = META.girls[g].anims[anim], n = a.frames.length;
    var d = ms || a.ms || 100;
    return a.frames[Math.floor(Math.max(0, time) * 1000 / d) % n];
  }
  /* girl(g, frame, x, y, opts) — x,y = feet anchor (cell 32,62) */
  function girl(g, frame, x, y, o) {
    o = o || {}; var s = o.s || 1;
    spr(g, gframe(g, frame) || gframe(g, 'wave'), x - 32 * s, y - 62 * s, o);
  }
  /* mod(layerName) -> false hides the layer, a number offsets it vertically */
  function drawScene(name, actors, t, mod) {
    var S = META.scenes[name];
    spr(S.bg, null, 0, 0);
    var items = [];
    S.layers.forEach(function (L, i) { items.push({ sy: L.sort_y, k: 0, i: i, L: L }); });
    (actors || []).forEach(function (a, i) { items.push({ sy: a.y, k: 1, i: i, a: a }); });
    items.sort(function (p, q) { return p.sy - q.sy || p.k - q.k || p.i - q.i; });
    items.forEach(function (it) {
      if (it.L) {
        var L = it.L, dy = mod ? mod(L.name) : 0;
        if (dy === false) return;
        if (L.name === 'snowfall_overlay') {
          var off = Math.floor((t * 26) % L.h);
          spr(L.img, null, L.x, L.y + off - L.h); spr(L.img, null, L.x, L.y + off);
        } else spr(L.img, null, L.x, L.y + (dy || 0));
      } else it.a.fn();
    });
  }
  function sparkles(cx, cy, t0, t, color, n, radius, ui) {
    var p = (t - t0) / 0.7; if (p < 0 || p > 1) return;
    n = n || 8; radius = radius || 34;
    for (var i = 0; i < n; i++) {
      var ang = i / n * 6.283 + rnd(i + cx) * 0.8, r = radius * (0.35 + 0.65 * easeOut(p)) * (0.7 + 0.5 * rnd(i * 3 + 1));
      var x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r * 0.8;
      var fr = (Math.floor(t * 12) + i) % 2 ? 'spark_a' : 'spark_b';
      if (p > 0.75 && (Math.floor(t * 30) + i) % 2) continue;
      spr(fr, null, x - 3, y - 3, { tint: i % 3 === 0 ? '#ffffff' : color, ui: !!ui });
    }
  }
  function irisCover(t, t0, color, cx, cy) {
    if (t < t0 - 0.22 || t >= t0) return;
    setClip(1, cx, cy, prog(t, t0 - 0.22, t0) * 380); full(color, 1); setClip(0);
  }
  function irisOpen(t, t0, color, cx, cy) {
    if (t < t0 || t > t0 + 0.32) return;
    setClip(2, cx, cy, prog(t, t0, t0 + 0.32) * 380); full(color, 1); setClip(0);
  }
  function portrait(g, cx, eyeY, s, o) {
    var n = g.slice(5), b = META.portraits[g].bbox;
    o = o || {}; o.s = s; o.ui = true;
    spr('portrait_' + n, null, cx - s * (b[0] + b[2]) / 2, eyeY - s * (b[1] + 41), o);
  }

  // ---------- game-style UI ----------
  var INK = '#4a3038', CREAM = '#fff6e0', FRAME = '#7a4a3a';
  function panel(x, y, w, h, fill, border) {
    rect(x + 1, y + 2, w, h, '#2a1c22', 0.25, true);
    rect(x + 1, y, w - 2, h, border || FRAME, 1, true); rect(x, y + 1, w, h - 2, border || FRAME, 1, true);
    rect(x + 1, y + 1, w - 2, h - 2, fill || CREAM, 1, true);
  }
  function tw(name) { return META.size['t_' + name][0]; }
  function text(name, x, y, color, o) {
    o = o || {}; o.ui = o.ui !== false; o.tint = color || INK;
    var src = null;
    if (o.reveal !== undefined) { var w = Math.min(tw(name), Math.max(0, o.reveal)); if (w <= 0) return; src = [0, 0, w, 13]; }
    spr('t_' + name, src, x, y, o);
  }
  function numW(str) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += META.size['ch_' + (str[i] === '+' ? 'plus' : str[i])][0] + 1;
    return w - 1;
  }
  function num(str, x, y, color, ui) {
    for (var i = 0; i < str.length; i++) {
      var k = 'ch_' + (str[i] === '+' ? 'plus' : str[i]);
      spr(k, null, x, y, { ui: ui !== false, tint: color || INK });
      x += META.size[k][0] + 1;
    }
  }
  /* customer: dir = 'right' | 'left' | 'down' while walking; pose = frame name while standing */
  function cust(i, x, y, walking, t, hop, row, dir, pose) {
    var CF = META.cust.frames, flip = false, fr;
    if (walking) {
      var k = Math.floor(t * 10 + i * 3) % 8;
      if (dir === 'down') fr = 'walk_down_' + k; else { fr = 'walk_right_' + k; flip = dir === 'left'; }
    } else fr = pose || 'idle_down';
    x = Math.round(x);
    spr('cust' + (Math.floor(i) % META.ncust), CF[fr], x - 32, y - 62 + (hop || 0), { flip: flip });
    var w = tw('okyaku') + 8, by = y - 50 - 20 - (row || 0) * 15;
    rect(x - w / 2 + 1, by, w - 2, 15, '#1c1820', 1, false); rect(x - w / 2, by + 1, w, 13, '#1c1820', 1, false);
    rect(x - 2, by + 15, 4, 1, '#1c1820', 1, false); rect(x - 1, by + 16, 2, 1, '#1c1820', 1, false);
    if (row) rect(x - 1, by + 17, 2, (row || 0) * 15 - 2, '#1c1820', 1, false);
    text('okyaku', x - w / 2 + 4, by + 1, '#ffffff', { ui: false });
  }

  // money and popularity are functions of time too
  var EV = [];   // {t, amt}
  function money(t) {
    var m = 0;
    for (var i = 0; i < EV.length; i++) m += EV[i].amt * prog(t, EV[i].t, EV[i].t + 0.3);
    return Math.round(m / 10) * 10;
  }
  var POP_T = [9.2, 14.2, 19.2, 21.6, 26.0];
  var SEASON = { spring: '#f08fb0', summer: '#4fb0a0', autumn: '#e08a3c', winter: '#6f9fd8' };
  function calendar(t) {
    if (t < 10) return ['m4', 'spring']; if (t < 15) return ['m5', 'spring']; if (t < 20.5) return ['m6', 'spring'];
    if (t < 21) return ['m8', 'summer']; if (t < 21.5) return ['m10', 'autumn']; return ['m12', 'winter'];
  }
  function hud(t) {
    if (t < 0.6 || (t >= 22 && t < 24) || t >= 27.85) return;
    var dy = Math.round((1 - backOut(prog(t, t < 22 ? 0.6 : 24.0, (t < 22 ? 0.6 : 24.0) + 0.25))) * -44), i;
    var c = calendar(t), flip = (t >= 20.5 && t < 21.7) ? hopY(t, 20.5 + Math.floor((t - 20.5) / 0.5) * 0.5, 0.2, 4) : 0;
    panel(4, 4 + dy + flip, 64, 17);
    text(c[0], 9, 6 + dy + flip);
    rect(48, 6 + dy + flip, 16, 13, SEASON[c[1]], 1, true);
    text('s_' + c[1], 50, 6 + dy + flip, '#ffffff');
    // money
    var mt = 0; for (i = 0; i < EV.length; i++) if (t >= EV[i].t && t < EV[i].t + 0.3) mt = 1;
    panel(238, 4 + dy - mt, 78, 17);
    spr('coin', null, 243, 8 + dy - mt, { ui: true });
    var s = String(money(t));
    num(s, 311 - numW(s), 6 + dy - mt, INK);
    // popularity hearts
    panel(4, 23 + dy, 92, 15);
    text('ninki', 9, 24 + dy);
    for (i = 0; i < 5; i++) {
      var on = t >= POP_T[i];
      spr('heart', null, 46 + i * 9, 27 + dy + (on ? hopY(t, POP_T[i], 0.25, 5) : 0), { ui: true, tint: on ? '#f0638f' : '#e0d2ba' });
      if (on) sparkles(50 + i * 9, 31 + dy, POP_T[i], t, '#f0638f', 5, 12, true);
    }
  }
  function tag(t, t0, name, fill, ink) {
    var w = tw(name) + 14, x = 160 - Math.round(w / 2);
    var y = 4 + Math.round((1 - backOut(prog(t, t0, t0 + 0.18))) * -24);
    panel(x, y, w, 17, fill);
    text(name, x + 7, y + 2, ink || INK);
  }
  /* speech bubble above a world position */
  function bubble(t, t0, t1, name, wx, wy) {
    if (t < t0 || t >= t1) return;
    var w = tw(name) + 14, sx = (wx - cam.x) * cam.z + W / 2, sy = (wy - cam.y) * cam.z + H / 2;
    var x = clamp(Math.round(sx - w / 2), 4, W - 4 - w), y = Math.max(40, Math.round(sy) - 26);
    y += Math.round((1 - backOut(prog(t, t0, t0 + 0.15))) * 6);
    panel(x, y, w, 19);
    var ax = clamp(Math.round(sx), x + 8, x + w - 8);
    rect(ax - 3, y + 18, 6, 2, CREAM, 1, true); rect(ax - 1, y + 20, 2, 2, CREAM, 1, true);
    rect(ax - 4, y + 19, 1, 2, FRAME, 1, true); rect(ax + 3, y + 19, 1, 2, FRAME, 1, true);
    rect(ax - 2, y + 21, 1, 1, FRAME, 1, true); rect(ax + 1, y + 21, 1, 1, FRAME, 1, true);
    text(name, x + 7, y + 3, INK, { reveal: Math.floor((t - t0) / 0.035 + 1) * 12 });
  }
  function floatHeart(t, t0, x, y) {
    var p = (t - t0) / 0.8; if (p < 0 || p > 1) return;
    spr('heart', null, x - 4, y - 8 - Math.round(easeOut(p) * 16), { tint: '#f0638f', a: p > 0.8 && (Math.floor(t * 30) % 2) ? 0 : 1 });
  }
  function floatCoin(t, t0, x, y, amt) {
    var p = (t - t0 - 0.12) / 0.8; if (p < 0 || p > 1) return;
    if (p > 0.8 && (Math.floor(t * 30) % 2)) return;
    var yy = y - 6 - Math.round(easeOut(p) * 20), s = '+' + amt, w = numW(s) + 10;
    spr('coin', null, x - w / 2, yy + 2);
    var nx = x - w / 2 + 10; num(s, nx - 1, yy, INK, false); num(s, nx + 1, yy, INK, false); num(s, nx, yy - 1, INK, false); num(s, nx, yy + 1, INK, false); num(s, nx, yy, '#ffe27a', false);
  }

  // ---------- cast ----------
  var COL = { girl_01: '#9060e8', girl_02: '#86b23c', girl_03: '#f0a81e', girl_04: '#44a8f0', girl_05: '#f45c9c' };
  var GIRLS = ['girl_01', 'girl_02', 'girl_03', 'girl_04', 'girl_05'];

  // ---------- 0–4: classroom, the after-school bell ----------
  var LINE = [{ g: 'girl_02', x: 84 }, { g: 'girl_03', x: 122 }, { g: 'girl_01', x: 160 }, { g: 'girl_04', x: 198 }, { g: 'girl_05', x: 236 }];
  function S_class(t) {
    setCam(160, 90, 1);
    var actors = [];
    LINE.forEach(function (m, n) {
      var g = m.g, fr = 'idle_down', x = m.x, y = 168, hop = 0;
      var go = 3.0 + [2, 1, 0, 3, 4][n] * 0.09;
      if (t < 1.0) { fr = 'idle_down'; }
      else if (t < go) {
        hop = hopY(t, 1.0 + n * 0.04, 0.22, 7);
        if (g === 'girl_01') { fr = t < 2.2 ? 'wave' : 'run_pose'; hop += hopY(t, 2.2, 0.22, 6); }
        else fr = (t > 2.2 && META.girls[g].frames.cheer) ? 'cheer' : 'idle_down';
        if (t > 2.2 && g !== 'girl_01') hop += hopY((t - 2.2 + n * 0.07) % BEAT, 0, BEAT * 0.8, 6);
      } else { fr = animFrame(g, 'run_right', t - go); x = m.x + (t - go) * 300; }
      actors.push({ y: y + n * 0.01, fn: function () { girl(g, fr, x, y + hop); } });
    });
    drawScene('classroom', actors, t, function (n) {
      if (t < 1.0 || n === 'teacher_desk') return 0;
      return hopY(t, 1.0 + (parseInt(n.slice(5), 10) % 2) * 0.06, 0.2, 4);
    });
    full('#ff9a4a', 0.16);                                   // late-afternoon light
    // the clock on the wall rings: little marks around it
    if (t >= 0.4 && t < 2.0 && (Math.floor(t * 8) % 2)) {
      rect(132, 10, 6, 2, '#fdd35c', 1, false); rect(170, 10, 6, 2, '#fdd35c', 1, false);
      rect(134, 4, 4, 2, '#fdd35c', 1, false); rect(170, 4, 4, 2, '#fdd35c', 1, false);
    }
    bubble(t, 1.3, 3.0, 'dlg_class', 160, 112);
    if (t < 0.4) full('#000000', 1 - t / 0.4);
  }

  // ---------- map of the shopping street ----------
  var BLD = ['school', 'book', 'art', 'flower', 'market'];
  function bx(i) { return 8 + i * 62; }
  var BY = 59;
  /* lit[i] = time the shop lights up (or -1); season picks sky tint and particles; crowd = number of walkers */
  function mapScene(t, lit, season, crowd) {
    spr('map_bg', null, 0, 0);
    var i;
    for (i = 0; i < 5; i++) {
      var on = lit[i] >= 0 && t >= lit[i];
      var hop = on ? hopY(t, lit[i], 0.25, 8) : 0;
      spr('b_' + BLD[i], null, bx(i), BY + hop, { tint: on ? '#ffffff' : [0.6, 0.6, 0.72] });
      if (on) {
        rect(bx(i) + 9, BY + 50 + hop, 16, 13, '#ffe9a0', 1, false);
        rect(bx(i) + 16, BY + 50 + hop, 1, 13, '#f3c877', 1, false);
        sparkles(bx(i) + 28, BY + 30, lit[i], t, '#fdd35c', 8, 30);
      } else rect(bx(i) + 9, BY + 50, 16, 13, '#8f8ea3', 1, false);   // shutter
    }
    for (i = 0; i < crowd; i++) {
      var dir = i % 2 ? -1 : 1, sp = 26 + rnd(i) * 22, lane = 160 + (i % 3) * 8;
      var x = ((i * 97 + 40 + t * sp) % 400) - 40; if (dir < 0) x = 320 - x;
      cust(i, x, lane, true, t + i * 0.2, 0, i % 2, dir < 0 ? 'left' : 'right');
    }
    var tint = { spring: ['#ffd0e0', 0.0], summer: ['#fff2a0', 0.14], autumn: ['#ff9a4a', 0.2], winter: ['#27306a', 0.42] }[season];
    if (tint[1] > 0) full(tint[0], tint[1]);
    // seasonal particles
    var pc = { spring: '#f7a8c4', summer: '#ffffff', autumn: '#e08a3c', winter: '#ffffff' }[season];
    if (season !== 'summer') for (i = 0; i < 26; i++) {
      var px = (rnd(i) * 360 + t * (season === 'winter' ? 8 : 30) + Math.sin(t * 2 + i) * 6) % 340 - 10;
      var py = (rnd(i + 40) * 200 + t * (40 + rnd(i + 3) * 30)) % 190 - 6;
      rect(Math.round(px), Math.round(py), 2, 2, pc, 0.9, true);
    }
    if (season === 'winter') {                                // string lights across the street
      for (i = 0; i <= 26; i++) {
        var lx = 6 + i * 12, ly = 44 + Math.round(Math.sin((i % 9) / 8 * Math.PI) * 7);
        rect(lx, ly, 2, 2, ['#fdd35c', '#f08fb0', '#8fd8d0'][(i + Math.floor(t * 4)) % 3], 1, false);
      }
    }
  }
  function S_mapIntro(t) {
    if (t < 4.6) setCam(160, 90, 1); else { var z = t < 4.8 ? 2 : 3; setCam(bx(1) + 28, 100, z); }
    mapScene(t, [0, -1, -1, -1, -1], 'spring', 0);
    // one lonely leaf blowing down the empty street
    var lx = 340 - (t - 4.0) * 300, ly = 160 + Math.round(Math.sin(t * 14) * 4);
    rect(Math.round(lx), ly, 4, 2, '#8a7a5a', 1, false); rect(Math.round(lx) + 1, ly - 1, 2, 4, '#8a7a5a', 1, false);
    if (t < 4.6) {
      tag(t, 4.0, 'map_title');
      var w = tw('map_sad') + 14;
      panel(160 - w / 2, 30, w, 17, '#e9e4ee'); text('map_sad', 160 - w / 2 + 7, 32, '#6a6474');
    }
    spr('arrow_dn', null, bx(1) + 25, BY - 12 + beatBob(t * 2, 2), { tint: '#f0638f' });
    irisOpen(t, 4.0, '#fff6e0', 250, 90);
    irisCover(t, 5.0, COL.girl_03, 160, 90);
  }

  // ---------- 5–20: three shops, same loop: decorate -> open -> customers -> level up ----------
  var SHOPS = [
    { t0: 5, scene: 'bookstore', g: 'girl_03', x: 196, from: 340, walk: 'walk_left', poses: ['read', 'write'], dlg: 'dlg_book', lv: 'lv_book',
      order: ['counter', 'armchair', 'ladder', 'book_stack_cat'], gap: 0.3, spots: [70, 106, 142], cfrom: -34, amt: [120, 80, 150],
      bob: function (n) { return n === 'book_stack_cat' ? 3 : n === 'armchair' ? 2 : 0; } },
    { t0: 10, scene: 'art_studio', g: 'girl_02', x: 150, from: -20, walk: 'walk_right', poses: ['map', 'cheer'], dlg: 'dlg_art', lv: 'lv_art',
      order: ['easel', 'canvases', 'stool', 'plant'], gap: 0.3, spots: [28, 64, 100], cfrom: -34, amt: [200, 160, 240],
      bob: function (n) { return n === 'plant' ? 3 : 2; } },
    { t0: 15, scene: 'flower_shop', g: 'girl_05', x: 160, from: 340, walk: 'walk_left', poses: ['water', 'present'], dlg: 'dlg_flower', lv: 'lv_flower',
      order: ['flower_stand', 'counter', 'bucket_1', 'bucket_2', 'bucket_3', 'bucket_4', 'bucket_5', 'watering_can'], gap: 0.17, spots: [216, 252, 288], cfrom: 354, amt: [300, 260, 380],
      bob: function (n) { return n.indexOf('bucket') === 0 ? 3 : 0; } }
  ];
  SHOPS.forEach(function (c) {
    c.tp = {}; c.order.forEach(function (n, i) { c.tp[n] = 0.25 + i * c.gap; });
    c.arr = c.spots.map(function (s, i) { return 3.1 + i * 0.3; });
    c.arr.forEach(function (a, i) { EV.push({ t: c.t0 + a + 0.12, amt: c.amt[i] }); });
    c.color = COL[c.g];
  });
  var T_BUILD = 1.6, T_LV = 3.95;
  function S_shop(t, c) {
    var q = t - c.t0, g = c.g, S = META.scenes[c.scene], y = 168, x, fr, hop = 0, i;
    var zoom = q >= 2.5 && q < 3.0;
    if (zoom) setCam(c.x, y - 34, 2); else setCam(160, 90, 1);
    if (q < 1.7) { x = c.from; fr = 'idle_down'; }
    else if (q < 2.5) { x = lerp(c.from, c.x, prog(q, 1.7, 2.5)); fr = animFrame(g, c.walk, q - 1.7); }
    else if (q < 3.0) { x = c.x; fr = c.poses[0]; hop = hopY(q, 2.5, 0.2, 6); }
    else if (q < T_LV) { x = c.x; fr = c.poses[Math.floor((q - 3.0) / BEAT) % 2]; hop = hopY((q - 3.0) % BEAT, 0, BEAT * 0.7, 4); }
    else { x = c.x; fr = Math.floor((q - T_LV) / (BEAT / 2)) % 2 ? 'wave' : (META.girls[g].frames.cheer ? 'cheer' : 'wave'); hop = hopY((q - T_LV) % BEAT, 0, BEAT * 0.8, 10); }
    var actors = [{ y: y, fn: function () { girl(g, fr, x, y + hop); } }];
    c.spots.forEach(function (sx, n) {
      var ta = c.arr[n], cy = 174 + n * 0.01;
      if (q < ta - 0.8) return;
      var px = lerp(c.cfrom, sx, prog(q, ta - 0.8, ta)), walking = q < ta;
      var ch = walking ? 0 : hopY(q, ta, 0.22, 7) + (q >= T_LV ? hopY((q - T_LV + n * 0.1) % BEAT, 0, BEAT * 0.8, 5) : 0);
      actors.push({ y: cy, fn: function () { cust(n + c.t0 / 5, px, 174, walking, t, ch, n % 2, c.cfrom < sx ? 'right' : 'left', q >= T_LV && Math.floor((q - T_LV) / BEAT + n) % 2 ? 'wave' : 'idle_down'); } });
    });
    drawScene(c.scene, actors, t, function (n) {
      var tp = c.tp[n]; if (tp === undefined) return 0;
      if (q < tp) return false;
      if (q < tp + 0.2) return Math.round((1 - backOut(prog(q, tp, tp + 0.2))) * -22);
      if (q >= 3.0) return -beatBob(t + (n.length % 2) * BEAT / 2, c.bob(n));
      return 0;
    });
    // decorate mode: floor grid, placement frame and the cursor
    if (q < T_BUILD + 0.1) {
      var ga = 0.28 * (1 - prog(q, T_BUILD - 0.1, T_BUILD + 0.1));
      for (i = 0; i < 20; i++) rect(i * 16, 150, 1, 30, '#ffffff', ga, false);
      for (i = 0; i < 2; i++) rect(0, 150 + i * 15, W, 1, '#ffffff', ga, false);
      var k = clamp(Math.floor((q - 0.25) / c.gap + 1), 0, c.order.length - 1);
      var L = null, P = null;
      S.layers.forEach(function (l) { if (l.name === c.order[k]) L = l; if (k > 0 && l.name === c.order[k - 1]) P = l; });
      var tk = c.tp[c.order[k]];
      if (q < tk && (Math.floor(q * 16) % 2)) {              // dashed frame where the next piece lands
        for (i = 0; i < L.w; i += 4) { rect(L.x + i, L.y, 2, 1, '#ffffff', 1, false); rect(L.x + i, L.y + L.h - 1, 2, 1, '#ffffff', 1, false); }
        for (i = 0; i < L.h; i += 4) { rect(L.x, L.y + i, 1, 2, '#ffffff', 1, false); rect(L.x + L.w - 1, L.y + i, 1, 2, '#ffffff', 1, false); }
      }
      var cp = easeOut(prog(q, tk - c.gap, tk - c.gap * 0.3));
      var fx = P ? P.x + P.w / 2 : 160, fy = P ? P.y + P.h / 2 : 100;
      var cxp = lerp(fx, L.x + L.w / 2, cp), cyp = lerp(fy, L.y + L.h / 2, cp);
      if (q < T_BUILD) spr('cursor', null, Math.round(cxp), Math.round(cyp) + (q >= tk && q < tk + 0.08 ? 2 : 0));
      c.order.forEach(function (n) { S.layers.forEach(function (l) { if (l.name === n) sparkles(l.x + l.w / 2, l.y + l.h - 4, c.t0 + c.tp[n] + 0.1, t, '#ffffff', 5, 18); }); });
    }
    // customers' hearts and coins
    c.spots.forEach(function (sx, n) { floatHeart(q, c.arr[n], sx + 20, 122); floatCoin(q, c.arr[n], sx, 95 - (n % 2) * 15, c.amt[n]); });
    // screen-space UI
    if (!zoom) {
      if (q < T_BUILD) tag(t, c.t0 + 0.05, 'mode_build', '#fff6e0');
      else if (q < T_LV) tag(t, c.t0 + T_BUILD, 'mode_open', '#7cc47a', '#ffffff');
    }
    bubble(t, c.t0 + 1.9, c.t0 + 3.0, c.dlg, c.x, y - 56);
    if (q >= T_LV) {
      var bw = Math.round(easeOut(prog(q, T_LV, T_LV + 0.15)) * W);
      rect(0, 60, bw, 34, '#ffffff', 1, true); rect(0, 62, bw, 30, c.color, 1, true);
      for (i = 0; i < 8; i++) rect(((i * 44 + t * 120) % 360) - 30, 62, 14, 30, light(c.color, 0.2), bw >= W ? 1 : 0, true);
      if (q >= T_LV + 0.1) {
        var lw = tw(c.lv) * 2, ly = 64 + hopY(q, T_LV + 0.1, 0.22, 6);
        text(c.lv, 160 - lw / 2 + 2, ly + 2, dark(c.color, 0.45), { s: 2 }); text(c.lv, 160 - lw / 2, ly, '#ffffff', { s: 2 });
      }
      sparkles(160, 78, c.t0 + T_LV + 0.1, t, '#ffffff', 14, 110, true);
      sparkles(160, 78, c.t0 + T_LV + 0.45, t, light(c.color, 0.5), 12, 120, true);
    }
  }

  // ---------- 20–22: the seasons fly by on the map ----------
  function S_seasons(t) {
    setCam(160, 90, 1);
    var c = calendar(t), n = t < 20.5 ? 2 : t < 21 ? 3 : t < 21.5 ? 5 : 7;
    mapScene(t, [0, 0, 0, 0, 21.5], c[1], n);
    var ts = 20 + Math.floor((t - 20) / 0.5) * 0.5;
    var s = Math.round(backOut(prog(t, ts, ts + 0.15)) * 4) / 4;   // season stamp pops in on each beat
    var bw = Math.round(40 * s), col = SEASON[c[1]];
    if (bw > 6) {
      rect(160 - bw / 2 - 2, 36 - bw / 2 - 2, bw + 4, bw + 4, '#ffffff', 1, true);
      rect(160 - bw / 2, 36 - bw / 2, bw, bw, col, 1, true);
      if (s >= 1) text('s_' + c[1], 160 - 13, 36 - 13, '#ffffff', { s: 2 });
    }
    sparkles(160, 36, ts + 0.05, t, col, 8, 40, true);
    irisOpen(t, 20.0, COL.girl_05, 160, 90);
  }

  // ---------- 22–24: five-way roll call ----------
  function S_rollcall(t) {
    setCam(160, 90, 1);
    full('#ffffff', 1);
    var k = 0.2, a0 = -18, wd = (338 + 18) / 5;
    for (var i = 0; i < 5; i++) {
      var g = GIRLS[i], col = COL[g], ti = 22.0 + i * BEAT / 2;
      if (t < ti) continue;
      var a = a0 + wd * i, b = a + wd;
      var off = Math.round((1 - easeOut(prog(t, ti, ti + 0.12))) * (i % 2 ? 190 : -190));
      setClip(3, a, b, k);
      rect(0, off, W, H, col, 1, true);
      for (var j = 0; j < 6; j++) {
        var yy = ((j * 40 + (i % 2 ? -1 : 1) * t * 120) % 240 + 240) % 240 - 30;
        rect(0, Math.round(yy) + off, W, 14, light(col, 0.2), 1, true);
      }
      var cx = a + wd / 2 + 3;
      var bob = t > 23.25 ? -beatBob(t + i * BEAT / 2, 3) : 0;
      portrait(g, cx, 84 + off + bob, 2, { add: '#ffffff', addAmt: clamp(1 - (t - ti) / 0.14, 0, 1) });
      if (i > 0) { setClip(3, a - 2, a + 1, k); full('#ffffff', 1); }
      setClip(0);
      if (t >= ti + 0.12) {
        var rn = 'role_' + (i + 1), rw = tw(rn) + 10, rx = Math.max(3, Math.round(cx - 13 - rw / 2)), ry = 154 + hopY(t, ti + 0.12, 0.2, 5);
        panel(rx, ry, rw, 17); text(rn, rx + 5, ry + 2);
      }
    }
    if (t > 23.8) full('#ffffff', prog(t, 23.8, 24.0));
  }

  // ---------- 24–28: christmas market, the whole street is full ----------
  var MK = [{ g: 'girl_02', x: 104, from: -30 }, { g: 'girl_03', x: 132, from: -60 }, { g: 'girl_04', x: 160, from: 160 }, { g: 'girl_01', x: 188, from: 380 }, { g: 'girl_05', x: 216, from: 350 }];
  var MC = [];
  (function () {
    for (var i = 0; i < 8; i++) {
      var left = i % 2 === 0, slot = Math.floor(i / 2);
      MC.push({ x: left ? 12 + slot * 25 : 308 - slot * 25, from: left ? -36 : 356, y: 154 + (slot % 2) * 3, row: slot % 2, t: 24.4 + i * 0.18, amt: 600 + (i * 170) % 500 });
      EV.push({ t: 24.4 + i * 0.18 + 0.8, amt: 600 + (i * 170) % 500 });
    }
    for (i = 0; i < 6; i++) EV.push({ t: 26.0 + i * 0.2, amt: 900 + i * 90 });
  })();
  var T_BIG = 26.0, T_RUN = 27.3;
  function S_market(t) {
    var run = t >= T_RUN, actors = [];
    if (run) { var z = t < T_RUN + 0.2 ? 1 : t < T_RUN + 0.4 ? 2 : 3; setCam(160, 174 - (z === 1 ? 78 : z === 2 ? 34 : 26), z); } else setCam(160, 90, 1);
    MK.forEach(function (m, n) {
      var g = m.g, x = m.x, y = 168, fr, hop = 0;
      if (g === 'girl_04') { fr = t < T_BIG ? 'music' : (Math.floor((t - T_BIG) / (BEAT / 2)) % 2 ? 'wave' : 'cheer'); hop = t < T_BIG ? -beatBob(t * 2, 1) : hopY((t - T_BIG) % BEAT, 0, BEAT * 0.8, 10); }
      else if (t < 25.0) { x = lerp(m.from, m.x, prog(t, 24.0, 25.0)); fr = animFrame(g, m.from < m.x ? 'walk_right' : 'walk_left', t - 24.0); }
      else if (t < T_BIG) { fr = Math.floor((t - 25.0) / BEAT + n) % 2 ? 'wave' : 'idle_down'; hop = hopY((t - 25.0 + n * 0.08) % BEAT, 0, BEAT * 0.7, 4); }
      else { fr = (Math.floor((t - T_BIG) / (BEAT / 2)) + n) % 2 ? 'wave' : (META.girls[g].frames.cheer ? 'cheer' : 'wave'); hop = hopY((t - T_BIG + n * 0.06) % BEAT, 0, BEAT * 0.8, 10); }
      if (run) { fr = animFrame(g, 'run_down', t - T_RUN + n * 0.03); y = 168 + Math.min(8, (t - T_RUN) * 14); hop = 0; }
      actors.push({ y: y + n * 0.01, fn: function () { girl(g, fr, x, y + hop); } });
    });
    MC.forEach(function (c, n) {
      if (t < c.t) return;
      var px = lerp(c.from, c.x, prog(t, c.t, c.t + 0.8)), walking = t < c.t + 0.8;
      var ch = walking ? 0 : hopY((t - c.t + n * 0.11) % BEAT, 0, BEAT * 0.8, t >= T_BIG ? 6 : 3);
      actors.push({ y: c.y + n * 0.01, fn: function () { cust(n, px, c.y, walking, t, ch, c.row, c.from < c.x ? 'right' : 'left', t >= T_BIG && Math.floor((t - T_BIG) / BEAT + n) % 2 ? 'wave' : 'idle_down'); } });
    });
    drawScene('christmas_market', actors, t, function (n) {
      if (n === 'snowman') return -beatBob(t, 3);
      if (n === 'gifts') return -beatBob(t + BEAT / 2, 2);
      return 0;
    });
    var i;
    if (!run) for (i = 0; i < 3; i++) {
      var ph = ((t - 24) * 0.9 + i * 0.33) % 1;
      spr('note', null, 174 + i * 7 + Math.sin(ph * 6.28) * 3, 116 - ph * 30, { tint: i % 2 ? '#ffffff' : '#fdd35c', a: ph < 0.85 ? 1 : 0 });
    }
    MC.forEach(function (c, n) { floatHeart(t, c.t + 0.8, c.x + 18, c.y - 44); if (n % 3 === 0) floatCoin(t, c.t + 0.8, c.x, c.y - 80 - c.row * 15, c.amt); });
    if (t >= T_BIG && !run) for (i = 0; i < 10; i++) {          // coins rain
      var cy = ((rnd(i) * 200 + (t - T_BIG) * (150 + rnd(i + 5) * 90)) % 200) - 10;
      spr('coin', null, Math.round(12 + rnd(i + 11) * 296), Math.round(cy), { ui: true });
    }
    bubble(t, 24.5, 25.8, 'dlg_market', 160, 112);
    if (t >= T_BIG && t < T_RUN + 0.2) {
      var bw = tw('big'), by = 44 + Math.round((1 - backOut(prog(t, T_BIG, T_BIG + 0.2))) * -90) - beatBob(t * 2, 2);
      text('big', 160 - bw / 2 + 3, by + 3, '#3a2233'); text('big', 160 - bw / 2 - 1, by, '#ffffff'); text('big', 160 - bw / 2 + 1, by, '#ffffff');
      text('big', 160 - bw / 2, by - 1, '#ffffff'); text('big', 160 - bw / 2, by + 1, '#ffffff'); text('big', 160 - bw / 2, by, '#f0638f');
      sparkles(160, 62, T_BIG + 0.15, t, '#fdd35c', 14, 110, true); sparkles(160, 62, T_BIG + 0.6, t, '#ffffff', 14, 120, true);
    }
    if (t < 24.25) full('#ffffff', 1 - prog(t, 24.0, 24.25));
    if (t >= 27.8) full('#ffffff', prog(t, 27.8, 27.95));
  }

  // ---------- 28–32: logo and tagline ----------
  var T_LOGO = 28.5, T_TAG = 30.0, T_WINK = 30.5;
  function S_end(t) {
    setCam(160, 90, 1);
    full('#fff1d6', 1);
    var i;
    for (i = 0; i < 5; i++) rect(i * 64, 0, 64, H, light(COL[GIRLS[i]], 0.8), 1, true);
    for (i = 0; i <= 26; i++) {                               // string lights along the top
      var lx = 4 + i * 12, ly = 2 + Math.round(Math.sin((i % 9) / 8 * Math.PI) * 5);
      rect(lx, ly, 3, 3, ['#fdd35c', '#f08fb0', '#8fd8d0'][(i + Math.floor(t * 4)) % 3], 1, true);
    }
    for (i = 0; i < 5; i++) {                                 // busts, aligned by the top of the head
      var g = GIRLS[i], gx = 160 + (i - 2) * 62, th = 28.9 + i * BEAT / 4;
      if (t < th) continue;
      var up = Math.round((1 - backOut(prog(t, th, th + 0.2))) * 160);
      var wink = t >= T_WINK;
      var hop = t >= T_WINK ? hopY(t, T_WINK + i * 0.05, 0.3, 7) : -beatBob(t + i * BEAT / 2, 2) * 2;
      var lift = g === 'girl_01' ? 16 : 0;   // girl 01's bust is cropped at the chin (no shoulders): raise it so her face lines up with the others
      spr(g, gframe(g, wink ? 'expr_wink' : 'expr_happy'), gx - 64, 168 - 124 - lift + up + hop, { ui: true, s: 2 });
    }
    for (i = 0; i < 5; i++) rect(i * 64, 152, 64, 28, light(COL[GIRLS[i]], 0.45), 1, true);
    rect(0, 150, W, 2, '#ffffff', 0.7, true);
    if (t >= T_LOGO) {
      var lw = META.size.logo[0], ly2 = 3 + Math.round((1 - backOut(prog(t, T_LOGO, T_LOGO + 0.25))) * -90);
      spr('logo', null, 160 - lw / 2, ly2, { ui: true, add: '#ffffff', addAmt: clamp(1 - (t - T_LOGO - 0.2) / 0.15, 0, 1) });
      sparkles(160, 40, T_LOGO + 0.22, t, '#fdd35c', 14, 110, true);
    }
    if (t >= T_TAG) {
      var pw = Math.round(backOut(prog(t, T_TAG, T_TAG + 0.18)) * 92);
      rect(160 - pw, 70, pw * 2, 19, '#4a3038', 1, true);
      if (t >= T_TAG + 0.1) text('tagline', 160 - tw('tagline') / 2, 73 + hopY(t, T_TAG + 0.1, 0.2, 4), '#fff6e0');
    }
    if (t >= T_WINK) {
      for (i = 0; i < 5; i++) sparkles(160 + (i - 2) * 62, 128, T_WINK, t, COL[GIRLS[i]], 6, 30, true);
      text('studio', 160 - tw('studio') / 2, 160, '#7a4a3a');
    }
    if (t < 28.25) full('#ffffff', 1 - prog(t, 28.0, 28.25));
  }

  // ---------- title screen (before the main timeline): street illustration on the left, paper menu on the right ----------
  var MENU_N = 7, T_SELECT = 2.1;
  function S_title(t) {
    setCam(160, 90, 1);
    mapScene(t + 50, [0, 0, 0, 0, 0], 'spring', 0);
    var i, y;
    [['girl_02', 30], ['girl_03', 66], ['girl_01', 102], ['girl_04', 138], ['girl_05', 174]].forEach(function (m, n) {
      girl(m[0], 'idle_down', m[1], 172 - beatBob(t + n * 0.13, 1));
    });
    // paper panel with a torn left edge
    var px = 226;
    rect(px - 3, 0, 3, H, '#2a1c22', 0.22, true);
    rect(px, 0, W - px, H, '#f6e2bd', 1, true);
    for (y = 0; y < H; y += 2) {
      var d = Math.round(rnd(y * 0.37) * 3);
      rect(px - d, y, d + 2, 2, '#f6e2bd', 1, true); rect(px - d, y, 1, 2, '#dcc092', 1, true);
    }
    rect(W - 3, 0, 3, H, '#e9d0a4', 1, true);
    for (i = 0; i < 7; i++) rect(px + 8 + i * 12, 14 + Math.round(Math.sin(i / 6 * Math.PI) * 4), 3, 3, ['#fdd35c', '#f08fb0', '#8fd8d0'][i % 3], 1, true);
    spr('heart', null, px + 40, 26, { ui: true, tint: '#f0638f' });
    var sel = t < 0.9 ? 0 : t < 1.5 ? 1 : 2, tm = sel === 1 ? 0.9 : sel === 2 ? 1.5 : -9;
    for (i = 0; i < MENU_N; i++) {
      var my = 44 + i * 16, on = i === sel;
      var blink = on && t >= T_SELECT && t < T_SELECT + 0.4 && (Math.floor((t - T_SELECT) * 16) % 2);
      text('menu_' + i, px + 22 + (on ? 2 : 0), my, on ? (blink ? '#f0638f' : INK) : '#b08a66');
      if (on) {
        spr('heart', null, px + 9 + Math.round(hopY(t, tm, 0.15, 3)), my + 3, { ui: true, tint: '#f0638f' });
        rect(px + 22, my + 13, tw('menu_' + i) + 4, 1, '#c98a6a', 1, true);
      }
    }
    // logo sign over the illustration, key hints and version below
    var lw = META.size.logo[0], ly = 6 + Math.round((1 - backOut(prog(t, 0.15, 0.45))) * -80);
    spr('logo', null, 6, ly, { ui: true });
    sparkles(6 + lw / 2, 40, 0.45, t, '#fdd35c', 12, 100, true);
    rect(4, 163, 150, 15, '#2a1c22', 0.55, true);
    text('hint_move', 8, 164, '#ffffff'); panel(46, 164, 9, 13, '#ffffff', '#2a1c22'); spr('arrow_dn', null, 47, 169, { ui: true, tint: '#2a1c22' });
    text('hint_ok', 64, 164, '#ffffff'); panel(114, 164, 11, 13, '#ffffff', '#2a1c22'); text('key_z', 117, 164, '#2a1c22');
    if (t >= T_SELECT) sparkles(px + 44, 44 + 2 * 16 + 6, T_SELECT, t, '#f0638f', 8, 30, true);
    if (t < 0.35) full('#000000', 1 - t / 0.35);
    if (t >= T_SELECT + 0.45) full('#000000', prog(t, T_SELECT + 0.45, TS - 0.1));
  }

  // ---------- master timeline ----------
  function frame(t) {
    used = 0; setClip(0); setCam(160, 90, 1);
    t = clamp(t, 0, DUR - 0.001);
    if (t < TS) {
      S_title(t);
      for (var j = used; j < pool.length; j++) pool[j].visible = false;
      renderer.render(scene, camera); return;
    }
    t -= TS;
    if (t < 4) { S_class(t); irisCover(t, 4.0, '#fff6e0', 250, 90); }
    else if (t < 5) S_mapIntro(t);
    else if (t < 10) { S_shop(t, SHOPS[0]); irisOpen(t, 5, COL.girl_03, 160, 90); irisCover(t, 10, COL.girl_02, 160, 90); }
    else if (t < 15) { S_shop(t, SHOPS[1]); irisOpen(t, 10, COL.girl_02, 160, 90); irisCover(t, 15, COL.girl_05, 160, 90); }
    else if (t < 20) { S_shop(t, SHOPS[2]); irisOpen(t, 15, COL.girl_05, 160, 90); irisCover(t, 20, COL.girl_05, 160, 90); }
    else if (t < 22) S_seasons(t);
    else if (t < 24) S_rollcall(t);
    else if (t < 28) S_market(t);
    else S_end(t);
    setClip(0);
    hud(t);
    for (var i = used; i < pool.length; i++) pool[i].visible = false;
    renderer.render(scene, camera);
  }

  // ---------- playback ----------
  var playing = false, startAt = 0, curT = 0, useAudio = false;
  var btn = document.getElementById('play');
  function now() { return performance.now() / 1000; }
  function clock() {
    if (useAudio && window.PV_AUDIO && PV_AUDIO.ctx && PV_AUDIO.ctx.state === 'running') return PV_AUDIO.ctx.currentTime - PV_AUDIO.t0;
    return now() - startAt - (useAudio ? 0.1 : 0);
  }
  function loop() {
    if (playing) {
      curT = clock();
      if (curT >= DUR) { curT = DUR - 0.001; playing = false; btn.className = 'again'; btn.style.display = 'block'; }
      frame(curT);
    }
    requestAnimationFrame(loop);
  }
  function play(withSound) {
    useAudio = false;
    if (withSound && window.PV_AUDIO) { try { PV_AUDIO.start(); if (PV_AUDIO.ctx.state !== 'running') PV_AUDIO.ctx.resume(); useAudio = true; } catch (e) { useAudio = false; } }
    startAt = now(); playing = true; btn.style.display = 'none';
  }
  function fit() {
    var k = Math.max(1, Math.floor(Math.min(window.innerWidth / W, (window.innerHeight - 110) / H)));
    canvas.style.width = (W * k) + 'px'; canvas.style.height = (H * k) + 'px';
  }
  window.addEventListener('resize', fit); fit();
  btn.addEventListener('click', function () { play(true); });
  canvas.addEventListener('click', function () { if (!playing) play(true); });

  /* export helper (only works when served by tools/export_server.py): posts every frame as PNG plus the audio as WAV */
  window.__export = async function (fps, from) {
    fps = fps || 60; playing = false; btn.style.display = 'none';
    var n = Math.round(DUR * fps);
    for (var i = from || 0; i < n; i++) {
      frame(i / fps);
      var bin = atob(canvas.toDataURL('image/png').split(',')[1]), blob = new Uint8Array(bin.length);   // sync: toBlob stalls in a hidden tab
      for (var b = 0; b < bin.length; b++) blob[b] = bin.charCodeAt(b);
      await fetch('/save?name=f_' + String(i).padStart(5, '0') + '.png', { method: 'POST', body: blob });
      window.__exportProgress = i + 1;
    }
    var pcm = await PV_AUDIO.renderOffline(DUR + 0.5);
    var buf = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(buf);
    function ws(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
    ws(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); ws(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, 48000, true); v.setUint32(28, 96000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    ws(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    for (var j = 0; j < pcm.length; j++) v.setInt16(44 + j * 2, Math.max(-1, Math.min(1, pcm[j])) * 32767, true);
    await fetch('/save?name=audio.wav', { method: 'POST', body: buf });
    window.__exportDone = n;
    return n;
  };

  function onReady() {
    var q = new URLSearchParams(location.search);
    window.__seek = function (t) { playing = false; curT = t; frame(t); return used; };
    window.__play = play;
    if (q.has('t')) { btn.style.display = 'none'; frame(parseFloat(q.get('t'))); }
    else if (q.has('silent')) play(false);
    else frame(TS + 31.5);
    requestAnimationFrame(loop);
  }
})();
