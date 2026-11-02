import * as THREE from 'three';

// 招牌、地毯、書背、海報、地面紋理都用 Canvas 畫

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();
const pickc = (arr) => arr[Math.floor(rand() * arr.length)];

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const SERIF = '"Hiragino Mincho ProN", "Georgia", serif';
const SANS = '"Avenir Next", "Helvetica Neue", "Hiragino Sans", sans-serif';

export function brickTex(w = 256, h = 256) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#5a4234';
    g.fillRect(0, 0, w, h);
    const bh = 16, bw = 40;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col * bw < w + bw; col++) {
        g.fillStyle = pickc(['#8a4a32', '#9a5638', '#7a3e2c', '#a5603f', '#8e5a44']);
        g.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
  }, true);
}

// 木地板：長條木紋
export function plankTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5e3a20';
    g.fillRect(0, 0, w, h);
    const n = 8;
    for (let i = 0; i < n; i++) {
      let y = 0;
      while (y < h) {
        const len = rr(80, 200);
        g.fillStyle = pickc(['#9a6236', '#a46a3a', '#8e5a30', '#ae7444']);
        g.fillRect((i * w) / n + 1, y + 1, w / n - 2, len - 2);
        g.fillStyle = 'rgba(70,40,20,0.25)';
        g.fillRect((i * w) / n + 6, y + 10, 2, len * 0.6);
        y += len;
      }
    }
  }, true);
}

export function grassTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3f5e24';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = pickc(['#4a6a2a', '#365222', '#557a30', '#2f4a1e']);
      g.beginPath();
      g.ellipse(rr(0, w), rr(0, h), rr(4, 14), rr(3, 8), rr(0, 3), 0, Math.PI * 2);
      g.fill();
    }
  }, true);
}

export function cobbleTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a4430';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 36) {
      for (let x = (y / 36) % 2 ? -20 : 0; x < w; x += 42) {
        g.fillStyle = pickc(['#8a8a7c', '#7c7e70', '#969486', '#706f64']);
        g.beginPath();
        g.ellipse(x + 21, y + 18, rr(15, 19), rr(12, 15), rr(-0.3, 0.3), 0, Math.PI * 2);
        g.fill();
      }
    }
  }, true);
}

// 花紋地毯：藍底、橘紅邊框、中央菱形
export function rugTex() {
  return canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#c47a48';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8d6b0';
    g.fillRect(14, 14, w - 28, h - 28);
    g.fillStyle = '#3e5a6a';
    g.fillRect(34, 34, w - 68, h - 68);
    // 邊框小圖樣
    g.fillStyle = '#b4482e';
    for (let x = 22; x < w - 22; x += 22) { g.fillRect(x, 18, 10, 10); g.fillRect(x, h - 28, 10, 10); }
    for (let y = 22; y < h - 22; y += 22) { g.fillRect(18, y, 10, 10); g.fillRect(w - 28, y, 10, 10); }
    // 中央菱形
    const diamond = (s, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(w / 2, h / 2 - s * 0.75);
      g.lineTo(w / 2 + s, h / 2);
      g.lineTo(w / 2, h / 2 + s * 0.75);
      g.lineTo(w / 2 - s, h / 2);
      g.fill();
    };
    diamond(170, '#c9874e');
    diamond(140, '#2e4656');
    diamond(100, '#d8b47a');
    diamond(56, '#b4482e');
    // 四角花樣
    g.fillStyle = '#d8b47a';
    for (const [x, y] of [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]]) {
      g.beginPath();
      g.arc(x, y, 18, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// 吧台下方書櫃：格子 + 書背
export function bookshelfTex(cols = 5, rows = 2) {
  return canvasTex(512, 220, (g, w, h) => {
    g.fillStyle = '#8a5630';
    g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = c * cw + 8, y0 = r * ch + 8, iw = cw - 16, ih = ch - 16;
        g.fillStyle = '#3a2414';
        g.fillRect(x0, y0, iw, ih);
        let x = x0 + 2;
        const lying = rand() < 0.3;
        if (lying) {
          // 平放的一疊
          let y = y0 + ih;
          while (y > y0 + ih * 0.35) {
            const t = rr(6, 11);
            g.fillStyle = pickc(['#e8e0cc', '#c8b48a', '#6a8a9a', '#b4482e', '#d8d0bc']);
            g.fillRect(x0 + rr(2, 8), y - t, iw * rr(0.6, 0.85), t - 1);
            y -= t;
          }
          continue;
        }
        while (x < x0 + iw - 6) {
          const bw = rr(6, 13);
          const bh = ih * rr(0.62, 0.95);
          g.fillStyle = pickc(['#e8e0cc', '#c8b48a', '#6a8a9a', '#b4482e', '#2e4656', '#d8d0bc', '#8a6a4a', '#4a6a3a']);
          g.fillRect(x, y0 + ih - bh, bw - 1, bh);
          x += bw;
        }
      }
    }
  });
}

