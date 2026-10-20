from pathlib import Path
import subprocess
import json
root=Path('target/cut288');binary=root/'encounter-catalogue';parent=root/'prepare-reflection-enabled/after.json'
for mode,cards in [('trace',['reflect_read','corridor_fighting']),('absence',['baseline','reflect_read','corridor_fighting'])]:
    for card in cards:
        out=root/f'{mode}-reflection-enabled-{card}'
        argv=[str(binary),mode,str(parent),str(out),'19' if mode=='trace' else '8',card]
        with (root/(out.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
        print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
        if p.returncode:raise SystemExit(p.returncode)
