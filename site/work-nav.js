// 範例頁左上角：返回按鈕旁加上「上一個／下一個範例」
import { WORKS } from './data.js';

const parts = location.pathname.split('/').filter(Boolean);
const id = parts[parts.indexOf('works') + 1];
const i = WORKS.findIndex((w) => w.id === id);
const back = document.querySelector('.lab-back');

if (i >= 0 && back) {
  const prev = WORKS[(i - 1 + WORKS.length) % WORKS.length];
  const next = WORKS[(i + 1) % WORKS.length];
  const arrow = (d) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}" /></svg>`;

  const bar = document.createElement('div');
  bar.className = 'lab-bar';
  back.replaceWith(bar);
  bar.append(back);
  bar.insertAdjacentHTML('beforeend', `
    <nav class="lab-pager" aria-label="切換範例">
      <a href="../${prev.id}/" aria-label="上一個範例：${prev.title} ${prev.subtitle}" data-tip="${prev.subtitle}">${arrow('M15 5l-7 7 7 7')}</a>
      <span aria-current="page">${i + 1} / ${WORKS.length}</span>
      <a href="../${next.id}/" aria-label="下一個範例：${next.title} ${next.subtitle}" data-tip="${next.subtitle}">${arrow('M9 5l7 7-7 7')}</a>
    </nav>`);
}