// 入口的掛牌
export function signTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#efeae0';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1f2a24';
    g.lineWidth = 8;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#1f2a24';
    g.textAlign = 'center';
    g.font = `bold 76px ${SERIF}`;
    g.fillText('MOSS', w / 2, 112);
    g.font = `22px ${SANS}`;
    g.fillText('COFFEE & PLANTS', w / 2, 152);
    g.fillRect(50, 176, w - 100, 3);
    g.font = `bold 30px ${SANS}`;
    g.fillText('OPEN', w / 2, 230);
    g.font = `20px ${SANS}`;
    g.fillText('8:00 — 18:00', w / 2, 270);
  });
}

// 牆上的海報、便條
export function posterTex(kind = 0) {
  return canvasTex(128, 170, (g, w, h) => {
    g.fillStyle = kind ? '#efe4c8' : '#f4f0e6';
    g.fillRect(0, 0, w, h);
    if (kind === 0) {
      g.fillStyle = '#5a7a3a';
      g.beginPath();
      g.ellipse(64, 70, 30, 44, 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#3a2a1a';
      g.fillRect(62, 70, 4, 70);
    } else {
      g.fillStyle = '#3a2a1a';
      g.font = `bold 22px ${SANS}`;
      g.fillText('MENU', 30, 34);
      for (let i = 0; i < 6; i++) g.fillRect(16, 52 + i * 18, rr(60, 96), 4);
    }
  });
}

// 吧台旁的小黑板菜單
export function menuTex() {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#25302a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#eef0e6';
    g.font = `bold 28px ${SANS}`;
    g.textAlign = 'center';
    g.fillText('BREW BAR', w / 2, 40);
    g.textAlign = 'left';
    g.font = `18px ${SANS}`;
    ['Pour over   150', 'Siphon      180', 'Latte        160', 'Herb tea    140'].forEach((l, i) => g.fillText(l, 30, 78 + i * 28));
  });
}

// 玻璃：淡青色，帶一道斜向反光
export function glassTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(214,236,228,0.07)';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.2)';
    g.beginPath();
    g.moveTo(w * 0.15, h);
    g.lineTo(w * 0.35, h);
    g.lineTo(w * 0.85, 0);
    g.lineTo(w * 0.65, 0);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.beginPath();
    g.moveTo(w * 0.42, h);
    g.lineTo(w * 0.48, h);
    g.lineTo(w * 0.98, 0);
    g.lineTo(w * 0.92, 0);
    g.fill();
  });
}

// 背景：深綠樹林，右上方透進陽光（平塗色帶）
export function backgroundTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#16231a';
    g.fillRect(0, 0, w, h);
    const bands = ['#1b2b1f', '#213424', '#2a3f29', '#354d2f', '#46603a', '#5f7a48'];
    bands.forEach((col, i) => {
      const r = 1 - i / bands.length;
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(w * 0.86, h * 0.12, 700 * r, 560 * r, -0.4, 0, Math.PI * 2);
      g.fill();
    });
    // 遠景樹葉剪影
    for (let i = 0; i < 220; i++) {
      g.fillStyle = pickc(['rgba(20,34,22,0.25)', 'rgba(30,48,30,0.2)', 'rgba(14,26,16,0.3)']);
      g.beginPath();
      g.ellipse(rr(0, w), rr(0, h), rr(6, 18), rr(4, 10), rr(0, 3), 0, Math.PI * 2);
      g.fill();
    }
  });
}
