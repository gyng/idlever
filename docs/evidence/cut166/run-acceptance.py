import datetime,hashlib,json,os,pathlib,subprocess,sys,time
root=pathlib.Path('/home/g/p/riddle');out=root/'scratchpad/cut166';os.chdir(root)
identity=json.loads((out/'source-identity.json').read_text())
state={'scope':'Current-runtime mechanical acceptance, not a blind score or actor adoption','status':'starting','steps':[]}
def persist():
 state['updated_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
 (out/'run-state.json').write_text(json.dumps(state,indent=2)+'\n')
def check_sources():
 for item in identity['files']:
  if hashlib.sha256((root/item['path']).read_bytes()).hexdigest()!=item['sha256']:
   state['status']='source_changed';state['changed']=item['path'];persist();raise SystemExit(3)
rows='idle-d8,idle-d13,idle-d23,idle-stall,idle-gold,idle-king,idle-stages,picked-idle,outpace,picked-stages,reach,stalls-idle,stalls-picked,stalls-tuned,tuned-picked,random-picked,hands-idle,automation-pays,picked-l-king,picked-l-purse,porter,scout'
steps=[
 ('actor-paid-actions',['cargo','test','-q','--profile','fast','-p','riddle-core','--example','dayplayer','session_chore_tests']),
 ('actor-resume',['cargo','test','-q','--profile','fast','-p','riddle-core','--example','dayplayer','checkpoint_tests::resume_preserves_complete_bot_outputs_and_game']),
 ('actor16',['node','tools/gates.mjs','--full','--rows',rows,'--fail-fast','--seeds','16','--tuned-seeds','16','--loo-seeds','16']),
 ('full-routine',['tools/verify.sh','--full']),
 ('shipping-whole-client',['node','tests/run.mjs','--full','--report',str(out/'shipping-client-results.json')])]
check_sources();persist()
for name,cmd in steps:
 check_sources()
 entry={'name':name,'command':cmd,'status':'running','started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 state['steps'].append(entry);state['status']='running';state['current']=name;persist()
 print('START',name,flush=True);start=time.monotonic()
 env=os.environ.copy()
 if name=='shipping-whole-client':env.update(TEST_JOBS='3',TEST_HEAVY_WIDTH='1')
 with (out/(name+'.log')).open('w') as log:
  p=subprocess.Popen(cmd,cwd=root/'web' if name=='shipping-whole-client' else root,env=env,stdout=log,stderr=subprocess.STDOUT)
  entry['pid']=p.pid;persist();code=p.wait()
 entry.update(status='passed' if code==0 else 'failed',exit_code=code,elapsed_seconds=time.monotonic()-start,finished_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
 persist();print('END',name,'exit',code,'seconds',round(entry['elapsed_seconds'],1),flush=True)
 if code!=0:state['status']='failed';persist();sys.exit(code if code>0 else 1)
 if name=='full-routine':
  wasm=root/'web/src/engine/pkg/riddle_wasm_bg.wasm'
  state['shipping_wasm']={'bytes':wasm.stat().st_size,'sha256':hashlib.sha256(wasm.read_bytes()).hexdigest()};persist()
state['status']='passed';persist();print('PASS: planned mechanical acceptance complete; actor adoption, QA, freeze and independent ratings still require audit.',flush=True)
