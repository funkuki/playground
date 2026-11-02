import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// 多頁網站：首頁 + 每個作品一頁。新增作品時在 works/ 開資料夾，再把入口加到這裡。
const root = import.meta.dirname;

export default defineConfig({
  base: './',
  build: {
    // 正式站是 sui.funkuki.com/playground（由 sui 專案的 rewrites 轉過來），所以產出放在 dist/playground/
    outDir: 'dist/playground',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        'pixel-flower-shop': resolve(root, 'works/pixel-flower-shop/index.html'),
        'toon-greenhouse-cafe': resolve(root, 'works/toon-greenhouse-cafe/index.html'),
        'toon-dusk-flower-shop': resolve(root, 'works/toon-dusk-flower-shop/index.html'),
        'dog-pool': resolve(root, 'works/dog-pool/index.html'),
      },
    },
  },
});
