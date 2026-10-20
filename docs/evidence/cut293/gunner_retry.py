"""Same two declared choices after correcting public firearm selection API."""
from pathlib import Path
import subprocess,json
root=Path('target/cut293');results=[]
for weapon in ['long_gun','short_gun']:
 label='gunner-'+weapon+'-baseline';out=root/(label+'-correct-api');argv=['target/cut291-native/fast/examples/class_builds',str(root/'gunner-input.json'),str(out),weapon,'baseline']
 with (root/(out.name+'.txt')).open('x') as log:run=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT)
 results.append({'case':label,'dir':out.name,'argv':argv,'exit':run.returncode});print(json.dumps(results[-1]),flush=True)
Path('docs/evidence/cut293/gunner-command-results.json').write_text(json.dumps(results,indent=2)+'\n');assert all(r['exit']==0 for r in results)
