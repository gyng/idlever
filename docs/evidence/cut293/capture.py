"""Fixed14-case budget, four native workers; retain all command exits/refusals."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import gzip,json,subprocess,hashlib
root=Path('target/cut293');evidence=Path('docs/evidence/cut293')
pairs={'fighter':['sword','crownsplitter'],'rogue':['dagger','crownsplitter'],'ranger':['bow','sword'],'caster':['dagger','bow'],'gunner':['long_gun','short_gun']}
parents={}
for cls in pairs:
 p=Path('docs/evidence/cut246/prepared')/(cls+'-common.session.json.gz');raw=gzip.decompress(p.read_bytes());dest=root/(cls+'-input.json');dest.write_bytes(raw);parents[cls]={'path':str(p),'gzip_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'raw_sha256':hashlib.sha256(raw).hexdigest()}
cases=[(cls,weapon,policy) for cls,weapons in pairs.items() for policy in (['baseline','authored'] if cls in ['fighter','caster'] else ['baseline']) for weapon in weapons]
assert len(cases)==14
(evidence/'selection.json').write_text(json.dumps({'parents':parents,'cases':cases,'threads':4},indent=2)+'\n')
def execute(case):
 cls,weapon,policy=case;label='-'.join(case);out=root/label;argv=['target/cut291-native/fast/examples/class_builds',str(root/(cls+'-input.json')),str(out),weapon,policy]
 with (root/(label+'.txt')).open('x') as log:p=subprocess.run(argv,stdout=log,stderr=subprocess.STDOUT)
 result={'case':label,'argv':argv,'exit':p.returncode};print(json.dumps(result),flush=True);return result
with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(execute,cases))
(evidence/'command-results.json').write_text(json.dumps(results,indent=2)+'\n')
assert all(r['exit']==0 for r in results),'cases failed; inspect preserved refusal/failure files'
