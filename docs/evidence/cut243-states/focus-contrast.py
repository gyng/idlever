"""Actual focus-outline cores against paired same-layout outline-transparent images.
Does not treat antialias edges or unrelated frame highlights as outline cores.
No core / no computed outline remains missing evidence, never a pass.
"""
import json,re,math,sys
from pathlib import Path
from PIL import Image
folder=Path(sys.argv[1]);data=json.loads((folder/'results.json').read_text());rows=[]
def lum(c):
 return sum(w*(v/255/12.92 if v/255<=.04045 else((v/255+.055)/1.055)**2.4)for w,v in zip((.2126,.7152,.0722),c))
def ratio(a,b):
 hi,lo=sorted((lum(a),lum(b)),reverse=True);return(hi+.05)/(lo+.05)
for case in data['rows']:
 for sample in case['focus']:
  p=sample['prefix'];fg=Image.open(folder/(p+'-focused.png')).convert('RGB');bg=Image.open(folder/(p+'-background.png')).convert('RGB');scale=fg.width/case['width'];r=sample['rect'];v=list(map(float,re.findall(r'[\d.]+',sample['outlineColor'])));color=v[:3];alpha=(v[3]if len(v)>3 else 1)*sample['opacity'];width=float(sample['outlineWidth'].removesuffix('px'));offset=float(sample['outlineOffset'].removesuffix('px'));margin=max(0,width+offset)+2;found=[];edges={e:0 for e in ['left','right','top','bottom']}
  box=(max(0,math.floor((r['x']-margin)*scale)),max(0,math.floor((r['y']-margin)*scale)),min(fg.width,math.ceil((r['x']+r['w']+margin)*scale)),min(fg.height,math.ceil((r['y']+r['h']+margin)*scale)))
  for y in range(box[1],box[3]):
   for x in range(box[0],box[2]):
    cx=(x+.5)/scale;cy=(y+.5)/scale
    if r['x']<=cx<=r['x']+r['w']and r['y']<=cy<=r['y']+r['h']:continue
    b=bg.getpixel((x,y));f=fg.getpixel((x,y));expected=tuple(c*alpha+v*(1-alpha)for c,v in zip(color,b))
    if max(abs(v-w)for v,w in zip(f,b))>=6 and max(abs(v-w)for v,w in zip(f,expected))<=12:
     found.append((ratio(expected,b),x,y,b))
     if cx<r['x']:edges['left']+=1
     if cx>r['x']+r['w']:edges['right']+=1
     if cy<r['y']:edges['top']+=1
     if cy>r['y']+r['h']:edges['bottom']+=1
  m=min(found)if found else None
  rows.append({'prefix':p,'kind':case['kind'],'width':case['width'],'scale':case['scale'],'focusVisible':sample['focusVisible'],'computedOutline':{k:sample[k]for k in ['outlineColor','outlineWidth','outlineOffset','outlineStyle']},'corePixels':len(found),'edgeCoreCounts':edges,'minimum':round(m[0],3)if m else None,'worst':{'x':m[1],'y':m[2],'background':m[3]}if m else None,'threshold':3,'status':'MISSING'if not m or not sample['focusVisible']else'PASS'if m[0]>=3 else'FAIL'})
report={'scope':'Measured computed-outline cores outside actual button rectangle, changed by removing only outline-color while retaining real keyboard focus/layout. Paired local backgrounds, alpha/ancestor opacity composited; rawimages retained. Antialias excluded. All four edge counts recorded; no control-border/hover/pressed/disabled or whole-family pass.','rows':rows,'failures':[r for r in rows if r['status']=='FAIL'],'missing':[r for r in rows if r['status']=='MISSING']}
(folder/'focus-contrast.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'samples':len(rows),'failures':report['failures'],'missing':report['missing']},indent=2))
