# TOY TRANSIT 生成 Prompt

這份是站長扣扣和乘車證背面主視覺的生成 prompt。prompt 本文用英文寫，因為圖像模型對英文的顏色、材質、構圖詞比較穩定；每段前面用中文說明用途和注意事項。

流程：

1. 用 GPT 和 Gemini 生成扣扣（§1、§2），選出滿意的版本當「定稿」。
2. 用定稿的扣扣當參考圖，生成轉 3D 用的圖（§3），丟進 Tripo 或 Meshy 轉成 GLB。
3. 用 GPT 和 Gemini 生成主視覺分層元素（§4～§9），再把滿意的結果當風格參考，到 Midjourney 生成比較（§10）。
4. 把素材交給我，我來把它們排進乘車證的背面，做成可以視差傾斜的分層主視覺。

---

## 共用風格段落

每個 2D prompt 都已經包含這一段，只是先抽出來方便你調整。改這段等於改整套系統的風格。

```
Style: vintage tin toy lithograph print. Flat color fills only, limited palette: tomato red (#E2483A), tin blue (#2F5DA8), mustard yellow (#E9B53C), deep navy (#1E2A44) for all linework, cream paper (#F6EFE2) for light areas. Slight print misregistration: the color fills are offset 1–2 px from the navy linework. Shading is done with small round halftone dots, never gradients. Very subtle worn-paint scratches on edges. Clean, friendly, mid-century toy packaging feeling.
```

---

## 1. 扣扣・角色設定圖（GPT）

用途：先把扣扣的長相定下來。這張會是之後所有圖的參考圖。
建議尺寸：1024 × 1024（正方形）。生成後如果某個部位不對，直接在同一個對話裡說「保持其他一樣，只把耳朵改長一點」這樣修改，GPT 比較能維持角色的一致。

```
Character design for an original mascot named KOKO, the stationmaster of a toy exhibition called "Toy Transit".

KOKO is a small wind-up tin toy rabbit. Proportions: chibi, two heads tall — the round head is the same size as the body. Two long, upright, rounded ears, each about as tall as the head; the inner ear is cream. Body is tin blue (#2F5DA8) with a cream (#F6EFE2) oval belly panel held on by four tiny rivets. Visible tin seam lines run down both sides of the body like a pressed metal toy. Short stubby arms and two stubby feet.

Face: only two small solid navy dot eyes set wide apart and a tiny short curved smile. No nose, no eyebrows, no blush, no highlights in the eyes.

Wearing an oversized tomato red (#E2483A) stationmaster cap that sits slightly crooked between the ears, with a short navy visor and a round mustard yellow (#E9B53C) badge shaped like a wind-up key. A brass-colored wind-up key sticks out of its back. Holding a mustard yellow ticket punch in its right hand, slightly raised, as if about to punch a ticket. Expression: cheerful, a little clumsy.

Style: vintage tin toy lithograph print. Flat color fills only, limited palette: tomato red (#E2483A), tin blue (#2F5DA8), mustard yellow (#E9B53C), deep navy (#1E2A44) for all linework, cream paper (#F6EFE2) for light areas. Slight print misregistration: the color fills are offset 1–2 px from the navy linework. Shading is done with small round halftone dots, never gradients. Very subtle worn-paint scratches on edges.

Composition: full body, front view, centered, standing, plenty of margin. Plain solid cream (#F6EFE2) background, no scenery, no ground shadow. Do not add any text, letters, logos or numbers.
```

🎯 Target：ChatGPT（GPT 圖像）💡 把比例、五官、配件、顏色都寫成可以檢查的具體條件，避免模型自己加腮紅、高光眼這類讓角色變得太「可愛貼圖」的細節。

---

## 2. 扣扣・角色設定圖（Gemini）

用途：同 §1，給 Gemini 試做。Gemini 對「參考圖＋修改」很強，第二輪起可以把 GPT 版或自己喜歡的版本貼進去，說「照這張的角色，改成……」。
內容跟 §1 一樣，但把限制寫得更前面，因為 Gemini 比較容易漂移到 3D 渲染風或加上文字。

