import * as THREE from 'three';

// 所有招牌、黑板、販賣機面板、牆面斑駁都用 Canvas 畫

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const JP = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
const JPS = '"Hiragino Sans", "Noto Sans JP", sans-serif';

// 斑駁灰泥牆：底色 + 髒污 + 剝落露出的紅磚
export function plasterTex(w, h, bricks = []) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#d6ceb8';
    g.fillRect(0, 0, w, h);
    // 大片水漬（平塗、不做漸層，保持賽璐璐感）
    for (let i = 0; i < 26; i++) {
      g.fillStyle = rand() < 0.5 ? 'rgba(150,140,115,0.18)' : 'rgba(120,118,100,0.14)';
      g.beginPath();
      g.ellipse(rr(0, w), rr(0, h), rr(20, 90), rr(30, 140), rr(0, 3), 0, Math.PI * 2);
      g.fill();
    }
    // 從上往下的垂流痕
    for (let i = 0; i < 18; i++) {
      g.fillStyle = 'rgba(110,104,88,0.2)';
      const x = rr(0, w);
      g.fillRect(x, 0, rr(3, 9), rr(h * 0.1, h * 0.45));
    }
    // 剝落露磚
    for (const [bx, by, bw, bh] of bricks) brickPatch(g, bx * w, by * h, bw * w, bh * h);
  });
}

function brickPatch(g, x, y, w, h) {
  g.save();
  g.beginPath();
  // 不規則邊緣
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rr(0.75, 1.05);
    g.lineTo(x + w / 2 + Math.cos(a) * (w / 2) * r, y + h / 2 + Math.sin(a) * (h / 2) * r);
  }
  g.closePath();
  g.fillStyle = '#6e5a4a';
  g.fill();
  g.clip();
  const bh = 14, bw = 34;
  for (let row = 0; row * bh < h + bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < w + bw; col++) {
      const c = ['#8e4a34', '#9c553b', '#7d4030', '#a35f42'][Math.floor(rand() * 4)];
      g.fillStyle = c;
      g.fillRect(x + col * bw + off + 2, y + row * bh + 2, bw - 4, bh - 4);
    }
  }
  g.restore();
  g.strokeStyle = 'rgba(90,80,64,0.6)';
  g.lineWidth = 3;
  g.stroke();
}

export function brickTex(w = 256, h = 256) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = '#5e4a3c';
    g.fillRect(0, 0, w, h);
    const bh = 16, bw = 40;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col * bw < w + bw; col++) {
        g.fillStyle = ['#8e4a34', '#9c553b', '#7d4030', '#a35f42'][Math.floor(rand() * 4)];
        g.fillRect(col * bw + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
  });
}

// 日式瓦：一排排橫向的瓦片
export function tileTex() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3c4954';
    g.fillRect(0, 0, w, h);
    const rows = 8, cols = 8;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (w / cols), y = r * (h / rows);
        g.fillStyle = rand() < 0.2 ? '#4a5864' : '#43515d';
        g.beginPath();
        g.ellipse(x + w / cols / 2, y + h / rows * 0.55, w / cols * 0.46, h / rows * 0.5, 0, 0, Math.PI);
        g.fill();
      }
      g.fillStyle = '#26303a';
      g.fillRect(0, r * (h / rows), w, 3);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 帆布遮雨棚的店名
export function awningTex(text, sub = '') {
  return canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#c95e3c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#a8462c';
    g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#fbeedb';
    g.font = `bold 64px ${JPS}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 - 4);
    if (sub) {
      g.font = `28px ${JPS}`;
      g.fillText(sub, w * 0.1, h / 2);
    }
  });
}

// 直式燈箱招牌
export function verticalSignTex() {
  return canvasTex(128, 384, (g, w, h) => {
    g.fillStyle = '#f7e2b8';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7a4a2a';
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#9a2e1e';
    g.font = `bold 86px ${JP}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    ['花', '緑', '屋'].forEach((ch, i) => g.fillText(ch, w / 2, 70 + i * 120));
  });
}

// 牆上的小綠框招牌
export function smallSignTex() {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#f4f1e6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2f6a4a';
    g.lineWidth = 12;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#2f6a4a';
    g.fillRect(6, 6, w - 12, 46);
    g.fillStyle = '#f4f1e6';
    g.font = `22px ${JPS}`;
    g.textAlign = 'center';
    g.fillText('季節の切り花・鉢物', w / 2, 38);
    g.fillStyle = '#1f3a2e';
    g.font = `bold 82px ${JP}`;
    g.fillText('花緑', w / 2, 150);
  });
}

