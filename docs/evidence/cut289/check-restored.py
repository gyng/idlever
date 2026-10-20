"""Check the rebuilt restored executable against original frozen Cut287 bytes."""
from pathlib import Path
import hashlib
import json
import subprocess
root=Path('target/cut289');expected={f['path']:f['sha256'] for f in json.loads(Path('docs/evidence/cut287/manifest.json').read_text())['files']};sha=lambda b:hashlib.sha256(b).hexdigest();receipts=[]
binary=Path('target/cut282-native/fast/examples/encounter_catalogue')
for label,seed in [('gas',1),('pack',2)]:
 source=Path(f'target/cut287/trace-s{seed}-d9-a2-baseline/normalized-input.json');out=root/f'restored-{label}'
 argv=[str(binary),'trace',str(source),str(out),'9','gas_step']
 with (root/f'restored-{label}.txt').open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
 assert p.returncode==0
 checks={}
 for new,old in [('events.json','events.json'),('after.json','after.json')]:
  actual=sha((out/new).read_bytes());prior=expected[f'trace-s{seed}-d9-a2-gas_step/'+old];assert actual==prior;checks[new]={'sha256':actual,'equals_original_cut287':True}
 receipts.append({'case':label,'argv':argv,'checks':checks})
Path('docs/evidence/cut289/restored-runtime-check.json').write_text(json.dumps({'binary_sha256':sha(binary.read_bytes()),'status':'PASS','cases':receipts},indent=2)+'\n')
print('PASS rebuilt restored executable: both complete event streams and complete after-saves equal original frozen Cut287 bytes')
