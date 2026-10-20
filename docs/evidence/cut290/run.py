"""Fixed loadout/policy grid on one original earned parent; no new seed search."""
from pathlib import Path
import json
import subprocess
import sys
scene=sys.argv[1];seed={'gas':1,'pack':2}[scene];root=Path('target/cut290');binary=root/'encounter-catalogue'
source=Path(f'target/cut287/trace-s{seed}-d9-a2-baseline/normalized-input.json')
def run(argv,label):
    with (root/(label+'.txt')).open('x') as log:p=subprocess.run([str(x) for x in argv],stdout=log,stderr=subprocess.STDOUT,check=False)
    print(json.dumps({'argv':[str(x) for x in argv],'exit':p.returncode}),flush=True)
    if p.returncode:raise SystemExit(p.returncode)
for weapon in ['sword','bow']:
    for fire in [1,3]:
        label=f'{scene}-{weapon}-fire{fire}';config=root/(label+'-config.json')
        with config.open('x') as f:json.dump({'weapon':weapon,'armour':None,'supplies':['heal','heal']+['fire']*fire},f)
        prep=root/('loadout-'+label)
        run([binary,'loadout',source,prep,config],prep.name)
        for policy,choice in [('baseline','baseline'),('gas0','gas_step@0'),('gas1','gas_step@1')]:
            out=root/f'trace-{label}-{policy}'
            run([binary,'trace',prep/'after.json',out,'9',choice],out.name)
