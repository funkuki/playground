#!/usr/bin/env python3
"""把 pixel 專案的「迷你牧場」和「迷你更衣室」同步成 Others 作品頁 others/mini-farm/。

來源是 ../pixel/tiny_layered_test/（圖層由 ../pixel/tools/tiny_layered/build.py、build_pets.py 產生）：
  farm.html  → others/mini-farm/index.html           主畫面，等角視角的牧場
  index.html → others/mini-farm/dressing-room.html   從牧場右上角的按鈕或農舍門口進去
頁面本體照抄，只改兩頁之間的連結，再加上 playground 的外框：返回按鈕、上一個／下一個、右上角 i 說明、分享用的 meta。
舊網址 others/mini-dressing-room/ 留一頁轉址到更衣室。
來源頁有改動時重跑：python3 tools/sync-mini-farm.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / 'pixel' / 'tiny_layered_test'
PAGE = ROOT / 'others' / 'mini-farm'
PUB = ROOT / 'public' / 'others' / 'mini-farm'
OLD = ROOT / 'others' / 'mini-dressing-room'

FARM_TITLE = '迷你牧場 等角像素小農場 · sui\'s playground'
FARM_DESC = ('等角視角的像素小牧場：農舍、菜園、圍著柵欄的牧場和池塘。操作 18×24 格的像素小人走動、採收、摸摸動物，'
             '到農舍的迷你更衣室換裝，換好的造型會帶回牧場。')
ROOM_TITLE = '迷你更衣室 分層像素紙娃娃 · sui\'s playground'
ROOM_DESC = ('18×24 格的像素小人和 24×18 格的貓狗，拆成五張圖層疊起來換裝：膚色、眼睛、衣服、頭髮、配件。'
             '八個方向、三種視角，站立、走路、跑步都共用同一套畫格。')


def head(title, desc, path, theme):
    return f'''<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="sui's playground" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="https://sui.funkuki.com/playground/others/mini-farm/{path}" />
<meta property="og:image" content="https://sui.funkuki.com/playground/site/covers/mini-farm.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="750" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" href="../../favicon.ico" sizes="any" />
<link rel="icon" href="../../site/logo.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="../../apple-touch-icon.png" />
<link rel="manifest" href="../../site.webmanifest" />
<meta name="theme-color" content="{theme}" />
<link rel="stylesheet" href="../../site/back.css" />
'''

# playground 外框的樣式。頁面本身把所有 button 都畫成像素按鈕，這裡用 id 選擇器蓋回一般的圓鈕。
FRAME_CSS = '''
  /* ---------- playground 外框 ---------- */
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

ROOM_CSS = '''
  body { padding-top:68px; }   /* 上方留位置給返回按鈕和 i 說明 */
'''

# 牧場是滿版的畫布，把左上、右上的介面往下移，讓出返回按鈕和 i 說明的位置
FARM_CSS = '''
  #tl, #tr { top:64px; }
'''

FRAME_TOP = '''<body>
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
'''

ROOM_INFO = '''    <h1 id="info-title">迷你更衣室 — 分層像素紙娃娃</h1>
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
'''

FARM_INFO = '''    <h1 id="info-title">迷你牧場 — 等角像素小農場</h1>
    <p class="sub">Isometric Pixel Farm · made with Python + Canvas</p>

    <h2>這是什麼</h2>
    <p>
      一座等角視角的像素小牧場，有農舍、水井、菜園、圍著柵欄的牧場和池塘。操作一個 18×24 格的像素小人在裡面走動，後面跟著一隻狗或貓。
    </p>
    <p>
      菜園裡的紅蘿蔔、高麗菜、番茄和南瓜會慢慢長大，成熟了可以採收換金幣。右上角的按鈕或農舍門口可以進<strong>迷你更衣室</strong>幫小人和寵物換裝，換好的造型會帶回牧場。
    </p>

    <h2>靈感來源</h2>
    <p>
      小人的做法來自 <a href="https://www.threads.com/share/DrJ_poyVN" target="_blank" rel="noopener">@tinyslowlife 在 Threads 分享的像素角色作法</a>：把角色拆成膚色、眼睛、衣服、頭髮、配件五張圖層，像紙娃娃一樣疊起來，所有圖層共用同一套走路和跑步的畫格。詳細說明在更衣室那一頁的 i 裡。
    </p>

    <h2>操作</h2>
    <ul>
      <li>方向鍵或 WASD 移動，按住 Shift 跑步；也可以點地面讓小人走過去</li>
      <li>空白鍵：採收成熟的作物、摸摸動物、在農舍門口進更衣室（靠近時下方會出現提示，也可以直接點）</li>
    </ul>

    <h2>作法簡介</h2>
    <ul>
      <li><strong>等角地圖</strong>：一格地磚是 32×16 的菱形。草地、泥土路、菜園和池塘是逐像素算出來的一整張底圖。</li>
      <li><strong>同一種像素大小</strong>：場景和小人用同樣大小的像素，小人以 1:1 放進去，整個畫面一起以整數倍、最近鄰放大。</li>
      <li><strong>物件是程式畫的</strong>：樹、柵欄、水井、作物、綿羊和小雞都是用矩形和橢圓畫在小畫布上，再加一圈輪廓線；農舍是把牆面和屋頂逐點投影到畫面上。</li>
      <li><strong>前後遮擋</strong>：每一格把物件依深度由遠到近畫。農舍佔了好幾格，所以分成農舍後面的、農舍、農舍前面的三段。</li>
      <li><strong>移動</strong>：固定每 1/60 秒走一步，每步剛好移動整數個像素；鏡頭直接跟著小人取整後的位置，所以捲動時不會抖。</li>
      <li><strong>共用造型</strong>：小人用更衣室斜俯視那一組圖層，造型存在瀏覽器裡，兩頁讀同一份。</li>
    </ul>
'''

FRAME_END = '''  </div>
</div>
'''

TAIL = '''<script type="module" src="../../site/work-nav.js"></script>
<script type="module" src="./src/info.js"></script>
</body>
</html>
'''

# 舊網址（這件作品原本叫 mini-dressing-room）轉到更衣室
REDIRECT = '''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex" />
<meta http-equiv="refresh" content="0; url=../mini-farm/dressing-room.html?from=farm" />
<link rel="canonical" href="https://sui.funkuki.com/playground/others/mini-farm/dressing-room.html" />
<title>迷你更衣室 · sui's playground</title>
</head>
<body>
<p><a href="../mini-farm/dressing-room.html?from=farm">迷你更衣室搬到迷你牧場裡了</a></p>
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


def split(html):
    """把來源頁拆成 <style> 的內容和 </style> 之後、</html> 之前的內容。"""
    style = cut(html, '<style>', '</style>')
    body = html[html.index('</style>') + len('</style>'):].rstrip()
    assert body.endswith('</html>')
    return style, body[:-len('</html>')]


def swap(s, a, b):
    """把 s 裡唯一的一處 a 換成 b；來源頁改了、找不到時直接報錯。"""
    assert s.count(a) == 1, a
    return s.replace(a, b)


def page(src, head_html, css, info):
    style, body = split(src)
    return ('<!doctype html>\n<html lang="zh-Hant">\n' + head_html + '<style>' + style + FRAME_CSS + css + '</style>\n</head>\n'
            + FRAME_TOP + info + FRAME_END + body + TAIL)


def main():
    farm = (SRC / 'farm.html').read_text(encoding='utf-8')
    room = (SRC / 'index.html').read_text(encoding='utf-8')
    # 兩頁之間的連結：牧場是資料夾的首頁，更衣室是 dressing-room.html；這裡的更衣室一定是從牧場進來的，所以「回牧場」一直顯示
    farm = swap(farm, 'href="index.html?from=farm"', 'href="dressing-room.html?from=farm"')
    room = swap(room, 'id="tofarm" href="farm.html" hidden>', 'id="tofarm" href="./">')

    PAGE.mkdir(parents=True, exist_ok=True)
    (PAGE / 'src').mkdir(exist_ok=True)
    (PAGE / 'index.html').write_text(page(farm, head(FARM_TITLE, FARM_DESC, '', '#2f6a48'), FARM_CSS, FARM_INFO), encoding='utf-8')
    (PAGE / 'dressing-room.html').write_text(
        page(room, head(ROOM_TITLE, ROOM_DESC, 'dressing-room.html', '#cbb9dc'), ROOM_CSS, ROOM_INFO), encoding='utf-8')
    (PAGE / 'src' / 'info.js').write_text(INFO_JS, encoding='utf-8')

    OLD.mkdir(parents=True, exist_ok=True)
    (OLD / 'index.html').write_text(REDIRECT, encoding='utf-8')

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
