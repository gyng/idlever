#!/usr/bin/env python3
"""Real JSON-line public API baseline; no grants, save edits, masks or normalization."""
import argparse,datetime,gzip,hashlib,json,os,subprocess
from pathlib import Path
P=argparse.ArgumentParser();P.add_argument('--out',required=True);P.add_argument('--case',choices=['fresh1','fresh3','fresh5','earned-none','earned-old-six'],required=True);a=P.parse_args()
out=Path(a.out);out.mkdir(parents=True,exist_ok=False)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def write(name,obj):
 raw=(json.dumps(obj,indent=2,ensure_ascii=False)+'\n').encode()
 if name.endswith('.gz'):raw=gzip.compress(raw,mtime=0)
 (out/name).write_bytes(raw)
def differences(x,y,path=''):
 if type(x)!=type(y):return [{'path':path,'old':x,'new':y}]
 if isinstance(x,dict):
  return sum((differences(x[k],y[k],path+'/'+k) if k in x and k in y else [{'path':path+'/'+k,'old':x.get(k),'new':y.get(k),'missing': 'old' if k not in x else 'new'}] for k in sorted(x.keys()|y.keys())),[])
 if isinstance(x,list):
  return sum((differences(x[i],y[i],path+'/'+str(i)) if i<len(x) and i<len(y) else [{'path':path+'/'+str(i),'old':x[i] if i<len(x) else None,'new':y[i] if i<len(y) else None,'missing':'old' if i>=len(x) else 'new'}] for i in range(max(len(x),len(y)))),[])
 return [] if x==y else [{'path':path,'old':x,'new':y}]
class Engine:
 def __init__(self,path,name):
  self.path=path;self.name=name;self.rows=[];self.log=open(out/(name+'.stderr.log'),'w');self.p=subprocess.Popen([path],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=self.log,text=True,env={**os.environ,'IDLEVER_NATIVE_THREADS':'1'})
 def call(self,m,args=[]):
  req={'id':len(self.rows),'method':m,'args':args};self.p.stdin.write(json.dumps(req)+'\n');self.p.stdin.flush();raw=self.p.stdout.readline();r=json.loads(raw);v=r.get('r')
  if isinstance(v,str):
   try:v=json.loads(v)
   except ValueError:pass
  self.rows.append({'request':req,'rawResponse':raw,'decoded':v});return r,v
 def close(self):
  self.p.stdin.close();code=self.p.wait();self.log.close();write(self.name+'.raw.json.gz',self.rows);return code
oldpath='scratchpad/cut253-baseline-8879/native_dev';newpath='target/fast/examples/native_dev'
assert sha(oldpath)=='c7bff5fc2ba2910a077036b5fd4cdc5079bfad0ea472599b4e128d6b0c319679','preserved8879binary changed'
files=[*Path('crates').rglob('*.rs'),Path('Cargo.toml'),Path('Cargo.lock')];before={str(p):sha(p) for p in files}
identity={'date':'2026-10-16','startedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'case':a.case,'sourceBefore':before,'binaries':{p:sha(p) for p in [oldpath,newpath]},'scope':'Actual public API calls only. Transport ms retained but excluded from game result comparisons. No state, RNG, mask or output normalization.'};write('identity.json',identity)
engines=[Engine(oldpath,'old'),Engine(newpath,'new')];checks=[]
def pair(m,args=[],kind='strict'):
 rv=[e.call(m,args) for e in engines];old,new=[v for r,v in rv];ok=[r['ok'] for r,v in rv];diff=differences(old,new);row={'method':m,'index':len(checks),'kind':kind,'ok':ok,'decodedExact':not diff,'wireResultBytesExact':rv[0][0].get('r')==rv[1][0].get('r'),'differences':diff};checks.append(row)
 if kind=='lineage' and all(ok):
  ot=old.get('class_tree');nt=new.get('class_tree')
  if ot and nt:row['originalSixNodesExact']=ot['nodes']==nt['nodes'][:len(ot['nodes'])]
 return old,new
try:
 if a.case.startswith('fresh'):
  pair('newLineage',[int(a.case[5:])],'lineage');pair('save');pair('buildTown',['house'],'lineage');pair('save');pair('send');pair('save')
  for _ in range(12):pair('step',[50]);pair('save')
 else:
  src=Path('docs/evidence/cut220/actual-next-8879/canonical-parent.session.json.gz');raw=gzip.decompress(src.read_bytes()).decode();identity['input']={'path':str(src),'gzipSha256':sha(src),'saveSha256':hashlib.sha256(raw.encode()).hexdigest()};write('identity.json',identity)
  pair('load',[raw],'lineage');pair('save')
  if a.case=='earned-old-six':
   old,new=pair('lineage',[],'lineage')
   ids=[n['id'] for n in old['class_tree']['nodes']]
   for id in ids:pair('learnClassSkill',[id],'lineage')
  pair('exportRules');pair('save');pair('setWorker',['scout',True],'lineage');pair('send');pair('save');pair('runOfflineQuick',[28800]);pair('save')
finally:
 codes=[e.close() for e in engines];after={str(p):sha(p) for p in files};assert after==before,'source changed';identity['sourceUnchanged']=True;identity['processExit']=codes;identity['finishedUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat();write('identity.json',identity)
write('comparisons.json',checks)
strict=[c for c in checks if c['kind']=='strict'];summary={'case':a.case,'strictGameComparisons':len(strict),'strictExact':sum(c['decodedExact'] and c['ok']==[True,True] for c in strict),'strictWireBytesExact':sum(c['wireResultBytesExact'] and c['ok']==[True,True] for c in strict),'strictDifferences':[{'index':c['index'],'method':c['method'],'paths':[d['path'] for d in c['differences']]} for c in strict if not c['decodedExact'] or c['ok']!=[True,True]],'lineageWireComparisons':sum(c['kind']=='lineage' for c in checks),'lineageWireDifferencesRetained':True,'sourceUnchanged':True,'processExit':codes,'noGrantsOrSaveEdits':True}
write('summary.json',summary);print(json.dumps(summary));raise SystemExit(0 if summary['strictExact']==len(strict) and codes==[0,0] else 1)
