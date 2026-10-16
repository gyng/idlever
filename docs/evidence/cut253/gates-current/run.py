#!/usr/bin/env python3
"""Durable exact-source pacing→routine full. Never tunes, retries or rebuilds WASM."""
import datetime,hashlib,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path('/home/g/p/riddle');OUT=ROOT/'docs/evidence/cut253/gates-current';os.chdir(ROOT)
NODE='/home/g/.nvm/versions/node/v22.18.0/bin/node'
ENV={**os.environ,'PATH':str(Path(NODE).parent)+':'+os.environ['PATH'],'GATES_THREADS':'16'}
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
utc=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(name,value):
 p=OUT/name;t=OUT/(name+'.tmp');t.write_text(json.dumps(value,indent=2)+'\n');t.replace(p)
def source():
 paths=[*Path('crates').rglob('*.rs'),Path('Cargo.toml'),Path('Cargo.lock'),Path('tools/gates.mjs'),Path('tools/runtime-key.mjs'),Path(__file__).relative_to(ROOT)]
 paths += list(Path('crates/idlever-core/presets').rglob('*.json'))+list(Path('eval/cards').glob('*.rules.json'))+list(Path('web/src/engine/pkg').rglob('*'))
 return {str(p):sha(p) for p in sorted(set(paths)) if p.is_file()}
def binaries():
 return {str(p):{'sha256':sha(p),'bytes':p.stat().st_size} for p in [Path('target/fast/examples')/n for n in ['dayplayer','metrics','qa']] if p.is_file()}
def caches():
 base=Path('target/gates');top={str(p):{'sha256':sha(p),'bytes':p.stat().st_size} for p in base.glob('*.txt') if p.is_file()};nested={}
 for p in base.rglob('*'):
  if p.is_file() and p.parent!=base:nested[p.parts[2] if len(p.parts)>2 else '.']=nested.get(p.parts[2] if len(p.parts)>2 else '.',0)+1
 return {'topLevelCompletedLegs':top,'nestedJobFileCounts':nested,'scope':'Existing matching caches are allowed; exact keys and hits remain in native runner logs. Counts alone are not acceptance.'}
assert not (OUT/'state.json').exists(),'refuse overwrite prior launch'
assert all(not ENV.get(k) for k in ['IDLEVER_BALANCE_JSON','IDLEVER_BALANCE_FILE']),'default profile only'
expected='ef4b58d7fb4ab69056c8101ce8e528087bdbf6fb47fb561b8926645aebb4eb79';assert sha('web/src/engine/pkg/idlever_wasm_bg.wasm')==expected
before=source();write('source-before.json',{'utc':utc(),'files':before,'scope':'Frozen native source/harness/runtime inputs/package; root UI/art files deliberately outside native identity.'});write('cache-before.json',caches())
state={'startedUtc':utc(),'wrapperPid':os.getpid(),'wrapperPgid':os.getpgrp(),'status':'running','sourceCommitAtLaunch':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'node':subprocess.check_output([NODE,'--version'],text=True).strip(),'rustc':subprocess.check_output(['rustc','-vV'],text=True),'threads':16,'balanceOverrides':{k:ENV.get(k) for k in ['IDLEVER_BALANCE_JSON','IDLEVER_BALANCE_FILE']},'wasmSha256':expected,'stages':[],'scope':'Pacing pack is targeted16seed acceptance, not routine gate. Routine full is18current-player cases plus16RANDOM row; exhaustive/all40/fun remain separate.'};write('state.json',state)
try:
 for name,args in [('pacing',['--pacing','--fail-fast']),('routine-full',['--full'])]:
  unchanged=source()==before
  if not unchanged:raise RuntimeError('source/harness/runtime identity drift before '+name)
  log=OUT/(name+'.log');stage={'name':name,'command':[NODE,'tools/gates.mjs',*args],'startedUtc':utc(),'status':'running','log':str(log.relative_to(ROOT)),'binariesBefore':binaries()};state['stages'].append(stage)
  with log.open('x') as f:
   p=subprocess.Popen(stage['command'],stdout=f,stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,env=ENV);stage['pid']=p.pid;stage['pgid']=os.getpgid(p.pid);write('state.json',state)
   print(json.dumps({'utc':utc(),'stage':name,'pid':p.pid,'pgid':stage['pgid'],'status':'running'}),flush=True)
   while True:
    try:code=p.wait(timeout=30);break
    except subprocess.TimeoutExpired:
     stage['lastLiveCheckpointUtc']=utc();stage['logBytes']=log.stat().st_size;stage['binariesObserved']=binaries();write('state.json',state);print(json.dumps({'utc':utc(),'stage':name,'pid':p.pid,'status':'live','logBytes':stage['logBytes']}),flush=True)
  text=log.read_text();stage.update({'finishedUtc':utc(),'exit':code,'signal':-code if code<0 else None,'logSha256':sha(log),'binariesAfter':binaries(),'sourceUnchanged':source()==before,'cachedLines':[l for l in text.splitlines() if 'cached' in l or 'cache hits=' in l]})
  marker=('gates: TARGETED' in text and ' PASS; not a gate pass' in text) if name=='pacing' else ('gates: all PASS' in text and 'dayplayer: all selected regression bars pass' in text)
  stage['expectedTerminalMarker']=marker;stage['status']='PASS' if code==0 and marker and stage['sourceUnchanged'] else 'FAIL';write(name+'-terminal.json',stage);write('state.json',state)
  print(json.dumps({'utc':utc(),'stage':name,'exit':code,'status':stage['status'],'sourceUnchanged':stage['sourceUnchanged']}),flush=True)
  if stage['status']!='PASS':state['status']='FAIL';state['notStarted']='routine-full' if name=='pacing' else None;break
 else:state['status']='PASS'
except BaseException as error:
 state['status']='interrupted-or-error';state['error']=repr(error);write('state.json',state);raise
finally:
 state['finishedUtc']=utc();state['sourceUnchangedAtWrapperEnd']=source()==before;state['binariesAtWrapperEnd']=binaries();write('cache-after.json',caches());write('state.json',state);write('wrapper-terminal.json',state)
print(json.dumps({'utc':utc(),'wrapper':'terminal','status':state['status']}),flush=True)
sys.exit(0 if state['status']=='PASS' else 1)
