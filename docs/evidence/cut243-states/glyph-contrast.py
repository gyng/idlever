"""Supplement conservative text-range measurements with observed glyph-core pixels.
Never deletes the original range failure. Uses normal vs transparent-text matched
images; non-text frame/icon pixels unchanged between them cannot count as glyphs.
Zero sampled glyphs is missing evidence, never a pass.
"""
import json,re,sys
from pathlib import Path
from PIL import Image
folder=Path(sys.argv[1]);rows=[]
def lum(rgb):
 return sum(w*((c/255/12.92)if c/255<=.04045 else((c/255+.055)/1.055)**2.4) for w,c in zip((.2126,.7152,.0722),rgb))
def ratio(a,b):
 hi,lo=sorted((lum(a),lum(b)),reverse=True);return(hi+.05)/(lo+.05)
for p in sorted(folder.glob('*-contrast.json')):
 d=json.loads(p.read_text());bg=Image.open(str(p).replace('-contrast.json','-background.png')).convert('RGB');fg=Image.open(str(p).replace('-contrast.json','.png')).convert('RGB');scale=bg.width/d['width']
 for s in d['samples']:
  values=list(map(float,re.findall(r'[\d.]+',s['color'])));color=values[:3];alpha=(values[3]if len(values)>3 else 1)*s['opacity'];r=s['rect'];bounds=(max(0,int(r['x']*scale)),max(0,int(r['y']*scale)),min(bg.width,int((r['x']+r['w'])*scale)),min(bg.height,int((r['y']+r['h'])*scale)))
  samples=[]
  for y in range(bounds[1],bounds[3]):
   for x in range(bounds[0],bounds[2]):
    b=bg.getpixel((x,y));f=fg.getpixel((x,y));expected=tuple(c*alpha+v*(1-alpha)for c,v in zip(color,b))
    if max(abs(v-w)for v,w in zip(f,b))>=6 and max(abs(v-w)for v,w in zip(f,expected))<=12:samples.append((ratio(expected,b),x,y,b))
  minimum=min(samples)if samples else None;threshold=3 if s['inactive']else 4.5
  rows.append({'screen':p.stem,'text':s['text'],'glyphCorePixels':len(samples),'minimum':round(minimum[0],3)if minimum else None,'worstPixel':{'x':minimum[1],'y':minimum[2],'background':minimum[3]}if minimum else None,'threshold':threshold,'status':'missing glyph pixels'if minimum is None else'PASS'if minimum[0]>=threshold else'FAIL'})
report={'scope':'Supplemental actual glyph-core foreground/background comparison. Preserve conservative whole-range failures separately. Pixels must change when text is hidden and match expected computed foreground within12/channel; actual glyph antialias edges are excluded, not treated as contrast violations. No control/focus-boundary or whole-family pass.','rows':rows,'samples':len(rows),'missing':sum(r['status']=='missing glyph pixels'for r in rows),'failures':[r for r in rows if r['status']=='FAIL']}
(folder/'glyph-core-summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k!='rows'},indent=2))
