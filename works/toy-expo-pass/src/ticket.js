// 乘車證的內容：票面資料、正面／背面／信封的 HTML。
// 背面主視覺「首班車月台」是 three.js 場景（station.js），這裡只留給它一個位置，上面再疊雷射星星和資訊。

import koko2dUrl from '../img/koko-2d.png'; // 已抵達存根上的 2D 扣扣（鐵皮印刷插畫）

export const PERSONAS = {
  invited: {
    kind: '首班車通行證', passenger: '小滿', train: '首班車', time: '18:30', date: '2027.01.23', day: 'SAT',
    seat: '07-B', no: 'TT-0123-F-0047', checkin: '18:42', transfer: '阿光',
    from: 'FROM 阿光', msg: '小滿，你抽屜裡那隻缺耳朵的小熊，這次帶去給它看看同伴吧。首班車見！',
  },
  self: {
    kind: '單程乘車證', passenger: '小滿', train: '午班車', time: '13:30', date: '2027.02.06', day: 'SAT',
    seat: '12-A', no: 'TT-0206-N-0815', checkin: '13:47', transfer: null,
    from: 'FROM 站長 扣扣', msg: '你的玩具在月台等你喔。記得帶它一起來，我會幫你剪票！',
  },
};

const C = { paper: '#F6EFE2', kraft: '#E9DCC4', red: '#E2483A', blue: '#2F5DA8', mustard: '#E9B53C', ink: '#1E2A44', violet: '#6B4E9B' };

const postmark = (top, bottom, color = 'currentColor') => `<svg viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="${color}" stroke-width="3.2" stroke-dasharray="44 3 70 5 30 4"/>
  <circle cx="50" cy="50" r="33" fill="none" stroke="${color}" stroke-width="2"/>
  <path d="M20 50 h60" stroke="${color}" stroke-width="1.6"/>
  <text x="50" y="44" text-anchor="middle" font-family="Noto Sans TC, sans-serif" font-size="12" font-weight="900" fill="${color}">${top}</text>
  <text x="50" y="64" text-anchor="middle" font-family="Inter, Noto Sans TC, sans-serif" font-size="10.5" font-weight="600" fill="${color}">${bottom}</text></svg>`;

// 假 QR code（固定亂數，掃不出東西）
function qrSVG(seed) {
  let s = seed, cells = '';
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="${C.kraft}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    if (!inFinder && rnd() > 0.5) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="-1 -1 23 23" shape-rendering="crispEdges" fill="${C.ink}" aria-label="QR code（展示用假資料）" role="img">${cells}${finder(0, 0)}${finder(14, 0)}${finder(0, 14)}</svg>`;
}

// ---------- 正面 ----------
export function frontHTML(p) {
  const md = p.date.slice(5);
  return `
  <div class="stamp">
    <div class="perf"></div>
    <div class="art"></div>
    <div class="postmark">${postmark('汐見港', md)}</div>
  </div>
  <div class="info">
    <div class="vtitle"><b>TOY TRANSIT</b><span>玩具轉運站</span></div>
    <div class="fields">
      <div class="f"><small>FROM</small><div>抽屜 No.0123</div></div>
      <div class="f"><small>TO</small><div>汐見港 B7</div></div>
      <div class="f wide"><small>PASSENGER</small><div>${p.passenger}</div></div>
      <div class="rail"></div>
      <div class="f"><small>GATE</small><div>A → D</div></div>
      <div class="f"><small>SEAT</small><div>${p.seat}</div></div>
      <div class="f"><small>DATE</small><div>${p.date}</div></div>
      <div class="f"><small>TRAIN</small><div>${p.train} ${p.time}</div></div>
      ${p.transfer
        ? `<div class="f wide transfer"><small>TRANSFER FROM</small><div>↪ ${p.transfer}</div></div>`
        : `<div class="f wide"><small>PASS</small><div>${p.kind}</div></div>`}
    </div>
  </div>
  <div class="stub">
    <div class="stub-head"><b>BOARDING PASS</b><span>${p.no}</span></div>
    <div class="qr">${qrSVG(parseInt(p.no.slice(-4), 10))}
      <div class="void">已核銷<br><span>${md} ${p.checkin}</span></div>
      <div class="memento"><img src="${koko2dUrl}" alt=""><b>已抵達</b><span>THANK YOU</span></div>
    </div>
    <div class="stub-time">${md} ${p.day}<br>${p.time} ${p.train}</div>
  </div>
  <div class="holo"></div>
  <div class="glare"></div>
  <div class="flash"></div>
  <div class="arrive-mark">${postmark('已抵達', 'TOY TRANSIT')}</div>`;
}

