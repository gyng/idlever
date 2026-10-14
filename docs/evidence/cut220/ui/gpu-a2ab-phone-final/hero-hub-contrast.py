import json,re,sys
from pathlib import Path
from PIL import Image
folder=Path(sys.argv[1])
def linear(v):
 v=v/255
 return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def lum(rgb):return sum(w*linear(c)for w,c in zip((.2126,.7152,.0722),rgb))
def ratio(a,b):
 hi,lo=sorted((lum(a),lum(b)),reverse=True)
 return (hi+.05)/(lo+.05)
rows=[]
for source in sorted(folder.glob('*-contrast.json')):
 data=json.loads(source.read_text());im=Image.open(str(source).replace('-contrast.json','-background.png')).convert('RGB');scale=im.width/data['width']
 for sample in data['samples']:
  rgba=list(map(float,re.findall(r'[\d.]+',sample['color'])));alpha=rgba[3]if len(rgba)>3 else 1
  if sample['opacity']!=1 or alpha!=1:raise RuntimeError('Nonopaque text needs separate compositing proof: '+str(sample))
  r=sample['rect'];box=(int((r['x']+1)*scale),int((r['y']+1)*scale),int((r['x']+r['w']-1)*scale),int((r['y']+r['h']-1)*scale))
  pixels=set(im.crop(box).get_flattened_data())
  if not pixels:continue
  weakest=min((ratio(rgba[:3],pixel),pixel)for pixel in pixels)
  threshold=3 if sample['inactive']else 4.5
  rows.append(dict(screen=source.stem,text=sample['text'],color=sample['color'],weakestRGB=weakest[1],minimum=weakest[0],threshold=threshold,passed=weakest[0]>=threshold))
result=dict(scope='Actual visible text ranges; screenshot hides text only; weakest sampled material pixel, opaque text/ancestors verified.',samples=len(rows),rows=rows,failures=[r for r in rows if not r['passed']])
(folder/'contrast-results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(samples=len(rows),failures=len(result['failures']))));sys.exit(bool(result['failures']))
