#!/usr/bin/env python3
"""Cut241 visible glyph-range contrast; text-transparent private-GPU backgrounds."""
import json, re, sys
from pathlib import Path
from PIL import Image

def lum(rgb):
    def linear(v):
        v /= 255
        return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    return sum(w * linear(c) for w, c in zip((.2126, .7152, .0722), rgb))

def contrast(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + .05) / (lo + .05)

folder = Path(sys.argv[1])
rows, words = [], {}
for source in sorted(folder.glob('*-contrast.json')):
    data = json.loads(source.read_text())
    image = Image.open(str(source).replace('-contrast.json', '-background.png')).convert('RGB')
    scale = image.width / data['width']
    for sample in data['samples']:
        values = list(map(float, re.findall(r'[\d.]+', sample['color'])))
        color, alpha = values[:3], (values[3] if len(values) > 3 else 1) * sample['opacity']
        r = sample['rect']
        box = (int((r['x'] + 1) * scale), int((r['y'] + 1) * scale), int((r['x'] + r['w'] - 1) * scale), int((r['y'] + r['h'] - 1) * scale))
        if box[2] <= box[0] or box[3] <= box[1]:
            continue
        pixels = set(image.crop(box).getdata())
        ratios = [contrast(tuple(c * alpha + b * (1-alpha) for c, b in zip(color, pixel)), pixel) for pixel in pixels]
        threshold = 3 if sample['inactive'] else 4.5
        minimum = min(ratios)
        rows.append({'screen': source.stem, 'text': sample['text'], 'minimum': round(minimum, 3), 'threshold': threshold, 'pass': minimum >= threshold})
        words.setdefault(data['material'], {}).update({w['word']: {**w, 'cssSize': sample['cssSize'], 'font': sample['font'], 'dpr': data['dpr']} for w in sample['words']})
result = {'scope': 'Visible, unoccluded glyph ranges only; actual GPU background, worst sampled pixel, alpha/ancestor opacity composited. Lower scrolled content and control/focus boundaries require separate coverage.', 'samples': len(rows), 'failures': [r for r in rows if not r['pass']], 'wordCounts': {k: len(v) for k, v in words.items()}, 'glyphWords': words, 'rows': rows}
(folder / 'contrast-summary.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'samples': len(rows), 'failures': len(result['failures']), 'words': result['wordCounts'], 'failedText': result['failures']}, indent=2))
raise SystemExit(bool(result['failures']))
