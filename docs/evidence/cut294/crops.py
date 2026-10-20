"""Labelled diagnostic crops only; original viewport captures remain unchanged."""
import json
from pathlib import Path
from PIL import Image,ImageDraw
r=Path('docs/evidence/cut294');b=json.loads((r/'before/results.json').read_text());a=json.loads((r/'after/results.json').read_text());old={x['id']:x for x in b['rows'] if x['backend']=='gl'};new={x['id']:x for x in a['rows'] if x['backend']=='gl' and x['viewport']['width']==402}
im=Image.new('RGB',(620,6*300),'#14121a');draw=ImageDraw.Draw(im)
for i,(name,x) in enumerate(old.items()):
 draw.text((8,i*300+3),name+' - cropped 2x nearest',fill='white')
 for j,(stage,record) in enumerate([('before',x),('after',new[name])]):
  rect=record['actual']['heroRect']['drawn'];src=Image.open(r/stage/record['file']);cx=(rect['x']+rect['w']/2)*1.5;cy=(rect['y']+rect['h']/2)*1.5
  crop=src.crop((round(cx-66),round(cy-63),round(cx+66),round(cy+63))).resize((264,252),Image.Resampling.NEAREST)
  im.paste(crop,(8+j*310,i*300+35));draw.text((8+j*310,i*300+20),stage,fill='white')
im.save(r/'hero-comparison-crops.png')
