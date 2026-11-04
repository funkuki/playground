// 24 節氣的文字資料。順序從立春開始（傳統上一年的第一個節氣）。
// scene：有插畫的頁才有；其他頁先顯示「繪製中」的素描卡，文字照樣有。
// 三候是《逸周書．時訓解》的傳統說法（華北的觀察），tw 是在台灣這時候看得到的事。

export const SEASONS = {
  spring: { zh: '春', en: 'Spring', col: '#5EDFB0' },
  summer: { zh: '夏', en: 'Summer', col: '#FFD234' },
  autumn: { zh: '秋', en: 'Autumn', col: '#FF9C6B' },
  winter: { zh: '冬', en: 'Winter', col: '#7FB2FF' },
};

// C 是 21 世紀的「壽星公式」常數：日 = floor(Y × 0.2422 + C) − floor(L / 4)，Y 是年份後兩位
export const TERMS = [
  { id: 'lichun', zh: '立春', en: 'Start of Spring', lon: 315, m: 2, C: 3.87, season: 'spring', hou: ['東風解凍', '蟄蟲始振', '魚陟負冰'], place: '宜蘭 蘭陽平原', placeEn: 'Lanyang Plain, Yilan', teaser: '一期稻插秧前，田放滿水，像一面一面的鏡子。' },
  { id: 'yushui', zh: '雨水', en: 'Rain Water', lon: 330, m: 2, C: 18.73, season: 'spring', hou: ['獺祭魚', '鴻雁來', '草木萌動'], place: '台中 武陵農場', placeEn: 'Wuling Farm, Taichung', teaser: '山上的櫻花開了，細雨落在七家灣溪。' },
  { id: 'jingzhe', zh: '驚蟄', en: 'Awakening of Insects', lon: 345, m: 3, C: 5.63, season: 'spring', hou: ['桃始華', '倉庚鳴', '鷹化為鳩'], place: '桃園 龍潭埤塘', placeEn: 'Longtan Ponds, Taoyuan', teaser: '春雷一響，埤塘邊的青蛙開始叫。' },
  { id: 'chunfen', zh: '春分', en: 'Spring Equinox', lon: 0, m: 3, C: 20.646, season: 'spring', hou: ['玄鳥至', '雷乃發聲', '始電'], place: '台北 竹子湖', placeEn: 'Zhuzihu, Taipei', teaser: '白色的海芋田，霧從大屯山上流下來。' },
  { id: 'qingming', zh: '清明', en: 'Clear and Bright', lon: 15, m: 4, C: 4.81, season: 'spring', hou: ['桐始華', '田鼠化為鴽', '虹始見'], place: '苗栗 客家山村', placeEn: 'Hakka Village, Miaoli', teaser: '客家人「掛紙」，山坡上的墳壓著一疊疊黃紙。' },
  { id: 'guyu', zh: '穀雨', en: 'Grain Rain', lon: 30, m: 4, C: 20.1, season: 'spring', hou: ['萍始生', '鳴鳩拂其羽', '戴勝降于桑'], place: '新北 坪林', placeEn: 'Pinglin, New Taipei', teaser: '春茶採完最後一輪，雨下在北勢溪上。' },
  { id: 'lixia', zh: '立夏', en: 'Start of Summer', lon: 45, m: 5, C: 5.52, season: 'summer', hou: ['螻蟈鳴', '蚯蚓出', '王瓜生'], place: '苗栗 桐花步道', placeEn: 'Tung Blossom Trail, Miaoli', teaser: '油桐花一朵一朵落下，步道鋪成白色。' },
  { id: 'xiaoman', zh: '小滿', en: 'Grain Buds', lon: 60, m: 5, C: 21.04, season: 'summer', hou: ['苦菜秀', '靡草死', '麥秋至'], place: '屏東 東港', placeEn: 'Donggang, Pingtung', teaser: '黑鮪魚季，漁船一艘艘進港。' },
  { id: 'mangzhong', zh: '芒種', en: 'Grain in Ear', lon: 75, m: 6, C: 5.678, season: 'summer', hou: ['螳螂生', '鵙始鳴', '反舌無聲'], place: '台南 玉井', placeEn: 'Yujing, Tainan', teaser: '芒果轉紅，端午的龍舟在溪上練習。' },
  { id: 'xiazhi', zh: '夏至', en: 'Summer Solstice', lon: 90, m: 6, C: 21.37, season: 'summer', hou: ['鹿角解', '蜩始鳴', '半夏生'], place: '嘉義 北回歸線', placeEn: 'Tropic of Cancer, Chiayi', teaser: '正午太陽在頭頂，影子縮到腳底下。' },
  { id: 'xiaoshu', zh: '小暑', en: 'Minor Heat', lon: 105, m: 7, C: 7.108, season: 'summer', hou: ['溫風至', '蟋蟀居壁', '鷹始摯'], place: '澎湖 七美', placeEn: 'Qimei, Penghu', teaser: '退潮了，雙心石滬露出海面。' },
  { id: 'dashu', zh: '大暑', en: 'Major Heat', lon: 120, m: 7, C: 22.83, season: 'summer', hou: ['腐草為螢', '土潤溽暑', '大雨時行'], place: '台東 鹿野高台', placeEn: 'Luye Highland, Taitung', teaser: '清晨的熱氣球一顆顆升到縱谷上。' },
  { id: 'liqiu', zh: '立秋', en: 'Start of Autumn', lon: 135, m: 8, C: 7.5, season: 'autumn', hou: ['涼風至', '白露降', '寒蟬鳴'], place: '台南 七股鹽田', placeEn: 'Qigu Salt Fields, Tainan', teaser: '白色的鹽山，曬鹽的人把鹽耙成一堆。' },
  { id: 'chushu', zh: '處暑', en: 'End of Heat', lon: 150, m: 8, C: 23.13, season: 'autumn', hou: ['鷹乃祭鳥', '天地始肅', '禾乃登'], place: '基隆 中元祭', placeEn: 'Ghost Festival, Keelung', teaser: '放水燈一盞一盞漂向外海。' },
  { id: 'bailu', zh: '白露', en: 'White Dew', lon: 165, m: 9, C: 7.646, season: 'autumn', hou: ['鴻雁來', '玄鳥歸', '群鳥養羞'], place: '台南 麻豆', placeEn: 'Madou, Tainan', teaser: '中秋前，文旦一籃一籃從園子裡挑出來。' },
  { id: 'qiufen', zh: '秋分', en: 'Autumn Equinox', lon: 180, m: 9, C: 23.042, season: 'autumn', hou: ['雷始收聲', '蟄蟲坯戶', '水始涸'], place: '花蓮 六十石山', placeEn: 'Liushidan Mountain, Hualien', teaser: '一整片橘色的金針花開在山頂。' },
  { id: 'hanlu', zh: '寒露', en: 'Cold Dew', lon: 195, m: 10, C: 8.318, season: 'autumn', hou: ['鴻雁來賓', '雀入大水為蛤', '菊有黃華'], place: '屏東 滿州', placeEn: 'Manzhou, Pingtung', teaser: '灰面鵟鷹成群過境，傍晚落進山裡。' },
  { id: 'shuangjiang', zh: '霜降', en: "Frost's Descent", lon: 210, m: 10, C: 23.438, season: 'autumn', hou: ['豺乃祭獸', '草木黃落', '蟄蟲咸俯'], place: '新竹 新埔', placeEn: 'Xinpu, Hsinchu', teaser: '九降風吹起來，竹架上曬著一排排柿餅。' },

  {
    id: 'lidong', zh: '立冬', en: 'Start of Winter', lon: 225, m: 11, C: 7.438, season: 'winter', scene: 'lidong',
    hou: ['水始冰', '地始凍', '雉入大水為蜃'],
    houNote: ['水面開始結冰', '土地開始凍硬', '野雞不見了，海邊多了大蛤'],
    tw: '縱谷的二期稻熟了；東北季風開始吹，第一批小水鴨飛到台灣過冬。',
    place: '台東 池上', placeEn: 'Chishang, Taitung', lat: 23.1063, lng: 121.2165,
    line: '二期稻收割，白鷺跟在收割機後面', lineEn: 'Second rice harvest, egrets following the harvester',
    story: [
      '池上在花東縱谷的中段，西邊是中央山脈，東邊是海岸山脈，兩邊的山把風擋住，新武呂溪從山裡帶下乾淨的水。這裡一年種兩期稻，立冬前後正好是二期稻收割的時候。',
      '一大片金黃色的田，被收割機一格一格剃短，露出淺褐色的稻梗。收割機一開過去，白鷺就跟在後面，等著被翻出來的蟲和青蛙。伯朗大道上沒有電線桿，騎腳踏車的人一路騎到山腳。',
      '割完的田會先休息，有的撒上油菜或波斯菊的種子，等到冬天開成一片花田，再翻進土裡當肥料。',
    ],
    card: { title: '補冬補嘴空', body: '台灣人說「立冬補冬，補嘴空」。天氣轉涼，家家煮麻油雞、薑母鴨、羊肉爐，用熱湯和薑把身體暖起來，準備過冬。' },
  },
  {
    id: 'xiaoxue', zh: '小雪', en: 'Minor Snow', lon: 240, m: 11, C: 22.36, season: 'winter', scene: 'xiaoxue',
    hou: ['虹藏不見', '天氣上升地氣下降', '閉塞而成冬'],
    houNote: ['看不到彩虹了', '天上的氣往上、地上的氣往下', '天地不再相通，冬天就成了'],
    tw: '台灣平地不下雪，但西南沿海的漁民開始等烏魚。東北季風吹到嘉義海邊，蚵仔也正肥。',
    place: '嘉義 東石漁港', placeEn: 'Dongshi Fishing Harbor, Chiayi', lat: 23.4583, lng: 120.1525,
    line: '烏魚季開始，海邊曬起一排排烏魚子', lineEn: 'Mullet season begins, roe drying in rows by the sea',
    story: [
      '每年冬天，烏魚從中國沿海順著寒流往南游，到台灣西南海域產卵。漁民有句話：「小雪小到，大雪大到，冬至前後烏魚正到」。小雪一到，東石的漁船就開始出海等烏魚。',
      '捕回來的烏魚，母魚的卵取出來，用鹽醃、壓平，再放在木板上一片一片地曬，翻面、再曬，就是被叫做「烏金」的烏魚子。漁港邊的空地，冬天的陽光底下排滿了琥珀色的烏魚子。',
      '東石也是蚵仔的故鄉。港外的海面上，一排排蚵棚和浮棚漂著，退潮時，蚵農搭著膠筏出去收蚵。',
    ],
    card: { title: '烏金', body: '烏魚子要先用鹽醃、壓平，再曬四到七天，每天翻面。顏色越透亮越好。過年送禮、尾牙加菜，都少不了它。' },
  },
  {
    id: 'daxue', zh: '大雪', en: 'Major Snow', lon: 255, m: 12, C: 7.18, season: 'winter', scene: 'daxue',
    hou: ['鶡鴠不鳴', '虎始交', '荔挺出'],
    houNote: ['寒號鳥不叫了', '老虎開始求偶', '馬藺（荔）長出新芽'],
    tw: '山上的楓香開始轉紅；苗栗大湖的草莓陸續開園，一直採到春天。',
    place: '苗栗 大湖', placeEn: 'Dahu, Miaoli', lat: 24.4225, lng: 120.8642,
    line: '草莓開園，山坡上的田一壟一壟紅了', lineEn: 'Strawberry farms open, the hillside rows turn red',
    story: [
      '大湖在苗栗的山裡，四周是丘陵和河谷，冬天白天暖、晚上涼，正好是草莓喜歡的天氣。九、十月種下的苗，到了大雪前後開始結果，各家草莓園陸續開放讓人進去採。',
      '山坡上的田一層一層，每一壟高高的畦上鋪著塑膠布，綠葉底下藏著紅色的草莓。怕雨把果子打爛，很多田搭起一條條白色的遮雨棚。提著小籃子的人蹲在壟和壟之間，慢慢地找最紅的那一顆。',
      '路口有一顆大大的草莓，是大湖的地標。山上的楓香這時也開始轉紅。',
    ],
    card: { title: '為什麼草莓冬天才有', body: '草莓怕熱，長得最好的溫度大約是 15 到 25 度。台灣平地的夏天太熱，所以要等秋天種下，冬天到春天才採得到。' },
  },
  {
    id: 'dongzhi', zh: '冬至', en: 'Winter Solstice', lon: 270, m: 12, C: 21.94, season: 'winter', scene: 'dongzhi',
    hou: ['蚯蚓結', '麋角解', '水泉動'],
    houNote: ['蚯蚓縮在土裡打結', '麋鹿的角脫落', '地底的泉水開始流動'],
    tw: '一年裡夜最長的一天。冬至前後，烏魚正好游到台灣海峽；家家戶戶搓湯圓、拜祖先。',
    place: '彰化 鹿港老街', placeEn: 'Lukang Old Street, Changhua', lat: 24.0567, lng: 120.4339,
    line: '一年最長的夜，老街的燈一盞盞亮起來', lineEn: 'The longest night, lights coming on along the old street',
    story: [
      '冬至這天，太陽走到最南邊，北半球的白天最短、夜最長。過了冬至，白天就一天一天變長，所以古時候把冬至看得跟過年一樣重要，說「冬至大如年」。',
      '鹿港是清代台灣最熱鬧的港口之一，「一府二鹿三艋舺」的「鹿」就是它。老街鋪著紅磚，兩邊是窄窄長長的街屋，街尾是香火很旺的天后宮。天一暗，街屋的窗和燈籠一盞一盞亮起來，湯圓攤的鍋子冒著白煙。',
      '台灣習俗在冬至搓湯圓，紅的白的一起煮，叫「冬至圓」。老人家說，吃了湯圓就長一歲。',
    ],
    card: { title: '冬至圓', body: '冬至前一晚全家一起搓湯圓，拜過祖先和灶神再吃。以前還會把湯圓黏在門窗上，叫做「餉耗」，給家裡的小動物也吃一點。' },
  },
  {
    id: 'xiaohan', zh: '小寒', en: 'Minor Cold', lon: 285, m: 1, C: 5.4055, season: 'winter', scene: 'xiaohan',
    hou: ['雁北鄉', '鵲始巢', '雉雊'],
    houNote: ['大雁開始往北飛', '喜鵲開始築巢', '野雞叫著求偶'],
    tw: '寒流一波波南下，合歡山這時最有機會下雪。高山上的帝雉，在路邊慢慢地走。',
    place: '南投 合歡山', placeEn: 'Hehuan Mountain, Nantou', lat: 24.1374, lng: 121.2735,
    line: '寒流來了，合歡山下雪', lineEn: 'A cold front arrives, snow on Hehuan Mountain',
    story: [
      '合歡山在中央山脈上，台 14 甲線翻過海拔 3,275 公尺的武嶺，是台灣公路的最高點。小寒前後，寒流帶來的水氣遇上高山的冷空氣，就會下雪。',
      '下雪的時候，山坡上的玉山箭竹被雪蓋成一片，冷杉和鐵杉的樹梢積著白雪。上山的車要裝雪鏈，慢慢地開；山屋前有人堆雪人。山下的谷裡常常是一片雲海。',
      '帝雉（黑長尾雉）就住在這一帶的森林邊，雄鳥是深藍色的，尾巴有一條條白色的橫紋。牠們不太怕人，清晨常在路邊散步。古書說小寒「雉雊」，野雞開始叫了，在合歡山正好看得到。',
    ],
    card: { title: '台灣也會下雪', body: '台灣在亞熱帶，平地不會下雪，但三千公尺以上的高山每年冬天都有機會。合歡山因為有公路可以開上去，是大家最常去看雪的地方。' },
  },
  {
    id: 'dahan', zh: '大寒', en: 'Major Cold', lon: 300, m: 1, C: 20.12, season: 'winter', scene: 'dahan',
    hou: ['雞乳', '征鳥厲疾', '水澤腹堅'],
    houNote: ['母雞開始孵小雞', '老鷹飛得又快又猛', '湖澤的冰一直凍到中心'],
    tw: '一年最冷的時候。尾牙吃過，大家開始準備過年，迪化街的年貨大街開張了。',
    place: '台北 迪化街', placeEn: 'Dihua Street, Taipei', lat: 25.0573, lng: 121.5099,
    line: '年貨大街開張，紅燈籠掛滿老街', lineEn: 'The New Year market opens, red lanterns over the old street',
    story: [
      '大寒是二十四節氣的最後一個，也是一年最冷的時候。過完大寒就是立春，所以大寒前後，大家都在準備過年。',
      '迪化街在大稻埕，一百多年前是台北最熱鬧的貨物集散地，南北貨、中藥、布行一間挨著一間。街屋的立面有洗石子和巴洛克的山頭，一樓是遮雨的騎樓。',
      '每年農曆過年前，迪化街會辦年貨大街：整條街掛滿紅燈籠，攤子上堆著糖果、蜜餞、烏魚子、香菇和乾貨，人擠人，一路試吃過去。街上的霞海城隍廟，香客一年到頭沒斷過。',
    ],
    card: { title: '尾牙', body: '農曆十二月十六日是一年最後一次「做牙」（拜土地公），叫尾牙。老闆會請員工吃一頓，感謝這一年的辛苦，桌上常有刈包和雞。' },
  },
];

// 這個節氣在某一年的日期（台灣時間）。誤差大約一天，所以頁面上寫「約」。
export function termDate(T, year) {
  const Y = year % 100, L = T.m <= 2 ? Y - 1 : Y;
  const d = Math.floor(Y * 0.2422 + T.C) - Math.floor(L / 4);
  return new Date(year, T.m - 1, d);
}
// 從 today 起算，每個節氣「這一輪」的開始和結束：已經過完的節氣用明年的日期
export function schedule(today = new Date()) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()), y = t0.getFullYear();
  const list = TERMS.map((T, i) => {
    const n = TERMS[(i + 1) % TERMS.length];
    const range = (yy) => { const s = termDate(T, yy); let e = termDate(n, yy); if (e <= s) e = termDate(n, yy + 1); return { start: s, end: new Date(e.getTime() - 86400000) }; };
    const prev = range(y - 1);
    if (prev.start <= t0 && t0 <= prev.end) return prev;     // 例如一月初還在去年的冬至
    const r = range(y);
    return r.end < t0 ? range(y + 1) : r;
  });
  const now = list.findIndex((r) => r.start <= t0 && t0 <= r.end);
  return { list, now, today: t0 };
}