```
Create a flat 2D illustration, NOT a 3D render. No text anywhere in the image.

Subject: KOKO, an original mascot — a small wind-up tin toy rabbit who works as a train stationmaster.
- Proportions: chibi, two heads tall; round head the same size as the body.
- Ears: two long upright rounded ears, each as tall as the head, cream inner ear.
- Body: tin blue (#2F5DA8), cream (#F6EFE2) oval belly panel with four tiny rivets, tin seam lines down both sides, short stubby arms and feet.
- Face: only two small solid navy dot eyes, wide apart, and a tiny curved smile. No nose, no blush, no eye highlights.
- Cap: oversized tomato red (#E2483A) stationmaster cap, slightly crooked, short navy visor, round mustard (#E9B53C) badge shaped like a wind-up key.
- Props: brass wind-up key on its back; mustard ticket punch held up in the right hand.

Style: vintage tin toy lithograph print. Flat color fills in only these colors: tomato red, tin blue, mustard yellow, deep navy (#1E2A44) linework, cream. Color fills slightly offset from the linework like a misregistered print. Halftone dots for shading, no gradients. Subtle worn-paint scratches.

Composition: full body, front view, centered, generous margin, plain solid cream background, no ground shadow.
```

🎯 Target：Gemini（Nano Banana）💡 開頭先鎖住「2D、不要文字」，再用條列列出角色規格，讓 Gemini 不容易漏掉配件或跑成 3D 風格。

---

## 3. 扣扣・轉 3D 用（GPT 或 Gemini → Tripo / Meshy）

用途：Tripo 和 Meshy 從圖片推測立體形狀，所以這張要像「一隻真實存在的玩具的產品照」，而不是插畫。
**一定要附上定稿的扣扣當參考圖**再貼這段。

給 three.js 用的幾個建模考量，已經寫進 prompt：
- **發條鑰匙不要生成**：之後我在 three.js 用獨立的物件做，可以讓它一直轉。
- **剪票鉗要黏在手上**、手臂不要太細，否則轉出來容易斷掉或變成浮空碎片。
- **A-pose、手臂離開身體**：方便之後加骨架讓它揮手、走路。
- **耳朵要有厚度**：太薄會在模型上破洞。

### 3a. 正面產品照（單張圖轉 3D）

```
Using the attached character as the exact design reference, create a product photo of KOKO as a real physical collectible toy.

Material: painted pressed tin with a satin finish, slightly rounded edges, visible tin seam lines down the sides, four small rivets on the cream belly panel. The colors and face must match the reference exactly: tin blue body, cream belly and inner ears, tomato red stationmaster cap with mustard key-shaped badge, navy dot eyes and tiny smile.

Pose: A-pose — standing straight, feet slightly apart, both arms held out about 30 degrees away from the body so there is clear empty space between the arms and torso. The mustard ticket punch is held in the right hand and is fused solidly to the hand. Ears are thick and solid, standing straight up.

Important: do NOT include the wind-up key on the back. Keep the silhouette simple and solid, with no thin floating parts.

Camera: front view, eye level, orthographic-looking, full body centered, small margin. Lighting: soft even studio light, no strong highlights, no reflections of the room. Background: plain pure white, no ground shadow, no props, no text.
```

### 3b. 三視圖（多視角轉 3D）

Tripo 和 Meshy 都支援用多張不同角度的圖轉 3D，背面和側面會準很多。生成後把四個角度裁成四張圖分別上傳。

```
Using the attached character as the exact design reference, create a character turnaround sheet of KOKO as a real physical painted tin toy.

Show four views in one row, same scale, feet aligned on the same baseline, evenly spaced with clear gaps: front, left side, back, three-quarter front-right. Same A-pose in every view: arms held out 30 degrees from the body, ticket punch fused to the right hand, ears thick and upright. No wind-up key on the back — the back is a smooth tin panel with a seam line and one small round hole where a key would go.

Material: satin painted pressed tin, slightly rounded edges, rivets on the belly panel. Colors and face exactly as the reference.

Camera: orthographic views, eye level. Soft even studio lighting. Plain pure white background, no shadows, no labels, no text, no grid lines.
```

🎯 Target：GPT／Gemini 生圖，再進 Tripo／Meshy 圖轉 3D 💡 把會讓 3D 轉換失敗的東西（浮空細件、貼身的手臂、看不到的背面）一開始就排除，並把會動的部件留給 three.js。

