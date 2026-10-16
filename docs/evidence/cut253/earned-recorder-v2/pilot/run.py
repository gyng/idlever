"""One authorized fresh pilot. Preserve positive terminal receipts, including failures."""
import datetime, hashlib, json, os, pathlib, subprocess, time
root=pathlib.Path('/home/g/p/riddle')
out=root/'docs/evidence/cut253/earned-recorder-v2/pilot'
binary=root/'target/fast/examples/advanced_campaign'
command=[str(binary),str(out/'campaign'),'1','fighter','--hours','336']
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(name,value):
 p=out/name; tmp=p.with_suffix(p.suffix+'.tmp'); tmp.write_text(json.dumps(value,indent=2)+'\n'); tmp.replace(p)
identity={'started_utc':now(),'wrapper_pid':os.getpid(),'pid_namespace':os.readlink('/proc/self/ns/pid'),'command':command,'cwd':str(root),'binary_sha256':sha(binary),'example_sha256':sha(root/'crates/idlever-core/examples/advanced_campaign.rs'),'protocol_sha256':sha(root/'docs/evidence/cut253/earned-preparation/protocol.md'),'scope':'Fresh seed1 Fighter recorder successor only;336h requested cap; captures are additive; compare exact original outcome/clock/save bytes; no grants/tuning/wider cohorts.'}
start=time.monotonic()
with (out/'campaign.log').open('xb') as log:
 p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 identity['campaign_pid']=p.pid
 write('process.json',identity)
 status=p.wait()
 identity.update({'terminal_utc':now(),'exit_code':status,'wall_seconds':time.monotonic()-start,'binary_sha256_after':sha(binary),'example_sha256_after':sha(root/'crates/idlever-core/examples/advanced_campaign.rs')})
 write('terminal.json',identity)
raise SystemExit(status)
