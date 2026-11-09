"""把 src/scenes.json 的英文口白逐句轉成語音檔。

輸出到 public/works/alice-margins/narration/：每句一個 .m4a，加上 narration.json（每句的檔名、文字、秒數）。
頁面依 narration.json 把每句排進時間軸，字幕也照實際長度顯示。

兩種聲音來源：
- Gemini TTS（VOICE 是 voice_ 開頭的客製聲音 id，或 Kore 這類內建聲音名稱加 ENGINE=gemini）
    VOICE=voice_1gfsmp3cvvo2 python3 works/alice-margins/tools/narrate.py
  API key 讀環境變數 GEMINI_API_KEY，沒有就讀 GEMINI_ENV 指的 .env 檔（預設是 youtube video 專案的 tts/.env）。
  文字和聲音沒變的句子會沿用舊檔；想重錄某幾句：ONLY=queen-2,tea-1，全部重錄：FORCE=1。
- macOS say（只能個人、非商業使用）
    VOICE=Shelley RATE=190 python3 works/alice-margins/tools/narrate.py
"""
import base64, json, os, re, subprocess, sys, tempfile, time, urllib.error, urllib.request, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILM = json.load(open(os.path.join(ROOT, 'src', 'scenes.json'), encoding='utf-8'))
OUT = os.path.join(ROOT, '..', '..', 'public', 'works', 'alice-margins', 'narration')
VOICE = os.environ.get('VOICE', 'voice_1gfsmp3cvvo2')
ENGINE = os.environ.get('ENGINE', 'gemini' if VOICE.startswith('voice_') else 'say')
RATE = os.environ.get('RATE', '190')
MODEL = os.environ.get('MODEL', 'gemini-3.8-flash-tts')
STYLE = os.environ.get('STYLE', (
    'Read in a warm, measured British (Received Pronunciation) accent, like the female narrator of an '
    'educational animated documentary. Clear, gently curious and a little wry; unhurried but never slow. '
    'Keep the same voice, accent and pace in every line.'))
GEMINI_ENV = os.environ.get('GEMINI_ENV', '/Volumes/ARSQ4-2TB/sui/sui portfolio design/youtube video/tts/.env')
ONLY = set(filter(None, os.environ.get('ONLY', '').split(',')))
FORCE = os.environ.get('FORCE') == '1'
LUFS = -19.0

# 跟 main.js 的字幕切法一致
SPLIT = re.compile(r'(?<=[.!?:;])\s+')
# 照字面唸會出錯的字，改成口語
SPOKEN = {'1862': 'eighteen sixty-two', '1865': 'eighteen sixty-five'}
TRIM = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
        'silenceremove=start_periods=1:start_threshold=-50dB,areverse')


def spoken(text):
    for k, v in SPOKEN.items():
        text = text.replace(k, v)
    return text


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return round(float(out), 3)


# ---------- Gemini TTS（和 youtube video/tts/gemini_tts.py 同一套 API） ----------

def api_key():
    key = os.environ.get('GEMINI_API_KEY')
    if not key and os.path.exists(GEMINI_ENV):
        for line in open(GEMINI_ENV).read().splitlines():
            if line.strip().startswith('GEMINI_API_KEY='):
                key = line.split('=', 1)[1].strip().strip('"\'')
    if not key:
        sys.exit('找不到 GEMINI_API_KEY：請 export GEMINI_API_KEY=... 或用 GEMINI_ENV 指定 .env 檔')
    return key


