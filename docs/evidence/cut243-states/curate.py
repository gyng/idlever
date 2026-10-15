"""Curate new menu-state evidence without deleting originals or touching Git."""
from pathlib import Path
import gzip,hashlib,json
root=Path(__file__).resolve().parent
selected={
 'safe-entry/rename-current-320-1x.png',
 'setup-name-current/rename-current-320-2x.png',
 'founding-auto-earned/roster-native-acquisition-320-1x.png',
 'founding-auto-earned/founding-scout-settings-320-1x.png',
 'founding-insufficient-earned/roster-native-acquisition-320-1x.png',
 'founding-cap-earned/roster-native-acquisition-320-1x.png',
 'roster-after-auto/roster-native-acquisition-320-1x.png',
 'roster-after-auto/founding-confirmation-320-1x.png',
 'roster-after-desktop/founding-confirmation-1440-1x.png',
 'founding-price-after/founding-confirmation-320-1x.png',
 'founding-price-after/founding-confirmation-320-2x.png',
 'founding-price-after/founding-confirmation-1440-1x.png',
 'founding-price-after/roster-native-acquisition-320-2x.png',
}
# Upper/lower actual historical-earned class dialogs are distinct full-content views.
for directory in ['earned-l10-style','earned-l10-scroll']:
 for p in (root/directory).glob('*.png'):
  if not p.name.endswith('-background.png'):selected.add(p.relative_to(root).as_posix())
# Four representative paired raw focus backgrounds. All16probes' actual per-pixel
# RGB/background/side metrics and SHA identities are retained numerically.
for prefix in ['skill-cancel-320-2x','style-confirm-320-2x','skill-confirm-1440-1x','style-cancel-1440-2x']:
 for suffix in ['focused','background']:selected.add(f'boundary-current/{prefix}-{suffix}.png')
# Original false-positive range and actual glyph-core investigation keep its pair.
for suffix in ['.png','-background.png']:
 selected.add('child-contrast-after/skill-review-320-2x'+suffix)
for p in list(root.rglob('*.json')):
 if p.name=='curation.json':continue
 p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),compresslevel=9,mtime=0))
rows=[]
for p in sorted(root.rglob('*')):
 if not p.is_file()or p.name=='curation.json':continue
 rel=p.relative_to(root).as_posix();included=p.suffix in ['.mjs','.py','.md','.gz','.out','.err'] or rel in selected or rel=='checkpoint-files.txt'
 b=p.read_bytes();rows.append({'path':rel,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'scope':'include'if included else'preserved-local-not-in-commit'})
record={'scope':'Cut243-state phase only; original failures and originals remain local with SHA inventory. LosslessgzipJSON is included; rawJSON and redundant unselected frames are deliberately excluded from commit. Representative selected focus pairs accompany all16actual probes pixel metrics; no missing PNG promoted to in-commit. No Git action.', 'productionPaths':['web/src/ui/camp.ts','web/src/ui/heroes.ts','web/src/heroes-compact.css'],'referencedInputs':['docs/evidence/handoff-menus/input.game.json.gz','docs/evidence/cut208/earned-final/seed-1-1x8h.game.json.gz','docs/evidence/cut208/earned-final/seed-13-4x8h.game.json.gz','docs/evidence/cut220/core/fixtures/earned-three-residents.game.json.gz','docs/evidence/cut153/earned-d28.json.gz'],'files':rows,'includedBytes':sum(x['bytes']for x in rows if x['scope']=='include'),'localBytes':sum(x['bytes']for x in rows)}
(root/'curation.json').write_text(json.dumps(record,indent=2)+'\n')
paths=record['productionPaths']+['docs/evidence/cut243-states/'+r['path']for r in rows if r['scope']=='include']+['docs/evidence/cut243-states/curation.json']
(root/'checkpoint-files.txt').write_text('\n'.join(paths)+'\n')
print(json.dumps({'paths':len(paths),'includedBytes':record['includedBytes'],'localBytes':record['localBytes']},indent=2))
