from pathlib import Path
import subprocess
import sys
import json
phase=sys.argv[1];assert phase in ['before','after']
root=Path('target/cut291');binary=root/('probe-'+phase)
for scene in ['gas','pack']:
    for permission in ['locked','learned']:
        source=Path(f'target/cut290/loadout-{scene}-sword-fire3/after.json') if permission=='locked' else Path(f'target/cut290/purchase-{scene}-throw/after.json')
        out=root/f'{phase}-{scene}-{permission}'
        argv=[str(binary),'reasons',str(source),str(out),'50','gas_step@1']
        with (root/(out.name+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
        print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
        assert p.returncode==0
        trace=json.loads((out/'trace.json').read_text());reasons=[(t['t'],w['row'],w['why']) for t in trace for w in (t.get('rows') or []) if w['why'] in ['no line','not learned']]
        print(scene,permission,reasons,flush=True)