// 黑板立牌
export function chalkTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#26332e';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#eef0e6';
    g.textAlign = 'center';
    g.font = `bold 34px ${JPS}`;
    g.fillText('本日の花', w / 2, 54);
    g.fillRect(40, 70, w - 80, 3);
    g.textAlign = 'left';
    g.font = `24px ${JPS}`;
    const lines = ['ガーベラ　¥280', 'バラ　　　¥350', 'ダリア　　¥420', 'かすみ草　¥300'];
    lines.forEach((l, i) => g.fillText(l, 30, 118 + i * 42));
    // 粉筆小花
    const cols = ['#f6a6b8', '#f4d040', '#f08a48'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = cols[i];
      g.beginPath();
      g.arc(70 + i * 58, 290, 12, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// 販賣機正面：發光飲料格
export function vendingTex() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#eef0ee';
    g.fillRect(0, 0, w, h);
    // 上方展示窗（發光）
    g.fillStyle = '#e4f4ff';
    g.fillRect(14, 14, w - 28, 290);
    const drinks = ['#3fa860', '#e85a5a', '#f4b02a', '#3a7ad8', '#f08a3a', '#8ed06a', '#e8e0c0', '#c04070'];
    for (let r = 0; r < 4; r++) {
      g.fillStyle = '#b8c8d4';
      g.fillRect(14, 14 + r * 72 + 62, w - 28, 6);
      for (let c = 0; c < 7; c++) {
        g.fillStyle = drinks[(r * 3 + c) % drinks.length];
        const x = 24 + c * 32;
        g.fillRect(x, 14 + r * 72 + 14, 20, 46);
        g.fillStyle = '#ffffff';
        g.fillRect(x + 4, 14 + r * 72 + 6, 12, 8);
      }
    }
    // 按鈕列
    for (let c = 0; c < 7; c++) {
      g.fillStyle = '#2a8a3a';
      g.fillRect(24 + c * 32, 312, 18, 8);
    }
    // 投幣口、廣告
    g.fillStyle = '#d8402e';
    g.fillRect(14, 334, 150, 90);
    g.fillStyle = '#ffffff';
    g.font = `bold 34px ${JPS}`;
    g.fillText('つめた〜い', 20, 392);
    g.fillStyle = '#9aa0a4';
    g.fillRect(186, 340, 52, 70);
    // 取物口
    g.fillStyle = '#3a3e42';
    g.fillRect(30, 440, w - 60, 50);
  });
}

// 販賣機旁的藍紅直條廣告
export function adStripTex() {
  return canvasTex(96, 384, (g, w, h) => {
    g.fillStyle = '#f4efe2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8502e';
    g.fillRect(8, 8, w - 16, 120);
    g.fillStyle = '#3e6aa8';
    g.fillRect(8, 140, w - 16, 110);
    g.fillStyle = '#e8b040';
    g.fillRect(8, 262, w - 16, 112);
    g.fillStyle = '#fff';
    g.font = `bold 60px ${JPS}`;
    g.textAlign = 'center';
    g.fillText('氷', w / 2, 90);
    g.fillText('水', w / 2, 220);
  });
}

// 店內：暖光下的層架與植物剪影
export function interiorTex(warm = '#ffcb80') {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = warm;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4a95a';
    g.fillRect(0, h * 0.62, w, h * 0.38);
    // 層架
    g.fillStyle = '#9a6036';
    for (let i = 0; i < 3; i++) g.fillRect(0, 50 + i * 60, w, 8);
    // 架上小盆、相框
    for (let i = 0; i < 30; i++) {
      const row = Math.floor(rand() * 3);
      const x = rr(0, w);
      g.fillStyle = ['#7a8a4a', '#5a7a3e', '#c86a3a', '#e8d0a0', '#8a5a36'][Math.floor(rand() * 5)];
      const s = rr(14, 30);
      g.fillRect(x, 50 + row * 60 - s, s * 0.8, s);
    }
    // 吊掛乾燥花
    g.fillStyle = '#b08a4a';
    for (let i = 0; i < 6; i++) {
      const x = rr(20, w - 20);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x - 14, 46);
      g.lineTo(x + 14, 46);
      g.fill();
    }
  });
}

// 二樓窗內：吊燈與窗簾
export function roomTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffc06a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffe2a8';
    g.beginPath();
    g.arc(w * 0.55, h * 0.3, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#d88a44';
    g.fillRect(0, 0, 40, h);
    g.fillRect(w - 40, 0, 40, h);
    g.fillStyle = '#b0703a';
    g.fillRect(0, h * 0.75, w, h * 0.25);
  });
}

export function doorTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#ffcd88';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a4a2a';
    g.font = `bold 22px ${JPS}`;
    g.textAlign = 'center';
    g.fillText('OPEN', w / 2, 60);
    g.fillStyle = '#f4f0e0';
    g.fillRect(34, 120, 60, 40);
    g.fillStyle = '#c4302a';
    g.fillRect(40, 128, 48, 6);
    g.fillRect(40, 142, 36, 4);
  });
}
