#!/usr/bin/env python3
"""Fixed-look paired collection. Raw packets are never decoded/re-saved to native."""
import atexit
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

SPEC=Path(sys.argv[2]) if len(sys.argv)>2 else Path('docs/evidence/cut300/spec.json')
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else Path('target/cut300/study')
CODE=[Path(p) for p in ['docs/evidence/cut300/collect.py','docs/evidence/cut300/analyze.mjs','docs/evidence/cut300/collect-repaired.py','docs/evidence/cut300/analyze-repaired.mjs','tools/stat-bounds.mjs','tools/exact-json.mjs']]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
load=lambda p:json.loads(p.read_text())

def save(path,value):
 temp=path.with_suffix(path.suffix+'.tmp')
 temp.write_text(json.dumps(value,indent=2)+'\n');temp.replace(path)
def key(runtime,seed,digest):return hashlib.sha256((runtime+'\0'+seed+'\0'+digest).encode()).hexdigest()

def main():
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'packets').mkdir(exist_ok=True)
 lock=(OUT/'collector.lock').open('w')
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 spec=load(SPEC);digest=sha(SPEC)
 assert spec['looks']==[16,32] and len(spec['seeds'])==32
 assert len(set(spec['seeds']))==32 and not set(spec['seeds'])&{'1','2'}
 assert all(str(int(s))==s and 0<=int(s)<2**64 for s in spec['seeds'])
 identity={'specSha256':digest,'code':{str(p):sha(p)for p in CODE},'runtimes':{role:sha(Path(r['path']))for role,r in spec['runtimes'].items()}}
 assert all(identity['runtimes'][role]==r['sha256']for role,r in spec['runtimes'].items())
 manifest=OUT/'manifest-repaired.json'
 expected_manifest={'identity':identity,'jobs':{role:[key(r['sha256'],s,digest)for s in spec['seeds']]for role,r in spec['runtimes'].items()},'scope':'paired runtime confirmation; no default adoption'}
 if manifest.exists():assert load(manifest)==expected_manifest,'immutable study identity changed'
 else:save(manifest,expected_manifest)
 started=time.monotonic()
 start=0
 for end in spec['looks']:
  assert {str(p):sha(p)for p in CODE}==identity['code'],'collector/analysis source changed'
  if (OUT/f'look-{end}.json').exists():
   subprocess.run(['node','docs/evidence/cut300/analyze-repaired.mjs',str(SPEC),str(OUT),str(end)],check=True,stdout=subprocess.DEVNULL)
   report=load(OUT/f'look-{end}.json')
   if report['status']!='INCONCLUSIVE' or end==spec['looks'][-1]:print('Previously completed study '+report['status'],flush=True);return
   start=end;continue
  pending=[]
  def cleanup():
   for job in pending:
    child=job['child']
    if child.poll()is None:
     try:os.killpg(child.pid,signal.SIGTERM)
     except ProcessLookupError:pass
     try:child.wait(timeout=30)
     except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);child.wait()
    if not job['handle'].closed:job['handle'].close()
  atexit.register(cleanup)
  for role,runtime in spec['runtimes'].items():
   assert sha(Path(runtime['path']))==runtime['sha256'],'runtime changed'
   packet=OUT/'packets'/f'{start}-{end}-{role}.json';receipt=packet.with_suffix('.receipt.json');log=packet.with_suffix('.stderr')
   if receipt.exists():
    kept=load(receipt)
    assert sha(packet)==kept['packetSha256'] and kept['runtimeSha256']==runtime['sha256'] and kept['specSha256']==digest
    continue
   if packet.exists():raise RuntimeError(f'Unreceipted packet {packet}; audit prior process before retrying')
   env={k:v for k,v in os.environ.items()if not k.startswith(('DP_','IDLEVER_'))}
   args=[runtime['path'],'--seeds',','.join(spec['seeds'][start:end]),'--bots','PICKED,TUNED','--days','14','--checkins','3','--until-depth','33','--threads',str(spec['threads_per_runtime']),'--out',str(packet)]
   handle=log.open('w');child=subprocess.Popen(args,env=env,stdout=subprocess.DEVNULL,stderr=handle,start_new_session=True)
   pending.append({'role':role,'child':child,'handle':handle,'packet':packet,'receipt':receipt,'log':log,'count':-1})
   print(f'look{end}: collecting {role}, {end-start} seeds/{2*(end-start)} trajectories',flush=True)
  def stop(_sig,_frame):
   for job in pending:
    if job['child'].poll()is None:os.killpg(job['child'].pid,signal.SIGTERM)
   raise SystemExit(130)
  signal.signal(signal.SIGTERM,stop);signal.signal(signal.SIGINT,stop)
  while pending:
   for job in pending[:]:
    count=sum(line.startswith('stat_probe ')for line in job['log'].read_text().splitlines())
    if count!=job['count']:
     print(f"look{end} {job['role']}: {count}/{2*(end-start)} complete (outcomes sealed until fixed look)",flush=True);job['count']=count
    code=job['child'].poll()
    if code is None:continue
    job['handle'].close()
    if code!=0:
     for other in pending:
      if other['child'].poll()is None:os.killpg(other['child'].pid,signal.SIGTERM)
     raise RuntimeError(f"native {job['role']} exited{code}; preserve logs, do not interpret as an observation")
    assert job['packet'].exists()
    role=job['role'];runtime=spec['runtimes'][role]
    save(job['receipt'],{'role':role,'start':start,'end':end,'runtimeSha256':runtime['sha256'],'specSha256':digest,'packet':job['packet'].name,'packetSha256':sha(job['packet']),'nativeExit':0,'jobKeys':[key(runtime['sha256'],s,digest)for s in spec['seeds'][start:end]]})
    pending.remove(job)
   save(OUT/'state.json',{'phase':'collecting','look':end,'pending':[j['role']for j in pending],'elapsed_seconds':time.monotonic()-started})
   if pending:time.sleep(1)
  assert {str(p):sha(p)for p in CODE}==identity['code']
  analysis=subprocess.run(['node','docs/evidence/cut300/analyze-repaired.mjs',str(SPEC),str(OUT),str(end)],check=True,capture_output=True,text=True)
  print(analysis.stdout.strip(),flush=True)
  report=load(OUT/f'look-{end}.json')
  save(OUT/'state.json',{'phase':'complete'if report['status']!='INCONCLUSIVE'or end==32 else'between-looks','look':end,'status':report['status'],'elapsed_seconds':time.monotonic()-started})
  if report['status']!='INCONCLUSIVE':break
  start=end
if __name__=='__main__':main()
