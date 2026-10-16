"""Authorized6linked continuations, fixed policy, bounded3native processes, no automatic retry."""
import concurrent.futures,datetime,hashlib,json,os,pathlib,subprocess,sys,threading,time
ROOT=pathlib.Path('/home/g/p/riddle');OUT=ROOT/'docs/evidence/cut253/earned-continuations-v3';BINARY=ROOT/'target/fast/examples/advanced_campaign'
CASES=[(c,s)for c in ['caster','gunner']for s in [1,3,5]]
assert len(CASES)==6
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[ROOT/'Cargo.lock',ROOT/'crates/idlever-core/Cargo.toml',ROOT/'crates/idlever-core/examples/advanced_campaign.rs',ROOT/'crates/idlever-core/examples/gunner_support/mod.rs',ROOT/'docs/evidence/cut253/earned-preparation/protocol.md',ROOT/'web/src/engine/pkg/idlever_wasm_bg.wasm']+sorted((ROOT/'crates/idlever-core/src').rglob('*.rs'))
def identity():return {'binary_sha256':sha(BINARY),'files':{str(p.relative_to(ROOT)):sha(p)for p in paths}}
frozen=identity();lock=threading.Lock();start=time.monotonic();resume='--resume'in sys.argv
state={'started_utc':now(),'wrapper_pid':os.getpid(),'pid_namespace':os.readlink('/proc/self/ns/pid'),'max_native_processes':3,'source_identity':frozen,'runner_sha256':sha(pathlib.Path(__file__)),'scope':'Six authorized linked continuations only. Every original refusal remains; exact original336h remaining requested-s budget, plus separately recorded real recovery time. No grants/forcedhome/policy changes. Fresh_origin=false retained; parent chain preserves genuine fresh seed and actual defeats. No all5UI/zero-defeat/fun/strictactualclock acceptance.','cases':{}}
def write(p,value):
 tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_text(json.dumps(value,indent=2)+'\n');tmp.replace(p)
def flush():write(OUT/'status.json',state)
if(OUT/'status.json').exists():
 if not resume:raise RuntimeError('existing batch; no automatic retry; explicit --resume required')
 old=json.loads((OUT/'status.json').read_text());assert old['source_identity']==frozen,'resume source/binary/protocol/package mismatch'
 for row in old['cases'].values():
  if row.get('status')=='RUNNING':
   q=pathlib.Path('/proc')/str(row['native_pid'])/'cmdline'
   if q.exists()and str(BINARY).encode()in q.read_bytes():raise RuntimeError('original native still live; never duplicate')
 state['resumed_from']=old
flush()
def run(case):
 cls,seed=case;name=f'{cls}-seed{seed}';d=OUT/name
 if resume and(d/'terminal.json').exists():
  old=json.loads((d/'terminal.json').read_text())
  if old['exit_code']==0:
   assert old['binary_sha256']==frozen['binary_sha256']
   with lock:state['cases'][name]={**old,'reused_terminal':True};flush()
   return old
 d.mkdir(exist_ok=resume)
 parent=ROOT/'docs/evidence/cut253/earned-cohorts-v2'/name/'campaign';ps=json.loads((parent/'state.json').read_text());source=parent/ps['save'];remaining=336*3600-ps['requested_s'];assert remaining>0 and not(parent/'result.json').exists()
 provenance={'parent_state_sha256':sha(parent/'state.json'),'parent_session':str(source.relative_to(ROOT)),'parent_session_sha256':sha(source),'parent_original_session_sha256':sha(parent/'original.session.json'),'parent_requested_s':ps['requested_s'],'original_requested_bound_s':336*3600,'remaining_requested_s':remaining,'parent_actual_observed':ps['observed'],'parent_fresh_origin':ps['fresh_origin']}
 write(d/'parent-provenance.json',provenance)
 cmd=[str(BINARY),str(d/'campaign'),str(seed),cls,'--from',str(source),'--seconds',str(remaining)]
 if resume and(d/'campaign/state.json').exists():cmd.append('--resume')
 row={'case':name,'seed':seed,'class':cls,'started_utc':now(),'command':cmd,'binary_sha256':frozen['binary_sha256'],'status':'RUNNING'}
 begun=time.monotonic();log=d/('resume.log'if resume else'campaign.log')
 with log.open('xb')as output:
  native=subprocess.Popen(cmd,cwd=ROOT,stdout=output,stderr=subprocess.STDOUT);row['native_pid']=native.pid
  with lock:state['cases'][name]=row.copy();write(d/'process.json',row);flush()
  code=native.wait()
 row.update({'terminal_utc':now(),'exit_code':code,'wall_seconds':time.monotonic()-begun,'status':'TERMINAL','source_identity_unchanged':identity()==frozen,'parent_session_unchanged':sha(source)==provenance['parent_session_sha256']})
 result=d/'campaign/result.json'
 if result.exists():
  r=json.loads(result.read_text());o=r['observed'];row.update({'native_status':r['status'],'requested_s':r['requested_s'],'stages':r['stages'],'paired':r['paired'],'zero_defeat_all_stages':r['zero_defeat_all_stages'],'final':{k:o[k]for k in ['class','clock_s','gold','best','level','completed','deaths','kit']}})
 with lock:write(d/'terminal.json',row);state['cases'][name]=row.copy();flush()
 return row
try:
 with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:results=list(pool.map(run,CASES))
 state.update({'terminal_utc':now(),'wall_seconds':time.monotonic()-start,'source_identity_unchanged':identity()==frozen,'exit_code':0 if all(r['exit_code']==0 and r['source_identity_unchanged']for r in results)else 1})
 with lock:flush();write(OUT/'terminal.json',state)
except BaseException as e:
 with lock:state.update({'terminal_utc':now(),'error':repr(e),'exit_code':1});flush();write(OUT/'terminal.json',state)
 raise
raise SystemExit(state['exit_code'])
