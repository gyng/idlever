import datetime,hashlib,json,os,pathlib,subprocess,time
root=pathlib.Path('/home/g/p/riddle');out=root/'scratchpad/cut179/revalidation'
old=json.loads((root/'docs/evidence/cut178/complete-client/raw/source-identity.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=[{'path':f['path'],'sha256':sha(root/f['path'])} for f in old['files']]
changed={f['path'] for f,n in zip(old['files'],files) if f['sha256']!=n['sha256']}
allowed={'tools/driver.mjs','web/src/ui/heroes.ts','web/src/ui/meters.ts','web/src/ui/party.ts','web/src/ui/settings.ts','web/tests/bloodline-founding.mjs','web/tests/report-time-scope.mjs','web/tests/companion-chrome.mjs'}
assert changed==allowed,('Unexpected changes from complete accepted Cut178',changed^allowed)
dirty=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=root,text=True).splitlines()
assert set(dirty)==allowed|{'docs/HANDOFF.md'},dirty
pkg=root/'web/src/engine/pkg';assert pkg.is_dir() and not pkg.is_symlink()
wasm=pkg/'riddle_wasm_bg.wasm';accepted={**old['shipping_wasm'],'bytes':wasm.stat().st_size,'sha256':sha(wasm)}
assert accepted['sha256']==old['shipping_wasm']['sha256'],'Presentation-only change must retain accepted shipping WASM'
for key in ['RIDDLE_WATCH_STEP_DELAY_MS','DP_OFF','DP_STALLS','RIDDLE_BALANCE_JSON','RIDDLE_SKIP_TWIST']:
 assert not os.environ.get(key),('Unexpected override',key)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
identity={'scope':'Cut179 exact unadopted candidate source and unchanged accepted shipping WASM; unchanged Rust retains terminal native acceptance','uncommitted_paths':dirty,'commit':head,'files':files,'changed_since_cut178':sorted(changed),'shipping_wasm':accepted}
(out/'source-identity.json').write_text(json.dumps(identity,indent=2)+'\n')
state={'scope':'Complete Cut179 candidate client acceptance only; not adoption, QA, freeze or score','status':'running','commit':head,'shipping_wasm':accepted,'steps':[]}
def persist():
 state['updated_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/'run-state.json').write_text(json.dumps(state,indent=2)+'\n')
def check():
 for f in files:assert sha(root/f['path'])==f['sha256'],('Guard changed',f['path'])
 assert sha(wasm)==accepted['sha256']
persist();check()
for name,cmd,cwd in [('types',['pnpm','-s','exec','tsc','--noEmit'],root/'web'),('copy',['node','tools/copy-lint.mjs'],root),('web-build',['pnpm','-s','build'],root/'web'),('shipping-whole-client',['node','tests/run.mjs','--full','--report',str(out/'shipping-client-results.json')],root/'web')]:
 check();entry={'name':name,'command':cmd,'status':'running','started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()};state['steps'].append(entry);state['current']=name;persist();print('START',name,flush=True)
 env=os.environ.copy()
 if name=='shipping-whole-client':env.update(TEST_JOBS='3',TEST_HEAVY_WIDTH='1')
 started=time.monotonic()
 with (out/(name+'.log')).open('w') as log:
  proc=subprocess.Popen(cmd,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT);entry['pid']=proc.pid;persist();code=proc.wait()
 entry.update(status='passed' if code==0 else 'failed',exit_code=code,elapsed_seconds=time.monotonic()-started);persist();check();print('END',name,code,round(entry['elapsed_seconds'],1),flush=True)
 if code:state['status']='failed';persist();raise SystemExit(code)
report=json.loads((out/'shipping-client-results.json').read_text())
script="import{readdirSync}from'node:fs';import{expand}from'./tests/lib/suites.mjs';console.log(JSON.stringify(readdirSync('tests').filter(f=>f.endsWith('.mjs')&&!['run.mjs','screen-time.mjs','town-gpu.mjs'].includes(f)).map(f=>f.slice(0,-4)).sort().flatMap(expand).sort()))"
names=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=root/'web',text=True))
actual=[x['n'] for x in report['results']]
assert len(names)==166 and sorted(actual)==names and len(set(actual))==len(actual)
assert report['selectedCount']==report['fullCount']==len(actual)==166 and not report['failed'] and all(x['code']==0 for x in report['results'])
control=next(x['out'] for x in report['results'] if x['n']=='take-control')
for marker in ['ok   the hero click interrupts an active walk','ok   the stop pointer hits the currently drawn hero','ok   a click on him stops the walk','ok   a click walks several tiles']:assert marker in control
check();state['status']='passed';persist();print('PASS all166 guarded Cut179 client groups; complete QA/freeze/blind ratings remain required',flush=True)
