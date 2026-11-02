# sui's playground

收錄 three.js 範例與風格的網站，視覺沿用 sui.funkuki.com（奶油白底、Inter 800 大標、膠囊導覽與按鈕、模糊上浮的進場動畫）。

## 跑法
- `npm run dev`（預設 port 5190，見 `.claude/launch.json`）
- `npm run build` → `dist/playground/`（`base: './'`）。正式站是 sui.funkuki.com/playground，由 sui 專案的 `vercel.json` rewrites 轉到這個 Vercel 專案；本專案的 `vercel.json` 把 `/` 轉到 `/playground/`，並統一補上結尾斜線，讓相對路徑正確

## 結構
- `index.html`、`site/`：首頁（風格索引、作品列表、關於），`site/hero.js` 是 hero 的賽璐璐小島
- `site/data.js`：風格（`STYLES`）和作品（`WORKS`）資料，首頁卡片都從這裡產生
- `works/<id>/`：每個作品一頁，原始碼從 `../inspirations/` 搬過來，左上角加了回首頁的按鈕（`site/back.css`）和上一個／下一個範例（`site/work-nav.js`，順序照 `WORKS`）
- `public/site/covers/`：作品封面圖

## 新增作品
1. 在 `works/` 開資料夾，放 `index.html` 和 `src/`（`<script src="./src/main.js">` 用相對路徑），加上 `back.css`、`.lab-back` 連結和 `../../site/work-nav.js`
2. 在 `vite.config.js` 的 `input` 加入口
3. 封面放 `public/site/covers/<id>.jpg`，在 `site/data.js` 的 `WORKS` 加一筆；新風格就加到 `STYLES`
