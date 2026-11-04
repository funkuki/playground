// 和色（日本傳統色）：節氣圖鑑不用 Memphis 原本的螢光高彩度色，改用帶一點白、帶一點灰的和色，畫面比較柔和甜。
// 色碼是常見的參考值（各家色票會差一點），有幾個為了在 3D 裡分得出前後，往淡或往深調過，名字後面標「淡」「深」。
export const WA = {
  tamago: '#F8D97A',      // 卵色
  yamabuki: '#F2C26B',    // 山吹色・淡
  toki: '#F4B3C2',        // 鴇色
  nadeshiko: '#EEBBCB',   // 撫子色
  sakura: '#FBE3E6',      // 桜色
  sora: '#A0D8EF',        // 空色
  wasurenagusa: '#89C3EB',// 勿忘草色
  tsuyukusa: '#5B7FC7',   // 露草色・深
  byakuroku: '#A8D8B9',   // 白緑
  wakatake: '#68BE8D',    // 若竹色
  wakaba: '#B6D58A',      // 若葉色
  seiji: '#7EBEAB',       // 青磁色
  tokiwa: '#4E9A78',      // 常磐色・淡
  fuji: '#BBBCDE',        // 藤色
  shirafuji: '#E4DCE8',   // 白藤
  fujinezu: '#A6A5C4',    // 藤鼠
  anzu: '#F7B977',        // 杏色
  sango: '#EE836F',       // 珊瑚朱色
  akane: '#D9665B',       // 茜色・淡
  kurumi: '#B08A72',      // 胡桃色・淡
  hatoba: '#6B6283',      // 鳩羽紫・深（柱子、輪子這類深色零件）
  kinari: '#FBF6EC',      // 生成り色
  hakuji: '#FFFDF8',      // 白磁
};

// Memphis 原調色盤 → 和色。場景裡直接寫死的這些色碼也一起換
const SWAP = {
  '#FFD234': WA.tamago, '#FF7EB3': WA.toki, '#5CC8FF': WA.sora, '#5EDFB0': WA.byakuroku, '#B9A0FF': WA.fuji,
  '#FF9C6B': WA.anzu, '#2F5BFF': WA.tsuyukusa, '#FF5A5F': WA.sango, '#2FCB7A': WA.wakatake, '#14B8A0': WA.seiji,
  '#4A4468': WA.hatoba, '#A8705A': WA.kurumi, '#DCD4EE': WA.shirafuji, '#FFD36E': '#F9D58E', '#FFFFFF': WA.hakuji, '#25214A': '#4A4262',
};

// 其他色碼：彩度高的（HSV 的 S > 0.56，也就是 Memphis 的螢光色）壓到 0.46～0.55、稍微提亮；
// 本來就柔和的顏色（和色本身、粉彩、白）幾乎不變，所以同一個顏色轉兩次也不會越來越灰
const cache = new Map();
const hx = (v) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
export function wa(hex) {
  if (typeof hex !== 'string') return hex;
  const k = hex.toUpperCase();
  if (SWAP[k]) return SWAP[k];
  if (cache.has(k)) return cache.get(k);
  const n = parseInt(k.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx > 0 ? (mx - mn) / mx : 0;
  let out = k;
  if (s > 0.56) {
    // 保留色相，換掉 S、V：先把顏色拆成「最暗的分量 + 色相方向」，再依新的 S、V 組回去
    const s2 = 0.46 + (s - 0.56) * 0.2, v2 = Math.min(1, mx + (1 - mx) * 0.2);
    const f = (c) => v2 * (1 - s2 * (mx - c) / (mx - mn));
    out = '#' + hx(f(r)) + hx(f(g)) + hx(f(b));
  }
  cache.set(k, out);
  return out;
}
