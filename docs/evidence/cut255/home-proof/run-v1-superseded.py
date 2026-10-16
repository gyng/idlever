import pathlib,subprocess,os,json,datetime,time
root=pathlib.Path('/home/g/p/riddle');p=root/'docs/evidence/cut255/home-proof';node='/home/g/.nvm/versions/node/v22.18.0/bin/node';env={**os.environ,'PATH':str(pathlib.Path(node).parent)+':'+os.environ['PATH'],'TMPDIR':str(root/'scratchpad/browser-tmp')};start=time.monotonic();r={'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'wrapper_pid':os.getpid(),'namespace':os.readlink('/proc/self/ns/pid'),'attempt':'attempt-1','max_browser_lanes':1}
with(p/'attempt-1.log').open('xb')as log:
 child=subprocess.Popen([node,str(p/'check.mjs'),'attempt-1'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT);r['node_pid']=child.pid;(p/'process.json').write_text(json.dumps(r,indent=2)+'\n');code=child.wait()
r.update({'terminal_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':code,'wall_seconds':time.monotonic()-start});(p/'terminal.json').write_text(json.dumps(r,indent=2)+'\n');raise SystemExit(code)
