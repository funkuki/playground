// 右上角 info 圖示：打開半透明的作品說明視窗

const btn = document.getElementById('info-btn');
const dialog = document.getElementById('info');
const closeBtn = document.getElementById('info-close');

function setOpen(open) {
  dialog.classList.toggle('open', open);
  dialog.setAttribute('aria-hidden', String(!open));
  (open ? closeBtn : btn).focus();
}

btn.addEventListener('click', () => setOpen(true));
closeBtn.addEventListener('click', () => setOpen(false));
// 點視窗外的半透明背景也會關
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) setOpen(false);
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dialog.classList.contains('open')) setOpen(false);
});
