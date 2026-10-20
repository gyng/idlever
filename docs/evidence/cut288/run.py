"""Fixed four-arm public learned-counter intervention; no random search."""
from pathlib import Path
import subprocess
import sys
import json
scene=sys.argv[1];assert scene in ['summoner','reflection']
root=Path('target/cut288');binary=root/'encounter-catalogue'
if scene=='summoner':depth=14;boss='lich';special='boss_focus';source=Path('target/cut287/trace-s1-d14-a1-baseline/normalized-input.json')
else:depth=19;boss='foundry_master';special='reflect_read';source=Path('target/cut287/trace-s1-d19-a2-baseline/normalized-input.json')
def call(argv,label):
    with (root/(label+'.txt')).open('x') as log:p=subprocess.run([str(x) for x in argv],stdout=log,stderr=subprocess.STDOUT,check=False)
    print(json.dumps({'argv':[str(x) for x in argv],'exit':p.returncode}),flush=True)
    if p.returncode:sys.exit(p.returncode)
for state in ['enabled','revoked']:
    prep=root/f'prepare-{scene}-{state}'
    argv=[binary,'prepare',source,prep,depth,special+',corridor_fighting','fire']
    if state=='revoked':argv.append(boss)
    call(argv,prep.name)
    for card in ['baseline'] if state=='enabled' else ['baseline',special,'corridor_fighting']:
        out=root/f'trace-{scene}-{state}-{card}'
        call([binary,'trace',prep/'after.json',out,depth,card],out.name)
