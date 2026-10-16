import pathlib,subprocess,json,os,datetime,time
root=pathlib.Path('/home/g/p/riddle');out=root/'docs/evidence/cut253/earned-other-classes-ui';node=pathlib.Path('/home/g/.nvm/versions/node/v22.18.0/bin/node');env={**os.environ,'PATH':str(node.parent)+':'+os.environ['PATH'],'TMPDIR':str(root/'scratchpad/browser-tmp')};pathlib.Path(env['TMPDIR']).mkdir(parents=True,exist_ok=True)
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat();state={'started_utc':now(),'wrapper_pid':os.getpid(),'namespace':os.readlink('/proc/self/ns/pid'),'max_browser_lanes':1,'cases':{}};begun=time.monotonic()
def save():
 p=out/'status.json';q=p.with_suffix('.tmp');q.write_text(json.dumps(state,indent=2)+'\n');q.replace(p)
save()
for cls in ['rogue','ranger','caster','gunner']:
 row={'class':cls,'started_utc':now(),'status':'RUNNING'}
 with(out/(cls+'-attempt-1.log')).open('xb')as log:
  p=subprocess.Popen([str(node),str(out/'check.mjs'),cls,'attempt-1'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT);row['node_pid']=p.pid;state['cases'][cls]=row;save();code=p.wait()
 row.update({'exit_code':code,'status':'TERMINAL','terminal_utc':now()});save()
state.update({'terminal_utc':now(),'wall_seconds':time.monotonic()-begun,'exit_code':0 if all(x['exit_code']==0 for x in state['cases'].values())else 1});save();raise SystemExit(state['exit_code'])
