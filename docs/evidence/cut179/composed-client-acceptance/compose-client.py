import pathlib,json,hashlib,subprocess,datetime,copy
root=pathlib.Path('/home/g/p/riddle');base=root/'scratchpad/cut179/revalidation';one=root/'scratchpad/cut179/cut29-current';out=root/'scratchpad/cut179/composed-acceptance'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
guard=json.loads((base/'source-identity.json').read_text());state=json.loads((base/'run-state.json').read_text());report=json.loads((base/'shipping-client-results.json').read_text());fresh=json.loads((one/'results.json').read_text())
assert state['status']=='failed' and state['steps'][-1]['exit_code']==1
assert report['selectedCount']==report['fullCount']==len(report['results'])==166
assert [r['n'] for r in report['results'] if r['code']]!=[]
assert [r['n'] for r in report['results'] if r['code']]==['cut29']
assert fresh['selectedCount']==len(fresh['results'])==1 and fresh['fullCount']==166 and not fresh['failed']
assert fresh['results'][0]['n']=='cut29' and fresh['results'][0]['code']==0
changed={f['path'] for f in guard['files'] if sha(root/f['path'])!=f['sha256']};assert changed=={'web/tests/cut29.mjs'},changed
old=(root/'docs/evidence/cut179/initial-complete-client-failure/original-cut29.mjs').read_text()
expected=old.replace(r'/^dealt 3\.7 dps/',r'/^dealt hero 3\.7 dps · 31 hp$/').replace(r'/^taken 4\.5 dps .*9 hits/',r'/^taken hero 4\.5 dps · 38 hp · 9 hits$/')
assert expected!=old and expected==(root/'web/tests/cut29.mjs').read_text(),'Only the two exact expectation expressions may change'
# Cut29 is a standalone job. No other source/test/tool imports that test module.
for top in ['web/src','web/tests','tools']:
 for p in (root/top).rglob('*'):
  if p.is_file() and p.suffix in ['.mjs','.js','.ts'] and p!=root/'web/tests/cut29.mjs':
   s=p.read_text()
   assert 'cut29.mjs' not in s,'Unexpected dependent module '+str(p)
wasm=root/'web/src/engine/pkg/riddle_wasm_bg.wasm';assert sha(wasm)==guard['shipping_wasm']['sha256']
script="import{readdirSync}from'node:fs';import{expand}from'./tests/lib/suites.mjs';console.log(JSON.stringify(readdirSync('tests').filter(f=>f.endsWith('.mjs')&&!['run.mjs','screen-time.mjs','town-gpu.mjs'].includes(f)).map(f=>f.slice(0,-4)).sort().flatMap(expand).sort()))"
names=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=root/'web',text=True))
results=[copy.deepcopy(r) for r in report['results'] if r['n']!='cut29']+[copy.deepcopy(fresh['results'][0])]
assert len(names)==len(results)==len({r['n'] for r in results})==166 and sorted(r['n'] for r in results)==names
assert all(r['code']==0 for r in results)
control=next(r['out'] for r in results if r['n']=='take-control')
for marker in ['ok   the hero click interrupts an active walk','ok   the stop pointer hits the currently drawn hero','ok   a click on him stops the walk','ok   a click walks several tiles']:assert marker in control
out.mkdir(exist_ok=False)
current=copy.deepcopy(guard);current['scope']='Exact Cut179 source accepted by derived coverage:165 retained current passing groups plus fresh complete Cut29; original whole invocation remains FAILED'
for f in current['files']:f['sha256']=sha(root/f['path'])
current['changed_since_initial_complete_run']=sorted(changed)
(out/'source-identity.json').write_text(json.dumps(current,indent=2)+'\n')
derived=copy.deepcopy(report);derived.update(results=results,failed=False,composed=True,scope=current['scope'],sourceReports=[{'path':str(base/'shipping-client-results.json'),'sha256':sha(base/'shipping-client-results.json'),'status':'FAILED165/166'},{'path':str(one/'results.json'),'sha256':sha(one/'results.json'),'status':'PASS complete Cut29'}])
(out/'shipping-client-results.json').write_text(json.dumps(derived,indent=2)+'\n')
accepted={'status':'passed','scope':current['scope'],'acceptanceKind':'composed exact166 current groups; NOT a successful single full invocation','commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'shipping_wasm':guard['shipping_wasm'],'updated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'originalWholeInvocation':{'status':'failed','exitCode':1,'sha256':sha(base/'run-state.json')},'validatedGroups':166,'steps':[{'name':'retained165 completed passing groups','status':'passed','originalReport':derived['sourceReports'][0]},{'name':'fresh complete Cut29','status':'passed','exitCode':0,'originalReport':derived['sourceReports'][1]}]}
(out/'run-state.json').write_text(json.dumps(accepted,indent=2)+'\n')
print('PASS derived all166 current groups:165 original passed + fresh complete strengthened Cut29; original full invocation remains FAILED. Shared730 inputs/WASM unchanged except exact2 Cut29 expectations; no dependent imports; original control branches retained.')
