// 碎紙：番茄紅、鐵皮藍、芥末黃三色紙片，加上少量雷射星星。
const PAPER = ['#E2483A', '#2F5DA8', '#E9B53C', '#F6EFE2'];
const HOLO = ['#FF9AD5', '#FFE38A', '#9BF2C8', '#8FD3FF', '#B79CFF'];

export class Confetti {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.parts = [];
    this.resize();
  }
  resize() {
    this.dpr = Math.min(devicePixelRatio, 2);
    this.c.width = innerWidth * this.dpr;
    this.c.height = innerHeight * this.dpr;
  }
  burst(x, y, n = 110, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const v = (380 + Math.random() * 620) * power;
      const star = Math.random() < 0.2;
      this.parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        w: star ? 7 + Math.random() * 5 : 6 + Math.random() * 6, h: 4 + Math.random() * 6, flip: Math.random() * 6,
        color: star ? HOLO[i % HOLO.length] : PAPER[i % PAPER.length], star, life: 0,
      });
    }
  }
  // 剪票時掉下來的小圓紙片
  chip(x, y) {
    this.parts.push({ x, y, vx: 60 + Math.random() * 40, vy: -120, rot: 0, vr: 8, w: 10, h: 10, flip: 0, color: '#E9DCC4', round: true, life: 0 });
  }
  update(dt) {
    const g = this.g, H = innerHeight;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, H);
    if (!this.parts.length) return;
    const drag = Math.exp(-2.2 * dt);
    this.parts = this.parts.filter((p) => p.y < H + 40 && p.life < 6);
    for (const p of this.parts) {
      p.life += dt;
      p.vx *= drag; p.vy = p.vy * drag + 1100 * dt;
      p.x += p.vx * dt + Math.sin(p.life * 6 + p.flip) * 20 * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt; p.flip += dt * 9;
      g.save();
      g.translate(p.x, p.y); g.rotate(p.rot);
      g.fillStyle = p.color;
      if (p.star) {
        const s = p.w;
        g.beginPath();
        for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.28 : s; const a = (k * Math.PI) / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        g.fill();
      } else if (p.round) {
        g.strokeStyle = '#1E2A44'; g.lineWidth = 1.2;
        g.beginPath(); g.arc(0, 0, p.w / 2, 0, Math.PI * 2); g.fill(); g.stroke();
      } else {
        g.scale(1, Math.cos(p.flip));
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      g.restore();
    }
  }
}
