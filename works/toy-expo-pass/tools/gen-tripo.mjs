// 用 Gemini（nano banana）生成背面主視覺的立體元素，給 Tripo 轉 3D 模型用。
// 每張圖只放一個完整物件：3/4 俯視、純白底、光線均勻、沒有投影、沒有文字。
//
// 用法（金鑰從環境變數讀，不要寫進檔案）：
//   export GEMINI_API_KEY=...
//   node works/toy-expo-pass/tools/gen-tripo.mjs            # 全部 5 張
//   node works/toy-expo-pass/tools/gen-tripo.mjs drawer     # 只生某幾張
//   GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview node ...  # 換模型
// 輸出：works/toy-expo-pass/gen/tripo/<名稱>-<序號>.png，重跑不會覆蓋舊圖。

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('請先 export GEMINI_API_KEY'); process.exit(1); }
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'gen', 'tripo');

const STYLE = `It is a real, physical vintage toy made of pressed and lithographed tin with painted details, like a 1960s collectible. Limited palette: tomato red (#E2483A), tin blue (#2F5DA8), mustard yellow (#E9B53C), deep navy (#1E2A44) and cream (#F6EFE2). Slightly glossy enamel paint with very subtle wear on the edges. Original generic design, not based on any existing brand or character.`;

const SHOT = `Product photo for 3D reconstruction: one single object only, the whole object fully visible and centered with generous empty margin, front three-quarter view from slightly above (about 30 degrees), soft even studio lighting with no strong highlights, no cast shadow, no reflections, plain pure white background. Absolutely no printed words, labels, signs or nameplates anywhere on the object. No text, no letters, no numbers, no logo, no other objects, no hands, no props on the ground.`;

const JOBS = {
  drawer: {
    aspect: '4:3',
    prompt: `An open, empty wooden drawer used as a miniature train station. The drawer is wide and shallow, warm honey-brown wood. Inside, thin wooden walls divide it into four compartments in a row; each compartment floor is painted a different flat color and acts as a platform: mustard yellow, deep navy, tomato red, tin blue (left to right). Two parallel toy train rails with small wooden sleepers run through all four compartments, passing through small arched openings in the dividing walls, and stick out a little from both ends of the drawer. The compartments are empty — no toys inside. Simple chunky shapes, clean and toy-like.`,
  },
  'toy-a-bear': {
    aspect: '1:1',
    prompt: `A small standing teddy bear toy. IMPORTANT: it has only ONE ear (on the right side of its head); the left ear is clearly missing, and where it should be there is a small flat stitched patch on the head. A cream patch on its belly. Mustard yellow fur painted on tin, navy button eyes, a tiny tomato red scarf. It holds a small tin blue suitcase in one paw. Chunky, simple, rounded proportions.`,
  },
  'toy-b-robot': {
    aspect: '1:1',
    prompt: `A small wind-up tin robot toy. Boxy deep navy body with tin blue panels and rivets, short legs, a glass light-bulb head that glows warm cream with a soft mustard glow inside. Tomato red buttons on the chest, a small wind-up key on its back. It carries a tiny bundle on a stick over its shoulder. Chunky, simple shapes.`,
  },
  'toy-c-bean': {
    aspect: '1:1',
    prompt: `A small modern designer vinyl toy figure: a round bean-shaped creature with stubby arms and legs, a minimal dot face, glossy tomato red vinyl with a cream belly, wearing a tiny tin blue cap. It holds a little mustard yellow suitcase. Smooth, soft, rounded shapes. Vinyl instead of tin, but the same palette and finish.`,
  },
  'toy-d-truck': {
    aspect: '1:1',
    prompt: `A small tin toy mail truck. Rounded 1950s delivery van shape, tomato red body with a cream roof, tin blue wheels with navy tires, a simple envelope emblem drawn as a shape (no text) on the side, a small stack of parcels tied with string on the roof rack. Chunky, simple, rounded proportions.`,
  },
};

async function generate(name, { aspect, prompt }) {
  const body = {
    contents: [{ parts: [{ text: `${prompt}\n\n${STYLE}\n\n${SHOT}` }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspect } },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${json.error?.message || JSON.stringify(json).slice(0, 300)}`);
  const parts = json.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData || p.inline_data);
  if (!img) throw new Error(`沒有回傳圖片：${parts.map((p) => p.text).filter(Boolean).join(' ').slice(0, 300) || json.candidates?.[0]?.finishReason}`);
  const data = (img.inlineData || img.inline_data).data;
  let i = 1, file;
  do file = join(OUT, `${name}-${i++}.png`); while (existsSync(file));
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

mkdirSync(OUT, { recursive: true });
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(JOBS);
console.log(`模型 ${MODEL}，生成 ${names.join(', ')}`);
for (const name of names) {
  if (!JOBS[name]) { console.error(`沒有這個項目：${name}（可用：${Object.keys(JOBS).join(', ')}）`); continue; }
  try { console.log('✓', await generate(name, JOBS[name])); }
  catch (e) { console.error('✗', name, e.message); }
}
