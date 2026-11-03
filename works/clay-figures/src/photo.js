// ---------- 拍照：閃一下白光，跳出一張拍立得，可以下載 ----------

const dialog = document.getElementById('photo');
const img = document.getElementById('photo-img');
const save = document.getElementById('photo-save');
const closeBtn = document.getElementById('photo-close');
const flash = document.getElementById('flash');
let opener = null;

function setOpen(open) {
  dialog.classList.toggle('open', open);
  dialog.setAttribute('aria-hidden', String(!open));
  if (open) { opener = document.activeElement; save.focus(); } else opener?.focus?.();
}
closeBtn.addEventListener('click', () => setOpen(false));
dialog.addEventListener('click', (e) => { if (e.target === dialog) setOpen(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.classList.contains('open')) setOpen(false); });

/** 要在 renderer.render 之後同一格呼叫，畫布內容才還在 */
export function takePhoto(src, { name, en, id, light }) {
  const W = 1000, PAD = 52, PH = W - PAD * 2, BOTTOM = 190;
  const c = document.createElement('canvas');
  c.width = W; c.height = PAD + PH + BOTTOM;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf8f2';
  g.fillRect(0, 0, c.width, c.height);

  // 從畫面中間裁一個正方形，稍微偏下，把轉台上的公仔放在中間
  const sw = src.width, sh = src.height;
  const side = Math.min(sw, sh) * 0.86;
  const sx = (sw - side) / 2, sy = Math.min(sh - side, (sh - side) / 2 + sh * 0.06);
  g.drawImage(src, sx, sy, side, side, PAD, PAD, PH, PH);
  // 相片邊緣一圈很淡的內陰影
  g.strokeStyle = 'rgba(60, 40, 30, 0.08)';
  g.lineWidth = 2;
  g.strokeRect(PAD + 1, PAD + 1, PH - 2, PH - 2);

  const d = new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  g.fillStyle = '#4a3c34';
  g.textBaseline = 'alphabetic';
  g.font = '600 46px "Noto Sans TC", "PingFang TC", sans-serif';
  g.fillText(name, PAD + 4, PAD + PH + 82);
  const nw = g.measureText(name).width;
  g.font = '500 30px "Inter Tight", system-ui, sans-serif';
  g.fillStyle = '#a3948a';
  g.fillText(en, PAD + 4 + nw + 16, PAD + PH + 82);
  g.font = '400 24px "IBM Plex Mono", ui-monospace, monospace';
  g.fillText(`${light ? light + ' · ' : ''}${date}`, PAD + 4, PAD + PH + 128);
  g.textAlign = 'right';
  g.fillStyle = '#c9b9ac';
  g.fillText("sui's playground", W - PAD - 4, PAD + PH + 128);

  const url = c.toDataURL('image/png');
  img.src = url;
  img.alt = `${name}的黏土公仔照片，${date}`;
  save.href = url;
  save.download = `clay-${id}-${date.replaceAll('.', '')}.png`;

  flash.classList.remove('go');
  void flash.offsetWidth;
  flash.classList.add('go');
  setTimeout(() => setOpen(true), 260);
}