**轉 3D 的設定建議**
- Tripo：用 Multiview（四張）或單圖，開啟「Texture」和「PBR」，面數選中等（約 2～5 萬面就夠網頁用）。
- Meshy：Image to 3D，Topology 選 Quad，Target Polycount 約 3 萬，勾選 PBR。
- 輸出格式選 **GLB**，交給我時一起附上你最滿意的那張參考圖，我會拿它校正材質顏色。

---

## 4～9. 乘車證背面：主視覺分層元素

> **已停用（2026/11/04）**：背面改成 3D 的「首班車月台」場景，不再用抽屜和 2D 分層。素材是 sui 用 Gemini 生成的單一物件白底圖：`platform2.png`、`train.png`、`passengerA.png`、`passenger B.png`，放在 `inspirations/retro toy idea/`，再用 Tripo 轉成 GLB。做法見 [PLAN.md](PLAN.md) B3。以下保留原本的分層 prompt 當紀錄。

背面會做成一張完整的「抽屜月台」主視覺。我會把每個元素放在不同深度，票傾斜時前後層移動的距離不同，看起來像一個立體的抽屜。所以每個元素要**分開生成、背景乾淨**，方便我去背。

**背景的處理**
- GPT：可以直接說「transparent background」，會輸出透明 PNG。
- Gemini：不支援透明背景，所以 prompt 裡寫的是純白底。之後去背，或交給我處理。
- 背面的比例是 2.4 : 1（橫式），所以抽屜底座要生成橫的。GPT 最寬是 3:2，Gemini 和 Midjourney 可以到 21:9。

**圖層順序（由後到前）**

| 圖層 | 元素 | 對應段落 | 視差深度 |
| --- | --- | --- | --- |
| L0 | 紙紋網點底 | §9 | 最遠，不動 |
| L1 | 抽屜底座＋軌道 | §4 | 遠 |
| L2 | 四個月台的玩具 | §5 | 中 |
| L3 | 月台小物（號誌桿、長椅、站牌、郵筒） | §6 | 中前 |
| L4 | 扣扣剪票（2D 版） | §7 | 前 |
| L5 | 雷射星星與碎紙 | §8 | 最前 |

票面上的文字（展名、日期、手寫訊息、郵戳）由我用網頁文字疊上去，所以**所有元素都不要生成文字**。

### 4. L1 抽屜底座＋軌道

```
Top-down flat illustration of an open wooden drawer seen from directly above, used as a miniature train station.

The drawer is wide and shallow, warm honey-brown wood with a navy outline. Inside it is divided by thin wooden walls into four compartments in a row, left to right. Each compartment floor is painted a different color and acts as a train platform: 1st mustard yellow (#E9B53C), 2nd deep navy (#1E2A44), 3rd tomato red (#E2483A), 4th tin blue (#2F5DA8). The compartments are EMPTY — no toys, no objects.

Two parallel train rails with evenly spaced wooden sleepers run horizontally through all four compartments, passing through small arched openings cut in the dividing walls, and continue out of both the left and right ends of the drawer to the edges of the image.

Style: vintage tin toy lithograph print. Flat color fills only; navy (#1E2A44) linework; color fills slightly offset from the linework like a misregistered print; halftone dot shading on the inner walls instead of gradients; subtle wood grain drawn as simple lines; very subtle worn-paint scratches.

Strict top-down orthographic view, no perspective. The drawer fills about 85% of the width, centered. Transparent background [Gemini：改成 plain pure white background]. No text, no numbers, no letters.
```

建議比例：GPT 3:2，Gemini 21:9。

### 5. L2 四個月台的玩具（貼紙表）

一個月台一張，四張分開生成，讓每張的玩具數量少、細節夠。玩具都要是**原創的、通用的老玩具類型**，不要像任何現有品牌的角色。

