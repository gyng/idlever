"""Run only the baseline-frozen selection; no fallback selection after outcomes."""
from pathlib import Path
import json
import subprocess
import sys
seed=int(sys.argv[1]);assert seed in [1,2]
root=Path('target/cut287');selection=json.loads(Path('docs/evidence/cut287/frozen-selection.json').read_text())
for case in selection['selected']:
    if case['seed']!=seed:continue
    depth=case['start'];prefix=case['case'].removesuffix('-baseline')
    parent=root/case['case']/'normalized-input.json'
    cards={9:['gas_step','pack_break'],14:['boss_focus','corridor_fighting'],19:['reflect_read','corridor_fighting']}[depth]
    for card in cards:
        out=root/(prefix+'-'+card)
        argv=[str(root/'encounter-catalogue'),'trace',str(parent),str(out),str(depth),card]
        with (root/(out.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
        print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
        if p.returncode:sys.exit(p.returncode)
