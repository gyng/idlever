"""Fixed three-baseline-departure chains for one seed; no outcome-driven extension."""
from pathlib import Path
import json
import subprocess
import sys

seed=int(sys.argv[1]);assert seed in [1,2]
root=Path('target/cut287');binary=root/'encounter-catalogue'
for depth,cards in [(9,'gas_step,pack_break'),(14,'boss_focus,corridor_fighting'),(19,'reflect_read,corridor_fighting')]:
    source=Path(f'target/cut286/prepare-s{seed}-d{depth}/after.json')
    for attempt in range(1,4):
        label=f's{seed}-d{depth}-a{attempt}'
        for mode,src,out,arg,extra in [
            ('prepare',source,root/f'prepare-{label}',str(depth),[cards,'fire']),
            ('trace',root/f'prepare-{label}/after.json',root/f'trace-{label}-baseline',str(depth),['baseline'])]:
            argv=[str(binary),mode,str(src),str(out),arg,*extra]
            with (root/f'{mode}-{label}.txt').open('x') as log:
                p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT,check=False)
            print(json.dumps({'argv':argv,'exit':p.returncode}),flush=True)
            if p.returncode:sys.exit(p.returncode)
        source=root/f'trace-{label}-baseline/after.json'