```
A sticker sheet of [N] small vintage toys, each one separate with clear empty space around it, arranged in a loose grid. Seen from slightly above (top-down 3/4 view), all at the same scale, as if standing in a line waiting for a train. Every toy carries a tiny piece of luggage — a suitcase, a bundle on a stick, or a paper parcel tied with string.

Toys: [TOY LIST]

Style: vintage tin toy lithograph print. Flat color fills only, limited palette: tomato red (#E2483A), tin blue (#2F5DA8), mustard yellow (#E9B53C), cream (#F6EFE2), deep navy (#1E2A44) linework. Fills slightly offset from linework like a misregistered print; halftone dot shading; subtle worn-paint scratches. Original generic designs, not based on any existing brand or character.

Transparent background [Gemini：改成 plain pure white background]. No text, no letters, no numbers, no ground shadows.
```

把 `[N]` 和 `[TOY LIST]` 換成下面各月台的內容：

- **A 失物招領處**（N = 5）
  `a plastic transforming robot missing its left leg, standing on a crutch; a small tin car with chipped paint; a teddy bear with one missing ear and a stitched patch; a wooden spinning top; a little rubber duck with faded paint`
- **B 夜行列車**（N = 5，這區的玩具要「會發光」）
  `a tin robot with a glowing light-bulb head; a wind-up firefly with a glowing tail; a toy lantern with a small flame; a battery-powered toy car with headlights on; a tin moon on a stand. Glowing parts are drawn as flat cream circles surrounded by a ring of mustard halftone dots`
- **C 新住民候車室**（N = 6，當代設計師玩具的感覺）
  `six small modern designer vinyl figures with simple geometric shapes and minimal faces: a round bean-shaped creature, a cube-headed kid, a mushroom with legs, a small cloud with feet, a cat shaped like a bean, a tiny ghost wearing a scarf. Each holds a little suitcase`
- **D 轉運郵局**（N = 5）
  `a red cylindrical toy mailbox with a mail slot; a stack of tied postcards; a rubber stamp with a wooden handle; a tin mail truck; a small paper airplane`

### 6. L3 月台小物

```
A sticker sheet of small railway station props for a miniature toy train station, each one separate with clear empty space around it, seen from slightly above (top-down 3/4 view), all at the same scale:
a railway signal lever with a red handle; a short wooden platform bench; a round platform sign on a pole (the sign face is a blank solid circle); a tiny station clock on a pole; a luggage cart with two suitcases; a small ticket gate turnstile; a stack of three suitcases.

Style: vintage tin toy lithograph print. Flat color fills only: tomato red (#E2483A), tin blue (#2F5DA8), mustard yellow (#E9B53C), cream (#F6EFE2), deep navy (#1E2A44) linework. Fills slightly offset from linework; halftone dot shading; subtle worn-paint scratches.

Transparent background [Gemini：改成 plain pure white background]. No text, no numbers, no letters on any sign.
```

### 7. L4 扣扣剪票（2D 版）

**附上定稿的扣扣當參考圖**。這張扣扣會站在抽屜邊緣，所以角度要跟抽屜一致（稍微俯視）。

```
Using the attached character as the exact design reference (same proportions, face, colors and cap), draw KOKO the wind-up tin rabbit stationmaster in a new pose:

KOKO stands seen from slightly above (top-down 3/4 view), leaning forward a little, holding the mustard ticket punch up with both hands and punching a small paper ticket that a tiny unseen passenger is holding up. A few small paper confetti bits from the punch hole fly out. The brass wind-up key on its back is visible. One ear is folded down a little, showing concentration.

Style: vintage tin toy lithograph print, identical to the reference: flat fills, navy linework, slightly misregistered color fills, halftone dot shading, subtle worn-paint scratches.

Transparent background [Gemini：改成 plain pure white background]. No text. No ground shadow.
```

### 8. L5 雷射星星與碎紙

這層會被我疊上雷射材質，所以只需要乾淨的形狀。

```
A scattered set of small flat shapes on a plain background, each one separate with clear space around it: 12 four-pointed sparkle stars in different sizes, 8 tiny round dots, 10 small rectangular paper confetti pieces slightly curled, 4 small ticket-punch hole shapes (rounded trapezoids).

All shapes are solid flat fill with a thin deep navy (#1E2A44) outline. Stars are solid cream (#F6EFE2); confetti pieces are tomato red (#E2483A), tin blue (#2F5DA8) and mustard yellow (#E9B53C).

Flat vector style, no gradients, no shading, no glow. Transparent background [Gemini：改成 plain pure white background]. No text.
```

