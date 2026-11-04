// 很小的補間工具：所有動畫都在 main.js 同一個 requestAnimationFrame 裡推進。
const active = new Set();
export let speed = 1; // prefers-reduced-motion 時調快
export const setSpeed = (s) => { speed = s; };

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) ** 2,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

export function tween(ms, fn, e = ease.outCubic) {
  return new Promise((resolve) => {
    const dur = ms * speed;
    if (dur <= 1) { fn(1, 1); resolve(); return; }
    active.add({ t0: performance.now(), dur, fn, e, resolve });
  });
}
export const wait = (ms) => tween(ms, () => {});
export const lerp = (a, b, t) => a + (b - a) * t;

export function stepTweens(now) {
  for (const tw of active) {
    const k = Math.min(1, Math.max(0, (now - tw.t0) / tw.dur));
    tw.fn(tw.e(k), k);
    if (k >= 1) { active.delete(tw); tw.resolve(); }
  }
}