// ---------- 背面：首班車月台主視覺＋資訊 ----------
export function backHTML(p, portrait) {
  return `
  <div class="kv">
    <div class="layer l0"></div>
    <div class="scene"></div>
    <div class="layer l5" style="--d:30;--spark:url(&quot;${sparks(portrait)}&quot;)"></div>
  </div>
  <header class="kv-title"><b>TOY TRANSIT</b><span>玩具轉運站</span><small>2027.01.24 — 02.14・汐見港</small></header>
  <div class="mini-stamp"><span class="disc">D</span><div class="mini-mark">${postmark('已抵達', p.date.slice(5), C.violet)}</div></div>
  <div class="tag">
    <svg class="string" viewBox="0 0 60 40" aria-hidden="true"><path d="M6 34 C 20 30, 30 8, 58 4" fill="none" stroke="${C.red}" stroke-width="2"/></svg>
    <small>${p.from}</small><p>${p.msg}</p>
  </div>
  <div class="board">
    <span><em>PASSENGER</em>${p.passenger}</span><span><em>TRAIN</em>${p.train} ${p.date.slice(5)} ${p.time}</span>
    <span><em>SEAT</em>${p.seat}</span><span><em>PLATFORM</em>汐見港 潮汐倉庫 B7</span>
  </div>
  <div class="glare"></div>`;
}

export function envelopeHTML(p) {
  return {
    front: `<svg class="folds" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="env-side-l" x1="0" x2="1"><stop offset="0" stop-color="#8a6a3c" stop-opacity=".2"/><stop offset="1" stop-color="#8a6a3c" stop-opacity=".04"/></linearGradient>
          <linearGradient id="env-side-r" x1="1" x2="0"><stop offset="0" stop-color="#8a6a3c" stop-opacity=".16"/><stop offset="1" stop-color="#8a6a3c" stop-opacity=".03"/></linearGradient>
          <linearGradient id="env-bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8ea" stop-opacity=".55"/><stop offset="1" stop-color="#fff8ea" stop-opacity="0"/></linearGradient>
          <filter id="env-blur" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation=".9"/></filter>
        </defs>
        <path d="M0 34 L50 66 L0 100 Z" fill="url(#env-side-l)"/>
        <path d="M100 34 L50 66 L100 100 Z" fill="url(#env-side-r)"/>
        <path d="M0 101 L50 70 L100 101 Z" transform="translate(0 -1.6)" fill="#5a4021" opacity=".22" filter="url(#env-blur)"/>
        <path d="M0 101 L50 72 L100 101 Z" fill="#E8D9BD"/>
        <path d="M0 101 L50 72 L100 101 Z" fill="url(#env-bottom)"/>
        <path d="M0 100 L50 72 L100 100" fill="none" stroke="#fffaf0" stroke-opacity=".7" stroke-width=".9" vector-effect="non-scaling-stroke"/>
        <path d="M0 34 L50 66 L100 34" fill="none" stroke="#fffaf0" stroke-opacity=".75" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
      </svg>
      <div class="addr"><small>TO</small><b>${p.passenger}</b><span>${p.kind}・在裡面</span></div>
      <div class="env-mark">${postmark('汐見港', '2027')}</div>
      <div class="env-stamp"><span class="disc">A</span></div>`,
    seal: sealSVG(),
  };
}

