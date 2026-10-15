"""Freeze a reviewable partial R6 checkpoint; no blanket acceptance claim."""
from pathlib import Path
import hashlib,json
root=Path('docs/evidence/cut245')
selected=set()
for p in root.iterdir():
    if p.is_file() and p.suffix in {'.md','.mjs','.gz','.log','.json','.py'} and p.name not in {'CURATION.json','checkpoint-paths.txt'}:
        selected.add(p)
for name in ['before','after-v3','missing-v3','no-atlas-v3','combat-v3','hazard-nearby-v3']:
    for p in (root/name).iterdir():
        if p.name=='results.json' or p.suffix=='.png': selected.add(p)
selected.add(root/'hazard-v3/results.json')
selected.add(root/'hazard-v3/foundry-gl-1440.png')
for name in ['cost-final','cost-control-a','cost-control-interleaved','cost-control-symmetric','cost-candidate-symmetric','cost-control-crypt-symmetric']:
    if (root/name/'results.json').exists(): selected.add(root/name/'results.json')
for name in ['after','after-v2']:
    for f in ['results.json','foundry-gl-400.png','crypt-gl-400.png']: selected.add(root/name/f)
for name in ['lifecycle-v3','lifecycle-v4','lifecycle-v5']:
    selected.add(root/name/'results.json')
for p in (root/'lifecycle-v5').glob('*context-lost*.png'): selected.add(p)
for p in root.glob('review-*.png'): selected.add(p)
files=[]
for p in sorted(root.rglob('*')):
    if '__pycache__' in p.parts: continue
    if not p.is_file() or p.name in {'CURATION.json','checkpoint-paths.txt'}: continue
    raw=p.read_bytes()
    files.append({'path':str(p),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'selected':p in selected})
result={'scope':'Curated source/proof for partial actual-layout landmark work; final cost and broad handoff acceptance remain open. Excluded original frames stay locally pinned here. Live output must be terminal before staging.','files':files,'selectedCount':sum(f['selected'] for f in files),'selectedBytes':sum(f['bytes'] for f in files if f['selected'])}
(root/'CURATION.json').write_text(json.dumps(result,indent=2)+'\n')
paths=[str(p) for p in sorted(selected)]+[str(root/'CURATION.json'),str(root/'checkpoint-paths.txt')]
(root/'checkpoint-paths.txt').write_text('\n'.join(paths)+'\n')
print(result['selectedCount'],result['selectedBytes'])
