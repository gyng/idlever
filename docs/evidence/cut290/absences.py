from pathlib import Path
import json
import subprocess
import sys
scene=sys.argv[1];assert scene in ['gas','pack'];root=Path('target/cut290');binary=root/'encounter-catalogue'
for weapon in ['sword','bow']:
    parent=root/f'loadout-{scene}-{weapon}-fire1/after.json'
    for policy,choice in [('baseline','baseline'),('gas0','gas_step@0')]:
        out=root/f'absence-{scene}-{weapon}-fire1-{policy}'
        argv=[str(binary),'absence',str(parent),str(out),'8',choice]
        with (root/(out.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
        print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
        if p.returncode:raise SystemExit(p.returncode)
