// 作品頁左上角：返回按鈕旁加上「上一個／下一個」
// 順序是 Examples（WORKS，works/<id>/）接 Others（OTHERS，others/<id>/），首尾相接
import { WORKS, OTHERS } from './data.js';

const LIST = [
  ...WORKS.map((w) => ({ ...w, dir: 'works' })),
  ...OTHERS.map((w) => ({ ...w, dir: 'others' })),
];
const parts = location.pathname.split('/').filter(Boolean);
const at = parts.findIndex((p) => p === 'works' || p === 'others');
const i = at < 0 ? -1 : LIST.findIndex((w) => w.dir === parts[at] && w.id === parts[at + 1]);
const back = document.querySelector('.lab-back');

if (i >= 0 && back) {
  const prev = LIST[(i - 1 + LIST.length) % LIST.length];
  const next = LIST[(i + 1) % LIST.length];
  const url = (w) => `../../${w.dir}/${w.id}/`;
  const arrow = (d) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}" /></svg>`;

  const bar = document.createElement('div');
  bar.className = 'lab-bar';
  back.replaceWith(bar);
  bar.append(back);
  bar.insertAdjacentHTML('beforeend', `
    <nav class="lab-pager" aria-label="切換作品">
      <a href="${url(prev)}" aria-label="上一個：${prev.title} ${prev.subtitle}" data-tip="${prev.subtitle}">${arrow('M15 5l-7 7 7 7')}</a>
      <span aria-current="page">${i + 1} / ${LIST.length}</span>
      <a href="${url(next)}" aria-label="下一個：${next.title} ${next.subtitle}" data-tip="${next.subtitle}">${arrow('M9 5l7 7-7 7')}</a>
    </nav>`);
}
