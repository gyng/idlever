#!/usr/bin/env python3
"""Cut204: sample backgrounds with text made transparent, in actual text ranges."""
import json,re
from pathlib import Path
from PIL import Image

def linear(v):
    v=v/255
    return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def luminance(rgb):
    return sum(w*linear(c) for w,c in zip((.2126,.7152,.0722),rgb))

def contrast(a,b):
    hi,lo=sorted((luminance(a),luminance(b)),reverse=True)
    return (hi+.05)/(lo+.05)

rows=[]
for source in sorted(Path('docs/evidence/cut204/candidate').glob('*-contrast.json')):
    data=json.loads(source.read_text())
    image=Image.open(str(source).replace('-contrast.json','-background.png')).convert('RGB')
    scale=image.width/data['width']
    for sample in data['samples']:
        color=tuple(map(float,re.findall(r'[\d.]+',sample['color'])[:3]))
        r=sample['rect']
        # Stay within the glyph range, avoiding anti-aliased neighboring plate edges.
        box=(int((r['x']+1)*scale),int((r['y']+1)*scale),int((r['x']+r['w']-1)*scale),int((r['y']+r['h']-1)*scale))
        pixels=image.crop(box).get_flattened_data()
        values=[contrast(color,pixel) for pixel in set(pixels)]
        if not values:continue
        minimum=min(values)
        threshold=3 if sample['inactive'] else 4.5
        rows.append({'screen':source.stem,'text':sample['text'],'color':sample['color'],'minimum':round(minimum,3),'threshold':threshold,'pass':minimum>=threshold})
out={'scope':'Actual rendered text ranges; background screenshots hide text only; worst sampled pixel, visible ranges only','samples':len(rows),'failures':[r for r in rows if not r['pass']],'rows':rows}
Path('docs/evidence/cut204/contrast.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'samples':len(rows),'failures':len(out['failures']),'failedText':out['failures']},indent=2))
raise SystemExit(bool(out['failures']))
