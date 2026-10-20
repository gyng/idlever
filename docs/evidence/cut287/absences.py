"""Separate actual next8h outcomes with the same public Scout resume in all arms."""
from pathlib import Path
import json
import subprocess
import sys
seed=int(sys.argv[1]);assert seed in [1,2]
root=Path('target/cut287');selection=json.loads(Path('docs/evidence/cut287/frozen-selection.json').read_text())
for case in selection['selected']:
    if case['seed']!=seed:continue
    depth=case['start'];prefix=case['case'].removesuffix('-baseline');parent=root/case['case']/'normalized-input.json'
    for card in ['baseline',*{9:['gas_step','pack_break'],14:['boss_focus','corridor_fighting'],19:['reflect_read','corridor_fighting']}[depth]]:
        out=root/(prefix.replace('trace-','absence-')+'-'+card)
        argv=[str(root/'encounter-absence'),'absence',str(parent),str(out),'8',card]
        with (root/(out.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
        print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
        if p.returncode:sys.exit(p.returncode)
