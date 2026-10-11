#!/usr/bin/env python3
"""Pack Cut132 materials using the approved town painterly pipeline, at128px.
The authored landscape sheet is cropped/resampled like existing sprite packing.
Original generated source images remain untouched.
"""
from pathlib import Path
import numpy as np
from PIL import Image
import town_tiles as town
from painted import convert
from pack import key_source
ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent/'web/public/art/landscape'
OUT.mkdir(parents=True,exist_ok=True)
town._src=lambda n:np.asarray(convert(ROOT/'generated'/f'envp_town_{n}.png','env',(128,128),key_source).convert('RGBA'),np.float32)
for n,a in town.ground().items():
    if n in ('grass_0','grass_3','dirt_0','plaza_0'):
        Image.fromarray(np.clip(a,0,255).astype('uint8'),'RGB').save(OUT/f'{n}.png')
convert(ROOT/'generated/envp_town_water.png','env',(128,128),key_source).save(OUT/'water.png')
# Connected alpha islands extract each authored object without neighboring
# subjects intruding into its rectangular atlas crop. Keep a two-pixel fringe.
sheet=np.asarray(Image.open(ROOT/'landscape/home-landscape-v1.png'))
mask=sheet[:,:,3]>40;h,w=mask.shape;seen=np.zeros((h,w),bool);islands=[]
for y in range(h):
 for x in range(w):
  if not mask[y,x] or seen[y,x]:continue
  q=[(x,y)];seen[y,x]=True;points=[]
  while q:
   xx,yy=q.pop();points.append((xx,yy))
   for nx,ny in ((xx+1,yy),(xx-1,yy),(xx,yy+1),(xx,yy-1)):
    if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
  if len(points)>100000:islands.append(points)
for name,points,size in zip(('bank','boulders','pines','undergrowth'),islands,((112,52),(72,52),(82,71),(100,48))):
 xs,ys=zip(*points);left,right=max(0,min(xs)-2),min(w,max(xs)+3);top,bottom=max(0,min(ys)-2),min(h,max(ys)+3)
 keep=np.zeros((bottom-top,right-left),bool)
 keep[np.array(ys)-top,np.array(xs)-left]=True
 for _ in range(2):
  padded=np.pad(keep,1);keep=padded[1:-1,1:-1]|padded[:-2,1:-1]|padded[2:,1:-1]|padded[1:-1,:-2]|padded[1:-1,2:]
 a=sheet[top:bottom,left:right].copy();a[~keep]=0
 im=Image.fromarray(a).resize(size,Image.Resampling.BOX)
 a=np.array(im);a[a[:,:,3]<28]=0
 Image.fromarray(a).save(OUT/f'{name}.png')
