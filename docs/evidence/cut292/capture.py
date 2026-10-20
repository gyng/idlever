"""Four fixed earned parents; package reads only, no state grants."""
from pathlib import Path
import gzip,json,subprocess,hashlib
root=Path('target/cut292');evidence=Path('docs/evidence/cut292');rows=[]
for scene in ['gas','pack']:
 for permission in ['locked','learned']:
  label=scene+'-'+permission;source=root/(label+'-input.json');source.write_bytes(gzip.decompress(Path('docs/evidence/cut291/wasm/'+label+'-input.json.gz').read_bytes()))
  out=root/label
  command=['target/cut291-native/fast/examples/encounter_catalogue','packages',str(source),str(out),'0']
  run=subprocess.run(command,capture_output=True);assert run.returncode==0,run.stderr.decode()
  before=(out/'normalized-input.json').read_bytes();after=(out/'after.json').read_bytes();assert before==after
  packages=json.loads((out/'packages.json').read_bytes());needs=next(p for p in packages['all'] if p['id']=='gas_step').get('variant_needs',[]);assert needs==(['','Learn Throw'] if permission=='locked' else [])
  (evidence/(label+'-native-save.json.gz')).write_bytes(gzip.compress(after,mtime=0))
  rows.append({'case':label,'argv':command,'exit':run.returncode,'input_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'after_sha256':hashlib.sha256(after).hexdigest(),'wire_read_save_bytes_exact':True,'variant_needs':needs})
(evidence/'native-results.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows))
