from pathlib import Path
import subprocess
import json
root=Path('target/cut289');binary=root/'probe-candidate'
for label,seed in [('gas',1),('pack',2)]:
 source=Path(f'target/cut287/trace-s{seed}-d9-a2-baseline/normalized-input.json');out=root/f'{label}-candidate'
 with (root/f'{label}-candidate.txt').open('x') as log:p=subprocess.run([str(binary),'trace',str(source),str(out),'9','gas_step'],stdout=log,stderr=subprocess.STDOUT)
 print(label,p.returncode,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
 frames=json.loads((out/'frames.json').read_text());es=[e for f in frames if f['before'] and f['before']['depth']==9 for e in f['events']];damage=sum(e.get('dmg',0) for e in es if e.get('k')=='hurt' and e.get('id')==1);gas=sum(e.get('dmg',0) for e in es if e.get('k')=='hurt' and e.get('id')==1 and e.get('cause')=='gas');ticks=max(e['t'] for e in es);record={'case':label,'hurt':damage,'gas_hurt':gas,'last_initial_floor_event_tick':ticks,'uses':[e for e in es if e.get('k')=='use']};(root/f'{label}-candidate-metrics.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record),flush=True)