### 9. L0 紙紋網點底

```
Seamless tileable texture of old cream printing paper (#F6EFE2) for a vintage tin toy lithograph print. Very subtle paper fiber, a faint uneven halftone dot pattern in pale mustard (#E9B53C) at about 8% visibility, and a few tiny worn ink specks in navy. Flat, evenly lit, no vignette, no folds, no objects, no text. Must tile seamlessly on all four edges.
```

建議比例：1:1。

🎯 Target：ChatGPT（GPT 圖像）與 Gemini（Nano Banana）💡 每一層只放一種元素、背景乾淨、統一俯視角度和調色盤，之後才能去背、分層、做視差，也比較容易在 Midjourney 用風格參考延續。

---

## 10. Midjourney 版本

等 GPT／Gemini 版的元素有你喜歡的，就把那張圖上傳到 Midjourney 當參考：

- `--sref`：風格參考，放你最喜歡的一張主視覺元素圖（例如抽屜）。
- `--oref`：角色參考（V7 的 Omni Reference），放定稿的扣扣。`--ow` 控制有多像參考圖，建議 100～200。
- Midjourney 不會輸出透明背景，所以都指定純白底，之後去背。

### 10a. 抽屜底座

```
top-down flat illustration of an open wooden drawer used as a miniature train station, four empty compartments in a row painted mustard yellow, deep navy, tomato red and tin blue, two parallel train rails with wooden sleepers running horizontally through all compartments and out both ends, vintage tin toy lithograph print, flat color fills, navy linework, misregistered print offset, halftone dot shading, subtle worn paint scratches, strict orthographic top view, plain white background --ar 12:5 --v 7 --style raw --sref [抽屜參考圖網址] --no text, letters, numbers, toys, people, perspective, gradient, 3d render, photo
```

### 10b. 月台玩具（以 A 月台為例，換掉玩具清單就能做其他月台）

```
sticker sheet of five small vintage toys waiting for a train, each carrying tiny luggage, a robot missing one leg leaning on a crutch, a chipped tin car, a teddy bear with one missing ear, a wooden spinning top, a faded rubber duck, top-down three-quarter view, same scale, separated with empty space, vintage tin toy lithograph print, flat fills in tomato red, tin blue, mustard yellow and cream, navy linework, misregistered print offset, halftone dots, plain white background --ar 3:2 --v 7 --style raw --sref [風格參考圖網址] --no text, letters, shadows, gradient, 3d render, photo
```

### 10c. 扣扣剪票

```
a small wind-up tin toy rabbit stationmaster punching a paper ticket with a mustard ticket punch, oversized tomato red stationmaster cap, brass wind-up key on its back, one ear slightly folded, top-down three-quarter view, full body, vintage tin toy lithograph print, flat fills, navy linework, misregistered print offset, halftone dot shading, plain white background --ar 1:1 --v 7 --style raw --oref [扣扣定稿網址] --ow 150 --sref [風格參考圖網址] --no text, letters, gradient, 3d render, photo, ground shadow
```

🎯 Target：Midjourney V7 💡 改成 Midjourney 習慣的「描述詞＋參數」寫法，用 `--sref` 接住 GPT／Gemini 版的風格、`--oref` 鎖住扣扣的長相，用 `--no` 擋掉文字和 3D 渲染感。

---

## 交給我的時候

請放在 `works/toy-expo-pass/assets/`（或直接丟給我，我來整理）：

| 檔案 | 內容 |
| --- | --- |
| `koko-ref.png` | 扣扣定稿（2D） |
| `koko.glb` | 轉好的 3D 模型 |
| `kv-drawer.png` | L1 抽屜底座 |
| `kv-toys-a.png` ～ `kv-toys-d.png` | L2 四個月台的玩具 |
| `kv-props.png` | L3 月台小物 |
| `kv-koko-punch.png` | L4 扣扣剪票 |
| `kv-sparkles.png` | L5 星星碎紙 |
| `kv-paper.png` | L0 紙紋 |

貼紙表裡的元素不用自己切，整張給我，我會切開、去背、壓縮成網頁用的大小。