// 封蠟：不規則的蠟緣、中間壓下去的扣扣頭像（凹印）、表面反光
function sealSVG() {
  const head = `<rect x="47" y="25" width="9" height="24" rx="4.5" transform="rotate(-8 51 44)"/><rect x="64" y="27" width="9" height="23" rx="4.5" transform="rotate(20 68 46)"/><circle cx="60" cy="62" r="15"/>`;
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <filter id="wax-edge" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="7" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="10" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="wax-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>
      <filter id="wax-softer" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="wax-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3"/>
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .18 0"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
      <radialGradient id="wax-body" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="#F27566"/><stop offset=".42" stop-color="#D93A2C"/><stop offset=".85" stop-color="#9C2118"/><stop offset="1" stop-color="#7E1810"/></radialGradient>
      <radialGradient id="wax-well" cx="58%" cy="62%" r="70%"><stop offset="0" stop-color="#D23527"/><stop offset="1" stop-color="#A9281D"/></radialGradient>
      <linearGradient id="wax-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB1A4" stop-opacity=".9"/><stop offset=".5" stop-color="#E04636" stop-opacity="0"/><stop offset="1" stop-color="#5E0F0A" stop-opacity=".7"/></linearGradient>
      <clipPath id="wax-clip"><circle cx="60" cy="60" r="35"/></clipPath>
    </defs>
    <g filter="url(#wax-edge)">
      <circle cx="60" cy="60" r="49" fill="url(#wax-body)"/>
      <ellipse cx="99" cy="74" rx="11" ry="9" fill="url(#wax-body)"/>
      <ellipse cx="24" cy="93" rx="9" ry="7.5" fill="url(#wax-body)"/>
      <ellipse cx="80" cy="13" rx="8" ry="6" fill="url(#wax-body)"/>
    </g>
    <circle cx="60" cy="60" r="38" fill="none" stroke="url(#wax-rim)" stroke-width="5"/>
    <circle cx="60" cy="60" r="35" fill="url(#wax-well)"/>
    <g clip-path="url(#wax-clip)">
      <circle cx="60" cy="60" r="35" fill="none" stroke="#5E0F0A" stroke-opacity=".55" stroke-width="7" transform="translate(-2 -2.5)" filter="url(#wax-soft)"/>
      <circle cx="60" cy="60" r="35" fill="none" stroke="#FF9C8C" stroke-opacity=".35" stroke-width="5" transform="translate(2.5 3)" filter="url(#wax-soft)"/>
      <g fill="#FF9F90" opacity=".55" transform="translate(1.3 1.5)" filter="url(#wax-soft)">${head}</g>
      <g fill="#5E0F0A" opacity=".6" transform="translate(-1.1 -1.3)" filter="url(#wax-soft)">${head}</g>
      <g fill="#BF2E22">${head}</g>
      <circle cx="54" cy="62" r="2.2" fill="#6E140E" opacity=".75"/><circle cx="66" cy="62" r="2.2" fill="#6E140E" opacity=".75"/>
      <path d="M57 68 q3 3 6 0" fill="none" stroke="#6E140E" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <circle cx="60" cy="60" r="49" fill="#000" filter="url(#wax-grain)" opacity=".9"/>
    <ellipse cx="38" cy="30" rx="15" ry="6.5" transform="rotate(-32 38 30)" fill="#fff" opacity=".42" filter="url(#wax-soft)"/>
    <ellipse cx="33" cy="38" rx="3" ry="1.6" transform="rotate(-40 33 38)" fill="#fff" opacity=".7"/>
    <ellipse cx="88" cy="90" rx="9" ry="3" transform="rotate(-38 88 90)" fill="#fff" opacity=".14" filter="url(#wax-softer)"/>
  </svg>`;
}

// ---------- 背面：雷射星星與碎紙的遮罩（疊在 3D 月台上） ----------
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function sparks(portrait) {
  const W = portrait ? 500 : 1200, H = portrait ? 950 : 500;
  const r = seeded(portrait ? 11 : 7);
  let sp = '';
  for (let i = 0; i < (portrait ? 26 : 34); i++) {
    const x = r() * W, y = r() * H, s = 4 + r() * 9;
    sp += r() > 0.35
      ? `<path transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${(s / 10).toFixed(2)})" d="M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4Z"/>`
      : `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s / 4).toFixed(1)}"/>`;
  }
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${sp}</svg>`);
}
