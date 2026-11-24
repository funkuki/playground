// 錄「迷你牧場」的首頁預覽短片（720×450、24fps、8 秒）和封面。
// 先讓來源頁在 http://localhost:8781 跑起來（pixel 專案的 tiny-layered：python3 -m http.server 8781 --directory tiny_layered_test），再執行：
//   node --experimental-websocket tools/record-mini-farm.mjs
// 做法：用無頭 Chrome 開頁面，把 requestAnimationFrame、performance.now、Math.random 換成自己控制的版本，
// 一格一格推進時間再截圖，所以每次錄出來的內容都一樣。最後用 ffmpeg 合成 mp4。
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const URL_ = process.argv[2] || 'http://localhost:8781/farm.html';
const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public/site/previews/mini-farm.mp4');
const COVER = join(ROOT, 'public/site/covers/mini-farm.jpg');
const FPS = 24, FRAMES = 192, W = 1200, H = 750, PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 第幾格做什麼：D 按下、U 放開（用 e.code）。Space 是互動，每隔幾格按一次，旁邊有成熟的作物或動物才會有反應
const D = (...codes) => codes.map((c) => `dispatchEvent(new KeyboardEvent('keydown', { code: '${c}', key: '${c}' }))`).join(';');
const U = (...codes) => codes.map((c) => `dispatchEvent(new KeyboardEvent('keyup', { code: '${c}', key: '${c}' }))`).join(';');
const ACTIONS = JSON.parse(process.env.ACTIONS || 'null') || {};
if (!process.env.ACTIONS) {
  const R = 'ArrowRight', L = 'ArrowLeft', Dn = 'ArrowDown', Up = 'ArrowUp';
  Object.assign(ACTIONS, ROUTE(D, U, R, L, Dn, Up));
  for (let f = 42; f < FRAMES; f += 6)   // 一開始站在農舍門口，太早按會進更衣室
   ACTIONS[f] = (ACTIONS[f] ? ACTIONS[f] + ';' : '') + D('Space') + ';' + U('Space');
}

const INJECT = `
  { let s = 20261124; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let __now = 0, __q = [];
  performance.now = () => __now;
  window.requestAnimationFrame = (f) => __q.push(f);
  window.__step = (t) => { __now = t; const q = __q; __q = []; for (const f of q) f(t); };
`;

// 路線：出門往右下走到菜園，沿著菜園採收，再跑到牧場
function ROUTE(D, U, R, L, Dn, Up) {
  return {
    10: D(R, Dn), 34: U(R), 62: D(L), 86: U(Dn), 100: D('ShiftLeft'), 124: U(L) + ';' + D(Dn), 140: U('ShiftLeft', Dn) + ';' + D(R), 160: U(R),
  };
}

const dir = mkdtempSync(join(tmpdir(), 'mdr-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(dir, 'profile')}`,
  `--window-size=${W},${H}`, '--force-device-scale-factor=1', 'about:blank',
], { stdio: 'ignore' });

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!target) throw new Error('連不上 Chrome');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; });
  let id = 0; const waiting = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
  const send = (method, params = {}) => new Promise((ok, bad) => {
    waiting.set(++id, (m) => (m.error ? bad(new Error(method + ': ' + m.error.message)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const run = async (expression) => {
    const r = await send('Runtime.evaluate', { expression });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: INJECT });
  await send('Page.navigate', { url: URL_ });
  await sleep(2500);                                  // 等字型、圖層和版面排好
  await run('__step(0)'); await sleep(300);          // 先畫一格，讓圖層開始載入

  for (let f = 0; f < FRAMES; f++) {
    const t = (f * 1000) / FPS;
    if (ACTIONS[f]) await run(ACTIONS[f]);
    await run(`__step(${t})`);
    await sleep(30);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(dir, `f${String(f).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
    if (f % 48 === 0) console.log(`frame ${f} / ${FRAMES}`);
  }
  ws.close();

  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'),
    '-vf', 'scale=720:450:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', '-an', OUT]);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', join(dir, 'f0000.png'), '--out', COVER], { stdio: 'ignore' });
  console.log(OUT + '\n' + COVER);
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(dir, { recursive: true, force: true });
}
