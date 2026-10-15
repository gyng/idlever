"""Painted focus-outline straight cores against paired no-outline background.
Centerlines use the actual CSS outline width/offset; sample central50% of each
straight side, avoiding rounded corners. RGB comes from actual painted pixels,
so CSS filtering is included. Missing unchanged pixels never count as a pass.
"""
import json,sys,math
from pathlib import Path
from PIL import Image
folder=Path(sys.argv[1]);D=json.loads((folder/'results.json').read_text());rows=[]
def lum(c):
 return sum(w*(v/255/12.92 if v/255<=.04045 else((v/255+.055)/1.055)**2.4)for w,v in zip((.2126,.7152,.0722),c))
def ratio(a,b):
 hi,lo=sorted((lum(a),lum(b)),reverse=True);return(hi+.05)/(lo+.05)
for case in D['rows']:
 for s in case['focus']:
  fg=Image.open(folder/(s['prefix']+'-focused.png')).convert('RGB');bg=Image.open(folder/(s['prefix']+'-background.png')).convert('RGB');r=s['rect'];sc=fg.width/case['width'];w=float(s['outlineWidth'].removesuffix('px'));o=float(s['outlineOffset'].removesuffix('px'));edges={};allvalues=[]
  for edge in ['left','right','top','bottom']:
   points=[]
   horizontal=edge in ['top','bottom'];length=r['w']if horizontal else r['h']
   for n in range(math.ceil(length*.25*sc),math.floor(length*.75*sc)):
    if horizontal:x=r['x']+n/sc;y=r['y']-o-w/2 if edge=='top'else r['y']+r['h']+o+w/2
    else:y=r['y']+n/sc;x=r['x']-o-w/2 if edge=='left'else r['x']+r['w']+o+w/2
    px=round(x*sc-.5);py=round(y*sc-.5)
    if not(0<=px<fg.width and 0<=py<fg.height):points.append({'x':px,'y':py,'status':'out-of-frame'});continue
    f=fg.getpixel((px,py));b=bg.getpixel((px,py));changed=max(abs(a-c)for a,c in zip(f,b))>=6
    v=ratio(f,b);points.append({'x':px,'y':py,'foreground':f,'background':b,'changed':changed,'ratio':round(v,3)})
    if changed:allvalues.append(v)
   valid=[p for p in points if p.get('changed')];edges[edge]={'samples':len(points),'changed':len(valid),'minimum':min((p['ratio']for p in valid),default=None),'points':points}
  missing=[e for e,v in edges.items()if v['changed']!=v['samples']or not v['samples']];minimum=min(allvalues)if allvalues else None
  rows.append({'prefix':s['prefix'],'edges':edges,'minimum':round(minimum,3)if minimum is not None else None,'missingEdges':missing,'threshold':3,'status':'MISSING'if missing or not s['focusVisible']else'PASS'if minimum>=3 else'FAIL'})
report={'scope':'Actual painted focus-outline central straight-side cores only, all4sides;3:1 threshold unchanged. Includes actual CSS filtering. Rounded corners/antialias pixels and defaultcontrol-border contrast remain outside this numeric sample. Same-focus paired backgrounds preserve real target/layout/save. Original CSS-color classifier retained separately.','rows':rows,'failures':[r['prefix']for r in rows if r['status']=='FAIL'],'missing':[r['prefix']for r in rows if r['status']=='MISSING']}
(folder/'focus-side-contrast.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'samples':len(rows),'failures':report['failures'],'missing':report['missing'],'minimum':min((r['minimum']for r in rows if r['minimum']is not None),default=None)},indent=2))
