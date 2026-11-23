#!/usr/bin/env python3
"""把 pixel 專案的「迷你更衣室」同步成 Others 作品頁。

來源是 ../pixel/tiny_layered_test/（由 ../pixel/tools/tiny_layered/build.py、build_pets.py 產生）。
頁面本體照抄，只加上 playground 的外框：返回按鈕、上一個／下一個、右上角 i 說明、分享用的 meta。
來源頁有改動時重跑：python3 tools/sync-mini-dressing-room.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / 'pixel' / 'tiny_layered_test'
PAGE = ROOT / 'others' / 'mini-dressing-room'
PUB = ROOT / 'public' / 'others' / 'mini-dressing-room'

TITLE = '迷你更衣室 分層像素紙娃娃 · sui\'s playground'
DESC = ('18×24 格的像素小人和 24×18 格的貓狗，拆成五張圖層疊起來換裝：膚色、眼睛、衣服、頭髮、配件。'
        '八個方向、三種視角，站立、走路、跑步都共用同一套畫格。')

HEAD = f'''<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<meta name="description" content="{DESC}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="sui's playground" />
<meta property="og:title" content="{TITLE}" />
<meta property="og:description" content="{DESC}" />
<meta property="og:url" content="https://sui.funkuki.com/playground/others/mini-dressing-room/" />
<meta property="og:image" content="https://sui.funkuki.com/playground/site/covers/mini-dressing-room.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="750" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" href="../../favicon.ico" sizes="any" />
<link rel="icon" href="../../site/logo.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="../../apple-touch-icon.png" />
<link rel="manifest" href="../../site.webmanifest" />
<meta name="theme-color" content="#cbb9dc" />
<link rel="stylesheet" href="../../site/back.css" />
'''

# playground 外框的樣式。頁面本身把所有 button 都畫成像素按鈕，這裡用 id 選擇器蓋回一般的圓鈕。
FRAME_CSS = '''
  /* ---------- playground 外框：上方留位置給返回按鈕和 i 說明 ---------- */
  body { padding-top:68px; }
  #info-btn, #info-close { border:0; border-image:none; filter:none; padding:0; display:grid; place-items:center; cursor:pointer; transform:none; }
  #info-btn { position:fixed; top:14px; right:14px; z-index:10; width:36px; height:36px; color:#4a4640;
              background:rgba(255,255,255,.88); border-radius:50%; box-shadow:0 2px 14px rgba(0,0,0,.12); transition:background .15s; }
  #info-btn:hover { background:#fff; }
  #info-btn:focus-visible, #info-close:focus-visible { outline:2px solid #a8687a; outline-offset:2px; }
  #info { position:fixed; inset:0; z-index:20; display:grid; place-items:center; padding:16px; background:rgba(60,40,70,.45);
          opacity:0; pointer-events:none; transition:opacity .2s; }
  #info.open { opacity:1; pointer-events:auto; }
  #info-panel { position:relative; width:min(560px, 100%); max-height:calc(100vh - 32px); overflow-y:auto; padding:28px 28px 24px;
                color:#3a3632; font:14px/1.75 "PingFang TC", "Noto Sans TC", system-ui, sans-serif; background:rgba(253,246,236,.94);
                -webkit-backdrop-filter:blur(14px) saturate(1.1); backdrop-filter:blur(14px) saturate(1.1);
                border:1px solid rgba(255,255,255,.7); border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,.35);
                transform:translateY(8px) scale(.98); transition:transform .2s; }
  #info.open #info-panel { transform:none; }
  #info-panel h1 { margin:0 0 2px; font-size:20px; font-weight:700; letter-spacing:.02em; text-shadow:none; }
  #info-panel .sub { margin:0 0 18px; color:#7a746c; font-size:13px; }
  #info-panel h2 { margin:20px 0 6px; font-size:13px; font-weight:700; letter-spacing:.08em; color:#a8687a; }
  #info-panel p { margin:0 0 8px; }
  #info-panel ul { margin:0; padding-left:1.2em; }
  #info-panel li { margin:2px 0; }
  #info-panel strong { font-weight:700; }
  #info-panel a { color:#a8687a; }
  #info-close { position:absolute; top:12px; right:12px; width:32px; height:32px; color:#6a6660; background:transparent; border-radius:50%; }
  #info-close:hover { background:rgba(0,0,0,.06); }
'''

FRAME_HTML = '''<body>
<a class="lab-back" href="../../#others" aria-label="回到 sui's playground 作品列表">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
  <img src="../../site/logo.svg" width="20" height="20" alt="" /><b>sui's playground</b>
</a>
<button id="info-btn" aria-label="作品說明" aria-haspopup="dialog" aria-controls="info">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
  </svg>
</button>
<div id="info" role="dialog" aria-modal="true" aria-labelledby="info-title" aria-hidden="true">
  <div id="info-panel">
    <button id="info-close" aria-label="關閉說明">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <h1 id="info-title">迷你更衣室 — 分層像素紙娃娃</h1>
    <p class="sub">Layered Pixel Paper Doll · made with Python + Canvas</p>

    <h2>這是什麼</h2>
    <p>
      一間可以幫像素小人換裝的更衣室。小人只有 18×24 格，拆成膚色、眼睛、衣服、頭髮、配件五張圖層，在衣櫃裡點一件就換一件，總共 153,600 種組合。右上角可以切到貓和狗（24×18 格，毛色、花紋、眼睛、項圈、配件，112,320 種組合）。
    </p>
    <p>
      每個角色都有八個方向和平視、斜俯視、高俯視三種視角，動作有站立、走路、跑步。最下面的大廳是隨機搭出來的 24 位。
    </p>

    <h2>靈感來源</h2>
    <p>
      <a href="https://www.threads.com/share/DrJ_poyVN" target="_blank" rel="noopener">@tinyslowlife 在 Threads 分享的像素角色作法</a>：把角色拆成膚色、眼睛、衣服、頭髮、配件五張圖層，像紙娃娃一樣疊起來；所有圖層共用 6 格走路和 8 格跑步的畫格，頭部的上下起伏直接畫進每一張圖層。這一頁照這個方法做了一個更小的版本，再加上八個方向、三種視角和貓狗。
    </p>

    <h2>操作</h2>
    <ul>
      <li>← → 轉動角色，↑ ↓ 換視角</li>
      <li>A 換下一件，B 返回上一步，Y 隨機搭配</li>
    </ul>

    <h2>作法簡介</h2>
    <ul>
      <li><strong>共用畫格</strong>：所有圖層用同一套畫格（站立 2 格、走路 6 格、跑步 8 格），走路時頭上下 1 格、跑步 2 格的起伏直接畫進每一張圖層，所以疊圖時不需要任何位移。</li>
      <li><strong>輪廓線不在圖層裡</strong>：疊完之後把整個剪影往上下左右各移一格、塗成深色墊在底下，換哪一件輪廓都會跟著外形走。</li>
      <li><strong>圖層是程式畫的</strong>：用 Python 依姿勢參數逐格畫出每一張圖層，方向和視角是參數；向左的方向是向右的鏡射。</li>
      <li><strong>貓和狗共用一副骨架</strong>：長毛貓、垂耳狗、立耳狗只差耳朵、尾巴和毛量，花紋依身體部位上色，所以每一種花紋和項圈都能套在任何一隻身上。</li>
      <li><strong>介面</strong>：像素圓角方塊是腳本產生的九宮格邊框圖，圖示和家具是文字點陣轉成的像素圖，全部以整數倍、最近鄰放大。字型是俐方體 11 號（Cubic 11，SIL OFL）。</li>
    </ul>
  </div>
</div>
'''

TAIL = '''<script type="module" src="../../site/work-nav.js"></script>
<script type="module" src="./src/info.js"></script>
</body>
</html>
'''

INFO_JS = '''// 右上角 info 圖示：打開半透明的作品說明視窗
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
dialog.addEventListener('click', (e) => { if (e.target === dialog) setOpen(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && dialog.classList.contains('open')) setOpen(false); });
'''


def cut(s, a, b):
    """回傳 s 裡 a 到 b 之間的內容（不含 a、b），找不到就報錯。"""
    i = s.index(a) + len(a)
    return s[i:s.index(b, i)]


def main():
    html = (SRC / 'index.html').read_text(encoding='utf-8')
    style = cut(html, '<style>', '</style>')
    body = html[html.index('</style>') + len('</style>'):]
    assert body.rstrip().endswith('</html>')
    body = body.rstrip()[:-len('</html>')]

    PAGE.mkdir(parents=True, exist_ok=True)
    (PAGE / 'src').mkdir(exist_ok=True)
    (PAGE / 'index.html').write_text(
        '<!doctype html>\n<html lang="zh-Hant">\n' + HEAD + '<style>' + style + FRAME_CSS + '</style>\n</head>\n'
        + FRAME_HTML + body + TAIL, encoding='utf-8')
    (PAGE / 'src' / 'info.js').write_text(INFO_JS, encoding='utf-8')

    # 圖層、資料和字型放 public，網址和頁面同一層，所以頁面裡的相對路徑不用改
    if PUB.exists():
        shutil.rmtree(PUB)
    PUB.mkdir(parents=True)
    shutil.copy2(SRC / 'data.js', PUB / 'data.js')
    shutil.copytree(SRC / 'layers', PUB / 'layers')
    shutil.copytree(SRC / 'fonts', PUB / 'fonts')
    (PUB / 'pets').mkdir()
    shutil.copy2(SRC / 'pets' / 'data.js', PUB / 'pets' / 'data.js')
    shutil.copytree(SRC / 'pets' / 'layers', PUB / 'pets' / 'layers')
    files = [p for p in PUB.rglob('*') if p.is_file() and not p.name.startswith('.')]
    print(f'{PAGE / "index.html"}\n{PUB}：{len(files)} 個檔案，{sum(p.stat().st_size for p in files) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
