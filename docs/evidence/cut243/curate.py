"""Build a lossless evidence index; never delete local originals or stage Git."""
from pathlib import Path
import gzip,hashlib,json
root=Path(__file__).resolve().parent
selected={
 'baseline-gpu/camp-320-1x.png','baseline-gpu/camp-1440-1x.png',
 'baseline-runs-gpu/runs-320-2x.png','final-gpu/runs-320-2x.png','final-gpu/runs-1440-2x.png',
 'tasks-expanded-gpu/camp-320-2x.png',
 'child-before-gpu/return-pick-320-1x.png','child-before-gpu/drop-diagnostic-320-1x.png',
 'child-after97-gpu/return-pick-320-1x.png','child-after97-gpu/return-pick-1440-2x.png',
 'home-owned-orders/fresh-town-320.png','home-owned-orders/first-house-320.png',
 'home-owned-orders/owned-apprentice-orders-320-1x.png','home-owned-orders/owned-apprentice-orders-320-2x.png',
 'home-icon-failure/home-320-1x.png',
 'sprite-help-diagnostic/400-ready-house.png','sprite-help-diagnostic/1440-ready-house.png',
}
# Final current composition, plus explicit interaction diagnostics and final Drop repair.
for directory in ['sprite-primary-final','drop-title-final-gpu']:
 for p in (root/directory).glob('*.png'):selected.add(p.relative_to(root).as_posix())
files=[]
for p in sorted(root.rglob('*')):
 if not p.is_file() or p.name=='curation.json':continue
 rel=p.relative_to(root).as_posix()
 if p.suffix=='.json':
  packed=p.with_name(p.name+'.gz')
  packed.write_bytes(gzip.compress(p.read_bytes(),compresslevel=9,mtime=0))
for p in sorted(root.rglob('*')):
 if not p.is_file() or p.name=='curation.json':continue
 rel=p.relative_to(root).as_posix()
 included=(p.suffix in ['.mjs','.py','.md','.gz','.out','.err','.log'] and not rel.endswith('vite.log')) or rel in selected or rel == 'checkpoint-evidence-files.txt'
 # Large debug/server bodies are local-only even if later added by a harness.
 if any(x in rel for x in ['served-modules/','server-modules/']):included=False
 b=p.read_bytes();files.append({'path':rel,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'scope':'include' if included else 'preserved-local-not-in-commit'})
record={'scope':'Curated Cut243 only; SHA inventory retains all originals/failures locally. JSON gzip files are lossless copies; raw JSON and unselected image duplicates are deliberately not in this commit. No local originals deleted.', 'files':files,'includedBytes':sum(x['bytes'] for x in files if x['scope']=='include'),'localBytes':sum(x['bytes'] for x in files)}
(root/'curation.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:v for k,v in record.items() if k!='files'},indent=2))
