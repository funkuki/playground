# sui's playground

收錄 three.js 範例與風格的網站，視覺沿用 sui.funkuki.com（奶油白底、Inter 800 大標、膠囊導覽與按鈕、模糊上浮的進場動畫）。

## 跑法
- `npm run dev`（預設 port 5190，見 `.claude/launch.json`）
- `npm run build` → `dist/playground/`（`base: './'`）。正式站是 sui.funkuki.com/playground，由 sui 專案的 `vercel.json` rewrites 轉到這個 Vercel 專案；本專案的 `vercel.json` 把 `/` 轉到 `/playground/`，並統一補上結尾斜線，讓相對路徑正確

## 結構
- `index.html`、`site/`：首頁（風格索引、作品列表、關於），`site/hero.js` 是 hero 的賽璐璐小島
- Examples 和 Others 各自超過 10 篇會分頁（`site/main.js` 的 `PER_PAGE`），依風格篩選後的篇數也一樣分頁
- `site/data.js`：風格（`STYLES`）、three.js 作品（`WORKS`）和非 three.js 作品（`OTHERS`）資料，首頁卡片都從這裡產生
- `works/<id>/`：每個作品一頁，原始碼從 `../inspirations/` 搬過來，左上角加了回首頁的按鈕（`site/back.css`）和上一個／下一個（`site/work-nav.js`，順序是 `WORKS` 接 `OTHERS`）
- `others/<id>/`：Others 區塊的作品頁（不是 three.js 做的：影片、SVG、其他工具渲染的實驗），大檔案（影片）放在 `public/others/<id>/`
- `public/site/covers/`：作品封面圖（1200×750 或 1600×1000，16:10）；`public/site/previews/`：滑過卡片時播的預覽短片

## 新增作品
1. 在 `works/` 開資料夾，放 `index.html` 和 `src/`（`<script src="./src/main.js">` 用相對路徑），加上 `back.css`、`.lab-back` 連結和 `../../site/work-nav.js`
2. 在 `vite.config.js` 的 `input` 加入口
3. 封面放 `public/site/covers/<id>.jpg`，在 `site/data.js` 的 `WORKS` 加一筆；新風格就加到 `STYLES`

## 新增 Others 作品（非 three.js）
1. 在 `others/<id>/` 放 `index.html`（一樣加 `back.css`、`.lab-back`、`../../site/work-nav.js` 和右上角 i 說明），影片等大檔放 `public/others/<id>/`
2. 在 `vite.config.js` 的 `input` 加 `'others/<id>'` 入口
3. 封面和預覽短片放 `public/site/covers/`、`public/site/previews/`，在 `site/data.js` 的 `OTHERS` 加一筆（`tool` 是卡片上「made with」標出的工具）

`others/mini-dressing-room/` 是從 `../pixel/tiny_layered_test/` 同步過來的（頁面加上 playground 外框，圖層和字型放 `public/others/mini-dressing-room/`）。來源有改動時重跑 `python3 tools/sync-mini-dressing-room.py`，不要直接改這兩個資料夾。封面和預覽短片用 `node --experimental-websocket tools/record-mini-dressing-room.mjs` 重錄（要先讓來源頁在 localhost:8781 跑起來）。