def gemini(text, dst_wav):
    body = json.dumps({
        'model': MODEL,
        'input': [{'type': 'user_input', 'content': [{
            'type': 'text', 'text': text,
            'annotations': [{'type': 'speech_metadata', 'style': STYLE}],
        }]}],
        'response_format': {'type': 'audio'},
        'generation_config': {'speech_config': [{'voice': VOICE}]},
    }).encode()
    for attempt in range(5):
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions', data=body,
                                     method='POST', headers={'x-goog-api-key': api_key(), 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                resp = json.loads(r.read())
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:600]
            if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2 ** attempt * 3)
                continue
            sys.exit(f'Gemini API 錯誤 HTTP {e.code}：{msg}')
    data = None
    for step in reversed(resp.get('steps', [])):
        for c in reversed(step.get('content', []) if step.get('type') == 'model_output' else []):
            if c.get('type') == 'audio' and c.get('data'):
                data = data or c['data']
    data = data or resp.get('output_audio', {}).get('data')
    if not data:
        sys.exit('回應裡沒有音訊：' + json.dumps(resp, ensure_ascii=False)[:400])
    raw = base64.b64decode(data)
    if raw[:4] == b'RIFF':
        open(dst_wav, 'wb').write(raw)
    else:  # 沒有檔頭的 24kHz 16-bit 單聲道 PCM
        with wave.open(dst_wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)


def synth(text, dst, tmp):
    src = os.path.join(tmp, 'line.wav' if ENGINE == 'gemini' else 'line.aiff')
    if ENGINE == 'gemini':
        gemini(spoken(text), src)
    else:
        subprocess.run(['say', '-v', VOICE, '-r', RATE, '-o', src, spoken(text)], check=True)
    encode(src, dst)


def loudness(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])


def encode(src, dst):
    # 每句調到同樣響度（-19 LUFS），再壓住峰值，混音時口白才不會忽大忽小或爆音
    gain = LUFS - loudness(src)
    af = f'{TRIM},volume={gain:.2f}dB,alimiter=limit=0.89:level=false'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', af,
                    '-ac', '1', '-ar', '48000', '-c:a', 'aac', '-b:a', '128k', dst], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    index = os.path.join(OUT, 'narration.json')
    old = {}
    if os.path.exists(index):
        prev = json.load(open(index, encoding='utf-8'))
        old = {c['file']: c for c in prev['clips'] if prev.get('voice') == VOICE and prev.get('style', STYLE) == STYLE}
    clips = []
    with tempfile.TemporaryDirectory() as tmp:
        for scene in FILM['scenes']:
            for i, text in enumerate(SPLIT.split(scene['narration'])):
                key = f"{scene['id']}-{i + 1}"
                name, dst = f'{key}.m4a', os.path.join(OUT, f'{key}.m4a')
                keep = old.get(name, {}).get('text') == text and os.path.exists(dst) and not FORCE and key not in ONLY
                if not keep:
                    print(f'  {key}: {text[:60]}')
                    synth(text, dst, tmp)
                clips.append({'scene': scene['id'], 'file': name, 'text': text, 'duration': duration(dst)})
    # 拿掉已經不在口白裡的舊檔（exFAT 上的 ._ 檔會跟著本體消失）
    names = {c['file'] for c in clips}
    for f in os.listdir(OUT):
        if f.endswith('.m4a') and not f.startswith('._') and f not in names and os.path.exists(os.path.join(OUT, f)):
            os.remove(os.path.join(OUT, f))
    meta = {'engine': ENGINE, 'voice': VOICE, 'clips': clips}
    meta.update({'model': MODEL, 'style': STYLE} if ENGINE == 'gemini' else {'rate': int(RATE)})
    json.dump(meta, open(index, 'w'), indent=1, ensure_ascii=False)

    # 檢查每一幕放不放得下（前後各留 0.5 秒，句間 0.4 秒，和 audio.js 一致）
    for scene in FILM['scenes']:
        cs = [c for c in clips if c['scene'] == scene['id']]
        need = sum(c['duration'] for c in cs) + 0.4 * (len(cs) - 1) + 1.0
        flag = '  ← 太長' if need > scene['duration'] else ''
        print(f"{scene['id']:12s} {need:5.1f}s / {scene['duration']}s{flag}")


if __name__ == '__main__':
    sys.exit(main())
