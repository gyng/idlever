from pathlib import Path
import subprocess
import json
root=Path('target/cut290');binary=root/'encounter-purchase'
for scene in ['gas','pack']:
    src=root/f'loadout-{scene}-sword-fire3/after.json';purchase=root/f'purchase-{scene}-throw'
    argv=[str(binary),'purchase',str(src),str(purchase),'throw']
    with (root/(purchase.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
    print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
    if p.returncode:continue
    for policy,choice in [('baseline','baseline'),('gas1','gas_step@1')]:
        out=root/f'trace-throw-{scene}-sword-fire3-{policy}'
        argv=[str(binary),'trace',str(purchase/'after.json'),str(out),'9',choice]
        with (root/(out.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
        print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
        if p.returncode:raise SystemExit(p.returncode)
