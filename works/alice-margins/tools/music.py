"""用 Lyria（Gemini Interactions API）產生整支片的背景音樂。

    python3 works/alice-margins/tools/music.py          # 產生一版，存成 music/score-<n>.mp3
    python3 works/alice-margins/tools/music.py --n 2    # 一次產生兩版來挑

挑好之後：python3 works/alice-margins/tools/music.py --use 2
會把第 2 版調整成和全片一樣長（只改速度不改音高），存成 music/score.m4a；頁面會把它混進音軌，講話時自動壓低。
API key 和 narrate.py 一樣：GEMINI_API_KEY 或 GEMINI_ENV 指的 .env。
"""
import argparse, base64, json, os, subprocess, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from narrate import api_key, FILM, OUT as VO_OUT  # noqa: E402

OUT = os.path.join(os.path.dirname(VO_OUT), 'music')
MODEL = 'lyria-3.5'

total = sum(s['duration'] for s in FILM['scenes'])
PROMPT = (
    'Instrumental underscore for an animated educational explainer in the style of a TED-Ed short, '
    "telling the story of Alice's Adventures in Wonderland through flat cut-out illustrations that look like "
    'medieval manuscript margins. No vocals. Whimsical, curious and gently mischievous, with a storybook warmth. '
    'Chamber ensemble: pizzicato strings, plucked harp and lute, a soft harpsichord ostinato, clarinet and bassoon '
    'trading short playful phrases, light glockenspiel and celesta sparkles, soft frame drum. D dorian moving to F major, '
    'about 100 BPM, light and airy. It must sit underneath a spoken narration the whole time: mid-low density, '
    'no prominent lead melody, no big crescendos, no drops. '
    f'Length: {total // 60} minutes {total % 60} seconds. Follow this arc: '
    'a gentle music-box opening for the first 15 seconds; playful and curious through the middle; '
    'a slightly darker, quirky passage around 1 minute (a pompous queen, a never-ending tea party); '
    'a lighter, brighter lift around 2 minutes 25 seconds; then thin out to harp and celesta for a reflective, '
    'open-ended ending that resolves softly in the last 10 seconds.'
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--n', type=int, default=1)
    ap.add_argument('--use', type=int, help='把第幾版調成全片長度，存成 score.m4a')
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    if args.use:
        return fit(os.path.join(OUT, f'score-{args.use}.mp3'))
    for _ in range(args.n):
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',
                                     data=json.dumps({'model': MODEL, 'input': PROMPT}).encode(), method='POST',
                                     headers={'x-goog-api-key': api_key(), 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=600) as r:
            res = json.loads(r.read())
        audio = next((c['data'] for st in res.get('steps', []) for c in st.get('content') or [] if c.get('type') == 'audio'), None)
        if not audio:
            sys.exit('回應裡沒有音訊：' + json.dumps(res)[:500])
        k = 1
        while os.path.exists(os.path.join(OUT, f'score-{k}.mp3')):
            k += 1
        dst = os.path.join(OUT, f'score-{k}.mp3')
        open(dst, 'wb').write(base64.b64decode(audio))
        print(dst)


def fit(src):
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                               capture_output=True, text=True, check=True).stdout)
    tempo = dur / total
    dst = os.path.join(OUT, 'score.m4a')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af',
                    f'atempo={tempo:.5f},apad=whole_dur={total},afade=t=out:st={total - 2.5}:d=2.5,loudnorm=I=-20:TP=-2',
                    '-t', str(total), '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', dst], check=True)
    print(f'{os.path.basename(src)} {dur:.1f}s → {total}s（速度 ×{tempo:.3f}）→ {dst}')


if __name__ == '__main__':
    main()
