import { STYLES, WORKS } from './data.js';
import { initHero } from './hero.js';

const styleById = Object.fromEntries(STYLES.map((s) => [s.id, s]));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- 風格卡：桌機是折疊卡，手機是小標籤 + 下方說明 ----------
const styleGrid = document.getElementById('style-grid');
const countOf = (id) => WORKS.filter((w) => w.styles.includes(id)).length;
const countLabel = (s) => (s.soon ? 'soon' : `${countOf(s.id)} example${countOf(s.id) > 1 ? 's' : ''}`);
const styleBody = (s) => `
  <p>${esc(s.desc)}</p>
  <span class="recipe">${s.recipe.map((r) => `<span>${esc(r)}</span>`).join('')}</span>`;
const chevron = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>`;

styleGrid.innerHTML = STYLES.map((s, i) => `
  <div class="style-card reveal${s.soon ? ' soon' : ''}" style="--i:${i % 4}" data-style="${s.id}">
    <div class="style-head">
      <button class="style-pick" type="button" ${s.soon ? 'disabled' : 'aria-pressed="false"'}>
        <span class="swatch" style="background:${s.color}">${esc(s.en[0])}</span>
        <span class="style-name"><b>${esc(s.name)}</b><small>${esc(s.en)} · ${countLabel(s)}</small></span>
      </button>
      <button class="style-toggle" type="button" aria-expanded="false" aria-controls="style-body-${s.id}"
        aria-label="展開${esc(s.name)}的說明">${chevron}</button>
    </div>
    <div class="style-body" id="style-body-${s.id}"><div>${styleBody(s)}</div></div>
  </div>`).join('');

// 手機版：點標籤後在下方顯示這個風格的說明
const styleDetail = document.createElement('div');
styleDetail.className = 'style-detail';
styleDetail.hidden = true;
styleGrid.after(styleDetail);
const narrow = matchMedia('(max-width: 680px)');

function showDetail(id) {
  const s = styleById[id];
  styleDetail.hidden = !s;
  if (!s) return;
  styleDetail.innerHTML = `
    <h3><i class="dot" style="background:${s.color}"></i>${esc(s.name)}<small>${esc(s.en)}</small></h3>
    ${styleBody(s)}
    <a class="detail-link" href="#works">看 ${countOf(s.id)} 個範例 →</a>`;
}

// ---------- 篩選 chip ----------
const filters = document.getElementById('filters');
const active = STYLES.filter((s) => !s.soon);
filters.innerHTML = [{ id: 'all', name: '全部' }, ...active]
  .map((s) => `<button class="chip" role="tab" data-filter="${s.id}" aria-selected="${s.id === 'all'}">${esc(s.name)}</button>`)
  .join('');

// ---------- 作品卡 ----------
const workGrid = document.getElementById('work-grid');
workGrid.innerHTML = WORKS.map((w, i) => `
  <a class="work-card reveal" style="--i:${i % 2}" href="${w.href}" data-styles="${w.styles.join(' ')}">
    <div class="work-cover">
      <img src="${w.cover}" alt="${esc(w.title)} ${esc(w.subtitle)} 截圖" loading="lazy" />
      ${w.preview ? `<video src="${w.preview}" muted loop playsinline preload="none" aria-hidden="true"></video>` : ''}
      <span class="play">進入範例 →</span>
    </div>
    <div class="work-meta">
      <span class="work-badge"><img src="${w.cover}" alt="" loading="lazy" /></span>
      <div>
        <h3>${esc(w.title)}<small>${esc(w.subtitle)}</small></h3>
        <div class="chips">${w.styles.map((id) => `<span class="chip"><i class="dot" style="background:${styleById[id].color}"></i>${esc(styleById[id].name)}</span>`).join('')}</div>
      </div>
    </div>
    <p class="work-desc">${esc(w.desc)}</p>
    <div class="work-tech">${w.tech.map((t) => `<span>${esc(t)}</span>`).join('')}<span>${w.date}</span></div>
  </a>`).join('');

// 滑過卡片播放預覽短片，離開就停下並倒回開頭（只在有滑鼠的裝置）
if (matchMedia('(hover: hover)').matches) {
  workGrid.querySelectorAll('.work-card').forEach((card) => {
    const video = card.querySelector('video');
    if (!video) return;
    video.addEventListener('playing', () => card.classList.add('previewing'));
    card.addEventListener('mouseenter', () => { video.play().catch(() => {}); });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('previewing');
      video.pause();
      video.currentTime = 0;
    });
  });
}

function setFilter(id) {
  filters.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.filter === id)));
  styleGrid.querySelectorAll('.style-card:not(.soon)').forEach((c) => {
    c.classList.toggle('picked', c.dataset.style === id);
    c.querySelector('.style-pick').setAttribute('aria-pressed', String(c.dataset.style === id));
  });
  showDetail(id);
  workGrid.querySelectorAll('.work-card').forEach((c) => {
    c.hidden = id !== 'all' && !c.dataset.styles.split(' ').includes(id);
  });
}
filters.addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (b) setFilter(b.dataset.filter);
});
styleGrid.addEventListener('click', (e) => {
  const toggle = e.target.closest('.style-toggle');
  if (toggle) {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', `${open ? '收合' : '展開'}${styleById[toggle.closest('.style-card').dataset.style].name}的說明`);
    toggle.closest('.style-card').classList.toggle('open', open);
    return;
  }
  const pick = e.target.closest('.style-pick:not([disabled])');
  if (!pick) return;
  // 再點一次同一個風格就取消篩選
  const id = pick.closest('.style-card').dataset.style;
  setFilter(pick.getAttribute('aria-pressed') === 'true' ? 'all' : id);
  // 手機版留在原地看說明；桌機直接跳到範例
  if (!narrow.matches) document.getElementById('works').scrollIntoView();
});

// ---------- 進場動畫 ----------
document.querySelectorAll('.hero .stagger').forEach((el, i) => {
  el.style.setProperty('--i', i * 2);
  // 用 setTimeout 而非 rAF：分頁在背景時 rAF 不會跑，內容會一直隱藏
  setTimeout(() => el.classList.add('is-in'), 60);
});
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ---------- Header：捲動標示目前區塊、捲過 hero 後縮小、手機選單 ----------
const navWrap = document.getElementById('nav-wrap');
const nav = document.getElementById('nav');
const navLinks = document.getElementById('nav-links');
const menuBtn = document.getElementById('nav-menu');
const indicator = navLinks.querySelector('.nav-indicator');
const spyLinks = [...navLinks.querySelectorAll('[data-spy]')];
const hero = document.querySelector('.hero');
let current = null;

function moveIndicator() {
  const link = spyLinks.find((a) => a.dataset.spy === current);
  indicator.style.opacity = link ? '1' : '0';
  if (!link) return;
  indicator.style.width = `${link.offsetWidth}px`;
  indicator.style.transform = `translateX(${link.offsetLeft}px)`;
}

function onScroll() {
  navWrap.classList.toggle('compact', scrollY > hero.offsetHeight * 0.6);
  // 區塊頂端越過視窗 40% 的位置就算進入
  const line = innerHeight * 0.4;
  let next = null;
  for (const a of spyLinks) {
    if (document.getElementById(a.dataset.spy).getBoundingClientRect().top <= line) next = a.dataset.spy;
  }
  if (next === current) return;
  current = next;
  spyLinks.forEach((a) => (a.dataset.spy === current ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  moveIndicator();
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', moveIndicator);
// 名稱收合時連結會跟著移動，過渡結束後再對齊一次
nav.addEventListener('transitionend', moveIndicator);
document.fonts?.ready.then(moveIndicator);
onScroll();

function setMenu(open) {
  nav.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
}
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('menu-open')));
navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setMenu(false); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
});

initHero(document.getElementById('hero-canvas'));
